import { USER_ROLE } from "@/lib/constants";

/** Human-readable labels for each user role. */
export const ROLE_LABELS: Record<number, string> = {
  [USER_ROLE.Logger]: "Logger",
  [USER_ROLE.Assignee]: "Assignee",
  [USER_ROLE.L1Manager]: "L1 Manager",
  [USER_ROLE.L2Manager]: "L2 Manager",
  [USER_ROLE.PAOwner]: "PA Owner",
  [USER_ROLE.Admin]: "Admin",
  [USER_ROLE.Member]: "Member",
};

/** Tailwind classes for role badge styling. */
export const ROLE_COLORS: Record<number, string> = {
  [USER_ROLE.Admin]: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  [USER_ROLE.L2Manager]: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  [USER_ROLE.L1Manager]: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  [USER_ROLE.Assignee]: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  [USER_ROLE.PAOwner]: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  [USER_ROLE.Logger]: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  [USER_ROLE.Member]: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
};

/** Get a label for a role code, with fallback. */
export function getRoleLabel(role: number | undefined | null): string {
  if (role === null || role === undefined) return "Member";
  return ROLE_LABELS[role] ?? "Member";
}
