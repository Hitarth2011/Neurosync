/**
 * User Routes
 * Handles user profile, children profiles, and data management
 */

import express from "express";
import multer from "multer";
import db from "../../db/index.js";
import { authenticate } from "../../lib/auth.js";
import { assertConsent, revokeConsent, eraseChildData } from "../../lib/consent.js";
import { getHandwritingServiceError, getHandwritingServiceUrl } from "../../lib/handwriting-service.js";

const router = express.Router();

// ── Multer middleware for handwriting uploads ──────────────────────────────
const handwritingStorage = multer.memoryStorage();
const uploadHandwriting = multer({
  storage: handwritingStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: express.Request, file: any, cb: Function) => {
    if (file.mimetype?.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are accepted"));
    }
  },
}).single("image");

function routeId(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = Number.parseInt(raw ?? "", 10);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("Invalid route id");
  return id;
}

function hasOwnerAccess(userId: number, childId: number): boolean {
  return Boolean(db.prepare(
    "SELECT 1 FROM child_access WHERE user_id=? AND child_id=? AND role='owner'"
  ).get(userId, childId));
}

/**
 * GET /api/me
 * Get current user profile with children
 * NOTE: displayName and email are completely independent.
 * Users can change their displayName without affecting email login.
 */
router.get("/me", authenticate, (req, res) => {
  const { userId } = (req as any).sessionUser;
  const user: any = db.prepare(
    "SELECT id, org_id, email, role, profile_type, display_name, preferred_language FROM users WHERE id = ?"
  ).get(userId);
  
  if (!user) return res.status(404).json({ error: "User not found" });

  const children = db.prepare(
    `SELECT cp.id, cp.onboarding_data, cp.created_at
     FROM children_profiles cp
     JOIN child_access ca ON ca.child_id = cp.id
     WHERE ca.user_id = ?`
  ).all(userId);

  res.json({
    id: user.id,
    email: user.email,
    role: user.role,
    profileType: user.profile_type,
    displayName: user.display_name,
    preferredLanguage: user.preferred_language,
    children: children.map((c: any) => ({
      ...c,
      onboarding_data: c.onboarding_data ? JSON.parse(c.onboarding_data) : null,
    })),
  });
});

/**
 * PUT /api/profile/display-name
 * Update user's display name independently from email.
 * Email is immutable (used for login), name can be changed anytime.
 * This decouples identity from authentication credentials.
 */
router.put("/profile/display-name", authenticate, (req, res) => {
  const { userId } = (req as any).sessionUser;
  const { displayName } = req.body;

  // Validate display name
  if (!displayName || typeof displayName !== "string") {
    return res.status(400).json({ error: "displayName is required and must be a string" });
  }

  const trimmedName = displayName.trim();
  if (trimmedName.length === 0) {
    return res.status(400).json({ error: "displayName cannot be empty" });
  }

  if (trimmedName.length > 255) {
    return res.status(400).json({ error: "displayName cannot exceed 255 characters" });
  }

  try {
    db.prepare("UPDATE users SET display_name = ? WHERE id = ?").run(trimmedName, userId);
    
    const updated: any = db.prepare(
      "SELECT id, email, role, profile_type, display_name, preferred_language FROM users WHERE id = ?"
    ).get(userId);

    res.json({
      success: true,
      user: {
        id: updated.id,
        email: updated.email,
        displayName: updated.display_name,
        role: updated.role,
        profileType: updated.profile_type,
      },
      message: "Display name updated successfully"
    });
  } catch (err: any) {
    console.error("[update-display-name]", err);
    res.status(500).json({ error: "Failed to update display name" });
  }
});

/**
 * PUT /api/profile/preferred-language
 * Update user's language preference independently.
 */
router.put("/profile/preferred-language", authenticate, (req, res) => {
  const { userId } = (req as any).sessionUser;
  const { preferredLanguage } = req.body;

  const validLanguages = ["en", "hi", "mr"];
  if (!preferredLanguage || !validLanguages.includes(preferredLanguage)) {
    return res.status(400).json({ error: `preferredLanguage must be one of: ${validLanguages.join(", ")}` });
  }

  try {
    db.prepare("UPDATE users SET preferred_language = ? WHERE id = ?").run(preferredLanguage, userId);
    res.json({
      success: true,
      preferredLanguage,
      message: "Language preference updated successfully"
    });
  } catch (err: any) {
    console.error("[update-language]", err);
    res.status(500).json({ error: "Failed to update language preference" });
  }
});

