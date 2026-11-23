# NeuroSync Restructuring: Assumptions & Feature Inventory

## Project Scope
- **Goal**: Restructure navigation and page hierarchy from flat sidebar model to category-based hubs
- **Constraint**: All features already built; reuse exactly; no business logic changes
- **Safety**: Preserve all existing API contracts, database schema, auth, ML code, and deployment config

## Feature Inventory

| Feature Name | Type | Current Location | Component | API Calls | Status |
|---|---|---|---|---|---|
| **Caregiver Wellness** | Page | `/caregiver` (CaregiverPage) | CaregiverPage.tsx | None (local state) | ✅ PRESENT |
| Breathing Techniques | Sub | CaregiverPage | Embedded in CaregiverPage | None | ✅ PRESENT |
| Grounding Techniques | Sub | CaregiverPage | Embedded in CaregiverPage | None | ✅ PRESENT |
| Release Techniques | Sub | CaregiverPage | Embedded in CaregiverPage | None | ✅ PRESENT |
| Self-Compassion Techniques | Sub | CaregiverPage | Embedded in CaregiverPage | None | ✅ PRESENT |
| **Behavior Interpreter (Audio Cue Recognition)** | Page | `/behavior` (BehaviorPage) | BehaviorPage.tsx | `/api/children/{id}/cues/*`, `/api/gemini/structured` | ✅ PRESENT |
| Audio Recording & Playback | Sub | BehaviorPage | Embedded AudioRecorder | FileAPI, apiPost, apiGet | ✅ PRESENT |
| Cue Library Management | Sub | BehaviorPage | Embedded in BehaviorPage | `/api/children/{id}/cues`, `/api/children/{id}/cue-events` | ✅ PRESENT |
| ML Model Sync (IndexedDB) | Sub | BehaviorPage | Embedded in BehaviorPage | `/api/children/{id}/cues/model` | ✅ PRESENT |
| **Chatbot (AI Caregiver Support)** | Page | `/chat` (ChatPage) | ChatPage.tsx | `/api/gemini/stream` | ✅ PRESENT |
| Text Chat Interface | Sub | ChatPage | Embedded MsgBubble | `/api/gemini/stream`, context | ✅ PRESENT |
| Quick Prompts | Sub | ChatPage | Embedded in ChatPage | None (client-side) | ✅ PRESENT |
| **Diet Planner** | Page | `/diet` (DietPage) | DietPage.tsx | `/api/gemini/structured`, `/api/children/{id}/diet` | ✅ PRESENT |
| Dietary Restriction Selection | Sub | DietPage | Embedded FormGroup | None (client-side) | ✅ PRESENT |
| Texture Preference Selection | Sub | DietPage | Embedded FormGroup | None (client-side) | ✅ PRESENT |
| Weekly Meal Plan Generation | Sub | DietPage | Embedded in DietPage | `/api/gemini/structured` | ✅ PRESENT |
| Plan History / Save | Sub | DietPage | Embedded in DietPage | `/api/children/{id}/diet` | ✅ PRESENT |
| **Therapy / Routine Scheduler** | Page | `/therapy` (TherapyPage) | TherapyPage.tsx | `/api/children/{id}/routine-sessions` | ⚠️ NEEDS VERIFICATION |
| **Homeschool (Curriculum & Handwriting)** | Page | `/homeschool` (HomeschoolPage) | HomeschoolPage.tsx | Handwriting API (TBD) | ✅ PRESENT |
| Handwriting Interpreter | Sub | HomeschoolPage | Embedded in HomeschoolPage | `/api/children/{id}/handwriting/*`, Handwriting ML service (port 8001) | ✅ PRESENT |
| Curriculum / Lesson Planning | Sub | HomeschoolPage | Embedded in HomeschoolPage | TBD | ⚠️ NEEDS VERIFICATION |
| **Visual Board (Behavior/Emotion Management)** | Page | `/visual-board` (VisualBoardPage) | VisualBoardPage.tsx | `/api/children/{id}/visual-board/*` | ✅ PRESENT |
| **Progress Tracker** | Page | `/progress` (ProgressPage) | ProgressPage.tsx | `/api/children/{id}/progress`, `/api/children/{id}/teaching/results` | ✅ PRESENT |
| Manual Metric Logging | Sub | ProgressPage | Embedded form | POST/PUT/DELETE `/api/children/{id}/progress/*` | ✅ PRESENT |
| Trend Charts | Sub | ProgressPage | Recharts LineChart | GET `/api/children/{id}/progress` | ✅ PRESENT |
| Teaching Results Integration | Sub | ProgressPage | Embedded display | GET `/api/children/{id}/teaching/results` | ✅ PRESENT |
| **Reports** | Page | `/reports` (ReportsPage) | ReportsPage.tsx | `/api/children/{id}/reports/*` | ✅ PRESENT |
| Category-Aware Reports | Sub | ReportsPage | ReportsPage (static component) | None (static) | ✅ PRESENT |
| **Teaching / Skill Steps** | Page | `/teaching` (TeachingPage) | TeachingPage.tsx | `/api/children/{id}/teaching/*` | ✅ PRESENT |
| **Emergency Support** | Page | `/emergency` (EmergencyPage) | EmergencyPage.tsx | `/api/gemini/emergency`, geolocation API | ✅ PRESENT |
| Helpline Directory | Sub | EmergencyPage | Embedded HOTLINES array | None (static) | ✅ PRESENT |
| Geolocation | Sub | EmergencyPage | Embedded navigator.geolocation | navigator.geolocation API | ✅ PRESENT |
| Emergency Guidance (AI) | Sub | EmergencyPage | Embedded in EmergencyPage | POST `/api/gemini/emergency` | ✅ PRESENT |
| Meltdown Tips | Sub | EmergencyPage | Embedded text | None (static) | ✅ PRESENT |
| **Home / Landing Page** | Page | `/home`, `/` (HomePage) | HomePage.tsx | None (static, or /api calls for logged-in state) | ✅ PRESENT |
| **Auth & Onboarding** | Pages | `/auth`, `/onboarding` | AuthPage.tsx, OnboardingPage.tsx | Auth & child onboarding APIs | ✅ PRESENT |
| **Profile / Settings** | Page | `/profile` (ProfilePage) | ProfilePage.tsx | `/api/me`, `/api/profile/*` | ✅ PRESENT |
| Email/Name Separation | Sub | ProfilePage | Embedded in ProfilePage | PUT `/api/profile/display-name` | ✅ PRESENT |

