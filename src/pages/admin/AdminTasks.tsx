import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Plus, X, CheckCircle, Circle } from "lucide-react";
import { toast } from "sonner";

const PRIORITY_COLORS: Record<string, string> = {
  "Low": "#6B7280", "Medium": "#3B82F6", "High": "#F97316", "Urgent": "#EF4444",
};

const inputStyle = {
  background: "oklch(0.12 0.01 265)", border: "1px solid oklch(0.22 0.01 265)",
  borderRadius: "6px", color: "oklch(0.88 0.01 265)", padding: "0.5rem 0.75rem",
  fontSize: "0.82rem", width: "100%", outline: "none",
};
const labelStyle = { fontSize: "0.75rem", color: "oklch(0.55 0.01 265)", display: "block", marginBottom: "4px" };

export default function AdminTasks() {
  const utils = trpc.useUtils();
  const [showCreate, setShowCreate] = useState(false);
  const [filterCompleted, setFilterCompleted] = useState<"all" | "open" | "done">("open");
  const [form, setForm] = useState({
    title: "", description: "", priority: "Medium",
    dueDate: "", claimId: "", assignedAdjusterId: "",
  });

  const { data: tasks, isLoading } = trpc.tasks.list.useQuery({
    isCompleted: filterCompleted === "all" ? undefined : filterCompleted === "done",
  });
  const { data: claims } = trpc.claims.list.useQuery({});
  const { data: adjusters } = trpc.adjusters.list.useQuery();

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      setShowCreate(false);
      setForm({ title: "", description: "", priority: "Medium", dueDate: "", claimId: "", assignedAdjusterId: "" });
      toast.success("Task created");
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleTask = trpc.tasks.update.useMutation({
    onSuccess: () => { utils.tasks.list.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleCreate = () => {
    if (!form.title.trim()) return toast.error("Title is required");
    createTask.mutate({
      title: form.title,
      description: form.description || undefined,
      priority: form.priority as any,
      dueDate: form.dueDate || undefined,
      claimId: form.claimId ? parseInt(form.claimId) : undefined,
      assignedAdjusterId: form.assignedAdjusterId ? parseInt(form.assignedAdjusterId) : undefined,
    });
  };

  const allTasks = tasks ?? [];
  const overdue = allTasks.filter((t: any) => !t.isCompleted && t.dueDate && new Date(t.dueDate) < new Date());
  const today = allTasks.filter((t: any) => !t.isCompleted && t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString());
  const upcoming = allTasks.filter((t: any) => !t.isCompleted && (!t.dueDate || (new Date(t.dueDate) > new Date() && new Date(t.dueDate).toDateString() !== new Date().toDateString())));
  const done = allTasks.filter((t: any) => t.isCompleted);

  const renderTask = (task: any) => (
    <div key={task.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors" style={{ borderBottom: "1px solid oklch(0.18 0.01 265)" }}>
      <button onClick={() => toggleTask.mutate({ id: task.id, isCompleted: !task.isCompleted })} className="mt-0.5 flex-shrink-0">
        {task.isCompleted
          ? <CheckCircle size={18} style={{ color: "#22C55E" }} />
          : <Circle size={18} style={{ color: "oklch(0.4 0.01 265)" }} />
        }
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ fontSize: "0.85rem", fontWeight: 500, color: task.isCompleted ? "oklch(0.45 0.01 265)" : "oklch(0.88 0.01 265)", textDecoration: task.isCompleted ? "line-through" : "none" }}>
            {task.title}
          </span>
          <span style={{ fontSize: "0.7rem", fontWeight: 600, color: PRIORITY_COLORS[task.priority] ?? "#6B7280" }}>{task.priority}</span>
        </div>
        {task.description && (
          <div style={{ fontSize: "0.75rem", color: "oklch(0.5 0.01 265)", marginTop: "2px" }}>{task.description}</div>
        )}
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {task.dueDate && (
            <span style={{ fontSize: "0.72rem", color: !task.isCompleted && new Date(task.dueDate) < new Date() ? "#EF4444" : "oklch(0.5 0.01 265)" }}>
              Due: {task.dueDate}
            </span>
          )}
          {task.claimId && (
            <span style={{ fontSize: "0.72rem", color: "oklch(0.72 0.1 75)" }}>
              Claim #{claims?.find((c: any) => c.id === task.claimId)?.claimNumber ?? task.claimId}
            </span>
          )}
          {task.assignedAdjusterId && (
            <span style={{ fontSize: "0.72rem", color: "oklch(0.55 0.01 265)" }}>
              → {adjusters?.find((a: any) => a.id === task.assignedAdjusterId)?.name ?? "Adjuster"}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <AdminLayout title="Tasks">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid oklch(0.22 0.01 265)" }}>
            {(["open", "all", "done"] as const).map(f => (
              <button key={f} onClick={() => setFilterCompleted(f)}
                className="px-4 py-2 text-sm capitalize transition-colors"
                style={{
                  background: filterCompleted === f ? "oklch(0.72 0.1 75)" : "oklch(0.14 0.01 265)",
                  color: filterCompleted === f ? "#0D0F14" : "oklch(0.6 0.01 265)",
                  fontWeight: filterCompleted === f ? 600 : 400,
                }}>
                {f === "open" ? "Open" : f === "all" ? "All" : "Completed"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
            style={{ background: "oklch(0.72 0.1 75)", color: "#0D0F14" }}
          >
            <Plus size={16} /> New Task
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12" style={{ color: "oklch(0.45 0.01 265)" }}>Loading...</div>
        ) : !allTasks.length ? (
          <div className="text-center py-12" style={{ color: "oklch(0.45 0.01 265)", fontSize: "0.85rem" }}>No tasks found.</div>
        ) : (
          <div className="space-y-4">
            {overdue.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ background: "oklch(0.14 0.01 265)", border: "1px solid #EF444430" }}>
                <div className="px-4 py-2.5" style={{ background: "#EF444415", borderBottom: "1px solid #EF444430" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#EF4444", textTransform: "uppercase", letterSpacing: "0.08em" }}>Overdue ({overdue.length})</span>
                </div>
                {overdue.map(renderTask)}
              </div>
            )}
            {today.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ background: "oklch(0.14 0.01 265)", border: "1px solid #F59E0B30" }}>
                <div className="px-4 py-2.5" style={{ background: "#F59E0B15", borderBottom: "1px solid #F59E0B30" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#F59E0B", textTransform: "uppercase", letterSpacing: "0.08em" }}>Due Today ({today.length})</span>
                </div>
                {today.map(renderTask)}
              </div>
            )}
            {upcoming.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ background: "oklch(0.14 0.01 265)", border: "1px solid oklch(0.2 0.01 265)" }}>
                <div className="px-4 py-2.5" style={{ borderBottom: "1px solid oklch(0.2 0.01 265)" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "oklch(0.6 0.01 265)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Upcoming ({upcoming.length})</span>
                </div>
                {upcoming.map(renderTask)}
              </div>
            )}
            {filterCompleted !== "open" && done.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ background: "oklch(0.14 0.01 265)", border: "1px solid oklch(0.2 0.01 265)", opacity: 0.7 }}>
                <div className="px-4 py-2.5" style={{ borderBottom: "1px solid oklch(0.2 0.01 265)" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#22C55E", textTransform: "uppercase", letterSpacing: "0.08em" }}>Completed ({done.length})</span>
                </div>
                {done.map(renderTask)}
              </div>
            )}
          </div>
        )}

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
            <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: "oklch(0.14 0.01 265)", border: "1px solid oklch(0.22 0.01 265)" }}>
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid oklch(0.2 0.01 265)" }}>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1rem", color: "oklch(0.94 0.005 65)" }}>New Task</h2>
                <button onClick={() => setShowCreate(false)} style={{ color: "oklch(0.55 0.01 265)" }}><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label style={labelStyle}>Title *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} placeholder="Task description" />
                </div>
                <div>
                  <label style={labelStyle}>Notes</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ ...inputStyle, height: "60px", resize: "none" }} placeholder="Additional details..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelStyle}>Priority</label>
                    <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={inputStyle}>
                      {["Low", "Medium", "High", "Urgent"].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Due Date</label>
                    <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Related Claim</label>
                  <select value={form.claimId} onChange={e => setForm(f => ({ ...f, claimId: e.target.value }))} style={inputStyle}>
                    <option value="">None</option>
                    {(claims ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.clientName} — #{c.claimNumber}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Assign To</label>
                  <select value={form.assignedAdjusterId} onChange={e => setForm(f => ({ ...f, assignedAdjusterId: e.target.value }))} style={inputStyle}>
                    <option value="">Unassigned</option>
                    {(adjusters ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm" style={{ background: "oklch(0.18 0.01 265)", color: "oklch(0.65 0.01 265)" }}>Cancel</button>
                  <button onClick={handleCreate} disabled={createTask.isPending} className="px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90" style={{ background: "oklch(0.72 0.1 75)", color: "#0D0F14" }}>
                    {createTask.isPending ? "Creating..." : "Create Task"}
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