function requireChildAccess(req: any, childId: number): boolean {
  const { userId } = req.sessionUser;
  const access = db.prepare("SELECT 1 FROM child_access WHERE user_id=? AND child_id=?").get(userId, childId);
  return Boolean(access);
}

/**
 * GET /api/children/:id/progress
 * Fetch child progress metrics for tracker.
 */
router.get("/children/:id/progress", authenticate, (req, res) => {
  const childId = routeId(req.params.id);
  if (!requireChildAccess(req, childId)) return res.status(403).json({ error: "No access to this child" });

  const rows = db.prepare(
    "SELECT id, child_id, metric_type, value, timestamp FROM progress WHERE child_id=? ORDER BY timestamp DESC LIMIT 200"
  ).all(childId) as any[];

  res.json(rows);
});

/**
 * POST /api/children/:id/progress
 * Store progress metric value.
 */
router.post("/children/:id/progress", authenticate, (req, res) => {
  const childId = routeId(req.params.id);
  if (!requireChildAccess(req, childId)) return res.status(403).json({ error: "No access to this child" });

  const { metric_type, value } = req.body ?? {};
  const numericValue = Number(value);

  if (!metric_type || typeof metric_type !== "string" || !Number.isFinite(numericValue)) {
    return res.status(400).json({ error: "metric_type and numeric value required" });
  }

  const info = db.prepare(
    "INSERT INTO progress (child_id, metric_type, value, recorded_by_user_id) VALUES (?, ?, ?, ?)"
  ).run(childId, metric_type.trim(), numericValue, (req as any).sessionUser.userId);

  res.json({ id: info.lastInsertRowid, childId, metric_type: metric_type.trim(), value: numericValue, status: "saved" });
});

/**
 * PUT /api/children/:id/progress/:entryId
 * Correct a previously logged progress metric.
 */
router.put("/children/:id/progress/:entryId", authenticate, (req, res) => {
  const childId = routeId(req.params.id);
  const entryId = routeId(req.params.entryId);
  if (!requireChildAccess(req, childId)) return res.status(403).json({ error: "No access to this child" });

  const { metric_type, value } = req.body ?? {};
  const numericValue = Number(value);
  if (typeof metric_type !== "string" || !metric_type.trim() || metric_type.trim().length > 80 || !Number.isFinite(numericValue) || numericValue < 0 || numericValue > 999) {
    return res.status(400).json({ error: "A valid metric_type and value between 0 and 999 are required" });
  }

  const existing = db.prepare("SELECT id FROM progress WHERE id=? AND child_id=?").get(entryId, childId);
  if (!existing) return res.status(404).json({ error: "Progress entry not found" });
  db.prepare("UPDATE progress SET metric_type=?, value=? WHERE id=? AND child_id=?")
    .run(metric_type.trim(), numericValue, entryId, childId);
  res.json({ id: entryId, childId, metric_type: metric_type.trim(), value: numericValue, status: "updated" });
});

/**
 * DELETE /api/children/:id/progress/:entryId
 * Remove a mistaken progress metric.
 */
router.delete("/children/:id/progress/:entryId", authenticate, (req, res) => {
  const childId = routeId(req.params.id);
  const entryId = routeId(req.params.entryId);
  if (!requireChildAccess(req, childId)) return res.status(403).json({ error: "No access to this child" });

  const result = db.prepare("DELETE FROM progress WHERE id=? AND child_id=?").run(entryId, childId);
  if (result.changes === 0) return res.status(404).json({ error: "Progress entry not found" });
  res.json({ id: entryId, status: "deleted" });
});

/**
 * GET /api/children/:id/therapy
 * Fetch saved therapy schedules for a child.
 */
