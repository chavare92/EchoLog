/**
 * roleUtils.ts — Runtime helpers for dynamic role resolution (PRD §2.3).
 *
 * resolveL1Manager: team → process → L1Manager lookup.
 * isAssigneeForIncident / isLoggerForIncident: quick field comparisons.
 * computeAuditChecksum: SHA-256 tamper-detection for audit log entries (PRD §6.10).
 */

import { Cr4c3_teamsService } from "@/generated/services/Cr4c3_teamsService";
import { Cr4c3_processesService } from "@/generated/services/Cr4c3_processesService";
import { Cr4c3_userprofilesService } from "@/generated/services/Cr4c3_userprofilesService";
import { unwrapResult } from "@/lib/utils";
import type { Cr4c3_incidentsBase } from "@/generated/models/Cr4c3_incidentsModel";
import type { Cr4c3_preventiveactionsBase } from "@/generated/models/Cr4c3_preventiveactionsModel";

// ─── Memoisation cache (process lifetime) ───────────────────────────────────
const l1ManagerCache = new Map<string, string | null>();

/**
 * Resolves the L1 Manager user ID for a given teamId.
 * Resolution path: team → process → _cr4c3_l1manager_value on process record.
 * Falls back to the process's subdepartment manager if the process field is absent.
 * Results are cached in-memory for the lifetime of the page.
 */
export async function resolveL1Manager(teamId: string | null | undefined): Promise<string | null> {
  if (!teamId) return null;
  if (l1ManagerCache.has(teamId)) return l1ManagerCache.get(teamId)!;

  try {
    const teamResult = await Cr4c3_teamsService.get(teamId);
    const team = unwrapResult(teamResult);
    const processId = team?._cr4c3_process_value;
    if (!processId) { l1ManagerCache.set(teamId, null); return null; }

    const processResult = await Cr4c3_processesService.get(processId);
    const process = unwrapResult(processResult);

    // PRD: stored as cr4c3_l1managerid on cr4c3_processes.
    // The field name in the model follows the lookup convention: _cr4c3_l1manager_value
    const l1Id = (process as Record<string, unknown>)["_cr4c3_l1manager_value"] as string | undefined ?? null;
    l1ManagerCache.set(teamId, l1Id);
    return l1Id;
  } catch {
    l1ManagerCache.set(teamId, null);
    return null;
  }
}

/** Clears the L1 Manager cache (call after hierarchy admin changes). */
export function clearL1ManagerCache() {
  l1ManagerCache.clear();
}

/** Returns true if currentUserId is the Logger of the given incident. */
export function isLoggerForIncident(
  incident: Cr4c3_incidentsBase | null | undefined,
  currentUserId: string | null | undefined
): boolean {
  return !!currentUserId && !!incident && incident._cr4c3_loggedby_value === currentUserId;
}

/** Returns true if currentUserId is the Assignee of the given incident. */
export function isAssigneeForIncident(
  incident: Cr4c3_incidentsBase | null | undefined,
  currentUserId: string | null | undefined
): boolean {
  return !!currentUserId && !!incident && incident._cr4c3_assignee_value === currentUserId;
}

/** Returns true if currentUserId is the PA Owner of the given PA. */
export function isPAOwnerForPA(
  pa: Cr4c3_preventiveactionsBase | null | undefined,
  currentUserId: string | null | undefined
): boolean {
  return !!currentUserId && !!pa && pa._cr4c3_paowner_value === currentUserId;
}

/**
 * Computes a SHA-256 checksum for an audit log entry (PRD §6.10 tamper detection).
 * Returns a lowercase hex string.
 */
export async function computeAuditChecksum(fields: {
  entityId: string;
  action: string | number;
  actor: string;
  timestamp: string;
  oldValue?: string | null;
  newValue?: string | null;
}): Promise<string> {
  const payload = [
    fields.entityId,
    String(fields.action),
    fields.actor,
    fields.timestamp,
    fields.oldValue ?? "",
    fields.newValue ?? "",
  ].join("|");
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Fetches the full name of a user by ID.
 * Used in delegation banners and audit display.
 */
export async function getUserFullName(userId: string | null | undefined): Promise<string> {
  if (!userId) return "Unknown";
  try {
    const result = await Cr4c3_userprofilesService.get(userId, {
      select: ["cr4c3_fullname"],
    });
    return unwrapResult(result)?.cr4c3_fullname ?? "Unknown";
  } catch {
    return "Unknown";
  }
}
