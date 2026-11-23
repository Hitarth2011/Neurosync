# NeuroSync Baseline: Build, Routes, and API Endpoints

**Captured**: 2026-10-30 (before restructuring)
**Build Status**: ✅ PASS
**TypeCheck Status**: ✅ PASS
**Server**: Ready to start (not running during audit)

---

## Build Output

```
vite v6.4.3 building for production...
transforming...
✔ 1040 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.77 kB | gzip:   0.86 kB
dist/assets/index-DS4cpev7.css   18.00 kB | gzip:   4.24 kB
dist/assets/motion-D-9P0Ky-.js  115.35 kB | gzip:  38.28 kB
dist/assets/router-DD2GK_wq.js  165.28 kB | gzip:  54.07 kB
dist/assets/index-BaFYkjg5.js   307.09 kB | gzip:  74.37 kB
dist/assets/charts-DS9FB3xc.js  421.37 kB | gzip: 113.49 kB
✔ built in 19.44s
```

**Total Bundle (gzip)**: 285.24 kB

---

## TypeScript Check

```
npm exec tsc --noEmit

Exit Code: 0 (no errors)
```

---

## Frontend Routes (React Router)

### Public Routes (Unauthenticated)
| Path | Component | Behavior |
|------|-----------|----------|
| `/` | HomePage | Landing page with auth options |
| `/home` | HomePage | Explicit home page access |
| `/auth` | AuthPage | Login/registration screen |
| `*` (public) | Navigate to `/` | Catch-all redirects home |

### Protected Routes (Requires Authentication)

#### Special Cases
| Path | Role | Component | Behavior |
|------|------|-----------|----------|
| `/` | district_admin | Navigate to `/insights` | Admin dashboard entry |
| `/insights` | district_admin | InsightsPage | District-level analytics (not in restructure scope) |
| `/` | caregiver | Navigate to `/caregiver` | Caregiver wellness entry |
| `/caregiver` | caregiver | CaregiverPage | All-in-one wellness hub (breathing, grounding, etc.) |

#### Standard User Routes (requires activeChild)
All routes below are wrapped in `<Layout>` component (sidebar navigation):

| Path | Component | Purpose |
|------|-----------|---------|
| `/chat` | ChatPage | AI chatbot for caregiving support |
| `/behavior` | BehaviorPage | Audio cue interpreter / behavior recognition |
| `/diet` | DietPage | Sensory-aware meal plan generator |
| `/therapy` | TherapyPage | Therapy/routine scheduler |
| `/teaching` | TeachingPage | Skill-building steps and progression tracking |
| `/homeschool` | HomeschoolPage | Curriculum + handwriting interpreter |
| `/visual-board` | VisualBoardPage | Visual emotion/behavior management board |
| `/emergency` | EmergencyPage | Crisis support + helplines + geolocation |
| `/progress` | ProgressPage | Metric tracker + trend charts |
| `/reports` | ReportsPage | Aggregated reports (category-agnostic) |
| `/profile` | ProfilePage | User profile, email/name separation, language prefs |
| `/add-child` | OnboardingPage | Add another child profile (addMode=true) |

#### Entry Points for No Active Child
| Path | Component | Behavior |
|------|-----------|----------|
| `/home` | HomePage | Home page for logged-in user |
| `/onboarding` | OnboardingPage | Create first child profile |
| `*` | Navigate to `/onboarding` | Catch-all redirects to onboarding |

---

## Backend API Endpoints

### Authentication Routes (`/api/auth/*`)

**POST /api/auth/guest-login**
- Request: `{ email, displayName, preferredLanguage, role, useCase }`
- Response (201): `{ token, email, role, displayName, profileType, useCase }`
- Response (400): `{ error: "..." }`
- Response (401): `{ errorCode: "caregiver_name_mismatch" | "child_name_mismatch", error: "..." }`
- Rate limited: 20 attempts per 15 minutes

**POST /api/auth/login**
- Request: `{ email, password, profileType: "caregiver" | "family" }`
- Response (200): `{ token, email, role, displayName, profileType }`
- Response (401): `{ error: "Invalid credentials" }`
- Rate limited: 20 attempts per 15 minutes

**POST /api/auth/logout**
- Auth required: Yes (Bearer token)
- Request: (no body)
- Response (200): `{ status: "ok" }`

**DELETE /api/auth/account** (deprecated, use DELETE /api/account)
- Auth required: Yes
- Request: (no body)
- Response (200): `{ status: "deleted" }`
- Side effect: Cascading delete of all user data, children, recordings, etc.

---

### User Profile Routes (`/api/profile/*`, `/api/me`)

**GET /api/me**
- Auth required: Yes
- Request: (no body)
- Response (200):
  ```json
  {
    "id": 1,
    "email": "user@example.com",
    "displayName": "Jane Doe",
    "role": "parent",
    "profileType": "family",
    "preferredLanguage": "en",
    "children": [
      {
        "id": 1,
        "onboarding_data": { "childName": "Alice", "diagnoses": ["ASD"], ... },
        "created_at": "2026-01-01T00:00:00Z"
      }
    ]
  }
  ```
