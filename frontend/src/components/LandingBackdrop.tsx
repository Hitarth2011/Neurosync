import React from "react";

// Landing background image slot. Replace frontend/public/home-backdrop.jpg to
// change the photo; the page's own background shows if the file is missing.
export const LANDING_BACKDROP_URL = "/home-backdrop.jpg";
// ~62% blur intensity on a 0–20px scale.
export const LANDING_BACKDROP_BLUR_PX = 12.5;

/** Frosted-glass surface used for panels and bars that sit on the backdrop. */
export const frostedPanel: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.78)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  borderRadius: "16px",
  border: "1px solid rgba(232, 220, 207, 0.8)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
};

/** Card surface for the sign-in and onboarding popups (55% opaque). */
export const popupCard: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.55)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  border: "1px solid rgba(255, 255, 255, 0.6)",
  boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
};

/**
 * Fixed, blurred background photo. Render it inside a container with
 * `isolation: "isolate"` so it sits behind that container's content.
 * It is overscanned so the blurred edges don't fade in.
 */
export default function LandingBackdrop({ blurPx = LANDING_BACKDROP_BLUR_PX }: { blurPx?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: `-${Math.max(blurPx * 3, 4)}px`,
        backgroundImage: `url(${LANDING_BACKDROP_URL})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        filter: `blur(${blurPx}px)`,
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  );
}
