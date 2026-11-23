import express from "express";
import db from "../../db/index.js";
import { authenticate } from "../../lib/auth.js";
import { assertConsent } from "../../lib/consent.js";
import { generateStructured } from "../../lib/ai-client.js";
import { deriveAdaptationSuggestions } from "../../lib/adaptation.js";
import {
  ASSISTANCE_LEVELS,
  BASIC_MR_DOMAINS,
  FACP_DOMAINS,
  LEARNING_OPPORTUNITIES,
  OBSERVATION_SOURCES,
  PERFORMANCE_OUTCOMES,
  SKILL_ASSESSMENT_STATUSES,
  parseIdFunctionalAssessment,
  parseIdSkillAssessment,
  parseGeneratedJson,
  validateInterviewDecision,
  validateTeachingPlan,
  type ObservationSource,
  type TeachingPlan,
  type WorkflowState,
} from "../../lib/teaching-schemas.js";
import config from "../../lib/config.js";

const router = express.Router();

type SafetyResult = {
  level: "clear" | "needs_supervision" | "blocked";
  message: string;
};

type InterviewAdvanceDecision = {
  state: WorkflowState;
  message: string;
  nextQuestion?: string;
  contextUpdates?: Record<string, unknown>;
  blockedReason?: string;
  safety: SafetyResult;
  serviceError?: string;
};

function routeId(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = Number.parseInt(raw ?? "", 10);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("Invalid route id");
  return id;
}

