import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { apiDelete, apiGet, apiPost, apiPut } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Alert } from "../components/ui/Alert";
import FeatureTour from "../components/FeatureTour";
import { IllustrationCard } from "../components/IllustrationCard";
import { ProgressIllustration } from "../components/Illustrations";

interface ProgressRow {
  id: number;
  child_id: number;
  metric_type: string;
  value: number;
  timestamp: string;
}

interface TeachingResult {
  id: number;
  goal: string;
  status: string;
  startedAt: string;
  steps: { id: string; title: string; instruction: string; visualCue: string }[];
  events: {
    stepId: string;
    caretakerOutcome: string | null;
    retries: number;
    recordedAt: string;
    source: string | null;
    caretakerReport: string | null;
  }[];
  systemSuggestions: { kind: string; message: string; evidence: string }[];
}

const METRIC_TYPES = [
  { key: "calm_down_interval",  label: "Calm-down Interval (min)", color: "#8DA28B" },
  { key: "routines_completed",  label: "Routines Completed",        color: "#047857" },
  { key: "meltdown_intensity",  label: "Meltdown Intensity (1-10)", color: "#DC2626" },
  { key: "focus_duration",      label: "Focus Duration (min)",      color: "#5B7B94" },
  { key: "sleep_quality",       label: "Sleep Quality (1-10)",      color: "#C07A5E" },
];

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupByMetric(rows: ProgressRow[]) {
  const map: Record<string, { date: string; value: number }[]> = {};
  for (const row of rows) {
    if (!map[row.metric_type]) map[row.metric_type] = [];
    map[row.metric_type].push({ date: formatDate(row.timestamp), value: row.value });
  }
  return map;
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  })[character] ?? character);
}

