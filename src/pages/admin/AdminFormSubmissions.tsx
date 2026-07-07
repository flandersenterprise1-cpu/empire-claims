import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { ArrowRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdminFormSubmissions() {
  const [convertingId, setConvertingId] = useState<number | null>(null);
  const [convertingSub, setConvertingSub] = useState<any | null>(null);

  const utils = trpc.useUtils();
  const { data: submissions, isLoading } = trpc.formSubmissions.list.useQuery();
  const convertToClaim = trpc.formSubmissions.convertToClaim.useMutation({
    onSuccess: () => {
      utils.formSubmissions.list.invalidate();
      utils.claims.list.invalidate();
      utils.claims.stats.invalidate();
      setConvertingId(null);
      setConvertingSub(null);
      toast.success("Converted to claim successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const inputStyle = {
    background: "oklch(0.1 0.008 265)", border: "1px solid oklch(0.22 0.01 265)",
    color: "oklch(0.85 0.01 265)", borderRadius: "4px", padding: "0.5rem 0.75rem",
    fontSize: "0.82rem", width: "100%", outline: "none",
  };

  const handleConvert = () => {
    if (!convertingId || !convertingSub) return;
    convertToClaim.mutate({
      submissionId: convertingId,
      clientName: convertingSub.name ?? "Unknown",
      clientPhone: convertingSub.phone ?? undefined,
      clientEmail: convertingSub.email ?? undefined,
      propertyAddress: convertingSub.propertyAddress ?? undefined,
      insuranceCompany: convertingSub.insuranceCompany ?? undefined,
      damageType: convertingSub.damageType ?? undefined,
      dateOfLoss: convertingSub.dateOfLoss ?? undefined,
      damageDescription: convertingSub.description ?? undefined,
    });
  };

  return (
    <AdminLayout title="Form Submissions">
      <div className="mb-4">
        <p style={{ fontSize: "0.82rem", color: "oklch(0.5 0.01 265)" }}>
          Submissions from the public website contact form. Convert to claims to track them in the pipeline.
        </p>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid oklch(0.2 0.01 265)" }}>
        <div className="overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "oklch(0.14 0.01 265)", borderBottom: "1px solid oklch(0.2 0.01 265)" }}>
                {["Name", "Phone", "Email", "Damage Type", "Insurance Co.", "Date", "Status", ""].map(h => (
                  <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.7rem", fontWeight: 700, color: "oklch(0.5 0.01 265)", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "oklch(0.45 0.01 265)", fontSize: "0.85rem" }}>Loading...</td></tr>
              ) : (submissions ?? []).length === 0 ? (
                <tr><td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "oklch(0.45 0.01 265)", fontSize: "0.85rem" }}>No submissions yet</td></tr>
              ) : (submissions ?? []).map((sub: any) => (
                <tr key={sub.id} style={{ borderBottom: "1px solid oklch(0.16 0.01 265)" }}>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "oklch(0.9 0.005 65)" }}>{sub.name}</div>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.78rem", color: "oklch(0.7 0.01 265)", whiteSpace: "nowrap" }}>{sub.phone ?? "—"}</td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.78rem", color: "oklch(0.7 0.01 265)" }}>{sub.email ?? "—"}</td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", color: "oklch(0.6 0.01 265)" }}>{sub.damageType ?? "—"}</td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", color: "oklch(0.6 0.01 265)" }}>{sub.insuranceCompany ?? "—"}</td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.72rem", color: "oklch(0.45 0.01 265)", whiteSpace: "nowrap" }}>{new Date(sub.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    {sub.isConverted ? (
                      <span className="flex items-center gap-1" style={{ fontSize: "0.72rem", color: "#22C55E", fontWeight: 600 }}>
                        <CheckCircle size={12} /> Converted
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.72rem", color: "oklch(0.72 0.1 75)", fontWeight: 600 }}>New</span>
                    )}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    {!sub.isConverted && (
                      <button
                        type="button"
                        onClick={() => { setConvertingId(sub.id); setConvertingSub(sub); }}
                        className="flex items-center gap-1"
                        style={{ color: "oklch(0.72 0.1 75)", fontSize: "0.75rem", whiteSpace: "nowrap" }}
                      >
                        <ArrowRight size={12} /> Convert to Claim
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Convert modal */}
      {convertingId !== null && convertingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-sm rounded-xl p-6" style={{ background: "oklch(0.13 0.01 265)", border: "1px solid oklch(0.22 0.01 265)" }}>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "oklch(0.94 0.005 65)", marginBottom: "0.5rem" }}>Convert to Claim</h2>
            <p style={{ fontSize: "0.82rem", color: "oklch(0.6 0.01 265)", marginBottom: "1.25rem" }}>
              This will create a new claim for <strong style={{ color: "oklch(0.88 0.01 265)" }}>{convertingSub.name}</strong> and mark this submission as converted.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setConvertingId(null); setConvertingSub(null); }} style={{ flex: 1, padding: "0.6rem", borderRadius: "6px", background: "oklch(0.16 0.01 265)", color: "oklch(0.65 0.01 265)", fontSize: "0.85rem", border: "1px solid oklch(0.22 0.01 265)" }}>Cancel</button>
              <button
                type="button"
                onClick={handleConvert}
                disabled={convertToClaim.isPending}
                style={{ flex: 2, padding: "0.6rem", borderRadius: "6px", background: "oklch(0.72 0.1 75)", color: "oklch(0.1 0.008 265)", fontWeight: 700, fontSize: "0.85rem" }}
              >
                {convertToClaim.isPending ? "Converting..." : "Convert to Claim"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
