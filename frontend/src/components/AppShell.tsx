/**
 * AppShell - New top-bar navigation (replaces sidebar Layout)
 * Features:
 * - Top app bar with logo, language toggle, emergency button
 * - Breadcrumb navigation
 * - Back button
 * - Responsive mobile-first design
 * - No sidebar (all navigation via breadcrumbs and hubs)
 */

import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { useTheme } from '../context/ThemeContext';
import { spacing, colors, layout, shadows, fontSize, radius, transitions } from '../lib/designTokens';
import { buildBreadcrumbPath, Category } from '../lib/routes';

interface AppShellProps {
  category?: Category;
}

export default function AppShell({ category }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t, lang, setLang, supportedLanguages } = useLang();
  const { theme, setTheme, supportedThemes } = useTheme();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/auth', { replace: true });
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'This will permanently delete your NeuroSync account and all your saved data. This action cannot be undone. Continue?'
    );
    if (!confirmed) return;
    try {
      await fetch('/api/account', { method: 'DELETE', credentials: 'include' });
      navigate('/auth', { replace: true });
    } catch (error: any) {
      window.alert(error?.message || 'Account deletion failed');
    }
  };

  // Extract feature from path for breadcrumbs
  const pathParts = location.pathname.split('/').filter(Boolean);
  const feature = pathParts[pathParts.length - 1];
  const breadcrumbs = buildBreadcrumbPath(category, feature);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: colors.background.tertiary,
      }}
    >
      {/* Top App Bar */}
      <header
        style={{
          background: colors.background.primary,
          borderBottom: `1px solid ${colors.border}`,
          boxShadow: shadows.elevation[1],
          padding: `${spacing.md} ${spacing.lg}`,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: layout.maxWidth,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.lg,
          }}
        >
          {/* Logo + Home */}
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: spacing.sm,
              marginLeft: `-${spacing.sm}`,
            }}
            aria-label="Go to home"
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: radius.md,
                background: `linear-gradient(135deg, ${colors.primary[400]}, ${colors.accent.dark})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: fontSize.lg,
                fontWeight: 700,
                color: colors.text.inverse,
              }}
            >
              🧠
            </div>
            <div style={{ display: 'none', '@media (min-width: 640px)': { display: 'block' } }}>
              <div style={{ fontSize: fontSize.base, fontWeight: 700, color: colors.text.primary }}>
                NeuroSync
              </div>
              <div style={{ fontSize: fontSize.xs, color: colors.accent.main, fontWeight: 600 }}>
                Care Platform
              </div>
            </div>
          </button>

          {/* Breadcrumbs (Desktop) */}
          {breadcrumbs.length > 1 && (
            <nav
              style={{
                display: 'none',
                '@media (min-width: 768px)': { display: 'flex' },
                alignItems: 'center',
                gap: spacing.sm,
                flex: 1,
              }}
              aria-label="Breadcrumb"
            >
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.path}>
                  <button
                    onClick={() => navigate(crumb.path)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: index === breadcrumbs.length - 1 ? colors.text.primary : colors.text.secondary,
                      fontSize: fontSize.sm,
                      cursor: 'pointer',
                      fontWeight: index === breadcrumbs.length - 1 ? 600 : 400,
                      padding: `${spacing.xs} ${spacing.sm}`,
                      borderRadius: radius.sm,
                      transition: transitions.normal,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = colors.primary[50];
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                    }}
                  >
                    {crumb.label}
                  </button>
                  {index < breadcrumbs.length - 1 && (
                    <span style={{ color: colors.text.muted }}>›</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}

          {/* Right Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
            {/* Emergency Button (Always Visible) */}
            <button
              onClick={() => navigate('/child-care/emergency')}
              style={{
                background: colors.error.main,
                color: colors.text.inverse,
                border: 'none',
                padding: `${spacing.sm} ${spacing.md}`,
                borderRadius: radius.md,
                fontSize: fontSize.sm,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: spacing.xs,
                transition: transitions.fast,
                boxShadow: shadows.sm,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = colors.error.dark;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = colors.error.main;
              }}
              title="Emergency support (geolocation helplines)"
            >
              🚨 <span style={{ display: 'none', '@media (min-width: 640px)': { display: 'inline' } }}>Help</span>
            </button>

            {/* Language Menu */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                style={{
                  background: colors.background.secondary,
                  border: `1px solid ${colors.border}`,
                  padding: `${spacing.sm} ${spacing.md}`,
                  borderRadius: radius.md,
                  fontSize: fontSize.sm,
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: colors.text.secondary,
                  minWidth: '50px',
                  transition: transitions.fast,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = colors.primary[50];
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = colors.background.secondary;
                }}
              >
                🌐 {lang.toUpperCase()}
              </button>
              <AnimatePresence>
                {langMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: spacing.xs,
                      background: colors.background.primary,
                      border: `1px solid ${colors.border}`,
                      borderRadius: radius.md,
                      boxShadow: shadows.lg,
                      minWidth: '120px',
                      zIndex: 200,
                    }}
                  >
                    {supportedLanguages.map((l) => (
                      <button
                        key={l}
                        onClick={() => {
                          setLang(l);
                          setLangMenuOpen(false);
                        }}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: `${spacing.sm} ${spacing.md}`,
                          border: 'none',
                          background: l === lang ? colors.primary[50] : 'transparent',
                          cursor: 'pointer',
                          fontSize: fontSize.sm,
                          color: colors.text.primary,
                          textAlign: 'left',
                          transition: transitions.fast,
                        }}
                        onMouseEnter={(e) => {
                          if (l !== lang) {
                            (e.currentTarget as HTMLElement).style.backgroundColor = colors.background.secondary;
                          }
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor =
                            l === lang ? colors.primary[50] : 'transparent';
                        }}
                      >
                        {l === 'en' && '🇬🇧 English'}
                        {l === 'hi' && '🇮🇳 हिन्दी'}
                        {l === 'mr' && '🇮🇳 मराठी'}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Menu */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: radius.full,
                  background: `linear-gradient(135deg, ${colors.secondary_alt.light}, ${colors.secondary_alt.main})`,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: fontSize.lg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.text.inverse,
                  fontWeight: 600,
                  transition: transitions.fast,
                }}
                title={user?.displayName || 'Profile'}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                }}
              >
                👤
              </button>
              <AnimatePresence>
                {profileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: spacing.xs,
                      background: colors.background.primary,
                      border: `1px solid ${colors.border}`,
                      borderRadius: radius.md,
                      boxShadow: shadows.lg,
                      minWidth: '200px',
                      zIndex: 200,
                    }}
                  >
                    <div style={{ padding: spacing.md, borderBottom: `1px solid ${colors.border}` }}>
                      <div style={{ fontSize: fontSize.sm, fontWeight: 600, color: colors.text.primary }}>
                        {user?.displayName || 'User'}
                      </div>
                      <div style={{ fontSize: fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                        {user?.email}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        navigate('/profile');
                        setProfileMenuOpen(false);
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: `${spacing.sm} ${spacing.md}`,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: fontSize.sm,
                        color: colors.text.secondary,
                        textAlign: 'left',
                        transition: transitions.fast,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = colors.background.secondary;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      ⚙️ Profile & Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: `${spacing.sm} ${spacing.md}`,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: fontSize.sm,
                        color: colors.text.secondary,
                        textAlign: 'left',
                        transition: transitions.fast,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = colors.background.secondary;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      🚪 Sign Out
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: `${spacing.sm} ${spacing.md}`,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: fontSize.sm,
                        color: colors.error.main,
                        textAlign: 'left',
                        transition: transitions.fast,
                        borderTop: `1px solid ${colors.border}`,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = `${colors.error.light}40`;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      🗑️ Delete Account
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          padding: spacing.lg,
          maxWidth: layout.maxWidth,
          margin: '0 auto',
          width: '100%',
          backgroundColor: colors.background.tertiary,
        }}
      >
        <Outlet />
      </main>

      {/* Footer */}
      <footer
        style={{
          background: colors.background.primary,
          borderTop: `1px solid ${colors.border}`,
          padding: spacing.lg,
          marginTop: spacing.xxl,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: fontSize.xs, color: colors.text.muted, margin: 0 }}>
          © 2026 NeuroSync. Compassionate AI care for every child.
        </p>
      </footer>
    </div>
  );
}