export default function ProgressPage() {
  const { activeChild } = useAuth();
  const childId = activeChild?.id;

  const [rows, setRows]         = useState<ProgressRow[]>([]);
  const [teachingResults, setTeachingResults] = useState<TeachingResult[]>([]);
  const [loading, setLoading]   = useState(true);
  const [logType, setLogType]   = useState(METRIC_TYPES[0].key);
  const [logValue, setLogValue] = useState("");
  const [saving, setSaving]     = useState(false);
  const [saveMsg, setSaveMsg]   = useState("");
  const [error, setError]       = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editMetric, setEditMetric] = useState(METRIC_TYPES[0].key);
  const [editValue, setEditValue] = useState("");
  const [mutatingId, setMutatingId] = useState<number | null>(null);

  const fetchData = async () => {
    if (!childId) return;
    try {
      const [data, results] = await Promise.all([
        apiGet<ProgressRow[]>(`/api/children/${childId}/progress`),
        apiGet<TeachingResult[]>(`/api/children/${childId}/teaching/results`),
      ]);
      setRows(data);
      setTeachingResults(results);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [childId]);

  const handleLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(logValue);
    if (isNaN(num) || !childId) return;
    setSaving(true);
    setSaveMsg("");
    try {
      await apiPost(`/api/children/${childId}/progress`, {
        metric_type: logType,
        value: num,
      });
      setSaveMsg("Logged ✓");
      setLogValue("");
      await fetchData();
    } catch (e: any) {
      setSaveMsg(`Error: ${e.message}`);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  };

  const startEditing = (row: ProgressRow) => {
    setEditingId(row.id);
    setEditMetric(row.metric_type);
    setEditValue(String(row.value));
  };

  const handleUpdate = async (entryId: number) => {
    if (!childId) return;
    const numericValue = Number(editValue);
    if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 999) return;
    setMutatingId(entryId);
    setError("");
    try {
      await apiPut(`/api/children/${childId}/progress/${entryId}`, {
        metric_type: editMetric,
        value: numericValue,
      });
      setEditingId(null);
      await fetchData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMutatingId(null);
    }
  };

  const handleDelete = async (entryId: number) => {
    if (!childId || !window.confirm("Remove this progress entry? This cannot be undone.")) return;
    setMutatingId(entryId);
    setError("");
    try {
      await apiDelete(`/api/children/${childId}/progress/${entryId}`);
      if (editingId === entryId) setEditingId(null);
      await fetchData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMutatingId(null);
    }
  };

  const handleSavePdf = () => {
    const win = window.open("", "_blank");
    if (!win) {
      setError("Allow pop-ups to print or save the progress PDF.");
      return;
    }

    const childName = activeChild?.onboarding_data?.childName ?? "Child";
    const summaries = Object.entries(groupByMetric(rows)).map(([metric, values]) => {
      const meta = METRIC_TYPES.find((item) => item.key === metric);
      const average = values.reduce((sum, item) => sum + item.value, 0) / values.length;
      return `<tr><td>${escapeHtml(meta?.label ?? metric)}</td><td>${escapeHtml(values[0]?.value)}</td><td>${average.toFixed(1)}</td><td>${values.length}</td></tr>`;
    }).join("");
    const progressRows = rows.map((row) => {
      const meta = METRIC_TYPES.find((item) => item.key === row.metric_type);
      return `<tr><td>${escapeHtml(new Date(row.timestamp).toLocaleString())}</td><td>${escapeHtml(meta?.label ?? row.metric_type)}</td><td>${escapeHtml(row.value)}</td></tr>`;
    }).join("");
    const teachingSections = teachingResults.map((result) => {
      const attempts = result.events.map((event) => {
        const step = result.steps.find((item) => item.id === event.stepId);
        const outcomeLabel = event.caretakerOutcome?.replaceAll("_", " ") ?? "Not recorded";
        return `<li><strong>${escapeHtml(step?.title ?? event.stepId)}</strong>: ${escapeHtml(outcomeLabel)}${event.caretakerReport ? ` — ${escapeHtml(event.caretakerReport)}` : ""}</li>`;
      }).join("");
      const suggestions = result.systemSuggestions.map((suggestion) => `<li>${escapeHtml(suggestion.message)} <span class="muted">(${escapeHtml(suggestion.evidence)})</span></li>`).join("");
      return `<section><h3>${escapeHtml(result.goal)}</h3><p class="muted">${escapeHtml(result.status)} · Started ${escapeHtml(new Date(result.startedAt).toLocaleString())}</p>${attempts ? `<h4>Recorded results</h4><ul>${attempts}</ul>` : "<p>No outcomes were recorded for this session.</p>"}${suggestions ? `<h4>System suggestions</h4><ul>${suggestions}</ul>` : ""}</section>`;
    }).join("");

    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(childName)} progress report</title><style>
      body{font-family:Arial,sans-serif;color:#263238;max-width:900px;margin:32px auto;padding:0 24px}h1{color:#5B7B94}h2{margin-top:28px;border-bottom:1px solid #d8dde4;padding-bottom:6px}h3{margin-bottom:4px}table{width:100%;border-collapse:collapse;margin:12px 0 24px}th,td{text-align:left;padding:8px;border-bottom:1px solid #e5e7eb}th{font-size:12px;text-transform:uppercase;color:#5a6578}section{page-break-inside:avoid}.muted{color:#6b7280;font-size:12px}@media print{body{margin:0 auto;padding:0 12px}}
      </style></head><body><h1>Progress Report — ${escapeHtml(childName)}</h1><p class="muted">Generated ${escapeHtml(new Date().toLocaleString())}</p>
      <h2>Progress Summary</h2><table><thead><tr><th>Metric</th><th>Latest</th><th>Average</th><th>Entries</th></tr></thead><tbody>${summaries || "<tr><td colspan='4'>No progress metrics recorded.</td></tr>"}</tbody></table>
      <h2>Progress Entries</h2><table><thead><tr><th>Date</th><th>Metric</th><th>Value</th></tr></thead><tbody>${progressRows || "<tr><td colspan='3'>No progress entries recorded.</td></tr>"}</tbody></table>
      <h2>Teaching Results</h2>${teachingSections || "<p>No teaching sessions recorded.</p>"}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const grouped = groupByMetric(rows);

  // Build chart data: all dates across all metrics
  const allDates = Array.from(new Set(rows.map(r => formatDate(r.timestamp)))).slice(-14);

  const chartData = allDates.map(date => {
    const point: Record<string, string | number> = { date };
    for (const m of METRIC_TYPES) {
      const match = grouped[m.key]?.find(r => r.date === date);
      if (match) point[m.key] = match.value;
    }
    return point;
  });

  const activeMetrics = METRIC_TYPES.filter(m => grouped[m.key]?.length > 0);

  return (
    <div style={{ padding: "1.5rem", maxWidth: "860px", margin: "0 auto", backgroundColor: "#FBF8F3", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
          <span style={{ fontSize: "1.5rem" }}>📈</span>
          <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#2D3748" }}>Progress Tracker</h1>
        </div>
        <p style={{ margin: 0, fontSize: "0.83rem", color: "#6B7280" }}>
          Log behavioral metrics and visualize trends over time
          {activeChild?.onboarding_data?.childName && ` for ${activeChild.onboarding_data.childName}`}.
        </p>
      </div>

      <FeatureTour
        featureKey="progress"
        icon="📈"
        title="Progress Tracker"
        summary="Log daily behavioral observations and see trends over time as charts. Handwriting pattern data from the Homeschooling module also appears here automatically."
        tips={[
          "Log entries daily for the best trend picture — even a 30-second check-in helps.",
          "Calm-down Interval: how many minutes it takes your child to de-escalate.",
          "Meltdown Intensity: rate 1–10 to track whether episodes are becoming milder.",
          "Focus Duration: log how long the child sustained attention during a task.",
          "Handwriting reversal counts are added automatically when you use the Handwriting Interpreter.",
          "Share the Progress Tracker data with a therapist or school to back up your observations.",
        ]}
        accentColor="#5B7B94"
      />

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.75rem" }}>
        <Button variant="secondary" onClick={handleSavePdf}>Save Progress PDF</Button>
      </div>

      {/* Log new entry */}
      <Card style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 600 }}>Log Today's Entry</h2>
        <form onSubmit={handleLog} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem", color: "#1F2937" }}>Metric</label>
            <select
              value={logType}
              onChange={e => setLogType(e.target.value)}
              style={{
                width: "100%",
                padding: "0.65rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid #D1D5DB",
                backgroundColor: "#FFFFFF",
                color: "#1F2937",
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              {METRIC_TYPES.map(m => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: "0 1 140px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem", color: "#1F2937" }}>Value</label>
            <input
              type="number"
              min={0}
              max={999}
              step={0.5}
              value={logValue}
              onChange={e => setLogValue(e.target.value)}
              placeholder="e.g. 15"
              required
              style={{
                width: "100%",
                padding: "0.65rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid #D1D5DB",
                backgroundColor: "#FFFFFF",
                color: "#1F2937",
                fontSize: "0.9rem",
              }}
            />
          </div>
          <Button
            variant="primary"
            type="submit"
            disabled={saving || !logValue || !childId}
            style={{ flexShrink: 0, minWidth: "120px" }}
          >
            {saving ? "Saving…" : "Log Entry"}
          </Button>
          {saveMsg && (
            <span style={{
              fontSize: "0.82rem",
              fontWeight: 600,
              color: saveMsg.startsWith("Error") ? "#DC2626" : "#047857",
              alignSelf: "center",
            }}>
              {saveMsg}
            </span>
          )}
        </form>
      </Card>

      {error && (
        <div style={{ marginBottom: "1rem" }}>
          <Alert type="error" icon="❌">{error}</Alert>
        </div>
      )}

      {loading ? (
        <Card style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", padding: "2.5rem" }}>
          <div style={{ width: "20px", height: "20px", border: "2px solid #FFE5D9", borderTopColor: "#C07A5E", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          <span style={{ fontSize: "0.875rem", color: "#6B7280" }}>Loading progress data…</span>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </Card>
      ) : rows.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2rem",
            minHeight: "50vh",
            justifyContent: "center",
          }}
        >
          <IllustrationCard
            illustration={<ProgressIllustration />}
            title="No Progress Entries Yet"
            description="Start logging your observations above to track trends and celebrate progress over time."
            animationType="slideUp"
            size="md"
            isFloating={true}
            backgroundColor="linear-gradient(135deg, #E8EFE8 0%, #F4EFE6 100%)"
            hint="Log daily entries to see meaningful trends emerge"
          />
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {/* Trend chart */}
          {activeMetrics.length > 0 && chartData.length > 0 && (
            <Card style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 600 }}>14-Day Trends</h2>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData} margin={{ left: -10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: "0.8rem", borderRadius: "8px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }} />
                  <Legend wrapperStyle={{ fontSize: "0.78rem" }} />
                  {activeMetrics.map(m => (
                    <Line
                      key={m.key}
                      type="monotone"
                      dataKey={m.key}
                      name={m.label}
                      stroke={m.color}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            {activeMetrics.map(m => {
              const vals = grouped[m.key] ?? [];
              const latest = vals[0]?.value;
              const avg = vals.length
                ? (vals.reduce((s, r) => s + r.value, 0) / vals.length).toFixed(1)
                : "—";
              return (
                <motion.div
                  key={m.key}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>
                      {m.label}
                    </div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 700, color: m.color, lineHeight: 1.2 }}>
                      {latest ?? "—"}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#6B7280", marginTop: "0.25rem" }}>
                      Latest · Avg: {avg} · {vals.length} entries
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Recent log table */}
          <Card>
            <h2 style={{ margin: "0 0 0.875rem", fontSize: "0.95rem", fontWeight: 600 }}>Recent Entries</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #E5E7EB" }}>
                    {["Date", "Metric", "Value", "Actions"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "0.4rem 0.75rem", fontWeight: 600, color: "#6B7280", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const meta = METRIC_TYPES.find(m => m.key === row.metric_type);
                    const isEditing = editingId === row.id;
                    return (
                      <tr key={row.id} style={{ borderBottom: "1px solid #E5E7EB", backgroundColor: i % 2 === 0 ? "transparent" : "#F9FAFB" }}>
                        <td style={{ padding: "0.5rem 0.75rem", color: "#6B7280" }}>
                          {new Date(row.timestamp).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem" }}>
                          {isEditing ? (
                            <select aria-label="Edit metric" value={editMetric} onChange={(event) => setEditMetric(event.target.value)} style={{ maxWidth: "100%", padding: "0.4rem" }}>
                              {!METRIC_TYPES.some((item) => item.key === editMetric) && <option value={editMetric}>{editMetric}</option>}
                              {METRIC_TYPES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                            </select>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: meta?.color ?? "#6B7280", flexShrink: 0 }} />
                              {meta?.label ?? row.metric_type}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>
                          {isEditing ? <input aria-label="Edit progress value" type="number" min={0} max={999} step={0.5} value={editValue} onChange={(event) => setEditValue(event.target.value)} style={{ width: "100px", padding: "0.4rem" }} /> : row.value}
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem", whiteSpace: "nowrap" }}>
                          {isEditing ? (
                            <>
                              <button type="button" disabled={mutatingId === row.id} onClick={() => handleUpdate(row.id)} style={{ marginRight: "0.5rem" }}>{mutatingId === row.id ? "Saving…" : "Save"}</button>
                              <button type="button" disabled={mutatingId === row.id} onClick={() => setEditingId(null)}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <button type="button" disabled={mutatingId === row.id} onClick={() => startEditing(row)} style={{ marginRight: "0.5rem" }}>Edit</button>
                              <button type="button" disabled={mutatingId === row.id} onClick={() => handleDelete(row.id)}>Remove</button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {rows.length >= 200 && <p style={{ margin: "0.75rem 0 0", fontSize: "0.75rem", color: "#6B7280" }}>Showing the 200 most recent entries.</p>}
          </Card>
        </motion.div>
      )}

      {!loading && teachingResults.length > 0 && (
        <Card style={{ marginTop: "1.5rem" }}>
          <h2 style={{ margin: "0 0 0.35rem", fontSize: "0.95rem", fontWeight: 600 }}>Teaching Results</h2>
          <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "#6B7280" }}>Teaching outcomes and system suggestions are shown separately from manually logged metrics.</p>
          <div style={{ display: "grid", gap: "0.9rem" }}>
            {teachingResults.map((result) => (
              <section key={result.id} style={{ padding: "0.85rem", borderLeft: "3px solid #5B7B94", background: "#F8FAFC" }}>
                <h3 style={{ margin: "0 0 0.2rem", fontSize: "0.9rem" }}>{result.goal}</h3>
                <p style={{ margin: "0 0 0.6rem", fontSize: "0.75rem", color: "#6B7280" }}>{result.status.replaceAll("_", " ")} · {new Date(result.startedAt).toLocaleString()}</p>
                {result.events.length > 0 ? (
                  <ul style={{ margin: "0 0 0.65rem", paddingLeft: "1.25rem", fontSize: "0.82rem", lineHeight: 1.6 }}>
                    {result.events.map((event, index) => {
                      const step = result.steps.find((item) => item.id === event.stepId);
                      return <li key={`${event.stepId}-${event.recordedAt}-${index}`}><strong>{step?.title ?? event.stepId}:</strong> {(event.caretakerOutcome ?? "not recorded").replaceAll("_", " ")}{event.caretakerReport ? ` · ${event.caretakerReport}` : ""}</li>;
                    })}
                  </ul>
                ) : <p style={{ margin: "0 0 0.6rem", fontSize: "0.82rem" }}>No outcomes recorded yet.</p>}
                {result.systemSuggestions.length > 0 && <div style={{ fontSize: "0.82rem" }}><strong>System suggestions</strong><ul style={{ margin: "0.25rem 0 0", paddingLeft: "1.25rem" }}>{result.systemSuggestions.map((suggestion) => <li key={suggestion.kind}>{suggestion.message} <span style={{ color: "#6B7280" }}>({suggestion.evidence})</span></li>)}</ul></div>}
              </section>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
