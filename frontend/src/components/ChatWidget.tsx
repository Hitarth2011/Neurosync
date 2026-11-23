/**
 * ChatWidget - floating AI chat
 * A round button fixed to the bottom-right corner opens the caregiving chat in a
 * small window. The conversation is kept while the window is closed and reopened.
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChatPage from "../pages/ChatPage";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  // Mount the chat on first open, then keep it mounted so the conversation survives closing.
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (open) setStarted(true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      {started && (
        <div
          className="chat-widget-window"
          role="dialog"
          aria-label="AI caregiving chat"
          aria-hidden={!open}
          style={{
            position: "fixed",
            right: "1.5rem",
            bottom: "6.5rem",
            width: "min(400px, calc(100vw - 2rem))",
            height: "min(600px, calc(100vh - 9rem))",
            borderRadius: "18px",
            overflow: "hidden",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
            border: "1px solid rgba(232, 220, 207, 0.9)",
            zIndex: 1200,
            transformOrigin: "bottom right",
            transition: "opacity 0.2s ease, transform 0.2s ease",
            opacity: open ? 1 : 0,
            transform: open ? "scale(1)" : "scale(0.9)",
            pointerEvents: open ? "auto" : "none",
            visibility: open ? "visible" : "hidden",
          }}
        >
          <ChatPage variant="widget" onClose={() => setOpen(false)} />
        </div>
      )}

      <motion.button
        type="button"
        className="keep-font-size"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close AI chat" : "Open AI chat"}
        aria-expanded={open}
        title={open ? "Close chat" : "Chat with NeuroSync AI"}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: "fixed",
          right: "1.5rem",
          bottom: "1.5rem",
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          border: "none",
          background: "linear-gradient(135deg, #C07A5E, #A35A42)",
          color: "white",
          fontSize: "1.75rem",
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(163, 90, 66, 0.4)",
          zIndex: 1201,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? "close" : "open"}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.15 }}
            aria-hidden="true"
            style={{ lineHeight: 1 }}
          >
            {open ? "×" : "💬"}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </>
  );
}
