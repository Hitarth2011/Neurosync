import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { apiGet, apiPost, apiPut } from "../lib/api";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { TeachingCameraTest } from "../components/TeachingCameraTest";
import { TeachingAidsPanel } from "../components/TeachingAidsPanel";
import { TeachingVisualCue } from "../components/TeachingVisualCue";

type PlanStep = {
  id: string;
  title: string;
  instruction: { en: string; hi?: string };
  expectedObservableAction: string;
  camera: { observable: boolean; supportedObjectLabels?: string[]; cannotEstablish: string };
  prompting: { strategy: string; waitSeconds: number };
  adaptations?: string[];
  visualCue: string;
};

type TeachingPlan = {
  learningGoal: string;
  summary: string;
  prerequisites?: string[];
  relevantContext?: string[];
  steps: PlanStep[];
  safetyConsiderations: string[];
  progressReviewCriteria: string[];
};

type Workflow = {
  id: number;
  state: string;
  goal: string;
  currentQuestion: string | null;
  draftPlan: TeachingPlan | null;
  safety: { level?: string; message?: string };
  blockedReason: string | null;
  language: string;
  updatedAt: string;
};

type Session = { id: number; status: string; current_step_index: number };
type Suggestion = { kind: string; message: string; evidence: string };
type PerformanceOutcome =
  | "completed_independently"
  | "completed_with_assistance"
  | "partially_completed"
  | "not_completed"
  | "not_attempted"
  | "unable_to_determine";
type AssistanceLevel =
  | "independent"
  | "occasional_cue"
  | "gestural_prompting"
  | "verbal_prompting"
  | "modelling"
  | "physical_prompting"
  | "fully_dependent"
  | "not_applicable"
  | "insufficient_opportunity";

const STATE_LABEL: Record<string, string> = {
  gathering_information: "Gathering details",
  plan_ready_for_review: "Plan ready for review",
  blocked: "Not safe to plan",
  approved: "Approved — ready to teach",
  in_progress: "Teaching session in progress",
  completed: "Session completed",
  cancelled: "Plan rejected",
  needs_caretaker_input: "Needs your input",
};

