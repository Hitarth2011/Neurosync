/**
 * ChildCareHubPage - Hub for selecting child care category
 * Displays SLD, ID, ASD+ADHD, and Emergency
 * Styled like the landing and Choose pages: frosted panels over the shared photo backdrop.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CATEGORIES, Category } from '../lib/routes';
import { frostedPanel } from '../components/LandingBackdrop';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 + i * 0.12, duration: 0.4 },
  }),
};

// Button colours reuse the landing page palette.
const CATEGORY_ACCENTS: Record<string, string> = {
  sld: '#D97760',
  id: '#C07A5E',
  'asd-adhd': '#1E5A96',
};

// The standout tool in each care path, shown on its card.
const CATEGORY_HIGHLIGHTS: Record<string, { icon: string; title: string; text: string }> = {
  sld: {
    icon: '✏️',
    title: 'Handwriting Interpreter',
    text: "Snap a photo of your child's writing to see what they meant and spot patterns like letter reversals.",
  },
  id: {
    icon: '🌱',
    title: 'Adaptive Teaching',
    text: 'Builds small, step-by-step lesson plans that you approve, then adjusts them as your child practises.',
  },
  'asd-adhd': {
    icon: '🎙️',
    title: 'Behaviour Interpreter',
    text: "Learns your child's own sounds and cues, so you can understand what they may be trying to say.",
  },
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
    <div style={{ padding: '1.5rem 0', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Category Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem',
        }}
      >
        {categories.map(([categoryId, categoryInfo], i) => {
          const accent = CATEGORY_ACCENTS[categoryId as string];
          const highlight = CATEGORY_HIGHLIGHTS[categoryId as string];
          return (
            <motion.div
              key={categoryId}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              style={{
                ...frostedPanel,
                background: 'rgba(255, 255, 255, 0.9)',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                transition: 'transform 0.3s, box-shadow 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 36px rgba(0,0,0,0.16)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.12)';
              }}
            >
              <div style={{ fontSize: '48px', lineHeight: 1 }}>{categoryInfo.icon}</div>
              <div>
                <h3 style={{ fontSize: '19px', fontWeight: 700, color: '#2D3748', margin: 0 }}>{categoryInfo.fullLabel}</h3>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#C07A5E', textTransform: 'uppercase', marginTop: '0.3rem' }}>
                  {categoryInfo.label}
                </div>
              </div>
              <p style={{ fontSize: '14.5px', color: '#5A6578', margin: 0, lineHeight: 1.6 }}>
                {categoryInfo.description}
              </p>

              {/* Key feature */}
              <div style={{ borderTop: '1px solid #E8DCCF', paddingTop: '1rem', display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                <span aria-hidden="true" style={{ fontSize: '20px', lineHeight: 1.4 }}>{highlight.icon}</span>
                <span style={{ fontSize: '14.5px', color: '#5A6578', lineHeight: 1.55 }}>
                  <strong style={{ color: '#2D3748' }}>{highlight.title}</strong> — {highlight.text}
                </span>
              </div>

              <button
                onClick={() => navigate(`/child-care/${categoryId}`)}
                style={{
                  marginTop: 'auto',
                  background: 'white',
                  border: `2px solid ${accent}`,
                  color: accent,
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '15px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = accent;
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.color = accent;
                }}
              >
                Explore {categoryInfo.label}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Emergency */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.4 }}
        style={{
          ...frostedPanel,
          padding: '1.5rem 2rem',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
          borderLeft: '5px solid #DC2626',
        }}
      >
        <div style={{ fontSize: '40px', lineHeight: 1 }}>🚨</div>
        <div style={{ flex: '1 1 260px' }}>
          <h3 style={{ fontSize: '19px', fontWeight: 700, color: '#B91C1C', margin: '0 0 0.3rem' }}>Emergency Support</h3>
          <p style={{ fontSize: '14.5px', color: '#5A6578', margin: 0, lineHeight: 1.6 }}>
            Immediate crisis support with location-aware helplines and AI guidance. Available anytime.
          </p>
        </div>
        <button
          onClick={() => navigate('/child-care/emergency')}
          style={{
            background: '#DC2626',
            color: 'white',
            border: 'none',
            padding: '0.875rem 1.75rem',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '15px',
            cursor: 'pointer',
            transition: 'all 0.3s',
            boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(220, 38, 38, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 38, 38, 0.3)';
          }}
        >
          Get help now
        </button>
      </motion.div>

      {/* Info */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        style={{
          ...frostedPanel,
          boxShadow: 'none',
          alignSelf: 'center',
          margin: 0,
          padding: '0.75rem 1.25rem',
          borderRadius: '999px',
          fontSize: '14px',
          color: '#5A6578',
          lineHeight: 1.6,
          textAlign: 'center',
        }}
      >
        💡 Progress, Reports and emergency Help are always in the top bar, and the AI chat is one tap away from the round chat button.
      </motion.p>
    </div>
  );
}
