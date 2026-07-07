import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  BarChart3, Calendar, ClipboardList, ExternalLink,
  FileText, FolderOpen, LayoutDashboard, LogOut,
  Menu, Settings, Shield, Users, X
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/claims", label: "Claims", icon: ClipboardList },
  { href: "/admin/inspections", label: "Inspections", icon: Calendar },
  { href: "/admin/submissions", label: "Form Submissions", icon: FolderOpen },
  { href: "/admin/tasks", label: "Tasks", icon: FileText },
  { href: "/admin/adjusters", label: "Adjusters", icon: Users, adminOnly: true },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings, adminOnly: true },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const logout = trpc.credentialAuth.logout.useMutation({
    onSuccess: () => navigate("/admin"),
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/admin");
    }
  }, [loading, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0D0F14" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "oklch(0.72 0.1 75)", borderTopColor: "transparent" }} />
          <span style={{ color: "oklch(0.55 0.01 265)", fontFamily: "'Inter', sans-serif", fontSize: "0.85rem" }}>Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const isAdmin = user?.role === "admin" || user?.role === "manager";
  const filteredNav = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen flex" style={{ background: "#0D0F14", fontFamily: "'Inter', sans-serif" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "oklch(0.12 0.01 265)", borderRight: "1px solid oklch(0.18 0.01 265)" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: "1px solid oklch(0.18 0.01 265)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, oklch(0.62 0.12 75), oklch(0.78 0.1 75))" }}>
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "0.9rem", color: "oklch(0.94 0.005 65)", letterSpacing: "-0.02em" }}>
                Empire Claims
              </div>
              <div style={{ fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "oklch(0.72 0.1 75)", marginTop: "1px" }}>
                Back Office
              </div>
            </div>
          </div>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)} style={{ color: "oklch(0.55 0.01 265)" }}>
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {filteredNav.map(item => {
            const Icon = item.icon;
            const active = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className="flex items-center gap-3 px-3 py-2.5 rounded mb-0.5 cursor-pointer transition-all duration-150"
                  style={{
                    background: active ? "oklch(0.72 0.1 75 / 0.12)" : "transparent",
                    color: active ? "oklch(0.82 0.1 75)" : "oklch(0.6 0.01 265)",
                    borderLeft: active ? "2px solid oklch(0.72 0.1 75)" : "2px solid transparent",
                  }}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={16} />
                  <span style={{ fontSize: "0.85rem", fontWeight: active ? 600 : 400 }}>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="px-4 py-4" style={{ borderTop: "1px solid oklch(0.18 0.01 265)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "oklch(0.72 0.1 75 / 0.2)", color: "oklch(0.82 0.1 75)" }}>
              {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "oklch(0.85 0.01 265)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name ?? "User"}</div>
              <div style={{ fontSize: "0.65rem", color: "oklch(0.72 0.1 75)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{user?.role ?? "user"}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs cursor-pointer transition-colors" style={{ color: "oklch(0.55 0.01 265)", background: "oklch(0.16 0.01 265)" }}>
                <ExternalLink size={12} /> Website
              </div>
            </Link>
            <button
              onClick={() => logout.mutate()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors"
              style={{ color: "oklch(0.55 0.01 265)", background: "oklch(0.16 0.01 265)" }}
            >
              <LogOut size={12} /> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-5 py-4 sticky top-0 z-30" style={{ background: "oklch(0.12 0.01 265 / 0.95)", borderBottom: "1px solid oklch(0.18 0.01 265)", backdropFilter: "blur(8px)" }}>
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setSidebarOpen(true)} style={{ color: "oklch(0.6 0.01 265)" }}>
              <Menu size={20} />
            </button>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "oklch(0.94 0.005 65)" }}>{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div style={{ fontSize: "0.75rem", color: "oklch(0.45 0.01 265)" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
