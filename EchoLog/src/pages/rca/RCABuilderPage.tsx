import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Eye, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { currentUserAtom } from "@/store/authAtoms";
import { useIncident } from "@/hooks/useIncidents";
import { useRCASubmissions, useCreateRCA, useUpdateRCA } from "@/hooks/useRCASubmissions";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import {
  useFishboneCauses,
  useCreateFishboneCause,
  useDeleteFishboneCause,
} from "@/hooks/useFishboneCauses";
import { FISHBONE_CATEGORY, RCA_STATUS } from "@/lib/constants";
import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const CATEGORY_COLORS: Record<number, string> = {
  [FISHBONE_CATEGORY.People]: "bg-purple-100 border-purple-300 text-purple-700",
  [FISHBONE_CATEGORY.Process]: "bg-blue-100 border-blue-300 text-blue-700",
  [FISHBONE_CATEGORY.Technology]: "bg-cyan-100 border-cyan-300 text-cyan-700",
  [FISHBONE_CATEGORY.Material]: "bg-amber-100 border-amber-300 text-amber-700",
  [FISHBONE_CATEGORY.Environment]: "bg-green-100 border-green-300 text-green-700",
  [FISHBONE_CATEGORY.Management]: "bg-red-100 border-red-300 text-red-700",
};

const CATEGORY_HEX: Record<number, string> = {
  [FISHBONE_CATEGORY.People]: "#9333ea",
  [FISHBONE_CATEGORY.Process]: "#2563eb",
  [FISHBONE_CATEGORY.Technology]: "#0891b2",
  [FISHBONE_CATEGORY.Material]: "#d97706",
  [FISHBONE_CATEGORY.Environment]: "#16a34a",
  [FISHBONE_CATEGORY.Management]: "#dc2626",
};

const CATEGORY_LABELS: Record<number, string> = {
  [FISHBONE_CATEGORY.People]: "People",
  [FISHBONE_CATEGORY.Process]: "Process",
  [FISHBONE_CATEGORY.Technology]: "Technology",
  [FISHBONE_CATEGORY.Material]: "Material",
  [FISHBONE_CATEGORY.Environment]: "Environment",
  [FISHBONE_CATEGORY.Management]: "Management",
};

const rcaSchema = z.object({
  rcatitle: z.string().min(5, "Title must be at least 5 characters"),
  effectstatement: z.string().min(20, "Effect statement must be at least 20 characters").max(2000),
});

type RCAValues = z.infer<typeof rcaSchema>;

const causeSchema = z.object({
  causetext: z.string().min(5, "Cause must be at least 5 characters").max(500),
  category: z.string().min(1, "Category is required"),
});

type CauseValues = z.infer<typeof causeSchema>;