- Response (404): `{ error: "User not found" }`

**PUT /api/profile/display-name**
- Auth required: Yes
- Request: `{ displayName: "New Name" }`
- Response (200):
  ```json
  {
    "success": true,
    "user": { "id": 1, "email": "user@example.com", "displayName": "New Name", "role": "parent", "profileType": "family" },
    "message": "Display name updated successfully"
  }
  ```
- Response (400): `{ error: "displayName is required..." }`

**PUT /api/profile/preferred-language**
- Auth required: Yes
- Request: `{ preferredLanguage: "en" | "hi" | "mr" }`
- Response (200): `{ success: true, preferredLanguage: "hi", message: "Language preference updated successfully" }`
- Response (400): `{ error: "preferredLanguage must be one of: en, hi, mr" }`

---

### Child Management Routes (`/api/children/:id/*`)

**GET /api/children/:id/progress**
- Auth required: Yes (child access required)
- Response (200): Array of progress entries (last 200):
  ```json
  [
    { "id": 1, "child_id": 1, "metric_type": "calm_down_interval", "value": 15, "timestamp": "2026-01-01T00:00:00Z" },
    { "id": 2, "child_id": 1, "metric_type": "routines_completed", "value": 3, "timestamp": "2026-01-02T00:00:00Z" }
  ]
  ```
- Response (403): `{ error: "No access to this child" }`

**POST /api/children/:id/progress**
- Auth required: Yes (child access required)
- Request: `{ metric_type: "calm_down_interval", value: 15 }`
- Response (200): `{ id: 1, childId: 1, metric_type: "calm_down_interval", value: 15, status: "saved" }`
- Response (400): `{ error: "metric_type and numeric value required" }`

**PUT /api/children/:id/progress/:entryId**
- Auth required: Yes (child access required)
- Request: `{ metric_type: "calm_down_interval", value: 20 }`
- Response (200): `{ id: 1, childId: 1, metric_type: "calm_down_interval", value: 20, status: "updated" }`
- Response (400/404): `{ error: "..." }`

**DELETE /api/children/:id/progress/:entryId**
- Auth required: Yes (child access required)
- Response (200): `{ id: 1, status: "deleted" }`
- Response (404): `{ error: "Progress entry not found" }`

**GET /api/children/:id/therapy**
- Auth required: Yes (child access required)
- Response (200): Array of therapy schedules:
  ```json
  [
    { "id": 1, "child_id": 1, "title": "Morning Routine", "sessions": [...], "created_at": "..." }
  ]
  ```

**POST /api/children/:id/therapy**
- Auth required: Yes (child access required)
- Request: `{ schedule: { "title": "Morning Routine", "sessions": [...] } }`
- Response (200): `{ id: 1, status: "saved" }`

**GET /api/children/:id/diet**
- Auth required: Yes (child access required)
- Response (200): Array of diet plans

**POST /api/children/:id/diet**
- Auth required: Yes (child access required)
- Request: `{ plan: { "weeklyPlan": [...], "generalNotes": "..." } }`
- Response (200): `{ id: 1, status: "saved" }`

**GET /api/children/:id/cues** (Behavior Interpreter)
- Auth required: Yes (child access required)
- Response (200): Array of cue library entries

**POST /api/children/:id/cues/teach**
- Auth required: Yes (multipart/form-data)
- Request: FormData with `audio` file, `label`, `mediaType`
- Response (200): `{ id: 1, label: "wants water", confidence: 1.0, status: "trained" }`

**POST /api/children/:id/cues/recognize**
- Auth required: Yes (multipart/form-data)
- Request: FormData with `audio` file
- Response (200 - match): `{ matched: true, label: "wants water", confidence: 0.87, cueId: 1 }`
- Response (200 - no match): `{ matched: false, closestCues: [...], eventId: 5 }`

**GET /api/children/:id/cues/model**
- Auth required: Yes
- Response (200): `{ cueCount: 5, trained: true, model: [...], centroids: {...}, embedVersion: "local-v2" }`

**POST /api/children/:id/handwriting** (Homeschool Handwriting)
- Auth required: Yes (multipart/form-data)
- Request: FormData with `image` file
- Response (200): `{ reversals: 3, letterConfusion: ["b/d"], confidence: 0.82 }`

**GET /api/children/:id/visual-board**
- Auth required: Yes
- Response (200): Array of visual board activities/emotions

**POST /api/children/:id/visual-board**
- Auth required: Yes
- Request: `{ activity: {...}, emotion: "happy" }`
- Response (200): `{ id: 1, status: "saved" }`

**GET /api/children/:id/teaching/results**
- Auth required: Yes
- Response (200): Array of teaching session results

