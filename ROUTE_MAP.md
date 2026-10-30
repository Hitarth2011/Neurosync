# NeuroSync Route Map: Post-Restructuring

**Status**: Implementation guide for new category-based navigation
**Build**: Verified against BASELINE.md
**Commit**: feature/restructure-navigation

---

## Frontend Routes (React Router v6)

### Public Routes (No Auth Required)

| Path | Component | API Calls | Status | Notes |
|------|-----------|-----------|--------|-------|
| `/` | HomePage or LandingPage | None (or check /api/me if session active) | ✅ NEW | Public landing, shows entry options |
| `/home` | HomePage | None | ✅ REUSED | Explicit home access |
| `/auth` | AuthPage | POST /api/auth/guest-login, POST /api/auth/login | ✅ REUSED | Login/registration unchanged |
| `*` | 404Page | None | ✅ NEW | Professional 404 with home link |

---

### Entry Point: Category Selection (After Auth)

| Path | Component | API Calls | Auth | Status | Notes |
|------|-----------|-----------|------|--------|-------|
| `/choose` | ChoosePage | None | Required | ✅ NEW | Two main options: Wellness OR Child Care |

---

### Caregiver Wellness Hub

| Path | Component | API Calls | Auth | Status | Notes |
|------|-----------|-----------|------|--------|-------|
| `/wellness` | WellnessHubPage | None | Required | ✅ NEW | Lists wellness practices (breathing, grounding, etc.) |
| `/wellness/breathing` | CaregiverPage (with technique="breathing") | None | Required | ✅ REUSED | Same CaregiverPage, context={technique:"breathing"} |
| `/wellness/grounding` | CaregiverPage (with technique="grounding") | None | Required | ✅ REUSED | Same CaregiverPage, context={technique:"grounding"} |
| `/wellness/release` | CaregiverPage (with technique="release") | None | Required | ✅ REUSED | Same CaregiverPage, context={technique:"release"} |
| `/wellness/self-compassion` | CaregiverPage (with technique="self-compassion") | None | Required | ✅ REUSED | Same CaregiverPage, context={technique:"self-compassion"} |

**Note**: CaregiverPage currently loads all techniques in modals. New routes will pass technique ID via context/URL param to pre-select technique.

---

### Child Care Hub (Category Entry)

| Path | Component | API Calls | Auth | Status | Notes |
|------|-----------|-----------|------|--------|-------|
| `/child-care` | ChildCareHubPage | None | Required | ✅ NEW | Four category options: SLD, ID, ASD+ADHD, Emergency |

---

### SLD (Specific Learning Disability) Hub & Features

| Path | Component | API Calls | Auth | Status | Notes |
|------|-----------|-----------|------|--------|-------|
| `/child-care/sld` | CategoryHubPage (category="sld") | None | Required | ✅ NEW | Hub: Handwriting, Chatbot, Reports, Progress |
| `/child-care/sld/handwriting` | HomeschoolPage (context.category="sld") | GET /api/children/{id}/handwriting*, POST (multipart) | Required | ✅ REUSED | Handwriting interpreter for SLD |
| `/child-care/sld/chatbot` | ChatPage (context.category="sld") | POST /api/gemini/stream | Required | ✅ REUSED | AI chat, same component as /chat |
| `/child-care/sld/reports` | ReportsPage (context.category="sld") | GET /api/children/{id}/reports | Required | ✅ REUSED | Reports (category-agnostic, context only) |
| `/child-care/sld/progress` | ProgressPage (context.category="sld") | GET /api/children/{id}/progress, POST/PUT/DELETE | Required | ✅ REUSED | Progress tracker (category-agnostic, context only) |

---

### ID (Intellectual Disability) Hub & Features

