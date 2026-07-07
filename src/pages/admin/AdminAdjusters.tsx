import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Plus, X, Phone, Mail, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

const inputStyle = {
  background: "oklch(0.12 0.01 265)", border: "1px solid oklch(0.22 0.01 265)",
  borderRadius: "6px", color: "oklch(0.88 0.01 265)", padding: "0.5rem 0.75rem",
  fontSize: "0.82rem", width: "100%", outline: "none",
};
const labelStyle = { fontSize: "0.75rem", color: "oklch(0.55 0.01 265)", display: "block", marginBottom: "4px" };

export default function AdminAdjusters() {
  const utils = trpc.useUtils();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", licensedStates: "", bio: "" });

  const { data: adjusters, isLoading } = trpc.adjusters.list.useQuery();

  const createAdjuster = trpc.adjusters.create.useMutation({
    onSuccess: () => {
      utils.adjusters.list.invalidate();
      setShowCreate(false);
      setForm({ name: "", email: "", phone: "", licensedStates: "", bio: "" });
      toast.success("Adjuster added");
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleActive = trpc.adjusters.update.useMutation({
    onSuccess: () => { utils.adjusters.list.invalidate(); toast.success("Status updated"); },
    onError: (e) => toast.error(e.message),
  });

  const handleCreate = () => {
    if (!form.name.trim()) return toast.error("Name is required");
    createAdjuster.mutate(form);
  };

  return (
    <AdminLayout title="Adjusters">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
            style={{ background: "oklch(0.72 0.1 75)", color: "#0D0F14" }}
          >
            <Plus size={16} /> Add Adjuster
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <div style={{ color: "oklch(0.45 0.01 265)", fontSize: "0.85rem" }}>Loading...</div>
          ) : !adjusters?.length ? (
            <div className="col-span-3 text-center py-12" style={{ color: "oklch(0.45 0.01 265)", fontSize: "0.85rem" }}>
              No adjusters yet. Add your first adjuster to start assigning claims.
            </div>
          ) : (
            adjusters.map((adj: any) => (
              <div key={adj.id} className="rounded-xl p-5" style={{ background: "oklch(0.14 0.01 265)", border: "1px solid oklch(0.2 0.01 265)" }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "oklch(0.72 0.1 75 / 0.2)", color: "oklch(0.82 0.1 75)" }}>
                      {adj.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "oklch(0.92 0.005 65)" }}>{adj.name}</div>
                      <div style={{ fontSize: "0.72rem", color: adj.isActive ? "#22C55E" : "#EF4444" }}>
                        {adj.isActive ? "Active" : "Inactive"}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActive.mutate({ id: adj.id, isActive: !adj.isActive })}
                    className="p-1 rounded transition-colors hover:opacity-80"
                    title={adj.isActive ? "Deactivate" : "Activate"}
                  >
                    {adj.isActive
                      ? <CheckCircle size={18} style={{ color: "#22C55E" }} />
                      : <XCircle size={18} style={{ color: "#EF4444" }} />
                    }
                  </button>
                </div>

                <div className="space-y-1.5">
                  {adj.email && (
                    <div className="flex items-center gap-2" style={{ fontSize: "0.78rem", color: "oklch(0.6 0.01 265)" }}>
                      <Mail size={12} /> {adj.email}
                    </div>
                  )}
                  {adj.phone && (
                    <div className="flex items-center gap-2" style={{ fontSize: "0.78rem", color: "oklch(0.6 0.01 265)" }}>
                      <Phone size={12} /> {adj.phone}
                    </div>
                  )}
                  {adj.licensedStates && (
                    <div style={{ fontSize: "0.75rem", color: "oklch(0.55 0.01 265)", marginTop: "6px" }}>
                      Licensed: <span style={{ color: "oklch(0.72 0.1 75)" }}>{adj.licensedStates}</span>
                    </div>
                  )}
                  {adj.bio && (
                    <div style={{ fontSize: "0.78rem", color: "oklch(0.55 0.01 265)", marginTop: "6px", lineHeight: 1.5 }}>{adj.bio}</div>
                  )}
                </div>

                <div className="mt-3 pt-3" style={{ borderTop: "1px solid oklch(0.2 0.01 265)" }}>
                  <div style={{ fontSize: "0.72rem", color: "oklch(0.45 0.01 265)" }}>
                    Added {new Date(adj.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
            <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: "oklch(0.14 0.01 265)", border: "1px solid oklch(0.22 0.01 265)" }}>
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid oklch(0.2 0.01 265)" }}>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1rem", color: "oklch(0.94 0.005 65)" }}>Add Adjuster</h2>
                <button onClick={() => setShowCreate(false)} style={{ color: "oklch(0.55 0.01 265)" }}><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label style={labelStyle}>Full Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="John Smith" />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} placeholder="john@example.com" />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle} placeholder="(555) 000-0000" />
                </div>
                <div>
                  <label style={labelStyle}>Licensed States (comma-separated)</label>
                  <input value={form.licensedStates} onChange={e => setForm(f => ({ ...f, licensedStates: e.target.value }))} style={inputStyle} placeholder="CA, TX, FL" />
                </div>
                <div>
                  <label style={labelStyle}>Bio / Notes</label>
                  <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} style={{ ...inputStyle, height: "70px", resize: "none" }} placeholder="Brief bio or specialization..." />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm" style={{ background: "oklch(0.18 0.01 265)", color: "oklch(0.65 0.01 265)" }}>Cancel</button>
                  <button onClick={handleCreate} disabled={createAdjuster.isPending} className="px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90" style={{ background: "oklch(0.72 0.1 75)", color: "#0D0F14" }}>
                    {createAdjuster.isPending ? "Adding..." : "Add Adjuster"}
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
