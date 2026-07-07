import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Link } from "wouter";
import { Plus, Search, Filter, X } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  "New Claim": "#3B82F6",
  "Contacted": "#8B5CF6",
  "Inspection Scheduled": "#F59E0B",
  "Inspection Completed": "#06B6D4",
  "Estimate Submitted": "#10B981",
  "Negotiation": "#F97316",
  "Settlement Reached": "#22C55E",
  "Closed": "#6B7280",
  "Denied": "#EF4444",
};

const PRIORITY_COLORS: Record<string, string> = {
  "Low": "#6B7280", "Normal": "#3B82F6", "High": "#F97316", "Urgent": "#EF4444",
};

const DAMAGE_TYPES = ["Fire", "Smoke", "Water", "Storm", "Wind", "Hail", "Vandalism", "Theft", "Mold", "Flood", "Earthquake", "Other"];
const STATUSES = ["New Claim", "Contacted", "Inspection Scheduled", "Inspection Completed", "Estimate Submitted", "Negotiation", "Settlement Reached", "Closed", "Denied"];

const inputStyle = {
  background: "oklch(0.12 0.01 265)",
  border: "1px solid oklch(0.22 0.01 265)",
  borderRadius: "6px",
  color: "oklch(0.88 0.01 265)",
  padding: "0.5rem 0.75rem",
  fontSize: "0.82rem",
  width: "100%",
  outline: "none",
};

const labelStyle = { fontSize: "0.75rem", color: "oklch(0.55 0.01 265)", display: "block", marginBottom: "4px" };

