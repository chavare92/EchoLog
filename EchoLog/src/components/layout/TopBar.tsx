import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";
import {
  Bell, LogOut, User, ChevronDown, Menu, Sun, Moon, Monitor,
  Building2, ChevronRight, Mail, Shield, MapPin,
} from "lucide-react";
import { currentUserAtom } from "@/store/authAtoms";
import { activeNotificationCountAtom, mobileSidebarOpenAtom } from "@/store/uiAtoms";
import { themeAtom, setThemeAtom } from "@/store/themeAtom";
import { cycleTheme, resolveTheme } from "@/lib/theme";
import { useAuth } from "@/auth/AuthProvider";
import { getRoleLabel, getRoleColor } from "@/lib/roleLabels";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useDepartments } from "@/hooks/useDepartments";
import { useSubdepartments } from "@/hooks/useSubdepartments";
import { useProcesses } from "@/hooks/useProcesses";
import { useTeams } from "@/hooks/useTeams";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const user = useAtomValue(currentUserAtom);
  const notifCount = useAtomValue(activeNotificationCountAtom);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const theme = useAtomValue(themeAtom);
  const setTheme = useSetAtom(setThemeAtom);
  const setMobileSidebarOpen = useSetAtom(mobileSidebarOpenAtom);

  const [profileOpen, setProfileOpen] = useState(false);

  // Org path resolution
  const { data: depts } = useDepartments();
  const { data: subdepts } = useSubdepartments(undefined, true);
  const { data: processes } = useProcesses(undefined, true);
  const { data: teams } = useTeams(undefined, true);

  const orgPath = useMemo(() => {
    if (!user) return null;
    const dept = depts?.find((d) => d.cr4c3_departmentid === user._cr4c3_department_value)?.cr4c3_name;
    const subdept = subdepts?.find((s) => s.cr4c3_subdepartmentid === user._cr4c3_subdepartment_value)?.cr4c3_name;
    const process = processes?.find((p) => p.cr4c3_processid === user._cr4c3_process_value)?.cr4c3_name;
    const team = teams?.find((t) => t.cr4c3_teamid === user._cr4c3_team_value)?.cr4c3_name;
    return { dept, subdept, process, team };
  }, [user, depts, subdepts, processes, teams]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleThemeToggle = () => {
    setTheme(cycleTheme(theme));
  };

  const resolved = resolveTheme(theme);
  const ThemeIcon = theme === "system" ? Monitor : resolved === "dark" ? Moon : Sun;
  const themeLabel = theme === "system" ? "System theme" : resolved === "dark" ? "Dark mode" : "Light mode";

  const initials = user?.cr4c3_fullname
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "U";

  const roleColorClass = getRoleColor(user?.cr4c3_role);

  return (
    <>
      <header
        className="sticky top-0 z-20 h-14 flex items-center justify-between px-4 sm:px-6 border-b border-[hsl(var(--topbar-border))] bg-[hsl(var(--topbar-bg))] backdrop-blur-sm transition-colors"
        role="banner"
      >
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-sm font-semibold text-[hsl(var(--foreground))] truncate">
            {title ?? "ECHO LOG"}
          </h1>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Theme toggle */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleThemeToggle}
                  aria-label={`Theme: ${themeLabel}. Click to change.`}
                >
                  <ThemeIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{themeLabel}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Notification bell */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-8 w-8"
                  onClick={() => navigate("/notifications")}
                  aria-label={`Notifications${notifCount > 0 ? ` (${notifCount} unread)` : ""}`}
                >
                  <Bell className={cn("h-4 w-4", notifCount > 0 && "bell-ring")} />
                  {notifCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 ring-1 ring-[hsl(var(--topbar-bg))]" />
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {notifCount > 0 ? `${notifCount} unread notifications` : "Notifications"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[hsl(var(--sidebar-hover-bg))] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm flex items-center justify-center text-xs font-bold text-white">
                {initials}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-[hsl(var(--foreground))] leading-none">
                  {user?.cr4c3_fullname ?? "User"}
                </p>
                <p className="text-[10px] text-[hsl(var(--foreground-muted))] mt-0.5">
                  {getRoleLabel(user?.cr4c3_role)}
                </p>
              </div>
              <ChevronDown className="w-3 h-3 text-[hsl(var(--foreground-muted))] hidden sm:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.cr4c3_fullname}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.cr4c3_email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/notifications")}>
                <Bell className="mr-2 h-4 w-4" />
                Notifications
                {notifCount > 0 && (
                  <span className="ml-auto text-[10px] font-bold bg-amber-500 text-white rounded-full px-1.5 py-0.5">
                    {notifCount}
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                <User className="mr-2 h-4 w-4" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 dark:text-red-400 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">User Profile</DialogTitle>
          </DialogHeader>

          {/* Avatar + name hero */}
          <div className="flex flex-col items-center gap-3 pt-2 pb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-2xl font-bold text-white shadow-md shadow-amber-500/30">
              {initials}
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">
                {user?.cr4c3_fullname ?? "—"}
              </h2>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold mt-1 ${roleColorClass}`}>
                {getRoleLabel(user?.cr4c3_role)}
              </span>
            </div>
          </div>

          <Separator className="dark:bg-gray-700" />

          {/* Contact info */}
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Email</p>
                <p className="text-gray-800 dark:text-gray-200 font-medium break-all">{user?.cr4c3_email ?? "—"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Role</p>
                <p className="text-gray-800 dark:text-gray-200 font-medium">{getRoleLabel(user?.cr4c3_role)}</p>
              </div>
            </div>
          </div>

          {/* Org Path */}
          {orgPath && (orgPath.dept || orgPath.subdept || orgPath.process || orgPath.team) && (
            <>
              <Separator className="dark:bg-gray-700" />
              <div className="py-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-950/40 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Org Path</p>
                </div>
                <div className="flex flex-wrap items-center gap-1 ml-10">
                  {[
                    { label: orgPath.dept, icon: Building2 },
                    { label: orgPath.subdept },
                    { label: orgPath.process },
                    { label: orgPath.team },
                  ]
                    .filter((item) => item.label)
                    .map((item, i, arr) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                          {item.label}
                        </span>
                        {i < arr.length - 1 && (
                          <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        )}
                      </span>
                    ))}
                </div>
              </div>
            </>
          )}

          <Separator className="dark:bg-gray-700" />

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1 dark:border-gray-700 dark:text-gray-300"
              onClick={() => setProfileOpen(false)}
            >
              Close
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => {
                setProfileOpen(false);
                handleLogout();
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
