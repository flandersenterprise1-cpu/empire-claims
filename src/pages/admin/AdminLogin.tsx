import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Eye, EyeOff, Shield, Lock, User, AlertCircle, CheckCircle } from "lucide-react";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "setup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { data: hasSetup, isLoading: checkingSetup } = trpc.credentialAuth.hasSetup.useQuery();

  useEffect(() => {
    if (!checkingSetup && hasSetup === false) {
      setMode("setup");
    }
  }, [hasSetup, checkingSetup]);

  const login = trpc.credentialAuth.login.useMutation({
    onSuccess: (data) => {
      setSuccess(`Welcome back, ${data.name}!`);
      setTimeout(() => navigate("/admin/dashboard"), 800);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const setup = trpc.credentialAuth.setup.useMutation({
    onSuccess: () => {
      setSuccess("Admin account created! Logging you in...");
      login.mutate({ username, password });
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (mode === "setup") {
      if (password !== confirmPassword) { setError("Passwords do not match."); return; }
      if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
      setup.mutate({ username, password, name: name || username });
    } else {
      login.mutate({ username, password });
    }
  };

  const isLoading = login.isPending || setup.isPending || checkingSetup;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem 1rem 0.75rem 2.75rem",
    background: "oklch(0.12 0.008 265)",
    border: "1px solid oklch(0.22 0.01 265)",
    borderRadius: "0.5rem",
    color: "oklch(0.9 0.005 265)",
    fontSize: "0.9rem",
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.72rem",
    fontWeight: 600,
    color: "oklch(0.6 0.01 265)",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    display: "block",
    marginBottom: "0.4rem",
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "oklch(0.08 0.008 265)", fontFamily: "'Inter', sans-serif" }}>
      {/* Background grid */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(oklch(0.15 0.01 265 / 0.25) 1px, transparent 1px), linear-gradient(90deg, oklch(0.15 0.01 265 / 0.25) 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
      }} />

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: "oklch(0.72 0.1 75 / 0.12)", border: "1px solid oklch(0.72 0.1 75 / 0.3)" }}>
            <Shield size={28} style={{ color: "oklch(0.72 0.1 75)" }} />
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.8rem", fontWeight: 700, color: "oklch(0.94 0.005 65)", letterSpacing: "0.02em" }}>
            Empire Claims Group
          </h1>
          <p style={{ fontSize: "0.75rem", color: "oklch(0.45 0.01 265)", marginTop: "0.3rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            {mode === "setup" ? "Initial Setup" : "Staff Portal"}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(0.12 0.008 265)", border: "1px solid oklch(0.2 0.01 265)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.6)" }}>
          {/* Header */}
          <div className="px-8 py-5" style={{ borderBottom: "1px solid oklch(0.18 0.01 265)", background: "oklch(0.14 0.008 265)" }}>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1rem", color: "oklch(0.88 0.01 265)" }}>
              {mode === "setup" ? "Create Administrator Account" : "Sign In"}
            </h2>
            <p style={{ fontSize: "0.78rem", color: "oklch(0.5 0.01 265)", marginTop: "0.2rem" }}>
              {mode === "setup" ? "No accounts exist yet. Create the first admin to get started." : "Enter your credentials to access the back office."}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
            {mode === "setup" && (
              <div>
                <label style={labelStyle}>Full Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "oklch(0.45 0.01 265)" }} />
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = "oklch(0.72 0.1 75)")}
                    onBlur={e => (e.target.style.borderColor = "oklch(0.22 0.01 265)")} />
                </div>
              </div>
            )}

            <div>
              <label style={labelStyle}>Username</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "oklch(0.45 0.01 265)" }} />
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" required autoComplete="username" style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "oklch(0.72 0.1 75)")}
                  onBlur={e => (e.target.style.borderColor = "oklch(0.22 0.01 265)")} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "oklch(0.45 0.01 265)" }} />
                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={mode === "setup" ? "Min. 8 characters" : "Enter password"} required
                  autoComplete={mode === "setup" ? "new-password" : "current-password"}
                  style={{ ...inputStyle, paddingRight: "2.75rem" }}
                  onFocus={e => (e.target.style.borderColor = "oklch(0.72 0.1 75)")}
                  onBlur={e => (e.target.style.borderColor = "oklch(0.22 0.01 265)")} />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "oklch(0.45 0.01 265)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {mode === "setup" && (
              <div>
                <label style={labelStyle}>Confirm Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "oklch(0.45 0.01 265)" }} />
                  <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password" required autoComplete="new-password"
                    style={{ ...inputStyle, paddingRight: "2.75rem" }}
                    onFocus={e => (e.target.style.borderColor = "oklch(0.72 0.1 75)")}
                    onBlur={e => (e.target.style.borderColor = "oklch(0.22 0.01 265)")} />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg" style={{ background: "#EF444415", border: "1px solid #EF444430" }}>
                <AlertCircle size={14} style={{ color: "#EF4444", flexShrink: 0 }} />
                <span style={{ fontSize: "0.82rem", color: "#EF4444" }}>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg" style={{ background: "#22C55E15", border: "1px solid #22C55E30" }}>
                <CheckCircle size={14} style={{ color: "#22C55E", flexShrink: 0 }} />
                <span style={{ fontSize: "0.82rem", color: "#22C55E" }}>{success}</span>
              </div>
            )}

            <button type="submit" disabled={isLoading} className="w-full py-3 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: "oklch(0.72 0.1 75)", color: "#0D0F14", marginTop: "0.5rem" }}>
              {isLoading
                ? (mode === "setup" ? "Creating account..." : "Signing in...")
                : (mode === "setup" ? "Create Admin Account" : "Sign In")}
            </button>
          </form>

          <div className="px-8 py-4 text-center" style={{ borderTop: "1px solid oklch(0.18 0.01 265)", background: "oklch(0.1 0.008 265)" }}>
            <a href="/" style={{ fontSize: "0.75rem", color: "oklch(0.45 0.01 265)" }}>← Return to Website</a>
            <span style={{ fontSize: "0.75rem", color: "oklch(0.3 0.01 265)", margin: "0 0.75rem" }}>·</span>
            <span style={{ fontSize: "0.72rem", color: "oklch(0.35 0.01 265)" }}>Authorized personnel only</span>
          </div>
        </div>
      </div>
    </div>
  );
}
