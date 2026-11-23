import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  AssessmentSubject,
  getIsaaReferenceBand,
  getWorksheetItems,
  ISAA_DOMAINS,
  ISAA_ITEMS,
  IsaaRatings,
  scoreIsaaDomains,
  scoreIsaa,
  scoreWorksheet,
  WorksheetResult,
} from "../lib/diagnostic-assessment";
import "./DiagnosticAssessmentPage.css";

type MainTab = "academic" | "isaa" | "summary";
type AcademicTab = "worksheet" | "history" | "observations";
type ObservationStatus = "" | "no_concern" | "concern" | "uncertain";
type AssessmentData = {
  profile: {
    childName: string;
    age: string;
    school: string;
    classLevel: string;
    parentEducation: string;
    previousEnglishMarks: string;
    previousHindiMarks: string;
    previousMathMarks: string;
  };
  physical: Record<string, ObservationStatus>;
  laterality: Record<string, string[]>;
  processFlags: Record<string, boolean>;
  isaaRatings: IsaaRatings;
  worksheetResults: WorksheetResult[];
  savedAt: string;
};

const blankData = (childName = ""): AssessmentData => ({
  profile: {
    childName,
    age: "",
    school: "",
    classLevel: "",
    parentEducation: "",
    previousEnglishMarks: "",
    previousHindiMarks: "",
    previousMathMarks: "",
  },
  physical: {},
  laterality: {
    hand: ["", "", ""],
    leg: ["", "", ""],
    eye: ["", "", ""],
  },
  processFlags: {},
  isaaRatings: {},
  worksheetResults: [],
  savedAt: "",
});

const PHYSICAL_CHECKS = [
  { id: "vision", label: "Vision concern or difficulty noticed" },
  { id: "hearing", label: "Hearing concern or difficulty noticed" },
  { id: "physical", label: "Physical or mobility concern reported" },
  { id: "balance_one_leg", label: "Balance: standing briefly on one leg" },
  { id: "balance_hop", label: "Balance: hopping in place" },
  { id: "balance_line", label: "Balance: walking along a line" },
  { id: "coordination_finger_nose", label: "Coordination: touching a target with a finger" },
  { id: "coordination_rhythm", label: "Coordination: copying a simple rhythm" },
] as const;

const PROCESS_FLAGS = [
  "Uses a finger to keep place while reading",
  "Says separate sounds aloud before blending a word",
  "Leaves out or replaces words while reading",
  "Writes letters or words unusually large or small for the task",
  "Overwrites or repeatedly erases written work",
  "Confuses place value when writing or calculating numbers",
  "Reverses a letter or numeral during written work",
  "Needs repeated reminders to begin or continue a task",
  "Has difficulty copying from a nearby or distant model",
  "Needs extra time to understand a multi-step direction",
] as const;

const RATING_OPTIONS = [
  { value: 1, label: "Rarely", frequency: "Up to 20%" },
  { value: 2, label: "Sometimes", frequency: "21–40%" },
  { value: 3, label: "Frequently", frequency: "41–60%" },
  { value: 4, label: "Mostly", frequency: "61–80%" },
  { value: 5, label: "Always", frequency: "81–100%" },
] as const;

const SUBJECTS: Array<{ id: AssessmentSubject; label: string }> = [
  { id: "english", label: "English" },
  { id: "hindi", label: "Hindi" },
  { id: "mathematics", label: "Mathematics" },
];

const STORAGE_VERSION = "v1";

function isAssessmentData(value: unknown): value is AssessmentData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<AssessmentData>;
  return Boolean(
    data.profile &&
    typeof data.profile === "object" &&
    data.physical &&
    typeof data.physical === "object" &&
    data.laterality &&
    typeof data.laterality === "object" &&
    data.processFlags &&
    typeof data.processFlags === "object" &&
    data.isaaRatings &&
    typeof data.isaaRatings === "object" &&
    Array.isArray(data.worksheetResults),
  );
}

function statusLabel(status: ObservationStatus): string {
  if (status === "concern") return "Follow-up noted";
  if (status === "no_concern") return "No concern noted";
  if (status === "uncertain") return "Not sure";
  return "Not recorded";
}

function getResultLabel(result: WorksheetResult["level"]): string {
  if (result === "independent") return "Independent level";
  if (result === "instructional") return "Instructional level";
  return "Frustrational level";
}

function saveTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function DiagnosticAssessmentPage() {
  const { activeChild, user } = useAuth();
  const location = useLocation();
  const storageKey = `neurosync-assessment-${STORAGE_VERSION}:${user?.id ?? "local"}:${activeChild?.id ?? 0}`;
  const childName = activeChild?.onboarding_data?.childName ?? "";
  const [data, setData] = useState<AssessmentData>(() => blankData(childName));
  const [loadedKey, setLoadedKey] = useState("");
  const [storageMessage, setStorageMessage] = useState("");
  const [mainTab, setMainTab] = useState<MainTab>(location.pathname.includes("/asd-adhd/") ? "isaa" : "academic");
  const [academicTab, setAcademicTab] = useState<AcademicTab>("worksheet");
  const [grade, setGrade] = useState(1);
  const [subject, setSubject] = useState<AssessmentSubject>("english");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [worksheetMessage, setWorksheetMessage] = useState("");
  const [isaaMessage, setIsaaMessage] = useState("");

  useEffect(() => {
    setLoadedKey("");
    let restored = blankData(childName);
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (isAssessmentData(parsed)) {
          const defaults = blankData(childName);
          restored = {
            ...parsed,
            profile: {
              ...defaults.profile,
              ...parsed.profile,
              childName: parsed.profile.childName || childName,
            },
            laterality: { ...defaults.laterality, ...parsed.laterality },
          };
        } else {
          setStorageMessage("Saved assessment data could not be read. A new local assessment has been started.");
        }
      }
    } catch (error) {
      console.error("[diagnostic-assessment] Failed to load saved assessment:", error);
      setStorageMessage("Could not read saved assessment data from this browser.");
    }
    setData(restored);
    setLoadedKey(storageKey);
  }, [storageKey, childName]);

  useEffect(() => {
    if (loadedKey !== storageKey) return;
    try {
      const updated = { ...data, savedAt: new Date().toISOString() };
      window.localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (error) {
      console.error("[diagnostic-assessment] Failed to save assessment:", error);
      setStorageMessage("This browser could not save the assessment. Check available local storage before continuing.");
    }
  }, [data, loadedKey, storageKey]);

  const items = useMemo(() => getWorksheetItems(grade, subject), [grade, subject]);
  const isaaResult = useMemo(() => scoreIsaa(data.isaaRatings), [data.isaaRatings]);
  const isaaDomainResults = useMemo(() => scoreIsaaDomains(data.isaaRatings), [data.isaaRatings]);
  const latestResults = useMemo(
    () => [...data.worksheetResults].sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
    [data.worksheetResults],
  );
  const flaggedChecks = PHYSICAL_CHECKS.filter((check) => data.physical[check.id] === "concern");
  const flaggedProcesses = PROCESS_FLAGS.filter((flag) => data.processFlags[flag]);

  function updateProfile(field: keyof AssessmentData["profile"], value: string) {
    setData((current) => ({ ...current, profile: { ...current.profile, [field]: value } }));
  }

  function updatePhysical(id: string, value: ObservationStatus) {
    setData((current) => ({ ...current, physical: { ...current.physical, [id]: value } }));
  }

  function updateLaterality(bodyPart: string, chance: number, value: string) {
    setData((current) => {
      const chances = [...(current.laterality[bodyPart] ?? ["", "", ""])];
      chances[chance] = value;
      return { ...current, laterality: { ...current.laterality, [bodyPart]: chances } };
    });
  }

  function completeWorksheet() {
    if (items.some((item) => !answers[item.id]?.trim())) {
      setWorksheetMessage("Answer every question before scoring this worksheet.");
      return;
    }
    const score = scoreWorksheet(items, answers);
    const result: WorksheetResult = {
      ...score,
      id: `${grade}-${subject}-${Date.now()}`,
      grade,
      subject,
      completedAt: new Date().toISOString(),
    };
    setData((current) => ({ ...current, worksheetResults: [result, ...current.worksheetResults] }));
    setWorksheetMessage(`Saved: ${score.percentage}% — ${getResultLabel(score.level)}.`);
  }

  function rateIsaa(itemNumber: number, value: number) {
    setData((current) => ({
      ...current,
      isaaRatings: { ...current.isaaRatings, [itemNumber]: value },
    }));
    setIsaaMessage("");
  }

  function clearIsaaRatings() {
    if (!window.confirm("Clear all 40 ISAA observation ratings for this child?")) return;
    setData((current) => ({ ...current, isaaRatings: {} }));
    setIsaaMessage("Ratings cleared.");
  }

  function createReportText() {
    const lines = [
      "NEUROSYNC — SCHOLASTIC AND NEURO-SENSORY OBSERVATION SUMMARY",
      `Generated: ${new Date().toLocaleString()}`,
      `Child: ${data.profile.childName || "Not recorded"}`,
      `Age: ${data.profile.age || "Not recorded"}`,
      `School / class: ${[data.profile.school, data.profile.classLevel].filter(Boolean).join(" / ") || "Not recorded"}`,
      `Parent / guardian education: ${data.profile.parentEducation || "Not recorded"}`,
      `Previous marks: English ${data.profile.previousEnglishMarks || "not recorded"}; Hindi ${data.profile.previousHindiMarks || "not recorded"}; Mathematics ${data.profile.previousMathMarks || "not recorded"}`,
      "",
      "GLAD-INSPIRED CLASS-LEVEL PRACTICE WORKSHEETS",
      ...latestResults.map((result) =>
        `Class ${result.grade} ${result.subject}: ${result.correct}/${result.total} (${result.percentage}%) — ${getResultLabel(result.level)}`),
      ...summarizeGradeGaps(latestResults),
      "",
      "FORMAT II OBSERVATIONS",
      ...PHYSICAL_CHECKS.map((check) => `${check.label}: ${statusLabel(data.physical[check.id] ?? "")}`),
      `Laterality observations: ${["hand", "leg", "eye"].map((part) => `${part}: ${(data.laterality[part] ?? []).filter(Boolean).join(", ") || "not recorded"}`).join("; ")}`,
      `Processing observations noted: ${flaggedProcesses.length ? flaggedProcesses.join("; ") : "None recorded"}`,
      "",
      "ISAA-INSPIRED NEURO-SENSORY OBSERVATIONS",
      `Ratings recorded: ${isaaResult.completed}/${isaaResult.total}`,
      `Total score: ${isaaResult.score ?? "Not calculated — complete all ratings first"}`,
      ...(isaaResult.score === null ? [] : [`Reference band: ${getIsaaReferenceBand(isaaResult.score).label} (${getIsaaReferenceBand(isaaResult.score).range})`]),
      ...isaaDomainResults.map((domain) => `${domain.label}: ${domain.score ?? `${domain.completed}/${domain.total} ratings recorded`}`),
      "",
      "Important: This is a locally saved observation and original practice worksheet summary, not a standardized test result, medical diagnosis, or disability certification. A qualified professional should interpret concerns and any formal assessment.",
    ];
    return lines.join("\n");
  }

  return (
    <main className="diagnostic-page">
      <header className="diagnostic-header">
        <div>
          <div className="diagnostic-eyebrow">NEUROSYNC • ASSESSMENT TOOLS</div>
          <h1>Scholastic &amp; Neuro-Sensory Assessment</h1>
          <p>Organize learning observations and practice results for a qualified educator or clinician to review.</p>
        </div>
        <div className="diagnostic-child-chip">
          <span aria-hidden="true">👧</span>
          <span>{data.profile.childName || childName || "Child profile not named"}</span>
        </div>
      </header>

      <div className="diagnostic-notice" role="note">
        <strong>Screening support, not diagnosis.</strong> Digital worksheets are original practice activities, not official GLAD test items. The ISAA score is a reference only and must not be used by itself to diagnose autism or determine disability.
      </div>
      {storageMessage && <div className="diagnostic-alert" role="alert">{storageMessage}</div>}

      <nav className="diagnostic-tabs" aria-label="Assessment sections">
        {([
          ["academic", "Academic diagnostics", "GLAD-inspired"],
          ["isaa", "Neuro-sensory profile", "ISAA-inspired"],
          ["summary", "Unified summary", "Report"],
        ] as Array<[MainTab, string, string]>).map(([id, label, caption]) => (
          <button key={id} type="button" className={mainTab === id ? "active" : ""} onClick={() => setMainTab(id)}>
            <span>{label}</span><small>{caption}</small>
          </button>
        ))}
      </nav>

      {mainTab === "academic" && (
        <section className="diagnostic-panel">
          <div className="diagnostic-subtabs" aria-label="Academic assessment tools">
            {([
              ["worksheet", "Class worksheets"],
              ["history", "Student & school history"],
              ["observations", "Process observations"],
            ] as Array<[AcademicTab, string]>).map(([id, label]) => (
              <button key={id} type="button" className={academicTab === id ? "active" : ""} onClick={() => setAcademicTab(id)}>{label}</button>
            ))}
          </div>

          {academicTab === "worksheet" && (
            <div className="diagnostic-section">
              <div className="diagnostic-section-heading">
                <div><h2>Class-level practice worksheet</h2><p>Select a class and subject. Each correct answer earns one point.</p></div>
                <span className="diagnostic-tag">English • Hindi • Mathematics</span>
              </div>
              <div className="diagnostic-selectors">
                <label>Class
                  <select value={grade} onChange={(event) => { setGrade(Number(event.target.value)); setAnswers({}); setWorksheetMessage(""); }}>
                    {[1, 2, 3, 4].map((level) => <option key={level} value={level}>Class {["I", "II", "III", "IV"][level - 1]}</option>)}
                  </select>
                </label>
                <label>Subject
                  <select value={subject} onChange={(event) => { setSubject(event.target.value as AssessmentSubject); setAnswers({}); setWorksheetMessage(""); }}>
                    {SUBJECTS.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
                  </select>
                </label>
              </div>
              <div className="diagnostic-question-list">
                {items.map((item, index) => (
                  <fieldset className="diagnostic-question" key={item.id}>
                    <legend><span>{index + 1}</span>{item.prompt}</legend>
                    {item.options ? (
                      <div className="diagnostic-answer-options">
                        {item.options.map((option) => (
                          <label key={option} className={answers[item.id] === option ? "selected" : ""}>
                            <input type="radio" name={item.id} value={option} checked={answers[item.id] === option} onChange={() => setAnswers((current) => ({ ...current, [item.id]: option }))} />
                            {option}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <input
                        type="text"
                        lang={subject === "hindi" ? "hi" : "en"}
                        aria-label={`Answer to question ${index + 1}`}
                        value={answers[item.id] ?? ""}
                        onChange={(event) => setAnswers((current) => ({ ...current, [item.id]: event.target.value }))}
                        placeholder={subject === "hindi" ? "उत्तर लिखें" : "Type your answer"}
                      />
                    )}
                  </fieldset>
                ))}
              </div>
              <div className="diagnostic-actions">
                <button className="diagnostic-primary" type="button" onClick={completeWorksheet}>Score &amp; save worksheet</button>
                <span aria-live="polite">{worksheetMessage}</span>
              </div>
              <p className="diagnostic-footnote">Performance bands: 70% or above = independent; 40–69% = instructional; below 40% = frustrational. Use official GLAD materials and trained administration for standardized results.</p>
            </div>
          )}

          {academicTab === "history" && (
            <div className="diagnostic-section">
              <div className="diagnostic-section-heading"><div><h2>Student profile &amp; school history</h2><p>Context for interpreting classroom observations.</p></div></div>
              <div className="diagnostic-form-grid">
                <label>Student name<input value={data.profile.childName} onChange={(event) => updateProfile("childName", event.target.value)} placeholder="Name" /></label>
                <label>Age<input type="number" min="3" max="25" value={data.profile.age} onChange={(event) => updateProfile("age", event.target.value)} placeholder="Age in years" /></label>
                <label>School<input value={data.profile.school} onChange={(event) => updateProfile("school", event.target.value)} placeholder="School name" /></label>
                <label>Current class
                  <select value={data.profile.classLevel} onChange={(event) => updateProfile("classLevel", event.target.value)}>
                    <option value="">Select class</option>{["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "Other"].map((level) => <option key={level}>{level}</option>)}
                  </select>
                </label>
                <label>Parent / guardian education<input value={data.profile.parentEducation} onChange={(event) => updateProfile("parentEducation", event.target.value)} placeholder="Optional context" /></label>
              </div>
              <h3 className="diagnostic-subheading">Previous test marks (optional)</h3>
              <div className="diagnostic-form-grid diagnostic-marks-grid">
                {([
                  ["previousEnglishMarks", "English"],
                  ["previousHindiMarks", "Hindi"],
                  ["previousMathMarks", "Mathematics"],
                ] as Array<[keyof AssessmentData["profile"], string]>).map(([field, label]) => (
                  <label key={field}>{label}<input type="text" value={data.profile[field]} onChange={(event) => updateProfile(field, event.target.value)} placeholder="e.g. 34/50 or 68%" /></label>
                ))}
              </div>
            </div>
          )}

          {academicTab === "observations" && (
            <div className="diagnostic-section">
              <div className="diagnostic-section-heading"><div><h2>Qualitative process observations</h2><p>Record what was observed, not an inferred diagnosis.</p></div></div>
              <h3 className="diagnostic-subheading">Sensorimotor &amp; physical screening</h3>
              <div className="diagnostic-observation-list">
                {PHYSICAL_CHECKS.map((check) => (
                  <label key={check.id} className="diagnostic-observation-row">
                    <span>{check.label}</span>
                    <select value={data.physical[check.id] ?? ""} onChange={(event) => updatePhysical(check.id, event.target.value as ObservationStatus)}>
                      <option value="">Not recorded</option>
                      <option value="no_concern">No concern noted</option>
                      <option value="concern">Follow-up noted</option>
                      <option value="uncertain">Not sure</option>
                    </select>
                  </label>
                ))}
              </div>
              <h3 className="diagnostic-subheading">Laterality preference (three observations each)</h3>
              <div className="diagnostic-laterality-grid">
                {(["hand", "leg", "eye"] as const).map((part) => (
                  <div className="diagnostic-laterality-card" key={part}>
                    <strong>{part === "hand" ? "Hand" : part === "leg" ? "Leg" : "Eye"}</strong>
                    {[0, 1, 2].map((chance) => (
                      <label key={chance}>Observation {chance + 1}
                        <select value={data.laterality[part]?.[chance] ?? ""} onChange={(event) => updateLaterality(part, chance, event.target.value)}>
                          <option value="">Not recorded</option><option>Right</option><option>Left</option><option>Both / mixed</option><option>Unclear</option>
                        </select>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
              <h3 className="diagnostic-subheading">Processing error matrix</h3>
              <div className="diagnostic-process-grid">
                {PROCESS_FLAGS.map((flag) => (
                  <label key={flag} className="diagnostic-check-row">
                    <input type="checkbox" checked={Boolean(data.processFlags[flag])} onChange={(event) => setData((current) => ({ ...current, processFlags: { ...current.processFlags, [flag]: event.target.checked } }))} />
                    <span>{flag}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {mainTab === "isaa" && (
        <section className="diagnostic-panel diagnostic-section">
          <div className="diagnostic-section-heading">
            <div><h2>Neuro-sensory observation checklist</h2><p>Rate frequency based on observations across everyday settings.</p></div>
            <div className="diagnostic-score-pill">{isaaResult.completed}/40 rated</div>
          </div>
          <div className="diagnostic-rating-guide">
            {RATING_OPTIONS.map((option) => <span key={option.value}><strong>{option.value} · {option.label}</strong><small>{option.frequency}</small></span>)}
          </div>
          {ISAA_DOMAINS.map((domain) => (
            <section className="diagnostic-domain" key={domain.id}>
              <h3><span>{domain.id === "social" ? "01" : domain.id === "emotional" ? "02" : domain.id === "communication" ? "03" : domain.id === "behaviour" ? "04" : domain.id === "sensory" ? "05" : "06"}</span>{domain.label}<small>{domain.itemCount} observations</small></h3>
              {Array.from({ length: domain.itemCount }, (_, index) => {
                const itemNumber = domain.firstItem + index;
                return (
                  <fieldset className="diagnostic-rating-row" key={itemNumber}>
                    <legend><span>{itemNumber}</span>{ISAA_ITEMS[itemNumber - 1]}</legend>
                    <div className="diagnostic-rating-options">
                      {RATING_OPTIONS.map((option) => (
                        <label key={option.value} className={data.isaaRatings[itemNumber] === option.value ? "selected" : ""}>
                          <input type="radio" name={`isaa-${itemNumber}`} value={option.value} checked={data.isaaRatings[itemNumber] === option.value} onChange={() => rateIsaa(itemNumber, option.value)} />
                          <span>{option.value}</span><small>{option.label}</small>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                );
              })}
            </section>
          ))}
          <div className="diagnostic-actions diagnostic-isaa-actions">
            <button type="button" className="diagnostic-primary" onClick={() => setIsaaMessage(isaaResult.score === null ? `Rate all ${isaaResult.total} observations to calculate a total.` : `Total: ${isaaResult.score}/200 — ${getIsaaReferenceBand(isaaResult.score).label}.`)}>Calculate reference score</button>
            <button type="button" className="diagnostic-secondary" onClick={clearIsaaRatings}>Clear ratings</button>
            <span aria-live="polite">{isaaMessage}</span>
          </div>
          {isaaResult.score !== null && (
            <div className="diagnostic-reference-result" role="status">
              <strong>{isaaResult.score} / 200 · {getIsaaReferenceBand(isaaResult.score).label}</strong>
              <span>Manual reference score range: {getIsaaReferenceBand(isaaResult.score).range}</span>
              <p>{getIsaaReferenceBand(isaaResult.score).note}</p>
            </div>
          )}
          <p className="diagnostic-footnote">These are original observation prompts organized around the six ISAA domains; they do not reproduce the standardized test items. A qualified professional must administer and interpret the official instrument. This screen does not diagnose autism or determine disability.</p>
        </section>
      )}

      {mainTab === "summary" && (
        <section className="diagnostic-panel diagnostic-section">
          <div className="diagnostic-section-heading">
            <div><h2>Unified observation summary</h2><p>Review saved practice results and observations before sharing with a qualified professional.</p></div>
            <div className="diagnostic-report-actions">
              <button type="button" className="diagnostic-secondary" onClick={() => window.print()}>Print / Save PDF</button>
              <button type="button" className="diagnostic-primary" onClick={() => saveTextFile(`neurosync-assessment-${new Date().toISOString().slice(0, 10)}.txt`, createReportText())}>Download summary</button>
            </div>
          </div>
          <div className="diagnostic-summary-grid">
            <article className="diagnostic-summary-card">
              <span className="diagnostic-card-kicker">STUDENT</span>
              <h3>{data.profile.childName || childName || "Name not recorded"}</h3>
              <p>{[data.profile.age && `${data.profile.age} years`, data.profile.school, data.profile.classLevel && `Class ${data.profile.classLevel}`].filter(Boolean).join(" · ") || "Add student and school history in Academic diagnostics."}</p>
              <p>Parent / guardian education: {data.profile.parentEducation || "Not recorded"}</p>
              <p>Previous marks — English: {data.profile.previousEnglishMarks || "—"}; Hindi: {data.profile.previousHindiMarks || "—"}; Mathematics: {data.profile.previousMathMarks || "—"}</p>
            </article>
            <article className="diagnostic-summary-card">
              <span className="diagnostic-card-kicker">ISAA OBSERVATIONS</span>
              <h3>{isaaResult.score === null ? `${isaaResult.completed} / 40 rated` : `${isaaResult.score} / 200`}</h3>
              <p>{isaaResult.score === null ? "Complete all observations to calculate the reference band." : `${getIsaaReferenceBand(isaaResult.score).label} · range ${getIsaaReferenceBand(isaaResult.score).range}`}</p>
            </article>
            <article className="diagnostic-summary-card">
              <span className="diagnostic-card-kicker">FOLLOW-UP FLAGS</span>
              <h3>{flaggedChecks.length + flaggedProcesses.length}</h3>
              <p>{flaggedChecks.length} physical/sensorimotor and {flaggedProcesses.length} learning-process observations noted.</p>
            </article>
          </div>

          <h3 className="diagnostic-subheading">GLAD-inspired practice results</h3>
          {latestResults.length === 0 ? <p className="diagnostic-empty">No class worksheets have been completed yet.</p> : (
            <div className="diagnostic-results-table-wrap">
              <table className="diagnostic-results-table">
                <thead><tr><th>Class</th><th>Subject</th><th>Score</th><th>Performance band</th><th>Completed</th></tr></thead>
                <tbody>{latestResults.map((result) => (
                  <tr key={result.id}><td>{["I", "II", "III", "IV"][result.grade - 1]}</td><td>{SUBJECTS.find((entry) => entry.id === result.subject)?.label}</td><td>{result.correct}/{result.total} ({result.percentage}%)</td><td><span className={`diagnostic-level ${result.level}`}>{getResultLabel(result.level)}</span></td><td>{new Date(result.completedAt).toLocaleDateString()}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}

          <h3 className="diagnostic-subheading">Independent and instructional class ranges</h3>
          {summarizeGradeGaps(latestResults).length === 0
            ? <p className="diagnostic-empty">Complete worksheets in more than one class to compare practice-level ranges by subject.</p>
            : <ul className="diagnostic-flag-list">{summarizeGradeGaps(latestResults).map((summary) => <li key={summary}>{summary}</li>)}</ul>}

          <h3 className="diagnostic-subheading">ISAA-domain observation totals</h3>
          <div className="diagnostic-domain-summary">
            {isaaDomainResults.map((domain) => (
              <div key={domain.id}>
                <strong>{domain.label}</strong>
                <span>{domain.score === null ? `${domain.completed}/${domain.total} rated` : `${domain.score}/${domain.total * 5}`}</span>
              </div>
            ))}
          </div>

          <h3 className="diagnostic-subheading">Sensorimotor and laterality observations</h3>
          <div className="diagnostic-observation-summary">
            {PHYSICAL_CHECKS.map((check) => (
              <div key={check.id}><span>{check.label}</span><strong>{statusLabel(data.physical[check.id] ?? "")}</strong></div>
            ))}
            {(["hand", "leg", "eye"] as const).map((part) => (
              <div key={part}>
                <span>Laterality — {part}</span>
                <strong>{(data.laterality[part] ?? []).filter(Boolean).join(" / ") || "Not recorded"}</strong>
              </div>
            ))}
          </div>

          <h3 className="diagnostic-subheading">Observed areas for follow-up</h3>
          {flaggedChecks.length + flaggedProcesses.length === 0 ? (
            <p className="diagnostic-empty">No follow-up flags recorded. Unanswered checks are not interpreted as “no concern”.</p>
          ) : (
            <ul className="diagnostic-flag-list">
              {flaggedChecks.map((check) => <li key={check.id}>{check.label}</li>)}
              {flaggedProcesses.map((flag) => <li key={flag}>{flag}</li>)}
            </ul>
          )}
          <div className="diagnostic-referral-note"><strong>Suggested next step:</strong> Discuss persistent learning, sensory, vision, hearing, or motor concerns with the child’s teacher and an appropriately qualified health or education professional. This summary is not a diagnosis or a disability certificate.</div>
          <p className="diagnostic-local-note">Saved in this browser for this signed-in account and child; assessment data is not uploaded to the NeuroSync server.</p>
        </section>
      )}
    </main>
  );
}

function summarizeGradeGaps(results: WorksheetResult[]): string[] {
  const latestByGradeAndSubject = new Map<string, WorksheetResult>();
  for (const result of [...results].sort((a, b) => b.completedAt.localeCompare(a.completedAt))) {
    const key = `${result.grade}:${result.subject}`;
    if (!latestByGradeAndSubject.has(key)) latestByGradeAndSubject.set(key, result);
  }

  return SUBJECTS.flatMap((subject) => {
    const assessed = [...latestByGradeAndSubject.values()]
      .filter((result) => result.subject === subject.id)
      .sort((a, b) => a.grade - b.grade);
    if (assessed.length < 2) return [];

    const independent = assessed.filter((result) => result.level === "independent").at(-1);
    const higherInstructional = independent
      ? assessed.find((result) => result.grade > independent.grade && result.level === "instructional")
      : assessed.find((result) => result.level === "instructional");
    const highestAssessed = assessed.at(-1);

    if (independent && higherInstructional) {
      return [`${subject.label}: independent-level practice at Class ${["I", "II", "III", "IV"][independent.grade - 1]}, with instructional-level practice at Class ${["I", "II", "III", "IV"][higherInstructional.grade - 1]}.`];
    }
    if (independent && highestAssessed && independent.grade < highestAssessed.grade) {
      return [`${subject.label}: independent-level practice recorded through Class ${["I", "II", "III", "IV"][independent.grade - 1]}; the higher recorded class was ${getResultLabel(highestAssessed.level).toLowerCase()}.`];
    }
    return [];
  });
}