---

## Current Route Structure

```
/                        → HomePage (public)
/home                    → HomePage (authenticated)
/auth                    → AuthPage
/onboarding              → OnboardingPage (add child, edit mode)
/add-child               → OnboardingPage (addMode=true)

/ (protected, Layout)    → Redirects to /chat
├─ /chat                 → ChatPage
├─ /behavior             → BehaviorPage
├─ /diet                 → DietPage
├─ /therapy              → TherapyPage
├─ /teaching             → TeachingPage
├─ /homeschool           → HomeschoolPage
├─ /visual-board         → VisualBoardPage
├─ /emergency            → EmergencyPage
├─ /progress             → ProgressPage
├─ /reports              → ReportsPage
├─ /profile              → ProfilePage
└─ /add-child            → OnboardingPage (addMode=true)

Special Routes:
- Caregiver login       → /caregiver (CaregiverPage, all-in-one, no Layout wrapper)
- District admin        → /insights (InsightsPage)
- Not authenticated     → /auth, /home, / only
- No active child       → /onboarding only
```

---

## Target Route Structure (New)

```
/                        → Landing (public/private intro)
/choose                  → Category selection (Caregiver Wellness vs Child Care)

/wellness                → Wellness Hub (Caregiver practices list)
├─ Breathing Techniques (clickable card)
├─ Grounding Techniques
├─ Release Techniques
└─ Self-Compassion Techniques
   (Each card opens modal or dedicated view with same CaregiverPage content)

/child-care             → Child Care Category Hub
├─ SLD (Specific Learning Disability)
├─ ID (Intellectual Disability)
├─ ASD + ADHD (Autism & ADHD support)
└─ Emergency (always accessible, visually distinct)

/child-care/sld         → SLD Hub (shows features for SLD)
├─ Handwriting Interpreter (card link)
├─ Chatbot (card link)
├─ Reports (card link)
└─ Progress (card link)

/child-care/sld/handwriting  → HomeschoolPage (mount same component)
/child-care/sld/chatbot      → ChatPage (mount same component)
/child-care/sld/reports      → ReportsPage (mount same component)
/child-care/sld/progress     → ProgressPage (mount same component)

/child-care/id          → ID Hub
├─ Chatbot
├─ Daily Tasks (Therapy if applicable)
├─ Reports
├─ Progress
└─ Homeschool

/child-care/id/chatbot      → ChatPage
/child-care/id/daily-tasks  → TherapyPage (renamed context)
/child-care/id/reports      → ReportsPage
/child-care/id/progress     → ProgressPage
/child-care/id/homeschool   → HomeschoolPage

/child-care/asd-adhd    → ASD+ADHD Hub
├─ Chatbot
├─ Virtual Board
├─ Behavior Interpreter
├─ Reports
└─ Progress

/child-care/asd-adhd/chatbot              → ChatPage
/child-care/asd-adhd/virtual-board        → VisualBoardPage
/child-care/asd-adhd/behaviour-interpreter → BehaviorPage
/child-care/asd-adhd/reports              → ReportsPage
/child-care/asd-adhd/progress             → ProgressPage

/child-care/emergency   → EmergencyPage (always accessible)

/profile                → ProfilePage (accessible from top bar)
*                       → 404 Page (professional)
```