export default function AdminClaims() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [damageFilter, setDamageFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    clientName: "", clientPhone: "", clientEmail: "",
    propertyAddress: "", city: "", state: "", zipCode: "",
    insuranceCompany: "", policyNumber: "",
    damageType: "Other", dateOfLoss: "", damageDescription: "",
    status: "New Claim", priority: "Normal", source: "Website Form",
    estimatedValue: "", feePercentage: "10.00",
  });

  const { data: claims, isLoading } = trpc.claims.list.useQuery({
    status: statusFilter || undefined,
    damageType: damageFilter || undefined,
    search: search || undefined,
  });

  const { data: adjusters } = trpc.adjusters.list.useQuery();

  const createClaim = trpc.claims.create.useMutation({
    onSuccess: () => {
      utils.claims.list.invalidate();
      utils.claims.stats.invalidate();
      setShowCreate(false);
      setForm({ clientName: "", clientPhone: "", clientEmail: "", propertyAddress: "", city: "", state: "", zipCode: "", insuranceCompany: "", policyNumber: "", damageType: "Other", dateOfLoss: "", damageDescription: "", status: "New Claim", priority: "Normal", source: "Website Form", estimatedValue: "", feePercentage: "10.00" });
      toast.success("Claim created successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCreate = () => {
    if (!form.clientName.trim()) return toast.error("Client name is required");
    createClaim.mutate(form);
  };

  return (
    <AdminLayout title="Claims">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "oklch(0.45 0.01 265)" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, claim #, insurer..."
                style={{ ...inputStyle, paddingLeft: "2rem" }}
              />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={damageFilter} onChange={e => setDamageFilter(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
              <option value="">All Damage Types</option>
              {DAMAGE_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: "oklch(0.72 0.1 75)", color: "#0D0F14" }}
          >
            <Plus size={16} /> New Claim
          </button>
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ background: "oklch(0.14 0.01 265)", border: "1px solid oklch(0.2 0.01 265)" }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid oklch(0.2 0.01 265)" }}>
                  {["Claim #", "Client", "Damage Type", "Insurance Co.", "Status", "Priority", "Est. Value", "Date"].map(h => (
                    <th key={h} className="px-4 py-3 text-left" style={{ fontSize: "0.72rem", fontWeight: 600, color: "oklch(0.5 0.01 265)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center" style={{ color: "oklch(0.45 0.01 265)", fontSize: "0.85rem" }}>Loading...</td></tr>
                ) : !claims?.length ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center" style={{ color: "oklch(0.45 0.01 265)", fontSize: "0.85rem" }}>No claims found. Create your first claim.</td></tr>
                ) : (
                  claims.map((claim: any) => (
                    <tr key={claim.id} style={{ borderBottom: "1px solid oklch(0.18 0.01 265)" }} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/admin/claims/${claim.id}`}>
                          <span style={{ fontSize: "0.8rem", color: "oklch(0.72 0.1 75)", cursor: "pointer", fontWeight: 600 }}>{claim.claimNumber}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "oklch(0.88 0.01 265)" }}>{claim.clientName}</div>
                        <div style={{ fontSize: "0.72rem", color: "oklch(0.5 0.01 265)" }}>{claim.clientEmail || claim.clientPhone || "—"}</div>
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: "0.8rem", color: "oklch(0.72 0.01 265)" }}>{claim.damageType}</td>
                      <td className="px-4 py-3" style={{ fontSize: "0.8rem", color: "oklch(0.72 0.01 265)" }}>{claim.insuranceCompany || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{
                          background: `${STATUS_COLORS[claim.status] ?? "#6B7280"}20`,
                          color: STATUS_COLORS[claim.status] ?? "#6B7280",
                        }}>{claim.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: PRIORITY_COLORS[claim.priority] ?? "#6B7280" }}>{claim.priority}</span>
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: "0.8rem", color: "oklch(0.72 0.01 265)" }}>
                        {claim.estimatedValue ? `$${Number(claim.estimatedValue).toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: "0.75rem", color: "oklch(0.5 0.01 265)" }}>
                        {new Date(claim.createdAt).toLocaleDateString()}
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
            <div className="w-full max-w-2xl rounded-2xl overflow-hidden" style={{ background: "oklch(0.14 0.01 265)", border: "1px solid oklch(0.22 0.01 265)" }}>
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid oklch(0.2 0.01 265)" }}>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1rem", color: "oklch(0.94 0.005 65)" }}>New Claim</h2>
                <button onClick={() => setShowCreate(false)} style={{ color: "oklch(0.55 0.01 265)" }}><X size={18} /></button>
              </div>
              <div className="p-6 overflow-y-auto" style={{ maxHeight: "70vh" }}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label style={labelStyle}>Client Name *</label>
                    <input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} style={inputStyle} placeholder="Full name" />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input value={form.clientPhone} onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))} style={inputStyle} placeholder="(555) 000-0000" />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input value={form.clientEmail} onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))} style={inputStyle} placeholder="client@email.com" />
                  </div>
                  <div className="col-span-2">
                    <label style={labelStyle}>Property Address</label>
                    <input value={form.propertyAddress} onChange={e => setForm(f => ({ ...f, propertyAddress: e.target.value }))} style={inputStyle} placeholder="Street address" />
                  </div>
                  <div>
                    <label style={labelStyle}>City</label>
                    <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} style={inputStyle} placeholder="City" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label style={labelStyle}>State</label>
                      <input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} style={inputStyle} placeholder="CA" maxLength={2} />
                    </div>
                    <div>
                      <label style={labelStyle}>ZIP</label>
                      <input value={form.zipCode} onChange={e => setForm(f => ({ ...f, zipCode: e.target.value }))} style={inputStyle} placeholder="90210" />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Insurance Company</label>
                    <input value={form.insuranceCompany} onChange={e => setForm(f => ({ ...f, insuranceCompany: e.target.value }))} style={inputStyle} placeholder="State Farm, Allstate..." />
                  </div>
                  <div>
                    <label style={labelStyle}>Policy Number</label>
                    <input value={form.policyNumber} onChange={e => setForm(f => ({ ...f, policyNumber: e.target.value }))} style={inputStyle} placeholder="Policy #" />
                  </div>
                  <div>
                    <label style={labelStyle}>Damage Type</label>
                    <select value={form.damageType} onChange={e => setForm(f => ({ ...f, damageType: e.target.value }))} style={inputStyle}>
                      {DAMAGE_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Date of Loss</label>
                    <input type="date" value={form.dateOfLoss} onChange={e => setForm(f => ({ ...f, dateOfLoss: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Priority</label>
                    <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={inputStyle}>
                      {["Low", "Normal", "High", "Urgent"].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Source</label>
                    <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} style={inputStyle}>
                      {["Website Form", "Referral", "Phone", "Walk-In", "Partner", "Other"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Estimated Value ($)</label>
                    <input type="number" value={form.estimatedValue} onChange={e => setForm(f => ({ ...f, estimatedValue: e.target.value }))} style={inputStyle} placeholder="0.00" />
                  </div>
                  <div>
                    <label style={labelStyle}>Fee Percentage (%)</label>
                    <input type="number" value={form.feePercentage} onChange={e => setForm(f => ({ ...f, feePercentage: e.target.value }))} style={inputStyle} placeholder="10.00" step="0.5" />
                  </div>
                  <div className="col-span-2">
                    <label style={labelStyle}>Damage Description</label>
                    <textarea value={form.damageDescription} onChange={e => setForm(f => ({ ...f, damageDescription: e.target.value }))} style={{ ...inputStyle, height: "80px", resize: "vertical" }} placeholder="Describe the damage..." />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm" style={{ background: "oklch(0.18 0.01 265)", color: "oklch(0.65 0.01 265)" }}>Cancel</button>
                  <button onClick={handleCreate} disabled={createClaim.isPending} className="px-5 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90" style={{ background: "oklch(0.72 0.1 75)", color: "#0D0F14" }}>
                    {createClaim.isPending ? "Creating..." : "Create Claim"}
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
