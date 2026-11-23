import { useEffect, useRef, useState } from "react";
import { apiPost } from "../lib/api";
import { Alert } from "./ui/Alert";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

type Detection = { label: string; confidence: number; boundingBoxXYXY: number[] };
type DetectionResult = {
  status: "success" | "uncertain";
  model: string;
  detections: Detection[];
  limitation: string;
};

type Props = { childId: number; sessionId: number; stepId: string };

const LIMITATION = "Object detections show visible objects only. They do not prove who acted, intent, safety, or task completion.";

export function TeachingCameraTest({ childId, sessionId, stepId }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequestRef = useRef(0);
  const [consentChecked, setConsentChecked] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [notice, setNotice] = useState("");

  const stopCamera = () => {
    cameraRequestRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setConsentChecked(false);
  };

  useEffect(() => {
    if (!cameraActive || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch(() => setError("Camera preview could not start. Check browser permissions and try again."));
  }, [cameraActive]);

  useEffect(() => () => {
    cameraRequestRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    stopCamera();
    setResult(null);
    setNotice("");
    setError("");
  }, [childId, sessionId, stepId]);

  const startCamera = async () => {
    setError(""); setNotice(""); setResult(null);
    if (!consentChecked) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access is unavailable. Use a supported browser on HTTPS or localhost.");
      return;
    }
    const requestId = ++cameraRequestRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setCameraActive(true);
    } catch (cause) {
      setError(cause instanceof Error ? `Could not start camera: ${cause.message}` : "Could not start camera. Check the browser permission and try again.");
      stopCamera();
    }
  };

  const captureFrame = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError("Camera preview is not ready yet. Please wait and try again.");
      return;
    }
    setBusy(true); setError(""); setNotice(""); setResult(null);
    try {
      const scale = Math.min(1, 640 / video.videoWidth, 480 / video.videoHeight);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not prepare a temporary still frame.");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frameDataUrl = canvas.toDataURL("image/jpeg", 0.72);
      canvas.width = 0; canvas.height = 0;
      const response = await apiPost<DetectionResult>(
        `/api/children/${childId}/teaching/sessions/${sessionId}/detect-objects`,
        { frameDataUrl },
      );
      setResult(response);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Object detection could not run.");
    } finally {
      setBusy(false);
    }
  };

  const recordDetections = async () => {
    if (!result || result.status !== "success" || result.detections.length === 0) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await apiPost(`/api/children/${childId}/teaching/sessions/${sessionId}/observations`, {
        stepId,
        source: "camera_observed",
        evidence: { detections: result.detections.map(({ label, confidence, boundingBoxXYXY }) => ({ label, confidence, boundingBoxXYXY })) },
        modelName: result.model,
        limitations: LIMITATION,
      });
      setResult(null);
      setNotice("Visible-object evidence saved. This does not mark the teaching step complete.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this object evidence.");
    } finally {
      setBusy(false);
    }
  };

  const recordUncertainty = async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      await apiPost(`/api/children/${childId}/teaching/sessions/${sessionId}/observations`, {
        stepId,
        source: "camera_uncertain",
        limitations: result?.status === "uncertain"
          ? "No supported object was confidently detected in this still frame. This is not evidence of success or failure."
          : "Caretaker was unsure whether the detected objects were visible or relevant. No object evidence was recorded.",
      });
      setResult(null);
      setNotice("Camera uncertainty saved. Please use your own observation to assess what happened.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save camera uncertainty.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ margin: "1rem 0", background: "var(--color-accent-soft)" }}>
      <h3 style={{ fontSize: "1rem", marginTop: 0 }}>Optional camera object check</h3>
      <p style={{ fontSize: "0.9rem" }}>Camera is off until you choose to start it. Preview stays in this browser; only a still frame you explicitly capture is sent for detection. No video is saved.</p>
      <Alert type="info">The detector can report visible objects only. It cannot identify a person or establish an action, intent, safety, or task completion. You review every result.</Alert>
      {error && <Alert type="error">{error}</Alert>}
      {notice && <Alert type="success">{notice}</Alert>}

      {!cameraActive ? <>
        <label style={{ display: "flex", alignItems: "flex-start", gap: "0.55rem", textTransform: "none", letterSpacing: 0, fontWeight: 500, margin: "0.8rem 0" }}>
          <input type="checkbox" checked={consentChecked} onChange={(event) => setConsentChecked(event.target.checked)} />
          I am the caretaker and I choose to turn on the camera for this check. I understand only manually captured still frames are sent, and I can stop at any time.
        </label>
        <Button onClick={startCamera} disabled={!consentChecked}>Turn on camera for this check</Button>
      </> : <>
        <video ref={videoRef} autoPlay muted playsInline aria-label="Local camera preview" style={{ display: "block", width: "100%", maxWidth: 640, maxHeight: 480, objectFit: "contain", background: "#111", borderRadius: 12, margin: "0.75rem 0" }} />
        <p style={{ fontSize: "0.85rem" }}>Live preview is local. No frame is sent until you press “Check one still frame.”</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
          <Button onClick={captureFrame} loading={busy}>Check one still frame</Button>
          <Button variant="secondary" onClick={stopCamera} disabled={busy}>Turn camera off</Button>
        </div>
      </>}

      {result && <div style={{ borderTop: "1px solid #E8DCCF", marginTop: "1rem", paddingTop: "0.75rem" }}>
        {result.status === "success" && result.detections.length > 0 ? <>
          <p><b>Possible visible objects:</b> {result.detections.map((item) => `${item.label} (${Math.round(item.confidence * 100)}%)`).join(", ")}</p>
          <p style={{ fontSize: "0.85rem" }}>Please check the preview/result yourself. Saving records detected object labels only—not task completion.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
            <Button onClick={recordDetections} loading={busy}>I reviewed these objects — save object evidence</Button>
            <Button variant="outline" onClick={recordUncertainty} disabled={busy}>Not sure — record uncertainty</Button>
          </div>
        </> : <>
          <p>No supported object was confidently detected. This does not mean the task was unsuccessful.</p>
          <Button variant="outline" onClick={recordUncertainty} loading={busy}>Record camera uncertainty</Button>
        </>}
      </div>}
    </Card>
  );
}