export function RCABuilderPage() {
  const { id: incidentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAtomValue(currentUserAtom);

  const { data: incident } = useIncident(incidentId);
  const { data: rcaList } = useRCASubmissions(incidentId);
  const existingRCA = rcaList?.[0];
  const { data: causes } = useFishboneCauses(existingRCA?.cr4c3_rcasubmissionid);
  // PRD §4.2: count prior rejections to compute resubmission number
  const { data: rcaAuditLogs } = useAuditLogs(undefined, undefined);

  const createRCA = useCreateRCA();
  const updateRCA = useUpdateRCA();
  const createCause = useCreateFishboneCause();
  const deleteCause = useDeleteFishboneCause();

  const [addingCause, setAddingCause] = useState(false);
  const [viewMode, setViewMode] = useState<"diagram" | "form">("form");

  const {
    register: registerRCA,
    handleSubmit: handleRCASubmit,
    reset: resetRCA,
    formState: { errors: rcaErrors },
  } = useForm<RCAValues>({
    resolver: zodResolver(rcaSchema),
    defaultValues: {
      rcatitle: "",
      effectstatement: "",
    },
  });

  useEffect(() => {
    if (existingRCA) {
      resetRCA({
        rcatitle: existingRCA.cr4c3_rcatitle ?? "",
        effectstatement: existingRCA.cr4c3_effectstatement ?? "",
      });
    }
  }, [existingRCA, resetRCA]);

  const {
    register: registerCause,
    handleSubmit: handleCauseSubmit,
    reset: resetCause,
    formState: { errors: causeErrors },
  } = useForm<CauseValues>({ resolver: zodResolver(causeSchema) });

  const saveRCA = async (values: RCAValues) => {
    if (existingRCA?.cr4c3_rcasubmissionid) {
      await updateRCA.mutateAsync({
        id: existingRCA.cr4c3_rcasubmissionid,
        fields: { cr4c3_rcatitle: values.rcatitle, cr4c3_effectstatement: values.effectstatement },
      });
    } else {
      await createRCA.mutateAsync({
        cr4c3_rcatitle: values.rcatitle,
        cr4c3_effectstatement: values.effectstatement,
        cr4c3_status: RCA_STATUS.Draft,
        cr4c3_submittedat: new Date().toISOString(),
        _cr4c3_incident_value: incidentId,
        _cr4c3_submittedby_value: user?.cr4c3_userprofileid,
      });
    }
  };

  const submitRCA = async () => {
    if (!existingRCA?.cr4c3_rcasubmissionid) return;
    if (!causes || causes.length === 0) {
      alert("At least one cause is required before submitting.");
      return;
    }
    // PRD §4.2: count rejection events for this RCA and suffix title
    const rejectionCount = (rcaAuditLogs ?? []).filter(
      (l) =>
        l.cr4c3_entityid === existingRCA.cr4c3_rcasubmissionid &&
        (l.cr4c3_description?.toLowerCase().includes("reject") ||
          l.cr4c3_newvalue === String(RCA_STATUS.Rejected))
    ).length;
    const baseTitle = (existingRCA.cr4c3_rcatitle ?? "").replace(/ \(Resubmission \d+\)$/, "");
    const finalTitle =
      rejectionCount > 0
        ? `${baseTitle} (Resubmission ${rejectionCount})`
        : baseTitle;
    await updateRCA.mutateAsync({
      id: existingRCA.cr4c3_rcasubmissionid,
      fields: {
        cr4c3_status: RCA_STATUS.Submitted,
        cr4c3_rcatitle: finalTitle,
      },
    });
    navigate(`/incidents/${incidentId}`);
  };

  const addCause = async (values: CauseValues) => {
    if (!existingRCA?.cr4c3_rcasubmissionid) return;
    await createCause.mutateAsync({
      cr4c3_causetext: values.causetext,
      cr4c3_category: Number(values.category),
      _cr4c3_rcasubmission_value: existingRCA.cr4c3_rcasubmissionid,
    });
    resetCause();
    setAddingCause(false);
  };

  const groupedCauses = (causes ?? []).reduce<Record<number, typeof causes>>((acc, c) => {
    const cat = c.cr4c3_category ?? 0;
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(c);
    return acc;
  }, {});

  return (
    <PageWrapper>
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/incidents/${incidentId}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">RCA Builder</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">{incident?.cr4c3_title}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "form" ? "diagram" : "form")}
          >
            {viewMode === "form" ? <Eye className="w-4 h-4 mr-1" /> : <Pencil className="w-4 h-4 mr-1" />}
            {viewMode === "form" ? "Diagram View" : "Edit Mode"}
          </Button>
          {existingRCA?.cr4c3_status === RCA_STATUS.Draft && (
            <Button size="sm" onClick={submitRCA} disabled={updateRCA.isPending}>
              Submit for Review
            </Button>
          )}
        </div>
      </motion.div>

      {viewMode === "form" ? (
        <div className="space-y-5">
          {/* RCA Header form */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">RCA Header</h3>
              <form onSubmit={handleRCASubmit(saveRCA)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="rcatitle">RCA Title *</Label>
                  <Input id="rcatitle" {...registerRCA("rcatitle")} placeholder="Root cause analysis title" />
                  {rcaErrors.rcatitle && <p className="text-xs text-red-600">{rcaErrors.rcatitle.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="effectstatement">Effect Statement *</Label>
                  <Textarea
                    id="effectstatement"
                    {...registerRCA("effectstatement")}
                    placeholder="Describe the effect/problem in at least 20 characters…"
                    rows={3}
                  />
                  {rcaErrors.effectstatement && (
                    <p className="text-xs text-red-600">{rcaErrors.effectstatement.message}</p>
                  )}
                </div>
                <Button type="submit" size="sm" disabled={createRCA.isPending || updateRCA.isPending}>
                  {existingRCA ? "Update" : "Create RCA"} Header
                </Button>
              </form>
            </GlassCard>
          </motion.div>

          {/* Causes */}
          {existingRCA && (
            <motion.div variants={itemVariants}>
              <GlassCard className="p-5">
                <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Causes ({causes?.length ?? 0})
                  </h3>
                  <Button size="sm" variant="outline" onClick={() => setAddingCause(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Cause
                  </Button>
                </div>

                {addingCause && (
                  <form onSubmit={handleCauseSubmit(addCause)} className="p-4 rounded-lg bg-gray-100 border border-gray-200 mb-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Category *</Label>
                        <select
                          {...registerCause("category")}
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-500"
                        >
                          <option value="">Select…</option>
                          {Object.entries(FISHBONE_CATEGORY).map(([k, v]) => (
                            <option key={k} value={v}>{k}</option>
                          ))}
                        </select>
                        {causeErrors.category && <p className="text-xs text-red-600">{causeErrors.category.message}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Cause Text *</Label>
                        <Input {...registerCause("causetext")} placeholder="Describe the cause…" />
                        {causeErrors.causetext && <p className="text-xs text-red-600">{causeErrors.causetext.message}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={createCause.isPending}>Add</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => { setAddingCause(false); resetCause(); }}>Cancel</Button>
                    </div>
                  </form>
                )}

                {Object.entries(groupedCauses).map(([cat, items]) => (
                  <div key={cat} className="mb-4">
                    <div className={`inline-flex items-center px-2.5 py-1 rounded-md border text-xs font-medium mb-2 ${CATEGORY_COLORS[Number(cat)] ?? ""}`}>
                      {CATEGORY_LABELS[Number(cat)] ?? "Unknown"}
                    </div>
                    <div className="space-y-1.5 ml-2">
                      {items?.map((c) => (
                        <div key={c.cr4c3_fishbonecauseid} className="flex items-center justify-between p-2.5 rounded bg-gray-100">
                          <span className="text-sm text-gray-700">{c.cr4c3_causetext}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-red-600"
                            onClick={() => deleteCause.mutate(c.cr4c3_fishbonecauseid!)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {(!causes || causes.length === 0) && !addingCause && (
                  <p className="text-sm text-gray-400 text-center py-4">No causes added yet.</p>
                )}
              </GlassCard>
            </motion.div>
          )}
        </div>
      ) : (
        /* Diagram view — SVG Fishbone */
        <motion.div variants={itemVariants}>
          <GlassCard className="p-6">
            <div className="overflow-x-auto">
              <svg viewBox="0 0 900 500" className="w-full min-w-[600px] text-gray-700">
                {/* Spine */}
                <line x1="100" y1="250" x2="800" y2="250" stroke="#d97706" strokeWidth="2.5" />
                {/* Head */}
                <rect x="800" y="210" width="90" height="80" rx="6" fill="#fef3c7" stroke="#fcd34d" />
                <text x="845" y="255" textAnchor="middle" fill="#92400e" fontSize="12" fontWeight="600">
                  Effect
                </text>
                <text x="845" y="268" textAnchor="middle" fill="#6b7280" fontSize="9">
                  {existingRCA?.cr4c3_effectstatement?.slice(0, 20)}…
                </text>

                {/* 6 branches */}
                {Object.entries(FISHBONE_CATEGORY).map(([label, val], i) => {
                  const side = i < 3 ? "top" : "bottom";
                  const positions = [200, 400, 600, 200, 400, 600];
                  const x = positions[i] ?? 200;
                  const dy = side === "top" ? -80 : 80;
                  const ty = side === "top" ? 165 : 335;
                  const color = CATEGORY_HEX[val] ?? "#94a3b8";
                  const branchCauses = (causes ?? []).filter((c) => c.cr4c3_category === val);

                  return (
                    <g key={val}>
                      <line x1={x} y1="250" x2={x + 30} y2={250 + dy} stroke={color || "#6b7280"} strokeWidth="1.5" opacity="0.7" />
                      <text x={x + 32} y={ty} fill="#1f2937" fontSize="11" fontWeight="600">{label}</text>
                      {branchCauses.slice(0, 3).map((c, ci) => (
                        <text key={c.cr4c3_fishbonecauseid} x={x + 32} y={ty + 14 + ci * 13} fill="#6b7280" fontSize="9">
                          • {c.cr4c3_causetext?.slice(0, 25)}{(c.cr4c3_causetext?.length ?? 0) > 25 ? "…" : ""}
                        </text>
                      ))}
                    </g>
                  );
                })}
              </svg>
            </div>
            <Separator className="my-4" />
            <div className="flex flex-wrap gap-2">
              {Object.entries(FISHBONE_CATEGORY).map(([label, val]) => (
                <div key={val} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs ${CATEGORY_COLORS[val] ?? ""}`}>
                  <span className="font-medium">{label}</span>
                  <Badge variant="secondary" className="text-xs px-1 py-0">{(causes ?? []).filter((c) => c.cr4c3_category === val).length}</Badge>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}
    </PageWrapper>
  );
}