router.get("/children/:id/therapy", authenticate, (req, res) => {
  const childId = routeId(req.params.id);
  if (!requireChildAccess(req, childId)) return res.status(403).json({ error: "No access to this child" });

  const rows = db.prepare(
    "SELECT id, child_id, schedule_json, created_at FROM therapy_schedules WHERE child_id=? ORDER BY created_at DESC"
  ).all(childId) as any[];

  const schedules = rows.map((row) => {
    try {
      return { ...JSON.parse(row.schedule_json), id: row.id, child_id: row.child_id, created_at: row.created_at };
    } catch {
      return { id: row.id, child_id: row.child_id, created_at: row.created_at, title: "Saved schedule" };
    }
  });

  res.json(schedules);
});

/**
 * POST /api/children/:id/therapy
 * Save a generated therapy schedule.
 */
router.post("/children/:id/therapy", authenticate, (req, res) => {
  const childId = routeId(req.params.id);
  if (!requireChildAccess(req, childId)) return res.status(403).json({ error: "No access to this child" });

  const schedule = req.body?.schedule ?? req.body;
  if (!schedule || typeof schedule !== "object") {
    return res.status(400).json({ error: "schedule object required" });
  }

  const info = db.prepare(
    "INSERT INTO therapy_schedules (child_id, schedule_json, created_by_user_id) VALUES (?, ?, ?)"
  ).run(childId, JSON.stringify(schedule), (req as any).sessionUser.userId);

  res.json({ id: info.lastInsertRowid, status: "saved" });
});

/**
 * GET /api/children/:id/diet
 * Fetch saved diet plans for a child.
 */
router.get("/children/:id/diet", authenticate, (req, res) => {
  const childId = routeId(req.params.id);
  if (!requireChildAccess(req, childId)) return res.status(403).json({ error: "No access to this child" });

  const rows = db.prepare(
    "SELECT id, child_id, plan_json, created_at FROM diet_plans WHERE child_id=? ORDER BY created_at DESC"
  ).all(childId) as any[];

  const plans = rows.map((row) => {
    try {
      return { ...JSON.parse(row.plan_json), id: row.id, child_id: row.child_id, created_at: row.created_at };
    } catch {
      return { id: row.id, child_id: row.child_id, created_at: row.created_at, generalNotes: "Saved plan" };
    }
  });

  res.json(plans);
});

/**
 * POST /api/children/:id/diet
 * Save a generated diet plan.
 */
router.post("/children/:id/diet", authenticate, (req, res) => {
  const childId = routeId(req.params.id);
  if (!requireChildAccess(req, childId)) return res.status(403).json({ error: "No access to this child" });

  const plan = req.body?.plan ?? req.body;
  if (!plan || typeof plan !== "object") {
    return res.status(400).json({ error: "plan object required" });
  }

  const info = db.prepare(
    "INSERT INTO diet_plans (child_id, plan_json, created_by_user_id) VALUES (?, ?, ?)"
  ).run(childId, JSON.stringify(plan), (req as any).sessionUser.userId);

  res.json({ id: info.lastInsertRowid, status: "saved" });
});

/**
 * POST /api/children
 * Create new child profile
 */
router.post("/children", authenticate, (req, res) => {
  const { sessionUser } = req as any;
  if (sessionUser.profileType !== "family") {
    return res.status(403).json({ error: "Child profiles are not available in the caregiver-only profile" });
  }
  const { onboardingData, consentScope, consentExpiresAt } = req.body;
  
  if (!onboardingData) return res.status(400).json({ error: "onboardingData required" });

  const consentId = db.prepare(
    "INSERT INTO consent_records (consenting_parent_user_id, consent_scope, consent_expires_at) VALUES (?,?,?)"
  ).run(
    sessionUser.userId,
    JSON.stringify(consentScope ?? { purposes: ["caregiving"], dataTypes: ["behavioral","dietary","routines"] }),
    consentExpiresAt ?? null
  ).lastInsertRowid as number;

  db.prepare("INSERT INTO consent_audit_log (consent_id, action, actor_user_id) VALUES (?,'granted',?)")
    .run(consentId, sessionUser.userId);

  const childId = db.prepare(
    "INSERT INTO children_profiles (org_id, added_by_user_id, consent_record_id, onboarding_data) VALUES (?,?,?,?)"
  ).run(sessionUser.orgId, sessionUser.userId, consentId, JSON.stringify(onboardingData))
    .lastInsertRowid as number;

  db.prepare("INSERT INTO child_access (user_id, child_id, granted_by, role) VALUES (?,?,?, 'owner')")
    .run(sessionUser.userId, childId, sessionUser.userId);

  res.json({ childId, consentId });
});

