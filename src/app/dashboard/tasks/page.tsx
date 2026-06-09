"use client";
import { useState, useEffect, useCallback } from "react";

interface Project { id: string; name: string; color: string; }
interface Task { id: string; title: string; description: string; status: string; priority: string; due_date: string | null; project_id: string | null; }

function fmtDate(ts: number | string | null | undefined): string {
  if (!ts) return "";
  return new Date(Number(ts)).toLocaleDateString("ko-KR");
}

const PRIORITIES: Record<string, { label: string; color: string }> = {
  low: { label: "낮음", color: "#10b981" },
  medium: { label: "보통", color: "#f59e0b" },
  high: { label: "높음", color: "#ef4444" },
  urgent: { label: "긴급", color: "#7c3aed" },
};

const STATUSES = [
  { key: "todo", label: "할 일" },
  { key: "in_progress", label: "진행 중" },
  { key: "done", label: "완료" },
];

export default function TasksPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", priority: "medium", due_date: "" });
  const [newProjectName, setNewProjectName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadProjects = useCallback(async () => {
    const r = await fetch("/api/v1/tasks/projects");
    const d = await r.json();
    if (d.projects) setProjects(d.projects);
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    let url = "/api/v1/tasks?";
    if (selectedProject) url += `project_id=${selectedProject}`;
    const r = await fetch(url);
    const d = await r.json();
    if (d.tasks) setTasks(d.tasks);
    setLoading(false);
  }, [selectedProject]);

  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => { loadTasks(); }, [loadTasks]);

  async function createTask() {
    if (!newTask.title.trim() || submitting) return;
    setSubmitting(true);
    const r = await fetch("/api/v1/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newTask, project_id: selectedProject, due_date: newTask.due_date || null }),
    });
    const d = await r.json();
    if (d.task) {
      setTasks(prev => [d.task, ...prev]);
      setNewTask({ title: "", priority: "medium", due_date: "" });
      setShowNewTask(false);
    } else {
      alert(d.error || "오류가 발생했습니다");
    }
    setSubmitting(false);
  }

  async function updateStatus(task: Task, status: string) {
    const r = await fetch(`/api/v1/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const d = await r.json();
    if (d.task) setTasks(prev => prev.map(t => t.id === d.task.id ? d.task : t));
  }

  async function deleteTask(id: string) {
    await fetch(`/api/v1/tasks/${id}`, { method: "DELETE" });
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  async function createProject() {
    if (!newProjectName.trim()) return;
    const r = await fetch("/api/v1/tasks/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newProjectName }),
    });
    const d = await r.json();
    if (d.project) { setProjects(prev => [...prev, d.project]); setNewProjectName(""); setShowNewProject(false); }
  }

  return (
    <div className="tasks-page" style={{ display: "flex", height: "calc(100vh - 54px)", overflow: "hidden" }}>
      <style>{`
        @media (max-width: 768px) {
          .tasks-page { flex-direction: column; height: auto; min-height: calc(100dvh - 54px - 60px); overflow: visible; }
          .tasks-sidebar { width: 100% !important; border-right: none !important; border-bottom: 1px solid var(--color-hairline); flex-direction: row !important; overflow-x: auto; padding: 8px 12px !important; display: flex !important; align-items: center; gap: 6px; white-space: nowrap; }
          .tasks-sidebar-header { display: none !important; }
          .tasks-project-item { white-space: nowrap; border-radius: 20px !important; padding: 6px 12px !important; font-size: 0.8125rem; }
          .tasks-main { flex: 1; overflow-y: auto; padding: 16px !important; }
          .tasks-new-row { flex-direction: column !important; gap: 10px !important; }
          .tasks-new-row select,
          .tasks-new-row input[type="date"] { width: 100% !important; }
          .task-item { flex-wrap: wrap; gap: 8px !important; }
        }
      `}</style>

      {/* Sidebar */}
      <div className="tasks-sidebar" style={{ width: "200px", borderRight: "1px solid var(--color-hairline)", padding: "16px 0", flexShrink: 0, overflowY: "auto" }}>
        <div className="tasks-sidebar-header" style={{ padding: "0 16px 8px", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-muted)" }}>프로젝트</span>
          <button onClick={() => setShowNewProject(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: "1.1rem" }}>+</button>
        </div>
        {showNewProject && (
          <div style={{ padding: "4px 16px 8px", display: "flex", gap: "4px" }}>
            <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} onKeyDown={e => e.key === "Enter" && createProject()} placeholder="프로젝트" style={{ flex: 1, padding: "4px 6px", border: "1px solid var(--color-hairline)", borderRadius: "4px", fontSize: "0.8125rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
            <button onClick={createProject} style={{ padding: "4px 8px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.8125rem" }}>+</button>
          </div>
        )}
        {[{ id: null as string | null, name: "전체", color: "#6366f1" }, ...projects.map(p => ({ ...p, id: p.id as string | null }))].map(p => (
          <div key={p.id ?? "all"} className="tasks-project-item" onClick={() => setSelectedProject(p.id)} style={{ padding: "8px 16px", cursor: "pointer", fontSize: "0.875rem", fontWeight: selectedProject === p.id ? 600 : 400, background: selectedProject === p.id ? "var(--color-surface-card)" : "transparent", display: "flex", alignItems: "center", gap: "8px", borderRadius: 0 }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: p.color, flexShrink: 0 }} />
            {p.name}
          </div>
        ))}
      </div>

      {/* Main */}
      <div className="tasks-main" style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", gap: "12px" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>할 일 목록</h1>
          <button onClick={() => setShowNewTask(true)} style={{ padding: "8px 16px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.875rem", whiteSpace: "nowrap" }}>+ 새 할 일</button>
        </div>

        {showNewTask && (
          <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "12px", padding: "16px", marginBottom: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} placeholder="할 일 제목" style={{ padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: "8px", fontSize: "0.9375rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
              <div className="tasks-new-row" style={{ display: "flex", gap: "8px" }}>
                <select value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))} style={{ padding: "6px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.875rem", background: "var(--color-surface)", color: "var(--color-ink)" }}>
                  {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <input type="date" value={newTask.due_date} onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))} style={{ padding: "6px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.875rem", background: "var(--color-surface)", color: "var(--color-ink)", flex: 1 }} />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={createTask} disabled={submitting} style={{ padding: "6px 16px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", opacity: submitting ? 0.7 : 1 }}>{submitting ? "추가 중..." : "추가"}</button>
                  <button onClick={() => setShowNewTask(false)} style={{ padding: "6px 12px", background: "var(--color-surface)", border: "1px solid var(--color-hairline)", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem" }}>취소</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {STATUSES.map(({ key, label }) => {
          const statusTasks = tasks.filter(t => t.status === key);
          if (statusTasks.length === 0 && key === "done") return null;
          return (
            <div key={key} style={{ marginBottom: "32px" }}>
              <h3 style={{ fontSize: "0.875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-muted)", marginBottom: "12px" }}>
                {label} ({statusTasks.length})
              </h3>
              {loading ? <div style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>로딩 중...</div> : statusTasks.length === 0 ? (
                <div style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>없음</div>
              ) : statusTasks.map(task => (
                <div key={task.id} className="task-item" style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "10px", padding: "12px 16px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <input type="checkbox" checked={task.status === "done"} onChange={() => updateStatus(task, task.status === "done" ? "todo" : "done")} style={{ width: "16px", height: "16px", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: "0.9375rem", textDecoration: task.status === "done" ? "line-through" : "none", color: task.status === "done" ? "var(--color-muted)" : "var(--color-ink)" }}>{task.title}</span>
                    {task.due_date && <span style={{ marginLeft: "8px", fontSize: "0.75rem", color: "var(--color-muted)" }}>마감: {fmtDate(task.due_date)}</span>}
                  </div>
                  <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "99px", background: `${PRIORITIES[task.priority]?.color}20`, color: PRIORITIES[task.priority]?.color, fontWeight: 600, flexShrink: 0 }}>
                    {PRIORITIES[task.priority]?.label}
                  </span>
                  {task.status === "todo" && (
                    <button onClick={() => updateStatus(task, "in_progress")} style={{ fontSize: "0.75rem", padding: "4px 8px", background: "var(--color-surface)", border: "1px solid var(--color-hairline)", borderRadius: "6px", cursor: "pointer", flexShrink: 0 }}>시작</button>
                  )}
                  <button onClick={() => deleteTask(task.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: "0.875rem", padding: "4px", flexShrink: 0 }}>✕</button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
