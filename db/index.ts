/**
 * NeuroSync — Database Access Layer
 *
 * All SQLite-specific syntax is confined to this file so the rest of the
 * application never calls better-sqlite3 directly. Swapping in a Postgres
 * adapter requires changes only here.
 */

import Database from "better-sqlite3";
import path from "path";
import { existsSync, mkdirSync, unlinkSync } from "fs";

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "neurosync.db");
const FALLBACK_DB_PATH = path.join(process.cwd(), "tmp", "neurosync.db");

function ensureDirectory(pathToCheck: string): void {
  const dir = path.dirname(pathToCheck);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function resolveDatabasePath(requestedPath: string, fallbackPath: string): string {
  try {
    ensureDirectory(requestedPath);
    return requestedPath;
  } catch (err: any) {
    console.warn(
      `[env] Cannot create database directory for ${requestedPath}: ${err.message}. Falling back to ${fallbackPath}`
    );
    ensureDirectory(fallbackPath);
    return fallbackPath;
  }
}

const RESOLVED_DB_PATH = resolveDatabasePath(DB_PATH, FALLBACK_DB_PATH);

let dbInstance: Database.Database;
try {
  dbInstance = new Database(RESOLVED_DB_PATH);
} catch (err: any) {
  const fallbackPath = FALLBACK_DB_PATH;
  console.warn(
    `[env] Cannot open database at ${RESOLVED_DB_PATH}: ${err.message}. Falling back to ${fallbackPath}`
  );
  ensureDirectory(fallbackPath);
  dbInstance = new Database(fallbackPath);
}

export const db = dbInstance;

export function purgeStaleCueMedia(): void {
  // Fetch paths before nullifying so we can delete from disk
  const stale: any[] = db.prepare(`
    SELECT media_ref FROM cue_events
    WHERE  media_ref IS NOT NULL
      AND  created_at <= datetime('now', '-30 days')
  `).all() as any[];

  if (stale.length > 0) {
    for (const row of stale) {
      try {
        if (existsSync(row.media_ref)) unlinkSync(row.media_ref);
      } catch {
        // ignore - file may already be gone
      }
    }

    db.prepare(`
      UPDATE cue_events
      SET    media_ref = NULL
      WHERE  media_ref IS NOT NULL
        AND  created_at <= datetime('now', '-30 days')
    `).run();
  }
}

// Performance & integrity
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("synchronous = NORMAL");

// ─── Schema ─────────────────────────────────────────────────────────────────
// Create all tables first

db.exec(`
  -- Tenants / organisations
  CREATE TABLE IF NOT EXISTS organizations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    type        TEXT    NOT NULL DEFAULT 'family'
                CHECK(type IN ('family','anganwadi','school','phc','ngo','district_admin')),
    region_code TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Users (all roles live in one table, scoped by org)
  CREATE TABLE IF NOT EXISTS users (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id           INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email            TEXT    NOT NULL,
    password_hash    TEXT    NOT NULL,
    role             TEXT    NOT NULL DEFAULT 'parent'
                     CHECK(role IN ('parent','caregiver','anganwadi_worker',
                                    'special_educator','asha_worker','district_admin')),
    profile_type     TEXT    NOT NULL DEFAULT 'family'
                     CHECK(profile_type IN ('family','caregiver')),
    display_name     TEXT,
    preferred_language TEXT NOT NULL DEFAULT 'en',
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE        INDEX IF NOT EXISTS idx_users_org   ON users(org_id);

  -- Opaque session tokens (replaces in-memory express-session store for auth)
  CREATE TABLE IF NOT EXISTS session_tokens (
    token         TEXT    PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at    DATETIME NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_session_token_user ON session_tokens(user_id);

  -- Consent records (DPDP-aligned)
  CREATE TABLE IF NOT EXISTS consent_records (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    consenting_parent_user_id INTEGER NOT NULL REFERENCES users(id),
    consent_scope           TEXT    NOT NULL, -- JSON
    consent_given_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    consent_expires_at      DATETIME,
    revoked_at              DATETIME
  );

  -- Consent audit log (append-only)
  CREATE TABLE IF NOT EXISTS consent_audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    consent_id  INTEGER NOT NULL REFERENCES consent_records(id),
    action      TEXT    NOT NULL CHECK(action IN ('granted','renewed','revoked')),
    actor_user_id INTEGER NOT NULL REFERENCES users(id),
    ts          DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes       TEXT
  );

  -- Children profiles (keyed by child, not user)
  CREATE TABLE IF NOT EXISTS children_profiles (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id           INTEGER NOT NULL REFERENCES organizations(id),
    added_by_user_id INTEGER NOT NULL REFERENCES users(id),
    consent_record_id INTEGER REFERENCES consent_records(id),
    onboarding_data  TEXT,   -- JSON
    external_ref     TEXT,   -- JSON: { udid, abha_id } — consent-gated, optional
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_children_org ON children_profiles(org_id);

  -- Many-to-many: which users can co-manage which children
  CREATE TABLE IF NOT EXISTS child_access (
    user_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    child_id   INTEGER NOT NULL REFERENCES children_profiles(id) ON DELETE CASCADE,
    granted_by INTEGER NOT NULL REFERENCES users(id),
    role       TEXT    NOT NULL DEFAULT 'caregiver'
               CHECK(role IN ('owner','caregiver','viewer')),
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, child_id)
  );

  -- Progress metrics
  CREATE TABLE IF NOT EXISTS progress (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id           INTEGER NOT NULL REFERENCES children_profiles(id) ON DELETE CASCADE,
    metric_type        TEXT    NOT NULL,
    value              INTEGER NOT NULL,
    timestamp          DATETIME DEFAULT CURRENT_TIMESTAMP,
    recorded_by_user_id INTEGER NOT NULL REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_progress_child ON progress(child_id);
  CREATE INDEX IF NOT EXISTS idx_progress_ts    ON progress(timestamp);

  -- Therapy schedules
  CREATE TABLE IF NOT EXISTS therapy_schedules (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id          INTEGER NOT NULL REFERENCES children_profiles(id) ON DELETE CASCADE,
    schedule_json     TEXT    NOT NULL,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_therapy_child ON therapy_schedules(child_id);

  -- Diet plans
  CREATE TABLE IF NOT EXISTS diet_plans (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id          INTEGER NOT NULL REFERENCES children_profiles(id) ON DELETE CASCADE,
    plan_json         TEXT    NOT NULL,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_diet_child ON diet_plans(child_id);

  -- JSON repair telemetry (for AI output quality monitoring)
  CREATE TABLE IF NOT EXISTS ai_repair_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint   TEXT    NOT NULL,
    repaired   INTEGER NOT NULL DEFAULT 0, -- 1 = repair was needed
    ts         DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- ── Personalized Cue Interpreter ────────────────────────────────────────────

  -- Per-child cue library (each entry is one child's unique signal + its meaning)
  CREATE TABLE IF NOT EXISTS cue_library (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id            INTEGER NOT NULL REFERENCES children_profiles(id) ON DELETE CASCADE,
    label               TEXT    NOT NULL,             -- caregiver's own words
    media_type          TEXT    NOT NULL DEFAULT 'audio'
                        CHECK(media_type IN ('audio','video')),
    media_ref           TEXT,                         -- path to stored clip (consent-gated)
    embedding_vector    TEXT,                         -- JSON float array for cosine matching
    confirmed_count     INTEGER NOT NULL DEFAULT 1,   -- confirmed correct matches
    created_by_user_id  INTEGER NOT NULL REFERENCES users(id),
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_cue_library_child ON cue_library(child_id);

  -- Log of every interpret event (matched or unmatched)
  CREATE TABLE IF NOT EXISTS cue_events (
    id                              INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id                        INTEGER NOT NULL REFERENCES children_profiles(id) ON DELETE CASCADE,
    media_ref                       TEXT,             -- short-lived; auto-deleted after 30 days
    matched_cue_id                  INTEGER REFERENCES cue_library(id),
    match_confidence                REAL,
    ai_interpretations              TEXT,             -- JSON array of 5-6 candidates
    caregiver_selected_interpretation TEXT,
    escalated                       INTEGER NOT NULL DEFAULT 0,  -- boolean
    escalated_at                    DATETIME,
    created_at                      DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_cue_events_child ON cue_events(child_id);
  CREATE INDEX IF NOT EXISTS idx_cue_events_created ON cue_events(created_at);

  -- ── Handwriting Interpreter ──────────────────────────────────────────────────

  CREATE TABLE IF NOT EXISTS handwriting_samples (
    id                        INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id                  INTEGER NOT NULL REFERENCES children_profiles(id) ON DELETE CASCADE,
    image_ref                 TEXT,             -- storage path, nullable (can be discarded post-processing)
    retain_image              INTEGER NOT NULL DEFAULT 0, -- 1 = caregiver opted to keep image
    raw_transcription         TEXT,             -- literal best-effort reading
    interpreted_text          TEXT,             -- AI corrected version
    flagged_patterns          TEXT,             -- JSON: {b_d_reversals, phonetic_substitutions, spacing_irregular}
    caregiver_confirmed_text  TEXT,             -- caregiver correction / confirmation
    created_by_user_id        INTEGER NOT NULL REFERENCES users(id),
    created_at                DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_hw_child    ON handwriting_samples(child_id);
  CREATE INDEX IF NOT EXISTS idx_hw_created  ON handwriting_samples(created_at);

  -- ── Shared Cue Pool (opt-in, prototype) ─────────────────────────────────────
  -- Only embedding vectors + caregiver-confirmed labels are stored here.
  -- Raw audio is never pooled. Families opt in via a separate consent toggle.

  CREATE TABLE IF NOT EXISTS shared_cue_pool (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    embedding_vector TEXT    NOT NULL,   -- JSON float array (never raw audio)
    confirmed_label  TEXT    NOT NULL,   -- caregiver-confirmed meaning
    child_id         INTEGER REFERENCES children_profiles(id) ON DELETE SET NULL,
    contributed_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_shared_pool_label ON shared_cue_pool(confirmed_label);

  -- Cluster centroids — computed periodically by /api/admin/shared-pool/recluster
  CREATE TABLE IF NOT EXISTS shared_cue_clusters (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    cluster_id   TEXT    NOT NULL UNIQUE,  -- e.g. "cluster_0"
    centroid     TEXT    NOT NULL,         -- JSON float array
    top_labels   TEXT    NOT NULL,         -- JSON array of {label, count}
    member_count INTEGER NOT NULL DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- ── YouTube thumbnail cache ──────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS youtube_cache (
    cache_key   TEXT    PRIMARY KEY,   -- sha256(subject+topic+difficulty)
    results     TEXT    NOT NULL,      -- JSON array of video objects
    fetched_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- ── Adaptive teaching workflow ─────────────────────────────────────────────
  -- The goal and collected context stay flexible JSON so a caretaker can describe
  -- any task; workflow state and safety controls remain server-enforced.
  CREATE TABLE IF NOT EXISTS teaching_workflows (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id         INTEGER NOT NULL REFERENCES children_profiles(id) ON DELETE CASCADE,
    state            TEXT    NOT NULL CHECK(state IN (
                       'gathering_information','plan_ready_for_review','blocked',
                       'approved','in_progress','completed','cancelled','needs_caretaker_input'
                     )),
    goal             TEXT    NOT NULL,
    context_json     TEXT    NOT NULL DEFAULT '{}',
    current_question TEXT,
    draft_plan_json  TEXT,
    safety_json      TEXT    NOT NULL DEFAULT '{}',
    blocked_reason   TEXT,
    language         TEXT    NOT NULL DEFAULT 'en',
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    approved_by_user_id INTEGER REFERENCES users(id),
    approved_at      DATETIME,
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_teaching_workflows_child ON teaching_workflows(child_id, updated_at);

  CREATE TABLE IF NOT EXISTS teaching_sessions (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id      INTEGER NOT NULL REFERENCES teaching_workflows(id) ON DELETE CASCADE,
    child_id         INTEGER NOT NULL REFERENCES children_profiles(id) ON DELETE CASCADE,
    status           TEXT    NOT NULL CHECK(status IN ('in_progress','completed','cancelled')),
    current_step_index INTEGER NOT NULL DEFAULT 0,
    started_by_user_id INTEGER NOT NULL REFERENCES users(id),
    started_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at         DATETIME
  );
  CREATE INDEX IF NOT EXISTS idx_teaching_sessions_child ON teaching_sessions(child_id, started_at);

  CREATE TABLE IF NOT EXISTS teaching_observations (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id       INTEGER NOT NULL REFERENCES teaching_sessions(id) ON DELETE CASCADE,
    step_id          TEXT    NOT NULL,
    source           TEXT    NOT NULL CHECK(source IN ('camera_observed','camera_uncertain','caretaker_reported','unconfirmed')),
    evidence_json    TEXT,
    model_name       TEXT,
    model_confidence REAL,
    limitations      TEXT,
    caretaker_report TEXT,
    recorded_by_user_id INTEGER NOT NULL REFERENCES users(id),
    recorded_at      DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_teaching_observations_session ON teaching_observations(session_id, recorded_at);

  CREATE TABLE IF NOT EXISTS teaching_events (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id       INTEGER NOT NULL REFERENCES teaching_sessions(id) ON DELETE CASCADE,
    step_id          TEXT    NOT NULL,
    prompt_type      TEXT,
    prompt_language  TEXT,
    assistance_required INTEGER,
    retries          INTEGER NOT NULL DEFAULT 0,
    response_time_ms INTEGER,
    observation_id   INTEGER REFERENCES teaching_observations(id) ON DELETE SET NULL,
    caretaker_outcome TEXT CHECK(caretaker_outcome IN ('independent','assisted','not_completed','unknown')),
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_teaching_events_session ON teaching_events(session_id, created_at);

  -- ID-specific assessment observations are append-only. A correction links to
  -- the earlier row so the original observation and assessment history remain.
  CREATE TABLE IF NOT EXISTS id_skill_assessments (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id         INTEGER NOT NULL REFERENCES children_profiles(id) ON DELETE CASCADE,
    domain           TEXT    NOT NULL CHECK(domain IN (
                       'motor','activities_of_daily_living','language','reading_writing',
                       'number_time','domestic_social','prevocational_money'
                     )),
    skill_name       TEXT    NOT NULL,
    assessment_status TEXT   NOT NULL CHECK(assessment_status IN (
                       'not_assessed','not_yet_demonstrated','developing','demonstrated'
                     )),
    learning_opportunity TEXT NOT NULL CHECK(learning_opportunity IN ('yes','no','unknown')),
    observer_type    TEXT    NOT NULL CHECK(observer_type IN ('caretaker','educator')),
    observation_date TEXT    NOT NULL,
    context          TEXT,
    example          TEXT,
    corrects_id      INTEGER REFERENCES id_skill_assessments(id) ON DELETE SET NULL,
    recorded_by_user_id INTEGER NOT NULL REFERENCES users(id),
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_id_skill_assessments_child
    ON id_skill_assessments(child_id, domain, observation_date DESC, id DESC);

  CREATE TABLE IF NOT EXISTS id_functional_assessments (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id         INTEGER NOT NULL REFERENCES children_profiles(id) ON DELETE CASCADE,
    domain           TEXT    NOT NULL CHECK(domain IN (
                       'personal','social','academic','occupational','recreational'
                     )),
    activity_name    TEXT    NOT NULL,
    assistance_level TEXT    NOT NULL CHECK(assistance_level IN (
                       'independent','occasional_cue','verbal_prompting','physical_prompting',
                       'gestural_prompting','modelling','fully_dependent','not_applicable',
                       'insufficient_opportunity'
                     )),
    performance_outcome TEXT NOT NULL CHECK(performance_outcome IN (
                       'completed_independently','completed_with_assistance','partially_completed',
                       'not_completed','not_attempted','unable_to_determine'
                     )),
    observer_type    TEXT    NOT NULL CHECK(observer_type IN ('caretaker','educator')),
    observation_date TEXT    NOT NULL,
    context          TEXT,
    example          TEXT,
    corrects_id      INTEGER REFERENCES id_functional_assessments(id) ON DELETE SET NULL,
    recorded_by_user_id INTEGER NOT NULL REFERENCES users(id),
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_id_functional_assessments_child
    ON id_functional_assessments(child_id, domain, observation_date DESC, id DESC);

  -- Each saved board is a versioned snapshot; token and choice actions are
  -- separate events so board use can be reviewed without replacing history.
  CREATE TABLE IF NOT EXISTS id_teaching_aid_configs (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id         INTEGER NOT NULL REFERENCES children_profiles(id) ON DELETE CASCADE,
    aid_type         TEXT    NOT NULL CHECK(aid_type IN ('first_then','token','choice')),
    enabled          INTEGER NOT NULL CHECK(enabled IN (0,1)),
    config_json      TEXT    NOT NULL,
    recorded_by_user_id INTEGER NOT NULL REFERENCES users(id),
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_id_teaching_aid_configs_child
    ON id_teaching_aid_configs(child_id, aid_type, id DESC);

  CREATE TABLE IF NOT EXISTS id_teaching_aid_events (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id         INTEGER NOT NULL REFERENCES children_profiles(id) ON DELETE CASCADE,
    aid_type         TEXT    NOT NULL CHECK(aid_type IN ('first_then','token','choice')),
    event_type       TEXT    NOT NULL CHECK(event_type IN (
                       'configuration_saved','token_earned','token_reset','choice_selected'
                     )),
    event_json       TEXT    NOT NULL DEFAULT '{}',
    recorded_by_user_id INTEGER NOT NULL REFERENCES users(id),
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_id_teaching_aid_events_child
    ON id_teaching_aid_events(child_id, created_at DESC);

  -- No voice sample is stored here. This records explicit authorization for a
  -- configured third-party provider and lets it be revoked independently.
  CREATE TABLE IF NOT EXISTS voice_authorizations (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id         INTEGER NOT NULL REFERENCES children_profiles(id) ON DELETE CASCADE,
    provider         TEXT    NOT NULL,
    provider_voice_id TEXT,
    authorized_by_user_id INTEGER NOT NULL REFERENCES users(id),
    consent_record_id INTEGER REFERENCES consent_records(id),
    status           TEXT    NOT NULL DEFAULT 'authorized' CHECK(status IN ('authorized','revoked')),
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    revoked_at       DATETIME
  );
`);

// Lightweight, idempotent migrations for databases created before these fields
// were introduced. SQLite does not apply newly declared columns to old tables.
function ensureColumn(table: string, column: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((entry) => entry.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}

ensureColumn("users", "profile_type", "profile_type TEXT NOT NULL DEFAULT 'family'");
ensureColumn("teaching_events", "assistance_level", `assistance_level TEXT CHECK(assistance_level IN (
  'independent','occasional_cue','gestural_prompting','verbal_prompting','modelling',
  'physical_prompting','fully_dependent','not_applicable','insufficient_opportunity'
))`);
ensureColumn("teaching_events", "performance_outcome", `performance_outcome TEXT CHECK(performance_outcome IN (
  'completed_independently','completed_with_assistance','partially_completed',
  'not_completed','not_attempted','unable_to_determine'
))`);

function expandAssistanceLevelConstraint(
  database: Database.Database,
  tableName: "id_functional_assessments" | "teaching_events",
  createTableSql: string,
  columns: string[],
  createIndexSql: string,
): void {
  const definition = database.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
  ).get(tableName) as { sql: string } | undefined;
  if (!definition || (definition.sql.includes("'gestural_prompting'") && definition.sql.includes("'modelling'"))) return;

  const legacyTable = `${tableName}_assistance_migration`;
  database.pragma("foreign_keys = OFF");
  try {
    database.exec("BEGIN IMMEDIATE");
    database.exec(`ALTER TABLE ${tableName} RENAME TO ${legacyTable}`);
    database.exec(createTableSql);
    database.exec(
      `INSERT INTO ${tableName} (${columns.join(",")}) SELECT ${columns.join(",")} FROM ${legacyTable}`,
    );
    database.exec(`DROP TABLE ${legacyTable}`);
    database.exec(createIndexSql);
    database.exec("COMMIT");
  } catch (error) {
    if (database.inTransaction) database.exec("ROLLBACK");
    throw error;
  } finally {
    database.pragma("foreign_keys = ON");
  }
}

export function migrateIdAssistanceConstraints(database: Database.Database = db): void {
  expandAssistanceLevelConstraint(
    database,
    "id_functional_assessments",
    `CREATE TABLE id_functional_assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL REFERENCES children_profiles(id) ON DELETE CASCADE,
      domain TEXT NOT NULL CHECK(domain IN ('personal','social','academic','occupational','recreational')),
      activity_name TEXT NOT NULL,
      assistance_level TEXT NOT NULL CHECK(assistance_level IN (
        'independent','occasional_cue','gestural_prompting','verbal_prompting','modelling',
        'physical_prompting','fully_dependent','not_applicable','insufficient_opportunity'
      )),
      performance_outcome TEXT NOT NULL CHECK(performance_outcome IN (
        'completed_independently','completed_with_assistance','partially_completed',
        'not_completed','not_attempted','unable_to_determine'
      )),
      observer_type TEXT NOT NULL CHECK(observer_type IN ('caretaker','educator')),
      observation_date TEXT NOT NULL,
      context TEXT,
      example TEXT,
      corrects_id INTEGER REFERENCES id_functional_assessments(id) ON DELETE SET NULL,
      recorded_by_user_id INTEGER NOT NULL REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    [
      "id", "child_id", "domain", "activity_name", "assistance_level", "performance_outcome",
      "observer_type", "observation_date", "context", "example", "corrects_id",
      "recorded_by_user_id", "created_at",
    ],
    `CREATE INDEX idx_id_functional_assessments_child
      ON id_functional_assessments(child_id, domain, observation_date DESC, id DESC)`,
  );
  expandAssistanceLevelConstraint(
    database,
    "teaching_events",
    `CREATE TABLE teaching_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES teaching_sessions(id) ON DELETE CASCADE,
      step_id TEXT NOT NULL,
      prompt_type TEXT,
      prompt_language TEXT,
      assistance_required INTEGER,
      retries INTEGER NOT NULL DEFAULT 0,
      response_time_ms INTEGER,
      observation_id INTEGER REFERENCES teaching_observations(id) ON DELETE SET NULL,
      caretaker_outcome TEXT CHECK(caretaker_outcome IN ('independent','assisted','not_completed','unknown')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      assistance_level TEXT CHECK(assistance_level IN (
        'independent','occasional_cue','gestural_prompting','verbal_prompting','modelling',
        'physical_prompting','fully_dependent','not_applicable','insufficient_opportunity'
      )),
      performance_outcome TEXT CHECK(performance_outcome IN (
        'completed_independently','completed_with_assistance','partially_completed',
        'not_completed','not_attempted','unable_to_determine'
      ))
    )`,
    [
      "id", "session_id", "step_id", "prompt_type", "prompt_language", "assistance_required",
      "retries", "response_time_ms", "observation_id", "caretaker_outcome", "created_at",
      "assistance_level", "performance_outcome",
    ],
    "CREATE INDEX idx_teaching_events_session ON teaching_events(session_id, created_at)",
  );
}

migrateIdAssistanceConstraints();

const emailIndexes = db.prepare("PRAGMA index_list(users)").all() as Array<{ name: string; unique: number }>;
const hasUniqueEmailIndex = emailIndexes.some((index) => {
  if (!index.unique) return false;
  const columns = db.prepare(`PRAGMA index_info("${index.name.replace(/"/g, '""')}")`).all() as Array<{ name: string }>;
  return columns.length === 1 && columns[0].name === "email";
});

