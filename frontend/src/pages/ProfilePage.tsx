import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { motion } from "framer-motion";
import { apiPut } from "../lib/api";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { t } = useLang();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [preferredLanguage, setPreferredLanguage] = useState(user?.preferredLanguage || "en");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingName, setEditingName] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setPreferredLanguage(user.preferredLanguage || "en");
    }
  }, [user]);

  const handleSaveDisplayName = async () => {
    if (!displayName.trim()) {
      setMessage({ type: "error", text: "Display name cannot be empty" });
      return;
    }

    setSaving(true);
    try {
      await apiPut("/profile/display-name", { displayName: displayName.trim() });
      setMessage({ type: "success", text: "Display name updated successfully" });
      setEditingName(false);
      await refreshUser();
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to update display name" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLanguage = async () => {
    setSaving(true);
    try {
      await apiPut("/profile/preferred-language", { preferredLanguage });
      setMessage({ type: "success", text: "Language preference updated" });
      await refreshUser();
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to update language" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: "2rem 1rem",
        maxWidth: "600px",
        margin: "0 auto"
      }}
    >
      <h1 style={{ fontSize: "2rem", fontWeight: "700", color: "#2D3748", marginBottom: "2rem" }}>
        Profile Settings
      </h1>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1.5rem",
            background: message.type === "success" ? "#E8EFE8" : "#FEE2E2",
            border: `1px solid ${message.type === "success" ? "#8DA28B" : "#DC2626"}`,
            color: message.type === "success" ? "#6E836C" : "#B91C1C"
          }}
        >
          {message.text}
        </motion.div>
      )}

      {/* Email Display (Read-only) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{
          background: "#FFFFFF",
          padding: "1.5rem",
          borderRadius: "12px",
          border: "1px solid #E8DCCF",
          marginBottom: "1.5rem"
        }}
      >
        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", color: "#5A6578", textTransform: "uppercase", marginBottom: "0.5rem" }}>
          Email (Login credential - Immutable)
        </label>
        <input
          type="email"
          value={user?.email || ""}
          disabled
          style={{
            width: "100%",
            padding: "0.75rem",
            borderRadius: "8px",
            border: "1px solid #E8DCCF",
            background: "#F4EFE6",
            color: "#8B8B8B",
            fontSize: "1rem",
            fontFamily: "inherit",
            cursor: "not-allowed",
          }}
        />
        <p style={{ fontSize: "0.875rem", color: "#8B8B8B", marginTop: "0.5rem", margin: "0.5rem 0 0 0" }}>
          Email is used for login authentication and cannot be changed.
        </p>
      </motion.div>

      {/* Display Name (Editable) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{
          background: "#FFFFFF",
          padding: "1.5rem",
          borderRadius: "12px",
          border: "1px solid #E8DCCF",
          marginBottom: "1.5rem"
        }}
      >
        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", color: "#5A6578", textTransform: "uppercase", marginBottom: "0.5rem" }}>
          Display Name (Customizable - Independent from Email)
        </label>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={!editingName}
            style={{
              flex: 1,
              padding: "0.75rem",
              borderRadius: "8px",
              border: "1px solid #E8DCCF",
              background: editingName ? "#FFFFFF" : "#F4EFE6",
              color: "#2D3748",
              fontSize: "1rem",
              fontFamily: "inherit",
              cursor: editingName ? "text" : "default",
            }}
            placeholder="Enter your display name"
          />
          {!editingName ? (
            <button
              onClick={() => setEditingName(true)}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "8px",
                border: "1px solid #C07A5E",
                background: "transparent",
                color: "#C07A5E",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#C07A5E";
                e.currentTarget.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#C07A5E";
              }}
            >
              Edit
            </button>
          ) : (
            <>
              <button
                onClick={handleSaveDisplayName}
                disabled={saving}
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "8px",
                  background: "#8DA28B",
                  color: "white",
                  border: "none",
                  fontWeight: "600",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                  transition: "all 0.3s"
                }}
                onMouseEnter={(e) => !saving && (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setDisplayName(user?.displayName || "");
                  setEditingName(false);
                }}
                disabled={saving}
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "8px",
                  background: "#E8DCCF",
                  color: "#5A6578",
                  border: "none",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s"
                }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
        <p style={{ fontSize: "0.875rem", color: "#8B8B8B", margin: "0.75rem 0 0 0" }}>
          Your display name is completely independent from your email address. Change it whenever you like!
        </p>
      </motion.div>

      {/* Language Preference */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{
          background: "#FFFFFF",
          padding: "1.5rem",
          borderRadius: "12px",
          border: "1px solid #E8DCCF",
          marginBottom: "1.5rem"
        }}
      >
        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", color: "#5A6578", textTransform: "uppercase", marginBottom: "0.5rem" }}>
          Preferred Language
        </label>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
          <select
            value={preferredLanguage}
            onChange={(e) => setPreferredLanguage(e.target.value)}
            style={{
              flex: 1,
              padding: "0.75rem",
              borderRadius: "8px",
              border: "1px solid #E8DCCF",
              background: "#FFFFFF",
              color: "#2D3748",
              fontSize: "1rem",
              fontFamily: "inherit",
              fontWeight: "500",
              cursor: "pointer"
            }}
          >
            <option value="en">English</option>
            <option value="hi">हिंदी (Hindi)</option>
            <option value="mr">मराठी (Marathi)</option>
          </select>
          <button
            onClick={handleSaveLanguage}
            disabled={saving || preferredLanguage === user?.preferredLanguage}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "8px",
              background: "#8DA28B",
              color: "white",
              border: "none",
              fontWeight: "600",
              cursor: (saving || preferredLanguage === user?.preferredLanguage) ? "not-allowed" : "pointer",
              opacity: (saving || preferredLanguage === user?.preferredLanguage) ? 0.6 : 1,
              transition: "all 0.3s"
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </motion.div>

      {/* Account Information */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{
          background: "#F4EFE6",
          padding: "1.5rem",
          borderRadius: "12px",
          border: "1px solid #E8DCCF"
        }}
      >
        <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#2D3748", marginBottom: "1rem" }}>
          Account Information
        </h3>
        <div style={{ display: "grid", gap: "1rem" }}>
          <div>
            <p style={{ fontSize: "0.875rem", fontWeight: "600", color: "#5A6578", textTransform: "uppercase", margin: "0 0 0.25rem 0" }}>Role</p>
            <p style={{ fontSize: "1rem", color: "#2D3748", margin: "0", textTransform: "capitalize" }}>{user?.role?.replace("_", " ")}</p>
          </div>
          <div>
            <p style={{ fontSize: "0.875rem", fontWeight: "600", color: "#5A6578", textTransform: "uppercase", margin: "0 0 0.25rem 0" }}>Profile Type</p>
            <p style={{ fontSize: "1rem", color: "#2D3748", margin: "0", textTransform: "capitalize" }}>{user?.profileType}</p>
          </div>
          <div>
            <p style={{ fontSize: "0.875rem", fontWeight: "600", color: "#5A6578", textTransform: "uppercase", margin: "0 0 0.25rem 0" }}>User ID</p>
            <p style={{ fontSize: "1rem", color: "#2D3748", margin: "0", fontFamily: "monospace" }}>{user?.id}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