function requireChildAccess(userId: number, childId: number): boolean {
  return Boolean(db.prepare("SELECT 1 FROM child_access WHERE user_id=? AND child_id=?").get(userId, childId));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function parseJson(value: string | null | undefined): Record<string, unknown> {
  try { return asRecord(JSON.parse(value ?? "{}")); } catch { return {}; }
}

function evaluateSafety(goal: string, context: Record<string, unknown>): SafetyResult {
  const text = `${goal} ${JSON.stringify(context)}`.toLowerCase();
  const prohibited = ["medication", "medicine dose", "dose of", "firearm", "gun", "weapon", "explosive", "poison", "self harm"];
  if (prohibited.some((term) => text.includes(term))) {
    return { level: "blocked", message: "This task involves a high-risk activity that this teaching assistant cannot facilitate for a child." };
  }
  const hazards = ["knife", "sharp", "stove", "oven", "hot water", "electric", "chemical", "road", "traffic", "swim", "pool"];
  if (hazards.some((term) => text.includes(term))) {
    const confirmed = /adult.{0,30}supervis|supervis.{0,30}adult/.test(text);
    return confirmed
      ? { level: "clear", message: "Adult supervision is recorded for this potentially hazardous activity." }
      : { level: "needs_supervision", message: "This task may involve a hazard. Confirm that a responsible adult will supervise throughout, or choose a safer version of the goal." };
  }
  return { level: "clear", message: "No high-risk activity was identified from the information provided." };
}

function fallbackQuestion(context: Record<string, unknown>): string {
  const answers = Array.isArray(context.answers) ? context.answers : [];
  if (answers.length === 0) return "What would a successful attempt look like for your child, and where will you practise it?";
  if (answers.length === 1) return "What materials are available, and what kind of help or sensory consideration should we keep in mind?";
  return "Is there anything that could make this practice unsafe, frustrating, or difficult today?";
}

function promptForInterview(goal: string, context: Record<string, unknown>, childProfile: Record<string, unknown>, language: string): string {
  return `You guide a caretaker through planning one child-specific learning task. The task may be any safe task; never offer a fixed catalogue and do not diagnose or infer a condition.

Return JSON only with: state (gathering_information, plan_ready_for_review, or blocked), message, nextQuestion when gathering, contextUpdates as a small JSON object, and blockedReason when blocked.

Ask exactly one concise, non-redundant question relevant to this task. Mark plan_ready_for_review only when there is enough task-specific information to make small, safe, observable teaching steps: intended success, setting/materials, relevant support or sensory needs, and required safety/supervision. Use relevant recorded skill, assistance, and clearly related prior teaching observations to avoid asking for facts already provided. Treat system-generated suggestions as suggestions, not observations. If relevant information is missing, ask the caretaker rather than guessing. "Not assessed", "no opportunity", "not attempted", or missing records mean unknown, not failure. These user-entered records guide teaching only; never diagnose, score, or infer disability severity. Block tasks involving medication, weapons, explosives, poisoning, self-harm, or facilitation of unsafe activity. Do not start a session and do not draft the plan in this response.

Caretaker language: ${language}
Goal: ${JSON.stringify(goal)}
Child profile supplied by the caretaker: ${JSON.stringify(childProfile)}
Collected task context: ${JSON.stringify(context)}`;
}

function promptForPlan(goal: string, context: Record<string, unknown>, childProfile: Record<string, unknown>, language: string): string {
  return `Create a responsible, individualized teaching-plan DRAFT for this safe child learning goal. Do not diagnose, claim outcomes, or begin teaching. The caretaker must approve it separately.

Return JSON only using exactly this shape:
{
  "learningGoal":"...", "summary":"...", "prerequisites":["..."], "relevantContext":["..."],
  "steps":[{
    "id":"step-1", "title":"...",
    "instruction":{"en":"...","hi":"..."},
    "expectedObservableAction":"...",
    "camera":{"observable":true,"supportedObjectLabels":["..."],"cannotEstablish":"what a camera cannot prove"},
    "prompting":{"strategy":"...","waitSeconds":10},
    "adaptations":["..."], "visualCue":"a concrete picture, object cue, or simple visual sequence the caretaker can show"
  }],
  "safetyConsiderations":["..."], "progressReviewCriteria":["..."]
}

Use relevant recorded skill and functional-assistance observations, plus clearly related prior teaching attempts, when choosing the starting point, prompt level, and size of each step. Prior attempts are recorded observations; any attached system suggestions are AI-generated and are not observations. If the records do not answer an important question, ask the caretaker rather than assuming the child cannot do the skill. Treat "not assessed", no opportunity, not attempted, and uncertain outcomes as unknown, not failure. One successful attempt is not mastery. For each step, make the expected action observable, retain helpful supports, and suggest simplifying a step or trying a visual/hands-on alternative only when repeated evidence warrants it. Suggest gradually reducing prompts or one next step only after at least three consistent independent attempts, and explain the evidence and reason in the plan summary or relevantContext. Keep all recommendations editable and subject to caretaker review and approval. Do not diagnose, score, or infer disability severity.

Use 1-12 small steps. Include Hindi alongside English where helpful for ${language}; concise English is always required. Give every step a concrete visual cue the caretaker can draw, show as a picture, or demonstrate with objects. Do not generate speech, audio, or voice-cloning instructions. Be explicit that object detection may show objects but cannot prove an action or completion. If a camera cannot establish an outcome, say so. Do not make a field up when it is irrelevant—use a sensible short value instead.

Goal: ${JSON.stringify(goal)}
Child profile supplied by caretaker: ${JSON.stringify(childProfile)}
Task context: ${JSON.stringify(context)}`;
}

function workflowResponse(row: any) {
  return {
    id: row.id,
    childId: row.child_id,
    state: row.state,
    goal: row.goal,
    context: parseJson(row.context_json),
    currentQuestion: row.current_question,
    draftPlan: row.draft_plan_json ? JSON.parse(row.draft_plan_json) : null,
    safety: parseJson(row.safety_json),
    blockedReason: row.blocked_reason,
    language: row.language,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getWorkflow(childId: number, workflowId: number): any | null {
  return db.prepare("SELECT * FROM teaching_workflows WHERE id=? AND child_id=?").get(workflowId, childId) as any;
}

export function childContext(childId: number): Record<string, unknown> {
  const row: any = db.prepare("SELECT onboarding_data FROM children_profiles WHERE id=?").get(childId);
  const profile = parseJson(row?.onboarding_data);
  const skillAssessments = db.prepare(`SELECT domain, skill_name as skillName,
      assessment_status as assessmentStatus, learning_opportunity as learningOpportunity,
      observer_type as observerType, observation_date as observationDate,
      context, example, corrects_id as correctsId
    FROM id_skill_assessments current WHERE child_id=?
      AND NOT EXISTS (SELECT 1 FROM id_skill_assessments correction WHERE correction.corrects_id=current.id)
    ORDER BY observation_date DESC, id DESC LIMIT 30`).all(childId);
  const functionalAssessments = db.prepare(`SELECT domain, activity_name as activityName,
      assistance_level as assistanceLevel, performance_outcome as performanceOutcome,
      observer_type as observerType, observation_date as observationDate,
      context, example, corrects_id as correctsId
    FROM id_functional_assessments current WHERE child_id=?
      AND NOT EXISTS (SELECT 1 FROM id_functional_assessments correction WHERE correction.corrects_id=current.id)
    ORDER BY observation_date DESC, id DESC LIMIT 30`).all(childId);
  const attempts = db.prepare(`SELECT s.id as sessionId, w.goal, e.step_id as stepId,
      e.assistance_required as assistanceRequired, e.assistance_level as assistanceLevel,
      e.performance_outcome as performanceOutcome, e.caretaker_outcome as caretakerOutcome,
      e.retries, e.response_time_ms as responseTimeMs, e.created_at as recordedAt,
      o.source
    FROM teaching_events e
    JOIN teaching_sessions s ON s.id=e.session_id
    JOIN teaching_workflows w ON w.id=s.workflow_id
    LEFT JOIN teaching_observations o ON o.id=e.observation_id
    WHERE s.child_id=? AND s.status='completed'
    ORDER BY e.created_at DESC LIMIT 100`).all(childId) as Array<{
      sessionId: number;
      goal: string;
      stepId: string;
      assistanceRequired: number | null;
      assistanceLevel: string | null;
      performanceOutcome: string | null;
      caretakerOutcome: string | null;
      retries: number;
      responseTimeMs: number | null;
      recordedAt: string;
      source: string | null;
    }>;
  const bySession = new Map<number, typeof attempts>();
  for (const attempt of attempts) {
    const group = bySession.get(attempt.sessionId) ?? [];
    group.push(attempt);
    bySession.set(attempt.sessionId, group);
  }
  const priorTeachingSessions = [...bySession.values()].slice(0, 10).map((events) => ({
    goal: events[0].goal,
    attempts: events.map(({ sessionId: _sessionId, goal: _goal, ...attempt }) => attempt),
    systemSuggestions: deriveAdaptationSuggestions(events),
  }));

  return {
    name: profile.childName,
    age: profile.childAge,
    strengths: profile.strengths,
    sensoryTriggers: profile.sensoryTriggers,
    goals: profile.goals,
    skillAssessments,
    functionalAssessments,
    priorTeachingSessions,
  };
}

async function decideInterview(goal: string, context: Record<string, unknown>, profile: Record<string, unknown>, language: string): Promise<InterviewAdvanceDecision> {
  const safety = evaluateSafety(goal, context);
  if (safety.level === "blocked") {
    return { state: "blocked" as const, message: safety.message, blockedReason: safety.message, safety };
  }
  if (safety.level === "needs_supervision") {
    return { state: "gathering_information" as const, message: safety.message, nextQuestion: "Will a responsible adult supervise the full activity? If not, what safer version would you like to teach?", safety };
  }
  try {
    const raw = await generateStructured(promptForInterview(goal, context, profile, language));
    const parsed = validateInterviewDecision(parseGeneratedJson(raw));
    if (!parsed.decision) throw new Error(parsed.errors.join("; "));
    return { ...parsed.decision, safety };
  } catch (error: any) {
    const message = String(error?.message ?? "Unknown model error");
    const notConfigured = /No AI API key configured/i.test(message);
    return {
      state: notConfigured ? "gathering_information" : "needs_caretaker_input",
      message: notConfigured
        ? "AI planning is not configured yet. This is a clearly labelled development fallback question, not an AI-generated plan."
        : "The planning service could not safely interpret that response. Your answers are saved; please try again.",
      nextQuestion: notConfigured ? fallbackQuestion(context) : "The service response could not be validated. Please retry after checking the AI provider configuration.",
      safety,
      serviceError: notConfigured ? "AI_PROVIDER_NOT_CONFIGURED" : "AI_RESPONSE_INVALID",
    };
  }
}

async function generatePlan(goal: string, context: Record<string, unknown>, profile: Record<string, unknown>, language: string): Promise<{ plan?: TeachingPlan; error?: string }> {
  try {
    const raw = await generateStructured(promptForPlan(goal, context, profile, language));
    const validated = validateTeachingPlan(parseGeneratedJson(raw));
    if (!validated.plan) return { error: `The model returned a plan that did not pass validation: ${validated.errors.join("; ")}` };
    return { plan: validated.plan };
  } catch (error: any) {
    return { error: `The plan could not be generated safely: ${String(error?.message ?? "Unknown model error")}` };
  }
}

async function advanceWorkflow(row: any, answer?: string) {
  const context = parseJson(row.context_json);
  if (answer) {
    const answers = Array.isArray(context.answers) ? context.answers : [];
    answers.push({ question: row.current_question ?? null, answer: answer.trim(), at: new Date().toISOString() });
    context.answers = answers.slice(-20);
  }
  const profile = childContext(row.child_id);
  const decision = await decideInterview(row.goal, context, profile, row.language);
  const nextContext = { ...context, ...(decision.contextUpdates ?? {}) };
  let state: WorkflowState = decision.state;
  let draftPlan: TeachingPlan | null = null;
  let currentQuestion = decision.nextQuestion ?? null;
  let blockedReason = decision.blockedReason ?? null;

  if (state === "plan_ready_for_review") {
    const generated = await generatePlan(row.goal, nextContext, profile, row.language);
    if (!generated.plan) {
      state = "needs_caretaker_input";
      currentQuestion = "The draft did not pass the safety and format checks. Please add any missing practical detail, then try again.";
      blockedReason = generated.error ?? null;
    } else {
      draftPlan = generated.plan;
    }
  }

  db.prepare(`UPDATE teaching_workflows
    SET state=?, context_json=?, current_question=?, draft_plan_json=?, safety_json=?, blocked_reason=?, updated_at=datetime('now')
    WHERE id=?`).run(
      state, JSON.stringify(nextContext), currentQuestion,
      draftPlan ? JSON.stringify(draftPlan) : row.draft_plan_json,
      JSON.stringify(decision.safety), blockedReason, row.id,
    );
  return workflowResponse(getWorkflow(row.child_id, row.id));
}

const AID_TYPES = ["first_then", "token", "choice"] as const;
type AidType = typeof AID_TYPES[number];

function isAidType(value: unknown): value is AidType {
  return typeof value === "string" && AID_TYPES.includes(value as AidType);
}

function defaultAidConfig(aidType: AidType): Record<string, unknown> {
  if (aidType === "first_then") {
    return { firstLabel: "First", firstActivity: "", firstSymbol: "▶️", thenLabel: "Then", thenActivity: "", thenSymbol: "⭐" };
  }
  if (aidType === "token") {
    return { goalActivity: "", tokenCount: 5, earnedTokens: 0 };
  }
  return { options: [] };
}

function currentAidConfig(childId: number, aidType: AidType): { enabled: boolean; config: Record<string, unknown> } {
  const row: any = db.prepare(`SELECT enabled, config_json FROM id_teaching_aid_configs
    WHERE child_id=? AND aid_type=? ORDER BY id DESC LIMIT 1`).get(childId, aidType);
  return row
    ? { enabled: row.enabled === 1, config: parseJson(row.config_json) }
    : { enabled: false, config: defaultAidConfig(aidType) };
}

function optionalBoardText(value: unknown, maximum: number, field: string): string {
  if (typeof value !== "string" || value.trim().length > maximum) {
    throw new Error(`${field} must be a string of at most ${maximum} characters`);
  }
  return value.trim();
}

function recordAidConfig(childId: number, userId: number, aidType: AidType, enabled: boolean, config: Record<string, unknown>): void {
  db.transaction(() => {
    db.prepare(`INSERT INTO id_teaching_aid_configs
      (child_id, aid_type, enabled, config_json, recorded_by_user_id) VALUES (?,?,?,?,?)`)
      .run(childId, aidType, enabled ? 1 : 0, JSON.stringify(config), userId);
    db.prepare(`INSERT INTO id_teaching_aid_events
      (child_id, aid_type, event_type, event_json, recorded_by_user_id) VALUES (?,?,'configuration_saved',?,?)`)
      .run(childId, aidType, JSON.stringify({ enabled }), userId);
  })();
}

router.get("/children/:childId/teaching/assessments", authenticate, (req, res) => {
  const childId = routeId(req.params.childId);
  if (!requireChildAccess((req as any).sessionUser.userId, childId)) return res.status(403).json({ error: "No access to this child" });
  const skills = db.prepare(`SELECT id, domain, skill_name as skillName,
      assessment_status as assessmentStatus, learning_opportunity as learningOpportunity,
      observer_type as observerType, observation_date as observationDate,
      context, example, corrects_id as correctsId, created_at as recordedAt
    FROM id_skill_assessments WHERE child_id=? ORDER BY observation_date DESC, id DESC LIMIT 200`).all(childId);
  const activities = db.prepare(`SELECT id, domain, activity_name as activityName,
      assistance_level as assistanceLevel, performance_outcome as performanceOutcome,
      observer_type as observerType, observation_date as observationDate,
      context, example, corrects_id as correctsId, created_at as recordedAt
    FROM id_functional_assessments WHERE child_id=? ORDER BY observation_date DESC, id DESC LIMIT 200`).all(childId);
  res.json({ skills, activities, basicMrDomains: BASIC_MR_DOMAINS, facpDomains: FACP_DOMAINS });
});

router.post("/children/:childId/teaching/assessments/skills", authenticate, (req, res) => {
  const childId = routeId(req.params.childId);
  const userId = (req as any).sessionUser.userId as number;
  const parsed = parseIdSkillAssessment(req.body);
  if (!parsed.assessment) return res.status(400).json({ error: "Invalid skill observation", details: parsed.errors });
  if (!requireChildAccess(userId, childId)) return res.status(403).json({ error: "No access to this child" });
  try { assertConsent(childId); } catch (error: any) { return res.status(error.status ?? 403).json({ error: error.message }); }
  if (parsed.assessment.correctsId && !db.prepare(
    "SELECT 1 FROM id_skill_assessments WHERE id=? AND child_id=?",
  ).get(parsed.assessment.correctsId, childId)) return res.status(404).json({ error: "Skill observation to correct was not found" });

  const assessment = parsed.assessment;
  const info = db.prepare(`INSERT INTO id_skill_assessments
    (child_id, domain, skill_name, assessment_status, learning_opportunity, observer_type,
     observation_date, context, example, corrects_id, recorded_by_user_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
    childId, assessment.domain, assessment.skillName, assessment.assessmentStatus,
    assessment.learningOpportunity, assessment.observerType, assessment.observationDate,
    assessment.context, assessment.example, assessment.correctsId, userId,
  );
  const saved = db.prepare(`SELECT id, domain, skill_name as skillName,
      assessment_status as assessmentStatus, learning_opportunity as learningOpportunity,
      observer_type as observerType, observation_date as observationDate,
      context, example, corrects_id as correctsId, created_at as recordedAt
    FROM id_skill_assessments WHERE id=?`).get(info.lastInsertRowid);
  res.status(201).json(saved);
});

router.post("/children/:childId/teaching/assessments/activities", authenticate, (req, res) => {
  const childId = routeId(req.params.childId);
  const userId = (req as any).sessionUser.userId as number;
  const parsed = parseIdFunctionalAssessment(req.body);
  if (!parsed.assessment) return res.status(400).json({ error: "Invalid functional observation", details: parsed.errors });
  if (!requireChildAccess(userId, childId)) return res.status(403).json({ error: "No access to this child" });
  try { assertConsent(childId); } catch (error: any) { return res.status(error.status ?? 403).json({ error: error.message }); }
  if (parsed.assessment.correctsId && !db.prepare(
    "SELECT 1 FROM id_functional_assessments WHERE id=? AND child_id=?",
  ).get(parsed.assessment.correctsId, childId)) return res.status(404).json({ error: "Functional observation to correct was not found" });

  const assessment = parsed.assessment;
  const info = db.prepare(`INSERT INTO id_functional_assessments
    (child_id, domain, activity_name, assistance_level, performance_outcome, observer_type,
     observation_date, context, example, corrects_id, recorded_by_user_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
    childId, assessment.domain, assessment.activityName, assessment.assistanceLevel,
    assessment.performanceOutcome, assessment.observerType, assessment.observationDate,
    assessment.context, assessment.example, assessment.correctsId, userId,
  );
  const saved = db.prepare(`SELECT id, domain, activity_name as activityName,
      assistance_level as assistanceLevel, performance_outcome as performanceOutcome,
      observer_type as observerType, observation_date as observationDate,
      context, example, corrects_id as correctsId, created_at as recordedAt
    FROM id_functional_assessments WHERE id=?`).get(info.lastInsertRowid);
  res.status(201).json(saved);
});

router.get("/children/:childId/teaching/aids", authenticate, (req, res) => {
  const childId = routeId(req.params.childId);
  if (!requireChildAccess((req as any).sessionUser.userId, childId)) return res.status(403).json({ error: "No access to this child" });
  const configs = Object.fromEntries(AID_TYPES.map((aidType) => [aidType, currentAidConfig(childId, aidType)]));
  const events = (db.prepare(`SELECT id, aid_type as aidType, event_type as eventType,
      event_json as eventJson, created_at as recordedAt
    FROM id_teaching_aid_events WHERE child_id=? ORDER BY id DESC LIMIT 50`).all(childId) as any[])
    .map((event) => ({ ...event, details: parseJson(event.eventJson) }));
  res.json({ configs, events });
});

router.post("/children/:childId/teaching/aids/:aidType", authenticate, (req, res) => {
  const childId = routeId(req.params.childId);
  const userId = (req as any).sessionUser.userId as number;
  const aidType = req.params.aidType;
  if (!isAidType(aidType)) return res.status(404).json({ error: "Unknown teaching aid" });
  if (typeof req.body.enabled !== "boolean") return res.status(400).json({ error: "enabled must be a boolean" });
  if (!requireChildAccess(userId, childId)) return res.status(403).json({ error: "No access to this child" });
  try { assertConsent(childId); } catch (error: any) { return res.status(error.status ?? 403).json({ error: error.message }); }

  const input = asRecord(req.body.config);
  let config: Record<string, unknown>;
  try {
    if (aidType === "first_then") {
      const firstActivity = optionalBoardText(input.firstActivity, 160, "firstActivity");
      const thenActivity = optionalBoardText(input.thenActivity, 160, "thenActivity");
      const firstLabel = optionalBoardText(input.firstLabel, 40, "firstLabel");
      const thenLabel = optionalBoardText(input.thenLabel, 40, "thenLabel");
      const firstSymbol = optionalBoardText(input.firstSymbol, 16, "firstSymbol");
      const thenSymbol = optionalBoardText(input.thenSymbol, 16, "thenSymbol");
      if (req.body.enabled && (!firstActivity || !thenActivity || !firstLabel || !thenLabel)) {
        return res.status(400).json({ error: "Enabled First–Then boards need both activity labels" });
      }
      config = { firstActivity, thenActivity, firstLabel: firstLabel || "First", thenLabel: thenLabel || "Then", firstSymbol: firstSymbol || "▶️", thenSymbol: thenSymbol || "⭐" };
    } else if (aidType === "token") {
      const goalActivity = optionalBoardText(input.goalActivity, 160, "goalActivity");
      const tokenCount = input.tokenCount;
      if (typeof tokenCount !== "number" || !Number.isInteger(tokenCount) || tokenCount < 1 || tokenCount > 20) {
        return res.status(400).json({ error: "tokenCount must be between 1 and 20" });
      }
      if (req.body.enabled && !goalActivity) return res.status(400).json({ error: "Enabled token boards need an agreed activity goal" });
      const previous = currentAidConfig(childId, "token").config;
      const previousEarned = Number.isInteger(previous.earnedTokens) ? previous.earnedTokens as number : 0;
      config = { goalActivity, tokenCount, earnedTokens: Math.min(previousEarned, tokenCount) };
    } else {
      if (!Array.isArray(input.options) || input.options.length > 12) {
        return res.status(400).json({ error: "Choice boards may contain up to 12 options" });
      }
      const options: Array<{ id: string; title: string; symbol: string }> = [];
      for (const [index, raw] of input.options.entries()) {
        const option = asRecord(raw);
        const id = typeof option.id === "string" ? option.id.trim() : "";
        const title = typeof option.title === "string" ? option.title.trim() : "";
        const symbol = typeof option.symbol === "string" ? option.symbol.trim() : "";
        if (!/^[\w-]{1,60}$/.test(id) || !title || title.length > 120 || symbol.length > 16) {
          return res.status(400).json({ error: `Choice ${index + 1} needs an ID, a short label, and an optional symbol` });
        }
        options.push({ id, title, symbol });
      }
      if (new Set(options.map((option) => option.id)).size !== options.length) {
        return res.status(400).json({ error: "Choice IDs must be unique" });
      }
      if (req.body.enabled && options.length < 2) return res.status(400).json({ error: "Enabled choice boards need at least two options" });
      config = { options };
    }
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : "Invalid board configuration" });
  }

  recordAidConfig(childId, userId, aidType, req.body.enabled, config);
  res.status(201).json({ aidType, enabled: req.body.enabled, config });
});

router.post("/children/:childId/teaching/aids/:aidType/events", authenticate, (req, res) => {
  const childId = routeId(req.params.childId);
  const userId = (req as any).sessionUser.userId as number;
  const aidType = req.params.aidType;
  const action = req.body.action;
  if (!isAidType(aidType)) return res.status(404).json({ error: "Unknown teaching aid" });
  if (!requireChildAccess(userId, childId)) return res.status(403).json({ error: "No access to this child" });
  try { assertConsent(childId); } catch (error: any) { return res.status(error.status ?? 403).json({ error: error.message }); }

  if (aidType === "token" && (action === "token_earned" || action === "token_reset")) {
    let updatedConfig: Record<string, unknown> | null = null;
    const record = db.transaction(() => {
      const current = currentAidConfig(childId, "token");
      if (!current.enabled) return { error: "Enable and configure the token board first" };
      const tokenCount = Number(current.config.tokenCount);
      const earned = Number(current.config.earnedTokens);
      if (!Number.isInteger(tokenCount) || !Number.isInteger(earned)) return { error: "Token board configuration is invalid" };
      if (action === "token_earned" && earned >= tokenCount) return { error: "The configured token goal has already been reached" };
      updatedConfig = { ...current.config, earnedTokens: action === "token_reset" ? 0 : earned + 1 };
      db.prepare(`INSERT INTO id_teaching_aid_configs
        (child_id, aid_type, enabled, config_json, recorded_by_user_id) VALUES (?,'token',1,?,?)`)
        .run(childId, JSON.stringify(updatedConfig), userId);
      db.prepare(`INSERT INTO id_teaching_aid_events
        (child_id, aid_type, event_type, event_json, recorded_by_user_id) VALUES (?,'token',?,?,?)`)
        .run(childId, action, JSON.stringify({ earnedTokens: updatedConfig.earnedTokens, tokenCount }), userId);
      return { config: updatedConfig };
    })();
    if ("error" in record) return res.status(409).json(record);
    return res.status(201).json({ aidType, enabled: true, config: updatedConfig });
  }

  if (aidType === "choice" && action === "choice_selected") {
    const current = currentAidConfig(childId, "choice");
    const options = Array.isArray(current.config.options) ? current.config.options as Array<{ id?: unknown; title?: unknown }> : [];
    const option = options.find((item) => item.id === req.body.optionId);
    if (!current.enabled || !option || typeof option.title !== "string") {
      return res.status(409).json({ error: "Select an available option from an enabled choice board" });
    }
    const note = typeof req.body.note === "string" ? req.body.note.trim() : "";
    if (note.length > 300) return res.status(400).json({ error: "note must be at most 300 characters" });
    const info = db.prepare(`INSERT INTO id_teaching_aid_events
      (child_id, aid_type, event_type, event_json, recorded_by_user_id)
      VALUES (?,'choice','choice_selected',?,?)`)
      .run(childId, JSON.stringify({ optionId: option.id, title: option.title, note: note || null }), userId);
    return res.status(201).json({ id: info.lastInsertRowid, optionId: option.id, selected: true });
  }

  return res.status(400).json({ error: "This action is not supported for the selected teaching aid" });
});

router.get("/children/:childId/teaching/workflows", authenticate, (req, res) => {
  const childId = routeId(req.params.childId);
  if (!requireChildAccess((req as any).sessionUser.userId, childId)) return res.status(403).json({ error: "No access to this child" });
  const rows = db.prepare("SELECT * FROM teaching_workflows WHERE child_id=? ORDER BY updated_at DESC").all(childId) as any[];
  res.json(rows.map(workflowResponse));
});

router.get("/children/:childId/teaching/results", authenticate, (req, res) => {
  const childId = routeId(req.params.childId);
  if (!requireChildAccess((req as any).sessionUser.userId, childId)) return res.status(403).json({ error: "No access to this child" });

  const sessions = db.prepare(`SELECT s.id, s.workflow_id, s.status, s.started_at, s.ended_at, w.goal, w.draft_plan_json
    FROM teaching_sessions s JOIN teaching_workflows w ON w.id=s.workflow_id
    WHERE s.child_id=? ORDER BY s.started_at DESC LIMIT 50`).all(childId) as any[];

  res.json(sessions.map((session) => {
    const plan = parseJson(session.draft_plan_json);
    const steps = Array.isArray(plan.steps) ? plan.steps.map((step: any) => ({
      id: step.id,
      title: step.title,
      instruction: step.instruction?.en ?? "",
      visualCue: step.visualCue ?? "",
      promptingStrategy: step.prompting?.strategy ?? "",
      adaptations: Array.isArray(step.adaptations) ? step.adaptations : [],
    })) : [];
    const events = db.prepare(`SELECT e.step_id as stepId, e.caretaker_outcome as caretakerOutcome,
      e.assistance_level as assistanceLevel, e.performance_outcome as performanceOutcome,
      e.assistance_required as assistanceRequired, e.retries,
        e.response_time_ms as responseTimeMs, e.created_at as recordedAt,
        o.source, o.caretaker_report as caretakerReport
      FROM teaching_events e LEFT JOIN teaching_observations o ON o.id=e.observation_id
      WHERE e.session_id=? ORDER BY e.created_at`).all(session.id) as any[];

    return {
      id: session.id,
      workflowId: session.workflow_id,
      goal: session.goal,
      status: session.status,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      steps,
      events,
      systemSuggestions: events.length ? deriveAdaptationSuggestions(events) : [],
    };
  }));
});

router.get("/children/:childId/teaching/workflows/:workflowId", authenticate, (req, res) => {
  const childId = routeId(req.params.childId);
  const workflowId = routeId(req.params.workflowId);
  if (!requireChildAccess((req as any).sessionUser.userId, childId)) return res.status(403).json({ error: "No access to this child" });
  const row = getWorkflow(childId, workflowId);
  if (!row) return res.status(404).json({ error: "Teaching workflow not found" });
  res.json(workflowResponse(row));
});

router.post("/children/:childId/teaching/workflows", authenticate, async (req, res) => {
  const childId = routeId(req.params.childId);
  const userId = (req as any).sessionUser.userId as number;
  const goal = typeof req.body.goal === "string" ? req.body.goal.trim() : "";
  const language = typeof req.body.language === "string" && req.body.language.length <= 12 ? req.body.language : "en";
  if (goal.length < 3 || goal.length > 1_000) return res.status(400).json({ error: "goal must be between 3 and 1000 characters" });
  if (!requireChildAccess(userId, childId)) return res.status(403).json({ error: "No access to this child" });
  try { assertConsent(childId); } catch (error: any) { return res.status(error.status ?? 403).json({ error: error.message }); }

  const initialContext = asRecord(req.body.context);
  const safety = evaluateSafety(goal, initialContext);
  const state: WorkflowState = safety.level === "blocked" ? "blocked" : "gathering_information";
  const info = db.prepare(`INSERT INTO teaching_workflows
    (child_id, state, goal, context_json, safety_json, blocked_reason, language, created_by_user_id)
    VALUES (?,?,?,?,?,?,?,?)`).run(
      childId, state, goal, JSON.stringify(initialContext), JSON.stringify(safety),
      state === "blocked" ? safety.message : null, language, userId,
    );
  const row = getWorkflow(childId, Number(info.lastInsertRowid));
  if (!row) return res.status(500).json({ error: "Could not create teaching workflow" });
  if (state === "blocked") return res.status(422).json(workflowResponse(row));
  const advanced = await advanceWorkflow(row);
  res.status(201).json(advanced);
});

router.post("/children/:childId/teaching/workflows/:workflowId/answers", authenticate, async (req, res) => {
  const childId = routeId(req.params.childId);
  const workflowId = routeId(req.params.workflowId);
  const answer = typeof req.body.answer === "string" ? req.body.answer.trim() : "";
  if (answer.length < 1 || answer.length > 2_000) return res.status(400).json({ error: "answer must be between 1 and 2000 characters" });
  if (!requireChildAccess((req as any).sessionUser.userId, childId)) return res.status(403).json({ error: "No access to this child" });
  const row = getWorkflow(childId, workflowId);
  if (!row) return res.status(404).json({ error: "Teaching workflow not found" });
  if (!["gathering_information", "needs_caretaker_input"].includes(row.state)) return res.status(409).json({ error: `Cannot answer a workflow in ${row.state}` });
  try { assertConsent(childId); } catch (error: any) { return res.status(error.status ?? 403).json({ error: error.message }); }
  res.json(await advanceWorkflow(row, answer));
});

router.put("/children/:childId/teaching/workflows/:workflowId/plan", authenticate, (req, res) => {
  const childId = routeId(req.params.childId);
  const workflowId = routeId(req.params.workflowId);
  if (!requireChildAccess((req as any).sessionUser.userId, childId)) return res.status(403).json({ error: "No access to this child" });
  const row = getWorkflow(childId, workflowId);
  if (!row) return res.status(404).json({ error: "Teaching workflow not found" });
  if (row.state !== "plan_ready_for_review") return res.status(409).json({ error: "Only a draft ready for review can be edited" });
  const validated = validateTeachingPlan(req.body.plan);
  if (!validated.plan) return res.status(422).json({ error: "Plan validation failed", details: validated.errors });
  db.prepare("UPDATE teaching_workflows SET draft_plan_json=?, updated_at=datetime('now') WHERE id=?").run(JSON.stringify(validated.plan), workflowId);
  res.json(workflowResponse(getWorkflow(childId, workflowId)));
});

router.post("/children/:childId/teaching/workflows/:workflowId/approve", authenticate, (req, res) => {
  const childId = routeId(req.params.childId);
  const workflowId = routeId(req.params.workflowId);
  const userId = (req as any).sessionUser.userId as number;
  if (!requireChildAccess(userId, childId)) return res.status(403).json({ error: "No access to this child" });
  try { assertConsent(childId); } catch (error: any) { return res.status(error.status ?? 403).json({ error: error.message }); }
  const row = getWorkflow(childId, workflowId);
  if (!row) return res.status(404).json({ error: "Teaching workflow not found" });
  if (row.state !== "plan_ready_for_review") return res.status(409).json({ error: "Only a reviewed draft can be approved" });
  const safety = evaluateSafety(row.goal, parseJson(row.context_json));
  const validPlan = validateTeachingPlan(JSON.parse(row.draft_plan_json ?? "null"));
  if (safety.level !== "clear" || !validPlan.plan) return res.status(422).json({ error: "Plan cannot be approved until safety and plan validation pass", details: validPlan.errors });
  db.prepare(`UPDATE teaching_workflows SET state='approved', approved_by_user_id=?, approved_at=datetime('now'), updated_at=datetime('now') WHERE id=?`).run(userId, workflowId);
  res.json(workflowResponse(getWorkflow(childId, workflowId)));
});

router.post("/children/:childId/teaching/workflows/:workflowId/reject", authenticate, (req, res) => {
  const childId = routeId(req.params.childId);
  const workflowId = routeId(req.params.workflowId);
  if (!requireChildAccess((req as any).sessionUser.userId, childId)) return res.status(403).json({ error: "No access to this child" });
  const row = getWorkflow(childId, workflowId);
  if (!row) return res.status(404).json({ error: "Teaching workflow not found" });
  if (!["gathering_information", "needs_caretaker_input", "plan_ready_for_review"].includes(row.state)) return res.status(409).json({ error: `Cannot reject a workflow in ${row.state}` });
  const reason = typeof req.body.reason === "string" ? req.body.reason.trim().slice(0, 1_000) : null;
  db.prepare("UPDATE teaching_workflows SET state='cancelled', blocked_reason=?, updated_at=datetime('now') WHERE id=?").run(reason, workflowId);
  res.json(workflowResponse(getWorkflow(childId, workflowId)));
});

router.post("/children/:childId/teaching/workflows/:workflowId/sessions", authenticate, (req, res) => {
  const childId = routeId(req.params.childId);
  const workflowId = routeId(req.params.workflowId);
  const userId = (req as any).sessionUser.userId as number;
  if (!requireChildAccess(userId, childId)) return res.status(403).json({ error: "No access to this child" });
  try { assertConsent(childId); } catch (error: any) { return res.status(error.status ?? 403).json({ error: error.message }); }
  const workflow = getWorkflow(childId, workflowId);
  if (!workflow) return res.status(404).json({ error: "Teaching workflow not found" });
  if (workflow.state !== "approved") return res.status(409).json({ error: "Caretaker approval is required before a teaching session can start" });
  const info = db.prepare(`INSERT INTO teaching_sessions (workflow_id, child_id, status, started_by_user_id) VALUES (?,?,'in_progress',?)`).run(workflowId, childId, userId);
  db.prepare("UPDATE teaching_workflows SET state='in_progress', updated_at=datetime('now') WHERE id=?").run(workflowId);
  res.status(201).json(db.prepare("SELECT * FROM teaching_sessions WHERE id=?").get(info.lastInsertRowid));
});

router.post("/children/:childId/teaching/sessions/:sessionId/detect-objects", authenticate, async (req, res) => {
  const childId = routeId(req.params.childId);
  const sessionId = routeId(req.params.sessionId);
  const userId = (req as any).sessionUser.userId as number;
  if (!requireChildAccess(userId, childId)) return res.status(403).json({ error: "No access to this child" });
  try { assertConsent(childId); } catch (error: any) { return res.status(error.status ?? 403).json({ error: error.message }); }

  const session: any = db.prepare("SELECT * FROM teaching_sessions WHERE id=? AND child_id=? AND status='in_progress'").get(sessionId, childId);
  if (!session) return res.status(404).json({ error: "Active teaching session not found" });

  const frameDataUrl = typeof req.body.frameDataUrl === "string" ? req.body.frameDataUrl : "";
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(frameDataUrl);
  if (!match || frameDataUrl.length > 2_800_000) return res.status(400).json({ error: "A small JPEG still frame is required" });
  const frameBytes = Buffer.from(match[1], "base64");
  if (!frameBytes.length || frameBytes.length > 2 * 1024 * 1024 || frameBytes.toString("base64").replace(/=+$/, "") !== match[1].replace(/=+$/, "")) {
    return res.status(413).json({ error: "Frame must be a valid JPEG no larger than 2 MB" });
  }

  try {
    const form = new FormData();
    form.append("frame", new Blob([Uint8Array.from(frameBytes)], { type: "image/jpeg" }), "camera-frame.jpg");
    const response = await fetch(`${config.ML_SIDECAR_URL}/detect-objects`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return res.status(503).json({ error: "The object detector is unavailable or rejected this frame. Check that the ML sidecar is running." });

    const result = await response.json() as Record<string, unknown>;
    const detections = Array.isArray(result.detections) ? result.detections.filter((item: any) =>
      item && typeof item.label === "string" && Number.isFinite(item.confidence)
      && Array.isArray(item.boundingBoxXYXY) && item.boundingBoxXYXY.length === 4
      && item.boundingBoxXYXY.every((value: unknown) => typeof value === "number" && Number.isFinite(value))
    ).slice(0, 10).map((item: any) => ({
      label: item.label.slice(0, 80),
      confidence: Math.max(0, Math.min(1, item.confidence)),
      boundingBoxXYXY: item.boundingBoxXYXY,
    })) : [];
    return res.json({
      status: detections.length ? "success" : "uncertain",
      model: typeof result.model === "string" ? result.model.slice(0, 80) : "object-detector",
      detections,
      limitation: "Visible objects only. This does not identify people or prove an action, intent, safety, or task completion.",
    });
  } catch {
    return res.status(503).json({ error: "Could not reach the object detector. Check that the ML sidecar is running." });
  }
});

router.post("/children/:childId/teaching/sessions/:sessionId/observations", authenticate, (req, res) => {
  const childId = routeId(req.params.childId);
  const sessionId = routeId(req.params.sessionId);
  const userId = (req as any).sessionUser.userId as number;
  const source = req.body.source as ObservationSource;
  const stepId = typeof req.body.stepId === "string" ? req.body.stepId.trim() : "";
  if (!OBSERVATION_SOURCES.includes(source) || !stepId || stepId.length > 80) return res.status(400).json({ error: "A valid source and stepId are required" });
  if (!requireChildAccess(userId, childId)) return res.status(403).json({ error: "No access to this child" });
  try { assertConsent(childId); } catch (error: any) { return res.status(error.status ?? 403).json({ error: error.message }); }
  const session: any = db.prepare("SELECT * FROM teaching_sessions WHERE id=? AND child_id=? AND status='in_progress'").get(sessionId, childId);
  if (!session) return res.status(404).json({ error: "Active teaching session not found" });
  const evidence = asRecord(req.body.evidence);
  const limitations = typeof req.body.limitations === "string" ? req.body.limitations.trim() : null;
  const caretakerReport = typeof req.body.caretakerReport === "string" ? req.body.caretakerReport.trim() : null;
  const modelName = typeof req.body.modelName === "string" ? req.body.modelName.trim() : null;
  const modelConfidence = typeof req.body.modelConfidence === "number" && req.body.modelConfidence >= 0 && req.body.modelConfidence <= 1 ? req.body.modelConfidence : null;
  if (source === "camera_observed" && (!Object.keys(evidence).length || !modelName)) return res.status(422).json({ error: "Camera observations need detected evidence and a model name; detection alone does not prove task completion." });
  if (source === "camera_uncertain" && !limitations) return res.status(422).json({ error: "Camera uncertainty must explain its limitation" });
  if (source === "caretaker_reported" && !caretakerReport) return res.status(422).json({ error: "Caretaker-reported observations need the caretaker's report" });
  const info = db.prepare(`INSERT INTO teaching_observations
    (session_id, step_id, source, evidence_json, model_name, model_confidence, limitations, caretaker_report, recorded_by_user_id)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(sessionId, stepId, source, Object.keys(evidence).length ? JSON.stringify(evidence) : null, modelName, modelConfidence, limitations, caretakerReport, userId);
  res.status(201).json(db.prepare("SELECT * FROM teaching_observations WHERE id=?").get(info.lastInsertRowid));
});

router.post("/children/:childId/teaching/sessions/:sessionId/events", authenticate, (req, res) => {
  const childId = routeId(req.params.childId);
  const sessionId = routeId(req.params.sessionId);
  const userId = (req as any).sessionUser.userId as number;
  const stepId = typeof req.body.stepId === "string" ? req.body.stepId.trim() : "";
  const retries = Number.isInteger(req.body.retries) && req.body.retries >= 0 && req.body.retries <= 20 ? req.body.retries : 0;
  const responseTimeMs = Number.isInteger(req.body.responseTimeMs) && req.body.responseTimeMs >= 0 && req.body.responseTimeMs <= 3_600_000 ? req.body.responseTimeMs : null;
  const performanceOutcome = req.body.performanceOutcome;
  const assistanceLevel = req.body.assistanceLevel;
  if (performanceOutcome !== undefined && !PERFORMANCE_OUTCOMES.includes(performanceOutcome)) {
    return res.status(400).json({ error: "Invalid performanceOutcome" });
  }
  if (assistanceLevel !== undefined && !ASSISTANCE_LEVELS.includes(assistanceLevel)) {
    return res.status(400).json({ error: "Invalid assistanceLevel" });
  }
  if ((performanceOutcome === undefined) !== (assistanceLevel === undefined)) {
    return res.status(400).json({ error: "performanceOutcome and assistanceLevel must be supplied together" });
  }
  const legacyOutcome = performanceOutcome === "completed_independently" ? "independent"
    : performanceOutcome === "completed_with_assistance" ? "assisted"
    : performanceOutcome === "partially_completed" || performanceOutcome === "not_completed" ? "not_completed"
    : performanceOutcome === "not_attempted" || performanceOutcome === "unable_to_determine" ? "unknown"
    : ["independent", "assisted", "not_completed", "unknown"].includes(req.body.caretakerOutcome)
      ? req.body.caretakerOutcome
      : "unknown";
  const assistanceRequired = assistanceLevel === "independent" ? 0
    : assistanceLevel === "not_applicable" || assistanceLevel === "insufficient_opportunity" ? null
    : assistanceLevel !== undefined ? 1
    : req.body.assistanceRequired === true ? 1
    : req.body.assistanceRequired === false ? 0
    : null;
  if (!stepId || stepId.length > 80) return res.status(400).json({ error: "A valid stepId is required" });
  if (!requireChildAccess(userId, childId)) return res.status(403).json({ error: "No access to this child" });
  try { assertConsent(childId); } catch (error: any) { return res.status(error.status ?? 403).json({ error: error.message }); }
  const session: any = db.prepare("SELECT * FROM teaching_sessions WHERE id=? AND child_id=? AND status='in_progress'").get(sessionId, childId);
  if (!session) return res.status(404).json({ error: "Active teaching session not found" });
  const observationId = Number.isSafeInteger(req.body.observationId) ? req.body.observationId : null;
  if (observationId && !db.prepare("SELECT 1 FROM teaching_observations WHERE id=? AND session_id=?").get(observationId, sessionId)) return res.status(422).json({ error: "Observation does not belong to this session" });
  const info = db.prepare(`INSERT INTO teaching_events
    (session_id, step_id, prompt_type, prompt_language, assistance_required, assistance_level,
     performance_outcome, retries, response_time_ms, observation_id, caretaker_outcome)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
      sessionId, stepId, typeof req.body.promptType === "string" ? req.body.promptType.slice(0, 80) : null,
      typeof req.body.promptLanguage === "string" ? req.body.promptLanguage.slice(0, 12) : null,
      assistanceRequired, assistanceLevel ?? null, performanceOutcome ?? null,
      retries, responseTimeMs, observationId, legacyOutcome,
    );
  res.status(201).json(db.prepare("SELECT * FROM teaching_events WHERE id=?").get(info.lastInsertRowid));
});

router.post("/children/:childId/teaching/sessions/:sessionId/complete", authenticate, (req, res) => {
  const childId = routeId(req.params.childId);
  const sessionId = routeId(req.params.sessionId);
  const userId = (req as any).sessionUser.userId as number;
  if (!requireChildAccess(userId, childId)) return res.status(403).json({ error: "No access to this child" });
  try { assertConsent(childId); } catch (error: any) { return res.status(error.status ?? 403).json({ error: error.message }); }
  const session: any = db.prepare("SELECT * FROM teaching_sessions WHERE id=? AND child_id=? AND status='in_progress'").get(sessionId, childId);
  if (!session) return res.status(404).json({ error: "Active teaching session not found" });
  db.prepare("UPDATE teaching_sessions SET status='completed', ended_at=datetime('now') WHERE id=?").run(sessionId);
  db.prepare("UPDATE teaching_workflows SET state='completed', updated_at=datetime('now') WHERE id=?").run(session.workflow_id);
  res.json(db.prepare("SELECT * FROM teaching_sessions WHERE id=?").get(sessionId));
});

router.get("/children/:childId/teaching/sessions/:sessionId/suggestions", authenticate, (req, res) => {
  const childId = routeId(req.params.childId);
  const sessionId = routeId(req.params.sessionId);
  if (!requireChildAccess((req as any).sessionUser.userId, childId)) return res.status(403).json({ error: "No access to this child" });
  const rows = db.prepare(`SELECT e.assistance_required as assistanceRequired, e.retries, e.response_time_ms as responseTimeMs,
      e.step_id as stepId, e.assistance_level as assistanceLevel,
      e.performance_outcome as performanceOutcome, e.caretaker_outcome as caretakerOutcome,
      e.created_at as recordedAt, o.source
    FROM teaching_events e LEFT JOIN teaching_observations o ON o.id=e.observation_id
    JOIN teaching_sessions s ON s.id=e.session_id WHERE e.session_id=? AND s.child_id=? ORDER BY e.created_at DESC LIMIT 10`).all(sessionId, childId) as any[];
  res.json({
    suggestions: deriveAdaptationSuggestions(rows),
    sampleSize: rows.length,
    note: "Suggestions are based on recorded, interpretable attempts. They are not a claim of mastery or a diagnosis, and the caretaker decides whether to use them.",
  });
});

export default router;
