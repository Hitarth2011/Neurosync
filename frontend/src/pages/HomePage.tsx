import React, { useState, useEffect } from "react";
import { useLang } from "../context/LangContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AuthPanel } from "./AuthPage";
import OnboardingPage from "./OnboardingPage";
import LandingBackdrop from "../components/LandingBackdrop";

/**
 * popup="onboarding": a signed-in family with no child profile yet sees the
 * onboarding form as a popup over the landing page (it can't be dismissed).
 */
export default function HomePage({ popup }: { popup?: "onboarding" }) {
  const { t } = useLang();
  const { user, activeChild } = useAuth();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const onboardingOpen = popup === "onboarding";
  const overlayOpen = authOpen || onboardingOpen;

  const handleGetStarted = () => {
    if (user?.profileType === "caregiver") {
      navigate("/caregiver");
    } else if (user && activeChild) {
      navigate("/chat");
    } else if (user) {
      navigate("/onboarding");
    } else {
      setAuthOpen(true);
    }
  };

  // While a popup is open the page behind doesn't scroll; Escape closes sign-in only.
  useEffect(() => {
    if (!overlayOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAuthOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [overlayOpen]);

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(135deg, 
        #FDB750 0%,           /* Warm yellow */
        #F59E0B 15%,           /* Golden yellow */
        #FFB6C1 30%,           /* Light pink */
        #87CEEB 50%,           /* Sky blue */
        #A8D8EA 70%,           /* Light blue-green */
        #98D8C8 85%,           /* Mint green */
        #F7DC6F 100%           /* Golden yellow */
      )`,
      backgroundAttachment: "fixed",
      backgroundSize: "cover",
      position: "relative",
      isolation: "isolate"
    }}>
      {/* Light blur (~7%) so the children's faces stay recognisable */}
      <LandingBackdrop blurPx={1.4} />

      {/* Navigation Bar */}
      <nav style={{
        backgroundColor: "rgba(255, 255, 255, 0.4)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid #E8DCCF",
        padding: "1rem 1.5rem",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
      }}>
        {/* The landing top bar carries only the quote */}
        <p style={{
          maxWidth: "1200px",
          margin: "0 auto",
          textAlign: "center",
          fontSize: "20px",
          fontWeight: "600",
          fontStyle: "italic",
          color: "#2D3748",
          lineHeight: "1.5"
        }}>
          “Neurodivergent children are <span style={{ color: "#C07A5E" }}>different</span> not less!”
        </p>
      </nav>

      {/* Main Hero: big centred title in the lower part of the screen, so the
          children's faces in the photo stay visible above it */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        style={{
          minHeight: "calc(100vh - 64px)",
          boxSizing: "border-box",
          padding: "2rem 1.5rem 6rem",
          maxWidth: "1100px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "1.75rem",
          position: "relative",
          zIndex: 10
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            // Light frosted panel keeps the text legible over the photo
            textAlign: "center",
            background: "rgba(255, 255, 255, 0.72)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            borderRadius: "20px",
            padding: "2rem 3rem",
            border: "1px solid rgba(232, 220, 207, 0.8)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)"
          }}
        >
          <h1 className="keep-font-size" style={{ fontSize: "clamp(3rem, 7vw, 5rem)", fontWeight: "800", color: "#2D3748", lineHeight: "1.1", margin: "0 0 1rem", letterSpacing: "-0.02em" }}>
            Neuro<span style={{ color: "#C07A5E" }}>Sync</span>
          </h1>
          <p style={{ fontSize: "18px", color: "#5A6578", lineHeight: "1.7", margin: 0, fontWeight: "500", maxWidth: "760px" }}>
            NeuroSync is an AI-powered care companion for families raising children with autism, ADHD,
            intellectual disability or specific learning disabilities.
          </p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          onClick={handleGetStarted}
          style={{
            background: "linear-gradient(135deg, #1E5A96, #2E7CB8)",
            color: "white",
            border: "none",
            padding: "1rem 2.75rem",
            borderRadius: "10px",
            fontWeight: "600",
            fontSize: "18px",
            cursor: "pointer",
            transition: "box-shadow 0.3s, translate 0.3s",
            boxShadow: "0 4px 15px rgba(30, 90, 150, 0.3)"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.translate = "0 -2px";
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(30, 90, 150, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.translate = "0 0";
            e.currentTarget.style.boxShadow = "0 4px 15px rgba(30, 90, 150, 0.3)";
          }}
        >
          Get Started
        </motion.button>
      </motion.section>

      {/* Disclaimer, bottom-right */}
      <p
        className="keep-font-size"
        style={{
          position: "fixed",
          right: "1.25rem",
          bottom: "1.25rem",
          zIndex: 20,
          margin: 0,
          maxWidth: "min(420px, calc(100vw - 2.5rem))",
          padding: "0.6rem 1rem",
          borderRadius: "10px",
          background: "rgba(255, 255, 255, 0.75)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          border: "1px solid rgba(232, 220, 207, 0.8)",
          fontSize: "15px",
          color: "#5A6578",
          lineHeight: 1.45
        }}
      >
        NeuroSync supports but never replaces your child's doctors and therapists.
      </p>

      {/* Sign-in / onboarding popup: blurs and dims the whole landing page behind it */}
      <AnimatePresence>
        {overlayOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={onboardingOpen ? "Set up your child's profile" : "Sign in to NeuroSync"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => !onboardingOpen && e.target === e.currentTarget && setAuthOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: "var(--z-modal-backdrop)" as any,
              backgroundColor: "rgba(45, 55, 72, 0.25)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              display: "flex",
              // "safe" keeps the top of the card reachable when it is taller than the window
              alignItems: "safe center",
              justifyContent: "center",
              padding: "1.5rem",
              overflowY: "auto"
            }}
          >
            {onboardingOpen
              ? <OnboardingPage popup />
              : <AuthPanel onClose={() => setAuthOpen(false)} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
