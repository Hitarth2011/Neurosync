/**
 * Authentication Routes
 * Handles user registration, login, logout, and session management
 */

import express from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import db from "../../db/index.js";
import { createToken, revokeToken, authenticate } from "../../lib/auth.js";

const router = express.Router();

// Auth rate limiting — brute-force protection
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { error: "Too many requests — please try again in 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper to set token cookie
function setTokenCookie(res: express.Response, token: string): void {
  res.setHeader("Set-Cookie",
    `neurosync_token=${token}; HttpOnly; SameSite=${process.env.NODE_ENV === "production" ? "None; Secure" : "Lax"}; Path=/; Max-Age=${60 * 60 * 24 * 7}`
  );
}

function clearTokenCookie(res: express.Response): void {
  res.setHeader("Set-Cookie", "neurosync_token=; HttpOnly; Path=/; Max-Age=0");
}

/**
 * POST /api/guest-login
 * Auto-creates or retrieves user based on email + use case
 */
router.post("/guest-login", authLimiter, async (req, res) => {
  console.log("[guest-login] Request received:", req.body);
  const { email, displayName, preferredLanguage, role, useCase } = req.body;
  const profileType = useCase === "caregiver_burnout" ? "caregiver" : "family";
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const enteredName = typeof displayName === "string" ? displayName.trim() : "";
  const normalizeName = (name: unknown) => typeof name === "string"
    ? name.normalize("NFKC").trim().toLocaleLowerCase()
    : "";
  
  if (!normalizedEmail || !enteredName) {
    console.log("[guest-login] Missing email or displayName");
    return res.status(400).json({ error: "email and displayName required" });
  }

  if (!normalizedEmail.includes("@")) {
    console.log("[guest-login] Invalid email format");
    return res.status(400).json({ error: "Invalid email address" });
  }

  const targetOrgId = 1;
  const org = db.prepare("SELECT id FROM organizations WHERE id = ?").get(targetOrgId);
  if (!org) return res.status(400).json({ error: "Organization not found" });

  const safeRole = role && ["parent", "caregiver", "anganwadi_worker", "special_educator", "asha_worker"].includes(role)
    ? role : "parent";

  try {
    const guestPassword = `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const hash = await bcrypt.hash(guestPassword, 12);

    const existing: any = db.prepare(
      "SELECT * FROM users WHERE lower(email) = ? AND profile_type = ? ORDER BY id LIMIT 1"
    ).get(normalizedEmail, profileType);
    if (existing) {
      // Override existing name with new one (no validation check)
      db.prepare("UPDATE users SET display_name = ? WHERE id = ?").run(enteredName, existing.id);

      const token = createToken(existing.id);
      setTokenCookie(res, token);
      return res.json({ token, email: existing.email, role: existing.role, displayName: enteredName, profileType: existing.profile_type });
    }

    const info = db.prepare(
      "INSERT INTO users (org_id, email, password_hash, role, profile_type, display_name, preferred_language) VALUES (?,?,?,?,?,?,?)"
    ).run(targetOrgId, normalizedEmail, hash, profileType === "caregiver" ? "caregiver" : safeRole, profileType, enteredName, preferredLanguage ?? "en");

    const userId = info.lastInsertRowid as number;
    const token = createToken(userId);
    setTokenCookie(res, token);
    
    const responseData = { token, email: normalizedEmail, role: profileType === "caregiver" ? "caregiver" : safeRole, displayName: enteredName, profileType, useCase };
    console.log("[guest-login] Sending response:", responseData);
    res.json(responseData);
  } catch (err: any) {
    console.error("[guest-login] Error:", err);
    if (err.code === "SQLITE_CONSTRAINT")
      return res.status(400).json({ error: "Email already registered" });
    console.error("[guest-login]", err);
    res.status(500).json({ error: "Sign in failed" });
  }
});

/**
 * POST /api/login
 * Login with email and password
 */
router.post("/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;
  const profileType = req.body.profileType === "caregiver" ? "caregiver" : "family";
  const user: any = db.prepare("SELECT * FROM users WHERE email = ? AND profile_type = ?").get(email, profileType);
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    return res.status(401).json({ error: "Invalid credentials" });

  const token = createToken(user.id);
  setTokenCookie(res, token);
  res.json({ token, email: user.email, role: user.role, displayName: user.display_name, profileType: user.profile_type });
});

/**
 * POST /api/logout
 * Revoke session token
 */
router.post("/logout", authenticate, (req, res) => {
  revokeToken((req as any).sessionToken);
  clearTokenCookie(res);
  res.json({ status: "ok" });
});

/**
 * DELETE /api/account
 * Permanently delete the current user account and their personal data.
 */
router.delete("/account", authenticate, (req, res) => {
  const { userId } = (req as any).sessionUser;

  try {
    db.transaction(() => {
      db.prepare("DELETE FROM session_tokens WHERE user_id = ?").run(userId);
      db.prepare("DELETE FROM child_access WHERE user_id = ? OR granted_by = ?").run(userId, userId);

      const ownedChildren = db.prepare(
        "SELECT id FROM children_profiles WHERE added_by_user_id = ?"
      ).all(userId) as Array<{ id: number }>;

      if (ownedChildren.length > 0) {
        const childIds = ownedChildren.map((child) => child.id);
        const placeholders = childIds.map(() => "?").join(", ");

        db.prepare(`DELETE FROM child_access WHERE child_id IN (${placeholders})`).run(...childIds);
        db.prepare(`DELETE FROM children_profiles WHERE id IN (${placeholders})`).run(...childIds);
      }

      const consentRows = db.prepare(
        "SELECT id FROM consent_records WHERE consenting_parent_user_id = ?"
      ).all(userId) as Array<{ id: number }>;

      if (consentRows.length > 0) {
        const consentIds = consentRows.map((row) => row.id);
        const placeholders = consentIds.map(() => "?").join(", ");

        db.prepare(`DELETE FROM consent_audit_log WHERE consent_id IN (${placeholders})`).run(...consentIds);
        db.prepare(`DELETE FROM consent_records WHERE id IN (${placeholders})`).run(...consentIds);
      }

      db.prepare("DELETE FROM progress WHERE recorded_by_user_id = ?").run(userId);
      db.prepare("DELETE FROM therapy_schedules WHERE created_by_user_id = ?").run(userId);
      db.prepare("DELETE FROM diet_plans WHERE created_by_user_id = ?").run(userId);
      db.prepare("DELETE FROM cue_library WHERE created_by_user_id = ?").run(userId);
      db.prepare("DELETE FROM handwriting_samples WHERE created_by_user_id = ?").run(userId);
      db.prepare("DELETE FROM teaching_workflows WHERE created_by_user_id = ? OR approved_by_user_id = ?").run(userId, userId);
      db.prepare("DELETE FROM teaching_sessions WHERE started_by_user_id = ?").run(userId);
      db.prepare("DELETE FROM teaching_observations WHERE recorded_by_user_id = ?").run(userId);
      db.prepare("DELETE FROM voice_authorizations WHERE authorized_by_user_id = ?").run(userId);
      db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    })();

    clearTokenCookie(res);
    res.json({ status: "deleted" });
  } catch (error) {
    console.error("[delete-account]", error);
    res.status(500).json({ error: "Unable to delete account" });
  }
});

export default router;
