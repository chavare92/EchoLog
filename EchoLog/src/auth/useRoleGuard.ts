import { useAtomValue } from "jotai";
import { currentUserAtom } from "@/store/authAtoms";
import { USER_ROLE } from "@/lib/constants";

export function useRoleGuard() {
  const user = useAtomValue(currentUserAtom);
  const role = user?.cr4c3_role ?? -1;

  return {
    isAdmin: role === USER_ROLE.Admin,
    isL1Manager: role === USER_ROLE.L1Manager,
    isL2Manager: role === USER_ROLE.L2Manager,
    isAssignee: role === USER_ROLE.Assignee,
    isLogger: role === USER_ROLE.Logger,
    isPAOwner: role === USER_ROLE.PAOwner,
    canReview: role === USER_ROLE.L1Manager || role === USER_ROLE.L2Manager,
    canCreatePA:
      role === USER_ROLE.Assignee ||
      role === USER_ROLE.L1Manager ||
      role === USER_ROLE.L2Manager,
    canManageAdmin: role === USER_ROLE.Admin,
  };
}
