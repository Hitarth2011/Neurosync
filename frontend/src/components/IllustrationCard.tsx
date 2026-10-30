import React from "react";
import { motion } from "framer-motion";

interface IllustrationCardProps {
  /**
   * SVG illustration content or JSX element
   */
  illustration: React.ReactNode;

  /**
   * Title of the card
   */
  title?: string;

  /**
   * Description/subtitle
   */
  description?: string;

  /**
   * Animation type: 'fadeIn', 'slideUp', 'scale', 'bounce', 'float'
   */
  animationType?: "fadeIn" | "slideUp" | "scale" | "bounce" | "float" | "rotateIn";

  /**
   * Delay before animation starts (in seconds)
   */
  delay?: number;

  /**
   * Duration of animation (in seconds)
   */
  duration?: number;

  /**
   * Additional CSS styles
   */
  style?: React.CSSProperties;

  /**
   * Custom className
   */
  className?: string;

  /**
   * Size of the illustration area: 'sm', 'md', 'lg'
   */
  size?: "sm" | "md" | "lg";

  /**
   * Background color or gradient
   */
  backgroundColor?: string;

  /**
   * Whether to show the floating animation continuously
   */
  isFloating?: boolean;

  /**
   * Click handler
   */
  onClick?: () => void;

  /**
   * Whether card is clickable
   */
  isClickable?: boolean;
}

const animationVariants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.6, ease: "easeInOut" },
  },
  slideUp: {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" },
  },
  scale: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.5, ease: "easeOut" },
  },
  bounce: {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12,
      duration: 0.7,
    },
  },
  rotateIn: {
    initial: { opacity: 0, rotate: -10 },
    animate: { opacity: 1, rotate: 0 },
    transition: { duration: 0.6, ease: "easeOut" },
  },
  float: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

const floatingAnimation = {
  animate: {
    y: [0, -12, 0],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const sizeMap = {
  sm: {
    container: "120px",
    padding: "1rem",
    imageHeight: "80px",
  },
  md: {
    container: "180px",
    padding: "1.5rem",
    imageHeight: "140px",
  },
  lg: {
    container: "240px",
    padding: "2rem",
    imageHeight: "180px",
  },
};

/**
 * IllustrationCard: Reusable component for displaying illustrated content with animations
 * Perfect for empty states, loading states, or feature highlights in tabs/pages
 */
export const IllustrationCard: React.FC<IllustrationCardProps> = ({
  illustration,
  title,
  description,
  animationType = "slideUp",
  delay = 0,
  duration,
  style,
  className,
  size = "md",
  backgroundColor = "linear-gradient(135deg, #E8EFE8 0%, #F4EFE6 100%)",
  isFloating = false,
  onClick,
  isClickable = false,
}) => {
  const selectedVariant = animationVariants[animationType];
  const sizes = sizeMap[size];
  const shouldFloat = isFloating && animationType === "float";

  return (
    <motion.div
      initial={selectedVariant.initial}
      animate={
        shouldFloat
          ? {
              ...selectedVariant.animate,
              ...floatingAnimation.animate,
            }
          : selectedVariant.animate
      }
      transition={{
        ...selectedVariant.transition,
        delay,
        duration: duration || selectedVariant.transition.duration,
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1rem",
        padding: sizes.padding,
        borderRadius: "16px",
        background: backgroundColor,
        border: "1px solid rgba(192, 122, 94, 0.1)",
        boxShadow: "0 4px 12px rgba(45, 55, 72, 0.08)",
        cursor: isClickable ? "pointer" : "default",
        transition: isClickable ? "all 0.2s ease" : "none",
        ...style,
      }}
      className={className}
      onClick={onClick}
      whileHover={isClickable ? { scale: 1.02, boxShadow: "0 8px 20px rgba(45, 55, 72, 0.12)" } : {}}
    >
      {/* Illustration Container */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: sizes.container,
          height: sizes.container,
          borderRadius: "12px",
          background: "rgba(255, 255, 255, 0.6)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            maxHeight: sizes.imageHeight,
            maxWidth: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {illustration}
        </div>
      </div>

      {/* Content */}
      {(title || description) && (
        <div style={{ textAlign: "center" }}>
          {title && (
            <h3
              style={{
                margin: "0 0 0.5rem 0",
                fontSize: "1rem",
                fontWeight: 700,
                color: "#2D3748",
                lineHeight: 1.3,
              }}
            >
              {title}
            </h3>
          )}
          {description && (
            <p
              style={{
                margin: 0,
                fontSize: "0.875rem",
                color: "#5A6578",
                lineHeight: 1.6,
              }}
            >
              {description}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default IllustrationCard;