/**
 * PUT /api/children/:id/onboarding
 * Update child onboarding data
 */
router.put("/children/:id/onboarding", authenticate, (req, res) => {
  const childId = routeId(req.params.id);
  assertConsent(childId);
  
  const access = db.prepare("SELECT 1 FROM child_access WHERE user_id=? AND child_id=?")
    .get((req as any).sessionUser.userId, childId);
  if (!access) return res.status(403).json({ error: "No access to this child" });

  db.prepare("UPDATE children_profiles SET onboarding_data=? WHERE id=?")
    .run(JSON.stringify(req.body.data), childId);
  res.json({ status: "ok" });
});

/**
 * DELETE /api/children/:id/data
 * Right to erasure (DPDP §17)
 */
router.delete("/children/:id/data", authenticate, (req, res) => {
  const childId = routeId(req.params.id);
  const { sessionUser } = req as any;
  
  const access = db.prepare("SELECT 1 FROM child_access WHERE user_id=? AND child_id=?")
    .get(sessionUser.userId, childId);
  if (!access && sessionUser.role !== "district_admin")
    return res.status(403).json({ error: "No access to this child" });

  const result = eraseChildData(childId, sessionUser.userId);
  res.json({ status: "erased", ...result });
});

/**
 * POST /api/children/:id/consent/revoke
 * Revoke consent for child data
 */
router.post("/children/:id/consent/revoke", authenticate, (req, res) => {
  const childId = routeId(req.params.id);
  const { sessionUser } = req as any;
  
  const child: any = db.prepare("SELECT consent_record_id FROM children_profiles WHERE id=?").get(childId);
  if (!child) return res.status(404).json({ error: "Child not found" });
  if (!hasOwnerAccess(sessionUser.userId, childId)) {
    return res.status(403).json({ error: "Only the child's owner can revoke consent" });
  }

  revokeConsent(child.consent_record_id, sessionUser.userId, req.body.reason);
  res.json({ status: "revoked" });
});

/**
 * GET /api/children/:id/report
 * Generate comprehensive report for a child
 */
router.get("/children/:id/report", authenticate, (req, res) => {
  const childId = routeId(req.params.id);
  const { userId } = (req as any).sessionUser;
  
  const access = db.prepare("SELECT 1 FROM child_access WHERE user_id=? AND child_id=?")
    .get(userId, childId);
  if (!access) return res.status(403).json({ error: "No access to this child" });

  const child: any = db.prepare(
    "SELECT onboarding_data FROM children_profiles WHERE id=?"
  ).get(childId);
  
  if (!child) return res.status(404).json({ error: "Child not found" });

  const onboarding = child.onboarding_data ? JSON.parse(child.onboarding_data) : {};

  // Get progress data
  const progressData: any[] = db.prepare(
    `SELECT metric_type, value, timestamp FROM progress WHERE child_id=? ORDER BY timestamp DESC LIMIT 100`
  ).all(childId) as any[];

  const progressSummary: Record<string, { latest: number; count: number; avg: number }> = {};
  for (const p of progressData) {
    if (!progressSummary[p.metric_type]) {
      progressSummary[p.metric_type] = { latest: 0, count: 0, avg: 0 };
    }
    progressSummary[p.metric_type].count++;
    progressSummary[p.metric_type].latest = p.value;
    progressSummary[p.metric_type].avg += p.value;
  }

  for (const key in progressSummary) {
    progressSummary[key].avg /= progressSummary[key].count;
  }

  // Get latest diet and routine
  const latestDiet: any = db.prepare(
    "SELECT * FROM diet_plans WHERE child_id=? ORDER BY created_at DESC LIMIT 1"
  ).get(childId);

  const latestRoutine: any = db.prepare(
    "SELECT * FROM therapy_schedules WHERE child_id=? ORDER BY created_at DESC LIMIT 1"
  ).get(childId);

  res.json({
    generatedAt: new Date().toISOString(),
    child: {
      name: onboarding.childName || onboarding.name || "Unknown",
      age: onboarding.childAge ?? onboarding.age,
      diagnoses: onboarding.diagnoses || [],
      sensoryTriggers: onboarding.sensoryTriggers || [],
      strengths: onboarding.strengths || [],
      goals: onboarding.goals || [],
    },
    progressSummary,
    recentProgress: progressData.slice(0, 20),
    latestDietPlan: latestDiet,
    latestRoutine: latestRoutine,
  });
});

