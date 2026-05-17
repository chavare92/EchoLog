/**
 * escalation.ts — RCA auto-escalation engine (PRD §4.2).
 *
 * evaluateEscalation() is called on mount and every 5 minutes.
 * Triggers:
 *   1. L1 window expired → status → Escalated, notify L2Manager
 *   2. Rejection count ≥ 2 → same action
 *   3. Critical bypass: L2Manager may approve from PendingL1Review when L1 window expired
 */

import type { Cr4c3_rcasubmissionsBase } from "@/generated/models/Cr4c3_rcasubmissionsModel";
import type { Cr4c3_incidentsBase } from "@/generated/models/Cr4c3_incidentsModel";
import type { Cr4c3_auditlogsBase } from "@/generated/models/Cr4c3_auditlogsModel";
import type { Cr4c3_slarulesBase } from "@/generated/models/Cr4c3_slarulesModel";
import { SEVERITY, SEVERITY_TAT_HOURS, RCA_STATUS } from "@/lib/constants";
import type { SeverityKey } from "@/lib/constants";

const SEVERITY_CODE_TO_KEY: Record<number, SeverityKey> = {
  [SEVERITY.Critical]: "Critical",
  [SEVERITY.High]: "High",
  [SEVERITY.Medium]: "Medium",
};

/** Audit log action values that represent a rejection. */
const REJECTION_ACTIONS = new Set([5, 7]); // Rejected = 5, manual rejection numeric

/**
 * Calculates the L1 review window deadline from incident creation time.
 * Uses SLA rules if available; falls back to PRD defaults:
 *   Critical: 2h, High: 8h, Medium: 24h
 */
export function calculateL1Window(
  createdOn: string | Date,
  severityCode: number,
  slaRules?: Cr4c3_slarulesBase[]
): Date {
  const created = new Date(createdOn);
  const key = SEVERITY_CODE_TO_KEY[severityCode] ?? "Medium";

  // PRD §4.2 defaults (in hours)
  const L1_WINDOW_DEFAULTS: Record<SeverityKey, number> = {
    Critical: 2,
    High: 8,
    Medium: 24,
  };

  let l1Hours: number;

  if (slaRules && slaRules.length > 0) {
    const rule = slaRules.find((r) => r.cr4c3_severity === severityCode);
    if (rule?.cr4c3_tathours && rule?.cr4c3_l1reviewpercent) {
      // L1 window = TAT × (l1reviewpercent / 100)
      l1Hours = rule.cr4c3_tathours * (rule.cr4c3_l1reviewpercent / 100);
    } else if (rule?.cr4c3_tathours) {
      l1Hours = rule.cr4c3_tathours * 0.3; // default 30% of TAT
    } else {
      l1Hours = L1_WINDOW_DEFAULTS[key];
    }
  } else {
    l1Hours = L1_WINDOW_DEFAULTS[key];
  }

  return new Date(created.getTime() + l1Hours * 60 * 60 * 1000);
}

export interface EscalationResult {
  shouldEscalate: boolean;
  reason: "l1WindowExpired" | "repeatedRejection" | null;
  /** True when severity=Critical AND L1 window expired — L2 may bypass L1 */
  l2CriticalBypassEligible: boolean;
}

/**
 * Evaluates whether an RCA should be auto-escalated.
 *
 * @param rca         - The RCA submission record
 * @param incident    - The parent incident (for severity + createdOn)
 * @param auditLogs   - All audit log entries for this RCA
 * @param slaRules    - SLA rule definitions from Dataverse
 */
export function evaluateEscalation(
  rca: Cr4c3_rcasubmissionsBase,
  incident: Cr4c3_incidentsBase | null | undefined,
  auditLogs: Cr4c3_auditlogsBase[],
  slaRules?: Cr4c3_slarulesBase[]
): EscalationResult {
  const notEscalatable = {
    shouldEscalate: false,
    reason: null,
    l2CriticalBypassEligible: false,
  } satisfies EscalationResult;

  // Only escalate from reviewable statuses
  const escalatableStatuses = new Set([
    RCA_STATUS.Submitted,
    RCA_STATUS.UnderReview,
    RCA_STATUS.PendingL1Review,
  ]);
  if (!rca.cr4c3_status || !escalatableStatuses.has(rca.cr4c3_status as 564060001 | 564060002 | 564060005)) {
    return notEscalatable;
  }

  const severityCode = incident?.cr4c3_severity ?? SEVERITY.Medium;
  const createdOn = rca.createdon ?? new Date().toISOString();

  // ── Trigger 1: L1 window expired ────────────────────────────────────────
  const l1Deadline = calculateL1Window(createdOn, severityCode, slaRules);
  const l1WindowExpired = new Date() > l1Deadline;

  // ── Trigger 2: Repeated rejections (≥ 2) ────────────────────────────────
  const rejectionCount = auditLogs.filter(
    (log) =>
      log.cr4c3_entityid === rca.cr4c3_rcasubmissionid &&
      (REJECTION_ACTIONS.has(log.cr4c3_action ?? -1) ||
        (log.cr4c3_description ?? "").toLowerCase().includes("reject"))
  ).length;
  const hasRepeatedRejections = rejectionCount >= 2;

  // ── Trigger 3: Critical bypass ────────────────────────────────────────────
  const isCritical = severityCode === SEVERITY.Critical;
  const l2CriticalBypassEligible = isCritical && l1WindowExpired;

  if (l1WindowExpired || hasRepeatedRejections) {
    return {
      shouldEscalate: true,
      reason: l1WindowExpired ? "l1WindowExpired" : "repeatedRejection",
      l2CriticalBypassEligible,
    };
  }

  return { ...notEscalatable, l2CriticalBypassEligible };
}

/**
 * Returns escalation info for display (badge label, tooltip).
 */
export function escalationReasonLabel(reason: EscalationResult["reason"]): string {
  if (reason === "l1WindowExpired") return "L1 window expired";
  if (reason === "repeatedRejection") return "Repeated rejections (≥ 2)";
  return "";
}

/**
 * Returns the TAT warning threshold (75% elapsed) for a given incident.
 */
export function getTATWarningThreshold(
  createdOn: string | Date,
  severityCode: number,
  slaRules?: Cr4c3_slarulesBase[]
): Date {
  const created = new Date(createdOn);
  const key = SEVERITY_CODE_TO_KEY[severityCode] ?? "Medium";

  let tatHours = SEVERITY_TAT_HOURS[key];
  if (slaRules) {
    const rule = slaRules.find((r) => r.cr4c3_severity === severityCode);
    if (rule?.cr4c3_tathours) tatHours = rule.cr4c3_tathours;
  }

  return new Date(created.getTime() + tatHours * 0.75 * 60 * 60 * 1000);
}
