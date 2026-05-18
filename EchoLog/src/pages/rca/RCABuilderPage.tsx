import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { motion } from "framer-motion";
import {
  ArrowLeft, Plus, Trash2, Download, FileText, Paperclip, Upload,
  Lock, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { currentUserAtom } from "@/store/authAtoms";
import { useIncident } from "@/hooks/useIncidents";
import { useRCASubmissions, useCreateRCA, useUpdateRCA } from "@/hooks/useRCASubmissions";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { useFishboneCauses, useCreateFishboneCause, useDeleteFishboneCause } from "@/hooks/useFishboneCauses";
import { usePAEvidences, useCreatePAEvidence } from "@/hooks/usePAEvidences";
import { usePreventiveActions } from "@/hooks/usePreventiveActions";
import { FISHBONE_CATEGORY, RCA_STATUS } from "@/lib/constants";
import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { GlassCard } from "@/components/shared/GlassCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Document, Paragraph, HeadingLevel, TextRun, Packer, Table as DocxTable,
  TableRow as DocxTableRow, TableCell as DocxTableCell, WidthType,
} from "docx";

const CATEGORY_COLORS: Record<number, string> = {
  [FISHBONE_CATEGORY.People]: "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950/20 dark:border-purple-800 dark:text-purple-400",
  [FISHBONE_CATEGORY.Process]: "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400",
  [FISHBONE_CATEGORY.Technology]: "bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-950/20 dark:border-cyan-800 dark:text-cyan-400",
  [FISHBONE_CATEGORY.Material]: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400",
  [FISHBONE_CATEGORY.Environment]: "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400",
  [FISHBONE_CATEGORY.Management]: "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400",
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
  const { data: rcaAuditLogs } = useAuditLogs(undefined, undefined);
  const { data: paList } = usePreventiveActions(incidentId);
  const firstPAId = paList?.[0]?.cr4c3_preventiveactionid;
  const { data: evidences } = usePAEvidences(firstPAId);

  const createRCA = useCreateRCA();
  const updateRCA = useUpdateRCA();
  const createCause = useCreateFishboneCause();
  const deleteCause = useDeleteFishboneCause();
  const createEvidence = useCreatePAEvidence();

  const [addingCause, setAddingCause] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isApproved = existingRCA?.cr4c3_status === RCA_STATUS.Approved;
  const isReadOnly = isApproved;

  const {
    register: registerRCA,
    handleSubmit: handleRCASubmit,
    reset: resetRCA,
    formState: { errors: rcaErrors },
  } = useForm<RCAValues>({
    resolver: zodResolver(rcaSchema),
    defaultValues: { rcatitle: "", effectstatement: "" },
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
      toast.success("RCA saved");
    } else {
      await createRCA.mutateAsync({
        cr4c3_rcatitle: values.rcatitle,
        cr4c3_effectstatement: values.effectstatement,
        cr4c3_status: RCA_STATUS.Draft,
        cr4c3_submittedat: new Date().toISOString(),
        _cr4c3_incident_value: incidentId,
        _cr4c3_submittedby_value: user?.cr4c3_userprofileid,
      });
      toast.success("RCA created");
    }
  };

  const submitRCA = async () => {
    if (!existingRCA?.cr4c3_rcasubmissionid) return;
    if (!causes || causes.length === 0) { toast.error("Add at least one cause before submitting"); return; }
    const rejectionCount = (rcaAuditLogs ?? []).filter(
      (l) => l.cr4c3_entityid === existingRCA.cr4c3_rcasubmissionid &&
             (l.cr4c3_description?.toLowerCase().includes("reject") || l.cr4c3_newvalue === String(RCA_STATUS.Rejected))
    ).length;
    const baseTitle = (existingRCA.cr4c3_rcatitle ?? "").replace(/ \(Resubmission \d+\)$/, "");
    const finalTitle = rejectionCount > 0 ? `${baseTitle} (Resubmission ${rejectionCount})` : baseTitle;
    await updateRCA.mutateAsync({
      id: existingRCA.cr4c3_rcasubmissionid,
      fields: { cr4c3_status: RCA_STATUS.Submitted, cr4c3_rcatitle: finalTitle },
    });
    toast.success("RCA submitted for review");
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firstPAId) { toast.error("Upload a file after creating a Preventive Action first"); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      await createEvidence.mutateAsync({
        cr4c3_filename: file.name,
        cr4c3_fileurl: reader.result as string,
        cr4c3_uploadedat: new Date().toISOString(),
        _cr4c3_preventiveaction_value: firstPAId,
        _cr4c3_uploadedby_value: user?.cr4c3_userprofileid,
      });
      toast.success(`${file.name} uploaded`);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Root Cause Analysis Report", 14, 22);
    doc.setFontSize(12);
    doc.text(`Incident: ${incident?.cr4c3_ticketreference ?? ""} — ${incident?.cr4c3_title ?? ""}`, 14, 34);
    doc.text(`RCA Title: ${existingRCA?.cr4c3_rcatitle ?? ""}`, 14, 42);
    doc.setFontSize(10);
    doc.text(`Effect: ${existingRCA?.cr4c3_effectstatement ?? ""}`, 14, 52, { maxWidth: 180 });
    autoTable(doc, {
      startY: 70,
      head: [["Category", "Cause"]],
      body: (causes ?? []).map((c) => [CATEGORY_LABELS[c.cr4c3_category ?? 0] ?? "Unknown", c.cr4c3_causetext ?? ""]),
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229] },
    });
    doc.save(`RCA_${incident?.cr4c3_ticketreference ?? "report"}.pdf`);
    toast.success("PDF exported");
  };

  const exportWord = async () => {
    const rows = (causes ?? []).map((c) => new DocxTableRow({
      children: [
        new DocxTableCell({ children: [new Paragraph(CATEGORY_LABELS[c.cr4c3_category ?? 0] ?? "")] }),
        new DocxTableCell({ children: [new Paragraph(c.cr4c3_causetext ?? "")] }),
      ],
    }));
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: "Root Cause Analysis Report", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ children: [new TextRun({ text: `Incident: ${incident?.cr4c3_ticketreference ?? ""} — ${incident?.cr4c3_title ?? ""}`, bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: `RCA Title: ${existingRCA?.cr4c3_rcatitle ?? ""}` })] }),
          new Paragraph({ children: [new TextRun({ text: `Effect: ${existingRCA?.cr4c3_effectstatement ?? ""}` })] }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "Causes", heading: HeadingLevel.HEADING_2 }),
          new DocxTable({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }),
        ],
      }],
    });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RCA_${incident?.cr4c3_ticketreference ?? "report"}.docx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Word document exported");
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
      <motion.div variants={itemVariants} className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/incidents/${incidentId}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">RCA Builder</h2>
            {existingRCA && <StatusBadge status={existingRCA.cr4c3_status} type="rca" />}
            {isApproved && (
              <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-full px-2 py-0.5">
                <Lock className="w-3 h-3" />Read-only (Approved)
              </span>
            )}
          </div>
          <p className="text-xs text-[hsl(var(--foreground-muted))] mt-0.5 truncate">{incident?.cr4c3_title}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {existingRCA && (
            <>
              <Button variant="outline" size="sm" onClick={exportPDF} disabled={!causes?.length}>
                <Download className="w-4 h-4 mr-1.5" />PDF
              </Button>
              <Button variant="outline" size="sm" onClick={exportWord} disabled={!causes?.length}>
                <FileText className="w-4 h-4 mr-1.5" />Word
              </Button>
            </>
          )}
          {existingRCA?.cr4c3_status === RCA_STATUS.Draft && (
            <Button size="sm" onClick={submitRCA} disabled={updateRCA.isPending}>
              {updateRCA.isPending ? "Submitting\u2026" : "Submit for Review"}
            </Button>
          )}
        </div>
      </motion.div>

      {/* Approved banner */}
      {isApproved && (
        <motion.div variants={itemVariants}>
          <div className="rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800 dark:text-green-300 font-medium">
              This RCA has been approved. The content is locked for editing.
            </p>
          </div>
        </motion.div>
      )}

      {/* Rejection comments */}
      {existingRCA?.cr4c3_reviewcomments && existingRCA.cr4c3_status === RCA_STATUS.Rejected && (
        <motion.div variants={itemVariants}>
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">Rejected — Reviewer Comments:</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-0.5">{existingRCA.cr4c3_reviewcomments}</p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="space-y-5">
        {/* RCA Header */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">
              RCA Header
              {isReadOnly && <Lock className="inline w-3.5 h-3.5 ml-1.5 text-gray-400" />}
            </h3>
            {isReadOnly ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-[hsl(var(--foreground-muted))] mb-0.5">Title</p>
                  <p className="font-semibold text-[hsl(var(--foreground))]">{existingRCA?.cr4c3_rcatitle}</p>
                </div>
                <div>
                  <p className="text-xs text-[hsl(var(--foreground-muted))] mb-0.5">Effect Statement</p>
                  <p className="text-sm text-[hsl(var(--foreground))] whitespace-pre-wrap">{existingRCA?.cr4c3_effectstatement}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRCASubmit(saveRCA)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="rcatitle">RCA Title <span className="text-red-500">*</span></Label>
                  <Input id="rcatitle" {...registerRCA("rcatitle")} placeholder="Root cause analysis title" />
                  {rcaErrors.rcatitle && <p className="text-xs text-red-600">{rcaErrors.rcatitle.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="effectstatement">Effect Statement <span className="text-red-500">*</span></Label>
                  <Textarea id="effectstatement" {...registerRCA("effectstatement")}
                    placeholder="Describe the effect/problem in at least 20 characters\u2026" rows={3} />
                  {rcaErrors.effectstatement && <p className="text-xs text-red-600">{rcaErrors.effectstatement.message}</p>}
                </div>
                <Button type="submit" size="sm" disabled={createRCA.isPending || updateRCA.isPending}>
                  {createRCA.isPending || updateRCA.isPending ? "Saving\u2026" : existingRCA ? "Update Header" : "Create RCA"}
                </Button>
              </form>
            )}
          </GlassCard>
        </motion.div>

        {/* Causes */}
        {existingRCA && (
          <motion.div variants={itemVariants}>
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">
                  Causes ({causes?.length ?? 0})
                  {isReadOnly && <Lock className="inline w-3.5 h-3.5 ml-1.5 text-gray-400" />}
                </h3>
                {!isReadOnly && (
                  <Button size="sm" variant="outline" onClick={() => setAddingCause(true)}>
                    <Plus className="w-4 h-4 mr-1" />Add Cause
                  </Button>
                )}
              </div>

              {!isReadOnly && addingCause && (
                <form onSubmit={handleCauseSubmit(addCause)} className="p-4 rounded-lg bg-[hsl(var(--background))]/50 border border-[hsl(var(--border))] mb-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Category <span className="text-red-500">*</span></Label>
                      <select {...registerCause("category")}
                        className="w-full bg-[hsl(var(--background-card))] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-primary/50">
                        <option value="">Select\u2026</option>
                        {Object.entries(FISHBONE_CATEGORY).map(([k, v]) => (
                          <option key={k} value={v}>{k}</option>
                        ))}
                      </select>
                      {causeErrors.category && <p className="text-xs text-red-600">{causeErrors.category.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Cause Text <span className="text-red-500">*</span></Label>
                      <Input {...registerCause("causetext")} placeholder="Describe the cause\u2026" />
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
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium mb-2 ${CATEGORY_COLORS[Number(cat)] ?? ""}`}>
                    {CATEGORY_LABELS[Number(cat)] ?? "Unknown"}
                    <span className="rounded-full bg-white/60 dark:bg-gray-900/40 px-1.5 text-xs">{items?.length}</span>
                  </div>
                  <div className="space-y-1.5 ml-2">
                    {items?.map((c) => (
                      <div key={c.cr4c3_fishbonecauseid} className="flex items-center justify-between p-2.5 rounded-lg bg-[hsl(var(--background))]/50 group">
                        <span className="text-sm text-[hsl(var(--foreground))]">{c.cr4c3_causetext}</span>
                        {!isReadOnly && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => deleteCause.mutate(c.cr4c3_fishbonecauseid!)} aria-label="Delete cause">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {(!causes || causes.length === 0) && !addingCause && (
                <p className="text-sm text-[hsl(var(--foreground-muted))] text-center py-4">No causes added yet.</p>
              )}
            </GlassCard>
          </motion.div>
        )}

        {/* File Attachments */}
        {existingRCA && (
          <motion.div variants={itemVariants}>
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-primary" />Evidence Attachments
                  {!firstPAId && <span className="text-[10px] text-amber-500 ml-1">(Requires a PA)</span>}
                </h3>
                {firstPAId && (
                  <>
                    <input ref={fileInputRef} type="file" className="hidden" accept="*/*" onChange={handleFileUpload} />
                    <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={createEvidence.isPending}>
                      <Upload className="w-4 h-4 mr-1.5" />Upload
                    </Button>
                  </>
                )}
              </div>
              {!firstPAId ? (
                <p className="text-sm text-[hsl(var(--foreground-muted))] text-center py-4">
                  Create a Preventive Action first to attach evidence files.
                </p>
              ) : (!evidences || evidences.length === 0) ? (
                <p className="text-sm text-[hsl(var(--foreground-muted))] text-center py-4">No attachments yet.</p>
              ) : (
                <div className="space-y-2">
                  {evidences.map((ev) => (
                    <div key={ev.cr4c3_paevidenceid} className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--background))]/50 border border-gray-100 dark:border-gray-700">
                      <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-[hsl(var(--foreground))] flex-1 truncate">{ev.cr4c3_filename}</span>
                      {ev.cr4c3_fileurl && (
                        <a href={ev.cr4c3_fileurl} download={ev.cr4c3_filename} className="text-primary hover:underline text-xs flex items-center gap-1">
                          <Download className="w-3 h-3" />Download
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </div>
    </PageWrapper>
  );
}
