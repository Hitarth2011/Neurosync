# Intellectual Disability assessment and adaptive teaching

These changes extend only the Intellectual Disability category's existing
assessment dashboard and adaptive-teaching workflow. They do not replace the
chat, routine, progress, or cue features.

## What it does

1. Caretakers and educators can record append-only skill observations in seven
   BASIC-MR-inspired domains and functional activities in five FACP-inspired
   domains. These are locally recorded observations, not official assessments,
   scores, diagnoses, or severity classifications.
2. Observation status and learning opportunity are separate. Corrections link
   to earlier observations rather than overwriting them.
3. Functional assistance level and activity outcome are stored separately.
   Teaching attempts support six outcomes and the requested assistance levels,
   including distinct gestural-prompting and modelling options informed by the
   functional checklist.
4. The interview uses current skill and functional observations, plus relevant
   prior teaching attempts and clearly labeled system suggestions. Unknown,
   unassessed, and not-attempted records are not treated as failure.
5. Plans use small observable steps and remain editable. A caretaker must
   review and approve a plan before a session can start.
6. Repeated session evidence can produce transparent, per-step suggestions.
   Prompt reduction or a next step requires three consecutive independent
   attempts; a single success is not mastery. Suggestions do not diagnose.
7. Optional First–Then, Token, and Choice boards can be configured or disabled.
   Token boards only record progress and never choose a reward. Basic needs,
   rest, comfort, and communication must never be withheld.

## Backend pieces added

`id_skill_assessments` and `id_functional_assessments` store versioned
observations. `id_teaching_aid_configs` stores board configuration snapshots;
`id_teaching_aid_events` preserves token and choice actions. `teaching_workflows`
stores the conversation and plan draft. `teaching_sessions` tracks practice
sessions, `teaching_observations` separates evidence sources, and
`teaching_events` stores each step's outcome and assistance level.

All endpoints are under `/api/children/:childId/teaching/` and check child
access. Assessment, visual-aid, observation, attempt, and session-state writes
also require active consent. Existing plans retain their approval and safety
states.

## Required setup

The teaching interview uses the existing `GROQ_API_KEY` or `GEMINI_API_KEY`.
Without either key, the UI labels its one-question fallback clearly and never
pretends that a model created a plan. The caregiver answers relevant questions
before a draft is generated, and must review and approve that draft before
teaching begins.

Run the focused assessment, adaptation, persistence, access-control, and API
checks with `npm run test:id-teaching`. Type-check the project with
`npx tsc --noEmit -p tsconfig.json` and build the frontend with `npm run build`.

For the separate static YOLO experiment, follow [ml/VISION_SETUP.md](ml/VISION_SETUP.md).