/**
 * POST /api/children/:id/report/narrative
 * Generate AI narrative for a report
 */
router.post("/children/:id/report/narrative", authenticate, async (req, res) => {
  const childId = routeId(req.params.id);
  const { userId } = (req as any).sessionUser;
  
  const access = db.prepare("SELECT 1 FROM child_access WHERE user_id=? AND child_id=?")
    .get(userId, childId);
  if (!access) return res.status(403).json({ error: "No access to this child" });

  const child: any = db.prepare(
    "SELECT onboarding_data FROM children_profiles WHERE id=?"
  ).get(childId);
  
  if (!child) return res.status(404).json({ error: "Child not found" });

  const onboarding = child.onboarding_data ? JSON.parse(child.onboarding_data) : {};

  // For now, return a basic narrative (AI generation would happen here)
  const narrative = `${onboarding.childName || onboarding.name || "Child"} is a ${onboarding.childAge ?? onboarding.age ?? "young"} child with the following diagnoses: ${(onboarding.diagnoses || []).join(", ") || "None documented"}. They have demonstrated strengths in ${(onboarding.strengths || []).slice(0, 2).join(", ") || "multiple areas"}. Current goals include ${(onboarding.goals || []).slice(0, 2).join(", ") || "ongoing development"}.`;

  res.json({ narrative });
});

/**
 * GET /api/children/:id/shares
 * Get list of users who have access to this child's data
 */
router.get("/children/:id/shares", authenticate, (req, res) => {
  const childId = routeId(req.params.id);
  const { userId } = (req as any).sessionUser;
  
  if (!hasOwnerAccess(userId, childId)) return res.status(403).json({ error: "Only the child's owner can share data" });

  const shares: any[] = db.prepare(
    `SELECT u.id, u.email, u.display_name, ca.role, ca.granted_at
     FROM child_access ca
     JOIN users u ON u.id = ca.user_id
     WHERE ca.child_id=? AND ca.user_id != ?
     ORDER BY ca.granted_at DESC`
  ).all(childId, userId) as any[];

  res.json(shares.map(s => ({
    id: s.id,
    email: s.email,
    display_name: s.display_name,
    role: s.role || "caregiver",
    granted_at: s.granted_at,
  })));
});

/**
 * POST /api/children/:id/share
 * Share child's data with another user
 */
router.post("/children/:id/share", authenticate, async (req, res) => {
  const childId = routeId(req.params.id);
  const { userId } = (req as any).sessionUser;
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: "email required" });

  const access = db.prepare("SELECT 1 FROM child_access WHERE user_id=? AND child_id=?")
    .get(userId, childId);
  if (!access) return res.status(403).json({ error: "No access to this child" });

  const targetUser: any = db.prepare("SELECT id, role FROM users WHERE email=? AND profile_type='family'").get(email);
  if (!targetUser) return res.status(404).json({ error: "User not found" });

  const existing = db.prepare("SELECT 1 FROM child_access WHERE user_id=? AND child_id=?")
    .get(targetUser.id, childId);
  
  if (existing) {
    return res.json({ status: "already_shared", sharedWith: email, role: targetUser.role });
  }

  db.prepare("INSERT INTO child_access (user_id, child_id, granted_by, role) VALUES (?,?,?,?)")
    .run(targetUser.id, childId, userId, targetUser.role || "caregiver");

  res.json({ status: "shared", sharedWith: email, role: targetUser.role });
});

/**
 * DELETE /api/children/:id/share/:userId
 * Revoke access to child's data
 */
router.delete("/children/:id/share/:userId", authenticate, (req, res) => {
  const childId = routeId(req.params.id);
  const targetUserId = routeId(req.params.userId);
  const { userId } = (req as any).sessionUser;

  if (!hasOwnerAccess(userId, childId)) return res.status(403).json({ error: "Only the child's owner can revoke sharing" });
  if (targetUserId === userId) return res.status(400).json({ error: "An owner cannot remove their own access" });

  db.prepare("DELETE FROM child_access WHERE user_id=? AND child_id=?")
    .run(targetUserId, childId);

  res.json({ status: "revoked" });
});