**POST /api/children/:id/teaching/sessions**
- Auth required: Yes
- Request: `{ goalId: 1, steps: [...] }`
- Response (200): `{ sessionId: 1, status: "started" }`

**GET /api/children/:id/reports**
- Auth required: Yes
- Response (200): Aggregated reports (category-agnostic)

---

### AI Routes (`/api/gemini/*`)

**POST /api/gemini/stream**
- Auth required: Yes
- Request: `{ messages: [{role: "user", content: "..."}], context: {...} }`
- Response: Server-Sent Events (text/event-stream)
  - Each event: `data: {"text": "chunk of response"}\n\n`
  - End marker: `data: [DONE]\n\n`

**POST /api/gemini/structured**
- Auth required: Yes
- Request: `{ prompt: "Generate a meal plan..." }`
- Response (200):
  ```json
  {
    "weeklyPlan": [
      { "day": "Monday", "breakfast": "Oatmeal", "lunch": "...", "dinner": "...", "snacks": [...], "sensoryNotes": "..." }
    ],
    "generalNotes": "...",
    "nutritionFocus": ["calcium", "protein"]
  }
  ```
- Response (422): `{ error: "Model returned unparseable JSON", raw: "..." }`

**POST /api/gemini/emergency**
- Auth required: Yes
- Request: `{ lat: 28.7041, lng: 77.1025, concern: "Severe meltdown" }`
- Response (200):
  ```json
  {
    "text": "1. Stay calm and speak in a quiet voice...\n2. Create a safe space...\n\nEmergency helplines:\n112 - Police/Ambulance\n..."
  }
  ```

---

### Catch-All / 404 Handling

**Unknown /api/* paths**
- Response (404): `{ error: "Not found" }` (JSON, NOT HTML)
- This is critical: SPA catch-all must come AFTER all /api routes in server.ts

---

## Database Schema Summary

**Key Tables**:
- `users` — Accounts, email, display_name (independent), preferred_language, profile_type (caregiver|family)
- `children_profiles` — Child data, onboarding_data (JSON), added_by_user_id
- `child_access` — User-to-child relationships, role (owner|caregiver|etc)
- `progress` — Metric logs (metric_type, value, timestamp)
- `therapy_schedules` — Schedule JSON storage
- `diet_plans` — Plan JSON storage
- `cue_library` — Audio cues for behavior interpreter
- `handwriting_samples` — Handwriting analysis results
- `teaching_workflows`, `teaching_sessions`, `teaching_observations` — Skill-building progression
- `session_tokens` — Token revocation list
- Other tables: consent_records, ai_repair_log, voice_authorizations, etc.

---

## Environment Variables (Preserved)

| Var | Purpose |
|-----|---------|
| `NODE_ENV` | Production/development mode |
| `DATABASE_URL` | SQLite database path |
| `GROQ_API_KEY` | Groq API for audio processing |
| `GOOGLE_GEMINI_API_KEY` | Google Gemini API for chat/structured |
| `MISTRAL_API_KEY` | Mistral API for handwriting vision |
| Not exposed to client: provider keys |

---

## ML Services (External)

| Service | Port | Purpose |
|---------|------|---------|
| Audio Cue Processor | 8000 | MFCC embeddings, local model training |
| Handwriting Interpreter | 8001 | Image analysis, letter reversal detection |

---

## Deployment Config (Preserved)

- `render.yaml` — Render deployment spec (unchanged)
- `vercel.json` — Vercel config (unchanged)
- `Dockerfile*` — Container builds (unchanged)
- Build command: `npm run build`
- Start command: `npm start`

---

## Key Constraints for Restructuring

1. **No changes to**:
   - `/api/*/` endpoints (paths, methods, request/response shapes)
   - Database schema or migrations
   - Environment variable names
   - ML service ports or APIs
   - Deployment config files

2. **Reuse components**:
   - Mount ChatPage, ReportsPage, ProgressPage under multiple routes
   - Each route provides context header/breadcrumb (no backend change)
   - State reset on route change via useEffect dependency array

3. **Preserve auth flow**:
   - `/auth` → login/guest-login
   - `/choose` (new) → category selection
   - `/caregiver` → wellness hub
   - Full auth context remains active

4. **HTTP 404 Handling**:
   - Unknown routes: → Professional 404 page
   - Unknown /api paths: → JSON 404 (never HTML)

---

## Notes for Regression Testing

After restructuring, verify:
- ✅ All existing /api/* endpoints return same response shapes
- ✅ GET requests return same status codes (200, 400, 403, 404, 500)
- ✅ Old frontend routes (`/chat`, `/behavior`, etc.) redirect to new structure
- ✅ No hard-coded paths or base URL issues
- ✅ Deep-link refresh works on all new routes
- ✅ Browser console: no 404 fetch errors, no broken imports
- ✅ Auth context still active, Language/Theme support preserved
- ✅ Database writes still work (POST/PUT/DELETE)
- ✅ TypeScript build passes
- ✅ Production build size does not increase >10%