---

## Key Decisions

### 1. Reuse Components (Mount Same, Don't Duplicate)
- ChatPage, ReportsPage, ProgressPage, HomeschoolPage will be mounted under multiple category routes
- Each will receive a `category` prop or context to customize header/breadcrumbs
- No state leakage: each route change resets component state (useEffect with dependency array on route)

### 2. Reports & Progress Behavior
- **Assumption**: ReportsPage and ProgressPage are NOT category-aware by default; they show all data
- **Action**: Mount same component under each category with a context header/breadcrumb showing active category
- **No backend change**: `GET /api/children/{id}/reports` and `GET /api/children/{id}/progress` return full data

### 3. Caregiver Wellness
- CaregiverPage (wellness practices) is a standalone hub at `/wellness`
- Techniques (breathing, grounding, etc.) remain as modals/inline in CaregiverPage
- No new routes for individual techniques; they open as modals in the hub view

### 4. Layout Structure
- OLD: `Layout` component wraps all authenticated routes (provides sidebar)
- NEW: `AppShell` component (top bar, breadcrumbs, back button, no sidebar)
- Sidebar completely removed; all navigation via breadcrumbs and hub cards

### 5. API Contracts
- **NO CHANGES** to existing endpoints or request/response shapes
- Example: `/api/children/{id}/reports` still returns the same JSON structure
- New routes (e.g., `/child-care/sld/reports`) simply mount the same ReportsPage component with different context

