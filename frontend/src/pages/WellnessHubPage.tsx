/**
 * WellnessHubPage - Hub for caregiver wellness practices
 * Lists available wellness techniques
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { spacing, colors, fontSize, radius, shadows } from '../lib/designTokens';

interface WellnessTechnique {
  id: string;
  label: string;
  description: string;
  icon: string;
  duration: string;
}

const techniques: WellnessTechnique[] = [
  {
    id: 'breathing',
    label: 'Breathing Exercises',
    description: 'Calm your nervous system with guided breathing techniques',
    icon: '🌬️',
    duration: '2-5 min',
  },
  {
    id: 'grounding',
    label: 'Grounding Techniques',
    description: 'Return to the present moment with sensory awareness',
    icon: '🪨',
    duration: '3-5 min',
  },
  {
    id: 'release',
    label: 'Release & Movement',
    description: 'Release tension through gentle movement and stretching',
    icon: '💫',
    duration: '5-10 min',
  },
  {
    id: 'self-compassion',
    label: 'Self-Compassion',
    description: 'Practice kindness and acceptance toward yourself',
    icon: '💝',
    duration: '5-10 min',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.4 },
  }),
};

export default function WellnessHubPage() {
  const navigate = useNavigate();

  React.useEffect(() => {
    document.title = 'Wellness Practices - NeuroSync';
  }, []);

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ marginBottom: spacing.xl }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
          <div style={{ fontSize: '2rem' }}>🧘</div>
          <div>
            <h1
              style={{
                fontSize: fontSize['2xl'],
                fontWeight: 700,
                color: colors.text.primary,
                margin: 0,
              }}
            >
              Caregiver Wellness
            </h1>
            <p style={{ fontSize: fontSize.sm, color: colors.text.secondary, margin: `${spacing.xs} 0 0` }}>
              Take care of yourself with guided practices
            </p>
          </div>
        </div>
      </motion.div>

      {/* Techniques Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: spacing.lg,
        }}
      >
        {techniques.map((technique, i) => (
          <motion.button
            key={technique.id}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            onClick={() => navigate(`/wellness/${technique.id}`)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              padding: spacing.lg,
              borderRadius: radius.lg,
              border: 'none',
              background: colors.background.primary,
              boxShadow: shadows.md,
              cursor: 'pointer',
              transition: 'all 300ms ease-in-out',
              textAlign: 'left',
              minHeight: '200px',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
              (e.currentTarget as HTMLElement).style.boxShadow = shadows.lg;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLElement).style.boxShadow = shadows.md;
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: spacing.md }}>{technique.icon}</div>
            <h3
              style={{
                fontSize: fontSize.base,
                fontWeight: 600,
                color: colors.text.primary,
                margin: `0 0 ${spacing.sm} 0`,
              }}
            >
              {technique.label}
            </h3>
            <p
              style={{
                fontSize: fontSize.sm,
                color: colors.text.secondary,
                margin: `0 0 ${spacing.md} 0`,
                flex: 1,
                lineHeight: 1.5,
              }}
            >
              {technique.description}
            </p>
            <div
              style={{
                fontSize: fontSize.xs,
                color: colors.text.muted,
                background: colors.background.secondary,
                padding: `${spacing.xs} ${spacing.sm}`,
                borderRadius: radius.sm,
              }}
            >
              ⏱️ {technique.duration}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        style={{
          marginTop: spacing.xxl,
          padding: spacing.lg,
          background: `linear-gradient(135deg, ${colors.secondary_alt.light}, ${colors.background.primary})`,
          borderRadius: radius.lg,
          border: `1px solid ${colors.secondary_alt.main}20`,
        }}
      >
        <p
          style={{
            fontSize: fontSize.base,
            color: colors.text.primary,
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          💡 <strong>Tip:</strong> Practice these techniques regularly to build resilience and manage caregiver stress. Even 2-3 minutes can make a difference.
        </p>
      </motion.div>
    </div>
  );
}