| Path | Component | API Calls | Auth | Status | Notes |
|------|-----------|-----------|------|--------|-------|
| `/child-care/id` | CategoryHubPage (category="id") | None | Required | ✅ NEW | Hub: Chatbot, Daily Tasks, Reports, Progress, Homeschool |
| `/child-care/id/chatbot` | ChatPage (context.category="id") | POST /api/gemini/stream | Required | ✅ REUSED | Same ChatPage |
| `/child-care/id/daily-tasks` | TherapyPage (context.category="id", context.mode="daily-tasks") | GET/POST /api/children/{id}/therapy | Required | ✅ REUSED | Renamed "Therapy" to "Daily Tasks" for ID category |
| `/child-care/id/reports` | ReportsPage (context.category="id") | GET /api/children/{id}/reports | Required | ✅ REUSED | Same ReportsPage |
| `/child-care/id/progress` | ProgressPage (context.category="id") | GET /api/children/{id}/progress, POST/PUT/DELETE | Required | ✅ REUSED | Same ProgressPage |
| `/child-care/id/homeschool` | HomeschoolPage (context.category="id") | GET /api/children/{id}/handwriting*, POST (multipart) | Required | ✅ REUSED | Curriculum + handwriting (broader for ID) |

---

### ASD + ADHD Hub & Features

