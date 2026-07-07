import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Shield, UserPlus, Trash2, RefreshCw, Edit2, X, Check, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin: { bg: "oklch(0.72 0.1 75 / 0.15)", text: "oklch(0.82 0.1 75)" },
  manager: { bg: "oklch(0.75 0.15 60 / 0.15)", text: "oklch(0.85 0.15 60)" },
  adjuster: { bg: "oklch(0.65 0.15 230 / 0.15)", text: "oklch(0.75 0.15 230)" },
};

const ROLES = ["admin", "manager", "adjuster"] as const;

export default function AdminSettings() {
  const { user: currentUser } = useAuth();
  const utils = trpc.useUtils();

  // Staff accounts
  const { data: staffUsers, isLoading } = trpc.credentialAuth.listUsers.useQuery();

  // Create user state
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "manager" | "adjuster">("adjuster");
  const [showNewPw, setShowNewPw] = useState(false);

  // Reset password state
  const [resetId, setResetId] = useState<number | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [showResetPw, setShowResetPw] = useState(false);

  const createUser = trpc.credentialAuth.createUser.useMutation({
    onSuccess: () => {
      utils.credentialAuth.listUsers.invalidate();
      toast.success("Staff account created");
      setShowCreate(false);
      setNewUsername(""); setNewPassword(""); setNewName(""); setNewRole("adjuster");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateUser = trpc.credentialAuth.updateUser.useMutation({
    onSuccess: () => { utils.credentialAuth.listUsers.invalidate(); toast.success("Account updated"); },
    onError: (e) => toast.error(e.message),
  });

  const resetPassword = trpc.credentialAuth.resetPassword.useMutation({
    onSuccess: () => {
      utils.credentialAuth.listUsers.invalidate();
      toast.success("Password reset successfully");
      setResetId(null); setResetPw("");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteUser = trpc.credentialAuth.deleteUser.useMutation({
    onSuccess: () => { utils.credentialAuth.listUsers.invalidate(); toast.success("Account removed"); },
    onError: (e) => toast.error(e.message),
  });

  const inputStyle: React.CSSProperties = {
    background: "oklch(0.1 0.008 265)",
    border: "1px solid oklch(0.22 0.01 265)",
    color: "oklch(0.85 0.01 265)",
    borderRadius: "6px",
    padding: "0.55rem 0.75rem",
    fontSize: "0.82rem",
    outline: "none",
    width: "100%",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: "pointer",
  };

  return (
    <AdminLayout title="Settings">
      <div className="max-w-3xl space-y-6">

        {/* Staff Account Management */}
        <div className="rounded-xl overflow-hidden" style={{ background: "oklch(0.14 0.01 265)", border: "1px solid oklch(0.2 0.01 265)" }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid oklch(0.2 0.01 265)" }}>
            <div className="flex items-center gap-3">
              <Shield size={18} style={{ color: "oklch(0.72 0.1 75)" }} />
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "oklch(0.94 0.005 65)" }}>
                Staff Accounts
              </h3>
            </div>
            <button
              onClick={() => setShowCreate(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ background: "oklch(0.72 0.1 75)", color: "#0D0F14" }}
            >
              <UserPlus size={13} />
              Add Staff
            </button>
          </div>

          {/* Create form */}
          {showCreate && (
            <div className="px-5 py-4" style={{ borderBottom: "1px solid oklch(0.18 0.01 265)", background: "oklch(0.12 0.01 265)" }}>
              <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "oklch(0.72 0.1 75)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                New Staff Account
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: "0.7rem", color: "oklch(0.55 0.01 265)", display: "block", marginBottom: "0.3rem" }}>Full Name</label>
                  <input style={inputStyle} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Jane Smith" />
                </div>
                <div>
                  <label style={{ fontSize: "0.7rem", color: "oklch(0.55 0.01 265)", display: "block", marginBottom: "0.3rem" }}>Username</label>
                  <input style={inputStyle} value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="jsmith" />
                </div>
                <div className="relative">
                  <label style={{ fontSize: "0.7rem", color: "oklch(0.55 0.01 265)", display: "block", marginBottom: "0.3rem" }}>Password</label>
                  <input
                    type={showNewPw ? "text" : "password"}
                    style={{ ...inputStyle, paddingRight: "2.25rem" }}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                  />
                  <button type="button" onClick={() => setShowNewPw(v => !v)} className="absolute right-2 bottom-2" style={{ color: "oklch(0.45 0.01 265)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    {showNewPw ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                <div>
                  <label style={{ fontSize: "0.7rem", color: "oklch(0.55 0.01 265)", display: "block", marginBottom: "0.3rem" }}>Role</label>
                  <select style={selectStyle} value={newRole} onChange={e => setNewRole(e.target.value as any)}>
                    {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    if (!newUsername || !newPassword) { toast.error("Username and password required"); return; }
                    createUser.mutate({ username: newUsername, password: newPassword, name: newName || newUsername, role: newRole });
                  }}
                  disabled={createUser.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ background: "oklch(0.72 0.1 75)", color: "#0D0F14" }}
                >
                  {createUser.isPending ? "Creating..." : "Create Account"}
                </button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-xs font-semibold" style={{ background: "oklch(0.18 0.01 265)", color: "oklch(0.7 0.01 265)" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Staff list */}
          <div className="px-5 py-4">
            {isLoading ? (
              <div style={{ color: "oklch(0.5 0.01 265)", fontSize: "0.85rem" }}>Loading accounts...</div>
            ) : (staffUsers ?? []).length === 0 ? (
              <div style={{ color: "oklch(0.5 0.01 265)", fontSize: "0.85rem" }}>No staff accounts found.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {(staffUsers ?? []).map((u: any) => {
                  const rc = ROLE_COLORS[u.role] ?? ROLE_COLORS["adjuster"];
                  const isMe = u.id === currentUser?.id;
                  const isResetting = resetId === u.id;

                  return (
                    <div key={u.id} className="rounded-lg p-3" style={{ background: "oklch(0.12 0.01 265)", border: "1px solid oklch(0.18 0.01 265)" }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "oklch(0.72 0.1 75 / 0.15)", color: "oklch(0.82 0.1 75)" }}>
                            {(u.name ?? u.username ?? "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "oklch(0.9 0.005 65)" }}>
                                {u.name ?? u.username}
                              </span>
                              {isMe && <span style={{ fontSize: "0.62rem", color: "oklch(0.72 0.1 75)", background: "oklch(0.72 0.1 75 / 0.12)", padding: "0 0.4rem", borderRadius: "4px" }}>you</span>}
                              {!u.isActive && <span style={{ fontSize: "0.62rem", color: "#EF4444", background: "#EF444415", padding: "0 0.4rem", borderRadius: "4px" }}>inactive</span>}
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "oklch(0.5 0.01 265)" }}>@{u.username}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Role badge + change */}
                          <select
                            value={u.role}
                            onChange={e => updateUser.mutate({ id: u.id, role: e.target.value as any })}
                            style={{ ...selectStyle, width: "auto", padding: "0.3rem 0.5rem", fontSize: "0.72rem", background: rc.bg, color: rc.text, border: "none" }}
                          >
                            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                          </select>

                          {/* Active toggle */}
                          <button
                            onClick={() => updateUser.mutate({ id: u.id, isActive: !u.isActive })}
                            title={u.isActive ? "Deactivate" : "Activate"}
                            className="p-1.5 rounded transition-opacity hover:opacity-70"
                            style={{ background: "oklch(0.18 0.01 265)", color: u.isActive ? "#22C55E" : "#EF4444" }}
                          >
                            {u.isActive ? <Check size={13} /> : <X size={13} />}
                          </button>

                          {/* Reset password */}
                          <button
                            onClick={() => { setResetId(u.id); setResetPw(""); }}
                            title="Reset password"
                            className="p-1.5 rounded transition-opacity hover:opacity-70"
                            style={{ background: "oklch(0.18 0.01 265)", color: "oklch(0.65 0.15 230)" }}
                          >
                            <RefreshCw size={13} />
                          </button>

                          {/* Delete */}
                          {!isMe && (
                            <button
                              onClick={() => { if (confirm(`Remove ${u.name ?? u.username}?`)) deleteUser.mutate({ id: u.id }); }}
                              title="Delete account"
                              className="p-1.5 rounded transition-opacity hover:opacity-70"
                              style={{ background: "oklch(0.18 0.01 265)", color: "#EF4444" }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Reset password inline form */}
                      {isResetting && (
                        <div className="mt-3 flex items-center gap-2" style={{ borderTop: "1px solid oklch(0.18 0.01 265)", paddingTop: "0.75rem" }}>
                          <div className="relative flex-1">
                            <input
                              type={showResetPw ? "text" : "password"}
                              value={resetPw}
                              onChange={e => setResetPw(e.target.value)}
                              placeholder="New password (min. 8 chars)"
                              style={{ ...inputStyle, paddingRight: "2.25rem" }}
                            />
                            <button type="button" onClick={() => setShowResetPw(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: "oklch(0.45 0.01 265)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                              {showResetPw ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          </div>
                          <button
                            onClick={() => {
                              if (resetPw.length < 8) { toast.error("Min. 8 characters"); return; }
                              resetPassword.mutate({ id: u.id, newPassword: resetPw });
                            }}
                            disabled={resetPassword.isPending}
                            className="px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                            style={{ background: "oklch(0.72 0.1 75)", color: "#0D0F14", whiteSpace: "nowrap" }}
                          >
                            {resetPassword.isPending ? "Saving..." : "Set Password"}
                          </button>
                          <button onClick={() => setResetId(null)} className="px-3 py-2 rounded-lg text-xs" style={{ background: "oklch(0.18 0.01 265)", color: "oklch(0.6 0.01 265)" }}>
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Info card */}
        <div className="rounded-xl p-5" style={{ background: "oklch(0.72 0.1 75 / 0.06)", border: "1px solid oklch(0.72 0.1 75 / 0.2)" }}>
          <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.85rem", color: "oklch(0.82 0.1 75)", marginBottom: "0.5rem" }}>Role Permissions</h4>
          <div className="space-y-1.5">
            {[
              { role: "Admin", desc: "Full access to all features including staff management and settings." },
              { role: "Manager", desc: "Manage claims, adjusters, and form submissions. Cannot manage staff accounts." },
              { role: "Adjuster", desc: "View and update assigned claims, add notes, complete inspections and tasks." },
            ].map(({ role, desc }) => (
              <div key={role} className="flex gap-2" style={{ fontSize: "0.78rem" }}>
                <span style={{ color: "oklch(0.82 0.1 75)", fontWeight: 600, minWidth: "5rem" }}>{role}</span>
                <span style={{ color: "oklch(0.6 0.01 265)" }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
