/**
 * CategoryHubPage - Hub for category-specific features
 * Reused for SLD, ID, ASD+ADHD categories
 * Shows available features as card grid
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Category, getCategoryInfo, getCategoryLabel, ROUTES } from '../lib/routes';
import { spacing, colors, fontSize, radius, shadows } from '../lib/designTokens';

interface CategoryHubPageProps {
  category: Category;
}

interface Feature {
  id: string;
  label: string;
  description: string;
  icon: string;
}

const featureMap: Record<string, Feature> = {
  handwriting: {
    id: 'handwriting',
    label: 'Handwriting Interpreter',
    description: 'Analyze handwriting patterns and letter reversals',
    icon: '✏️',
  },
  chatbot: {
    id: 'chatbot',
    label: 'AI Chatbot',
    description: 'Get personalized caregiving advice from our AI assistant',
    icon: '💬',
  },
  'behaviour-interpreter': {
    id: 'behaviour-interpreter',
    label: 'Behavior Interpreter',
    description: 'Recognize and interpret audio cues for behavior understanding',
    icon: '🎙️',
  },
  'virtual-board': {
    id: 'virtual-board',
    label: 'Virtual Board',
    description: 'Emotional and behavioral management visual tool',
    icon: '🖼️',
  },
  'daily-tasks': {
    id: 'daily-tasks',
    label: 'Daily Tasks & Routines',
    description: 'Plan and manage daily routines and schedules',
    icon: '📋',
  },
  homeschool: {
    id: 'homeschool',
    label: 'Homeschool',
    description: 'Curriculum support and learning resources',
    icon: '📚',
  },
  progress: {
    id: 'progress',
    label: 'Progress Tracker',
    description: 'Log and visualize progress over time',
    icon: '📈',
  },
  reports: {
    id: 'reports',
    label: 'Reports',
    description: 'View aggregated reports and insights',
    icon: '📊',
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4 },
  }),
};

export default function CategoryHubPage({ category }: CategoryHubPageProps) {
  const navigate = useNavigate();
  const info = getCategoryInfo(category);
  const features = info?.features || [];

  React.useEffect(() => {
    document.title = `${getCategoryLabel(category)} - NeuroSync`;
    // Focus on main heading for accessibility
    const heading = document.querySelector('h1');
    heading?.focus();
  }, [category]);

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
          <div style={{ fontSize: '2.5rem' }}>{info?.icon}</div>
          <div>
            <h1
              style={{
                fontSize: fontSize['2xl'],
                fontWeight: 700,
                color: colors.text.primary,
                margin: 0,
                outline: 'none',
              }}
              tabIndex={-1}
            >
              {getCategoryLabel(category)}
            </h1>
            <p style={{ fontSize: fontSize.sm, color: colors.text.secondary, margin: `${spacing.xs} 0 0` }}>
              {info?.description}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Features Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: spacing.lg,
          marginBottom: spacing.xl,
        }}
      >
        {features.map((featureId, i) => {
          const feature = featureMap[featureId];
          if (!feature) return null;

          return (
            <motion.button
              key={featureId}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              onClick={() => {
                if (category) {
                  navigate(ROUTES.categoryFeature(category, featureId));
                }
              }}
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
                minHeight: '180px',
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
              <div style={{ fontSize: '2rem', marginBottom: spacing.md }}>{feature.icon}</div>
              <h3
                style={{
                  fontSize: fontSize.base,
                  fontWeight: 600,
                  color: colors.text.primary,
                  margin: `0 0 ${spacing.sm} 0`,
                }}
              >
                {feature.label}
              </h3>
              <p
                style={{
                  fontSize: fontSize.sm,
                  color: colors.text.secondary,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {feature.description}
              </p>
            </motion.button>
          );
        })}
      </div>

      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={() => navigate('/child-care')}
        style={{
          padding: `${spacing.sm} ${spacing.md}`,
          borderRadius: radius.md,
          border: `1px solid ${colors.border}`,
          background: colors.background.secondary,
          color: colors.text.secondary,
          fontSize: fontSize.sm,
          fontWeight: 600,
          cursor: 'pointer',
          transition: transitions.fast,
        }}
      >
        ← Back to Categories
      </motion.button>
    </div>
  );
}
