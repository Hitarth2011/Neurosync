/**
 * ChildCareHubPage - Hub for selecting child care category
 * Displays SLD, ID, ASD+ADHD, and Emergency
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CATEGORIES, Category } from '../lib/routes';
import { spacing, colors, fontSize, radius, shadows } from '../lib/designTokens';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.4 },
  }),
};

export default function ChildCareHubPage() {
  const navigate = useNavigate();

  React.useEffect(() => {
    document.title = 'Child Care Categories - NeuroSync';
  }, []);

  const categories: Array<[Category, any]> = [
    ['sld', CATEGORIES.sld],
    ['id', CATEGORIES.id],
    ['asd-adhd', CATEGORIES['asd-adhd']],
  ];

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
          <div style={{ fontSize: '2rem' }}>👨‍👩‍👧‍👦</div>
          <div>
            <h1
              style={{
                fontSize: fontSize['2xl'],
                fontWeight: 700,
                color: colors.text.primary,
                margin: 0,
              }}
            >
              Child Care Support
            </h1>
            <p style={{ fontSize: fontSize.sm, color: colors.text.secondary, margin: `${spacing.xs} 0 0` }}>
              Choose the support path that best fits your child's needs
            </p>
          </div>
        </div>
      </motion.div>

      {/* Category Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: spacing.lg,
          marginBottom: spacing.xl,
        }}
      >
        {categories.map(([categoryId, categoryInfo], i) => (
          <motion.button
            key={categoryId}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            onClick={() => navigate(`/child-care/${categoryId}`)}
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
              minHeight: '220px',
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
            <div style={{ fontSize: '2.5rem', marginBottom: spacing.md }}>{categoryInfo.icon}</div>
            <h3
              style={{
                fontSize: fontSize.base,
                fontWeight: 700,
                color: colors.text.primary,
                margin: `0 0 ${spacing.xs} 0`,
              }}
            >
              {categoryInfo.fullLabel}
            </h3>
            <div
              style={{
                fontSize: fontSize.xs,
                color: colors.secondary_alt.main,
                fontWeight: 600,
                marginBottom: spacing.md,
              }}
            >
              {categoryInfo.label}
            </div>
            <p
              style={{
                fontSize: fontSize.sm,
                color: colors.text.secondary,
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {categoryInfo.description}
            </p>
          </motion.button>
        ))}
      </div>

      {/* Emergency Card (Separate) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.4 }}
      >
        <button
          onClick={() => navigate('/child-care/emergency')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            padding: spacing.lg,
            borderRadius: radius.lg,
            border: `2px solid ${colors.error.main}`,
            background: `${colors.error.main}10`,
            boxShadow: shadows.md,
            cursor: 'pointer',
            transition: 'all 300ms ease-in-out',
            textAlign: 'left',
            width: '100%',
            marginTop: spacing.lg,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
            (e.currentTarget as HTMLElement).style.boxShadow = shadows.lg;
            (e.currentTarget as HTMLElement).style.backgroundColor = `${colors.error.main}20`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLElement).style.boxShadow = shadows.md;
            (e.currentTarget as HTMLElement).style.backgroundColor = `${colors.error.main}10`;
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: spacing.md }}>🚨</div>
          <h3
            style={{
              fontSize: fontSize.base,
              fontWeight: 700,
              color: colors.error.main,
              margin: `0 0 ${spacing.xs} 0`,
            }}
          >
            Emergency Support
          </h3>
          <p
            style={{
              fontSize: fontSize.sm,
              color: colors.error.dark,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Immediate crisis support with location-aware helplines and AI guidance. Available anytime.
          </p>
        </button>
      </motion.div>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        style={{
          marginTop: spacing.xl,
          padding: spacing.lg,
          background: colors.background.secondary,
          borderRadius: radius.lg,
          border: `1px solid ${colors.border}`,
        }}
      >
        <p
          style={{
            fontSize: fontSize.sm,
            color: colors.text.secondary,
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          💡 Each category includes tailored tools for chatbot support, progress tracking, and reports. Emergency support is always accessible from the top bar.
        </p>
      </motion.div>
    </div>
  );
}
