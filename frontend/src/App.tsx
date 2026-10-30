import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { OfflineProvider } from "./context/OfflineContext";
import { LangProvider, useLang } from "./context/LangContext";
import { ThemeProvider } from "./context/ThemeContext";
import { CategoryProvider } from "./context/CategoryContext";
import Layout from "./components/Layout";
import AppShell from "./components/AppShell";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import ChoosePage from "./pages/ChoosePage";
import WellnessHubPage from "./pages/WellnessHubPage";
import ChildCareHubPage from "./pages/ChildCareHubPage";
import CategoryHubPage from "./pages/CategoryHubPage";
import ChatPage from "./pages/ChatPage";
import BehaviorPage from "./pages/BehaviorPage";
import DietPage from "./pages/DietPage";
import TherapyPage from "./pages/TherapyPage";
import HomeschoolPage from "./pages/HomeschoolPage";
import EmergencyPage from "./pages/EmergencyPage";
import InsightsPage from "./pages/InsightsPage";
import ProgressPage from "./pages/ProgressPage";
import ReportsPage from "./pages/ReportsPage";
import VisualBoardPage from "./pages/VisualBoardPage";
import TeachingPage from "./pages/TeachingPage";
import CaregiverPage from "./pages/CaregiverPage";
import ProfilePage from "./pages/ProfilePage";
import { Category } from "./lib/routes";

function Spinner() {
  const { t } = useLang();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "var(--canvas)", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: "3px solid var(--accent-light)", borderTopColor: "var(--accent)", animation: "spin 0.7s linear infinite" }} />
      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{t("loading")}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/**
 * Renders category-specific hub with AppShell navigation
 */
function CategoryHubLayout({ category }: { category: Category }) {
  return (
    <CategoryProvider category={category}>
      <AppShell category={category} />
    </CategoryProvider>
  );
}

/**
 * Renders hub pages with AppShell
 */
function HubLayout() {
  return (
    <AppShell />
  );
}

function AppRoutes() {
  const { user, loading, activeChild } = useAuth();

  if (loading) return <Spinner />;

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // District admin goes straight to insights
  if (user.role === "district_admin") {
    return (
      <Routes>
        <Route path="/home" element={<HomePage />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/insights" replace />} />
          <Route path="insights" element={<InsightsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/insights" replace />} />
      </Routes>
    );
  }

  if (user.profileType === "caregiver") {
    return (
      <Routes>
        <Route path="/home" element={<HomePage />} />
        {/* Hub-based navigation with AppShell */}
        <Route path="/" element={<HubLayout />}>
          <Route index element={<ChoosePage />} />
          <Route path="choose" element={<ChoosePage />} />
          <Route path="wellness" element={<WellnessHubPage />} />
          <Route path="wellness/breathing" element={<CaregiverPage technique="breathing" />} />
          <Route path="wellness/grounding" element={<CaregiverPage technique="grounding" />} />
          <Route path="wellness/release" element={<CaregiverPage technique="release" />} />
          <Route path="wellness/self-compassion" element={<CaregiverPage technique="self-compassion" />} />
          <Route path="child-care" element={<ChildCareHubPage />} />
          <Route path="child-care/emergency" element={<EmergencyPage />} />
          {/* Category hubs */}
          <Route path="child-care/sld" element={<CategoryHubLayout category="sld" />}>
            <Route index element={<CategoryHubPage category="sld" />} />
          </Route>
          <Route path="child-care/id" element={<CategoryHubLayout category="id" />}>
            <Route index element={<CategoryHubPage category="id" />} />
          </Route>
          <Route path="child-care/asd-adhd" element={<CategoryHubLayout category="asd-adhd" />}>
            <Route index element={<CategoryHubPage category="asd-adhd" />} />
          </Route>
        </Route>
        {/* Legacy redirects */}
        <Route path="/caregiver" element={<Navigate to="/wellness" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Regular users need at least one child profile
  if (!activeChild) {
    return (
      <Routes>
        <Route path="/home" element={<HomePage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/home" element={<HomePage />} />
      
      {/* Hub-based navigation with AppShell */}
      <Route path="/" element={<HubLayout />}>
        {/* Entry point */}
        <Route index element={<ChoosePage />} />
        <Route path="choose" element={<ChoosePage />} />
        
        {/* Wellness hub and routes */}
        <Route path="wellness" element={<WellnessHubPage />} />
        <Route path="wellness/breathing" element={<CaregiverPage technique="breathing" />} />
        <Route path="wellness/grounding" element={<CaregiverPage technique="grounding" />} />
        <Route path="wellness/release" element={<CaregiverPage technique="release" />} />
        <Route path="wellness/self-compassion" element={<CaregiverPage technique="self-compassion" />} />
        
        {/* Child care hub */}
        <Route path="child-care" element={<ChildCareHubPage />} />
        
        {/* Category hubs with nested routes */}
        <Route path="child-care/sld" element={<CategoryHubLayout category="sld" />}>
          <Route index element={<CategoryHubPage category="sld" />} />
          <Route path="handwriting" element={<HomeschoolPage />} />
          <Route path="chatbot" element={<ChatPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="progress" element={<ProgressPage />} />
        </Route>
        
        <Route path="child-care/id" element={<CategoryHubLayout category="id" />}>
          <Route index element={<CategoryHubPage category="id" />} />
          <Route path="chatbot" element={<ChatPage />} />
          <Route path="daily-tasks" element={<TherapyPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="homeschool" element={<HomeschoolPage />} />
        </Route>
        
        <Route path="child-care/asd-adhd" element={<CategoryHubLayout category="asd-adhd" />}>
          <Route index element={<CategoryHubPage category="asd-adhd" />} />
          <Route path="chatbot" element={<ChatPage />} />
          <Route path="virtual-board" element={<VisualBoardPage />} />
          <Route path="behaviour-interpreter" element={<BehaviorPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="progress" element={<ProgressPage />} />
        </Route>
        
        {/* Emergency (always accessible, no category context) */}
        <Route path="child-care/emergency" element={<EmergencyPage />} />
        
        {/* Shared routes */}
        <Route path="profile" element={<ProfilePage />} />
        <Route path="add-child" element={<OnboardingPage addMode />} />
      </Route>
      
      {/* Legacy redirects - map old routes to new structure */}
      <Route path="/chat" element={<Navigate to="/child-care/asd-adhd/chatbot" replace />} />
      <Route path="/behavior" element={<Navigate to="/child-care/asd-adhd/behaviour-interpreter" replace />} />
      <Route path="/diet" element={<Navigate to="/child-care/asd-adhd" replace />} />
      <Route path="/therapy" element={<Navigate to="/child-care/id/daily-tasks" replace />} />
      <Route path="/teaching" element={<Navigate to="/child-care/asd-adhd" replace />} />
      <Route path="/homeschool" element={<Navigate to="/child-care/id/homeschool" replace />} />
      <Route path="/visual-board" element={<Navigate to="/child-care/asd-adhd/virtual-board" replace />} />
      <Route path="/emergency" element={<Navigate to="/child-care/emergency" replace />} />
      <Route path="/progress" element={<Navigate to="/child-care/asd-adhd/progress" replace />} />
      <Route path="/reports" element={<Navigate to="/child-care/asd-adhd/reports" replace />} />
      
      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/choose" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <LangProvider>
      <ThemeProvider>
        <AuthProvider>
          <OfflineProvider>
            <AppRoutes />
          </OfflineProvider>
        </AuthProvider>
      </ThemeProvider>
    </LangProvider>
  );
}
