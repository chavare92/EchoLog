import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cr4c3_auditlogsService } from "@/generated/services/Cr4c3_auditlogsService";
import type { Cr4c3_auditlogsBase } from "@/generated/models/Cr4c3_auditlogsModel";
import { unwrapResult } from "@/lib/utils";
import { toast } from "sonner";

export const AUDIT_KEY = "audit-logs";

export function useAuditLogs(incidentId?: string, paId?: string) {
  return useQuery({
    queryKey: [AUDIT_KEY, incidentId, paId],
    queryFn: async () => {
      const parts: string[] = [];
      if (incidentId) parts.push(`_cr4c3_incident_value eq '${incidentId}'`);
      if (paId) parts.push(`_cr4c3_preventiveaction_value eq '${paId}'`);
      const filter = parts.length > 0 ? parts.join(" or ") : undefined;
      const result = await Cr4c3_auditlogsService.getAll({
        filter,
        orderBy: ["cr4c3_timestamp desc"],
      });
      return unwrapResult(result) ?? [];
    },
  });
}

export function useCreateAuditLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: Omit<Cr4c3_auditlogsBase, "cr4c3_auditlogid">) => {
      const result = await Cr4c3_auditlogsService.create(record);
      return unwrapResult(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [AUDIT_KEY] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create audit log"),
  });
}
