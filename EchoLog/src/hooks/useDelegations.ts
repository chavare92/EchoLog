import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cr4c3_delegationsService } from "@/generated/services/Cr4c3_delegationsService";
import type { Cr4c3_delegationsBase } from "@/generated/models/Cr4c3_delegationsModel";
import { unwrapResult } from "@/lib/utils";
import { toast } from "sonner";

export const DELEGATIONS_KEY = "delegations";

/** Returns all active delegations (enddate >= today) for a given delegate (acting deputy). */
export function useActiveDelegations(delegateId?: string) {
  const today = new Date().toISOString().split("T")[0];
  return useQuery({
    queryKey: [DELEGATIONS_KEY, "active", delegateId],
    queryFn: async () => {
      const filter = delegateId
        ? `_cr4c3_delegate_value eq '${delegateId}' and cr4c3_startdate le '${today}' and cr4c3_enddate ge '${today}'`
        : `cr4c3_startdate le '${today}' and cr4c3_enddate ge '${today}'`;
      const result = await Cr4c3_delegationsService.getAll({ filter });
      return unwrapResult(result) ?? [];
    },
    enabled: delegateId !== undefined ? !!delegateId : true,
  });
}

/** Returns all delegations — for Admin management table. */
export function useDelegations() {
  return useQuery({
    queryKey: [DELEGATIONS_KEY],
    queryFn: async () => {
      const result = await Cr4c3_delegationsService.getAll({
        orderBy: ["cr4c3_startdate desc"],
      });
      return unwrapResult(result) ?? [];
    },
  });
}

export function useCreateDelegation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: Omit<Cr4c3_delegationsBase, "cr4c3_delegationid">) => {
      const result = await Cr4c3_delegationsService.create(record);
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [DELEGATIONS_KEY] });
      toast.success("Delegation created");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create delegation"),
  });
}

export function useRevokeDelegation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await Cr4c3_delegationsService.delete(id);
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [DELEGATIONS_KEY] });
      toast.success("Delegation revoked");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to revoke delegation"),
  });
}
