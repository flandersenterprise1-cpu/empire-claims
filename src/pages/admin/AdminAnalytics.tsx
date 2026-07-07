import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#3B82F6", "#8B5CF6", "#F59E0B", "#06B6D4", "#10B981", "#F97316", "#22C55E", "#EF4444", "#6B7280"];

const tooltipStyle = {
  background: "oklch(0.14 0.01 265)", border: "1px solid oklch(0.22 0.01 265)",
  borderRadius: "8px", color: "oklch(0.88 0.01 265)", fontSize: "0.8rem",
};

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "oklch(0.14 0.01 265)", border: "1px solid oklch(0.2 0.01 265)" }}>
      <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "oklch(0.5 0.01 265)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>{label}</div>
      <div style={{ fontSize: "1.6rem", fontWeight: 800, color: color ?? "oklch(0.94 0.005 65)", fontFamily: "'Syne', sans-serif" }}>{value}</div>
    </div>
  );
}

export default function AdminAnalytics() {
  const { data: byStatus } = trpc.analytics.claimsByStatus.useQuery();
  const { data: byDamage } = trpc.analytics.claimsByDamageType.useQuery();
  const { data: byMonth } = trpc.analytics.claimsByMonth.useQuery();
  const { data: adjPerf } = trpc.analytics.adjusterPerformance.useQuery();
  const { data: stats } = trpc.claims.stats.useQuery();

  return (
    <AdminLayout title="Analytics">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Claims" value={stats?.total ?? 0} />
          <StatCard label="Active Claims" value={stats?.active ?? 0} color="#3B82F6" />
          <StatCard label="Settlements" value={stats?.settlements ?? 0} color="#22C55E" />
          <StatCard label="Total Settlement" value={`$${Number(stats?.totalSettlementValue ?? 0).toLocaleString()}`} color="oklch(0.82 0.1 75)" />
        </div>

        {/* Claims by Month */}
        <div className="rounded-xl p-5" style={{ background: "oklch(0.14 0.01 265)", border: "1px solid oklch(0.2 0.01 265)" }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "oklch(0.92 0.005 65)", marginBottom: "1.25rem" }}>Claims by Month</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byMonth ?? []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fill: "oklch(0.5 0.01 265)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "oklch(0.5 0.01 265)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "oklch(0.18 0.01 265)" }} />
              <Bar dataKey="count" fill="oklch(0.72 0.1 75)" radius={[4, 4, 0, 0]} name="Claims" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          {/* Claims by Status */}
          <div className="rounded-xl p-5" style={{ background: "oklch(0.14 0.01 265)", border: "1px solid oklch(0.2 0.01 265)" }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "oklch(0.92 0.005 65)", marginBottom: "1.25rem" }}>Claims by Status</h3>
            {!byStatus?.length ? (
              <div style={{ color: "oklch(0.45 0.01 265)", fontSize: "0.82rem" }}>No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80}>
                    {byStatus.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Claims by Damage Type */}
          <div className="rounded-xl p-5" style={{ background: "oklch(0.14 0.01 265)", border: "1px solid oklch(0.2 0.01 265)" }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "oklch(0.92 0.005 65)", marginBottom: "1.25rem" }}>Claims by Damage Type</h3>
            {!byDamage?.length ? (
              <div style={{ color: "oklch(0.45 0.01 265)", fontSize: "0.82rem" }}>No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byDamage} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                  <XAxis type="number" tick={{ fill: "oklch(0.5 0.01 265)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="damageType" tick={{ fill: "oklch(0.7 0.01 265)", fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "oklch(0.18 0.01 265)" }} />
                  <Bar dataKey="count" fill="#06B6D4" radius={[0, 4, 4, 0]} name="Claims" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Adjuster Performance */}
        {adjPerf && adjPerf.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ background: "oklch(0.14 0.01 265)", border: "1px solid oklch(0.2 0.01 265)" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid oklch(0.2 0.01 265)" }}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "oklch(0.92 0.005 65)" }}>Adjuster Performance</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid oklch(0.18 0.01 265)" }}>
                  {["Adjuster", "Total Claims", "Settled", "Avg. Settlement"].map(h => (
                    <th key={h} className="px-5 py-3 text-left" style={{ fontSize: "0.72rem", fontWeight: 600, color: "oklch(0.5 0.01 265)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {adjPerf.map((row: any) => (
                  <tr key={row.adjusterId} style={{ borderBottom: "1px solid oklch(0.18 0.01 265)" }}>
                    <td className="px-5 py-3" style={{ fontSize: "0.85rem", fontWeight: 600, color: "oklch(0.88 0.01 265)" }}>{row.adjusterName}</td>
                    <td className="px-5 py-3" style={{ fontSize: "0.85rem", color: "oklch(0.75 0.01 265)" }}>{row.totalClaims}</td>
                    <td className="px-5 py-3" style={{ fontSize: "0.85rem", color: "#22C55E" }}>{row.settledClaims}</td>
                    <td className="px-5 py-3" style={{ fontSize: "0.85rem", color: "oklch(0.82 0.1 75)", fontWeight: 600 }}>
                      {row.avgSettlement ? `$${Number(row.avgSettlement).toLocaleString()}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
