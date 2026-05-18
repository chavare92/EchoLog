import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cr4c3_incidentsService } from "@/generated/services/Cr4c3_incidentsService";
import type { Cr4c3_incidentsBase } from "@/generated/models/Cr4c3_incidentsModel";
import { unwrapResult } from "@/lib/utils";
import { toast } from "sonner";

export const INCIDENTS_KEY = "incidents";

interface IncidentFilters {
  status?: number;
  severity?: number;
  loggedBy?: string;
  assignee?: string;
}

function buildFilter(filters?: IncidentFilters): string | undefined {
  if (!filters) return undefined;
  const parts: string[] = [];
  if (filters.status !== undefined) parts.push(`cr4c3_status eq ${filters.status}`);
  if (filters.severity !== undefined) parts.push(`cr4c3_severity eq ${filters.severity}`);
  if (filters.loggedBy) parts.push(`_cr4c3_loggedby_value eq '${filters.loggedBy}'`);
  if (filters.assignee) parts.push(`_cr4c3_assignee_value eq '${filters.assignee}'`);
  return parts.length > 0 ? parts.join(" and ") : undefined;
}

export function useIncidents(filters?: IncidentFilters) {
  return useQuery({
    queryKey: [INCIDENTS_KEY, filters],
    queryFn: async () => {
      const result = await Cr4c3_incidentsService.getAll({
        filter: buildFilter(filters),
        orderBy: ["cr4c3_createdat desc"],
      });
      return unwrapResult(result) ?? [];
    },
  });
}

export function useIncident(id: string | undefined) {
  return useQuery({
    queryKey: [INCIDENTS_KEY, id],
    queryFn: async () => {
      const result = await Cr4c3_incidentsService.get(id!);
      return unwrapResult(result) ?? null;
    },
    enabled: !!id,
  });
}

export function useCreateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: Omit<Cr4c3_incidentsBase, "cr4c3_incidentid">) => {
      const result = await Cr4c3_incidentsService.create(record);
      return unwrapResult(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [INCIDENTS_KEY] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Operation failed"),
  });
}

export function useUpdateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: Partial<Cr4c3_incidentsBase> }) => {
      const result = await Cr4c3_incidentsService.update(id, fields);
      return unwrapResult(result);
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: [INCIDENTS_KEY] });
      qc.invalidateQueries({ queryKey: [INCIDENTS_KEY, id] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Operation failed"),
  });
}

export function useDeleteIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await Cr4c3_incidentsService.delete(id);
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [INCIDENTS_KEY] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Delete failed"),
  });
}
