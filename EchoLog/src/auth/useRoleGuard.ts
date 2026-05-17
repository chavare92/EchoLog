/**
 * useRoleGuard — Dynamic + static role resolution per PRD §2.3.
 *
 * Static roles (Admin, Member) are read from cr4c3_userprofiles.cr4c3_role.
 * Dynamic roles (Logger, Assignee, L1Manager, PAOwner) are resolved from
 * entity context when provided, and from active delegations.
 *
 * Usage:
 *   const guard = useRoleGuard();           // static-only checks
 *   const guard = useRoleGuard({ incident }); // context-aware checks
 */

import { useAtomValue } from "jotai";
import { useMemo } from "react";
import { currentUserAtom } from "@/store/authAtoms";
import { USER_ROLE } from "@/lib/constants";
import type { Cr4c3_incidentsBase } from "@/generated/models/Cr4c3_incidentsModel";
import type { Cr4c3_preventiveactionsBase } from "@/generated/models/Cr4c3_preventiveactionsModel";
import type { Cr4c3_rcasubmissionsBase } from "@/generated/models/Cr4c3_rcasubmissionsModel";
import type { Cr4c3_delegationsBase } from "@/generated/models/Cr4c3_delegationsModel";

export interface RoleEntityContext {
  incident?: Cr4c3_incidentsBase | null;
  rca?: Cr4c3_rcasubmissionsBase | null;
  pa?: Cr4c3_preventiveactionsBase | null;
  /**
   * Active delegations for the current user (fetched by useDelegations hook
   * and passed down from the page that needs delegation-aware resolution).
   */
  activeDelegations?: Cr4c3_delegationsBase[];
}

export interface RoleGuardResult {
  // ── Static roles ──────────────────────────────────────────────────────────
  isAdmin: boolean;
  isMember: boolean;

  // ── Dynamic roles (context-sensitive when entityContext provided) ─────────
  isLogger: boolean;
  isAssignee: boolean;
  isL1Manager: boolean;
  isL2Manager: boolean;
  isPAOwner: boolean;

  // ── Delegation ────────────────────────────────────────────────────────────
  isActingDelegate: boolean;

  // ── Convenience composites ────────────────────────────────────────────────
  canReview: boolean;         // L1Manager | L2Manager | Admin
  canCreatePA: boolean;       // Assignee | L1Manager | L2Manager | Admin
  canManageAdmin: boolean;    // Admin only
  canCancelIncident: boolean; // Admin only
  canReopenIncident: boolean; // Admin | L2Manager
  canApproveL1: boolean;      // L1Manager | L2Manager | Admin
  canApproveL2: boolean;      // L2Manager | Admin
}

export function useRoleGuard(entityContext?: RoleEntityContext): RoleGuardResult {
  const user = useAtomValue(currentUserAtom);
  const userId = user?.cr4c3_userprofileid;
  const staticRole = user?.cr4c3_role ?? -1;

  return useMemo<RoleGuardResult>(() => {
    // ── Static role flags ─────────────────────────────────────────────────
    const isAdmin = staticRole === USER_ROLE.Admin;
    const isMember = staticRole === USER_ROLE.Member;
    const hasStaticL1 = staticRole === USER_ROLE.L1Manager;
    const hasStaticL2 = staticRole === USER_ROLE.L2Manager;

    // ── Delegation: does this user act as a delegate? ─────────────────────
    const activeDelegations = entityContext?.activeDelegations ?? [];
    const isActingDelegate = activeDelegations.some(
      (d) => d._cr4c3_delegate_value === userId
    );

    // ── Dynamic role resolution from entity context ───────────────────────
    const { incident, pa } = entityContext ?? {};

    // Logger: the user who logged the incident
    const isLogger =
      !!userId && !!incident && incident._cr4c3_loggedby_value === userId;

    // Assignee: the user assigned to the incident (Admin always counts)
    const isAssignee =
      isAdmin ||
      (!!userId && !!incident && incident._cr4c3_assignee_value === userId);

    // L1 Manager: static L1Manager role holders cover their organisational scope.
    // Pages requiring precise per-incident resolution call resolveL1Manager()
    // from src/lib/roleUtils.ts and pass the result into entityContext.
    const isL1Manager = isAdmin || hasStaticL1;

    const isL2Manager = isAdmin || hasStaticL2;

    // PA Owner: user assigned to the PA
    const isPAOwner =
      isAdmin ||
      (!!userId && !!pa && pa._cr4c3_paowner_value === userId);

    // ── Composites ────────────────────────────────────────────────────────
    const canReview = isL1Manager || isL2Manager || isAdmin;
    const canCreatePA = isAssignee || isL1Manager || isL2Manager || isAdmin;
    const canManageAdmin = isAdmin;
    const canCancelIncident = isAdmin;
    const canReopenIncident = isAdmin || isL2Manager;
    const canApproveL1 = isL1Manager || isL2Manager || isAdmin;
    const canApproveL2 = isL2Manager || isAdmin;

    return {
      isAdmin,
      isMember,
      isLogger,
      isAssignee,
      isL1Manager,
      isL2Manager,
      isPAOwner,
      isActingDelegate,
      canReview,
      canCreatePA,
      canManageAdmin,
      canCancelIncident,
      canReopenIncident,
      canApproveL1,
      canApproveL2,
    };
  }, [userId, staticRole, entityContext]);
}
