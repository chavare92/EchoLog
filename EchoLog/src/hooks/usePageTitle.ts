import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/log-incident": "Log Incident",
  "/incidents": "Incidents",
  "/review-queue": "Review Queue",
  "/preventive-actions": "Preventive Actions",
  "/audit-trail": "Audit Trail",
  "/notifications": "Notifications",
  "/admin/hierarchy": "Hierarchy",
  "/admin/users": "Users",
  "/admin/sla-rules": "SLA Rules",
  "/login": "Sign In",
};

/**
 * Sets document.title based on the current route.
 * Resolves dynamic routes (e.g. /incidents/:id) to their parent.
 */
export function usePageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const base = "EchoLog";
    const exact = PAGE_TITLES[pathname];

    if (exact) {
      document.title = `${exact} — ${base}`;
      return;
    }

    // Try parent path for dynamic routes
    if (pathname.startsWith("/incidents/")) {
      document.title = `Incident Detail — ${base}`;
    } else if (pathname.startsWith("/preventive-actions/")) {
      document.title = `PA Detail — ${base}`;
    } else if (pathname.startsWith("/rca/")) {
      document.title = `RCA Builder — ${base}`;
    } else {
      document.title = base;
    }
  }, [pathname]);
}
