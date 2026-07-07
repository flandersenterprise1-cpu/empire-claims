import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle, BarChart3, Calendar, CheckCircle,
  ClipboardList, DollarSign, FileText, TrendingUp
} from "lucide-react";
import { Link } from "wouter";

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

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string | number; icon: any; color: string; sub?: string;
}) {
  return (
    <div className="rounded-xl p-5 flex items-start gap-4" style={{ background: "oklch(0.14 0.01 265)", border: "1px solid oklch(0.2 0.01 265)" }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "oklch(0.94 0.005 65)", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: "0.8rem", color: "oklch(0.55 0.01 265)", marginTop: "4px" }}>{label}</div>
        {sub && <div style={{ fontSize: "0.72rem", color: "oklch(0.45 0.01 265)", marginTop: "2px" }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = trpc.claims.stats.useQuery();
  const { data: activity, isLoading: actLoading } = trpc.activity.list.useQuery({ limit: 15 });
  const { data: recentClaims } = trpc.claims.list.useQuery({});

  const recent = recentClaims?.slice(0, 6) ?? [];

  return (
    <AdminLayout title="Dashboard">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Claims" value={statsLoading ? "—" : stats?.total ?? 0} icon={ClipboardList} color="#3B82F6" />
          <StatCard label="Active Claims" value={statsLoading ? "—" : stats?.active ?? 0} icon={TrendingUp} color="#10B981" sub="Excluding closed/denied" />
          <StatCard label="New Today" value={statsLoading ? "—" : stats?.newToday ?? 0} icon={FileText} color="#8B5CF6" />
          <StatCard
            label="Total Settlement Value"
            value={statsLoading ? "—" : `$${Number(stats?.totalSettlementValue ?? 0).toLocaleString()}`}
            icon={DollarSign}
            color="#F59E0B"
            sub={`${stats?.settlements ?? 0} settlements reached`}
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Inspections Scheduled" value={statsLoading ? "—" : stats?.inspectionScheduled ?? 0} icon={Calendar} color="#06B6D4" />
          <StatCard label="In Negotiation" value={statsLoading ? "—" : stats?.negotiation ?? 0} icon={AlertTriangle} color="#F97316" />
          <Link href="/admin/submissions">
            <div className="rounded-xl p-5 flex items-start gap-4 cursor-pointer hover:opacity-80 transition-opacity" style={{ background: "oklch(0.14 0.01 265)", border: "1px solid oklch(0.2 0.01 265)" }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#6366F120" }}>
                <FileText size={20} style={{ color: "#6366F1" }} />
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "oklch(0.94 0.005 65)" }}>Submissions</div>
                <div style={{ fontSize: "0.72rem", color: "#6366F1", marginTop: "2px" }}>View inbox →</div>
              </div>
            </div>
          </Link>
          <Link href="/admin/analytics">
            <div className="rounded-xl p-5 flex items-start gap-4 cursor-pointer hover:opacity-80 transition-opacity" style={{ background: "oklch(0.14 0.01 265)", border: "1px solid oklch(0.2 0.01 265)" }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#22C55E20" }}>
                <BarChart3 size={20} style={{ color: "#22C55E" }} />
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "oklch(0.94 0.005 65)" }}>Analytics</div>
                <div style={{ fontSize: "0.72rem", color: "#22C55E", marginTop: "2px" }}>View reports →</div>
              </div>
            </div>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Claims */}
          <div className="lg:col-span-2 rounded-xl overflow-hidden" style={{ background: "oklch(0.14 0.01 265)", border: "1px solid oklch(0.2 0.01 265)" }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid oklch(0.2 0.01 265)" }}>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "oklch(0.94 0.005 65)" }}>Recent Claims</h2>
              <Link href="/admin/claims">
                <span style={{ fontSize: "0.75rem", color: "oklch(0.72 0.1 75)", cursor: "pointer" }}>View all →</span>
              </Link>
            </div>
            <div>
              {recent.length === 0 ? (
                <div className="px-5 py-8 text-center" style={{ color: "oklch(0.45 0.01 265)", fontSize: "0.85rem" }}>
                  No claims yet.{" "}
                  <Link href="/admin/claims">
                    <span style={{ color: "oklch(0.72 0.1 75)", cursor: "pointer" }}>Create one →</span>
                  </Link>
                </div>
              ) : (
                recent.map((claim: any) => (
                  <Link key={claim.id} href={`/admin/claims/${claim.id}`}>
                    <div className="flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-white/5 transition-colors" style={{ borderBottom: "1px solid oklch(0.18 0.01 265)" }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "oklch(0.94 0.005 65)" }}>{claim.clientName}</span>
                          <span style={{ fontSize: "0.7rem", color: "oklch(0.45 0.01 265)" }}>#{claim.claimNumber}</span>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "oklch(0.55 0.01 265)", marginTop: "2px" }}>
                          {claim.damageType} • {claim.insuranceCompany || "No insurer"}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{
                        background: `${STATUS_COLORS[claim.status] ?? "#6B7280"}20`,
                        color: STATUS_COLORS[claim.status] ?? "#6B7280",
                      }}>
                        {claim.status}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="rounded-xl overflow-hidden" style={{ background: "oklch(0.14 0.01 265)", border: "1px solid oklch(0.2 0.01 265)" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid oklch(0.2 0.01 265)" }}>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "oklch(0.94 0.005 65)" }}>Activity Feed</h2>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "360px" }}>
              {actLoading ? (
                <div className="px-5 py-4 text-center" style={{ color: "oklch(0.45 0.01 265)", fontSize: "0.8rem" }}>Loading...</div>
              ) : !activity || activity.length === 0 ? (
                <div className="px-5 py-8 text-center" style={{ color: "oklch(0.45 0.01 265)", fontSize: "0.8rem" }}>No activity yet</div>
              ) : (
                activity.map((item: any) => (
                  <div key={item.id} className="flex gap-3 px-5 py-3" style={{ borderBottom: "1px solid oklch(0.18 0.01 265)" }}>
                    <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: "oklch(0.72 0.1 75)" }} />
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "oklch(0.75 0.01 265)" }}>{item.description}</div>
                      <div style={{ fontSize: "0.68rem", color: "oklch(0.45 0.01 265)", marginTop: "2px" }}>
                        {new Date(item.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl p-5" style={{ background: "oklch(0.14 0.01 265)", border: "1px solid oklch(0.2 0.01 265)" }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "oklch(0.94 0.005 65)", marginBottom: "1rem" }}>Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "New Claim", href: "/admin/claims", color: "#3B82F6" },
              { label: "Schedule Inspection", href: "/admin/inspections", color: "#F59E0B" },
              { label: "View Submissions", href: "/admin/submissions", color: "#8B5CF6" },
              { label: "Manage Tasks", href: "/admin/tasks", color: "#10B981" },
              { label: "View Analytics", href: "/admin/analytics", color: "#F97316" },
            ].map(action => (
              <Link key={action.href} href={action.href}>
                <div className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all hover:opacity-80"
                  style={{ background: `${action.color}15`, color: action.color, border: `1px solid ${action.color}30` }}>
                  {action.label}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
