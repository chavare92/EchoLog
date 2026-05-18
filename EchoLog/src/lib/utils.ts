import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { SEVERITY_TAT_HOURS, type SeverityKey } from "@/lib/constants";

/**
 * Unwraps a Power Apps / Dataverse IOperationResult.
 * Throws a meaningful error when success === false so React Query
 * correctly treats the call as a failed query / mutation.
 */
export function unwrapResult<T>(result: {
  success: boolean;
  data: T;
  error?: Error | { message?: string } | unknown;
}): T {
  if (!result.success) {
    const err = result.error;
    if (err instanceof Error) throw err;
    if (err && typeof err === "object" && "message" in err && typeof (err as { message?: string }).message === "string") {
      throw new Error((err as { message: string }).message);
    }
    throw new Error("Dataverse operation failed. Check the connection and table permissions.");
  }
  return result.data;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateDueDate(createdAt: Date, severityCode: number): Date {
  const severityMap: Record<number, SeverityKey> = {
    564060000: "Critical",
    564060001: "High",
    564060002: "Medium",
  };
  const key = severityMap[severityCode] ?? "Medium";
  const tatMs = SEVERITY_TAT_HOURS[key] * 60 * 60 * 1000;
  return new Date(createdAt.getTime() + tatMs);
}

export function calculateL1Window(createdAt: Date, severityCode: number): Date {
  const due = calculateDueDate(createdAt, severityCode);
  const tatMs = due.getTime() - createdAt.getTime();
  return new Date(createdAt.getTime() + tatMs * 0.3);
}

export function isOverdue(dueDate: string | Date | null | undefined): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

export function getRemainingTATMs(dueDate: string | Date | null | undefined): number {
  if (!dueDate) return 0;
  return new Date(dueDate).getTime() - Date.now();
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return "Overdue";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remH = hours % 24;
    return `${days}d ${remH}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatTicketRef(ref: string | null | undefined): string {
  return ref ?? "—";
}

export function formatDateTime(dt: string | Date | null | undefined): string {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(dt: string | Date | null | undefined): string {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Hash a plaintext string with SHA-256 (Web Crypto). Returns hex string. */
export async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Return a human-readable relative date string e.g. "2 hours ago" */
export function formatRelativeDate(dt: string | Date | null | undefined): string {
  if (!dt) return "—";
  const ms = Date.now() - new Date(dt).getTime();
  if (ms < 0) return "just now";
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dt);
}

import type { Cr4c3_slarulesBase } from "@/generated/models/Cr4c3_slarulesModel";
import type { Cr4c3_incidentsBase } from "@/generated/models/Cr4c3_incidentsModel";
import type { Cr4c3_userprofilesBase } from "@/generated/models/Cr4c3_userprofilesModel";

/**
 * Calculate TAT hours for an incident considering SLA rules.
 * Falls back to SEVERITY_TAT_HOURS constants when no matching rule is active.
 */
export function calcSLATATHours(
  severityCode: number,
  slaRules?: Cr4c3_slarulesBase[]
): number {
  if (slaRules) {
    const match = slaRules.find(
      (r) => r.cr4c3_severity === severityCode && r.cr4c3_isactive
    );
    if (match?.cr4c3_tathours) return match.cr4c3_tathours;
  }
  const severityMap: Record<number, SeverityKey> = {
    564060000: "Critical",
    564060001: "High",
    564060002: "Medium",
  };
  const key = severityMap[severityCode] ?? "Medium";
  return SEVERITY_TAT_HOURS[key];
}

/**
 * Returns whether the incident is overdue considering SLA rules.
 * If the incident has a duedate, uses that; otherwise computes from severity TAT.
 */
export function calcSLAOverdue(
  incident: Pick<Cr4c3_incidentsBase, "cr4c3_duedate" | "cr4c3_createdat" | "cr4c3_severity">,
  slaRules?: Cr4c3_slarulesBase[]
): boolean {
  if (incident.cr4c3_duedate) return isOverdue(incident.cr4c3_duedate);
  if (!incident.cr4c3_createdat) return false;
  const tatHours = calcSLATATHours(incident.cr4c3_severity ?? 564060002, slaRules);
  const due = new Date(incident.cr4c3_createdat).getTime() + tatHours * 3600000;
  return due < Date.now();
}

/**
 * Returns the overdue duration string for an incident, or empty string if not overdue.
 */
export function calcOverdueDuration(
  incident: Pick<Cr4c3_incidentsBase, "cr4c3_duedate" | "cr4c3_createdat" | "cr4c3_severity">,
  slaRules?: Cr4c3_slarulesBase[]
): string {
  let dueMs: number;
  if (incident.cr4c3_duedate) {
    dueMs = new Date(incident.cr4c3_duedate).getTime();
  } else if (incident.cr4c3_createdat) {
    const tatHours = calcSLATATHours(incident.cr4c3_severity ?? 564060002, slaRules);
    dueMs = new Date(incident.cr4c3_createdat).getTime() + tatHours * 3600000;
  } else {
    return "";
  }
  const diff = Date.now() - dueMs;
  if (diff <= 0) return "";
  return formatDuration(-diff); // formatDuration handles negative as "Overdue"
}

/** localStorage key for column visibility preferences */
const COL_VIS_PREFIX = "echolog_col_vis_";

/** Persist column visibility preferences for a user */
export function persistColumnVisibility(userId: string, columns: string[]): void {
  try {
    localStorage.setItem(COL_VIS_PREFIX + userId, JSON.stringify(columns));
  } catch {
    // ignore storage errors
  }
}

/** Load column visibility preferences for a user */
export function loadColumnVisibility(userId: string): string[] | null {
  try {
    const raw = localStorage.getItem(COL_VIS_PREFIX + userId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Filter users by org hierarchy.
 * Returns users matching the given processId and/or teamId.
 * If neither provided, returns all users.
 */
export function filterUsersByOrgHierarchy(
  users: Cr4c3_userprofilesBase[],
  processId?: string,
  teamId?: string
): Cr4c3_userprofilesBase[] {
  if (!processId && !teamId) return users;
  return users.filter((u) => {
    if (processId && teamId)
      return u._cr4c3_process_value === processId && u._cr4c3_team_value === teamId;
    if (processId) return u._cr4c3_process_value === processId;
    if (teamId) return u._cr4c3_team_value === teamId;
    return true;
  });
}

