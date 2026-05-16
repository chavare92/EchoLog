import { useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { Bell, LogOut, User, ChevronDown } from "lucide-react";
import { currentUserAtom } from "@/store/authAtoms";
import { activeNotificationCountAtom } from "@/store/uiAtoms";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { USER_ROLE } from "@/lib/constants";

const ROLE_LABELS: Record<number, string> = {
  [USER_ROLE.Logger]: "Logger",
  [USER_ROLE.Assignee]: "Assignee",
  [USER_ROLE.L1Manager]: "L1 Manager",
  [USER_ROLE.L2Manager]: "L2 Manager",
  [USER_ROLE.PAOwner]: "PA Owner",
  [USER_ROLE.Admin]: "Admin",
  [USER_ROLE.Member]: "Member",
};

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const user = useAtomValue(currentUserAtom);
  const notifCount = useAtomValue(activeNotificationCountAtom);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = user?.cr4c3_fullname
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "U";

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-white/8 bg-slate-950/60 backdrop-blur-sm">
      <h1 className="text-sm font-semibold text-slate-300">{title ?? "ECHO LOG"}</h1>

      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => navigate("/notifications")}
        >
          <Bell className="h-4 w-4" />
          {notifCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-slate-950" />
          )}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5 transition-colors">
              <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-300">
                {initials}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-medium text-slate-200 leading-none">{user?.cr4c3_fullname ?? "User"}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {user?.cr4c3_role !== undefined ? (ROLE_LABELS[user.cr4c3_role] ?? "Member") : "Member"}
                </p>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-500 hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium text-slate-200">{user?.cr4c3_fullname}</p>
              <p className="text-xs text-slate-400 truncate">{user?.cr4c3_email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/notifications")}>
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </DropdownMenuItem>
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-300 focus:bg-red-500/10">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
