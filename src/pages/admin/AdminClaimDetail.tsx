import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  "New Claim": "#3B82F6", "Contacted": "#8B5CF6",
  "Inspection Scheduled": "#F59E0B", "Inspection Completed": "#06B6D4",
  "Estimate Submitted": "#10B981", "Negotiation": "#F97316",
  "Settlement Reached": "#22C55E", "Closed": "#6B7280", "Denied": "#EF4444",
};

const STATUSES = ["New Claim", "Contacted", "Inspection Scheduled", "Inspection Completed", "Estimate Submitted", "Negotiation", "Settlement Reached", "Closed", "Denied"];

const inputStyle = {
  background: "oklch(0.12 0.01 265)", border: "1px solid oklch(0.22 0.01 265)",
  borderRadius: "6px", color: "oklch(0.88 0.01 265)", padding: "0.5rem 0.75rem",
  fontSize: "0.82rem", width: "100%", outline: "none",
};
const labelStyle = { fontSize: "0.72rem", color: "oklch(0.5 0.01 265)", display: "block", marginBottom: "3px" };
const cardStyle = { background: "oklch(0.14 0.01 265)", border: "1px solid oklch(0.2 0.01 265)", borderRadius: "12px", padding: "1.25rem" };

export default function AdminClaimDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const claimId = parseInt(id ?? "0");

  const { data: claim, isLoading } = trpc.claims.get.useQuery({ id: claimId });
  const { data: notes } = trpc.claimNotes.list.useQuery({ claimId });
  const { data: adjusters } = trpc.adjusters.list.useQuery();

  const [noteContent, setNoteContent] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editAdjuster, setEditAdjuster] = useState("");
  const [editSettlement, setEditSettlement] = useState("");

  const updateClaim = trpc.claims.update.useMutation({
    onSuccess: () => { utils.claims.get.invalidate({ id: claimId }); utils.claims.list.invalidate(); utils.claims.stats.invalidate(); toast.success("Claim updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const addNote = trpc.claimNotes.add.useMutation({
    onSuccess: () => { utils.claimNotes.list.invalidate({ claimId }); setNoteContent(""); toast.success("Note added"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <AdminLayout title="Claim Detail"><div className="text-center py-16" style={{ color: "oklch(0.45 0.01 265)" }}>Loading...</div></AdminLayout>;
  if (!claim) return <AdminLayout title="Claim Detail"><div className="text-center py-16" style={{ color: "oklch(0.45 0.01 265)" }}>Claim not found.</div></AdminLayout>;

  const handleStatusUpdate = () => {
    if (!editStatus) return;
    updateClaim.mutate({ id: claimId, status: editStatus as any });
    setEditStatus("");
  };

  const handleAdjusterUpdate = () => {
    if (!editAdjuster) return;
    updateClaim.mutate({ id: claimId, assignedAdjusterId: parseInt(editAdjuster) });
    setEditAdjuster("");
  };

  const handleSettlementUpdate = () => {
    if (!editSettlement) return;
    updateClaim.mutate({ id: claimId, settlementAmount: editSettlement });
    setEditSettlement("");
  };

  return (
    <AdminLayout title={`Claim #${claim.claimNumber}`}>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Back + Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/claims")} className="flex items-center gap-1.5 text-sm hover:opacity-80" style={{ color: "oklch(0.55 0.01 265)" }}>
            <ArrowLeft size={15} /> Back to Claims
          </button>
        </div>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.4rem", color: "oklch(0.94 0.005 65)" }}>{claim.clientName}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span style={{ fontSize: "0.8rem", color: "oklch(0.5 0.01 265)" }}>#{claim.claimNumber}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: `${STATUS_COLORS[claim.status] ?? "#6B7280"}20`, color: STATUS_COLORS[claim.status] ?? "#6B7280" }}>
                {claim.status}
              </span>
              <span style={{ fontSize: "0.78rem", color: "oklch(0.5 0.01 265)" }}>{claim.damageType} Damage</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
              <option value="">Change Status...</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={handleStatusUpdate} disabled={!editStatus || updateClaim.isPending} className="px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90" style={{ background: "oklch(0.72 0.1 75)", color: "#0D0F14" }}>
              Update
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Left: Details */}
          <div className="lg:col-span-2 space-y-5">
            {/* Client Info */}
            <div style={cardStyle}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.85rem", color: "oklch(0.72 0.1 75)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>Client Information</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Name", claim.clientName],
                  ["Phone", claim.clientPhone || "—"],
                  ["Email", claim.clientEmail || "—"],
                  ["Property", claim.propertyAddress || "—"],
                  ["City", claim.city || "—"],
                  ["State / ZIP", `${claim.state || "—"} ${claim.zipCode || ""}`.trim()],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={labelStyle}>{label}</div>
                    <div style={{ fontSize: "0.85rem", color: "oklch(0.85 0.01 265)" }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Insurance & Damage */}
            <div style={cardStyle}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.85rem", color: "oklch(0.72 0.1 75)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>Insurance & Damage</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Insurance Company", claim.insuranceCompany || "—"],
                  ["Policy Number", claim.policyNumber || "—"],
                  ["Ins. Claim Number", claim.insuranceClaimNumber || "—"],
                  ["Damage Type", claim.damageType],
                  ["Date of Loss", claim.dateOfLoss || "—"],
                  ["Priority", claim.priority],
                  ["Source", claim.source || "—"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={labelStyle}>{label}</div>
                    <div style={{ fontSize: "0.85rem", color: "oklch(0.85 0.01 265)" }}>{value}</div>
                  </div>
                ))}
                {claim.damageDescription && (
                  <div className="col-span-2">
                    <div style={labelStyle}>Damage Description</div>
                    <div style={{ fontSize: "0.85rem", color: "oklch(0.85 0.01 265)", lineHeight: 1.6 }}>{claim.damageDescription}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Financials */}
            <div style={cardStyle}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.85rem", color: "oklch(0.72 0.1 75)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>Financials</h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  ["Estimated Value", claim.estimatedValue ? `$${Number(claim.estimatedValue).toLocaleString()}` : "—"],
                  ["Settlement Amount", claim.settlementAmount ? `$${Number(claim.settlementAmount).toLocaleString()}` : "—"],
                  ["Fee Percentage", claim.feePercentage ? `${claim.feePercentage}%` : "10%"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={labelStyle}>{label}</div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "oklch(0.88 0.01 265)" }}>{value}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="number" value={editSettlement} onChange={e => setEditSettlement(e.target.value)} style={{ ...inputStyle, maxWidth: "180px" }} placeholder="Settlement amount" />
                <button onClick={handleSettlementUpdate} disabled={!editSettlement || updateClaim.isPending} className="px-3 py-2 rounded-lg text-xs font-semibold" style={{ background: "oklch(0.22 0.1 145)", color: "#22C55E" }}>
                  Update Settlement
                </button>
              </div>
            </div>

            {/* Notes */}
            <div style={cardStyle}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.85rem", color: "oklch(0.72 0.1 75)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>Notes</h3>
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {!notes?.length ? (
                  <p style={{ fontSize: "0.82rem", color: "oklch(0.45 0.01 265)" }}>No notes yet.</p>
                ) : (
                  notes.map((note: any) => (
                    <div key={note.id} className="p-3 rounded-lg" style={{ background: "oklch(0.12 0.01 265)" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "oklch(0.72 0.1 75)" }}>{note.authorName || "Staff"}</span>
                        <span style={{ fontSize: "0.68rem", color: "oklch(0.45 0.01 265)" }}>{new Date(note.createdAt).toLocaleString()}</span>
                      </div>
                      <p style={{ fontSize: "0.82rem", color: "oklch(0.78 0.01 265)", lineHeight: 1.6 }}>{note.content}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <textarea
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  placeholder="Add a note..."
                  style={{ ...inputStyle, height: "70px", resize: "none", flex: 1 }}
                />
                <button
                  onClick={() => { if (noteContent.trim()) addNote.mutate({ claimId, content: noteContent }); }}
                  disabled={!noteContent.trim() || addNote.isPending}
                  className="px-3 py-2 rounded-lg self-end"
                  style={{ background: "oklch(0.72 0.1 75)", color: "#0D0F14" }}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-5">
            {/* Assigned Adjuster */}
            <div style={cardStyle}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.85rem", color: "oklch(0.72 0.1 75)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>Assigned Adjuster</h3>
              <div className="mb-3">
                {claim.assignedAdjusterId ? (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "oklch(0.72 0.1 75 / 0.2)", color: "oklch(0.82 0.1 75)" }}>
                      {adjusters?.find((a: any) => a.id === claim.assignedAdjusterId)?.name?.charAt(0) ?? "A"}
                    </div>
                    <span style={{ fontSize: "0.85rem", color: "oklch(0.85 0.01 265)" }}>
                      {adjusters?.find((a: any) => a.id === claim.assignedAdjusterId)?.name ?? "Adjuster #" + claim.assignedAdjusterId}
                    </span>
                  </div>
                ) : (
                  <p style={{ fontSize: "0.82rem", color: "oklch(0.45 0.01 265)" }}>Unassigned</p>
                )}
              </div>
              <select value={editAdjuster} onChange={e => setEditAdjuster(e.target.value)} style={inputStyle}>
                <option value="">Reassign adjuster...</option>
                {(adjusters ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <button onClick={handleAdjusterUpdate} disabled={!editAdjuster || updateClaim.isPending} className="mt-2 w-full py-2 rounded-lg text-xs font-semibold" style={{ background: "oklch(0.18 0.01 265)", color: "oklch(0.72 0.1 75)" }}>
                Assign
              </button>
            </div>

            {/* Claim Timeline */}
            <div style={cardStyle}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.85rem", color: "oklch(0.72 0.1 75)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>Timeline</h3>
              <div className="space-y-2">
                {[
                  { label: "Created", date: claim.createdAt },
                  { label: "Last Updated", date: claim.updatedAt },
                  ...(claim.closedAt ? [{ label: "Closed", date: claim.closedAt }] : []),
                ].map(({ label, date }) => (
                  <div key={label} className="flex justify-between">
                    <span style={{ fontSize: "0.78rem", color: "oklch(0.5 0.01 265)" }}>{label}</span>
                    <span style={{ fontSize: "0.78rem", color: "oklch(0.75 0.01 265)" }}>{new Date(date).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div style={cardStyle}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.85rem", color: "oklch(0.72 0.1 75)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>Related</h3>
              <div className="space-y-2">
                <a href={`/admin/inspections`} style={{ display: "block", fontSize: "0.82rem", color: "#06B6D4", textDecoration: "none" }}>→ View Inspections</a>
                <a href={`/admin/tasks`} style={{ display: "block", fontSize: "0.82rem", color: "#10B981", textDecoration: "none" }}>→ View Tasks</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
