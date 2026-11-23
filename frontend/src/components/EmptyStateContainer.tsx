import React from "react";
import { motion } from "framer-motion";
import { IllustrationCard } from "./IllustrationCard";

interface EmptyStateContainerProps {
  /**
   * Title of the empty state
   */
  title: string;

  /**
   * Description/message
   */
  description: string;

  /**
   * The illustration component to display
   */
  illustration: React.ReactNode;

  /**
   * Primary action button
   */
  primaryAction?: {
    label: string;
    onClick: () => void;
  };

  /**
   * Secondary action button
   */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };

  /**
   * Animation type
   */
  animationType?: "fadeIn" | "slideUp" | "scale" | "bounce" | "rotateIn" | "float";

  /**
   * Size variant
   */
  size?: "sm" | "md" | "lg";

  /**
   * Background color/gradient
   */
  backgroundColor?: string;

  /**
   * Additional message or hint
   */
  hint?: string;

  /**
   * Delay animation
   */
  delay?: number;
}

export const EmptyStateContainer: React.FC<EmptyStateContainerProps> = ({
  title,
  description,
  illustration,
  primaryAction,
  secondaryAction,
  animationType = "slideUp",
  size = "md",
  backgroundColor,
  hint,
  delay = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: "2rem",
        gap: "2rem",
      }}
    >
      {/* Illustration Card */}
      <IllustrationCard
        illustration={illustration}
        animationType={animationType}
        size={size}
        backgroundColor={backgroundColor}
        isFloating={true}
      />

      {/* Content */}
      <div style={{ textAlign: "center", maxWidth: "500px" }}>
        <h2
          style={{
            fontSize: "1.75rem",
            fontWeight: "700",
            color: "#2D3748",
            margin: "0 0 0.75rem 0",
            lineHeight: 1.2,
          }}
        >
          {title}
        </h2>

        <p
          style={{
            fontSize: "1rem",
            color: "#5A6578",
            margin: "0 0 1rem 0",
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>

        {hint && (
          <p
            style={{
              fontSize: "0.875rem",
              color: "#8B8B8B",
              margin: "1rem 0 0 0",
              fontStyle: "italic",
              lineHeight: 1.6,
            }}
          >
            💡 {hint}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      {(primaryAction || secondaryAction) && (
        <div
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            justifyContent: "center",
            marginTop: "1rem",
          }}
        >
          {primaryAction && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={primaryAction.onClick}
              style={{
                background: "linear-gradient(135deg, #1E5A96, #2E7CB8)",
                color: "white",
                border: "none",
                padding: "0.875rem 1.75rem",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "16px",
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(30, 90, 150, 0.3)",
                transition: "all 0.3s",
              }}
            >
              {primaryAction.label}
            </motion.button>
          )}

          {secondaryAction && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={secondaryAction.onClick}
              style={{
                background: "white",
                color: "#8DA28B",
                border: "2px solid #8DA28B",
                padding: "0.875rem 1.75rem",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "16px",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            >
              {secondaryAction.label}
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default EmptyStateContainer;
