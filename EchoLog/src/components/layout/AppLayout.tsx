import { Outlet } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { mobileSidebarOpenAtom, sidebarCollapsedAtom } from "@/store/uiAtoms";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useEffect } from "react";
import { applyTheme } from "@/lib/theme";
import { themeAtom } from "@/store/themeAtom";

export function AppLayout() {
  const isMobile = useIsMobile();
  const mobileSidebarOpen = useAtomValue(mobileSidebarOpenAtom);
  const setMobileSidebarOpen = useSetAtom(mobileSidebarOpenAtom);
  const sidebarCollapsed = useAtomValue(sidebarCollapsedAtom);
  const theme = useAtomValue(themeAtom);

  // Set document title based on route
  usePageTitle();

  // Apply theme on mount and whenever it changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  // Close mobile sidebar on escape key
  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileSidebarOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mobileSidebarOpen, setMobileSidebarOpen]);

  return (
    <div className="flex min-h-screen bg-[hsl(var(--background))] transition-colors">
      {/* Skip to content */}
      <a href="#main-content" className="skip-to-content">
        Skip to content
      </a>

      {/* Mobile backdrop */}
      {isMobile && (
        <div
          className={`sidebar-backdrop ${mobileSidebarOpen ? "active" : ""}`}
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div
        className="flex flex-col flex-1 min-w-0 transition-[margin] duration-300"
        style={{
          marginLeft: isMobile ? 0 : sidebarCollapsed ? "4rem" : "15rem",
        }}
      >
        <TopBar />
        <main
          id="main-content"
          className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8"
          role="main"
          tabIndex={-1}
        >
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
