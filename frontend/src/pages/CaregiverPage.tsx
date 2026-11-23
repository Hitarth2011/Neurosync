import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";

const FEELINGS = [
  { value: "overwhelmed", label: "caregiverFeelingOverwhelmed", response: "caregiverResponseOverwhelmed" },
  { value: "tired", label: "caregiverFeelingTired", response: "caregiverResponseTired" },
  { value: "anxious", label: "caregiverFeelingAnxious", response: "caregiverResponseAnxious" },
  { value: "okay", label: "caregiverFeelingOkay", response: "caregiverResponseOkay" },
] as const;

const WELLNESS_TECHNIQUES = [
  {
    id: "breathing",
    title: "caregiverTechniqueBreathingTitle",
    steps: ["caregiverTechniqueBreathingStep1", "caregiverTechniqueBreathingStep2", "caregiverTechniqueBreathingStep3"],
  },
  {
    id: "grounding",
    title: "caregiverTechniqueGroundingTitle",
    steps: ["caregiverTechniqueGroundingStep1", "caregiverTechniqueGroundingStep2", "caregiverTechniqueGroundingStep3"],
  },
  {
    id: "release",
    title: "caregiverTechniqueReleaseTitle",
    steps: ["caregiverTechniqueReleaseStep1", "caregiverTechniqueReleaseStep2", "caregiverTechniqueReleaseStep3"],
  },
  {
    id: "selfCompassion",
    title: "caregiverTechniqueSelfCompassionTitle",
    steps: ["caregiverTechniqueSelfCompassionStep1", "caregiverTechniqueSelfCompassionStep2", "caregiverTechniqueSelfCompassionStep3"],
  },
] as const;

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function CaregiverPage({ technique }: { technique?: string } = {}) {
  const { user, logout } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [feeling, setFeeling] = useState<string | null>(null);
  const [selectedTechniqueId, setSelectedTechniqueId] = useState<string>(technique || WELLNESS_TECHNIQUES[0].id);
  const [durationSeconds, setDurationSeconds] = useState(120);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isTimerStarting, setIsTimerStarting] = useState(false);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [guidanceMode, setGuidanceMode] = useState<"listen" | "read">("listen");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingStepIndex, setSpeakingStepIndex] = useState(-1);
  const speechRunRef = useRef(0);
  const speechPauseRef = useRef<number | null>(null);
  const timerStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isTimerRunning) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(timer);
          setIsTimerRunning(false);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isTimerRunning]);

  useEffect(() => () => {
    speechRunRef.current += 1;
    window.speechSynthesis?.cancel();
    if (speechPauseRef.current !== null) window.clearTimeout(speechPauseRef.current);
    if (timerStartRef.current !== null) window.clearTimeout(timerStartRef.current);
  }, []);

  const stopSpeech = () => {
    speechRunRef.current += 1;
    window.speechSynthesis?.cancel();
    if (speechPauseRef.current !== null) window.clearTimeout(speechPauseRef.current);
    speechPauseRef.current = null;
    setIsSpeaking(false);
    setSpeakingStepIndex(-1);
  };

  const speakTechnique = (technique: typeof WELLNESS_TECHNIQUES[number]) => {
    if (!("speechSynthesis" in window)) {
      setGuidanceMode("read");
      return;
    }

    speechRunRef.current += 1;
    const runId = speechRunRef.current;
    window.speechSynthesis.cancel();
    if (speechPauseRef.current !== null) window.clearTimeout(speechPauseRef.current);
    setIsSpeaking(true);

    const speechLanguage = lang === "hi" ? "hi-IN" : lang === "mr" ? "mr-IN" : "en-US";
    const speakStep = (index: number) => {
      if (runId !== speechRunRef.current) return;
      if (index >= technique.steps.length) {
        setIsSpeaking(false);
        setSpeakingStepIndex(-1);
        return;
      }

      setSpeakingStepIndex(index);
      const utterance = new SpeechSynthesisUtterance(`${index + 1}. ${t(technique.steps[index])}`);
      utterance.lang = speechLanguage;
      utterance.rate = 0.88;
      utterance.onend = () => {
        if (runId === speechRunRef.current) {
          speechPauseRef.current = window.setTimeout(() => speakStep(index + 1), 2800);
        }
      };
      utterance.onerror = () => {
        if (runId === speechRunRef.current) {
          setIsSpeaking(false);
          setSpeakingStepIndex(-1);
        }
      };
      window.speechSynthesis.speak(utterance);
    };

    const title = new SpeechSynthesisUtterance(t(technique.title));
    title.lang = speechLanguage;
    title.rate = 0.88;
    title.onend = () => speakStep(0);
    title.onerror = () => speakStep(0);
    window.speechSynthesis.speak(title);
  };

  useEffect(() => {
    if (secondsLeft !== 0) return;
    setIsTimerRunning(false);
    stopSpeech();
  }, [secondsLeft]);

  const startTechnique = (technique: typeof WELLNESS_TECHNIQUES[number]) => {
    stopSpeech();
    setSelectedTechniqueId(technique.id);
    setSecondsLeft(durationSeconds);
    setIsTimerRunning(false);
    setIsTimerStarting(true);
    setIsTimerOpen(true);
    if (guidanceMode === "listen") speakTechnique(technique);

    if (timerStartRef.current !== null) window.clearTimeout(timerStartRef.current);
    timerStartRef.current = window.setTimeout(() => {
      timerStartRef.current = null;
      setIsTimerStarting(false);
      setIsTimerRunning(true);
    }, 3500);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  const selectedFeeling = FEELINGS.find((option) => option.value === feeling);
  const selectedTechnique = WELLNESS_TECHNIQUES.find((technique) => technique.id === selectedTechniqueId)!;
  const closeTimer = () => {
    if (timerStartRef.current !== null) window.clearTimeout(timerStartRef.current);
    timerStartRef.current = null;
    setIsTimerStarting(false);
    setIsTimerRunning(false);
    setIsTimerOpen(false);
    stopSpeech();
    if (secondsLeft > 0) setSecondsLeft(durationSeconds);
  };

  return (
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #FBF8F3 0%, #FFFFFF 100%)",
      color: "#2D3748",
      padding: "1.5rem",
    }}>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
          <div>
            <div style={{ color: "#C07A5E", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {t("caregiverProfile")}
            </div>
            <h1 style={{ margin: "0.35rem 0 0", fontSize: "1.7rem" }}>
              {t("caregiverWelcome")}{user?.displayName ? `, ${user.displayName}` : ""}
            </h1>
            {user?.email && (
              <p style={{ margin: "0.35rem 0 0", color: "#6B7280", fontSize: "0.85rem" }}>
                {t("emailAddress")}: {user.email}
              </p>
            )}
          </div>
          <Button variant="secondary" onClick={handleLogout}>{t("signOut")}</Button>
        </header>

        <Card style={{ marginBottom: "1rem" }}>
          <h2 style={{ marginTop: 0 }}>{t("caregiverCheckInTitle")}</h2>
          <p style={{ color: "#6B7280" }}>{t("caregiverCheckInPrompt")}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
            {FEELINGS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={feeling === option.value}
                onClick={() => setFeeling(option.value)}
                style={{
                  padding: "0.65rem 1rem",
                  borderRadius: "999px",
                  border: `1px solid ${feeling === option.value ? "#C07A5E" : "#D8DDE4"}`,
                  background: feeling === option.value ? "#FFE5D9" : "#FFFFFF",
                  color: "#2D3748",
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                {t(option.label)}
              </button>
            ))}
          </div>
          {selectedFeeling && <p role="status" style={{ marginBottom: 0, lineHeight: 1.6 }}>{t(selectedFeeling.response)}</p>}
        </Card>

        <Card>
          <h2 style={{ marginTop: 0 }}>{t("caregiverToolsTitle")}</h2>
          <p style={{ color: "#6B7280", lineHeight: 1.6 }}>{t("caregiverToolsPrompt")}</p>

          <div role="group" aria-label={t("caregiverToolsTitle")} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.65rem" }}>
            {WELLNESS_TECHNIQUES.map((technique) => {
              const isSelected = selectedTechniqueId === technique.id;
              return (
                <button
                  key={technique.id}
                  type="button"
                  aria-pressed={isSelected}
                  disabled={isTimerOpen}
                  onClick={() => startTechnique(technique)}
                  style={{
                    minHeight: "48px",
                    padding: "0.7rem 0.85rem",
                    borderRadius: "8px",
                    border: `1px solid ${isSelected ? "#C07A5E" : "#D8DDE4"}`,
                    background: isSelected ? "#FFE5D9" : "#FFFFFF",
                    color: "#2D3748",
                    cursor: isTimerOpen ? "not-allowed" : "pointer",
                    font: "inherit",
                    textAlign: "left",
                  }}
                >
                  {t(technique.title)}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: "1.25rem", padding: "1rem", background: "#F8FAFC", borderRadius: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.85rem" }}>
              <h3 style={{ margin: 0, fontSize: "1rem" }}>{t(selectedTechnique.title)}</h3>
              <div role="group" aria-label={t("caregiverInstructionMode")} style={{ display: "inline-flex", gap: "0.25rem", padding: "0.25rem", borderRadius: "8px", background: "#E8EFE8" }}>
                <button type="button" aria-pressed={guidanceMode === "listen"} onClick={() => {
                  setGuidanceMode("listen");
                  speakTechnique(selectedTechnique);
                }} style={{ border: 0, borderRadius: "6px", padding: "0.45rem 0.7rem", background: guidanceMode === "listen" ? "#FFFFFF" : "transparent", color: "#2D3748", font: "inherit", fontSize: "0.82rem", fontWeight: 600 }}>
                  {t("caregiverListenSteps")}
                </button>
                <button type="button" aria-pressed={guidanceMode === "read"} onClick={() => {
                  stopSpeech();
                  setGuidanceMode("read");
                }} style={{ border: 0, borderRadius: "6px", padding: "0.45rem 0.7rem", background: guidanceMode === "read" ? "#FFFFFF" : "transparent", color: "#2D3748", font: "inherit", fontSize: "0.82rem", fontWeight: 600 }}>
                  {t("caregiverReadSteps")}
                </button>
              </div>
            </div>
            {guidanceMode === "read" ? (
              <ol style={{ margin: 0, paddingLeft: "1.35rem", color: "#4B5563", lineHeight: 1.9 }}>
                {selectedTechnique.steps.map((step) => <li key={step} style={{ padding: "0.25rem 0" }}>{t(step)}</li>)}
              </ol>
            ) : (
              <div aria-live="polite" style={{ minHeight: "3.5rem", color: "#4B5563", lineHeight: 1.7 }}>
                {isSpeaking && speakingStepIndex >= 0
                  ? <p style={{ margin: 0 }}>{speakingStepIndex + 1}. {t(selectedTechnique.steps[speakingStepIndex])}</p>
                  : <p style={{ margin: 0 }}>{t("caregiverListenPrompt")}</p>}
              </div>
            )}
            {guidanceMode === "listen" && isSpeaking && (
              <Button variant="ghost" onClick={stopSpeech} style={{ marginTop: "0.5rem" }}>{t("caregiverStopAudio")}</Button>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "end", gap: "1rem", marginTop: "1.25rem" }}>
            <label style={{ display: "grid", gap: "0.45rem", color: "#4B5563", fontSize: "0.9rem" }}>
              <span>{t("caregiverTimerLabel")} <strong style={{ color: "#2D3748" }}>{formatTime(durationSeconds)}</strong></span>
              <input
                type="range"
                className="caregiver-duration-slider"
                min={60}
                max={120}
                step={15}
                value={durationSeconds}
                disabled={isTimerOpen}
                aria-label={t("caregiverTimerLabel")}
                onChange={(event) => {
                  const duration = Number(event.target.value);
                  setDurationSeconds(duration);
                  setSecondsLeft(duration);
                }}
                style={{ width: "100%" }}
              />
              <span style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#6B7280" }}>
                <span>1:00</span><span>2:00</span>
              </span>
            </label>
          </div>
        </Card>
      </div>
      <Modal
        isOpen={isTimerOpen}
        onClose={closeTimer}
        title={t("caregiverTimerTitle")}
        description={t(selectedTechnique.title)}
        size="md"
        closeButton={false}
        backdropBlur
      >
        <div style={{ display: "grid", justifyItems: "center", gap: "1rem", textAlign: "center" }}>
          <div
            className={`caregiver-timer-sphere ${isTimerRunning ? "is-running" : ""}`}
            role="timer"
            aria-live="off"
            aria-label={`${formatTime(secondsLeft)} ${t("secondsRemaining")}`}
            style={{
              background: `conic-gradient(from -90deg, #C07A5E ${Math.round((secondsLeft / durationSeconds) * 100)}%, #E8DCCF 0)`,
            }}
          >
            <div className="caregiver-timer-sphere-core">
              <strong>{formatTime(secondsLeft)}</strong>
              <span>{t("secondsRemaining")}</span>
            </div>
          </div>
          <p role="status" style={{ margin: 0, color: "#4B5563" }}>
            {secondsLeft === 0
              ? t("caregiverPauseComplete")
              : isTimerStarting
                ? t("caregiverTimerStarting")
                : t("caregiverTimerPrompt")}
          </p>
          <ol style={{ width: "100%", maxHeight: "34vh", overflowY: "auto", margin: 0, paddingLeft: "1.5rem", textAlign: "left", lineHeight: 1.7 }}>
            {selectedTechnique.steps.map((step, index) => (
              <li key={step} style={{ padding: "0.25rem 0", fontWeight: guidanceMode === "listen" && speakingStepIndex === index ? 700 : 400 }}>
                {t(step)}
              </li>
            ))}
          </ol>
          <Button variant={secondsLeft === 0 ? "primary" : "secondary"} onClick={closeTimer}>
            {secondsLeft === 0 ? t("caregiverTimerFinish") : t("caregiverTimerStop")}
          </Button>
        </div>
      </Modal>
    </main>
  );
}