export default function TeachingPage() {
  const { activeChild } = useAuth();
  const { lang } = useLang();
  const location = useLocation();
  const navigate = useNavigate();
  const childId = activeChild?.id;
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [goal, setGoal] = useState("");
  const [answer, setAnswer] = useState("");
  const [editJson, setEditJson] = useState("");
  const [editing, setEditing] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [report, setReport] = useState("");
  const [outcome, setOutcome] = useState<PerformanceOutcome>("completed_independently");
  const [assistanceLevel, setAssistanceLevel] = useState<AssistanceLevel>("independent");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = async (preferredId?: number) => {
    if (!childId) return;
    const rows = await apiGet<Workflow[]>(`/api/children/${childId}/teaching/workflows`);
    setWorkflows(rows);
    const next = preferredId ? rows.find((item) => item.id === preferredId) ?? null : rows[0] ?? null;
    setWorkflow(next);
    if (next?.draftPlan) setEditJson(JSON.stringify(next.draftPlan, null, 2));
  };

  useEffect(() => { refresh().catch((e) => setError(e.message)); }, [childId]);

  useEffect(() => {
    const suggestedGoal = (location.state as { suggestedGoal?: unknown } | null)?.suggestedGoal;
    if (typeof suggestedGoal !== "string" || !suggestedGoal.trim()) return;
    setGoal(suggestedGoal.trim());
    setNotice("Goal suggested from an assessment observation. Review or edit it before continuing.");
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const selectedStep = useMemo(() => workflow?.draftPlan?.steps[stepIndex] ?? null, [workflow, stepIndex]);

  const run = async (task: () => Promise<void>) => {
    setLoading(true); setError(""); setNotice("");
    try { await task(); } catch (e: any) { setError(e.message || "Something went wrong."); }
    finally { setLoading(false); }
  };

  const createWorkflow = () => run(async () => {
    if (!childId || !goal.trim()) return;
    const created = await apiPost<Workflow>(`/api/children/${childId}/teaching/workflows`, { goal, language: lang });
    setWorkflow(created); setGoal(""); await refresh(created.id);
  });

  const submitAnswer = () => run(async () => {
    if (!childId || !workflow || !answer.trim()) return;
    const next = await apiPost<Workflow>(`/api/children/${childId}/teaching/workflows/${workflow.id}/answers`, { answer });
    setAnswer(""); setWorkflow(next); await refresh(next.id);
  });

  const savePlan = () => run(async () => {
    if (!childId || !workflow) return;
    let plan: TeachingPlan;
    try { plan = JSON.parse(editJson); } catch { throw new Error("The draft must remain valid JSON before it can be saved."); }
    const next = await apiPut<Workflow>(`/api/children/${childId}/teaching/workflows/${workflow.id}/plan`, { plan });
    setWorkflow(next); setEditing(false); setNotice("Your edited draft was saved. Review it, then approve when ready."); await refresh(next.id);
  });

  const approve = () => run(async () => {
    if (!childId || !workflow) return;
    const next = await apiPost<Workflow>(`/api/children/${childId}/teaching/workflows/${workflow.id}/approve`, {});
    setWorkflow(next); setNotice("Plan approved. You may now begin a teaching session."); await refresh(next.id);
  });

  const reject = () => run(async () => {
    if (!childId || !workflow) return;
    const next = await apiPost<Workflow>(`/api/children/${childId}/teaching/workflows/${workflow.id}/reject`, { reason: "Caretaker chose not to use this draft." });
    setWorkflow(next); setNotice("This draft was rejected. You can create a new task whenever you are ready."); await refresh(next.id);
  });

  const startSession = () => run(async () => {
    if (!childId || !workflow) return;
    const started = await apiPost<Session>(`/api/children/${childId}/teaching/workflows/${workflow.id}/sessions`, {});
    setSession(started); setStepIndex(0); setWorkflow({ ...workflow, state: "in_progress" });
  });

  const recordCaretakerOutcome = () => run(async () => {
    if (!childId || !session || !selectedStep) return;
    let observationId: number | undefined;
    if (report.trim()) {
      const observation = await apiPost<{ id: number }>(`/api/children/${childId}/teaching/sessions/${session.id}/observations`, {
        stepId: selectedStep.id, source: "caretaker_reported", caretakerReport: report.trim(),
      });
      observationId = observation.id;
    }
    await apiPost(`/api/children/${childId}/teaching/sessions/${session.id}/events`, {
      stepId: selectedStep.id, promptType: "visual", promptLanguage: lang,
      retries: 0,
      ...(observationId ? { observationId } : {}),
      performanceOutcome: outcome,
      assistanceLevel,
    });
    setReport("");
    setNotice("Attempt recorded. Any caretaker note is kept separate from camera evidence; record another attempt or choose a step.");
  });

  const completeSession = () => run(async () => {
    if (!childId || !session) return;
    await apiPost(`/api/children/${childId}/teaching/sessions/${session.id}/complete`, {});
    const result = await apiGet<{ suggestions: Suggestion[] }>(`/api/children/${childId}/teaching/sessions/${session.id}/suggestions`);
    setSuggestions(result.suggestions); setSession({ ...session, status: "completed" });
    if (workflow) setWorkflow({ ...workflow, state: "completed" });
    setNotice("Session completed. Suggestions are based on repeated attempts and do not claim mastery.");
    await refresh(workflow?.id);
  });

  if (!childId) return null;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem" }}>
      <h1 style={{ fontSize: "1.45rem", marginBottom: "0.4rem" }}>Adaptive Teaching</h1>
      <p style={{ marginTop: 0 }}>Describe any safe task in your own words. The assistant asks only for details it needs, then you review and approve every plan before teaching starts.</p>
      {error && <Alert type="error">{error}</Alert>}
      {notice && <Alert type="success">{notice}</Alert>}

      <Card style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.05rem" }}>Start a new teaching task</h2>
        <label htmlFor="teaching-goal">What would you like the child to learn?</label>
        <textarea id="teaching-goal" value={goal} onChange={(e) => setGoal(e.target.value)} rows={3}
          placeholder="For example: I want to help my child put their school bag away after coming home."
          style={{ width: "100%", resize: "vertical", marginBottom: "0.75rem" }} />
        <Button onClick={createWorkflow} loading={loading} disabled={!goal.trim()}>Ask the first question</Button>
      </Card>

      {workflows.length > 1 && <Card style={{ marginBottom: "1rem" }}>
        <label htmlFor="teaching-workflow">Previous teaching plans</label>
        <select id="teaching-workflow" value={workflow?.id ?? ""} onChange={(e) => {
          const next = workflows.find((item) => item.id === Number(e.target.value)) ?? null;
          setWorkflow(next); setSession(null); setSuggestions([]); if (next?.draftPlan) setEditJson(JSON.stringify(next.draftPlan, null, 2));
        }} style={{ width: "100%" }}>
          {workflows.map((item) => <option key={item.id} value={item.id}>{item.goal.slice(0, 80)} — {STATE_LABEL[item.state] ?? item.state}</option>)}
        </select>
      </Card>}

      {workflow && <>
        <Card style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
            <div><h2 style={{ fontSize: "1.05rem", marginBottom: "0.3rem" }}>{workflow.goal}</h2><p style={{ margin: 0, fontSize: "0.85rem" }}>{STATE_LABEL[workflow.state] ?? workflow.state}</p></div>
            <span style={{ fontSize: "0.78rem", background: "var(--color-accent-soft)", padding: "0.35rem 0.6rem", borderRadius: "999px" }}>{workflow.safety?.level ?? "safety checked"}</span>
          </div>
          {workflow.safety?.message && <p style={{ marginTop: "0.8rem", marginBottom: 0, fontSize: "0.88rem" }}>{workflow.safety.message}</p>}
        </Card>

        {["gathering_information", "needs_caretaker_input"].includes(workflow.state) && <Card style={{ marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.05rem" }}>One detail at a time</h2>
          <p>{workflow.currentQuestion ?? "Please add a little more practical detail about this task."}</p>
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={3} style={{ width: "100%", resize: "vertical", marginBottom: "0.75rem" }} placeholder="Your answer" />
          <Button onClick={submitAnswer} loading={loading} disabled={!answer.trim()}>Continue</Button>
        </Card>}

        {workflow.state === "blocked" && <Alert type="warning">{workflow.blockedReason ?? "This task cannot be safely planned."} You can start a safer alternative above.</Alert>}

        {workflow.draftPlan && <Card style={{ marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.1rem" }}>Draft plan — review before approval</h2>
          <p>{workflow.draftPlan.summary}</p>
          {workflow.draftPlan.steps.map((step, index) => <div key={step.id} style={{ borderTop: "1px solid #E8DCCF", padding: "0.9rem 0" }}>
            <strong>{index + 1}. {step.title}</strong>
            <p style={{ margin: "0.35rem 0" }}>{step.instruction.en}{step.instruction.hi ? ` / ${step.instruction.hi}` : ""}</p>
            <TeachingVisualCue title={step.title} instruction={step.instruction.en} description={step.visualCue} />
            <p style={{ margin: "0.35rem 0", fontSize: "0.85rem" }}>Wait {step.prompting.waitSeconds} seconds before offering more help.</p>
            <p style={{ margin: "0.35rem 0", fontSize: "0.85rem" }}><b>Camera:</b> {step.camera.observable ? "May observe limited evidence" : "Not appropriate for camera evidence"}. It cannot establish: {step.camera.cannotEstablish}</p>
          </div>)}
          <p style={{ fontSize: "0.85rem" }}><b>Safety:</b> {workflow.draftPlan.safetyConsiderations.join(" · ")}</p>
          {workflow.state === "plan_ready_for_review" && <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginTop: "1rem" }}>
            <Button variant="success" onClick={approve} loading={loading}>Approve plan</Button>
            <Button variant="outline" onClick={() => setEditing(!editing)}>Edit structured draft</Button>
            <Button variant="secondary" onClick={reject}>Reject plan</Button>
          </div>}
          {editing && <div style={{ marginTop: "1rem" }}><label htmlFor="plan-json">Edit the draft carefully</label><textarea id="plan-json" value={editJson} onChange={(e) => setEditJson(e.target.value)} rows={18} style={{ width: "100%", fontFamily: "monospace", fontSize: "0.78rem" }} /><Button onClick={savePlan} loading={loading}>Validate and save edits</Button></div>}
        </Card>}

        {workflow.state === "approved" && !session && <Card style={{ marginBottom: "1rem" }}><h2 style={{ fontSize: "1.05rem" }}>Ready when you are</h2><p>The plan is approved. Starting a session does not turn on a camera or save video.</p><Button variant="success" onClick={startSession} loading={loading}>Start teaching session</Button></Card>}

        {session?.status === "in_progress" && selectedStep && <Card style={{ marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.05rem" }}>Practice step {stepIndex + 1} of {workflow.draftPlan?.steps.length}</h2>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <Button variant="outline" type="button" disabled={stepIndex === 0} onClick={() => setStepIndex((value) => Math.max(0, value - 1))}>Previous step</Button>
            <Button variant="outline" type="button" disabled={!workflow.draftPlan || stepIndex >= workflow.draftPlan.steps.length - 1} onClick={() => setStepIndex((value) => Math.min((workflow.draftPlan?.steps.length ?? 1) - 1, value + 1))}>Next step</Button>
          </div>
          <h3 style={{ fontSize: "1rem" }}>{selectedStep.title}</h3><p>{selectedStep.instruction.en}</p>
          <TeachingVisualCue title={selectedStep.title} instruction={selectedStep.instruction.en} description={selectedStep.visualCue} />
          <p style={{ fontSize: "0.88rem" }}>Wait {selectedStep.prompting.waitSeconds} seconds before offering more help.</p>
          <TeachingAidsPanel childId={childId} />
          <TeachingCameraTest childId={childId} sessionId={session.id} stepId={selectedStep.id} />
          <label htmlFor="caretaker-report" style={{ marginTop: "1rem" }}>Optional observation note</label>
          <textarea id="caretaker-report" value={report} onChange={(e) => setReport(e.target.value)} rows={3} style={{ width: "100%", marginBottom: "0.6rem" }} placeholder="For example: They placed the bag on the hook after one reminder." />
          <label htmlFor="performance-outcome">What happened in this attempt?</label>
          <select id="performance-outcome" value={outcome} onChange={(e) => setOutcome(e.target.value as PerformanceOutcome)} style={{ display: "block", marginBottom: "0.6rem" }}>
            <option value="completed_independently">Completed independently</option>
            <option value="completed_with_assistance">Completed with assistance</option>
            <option value="partially_completed">Partially completed</option>
            <option value="not_completed">Not completed</option>
            <option value="not_attempted">Not attempted</option>
            <option value="unable_to_determine">Unable to determine</option>
          </select>
          <label htmlFor="assistance-level">Assistance needed for this attempt</label>
          <select id="assistance-level" value={assistanceLevel} onChange={(e) => setAssistanceLevel(e.target.value as AssistanceLevel)} style={{ display: "block", marginBottom: "0.75rem" }}>
            <option value="independent">Independent</option>
            <option value="occasional_cue">Occasional cue</option>
            <option value="gestural_prompting">Gestural prompting</option>
            <option value="verbal_prompting">Verbal prompting</option>
            <option value="modelling">Modelling / demonstration</option>
            <option value="physical_prompting">Physical prompting</option>
            <option value="fully_dependent">Fully dependent / unable to perform independently</option>
            <option value="not_applicable">Not applicable</option>
            <option value="insufficient_opportunity">No exposure / insufficient opportunity</option>
          </select>
          <Button onClick={recordCaretakerOutcome} loading={loading}>Record attempt</Button>
          <div style={{ marginTop: "1rem" }}><Button variant="secondary" onClick={completeSession} loading={loading}>Finish this session</Button></div>
        </Card>}

        {suggestions.length > 0 && <Card style={{ marginBottom: "1rem" }}><h2 style={{ fontSize: "1.05rem" }}>Cautious next-session suggestions</h2>{suggestions.map((item) => <p key={item.kind}><b>{item.message}</b><br /><span style={{ fontSize: "0.82rem" }}>{item.evidence}</span></p>)}</Card>}

      </>}
    </div>
  );
}
