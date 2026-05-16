import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/auth/LoginPage";

// Pages — lazy-imported to keep initial bundle small
import { lazy, Suspense } from "react";

const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const LogIncidentPage = lazy(() => import("@/pages/incidents/LogIncidentPage").then((m) => ({ default: m.LogIncidentPage })));
const IncidentsListPage = lazy(() => import("@/pages/incidents/IncidentsListPage").then((m) => ({ default: m.IncidentsListPage })));
const IncidentDetailPage = lazy(() => import("@/pages/incidents/IncidentDetailPage").then((m) => ({ default: m.IncidentDetailPage })));
const RCABuilderPage = lazy(() => import("@/pages/rca/RCABuilderPage").then((m) => ({ default: m.RCABuilderPage })));
const ReviewQueuePage = lazy(() => import("@/pages/review/ReviewQueuePage").then((m) => ({ default: m.ReviewQueuePage })));
const PreventiveActionsListPage = lazy(() => import("@/pages/preventive-actions/PreventiveActionsListPage").then((m) => ({ default: m.PreventiveActionsListPage })));
const PADetailPage = lazy(() => import("@/pages/preventive-actions/PADetailPage").then((m) => ({ default: m.PADetailPage })));
const CreatePAPage = lazy(() => import("@/pages/preventive-actions/CreatePAPage").then((m) => ({ default: m.CreatePAPage })));
const AuditTrailPage = lazy(() => import("@/pages/audit/AuditTrailPage").then((m) => ({ default: m.AuditTrailPage })));
const NotificationsPage = lazy(() => import("@/pages/notifications/NotificationsPage").then((m) => ({ default: m.NotificationsPage })));
const HierarchyPage = lazy(() => import("@/pages/admin/HierarchyPage").then((m) => ({ default: m.HierarchyPage })));
const UsersPage = lazy(() => import("@/pages/admin/UsersPage").then((m) => ({ default: m.UsersPage })));
const SLARulesPage = lazy(() => import("@/pages/admin/SLARulesPage").then((m) => ({ default: m.SLARulesPage })));

function PageFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
    </div>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/"
          element={
            <Suspense fallback={<PageFallback />}>
              <DashboardPage />
            </Suspense>
          }
        />
        <Route
          path="/log-incident"
          element={
            <Suspense fallback={<PageFallback />}>
              <LogIncidentPage />
            </Suspense>
          }
        />
        <Route
          path="/incidents"
          element={
            <Suspense fallback={<PageFallback />}>
              <IncidentsListPage />
            </Suspense>
          }
        />
        <Route
          path="/incidents/:id"
          element={
            <Suspense fallback={<PageFallback />}>
              <IncidentDetailPage />
            </Suspense>
          }
        />
        <Route
          path="/incidents/:id/rca"
          element={
            <Suspense fallback={<PageFallback />}>
              <RCABuilderPage />
            </Suspense>
          }
        />
        <Route
          path="/review-queue"
          element={
            <Suspense fallback={<PageFallback />}>
              <ReviewQueuePage />
            </Suspense>
          }
        />
        <Route
          path="/preventive-actions"
          element={
            <Suspense fallback={<PageFallback />}>
              <PreventiveActionsListPage />
            </Suspense>
          }
        />
        <Route
          path="/preventive-actions/:id"
          element={
            <Suspense fallback={<PageFallback />}>
              <PADetailPage />
            </Suspense>
          }
        />
        <Route
          path="/pa/create"
          element={
            <Suspense fallback={<PageFallback />}>
              <CreatePAPage />
            </Suspense>
          }
        />
        <Route
          path="/audit-trail"
          element={
            <Suspense fallback={<PageFallback />}>
              <AuditTrailPage />
            </Suspense>
          }
        />
        <Route
          path="/notifications"
          element={
            <Suspense fallback={<PageFallback />}>
              <NotificationsPage />
            </Suspense>
          }
        />
        <Route
          path="/admin/hierarchy"
          element={
            <Suspense fallback={<PageFallback />}>
              <HierarchyPage />
            </Suspense>
          }
        />
        <Route
          path="/admin/users"
          element={
            <Suspense fallback={<PageFallback />}>
              <UsersPage />
            </Suspense>
          }
        />
        <Route
          path="/admin/sla-rules"
          element={
            <Suspense fallback={<PageFallback />}>
              <SLARulesPage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
