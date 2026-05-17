import { useNavigate } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { Bell, LogOut, User, ChevronDown, Menu, Sun, Moon, Monitor } from "lucide-react";
import { currentUserAtom } from "@/store/authAtoms";
import { activeNotificationCountAtom, mobileSidebarOpenAtom } from "@/store/uiAtoms";
import { themeAtom, setThemeAtom } from "@/store/themeAtom";
import { cycleTheme, resolveTheme } from "@/lib/theme";
import { useAuth } from "@/auth/AuthProvider";
import { getRoleLabel } from "@/lib/roleLabels";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

  return (
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
        <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
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
                <Bell className="h-4 w-4" />
                {notifCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-[hsl(var(--topbar-bg))]" />
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
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]">
              <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/50 border border-amber-200 dark:border-amber-700 flex items-center justify-center text-xs font-bold text-amber-700 dark:text-amber-400">
                {initials}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100 leading-none">
                  {user?.cr4c3_fullname ?? "User"}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {getRoleLabel(user?.cr4c3_role)}
                </p>
              </div>
              <ChevronDown className="w-3 h-3 text-gray-400 hidden sm:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
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
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
