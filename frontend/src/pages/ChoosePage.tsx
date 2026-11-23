/**
 * ChoosePage - Entry point after authentication
 * Displays two main paths: Caregiver Wellness OR Child Care
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { spacing, colors, fontSize, radius, shadows, layout } from '../lib/designTokens';
import { frostedPanel } from '../components/LandingBackdrop';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.2, duration: 0.5 },
  }),
};

export default function ChoosePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  React.useEffect(() => {
    document.title = 'Choose Your Path - NeuroSync';
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.lg,
      }}
    >
      {/* Frosted panel keeps the content legible over the shared background photo */}
      <div style={{ ...frostedPanel, maxWidth: '900px', width: '100%', padding: spacing.xxl }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: spacing.xxl }}
        >
          <h1
            style={{
              fontSize: '2.5rem',
              fontWeight: 700,
              color: colors.text.primary,
              margin: `0 0 ${spacing.md} 0`,
              lineHeight: 1.2,
            }}
          >
            Welcome back, {user?.displayName || 'Friend'}
          </h1>
          <p
            style={{
              fontSize: fontSize.lg,
              color: colors.text.secondary,
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Choose your path to get started
          </p>
        </motion.div>

        {/* Choice Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: spacing.xl,
            marginBottom: spacing.xxl,
          }}
        >
          {/* Caregiver Wellness */}
          {user?.profileType === 'caregiver' && (
            <motion.div
              custom={0}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              <button
                onClick={() => navigate('/wellness')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: spacing.xl,
                  borderRadius: radius.lg,
                  border: 'none',
                  background: colors.background.primary,
                  boxShadow: shadows.lg,
                  cursor: 'pointer',
                  transition: 'all 300ms ease-in-out',
                  height: '280px',
                  width: '100%',
                  textAlign: 'center',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-8px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = shadows['2xl'];
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = shadows.lg;
                }}
              >
                <div style={{ fontSize: '4rem', marginBottom: spacing.lg }}>🧘</div>
                <h2
                  style={{
                    fontSize: fontSize['2xl'],
                    fontWeight: 700,
                    color: colors.text.primary,
                    margin: `0 0 ${spacing.md} 0`,
                  }}
                >
                  Caregiver Wellness
                </h2>
                <p
                  style={{
                    fontSize: fontSize.base,
                    color: colors.text.secondary,
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  Mindfulness, breathing, and self-care practices
                </p>
              </button>
            </motion.div>
          )}

          {/* Child Care */}
          {(user?.profileType === 'family' || user?.profileType === 'caregiver') && (
            <motion.div
              custom={user?.profileType === 'caregiver' ? 1 : 0}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              <button
                onClick={() => navigate('/child-care')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: spacing.lg,
                  padding: '2rem 2.25rem',
                  borderRadius: '16px',
                  border: '1px solid rgba(232, 220, 207, 0.8)',
                  background: 'rgba(255, 255, 255, 0.82)',
                  boxShadow: shadows.lg,
                  cursor: 'pointer',
                  transition: 'all 300ms ease-in-out',
                  minHeight: '180px',
                  width: '100%',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-8px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = shadows['2xl'];
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = shadows.lg;
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: '2.5rem',
                      fontWeight: 700,
                      color: '#2D3748',
                      lineHeight: 1.2,
                      margin: '0 0 0.75rem',
                    }}
                  >
                    Child Care <span style={{ color: '#C07A5E' }}>Support</span>
                  </h2>
                  <p
                    style={{
                      fontSize: '17px',
                      color: '#5A6578',
                      margin: 0,
                      lineHeight: 1.7,
                      fontWeight: 500,
                    }}
                  >
                    Choose the support path that best fits your child's needs
                  </p>
                </div>
                <span aria-hidden="true" style={{ fontSize: '2rem', color: '#C07A5E', flexShrink: 0 }}>→</span>
              </button>
            </motion.div>
          )}
        </div>

        {/* Footer Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          style={{
            textAlign: 'center',
            fontSize: fontSize.sm,
            color: colors.text.muted,
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          You can switch between these paths anytime from the home menu
        </motion.p>
      </div>
    </div>
  );
}