| Path | Component | API Calls | Auth | Status | Notes |
|------|-----------|-----------|------|--------|-------|
| `/child-care/asd-adhd` | CategoryHubPage (category="asd-adhd") | None | Required | ✅ NEW | Hub: Chatbot, Virtual Board, Behavior Interpreter, Reports, Progress |
| `/child-care/asd-adhd/chatbot` | ChatPage (context.category="asd-adhd") | POST /api/gemini/stream | Required | ✅ REUSED | Same ChatPage |
| `/child-care/asd-adhd/virtual-board` | VisualBoardPage (context.category="asd-adhd") | GET/POST /api/children/{id}/visual-board* | Required | ✅ REUSED | Emotion/behavior board |
| `/child-care/asd-adhd/behaviour-interpreter` | BehaviorPage (context.category="asd-adhd") | POST /api/children/{id}/cues/*, POST /api/gemini/structured | Required | ✅ REUSED | Audio cue interpreter (main feature for ASD+ADHD) |
| `/child-care/asd-adhd/reports` | ReportsPage (context.category="asd-adhd") | GET /api/children/{id}/reports | Required | ✅ REUSED | Same ReportsPage |
| `/child-care/asd-adhd/progress` | ProgressPage (context.category="asd-adhd") | GET /api/children/{id}/progress, POST/PUT/DELETE | Required | ✅ REUSED | Same ProgressPage |

---

### Emergency (Always Accessible)

| Path | Component | API Calls | Auth | Status | Notes |
|------|-----------|-----------|------|--------|-------|
| `/child-care/emergency` | EmergencyPage | POST /api/gemini/emergency, navigator.geolocation | Required | ✅ REUSED | Crisis support (location-aware helplines) |
| `/emergency` | (REDIRECT) | → `/child-care/emergency` | Required | ✅ REDIRECT | Legacy route support |

---

### Shared/Account Routes (Accessible from Top Bar)

| Path | Component | API Calls | Auth | Status | Notes |
|------|-----------|-----------|------|--------|-------|
| `/profile` | ProfilePage | GET /api/me, PUT /api/profile/display-name, PUT /api/profile/preferred-language | Required | ✅ REUSED | User profile, email/name separation |
| `/onboarding` | OnboardingPage | POST /api/children/{id}/onboarding* | Required (conditional) | ✅ REUSED | Add/edit child profile |
| `/add-child` | OnboardingPage (addMode=true) | POST /api/children/{id}/onboarding* | Required | ✅ REUSED | Add another child profile |

---

### Admin Routes (Not in Restructure Scope)

| Path | Component | API Calls | Role | Status | Notes |
|------|-----------|-----------|------|--------|-------|
| `/insights` | InsightsPage | GET /api/insights/* | district_admin | ✅ UNCHANGED | District analytics (left as-is) |

---

## Legacy Route Redirects (Backward Compatibility)

All old routes must redirect to the new structure to prevent broken links:

| Old Path | New Path | Component | Logic |
|----------|----------|-----------|-------|
| `/chat` | `/child-care/asd-adhd/chatbot` | ChatPage | Redirect to default category (ASD+ADHD, primary for behavior focus) |
| `/behavior` | `/child-care/asd-adhd/behaviour-interpreter` | BehaviorPage | Default category |
| `/diet` | `/child-care/id/chatbot` (or SLD?) | ChatPage | Diet is in AI responses, recommend ID category |
| `/therapy` | `/child-care/id/daily-tasks` | TherapyPage | Therapy rebranded as "Daily Tasks" for ID |
| `/homeschool` | `/child-care/sld/handwriting` | HomeschoolPage | Default to SLD for handwriting focus |
| `/visual-board` | `/child-care/asd-adhd/virtual-board` | VisualBoardPage | Default category |
| `/emergency` | `/child-care/emergency` | EmergencyPage | Emergency accessible from all categories |
| `/progress` | `/child-care/asd-adhd/progress` | ProgressPage | Default to ASD+ADHD (primary category) |
| `/reports` | `/child-care/asd-adhd/reports` | ReportsPage | Default to ASD+ADHD |
| `/teaching` | `/child-care/asd-adhd` (hub) or specific feature | TeachingPage | Teaching is integrated into each category's chatbot; no dedicated route |
| `/caregiver` | `/wellness` | WellnessHubPage | Caregiver wellness moved to new hub |

**Strategy**: Use React Router `<Navigate>` to redirect. Each old route shows a deprecation warning in browser console.

---

## API Endpoint Usage by Route

### ChatPage
```
POST /api/gemini/stream
  Request: { messages, context }
  Response: Server-Sent Events (text/event-stream)
```

### BehaviorPage (Behavior Interpreter)
```
POST /api/children/{id}/cues/teach
  Request: FormData { audio, label, mediaType }
  Response: { id, label, confidence, status }

POST /api/children/{id}/cues/recognize
  Request: FormData { audio }
  Response: { matched: bool, label?, confidence?, cueId? } or { matched: false, closestCues, eventId }

GET /api/children/{id}/cues
  Response: Array of cue library entries

GET /api/children/{id}/cues/model
  Response: { cueCount, trained, model, centroids, embedVersion }

POST /api/children/{id}/cues/contribute-pool
  Request: { embeddingVector, confirmedLabel }
  Response: { status }
```

### HomeschoolPage (Handwriting Interpreter)
```
POST /api/children/{id}/handwriting
  Request: FormData { image }
  Response: { reversals, letterConfusion, confidence }
```

### TherapyPage
```
GET /api/children/{id}/therapy
  Response: Array of therapy schedules

POST /api/children/{id}/therapy
  Request: { schedule }
  Response: { id, status }
```

### DietPage
```
POST /api/gemini/structured
  Request: { prompt }
  Response: { weeklyPlan, generalNotes, nutritionFocus }

GET /api/children/{id}/diet
  Response: Array of diet plans

POST /api/children/{id}/diet
  Request: { plan }
  Response: { id, status }
```

### VisualBoardPage
```
GET /api/children/{id}/visual-board
  Response: Array of visual board activities

POST /api/children/{id}/visual-board
  Request: { activity, emotion }
  Response: { id, status }
```

### ProgressPage
```
GET /api/children/{id}/progress
  Response: Array of progress entries

POST /api/children/{id}/progress
  Request: { metric_type, value }
  Response: { id, childId, metric_type, value, status }

PUT /api/children/{id}/progress/{entryId}
  Request: { metric_type, value }
  Response: { id, childId, metric_type, value, status }

DELETE /api/children/{id}/progress/{entryId}
  Response: { id, status }

GET /api/children/{id}/teaching/results
  Response: Array of teaching session results
```

### ReportsPage
```
GET /api/children/{id}/reports
  Response: Aggregated reports (category-agnostic)
```

### EmergencyPage
```
POST /api/gemini/emergency
  Request: { lat, lng, concern }
  Response: { text }

Navigator API: geolocation.getCurrentPosition()
```

### ProfilePage
```
GET /api/me
  Response: { id, email, displayName, role, profileType, preferredLanguage, children }

PUT /api/profile/display-name
  Request: { displayName }
  Response: { success, user, message }

PUT /api/profile/preferred-language
  Request: { preferredLanguage }
  Response: { success, preferredLanguage, message }
```

---

## Component Context & State Management

### Shared Context Across Routes

**AuthContext**: Active on all routes
- `user` — Current user (email, displayName, role, preferredLanguage)
- `activeChild` — Selected child profile
- `logout()` — Session termination

**LangContext**: Active on all routes
- `lang` — Current language (en, hi, mr)
- `setLang()` — Language switch
- `t()` — Translation function

**ThemeContext**: Active on all routes
- `theme` — Dark/light/system
- `setTheme()` — Theme switch

**CategoryContext** (NEW): Passed to CategoryHub and feature components
- `category` — Current category (sld, id, asd-adhd)
- `categoryLabel` — Full label (e.g., "Specific Learning Disability")
- `features` — Array of available features for this category

### Component Props for Category Awareness

Each reused component (ChatPage, ProgressPage, etc.) will accept:
```typescript
interface CategoryContextProps {
  category?: 'sld' | 'id' | 'asd-adhd' | null;
  categoryLabel?: string;
  features?: string[];
}
```

**Mounted via**:
```jsx
<ChatPage category="sld" categoryLabel="Specific Learning Disability" />
```

No backend changes; context only affects UI headers, breadcrumbs, and feature availability.

---

## Routing Logic (React Router Structure)

```jsx
<Routes>
  {/* Public */}
  <Route path="/" element={<HomePage />} />
  <Route path="/home" element={<HomePage />} />
  <Route path="/auth" element={<AuthPage />} />

  {/* Caregiver-only path */}
  {user?.profileType === "caregiver" && (
    <>
      <Route path="/choose" element={<ChoosePage />} />
      <Route path="/wellness" element={<WellnessHubPage />} />
      <Route path="/wellness/:technique" element={<CaregiverPage />} />
    </>
  )}

  {/* Child-care paths */}
  {user?.profileType === "family" && (
    <>
      <Route path="/choose" element={<ChoosePage />} />
      <Route path="/child-care" element={<ChildCareHubPage />} />
      <Route path="/child-care/sld" element={<CategoryHubPage category="sld" />} />
      <Route path="/child-care/sld/:feature" element={<FeatureWrapper category="sld" />} />
      <Route path="/child-care/id" element={<CategoryHubPage category="id" />} />
      <Route path="/child-care/id/:feature" element={<FeatureWrapper category="id" />} />
      <Route path="/child-care/asd-adhd" element={<CategoryHubPage category="asd-adhd" />} />
      <Route path="/child-care/asd-adhd/:feature" element={<FeatureWrapper category="asd-adhd" />} />
      <Route path="/child-care/emergency" element={<EmergencyPage />} />
      <Route path="/emergency" element={<Navigate to="/child-care/emergency" />} />
    </>
  )}

  {/* Shared */}
  <Route path="/profile" element={<ProfilePage />} />
  <Route path="/onboarding" element={<OnboardingPage />} />

  {/* Legacy redirects */}
  <Route path="/chat" element={<Navigate to="/child-care/asd-adhd/chatbot" />} />
  <Route path="/behavior" element={<Navigate to="/child-care/asd-adhd/behaviour-interpreter" />} />
  {/* ... more redirects ... */}

  {/* 404 */}
  <Route path="*" element={<NotFoundPage />} />
</Routes>
```

---

## Verification Checklist

- [ ] All new routes render correct component
- [ ] Old routes redirect to new paths without 404
- [ ] Category context passes correctly
- [ ] API calls return same response shapes as BASELINE
- [ ] Deep-link refresh works on all new routes
- [ ] No console errors on route transitions
- [ ] Mobile navigation works (responsive)
- [ ] Auth context remains active across all routes
- [ ] Language/theme preferences persist across routes
- [ ] Back button works correctly (breadcrumb nav)
- [ ] Build succeeds with no new errors
- [ ] TypeScript: 0 new errors
- [ ] Production bundle size: no >10% increase

---

## Notes

1. **Category Context** is UI-only; no backend schema changes
2. **Shared Components** (ChatPage, ProgressPage, etc.) mounted under multiple routes with different contexts
3. **State Reset**: Each route change via useEffect dependency on category/route
4. **Legacy Redirects**: Browser console shows deprecation notice
5. **Emergency Always Accessible**: Can be reached from breadcrumb or hub
6. **Teaching Feature**: Integrated into category hubs via chatbot; no standalone route
7. **Diet Feature**: No dedicated category; accessible via AI chat in any category