if (hasUniqueEmailIndex) {
  db.pragma("foreign_keys = OFF");
  try {
    db.exec(`
      BEGIN IMMEDIATE;
      CREATE TABLE users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'parent'
          CHECK(role IN ('parent','caregiver','anganwadi_worker','special_educator','asha_worker','district_admin')),
        profile_type TEXT NOT NULL DEFAULT 'family'
          CHECK(profile_type IN ('family','caregiver')),
        display_name TEXT,
        preferred_language TEXT NOT NULL DEFAULT 'en',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO users_new (id, org_id, email, password_hash, role, profile_type, display_name, preferred_language, created_at)
      SELECT id, org_id, email, password_hash, role, profile_type, display_name, preferred_language, created_at
      FROM users;
      DROP TABLE users;
      ALTER TABLE users_new RENAME TO users;
      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_users_org ON users(org_id);
      COMMIT;
    `);
  } catch (error) {
    if (db.inTransaction) db.exec("ROLLBACK");
    throw error;
  } finally {
    db.pragma("foreign_keys = ON");
  }
}

ensureColumn("child_access", "role", "role TEXT NOT NULL DEFAULT 'caregiver'");
ensureColumn("cue_events", "audio_duration_ms", "audio_duration_ms INTEGER");
ensureColumn("cue_events", "embedding_vector", "embedding_vector TEXT");
ensureColumn("cue_events", "embedding_model", "embedding_model TEXT");
db.exec(`
  UPDATE child_access
  SET role = 'owner'
  WHERE role = 'caregiver'
    AND EXISTS (
      SELECT 1 FROM children_profiles cp
      WHERE cp.id = child_access.child_id
        AND cp.added_by_user_id = child_access.user_id
    );
`);

// ─── Bootstrap default organization ───────────────────────────────────────
// Ensure organization 1 exists for user registration
const defaultOrg = db.prepare("SELECT id FROM organizations WHERE id = 1").get();
if (!defaultOrg) {
  db.prepare(
    "INSERT INTO organizations (id, name, type, region_code) VALUES (?,?,?,?)"
  ).run(1, "Default Organization", "family", null);
}

export default db;