/**
 * POST /api/children/:id/handwriting
 * Proxy handwriting analysis to the handwriting-service
 */
router.post("/children/:id/handwriting", authenticate, (req, res, next) => {
  uploadHandwriting(req, res, (err) => {
    if (err) {
      console.error("[handwriting-multer] Error:", err.message);
      return res.status(400).json({ error: err.message || "File upload error" });
    }
    next();
  });
}, async (req, res) => {
  try {
    const childId = routeId(req.params.id);
    const { userId } = (req as any).sessionUser;
    
    // Check access
    if (!db.prepare("SELECT 1 FROM child_access WHERE user_id=? AND child_id=?").get(userId, childId)) {
      return res.status(403).json({ error: "No access to this child's data" });
    }

    // Forward the file to handwriting-service
    const file = (req as any).file;
    if (!file) {
      console.error("[handwriting] No file in request");
      return res.status(400).json({ error: "No image file provided" });
    }

    console.log("[handwriting] Uploading file:", file.originalname, "size:", file.buffer.length, "type:", file.mimetype);

    // Create multipart form data manually to ensure proper encoding
    const boundary = '----FormBoundary' + Date.now();
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.originalname}"\r\nContent-Type: ${file.mimetype}\r\n\r\n`),
      file.buffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const handwritingServiceUrl = getHandwritingServiceUrl();
    console.log(`[handwriting] Sending request to: ${handwritingServiceUrl}/api/v1/analyze`);
    
    let hwResponse: Response;
    try {
      hwResponse = await fetch(`${handwritingServiceUrl}/api/v1/analyze`, {
        method: "POST",
        body,
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length.toString(),
        },
        signal: AbortSignal.timeout(120_000),
      });
    } catch (error) {
      const serviceError = getHandwritingServiceError(error);
      console.error("[handwriting] Could not reach analysis service:", error);
      return res.status(serviceError.status).json({ error: serviceError.message });
    }
    
    console.log(`[handwriting] Response received - Status: ${hwResponse.status}`);
    console.log(`[handwriting] Response headers:`, hwResponse.headers);

    if (!hwResponse.ok) {
      const text = await hwResponse.text();
      console.log(`[handwriting] Error response body: ${text.substring(0, 500)}`);
      const retryAfter = hwResponse.headers.get("Retry-After");
      if (retryAfter) res.setHeader("Retry-After", retryAfter);
      try {
        const err = JSON.parse(text);
        const message = typeof err.error === "string"
          ? err.error
          : typeof err.detail === "string"
            ? err.detail
            : "Handwriting analysis failed.";
        console.error("[handwriting] Service error:", hwResponse.status, message);
        return res.status(hwResponse.status).json({ error: message });
      } catch {
        console.error("[handwriting] Service error:", hwResponse.status);
        return res.status(hwResponse.status).json({ error: "Handwriting analysis failed." });
      }
    }

    const analysisResult = await hwResponse.json();
    console.log(`[handwriting] Analysis result:`, JSON.stringify(analysisResult).substring(0, 200));
    const literalTranscription = typeof analysisResult.literal_transcription === "string"
      ? analysisResult.literal_transcription.trim()
      : "";
    const intendedText = typeof analysisResult.ai_interpretation?.intended_text === "string"
      ? analysisResult.ai_interpretation.intended_text.trim()
      : literalTranscription;  // Default to literal if no interpretation
    const patternAnalysis = Array.isArray(analysisResult.ai_interpretation?.pattern_analysis)
      ? analysisResult.ai_interpretation.pattern_analysis
      : [];
    
    // VALIDATION: Require at least literal transcription and patterns
    if (!literalTranscription) {
      console.log("[handwriting] Validation failed: No transcription detected");
      return res.status(502).json({ error: "No text detected in the image. Try a clearer photo." });
    }
    
    console.log(`[handwriting] Validation passed - Transcription: "${literalTranscription.substring(0, 50)}..."`);
    console.log(`[handwriting] Patterns: ${patternAnalysis.length} items`);

    // Store in database
    const stmt = db.prepare(
      `INSERT INTO handwriting_samples (
        child_id, created_by_user_id, raw_transcription, interpreted_text, flagged_patterns
      ) VALUES (?, ?, ?, ?, ?)`
    );
    
    const patterns = {
      b_d_reversals: 0,
      p_q_reversals: 0,
      other_reversals: [],
      phonetic_substitutions: patternAnalysis,
      spacing_irregular: false,
      sizing_inconsistent: false,
    };

    const result = stmt.run(
      childId,
      userId,
      literalTranscription,
      intendedText,
      JSON.stringify(patterns)
    );

    res.json({
      id: result.lastInsertRowid,
      rawTranscription: literalTranscription,
      interpretedText: intendedText,
      flaggedPatterns: patterns,
    });
  } catch (e: any) {
    console.error("[handwriting] Error:", e);
    res.status(500).json({ error: e.message || "Handwriting analysis failed" });
  }
});