### 6. Redirects from Old Routes
- `/chat` → `/child-care/asd-adhd/chatbot` (or first active category's chatbot)
- `/behavior` → `/child-care/asd-adhd/behaviour-interpreter`
- `/diet` → `/child-care/id/chatbot` (or first relevant category, or `/child-care/sld/chatbot`)
- OLD routes kept working via redirects for backward compatibility

### 7. Auth & Entry Flow
- Login flow unchanged: `/auth` → `/choose` (new route)
- Caregiver login: `/caregiver` → `/wellness` (new hub)
- Child profile user: `/choose` → select category → hub → feature
- First load: `/choose` (after auth)

### 8. Emergency Feature
- Always accessible from all hubs and pages (top bar or breadcrumb)
- NEW route: `/child-care/emergency`
- OLD route: `/emergency` → redirect to `/child-care/emergency`
- Will audit Emergency against checklist (PHASE 5) and fix gaps

### 9. Language, Theme, Brand
- Preserved: All existing language support (i18n), theme context, brand colours, logo
- Layout.tsx removed but contexts remain active

### 10. Mobile Navigation
- No sidebar on mobile (already removed in new design)
- Bottom bar OR collapsible breadcrumb navigation
- All components responsive from 360px

---

## Known Unknowns / To Verify

1. **TherapyPage**: What does `/therapy` actually do? Needs verification.
2. **HomeschoolPage Handwriting**: Does it make API calls to the handwriting ML service (port 8001)?
3. **VisualBoardPage**: What exactly is stored/retrieved? Check API calls.
4. **ReportsPage**: Is it truly static (category-agnostic) or does it already filter by something?
5. **InsightsPage**: Used only by district_admin; not part of restructuring scope, left as-is.
6. **Emergency Feature Gaps**: Will audit in PHASE 5 against provided checklist.

---

## Files to Create/Modify

### New Files
- `BASELINE.md` — Build, typecheck, all routes, all API endpoints (before changes)
- `ROUTE_MAP.md` — Every frontend route, component, API calls, backend handler
- `BUGFIXES.md` — Every fix applied (file, cause, date)

### Modify
- `frontend/src/App.tsx` — New routing structure, redirects
- `frontend/src/components/Layout.tsx` — Remove or replace with AppShell
- Create `frontend/src/components/AppShell.tsx` — New top bar, breadcrumbs, back button
- Create `frontend/src/pages/ChoosePage.tsx` — Category selection
- Create `frontend/src/pages/WellnessHubPage.tsx` — Wellness practices hub
- Create `frontend/src/pages/ChildCareHubPage.tsx` — Main child care hub
- Create `frontend/src/pages/CategoryHubPage.tsx` — Category-specific hubs (SLD, ID, ASD+ADHD)
- Create `frontend/src/pages/NotFoundPage.tsx` — 404 page
- Create `frontend/src/lib/designTokens.ts` — Shared design tokens
- Create `frontend/src/lib/routes.ts` — Route constants and navigation helpers

### Preserve
- `server.ts` — SPA catch-all AFTER /api routes, JSON 404 for unknown /api
- `server/routes/*.ts` — All existing API routes unchanged
- `db/index.ts` — Schema unchanged
- `ml/main.py`, `handwriting-service/app/main.py` — ML code unchanged
- `.env`, `.env.example` — Var names unchanged
- `render.yaml`, `vercel.json`, `Dockerfile*` — Deployment config unchanged

---

## Build & Verification Strategy

1. Baseline: Build, typecheck, start server, curl all GET /api endpoints → capture BASELINE.md
2. After each phase: Rebuild, recheck, diff against baseline
3. Final: Smoke tests (Vitest or Playwright), old routes redirect correctly, Emergency works
4. Report: FEATURE_INVENTORY, Emergency PRESENT/MISSING checklist, any regressions

---

## Branch & Commits

- Branch name: `feature/restructure-navigation`
- Commit after Phase 0 (audit complete)
- Commit after Phase 1 (routes defined)
- Commit after Phase 2 (shell & design system)
- Commit after Phase 3 (hubs)
- Commit after Phase 4 (emergency)
- Commit after Phase 5 (build & verify)
- Final squash or rebase before merge

---

## References
- Existing App.tsx structure
- Current page components (16 pages × routes)
- Backend: /api/children/{id}/*, /api/gemini/*, /api/auth/*, /api/me/*
- ML services: port 8000 (audio), port 8001 (handwriting)
- Design system: CSS vars from Layout.tsx (--color-*, --text-*, etc.)
