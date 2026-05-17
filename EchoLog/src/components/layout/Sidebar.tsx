import { NavLink, useNavigate } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  FilePlus,
  List,
  ClipboardCheck,
  ShieldCheck,
  Bell,
  BookOpen,
  Building2,
  Users,
  Timer,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRoleGuard } from "@/auth/useRoleGuard";
import { currentUserAtom } from "@/store/authAtoms";
import { activeNotificationCountAtom, mobileSidebarOpenAtom, sidebarCollapsedAtom } from "@/store/uiAtoms";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useActiveDelegations } from "@/hooks/useDelegations";
import { useUserProfiles } from "@/hooks/useUserProfiles";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItem {
  label: string;
  icon: React.ElementType;
  to: string;
  adminOnly?: boolean;
  reviewOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/" },
  { label: "Log Incident", icon: FilePlus, to: "/log-incident" },
  { label: "Incidents", icon: List, to: "/incidents" },
  { label: "Review Queue", icon: ClipboardCheck, to: "/review-queue", reviewOnly: true },
  { label: "Preventive Actions", icon: ShieldCheck, to: "/preventive-actions" },
  { label: "Audit Trail", icon: BookOpen, to: "/audit-trail" },
  { label: "Notifications", icon: Bell, to: "/notifications" },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Hierarchy", icon: Building2, to: "/admin/hierarchy", adminOnly: true },
  { label: "Users", icon: Users, to: "/admin/users", adminOnly: true },
  { label: "SLA Rules", icon: Timer, to: "/admin/sla-rules", adminOnly: true },
];

export function Sidebar() {
  const { isAdmin, canReview } = useRoleGuard();
  const user = useAtomValue(currentUserAtom);
  const notifCount = useAtomValue(activeNotificationCountAtom);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const mobileSidebarOpen = useAtomValue(mobileSidebarOpenAtom);
  const setMobileSidebarOpen = useSetAtom(mobileSidebarOpenAtom);
  const sidebarCollapsed = useAtomValue(sidebarCollapsedAtom);
  const setSidebarCollapsed = useSetAtom(sidebarCollapsedAtom);

  // Delegation banner: show if this user is actively delegated by someone
  const { data: activeDelegations } = useActiveDelegations(user?.cr4c3_userprofileid);
  const { data: userProfiles } = useUserProfiles();
  const firstDelegation = activeDelegations?.[0];
  const delegatorName = firstDelegation
    ? (userProfiles?.find((u) => u.cr4c3_userprofileid === firstDelegation._cr4c3_delegator_value)?.cr4c3_fullname ?? "Someone")
    : null;
  const delegationUntil = firstDelegation?.cr4c3_enddate
    ? new Date(firstDelegation.cr4c3_enddate).toLocaleDateString()
    : null;

  const isCollapsed = !isMobile && sidebarCollapsed;

  const handleNavClick = () => {
    if (isMobile) setMobileSidebarOpen(false);
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all touch-target relative",
      isCollapsed ? "justify-center px-2" : "gap-3",
      isActive
        ? "bg-[hsl(var(--sidebar-active-bg))] text-[hsl(var(--sidebar-active-text))] border border-[hsl(var(--sidebar-active-border))]"
        : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover-bg))] hover:text-[hsl(var(--foreground))] border border-transparent"
    );

  const renderNavItem = (item: NavItem) => {
    const link = (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === "/"}
        className={linkClass}
        onClick={handleNavClick}
        aria-label={isCollapsed ? item.label : undefined}
      >
        <item.icon className="w-4 h-4 shrink-0" aria-hidden="true" />
        {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
        {!isCollapsed && item.to === "/notifications" && notifCount > 0 && (
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
            {notifCount > 9 ? "9+" : notifCount}
          </span>
        )}
        {isCollapsed && item.to === "/notifications" && notifCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center">
            {notifCount > 9 ? "9+" : notifCount}
          </span>
        )}
      </NavLink>
    );

    if (isCollapsed) {
      return (
        <TooltipProvider key={item.to} delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {item.label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return link;
  };

  const sidebarContent = (
    <aside
      className={cn(
        "flex flex-col min-h-screen bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--sidebar-border))] px-3 py-4 gap-1 transition-all duration-300 overflow-hidden",
        isMobile ? "w-[280px]" : isCollapsed ? "w-16" : "w-60"
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo + collapse controls */}
      <div className={cn("flex items-center mb-4 px-1", isCollapsed ? "justify-center" : "justify-between")}>
        <button
          onClick={() => { navigate("/"); handleNavClick(); }}
          className={cn("flex items-center gap-2.5 py-2 rounded-lg transition-colors hover:opacity-80", isCollapsed && "justify-center")}
          aria-label="Go to dashboard"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex-shrink-0">
            <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          </div>
          {!isCollapsed && (
            <div>
              <span className="font-bold text-gray-900 dark:text-gray-100 text-sm tracking-tight">ECHO LOG</span>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-none mt-0.5">v1.4</p>
            </div>
          )}
        </button>

        {/* Collapse / Close button */}
        {!isMobile && (
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              "p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
              isCollapsed && "hidden"
            )}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        )}

        {isMobile && (
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Acting delegate banner — PRD §2.3 */}
      {!isCollapsed && firstDelegation && delegatorName && (
        <div className="mb-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-2">
          <div className="flex items-start gap-2">
            <UserCheck className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">Acting for {delegatorName}</p>
              {delegationUntil && (
                <p className="text-[10px] text-amber-600 dark:text-amber-500">Until {delegationUntil}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main nav */}
      <nav className="flex flex-col gap-0.5 flex-1" aria-label="Primary">
        {NAV_ITEMS.filter((item) => {
          if (item.reviewOnly && !canReview && !isAdmin) return false;
          return true;
        }).map(renderNavItem)}

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className={cn("mt-5 mb-1", isCollapsed ? "px-1" : "px-3")}>
              {isCollapsed ? (
                <div className="border-t border-[hsl(var(--sidebar-border))]" />
              ) : (
                <p className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-semibold">
                  Admin
                </p>
              )}
            </div>
            {ADMIN_NAV_ITEMS.map(renderNavItem)}
          </>
        )}
      </nav>

      {/* Collapsed expand button at bottom */}
      {isCollapsed && !isMobile && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="p-2 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center"
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}
    </aside>
  );

  // Mobile: animated slide-out drawer
  if (isMobile) {
    return (
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-50"
          >
            {sidebarContent}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Desktop: fixed sidebar
  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-30 transition-all duration-300",
        isCollapsed ? "w-16" : "w-60"
      )}
    >
      {sidebarContent}
    </div>
  );
}