/**
 * GET /api/children/:id/handwriting/health
 * Check whether the handwriting analysis service is available.
 */
router.get("/children/:id/handwriting/health", authenticate, async (req, res) => {
  const childId = routeId(req.params.id);
  const { userId } = (req as any).sessionUser;
  if (!requireChildAccess(req, childId)) {
    return res.status(403).json({ error: "No access to this child's data" });
  }

  try {
    const response = await fetch(`${getHandwritingServiceUrl()}/api/v1/health`, {
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) {
      return res.status(503).json({
        error: "The handwriting service is starting or unavailable. Please try again shortly.",
      });
    }
    return res.json({ available: true });
  } catch (error) {
    const serviceError = getHandwritingServiceError(error);
    if (serviceError.status === 504) {
      return res.status(503).json({ error: "The handwriting service did not respond. Please try again shortly." });
    }
    console.error("[handwriting-health] Service unavailable:", error);
    return res.status(503).json({ error: serviceError.message });
  }
});

/**
 * GET /api/children/:id/handwriting
 * Get handwriting samples for a child
 */
router.get("/children/:id/handwriting", authenticate, (req, res) => {
  const childId = routeId(req.params.id);
  const { userId } = (req as any).sessionUser;
  
  if (!db.prepare("SELECT 1 FROM child_access WHERE user_id=? AND child_id=?").get(userId, childId)) {
    return res.status(403).json({ error: "No access to this child's data" });
  }

  const samples = db.prepare(
    "SELECT id, raw_transcription, interpreted_text, flagged_patterns, created_at FROM handwriting_samples WHERE child_id=? ORDER BY created_at DESC"
  ).all(childId);

  res.json(samples.map((s: any) => ({
    id: s.id,
    raw_transcription: s.raw_transcription,
    interpreted_text: s.interpreted_text,
    flagged_patterns: s.flagged_patterns ? JSON.parse(s.flagged_patterns) : {},
    created_at: s.created_at,
  })));
});

/**
 * PATCH /api/children/:id/handwriting/:sampleId
 * Update handwriting sample
 */
router.patch("/children/:id/handwriting/:sampleId", authenticate, (req, res) => {
  const childId = routeId(req.params.id);
  const sampleId = routeId(req.params.sampleId);
  const { userId } = (req as any).sessionUser;
  const { confirmedText } = req.body;

  if (!db.prepare("SELECT 1 FROM child_access WHERE user_id=? AND child_id=?").get(userId, childId)) {
    return res.status(403).json({ error: "No access to this child's data" });
  }

  db.prepare("UPDATE handwriting_samples SET caregiver_confirmed_text=? WHERE id=? AND child_id=?")
    .run(confirmedText, sampleId, childId);

  res.json({ status: "updated" });
});

/**
 * DELETE /api/children/:id/handwriting/:sampleId
 * Delete handwriting sample
 */
router.delete("/children/:id/handwriting/:sampleId", authenticate, (req, res) => {
  const childId = routeId(req.params.id);
  const sampleId = routeId(req.params.sampleId);
  const { userId } = (req as any).sessionUser;

  if (!db.prepare("SELECT 1 FROM child_access WHERE user_id=? AND child_id=?").get(userId, childId)) {
    return res.status(403).json({ error: "No access to this child's data" });
  }

  db.prepare("DELETE FROM handwriting_samples WHERE id=? AND child_id=?").run(sampleId, childId);
  res.json({ status: "deleted" });
});

export default router;
