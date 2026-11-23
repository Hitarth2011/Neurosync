import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiGet, apiPost } from "../lib/api";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import "./IntellectualDisabilityDashboard.css";

type BasicDomain =
  | "motor"
  | "activities_of_daily_living"
  | "language"
  | "reading_writing"
  | "number_time"
  | "domestic_social"
  | "prevocational_money";
type FunctionalDomain = "personal" | "social" | "academic" | "occupational" | "recreational";
type AssessmentStatus = "not_assessed" | "not_yet_demonstrated" | "developing" | "demonstrated";
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
type PerformanceOutcome =
  | "completed_independently"
  | "completed_with_assistance"
  | "partially_completed"
  | "not_completed"
  | "not_attempted"
  | "unable_to_determine";

type SkillObservation = {
  id: number;
  domain: BasicDomain;
  skillName: string;
  assessmentStatus: AssessmentStatus;
  learningOpportunity: "yes" | "no" | "unknown";
  observerType: "caretaker" | "educator";
  observationDate: string;
  context: string | null;
  example: string | null;
  correctsId: number | null;
  recordedAt: string;
};

type ActivityObservation = {
  id: number;
  domain: FunctionalDomain;
  activityName: string;
  assistanceLevel: AssistanceLevel;
  performanceOutcome: PerformanceOutcome;
  observerType: "caretaker" | "educator";
  observationDate: string;
  context: string | null;
  example: string | null;
  correctsId: number | null;
  recordedAt: string;
};

type AssessmentData = { skills: SkillObservation[]; activities: ActivityObservation[] };
type Event = {
  stepId: string;
  caretakerOutcome: string | null;
  performanceOutcome: PerformanceOutcome | null;
  assistanceLevel: AssistanceLevel | null;
  recordedAt: string;
  caretakerReport: string | null;
  source: string | null;
};
type Session = {
  id: number;
  goal: string;
  status: string;
  startedAt: string;
  steps: Array<{ id: string; title: string; promptingStrategy: string; visualCue: string }>;
  events: Event[];
  systemSuggestions: Array<{ kind: string; message: string; evidence: string; stepId?: string }>;
};
type Workflow = {
  id: number;
  goal: string;
  state: string;
  draftPlan: { steps: Array<{ id: string; title: string }> } | null;
};

const BASIC_DOMAINS: Array<{ id: BasicDomain; label: string }> = [
  { id: "motor", label: "Motor" },
  { id: "activities_of_daily_living", label: "Activities of Daily Living" },
  { id: "language", label: "Language" },
  { id: "reading_writing", label: "Reading–Writing" },
  { id: "number_time", label: "Number–Time" },
  { id: "domestic_social", label: "Domestic–Social" },
  { id: "prevocational_money", label: "Prevocational–Money" },
];

const FUNCTIONAL_DOMAINS: Array<{ id: FunctionalDomain; label: string }> = [
  { id: "personal", label: "Personal" },
  { id: "social", label: "Social" },
  { id: "academic", label: "Academic" },
  { id: "occupational", label: "Occupational" },
  { id: "recreational", label: "Recreational" },
];

const STATUS_LABEL: Record<AssessmentStatus, string> = {
  not_assessed: "Not assessed",
  not_yet_demonstrated: "Not yet demonstrated",
  developing: "Developing",
  demonstrated: "Demonstrated",
};

const ASSISTANCE_LABEL: Record<AssistanceLevel, string> = {
  independent: "Independent",
  occasional_cue: "Occasional cue",
  gestural_prompting: "Gestural prompting",
  verbal_prompting: "Verbal prompting",
  modelling: "Modelling / demonstration",
  physical_prompting: "Physical prompting",
  fully_dependent: "Fully dependent",
  not_applicable: "Not applicable",
  insufficient_opportunity: "No exposure / insufficient opportunity",
};

