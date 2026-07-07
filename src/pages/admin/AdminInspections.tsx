import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  "Scheduled": "#F59E0B", "Completed": "#22C55E", "Cancelled": "#EF4444", "No-Show": "#6B7280",
};

const inputStyle = {
  background: "oklch(0.12 0.01 265)", border: "1px solid oklch(0.22 0.01 265)",
  borderRadius: "6px", color: "oklch(0.88 0.01 265)", padding: "0.5rem 0.75rem",
  fontSize: "0.82rem", width: "100%", outline: "none",
};
const labelStyle = { fontSize: "0.75rem", color: "oklch(0.55 0.01 265)", display: "block", marginBottom: "4px" };

export default function AdminInspections() {
  const utils = trpc.useUtils();
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState({
    claimId: "", adjusterId: "", scheduledDate: "", scheduledTime: "",
    location: "", notes: "", status: "Scheduled",
  });

  const { data: inspections, isLoading } = trpc.inspections.list.useQuery({
    status: statusFilter || undefined,
  });
  const { data: claims } = trpc.claims.list.useQuery({});
  const { data: adjusters } = trpc.adjusters.list.useQuery();

  const createInspection = trpc.inspections.create.useMutation({
    onSuccess: () => {
      utils.inspections.list.invalidate();
      setShowCreate(false);
      setForm({ claimId: "", adjusterId: "", scheduledDate: "", scheduledTime: "", location: "", notes: "", status: "Scheduled" });
      toast.success("Inspection scheduled");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatus = trpc.inspections.update.useMutation({
    onSuccess: () => { utils.inspections.list.invalidate(); toast.success("Status updated"); },
    onError: (e) => toast.error(e.message),
  });

  const handleCreate = () => {
    if (!form.claimId) return toast.error("Please select a claim");
    createInspection.mutate({
      claimId: parseInt(form.claimId),
      adjusterId: form.adjusterId ? parseInt(form.adjusterId) : undefined,
      scheduledDate: form.scheduledDate || undefined,
      scheduledTime: form.scheduledTime || undefined,
      location: form.location || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <AdminLayout title="Inspections">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
              <option value="">All Statuses</option>
              {["Scheduled", "Completed", "Cancelled", "No-Show"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: "oklch(0.72 0.1 75)", color: "#0D0F14" }}
          >
            <Plus size={16} /> Schedule Inspection
          </button>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ background: "oklch(0.14 0.01 265)", border: "1px solid oklch(0.2 0.01 265)" }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid oklch(0.2 0.01 265)" }}>
                  {["Claim", "Date & Time", "Location", "Adjuster", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left" style={{ fontSize: "0.72rem", fontWeight: 600, color: "oklch(0.5 0.01 265)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center" style={{ color: "oklch(0.45 0.01 265)", fontSize: "0.85rem" }}>Loading...</td></tr>
                ) : !inspections?.length ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center" style={{ color: "oklch(0.45 0.01 265)", fontSize: "0.85rem" }}>No inspections scheduled yet.</td></tr>
                ) : (
                  inspections.map((insp: any) => (
                    <tr key={insp.id} style={{ borderBottom: "1px solid oklch(0.18 0.01 265)" }} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/admin/claims/${insp.claimId}`}>
                          <span style={{ fontSize: "0.82rem", color: "oklch(0.72 0.1 75)", cursor: "pointer", fontWeight: 600 }}>
                            {claims?.find((c: any) => c.id === insp.claimId)?.clientName ?? `Claim #${insp.claimId}`}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div style={{ fontSize: "0.82rem", color: "oklch(0.85 0.01 265)" }}>{insp.scheduledDate || "—"}</div>
                        <div style={{ fontSize: "0.72rem", color: "oklch(0.5 0.01 265)" }}>{insp.scheduledTime || ""}</div>
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: "0.8rem", color: "oklch(0.72 0.01 265)", maxWidth: "200px" }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{insp.location || "—"}</div>
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: "0.8rem", color: "oklch(0.72 0.01 265)" }}>
                        {adjusters?.find((a: any) => a.id === insp.adjusterId)?.name ?? "Unassigned"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{
                          background: `${STATUS_COLORS[insp.status] ?? "#6B7280"}20`,
                          color: STATUS_COLORS[insp.status] ?? "#6B7280",
                        }}>{insp.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          defaultValue=""
                          onChange={e => { if (e.target.value) updateStatus.mutate({ id: insp.id, status: e.target.value as any }); }}
                          style={{ ...inputStyle, width: "auto", fontSize: "0.75rem", padding: "0.3rem 0.5rem" }}
                        >
                          <option value="">Update status...</option>
                          {["Scheduled", "Completed", "Cancelled", "No-Show"].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
            <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: "oklch(0.14 0.01 265)", border: "1px solid oklch(0.22 0.01 265)" }}>
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid oklch(0.2 0.01 265)" }}>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1rem", color: "oklch(0.94 0.005 65)" }}>Schedule Inspection</h2>
                <button onClick={() => setShowCreate(false)} style={{ color: "oklch(0.55 0.01 265)" }}><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label style={labelStyle}>Claim *</label>
                  <select value={form.claimId} onChange={e => setForm(f => ({ ...f, claimId: e.target.value }))} style={inputStyle}>
                    <option value="">Select a claim...</option>
                    {(claims ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.clientName} — #{c.claimNumber}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Adjuster</label>
                  <select value={form.adjusterId} onChange={e => setForm(f => ({ ...f, adjusterId: e.target.value }))} style={inputStyle}>
                    <option value="">Unassigned</option>
                    {(adjusters ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelStyle}>Date</label>
                    <input type="date" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Time</label>
                    <input type="time" value={form.scheduledTime} onChange={e => setForm(f => ({ ...f, scheduledTime: e.target.value }))} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Location</label>
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} style={inputStyle} placeholder="Property address or location" />
                </div>
                <div>
                  <label style={labelStyle}>Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inputStyle, height: "70px", resize: "none" }} placeholder="Any notes for the inspection..." />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm" style={{ background: "oklch(0.18 0.01 265)", color: "oklch(0.65 0.01 265)" }}>Cancel</button>
                  <button onClick={handleCreate} disabled={createInspection.isPending} className="px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90" style={{ background: "oklch(0.72 0.1 75)", color: "#0D0F14" }}>
                    {createInspection.isPending ? "Scheduling..." : "Schedule"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
