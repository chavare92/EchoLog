import { NavLink, useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
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
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRoleGuard } from "@/auth/useRoleGuard";
import { activeNotificationCountAtom } from "@/store/uiAtoms";

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
  const notifCount = useAtomValue(activeNotificationCountAtom);
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
      isActive
        ? "bg-amber-50 text-amber-700 border border-amber-200"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    );

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-white border-r border-gray-200 px-3 py-4 gap-1">
      {/* Logo */}
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2.5 px-3 py-2 mb-4"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 border border-amber-200">
          <Zap className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <span className="font-bold text-gray-900 text-sm tracking-tight">ECHO LOG</span>
          <p className="text-[10px] text-gray-400 leading-none mt-0.5">v1.4</p>
        </div>
      </button>

      {/* Main nav */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {NAV_ITEMS.filter((item) => {
          if (item.reviewOnly && !canReview && !isAdmin) return false;
          return true;
        }).map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === "/"} className={linkClass}>
            <item.icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.to === "/notifications" && notifCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </NavLink>
        ))}

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className="mt-4 mb-1 px-3">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
                Admin
              </p>
            </div>
            {ADMIN_NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass}>
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
              </NavLink>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