const OUTCOME_LABEL: Record<PerformanceOutcome, string> = {
  completed_independently: "Completed independently",
  completed_with_assistance: "Completed with assistance",
  partially_completed: "Partially completed",
  not_completed: "Not completed",
  not_attempted: "Not attempted",
  unable_to_determine: "Unable to determine",
};

const newDate = () => new Date().toISOString().slice(0, 10);

function currentObservations<T extends { id: number; correctsId: number | null }>(rows: T[]): T[] {
  const corrected = new Set(rows.flatMap((row) => row.correctsId === null ? [] : [row.correctsId]));
  return rows.filter((row) => !corrected.has(row.id));
}

function domainLabel(id: string, domains: Array<{ id: string; label: string }>): string {
  return domains.find((domain) => domain.id === id)?.label ?? id;
}

function recordedOutcome(event: Event): PerformanceOutcome | null {
  if (event.performanceOutcome) return event.performanceOutcome;
  if (event.caretakerOutcome === "independent") return "completed_independently";
  if (event.caretakerOutcome === "assisted") return "completed_with_assistance";
  if (event.caretakerOutcome === "not_completed") return "not_completed";
  return null;
}

export default function IntellectualDisabilityDashboard() {
  const { activeChild } = useAuth();
  const navigate = useNavigate();
  const childId = activeChild?.id;
  const [data, setData] = useState<AssessmentData>({ skills: [], activities: [] });
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [skillCorrectionId, setSkillCorrectionId] = useState<number | null>(null);
  const [activityCorrectionId, setActivityCorrectionId] = useState<number | null>(null);
  const recordDetailsRef = useRef<HTMLDetailsElement>(null);
  const [skillForm, setSkillForm] = useState({
    domain: "motor" as BasicDomain,
    skillName: "",
    assessmentStatus: "not_assessed" as AssessmentStatus,
    learningOpportunity: "unknown" as "yes" | "no" | "unknown",
    observerType: "caretaker" as "caretaker" | "educator",
    observationDate: newDate(),
    context: "",
    example: "",
  });
  const [activityForm, setActivityForm] = useState({
    domain: "personal" as FunctionalDomain,
    activityName: "",
    assistanceLevel: "insufficient_opportunity" as AssistanceLevel,
    performanceOutcome: "not_attempted" as PerformanceOutcome,
    observerType: "caretaker" as "caretaker" | "educator",
    observationDate: newDate(),
    context: "",
    example: "",
  });

  const refresh = async () => {
    if (!childId) return;
    const [assessmentData, workflowData, resultData] = await Promise.all([
      apiGet<AssessmentData>(`/api/children/${childId}/teaching/assessments`),
      apiGet<Workflow[]>(`/api/children/${childId}/teaching/workflows`),
      apiGet<Session[]>(`/api/children/${childId}/teaching/results`),
    ]);
    setData(assessmentData);
    setWorkflows(workflowData);
    setSessions(resultData);
  };

  useEffect(() => {
    if (!childId) return;
    setLoading(true);
    refresh().catch((cause) => setError(cause.message || "Could not load assessment records."))
      .finally(() => setLoading(false));
  }, [childId]);

  const skillRows = useMemo(() => currentObservations(data.skills), [data.skills]);
  const activityRows = useMemo(() => currentObservations(data.activities), [data.activities]);
  const assessedDomains = new Set(skillRows.filter((item) => item.assessmentStatus !== "not_assessed").map((item) => item.domain));
  const assessedFunctionalDomains = new Set(activityRows
    .filter((item) => item.assistanceLevel !== "insufficient_opportunity" && item.assistanceLevel !== "not_applicable")
    .map((item) => item.domain));
  const events = sessions.flatMap((session) => session.events);
  const recordedOutcomes = [
    ...activityRows.map((item) => item.performanceOutcome),
    ...events.map(recordedOutcome),
  ];
  const outcomeCounts = recordedOutcomes.reduce<Record<string, number>>((counts, outcome) => {
    if (outcome) counts[outcome] = (counts[outcome] ?? 0) + 1;
    return counts;
  }, {});
  const skillFollowUps = skillRows.filter((item) =>
    item.assessmentStatus !== "demonstrated" || item.learningOpportunity !== "yes",
  );

  const assistanceChanges = useMemo(() => {
    const grouped = new Map<string, ActivityObservation[]>();
    for (const activity of activityRows) {
      const key = `${activity.domain}:${activity.activityName.trim().toLocaleLowerCase()}`;
      grouped.set(key, [...(grouped.get(key) ?? []), activity]);
    }
    return [...grouped.values()].flatMap((history) => {
      const ordered = [...history].sort((a, b) =>
        b.observationDate.localeCompare(a.observationDate) || b.id - a.id,
      );
      if (ordered.length < 2 || ordered[0].assistanceLevel === ordered[1].assistanceLevel) return [];
      return [{ latest: ordered[0], previous: ordered[1] }];
    });
  }, [activityRows]);

  const helpfulMethods = useMemo(() => sessions.flatMap((session) =>
    session.steps.flatMap((step) => {
      const completed = session.events.filter((event) =>
        event.stepId === step.id && ["completed_independently", "completed_with_assistance"].includes(recordedOutcome(event) ?? ""),
      ).length;
      return completed > 0
        ? [{ goal: session.goal, title: step.title, method: step.promptingStrategy || step.visualCue, completed }]
        : [];
    }),
  ).slice(0, 6), [sessions]);

  const practiceWorkflows = workflows.filter((item) => item.state === "in_progress" || item.state === "approved");
  const recentObservations = [
    ...data.skills.map((item) => ({
      id: `skill-${item.id}`,
      label: `${domainLabel(item.domain, BASIC_DOMAINS)} · ${item.skillName}`,
      detail: STATUS_LABEL[item.assessmentStatus],
      date: item.observationDate,
      observerType: item.observerType,
      corrected: item.correctsId !== null,
    })),
    ...data.activities.map((item) => ({
      id: `activity-${item.id}`,
      label: `${domainLabel(item.domain, FUNCTIONAL_DOMAINS)} · ${item.activityName}`,
      detail: `${OUTCOME_LABEL[item.performanceOutcome]} · ${ASSISTANCE_LABEL[item.assistanceLevel]}`,
      date: item.observationDate,
      observerType: item.observerType,
      corrected: item.correctsId !== null,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

  const run = async (action: () => Promise<void>) => {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this observation.");
    } finally {
      setLoading(false);
    }
  };

  const saveSkill = (event: React.FormEvent) => {
    event.preventDefault();
    return run(async () => {
      if (!childId) return;
      await apiPost(`/api/children/${childId}/teaching/assessments/skills`, {
        ...skillForm,
        correctsId: skillCorrectionId,
      });
      setSkillForm((previous) => ({ ...previous, skillName: "", context: "", example: "", assessmentStatus: "not_assessed", learningOpportunity: "unknown", observationDate: newDate() }));
      setSkillCorrectionId(null);
      setNotice("Skill observation saved. Earlier records are preserved.");
      await refresh();
    });
  };

  const saveActivity = (event: React.FormEvent) => {
    event.preventDefault();
    return run(async () => {
      if (!childId) return;
      await apiPost(`/api/children/${childId}/teaching/assessments/activities`, {
        ...activityForm,
        correctsId: activityCorrectionId,
      });
      setActivityForm((previous) => ({ ...previous, activityName: "", context: "", example: "", assistanceLevel: "insufficient_opportunity", performanceOutcome: "not_attempted", observationDate: newDate() }));
      setActivityCorrectionId(null);
      setNotice("Functional observation saved. Completion and assistance are recorded separately.");
      await refresh();
    });
  };

  const correctSkill = (item: SkillObservation) => {
    setSkillForm({
      domain: item.domain,
      skillName: item.skillName,
      assessmentStatus: item.assessmentStatus,
      learningOpportunity: item.learningOpportunity,
      observerType: item.observerType,
      observationDate: newDate(),
      context: item.context ?? "",
      example: item.example ?? "",
    });
    setSkillCorrectionId(item.id);
    if (recordDetailsRef.current) recordDetailsRef.current.open = true;
    recordDetailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const correctActivity = (item: ActivityObservation) => {
    setActivityForm({
      domain: item.domain,
      activityName: item.activityName,
      assistanceLevel: item.assistanceLevel,
      performanceOutcome: item.performanceOutcome,
      observerType: item.observerType,
      observationDate: newDate(),
      context: item.context ?? "",
      example: item.example ?? "",
    });
    setActivityCorrectionId(item.id);
    if (recordDetailsRef.current) recordDetailsRef.current.open = true;
    recordDetailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const planPractice = (activity: string) => {
    navigate("/child-care/id/teaching", {
      state: { suggestedGoal: `Plan a teaching activity for: ${activity}` },
    });
  };

  if (!childId) return null;

  return (
    <section className="id-dashboard" aria-labelledby="id-dashboard-heading">
      <header className="id-dashboard__header">
        <div className="id-dashboard__header-copy">
          <p className="id-dashboard__eyebrow">INTELLECTUAL DISABILITY</p>
          <h2 id="id-dashboard-heading">Assessment &amp; teaching</h2>
          <p>Record observations, review support needs, and use them to shape teaching plans.</p>
        </div>
        <div className="id-dashboard__header-actions">
          <Button variant="success" onClick={() => navigate("/child-care/id/teaching")}>Open adaptive teaching</Button>
        </div>
      </header>
      <p className="id-dashboard__disclaimer">Observations guide teaching. This is not a diagnosis, clinical score, or official BASIC-MR/FACP assessment. Missing or unassessed information is not treated as failure.</p>
      {error && <Alert type="error">{error}</Alert>}
      {notice && <Alert type="success">{notice}</Alert>}

      <div className="id-dashboard__stats" aria-label="Assessment and teaching overview">
        <Card><span>Skill domains assessed</span><strong>{assessedDomains.size}<small> / 7</small></strong></Card>
        <Card><span>Functional domains observed</span><strong>{assessedFunctionalDomains.size}<small> / 5</small></strong></Card>
        <Card><span>Completed independently</span><strong>{outcomeCounts.completed_independently ?? 0}</strong></Card>
        <Card><span>Completed with assistance</span><strong>{outcomeCounts.completed_with_assistance ?? 0}</strong></Card>
      </div>

      <details ref={recordDetailsRef} className="id-dashboard__record">
        <summary>Record or correct an observation</summary>
        <div className="id-dashboard__forms">
          <Card>
            <h3>Skill observation</h3>
            <p>Describe the skill in your own words; no proprietary checklist items or overall scores are generated.</p>
            <form className="id-dashboard__form" onSubmit={saveSkill}>
            <label htmlFor="id-skill-domain">BASIC-MR-inspired domain</label>
            <select id="id-skill-domain" value={skillForm.domain} onChange={(event) => setSkillForm({ ...skillForm, domain: event.target.value as BasicDomain })}>
              {BASIC_DOMAINS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <label htmlFor="id-skill-name">Skill being observed</label>
            <input id="id-skill-name" required maxLength={160} value={skillForm.skillName} onChange={(event) => setSkillForm({ ...skillForm, skillName: event.target.value })} />
            <label htmlFor="id-skill-status">Current demonstrated ability</label>
            <select id="id-skill-status" value={skillForm.assessmentStatus} onChange={(event) => setSkillForm({ ...skillForm, assessmentStatus: event.target.value as AssessmentStatus })}>
              {Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <label htmlFor="id-skill-opportunity">Opportunity to learn and practise</label>
            <select id="id-skill-opportunity" value={skillForm.learningOpportunity} onChange={(event) => setSkillForm({ ...skillForm, learningOpportunity: event.target.value as typeof skillForm.learningOpportunity })}>
              <option value="yes">Yes</option><option value="no">No</option><option value="unknown">Unknown / not recorded</option>
            </select>
            <label htmlFor="id-skill-observer">Recorded by</label>
            <select id="id-skill-observer" value={skillForm.observerType} onChange={(event) => setSkillForm({ ...skillForm, observerType: event.target.value as "caretaker" | "educator" })}>
              <option value="caretaker">Caretaker</option><option value="educator">Educator</option>
            </select>
            <label htmlFor="id-skill-date">Observation date</label>
            <input id="id-skill-date" type="date" required value={skillForm.observationDate} onChange={(event) => setSkillForm({ ...skillForm, observationDate: event.target.value })} />
            <label htmlFor="id-skill-context">Context</label>
            <textarea id="id-skill-context" maxLength={2000} rows={2} value={skillForm.context} onChange={(event) => setSkillForm({ ...skillForm, context: event.target.value })} />
            <label htmlFor="id-skill-example">Example or observation</label>
            <textarea id="id-skill-example" maxLength={2000} rows={3} value={skillForm.example} onChange={(event) => setSkillForm({ ...skillForm, example: event.target.value })} />
              {skillCorrectionId !== null && <p role="status">Saving a correction to observation #{skillCorrectionId}; the original stays in the record.</p>}
              <div className="id-dashboard__form-actions">
                <Button type="submit" loading={loading}>{skillCorrectionId === null ? "Save skill observation" : "Save corrected observation"}</Button>
              </div>
            </form>
          </Card>

          <Card>
            <h3>Functional independence</h3>
            <p>Record what was completed separately from how much assistance was needed.</p>
            <form className="id-dashboard__form" onSubmit={saveActivity}>
            <label htmlFor="id-functional-domain">FACP-inspired domain</label>
            <select id="id-functional-domain" value={activityForm.domain} onChange={(event) => setActivityForm({ ...activityForm, domain: event.target.value as FunctionalDomain })}>
              {FUNCTIONAL_DOMAINS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <label htmlFor="id-activity-name">Activity being observed</label>
            <input id="id-activity-name" required maxLength={160} value={activityForm.activityName} onChange={(event) => setActivityForm({ ...activityForm, activityName: event.target.value })} />
            <label htmlFor="id-assistance-level">Assistance needed</label>
            <select id="id-assistance-level" value={activityForm.assistanceLevel} onChange={(event) => setActivityForm({ ...activityForm, assistanceLevel: event.target.value as AssistanceLevel })}>
              {Object.entries(ASSISTANCE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <label htmlFor="id-performance-outcome">Activity outcome</label>
            <select id="id-performance-outcome" value={activityForm.performanceOutcome} onChange={(event) => setActivityForm({ ...activityForm, performanceOutcome: event.target.value as PerformanceOutcome })}>
              {Object.entries(OUTCOME_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
              <p className="id-dashboard__form-note">Physical prompting is recorded descriptively and respectfully. The system does not direct or require physical assistance.</p>
            <label htmlFor="id-activity-observer">Recorded by</label>
            <select id="id-activity-observer" value={activityForm.observerType} onChange={(event) => setActivityForm({ ...activityForm, observerType: event.target.value as "caretaker" | "educator" })}>
              <option value="caretaker">Caretaker</option><option value="educator">Educator</option>
            </select>
            <label htmlFor="id-activity-date">Observation date</label>
            <input id="id-activity-date" type="date" required value={activityForm.observationDate} onChange={(event) => setActivityForm({ ...activityForm, observationDate: event.target.value })} />
            <label htmlFor="id-activity-context">Context</label>
            <textarea id="id-activity-context" maxLength={2000} rows={2} value={activityForm.context} onChange={(event) => setActivityForm({ ...activityForm, context: event.target.value })} />
            <label htmlFor="id-activity-example">Example or observation</label>
            <textarea id="id-activity-example" maxLength={2000} rows={3} value={activityForm.example} onChange={(event) => setActivityForm({ ...activityForm, example: event.target.value })} />
              {activityCorrectionId !== null && <p role="status">Saving a correction to observation #{activityCorrectionId}; the original stays in the record.</p>}
              <div className="id-dashboard__form-actions">
                <Button type="submit" loading={loading}>{activityCorrectionId === null ? "Save functional observation" : "Save corrected observation"}</Button>
              </div>
            </form>
          </Card>
        </div>
      </details>

      <div className="id-dashboard__profiles">
        <Card className="id-dashboard__section">
          <h3>Skill profile · seven domains</h3>
          <div className="id-dashboard__domain-grid">
            {BASIC_DOMAINS.map((domain) => {
              const observations = skillRows.filter((item) => item.domain === domain.id);
              return <div key={domain.id} className="id-dashboard__domain-card">
                <details className="id-dashboard__domain-details">
                  <summary><b>{domain.label}</b><small>{observations.length ? `${observations.length} observation(s)` : "No observations yet"}</small></summary>
                  {observations.slice(0, 5).map((item) =>
                    <div key={item.id} className="id-dashboard__observation">
                      <p>{item.skillName}: {STATUS_LABEL[item.assessmentStatus]} · practice opportunity: {item.learningOpportunity}</p>
                      <small>{item.observationDate} · {item.observerType}{item.example ? ` · ${item.example}` : ""}</small>
                      <div className="id-dashboard__observation-actions">
                        <Button type="button" variant="outline" size="sm" onClick={() => planPractice(item.skillName)}>Use in teaching plan</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => correctSkill(item)}>Correct</Button>
                      </div>
                    </div>,
                  )}
                </details>
              </div>;
            })}
          </div>
        </Card>

        <Card className="id-dashboard__section">
          <h3>Functional independence · five domains</h3>
          <div className="id-dashboard__domain-grid">
            {FUNCTIONAL_DOMAINS.map((domain) => {
              const observations = activityRows.filter((item) => item.domain === domain.id);
              return <div key={domain.id} className="id-dashboard__domain-card">
                <details className="id-dashboard__domain-details">
                  <summary><b>{domain.label}</b><small>{observations.length ? `${observations.length} observation(s)` : "No observations yet"}</small></summary>
                  {observations.slice(0, 5).map((item) =>
                    <div key={item.id} className="id-dashboard__observation">
                      <p>{item.activityName}: {ASSISTANCE_LABEL[item.assistanceLevel]} · {OUTCOME_LABEL[item.performanceOutcome]}</p>
                      <small>{item.observationDate} · {item.observerType}{item.example ? ` · ${item.example}` : ""}</small>
                      <div className="id-dashboard__observation-actions">
                        <Button type="button" variant="outline" size="sm" onClick={() => planPractice(item.activityName)}>Use in teaching plan</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => correctActivity(item)}>Correct</Button>
                      </div>
                    </div>,
                  )}
                </details>
              </div>;
            })}
          </div>
        </Card>
      </div>

      <details className="id-dashboard__details">
        <summary>Teaching plans, follow-ups &amp; history</summary>
        <div className="id-dashboard__details-grid">
          <Card>
            <h3>Skills to consider for further assessment or practice</h3>
            <p>These are prompts for review. Missing assessment or practice opportunity means unknown, not inability.</p>
            {skillFollowUps.length === 0 ? <p>No current skill observations are flagged for follow-up.</p> : <ul>
              {skillFollowUps.slice(0, 20).map((item) => {
                const reason = item.assessmentStatus === "not_assessed"
                  ? "Further assessment may help; current ability is unknown."
                  : item.learningOpportunity !== "yes"
                    ? "A learning/practice opportunity is not recorded."
                    : item.assessmentStatus === "developing" || item.assessmentStatus === "not_yet_demonstrated"
                      ? "Consider continued practice and a later observation."
                      : "Consider a later observation after practice.";
                return <li key={item.id}>
                  {domainLabel(item.domain, BASIC_DOMAINS)} · {item.skillName}: {reason}
                  <div className="id-dashboard__observation-actions">
                    <Button type="button" variant="outline" size="sm" onClick={() => planPractice(item.skillName)}>Use in teaching plan</Button>
                  </div>
                </li>;
              })}
            </ul>}
          </Card>

          <Card>
            <h3>Skills and activities planned or being practised</h3>
            {practiceWorkflows.length === 0 ? <p>No approved or active teaching plans yet.</p> : practiceWorkflows.map((workflow) =>
              <div key={workflow.id}><b>{workflow.goal}</b><ul>{workflow.draftPlan?.steps.map((step) => <li key={step.id}>{step.title}</li>)}</ul></div>,
            )}
            <Button variant="outline" onClick={() => navigate("/child-care/id/teaching")}>Open adaptive teaching</Button>
          </Card>

          <Card>
            <h3>Assistance changes over time</h3>
            {assistanceChanges.length === 0
              ? <p>More than one comparable observation is needed to show a change.</p>
              : assistanceChanges.map(({ latest, previous }) =>
                <p key={`${latest.domain}:${latest.activityName}`}>
                  {latest.activityName}: {ASSISTANCE_LABEL[previous.assistanceLevel]} → {ASSISTANCE_LABEL[latest.assistanceLevel]}
                  <br /><small>{previous.observationDate} to {latest.observationDate}; recorded observations, not a score</small>
                </p>,
              )}
          </Card>

          <Card>
            <h3>Recent teaching sessions</h3>
            {sessions.slice(0, 5).length === 0 ? <p>No teaching sessions have been recorded.</p> : sessions.slice(0, 5).map((session) =>
              <div key={session.id} className="id-dashboard__observation">
                <b>{session.goal}</b> · {session.status} · {new Date(session.startedAt).toLocaleDateString()}
                <ul>{session.events.slice(-5).map((event, index) =>
                  <li key={`${event.stepId}-${index}`}>
                    {session.steps.find((step) => step.id === event.stepId)?.title ?? event.stepId}: {recordedOutcome(event) ? OUTCOME_LABEL[recordedOutcome(event)!] : "No outcome recorded"}
                    {event.assistanceLevel ? ` · ${ASSISTANCE_LABEL[event.assistanceLevel]}` : ""}
                    {event.caretakerReport ? ` · ${event.caretakerReport}` : ""}
                  </li>,
                )}</ul>
                {session.systemSuggestions.length > 0 && <div>
                  <b>System suggestions for caretaker review</b>
                  {session.systemSuggestions.map((suggestion, index) =>
                    <p key={`${suggestion.stepId ?? "all"}-${suggestion.kind}-${index}`}>
                      {suggestion.stepId ? `${session.steps.find((step) => step.id === suggestion.stepId)?.title ?? suggestion.stepId}: ` : ""}
                      {suggestion.message} <small>Evidence: {suggestion.evidence}</small>
                    </p>,
                  )}
                </div>}
              </div>,
            )}
          </Card>

          <Card>
            <h3>Teaching methods that may be helpful</h3>
            {helpfulMethods.length === 0 ? <p>No repeated session records yet.</p> : helpfulMethods.map((method, index) =>
              <p key={`${method.title}-${index}`}>
                {method.method || "Caretaker-selected teaching approach"} · {method.title} ({method.completed} completed attempt(s))
                <br /><small>From recorded sessions for “{method.goal}”; not a promise of future success.</small>
              </p>,
            )}
          </Card>

          <Card>
            <h3>Recent observations</h3>
            {recentObservations.length === 0 ? <p>No assessment observations recorded yet.</p> : <ul>{recentObservations.map((item) =>
              <li key={item.id}>{item.date} · {item.observerType}: {item.label} — {item.detail}{item.corrected ? " (correction; earlier record retained)" : ""}</li>,
            )}</ul>}
          </Card>
        </div>
      </details>
      {loading && <p role="status">Saving or loading records…</p>}
    </section>
  );
}
