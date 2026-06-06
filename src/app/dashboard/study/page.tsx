"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface Session { id: string; subject: string; duration: number; started_at: number; }
interface Goal { id: string; title: string; subject: string; target_minutes: number; current_minutes: number; completed: boolean; }

function fmtDate(ts: number | string | null | undefined): string {
  if (!ts) return "";
  return new Date(Number(ts)).toLocaleDateString("ko-KR");
}

const WORK_MINS = 25;
const BREAK_MINS = 5;

export default function StudyPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [subject, setSubject] = useState("");
  const [timerState, setTimerState] = useState<"idle" | "work" | "break">("idle");
  const [seconds, setSeconds] = useState(WORK_MINS * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Goal form
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: "", subject: "", target_minutes: 60 });

  useEffect(() => {
    fetch("/api/v1/study/sessions").then(r => r.json()).then(d => { if (d.sessions) setSessions(d.sessions); });
    fetch("/api/v1/study/goals").then(r => r.json()).then(d => { if (d.goals) setGoals(d.goals); });
  }, []);

  const tick = useCallback(() => {
    setSeconds(s => {
      if (s <= 1) {
        setIsRunning(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        return 0;
      }
      return s - 1;
    });
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, tick]);

  function start() {
    if (!subject.trim()) { alert("과목을 입력하세요."); return; }
    setTimerState("work");
    setSeconds(WORK_MINS * 60);
    setIsRunning(true);
    setSessionStart(Date.now());
  }

  function pause() { setIsRunning(!isRunning); }

  async function finish() {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (sessionStart) {
      const ended_at = Date.now();
      const duration = Math.floor((ended_at - sessionStart) / 1000 / 60);
      if (duration > 0) {
        const r = await fetch("/api/v1/study/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, duration, started_at: sessionStart, ended_at }),
        });
        const d = await r.json();
        if (d.session) setSessions(prev => [d.session, ...prev]);
      }
    }
    setTimerState("idle");
    setSeconds(WORK_MINS * 60);
    setSessionStart(null);
  }

  async function createGoal() {
    const r = await fetch("/api/v1/study/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newGoal),
    });
    const d = await r.json();
    if (d.goal) { setGoals(prev => [d.goal, ...prev]); setShowGoalForm(false); setNewGoal({ title: "", subject: "", target_minutes: 60 }); }
  }

  async function deleteGoal(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/v1/study/goals/${id}`, { method: "DELETE" });
    setGoals(prev => prev.filter(g => g.id !== id));
  }

  const totalSecs = timerState === "break" ? BREAK_MINS * 60 : WORK_MINS * 60;
  const progress = 1 - seconds / totalSecs;
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div style={{ padding: "32px", maxWidth: "900px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "24px" }}>KRL Study</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
        {/* Pomodoro timer */}
        <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "16px", padding: "32px", textAlign: "center" }}>
          <h3 style={{ fontWeight: 600, marginBottom: "20px" }}>포모도로 타이머</h3>
          {timerState === "idle" && (
            <div style={{ marginBottom: "16px" }}>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="과목 입력..." style={{ padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: "8px", fontSize: "0.9375rem", background: "var(--color-surface)", color: "var(--color-ink)", width: "100%", textAlign: "center", marginBottom: "12px" }} />
            </div>
          )}
          {/* Circular progress */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
            <svg width="200" height="200" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r={radius} fill="none" stroke="var(--color-hairline)" strokeWidth="8" />
              <circle cx="100" cy="100" r={radius} fill="none" stroke={timerState === "break" ? "#10b981" : "var(--color-accent)"} strokeWidth="8" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - progress)} transform="rotate(-90 100 100)" strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.5s" }} />
              <text x="100" y="95" textAnchor="middle" fontSize="32" fontWeight="700" fill="var(--color-ink)">{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}</text>
              <text x="100" y="120" textAnchor="middle" fontSize="14" fill="var(--color-muted)">{timerState === "break" ? "휴식" : timerState === "work" ? subject || "공부 중" : "대기"}</text>
            </svg>
          </div>
          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
            {timerState === "idle" ? (
              <button onClick={start} style={{ padding: "10px 28px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 600 }}>시작</button>
            ) : (
              <>
                <button onClick={pause} style={{ padding: "10px 20px", background: isRunning ? "var(--color-surface)" : "var(--color-accent)", color: isRunning ? "var(--color-ink)" : "white", border: "1px solid var(--color-hairline)", borderRadius: "10px", cursor: "pointer", fontWeight: 600 }}>
                  {isRunning ? "일시정지" : "재개"}
                </button>
                <button onClick={finish} style={{ padding: "10px 20px", background: "#ef4444", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 600 }}>종료</button>
              </>
            )}
          </div>
        </div>

        {/* Goals */}
        <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "16px", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontWeight: 600 }}>학습 목표</h3>
            <button onClick={() => setShowGoalForm(!showGoalForm)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-accent)", fontWeight: 600, fontSize: "0.875rem" }}>+ 추가</button>
          </div>
          {showGoalForm && (
            <div style={{ background: "var(--color-surface)", borderRadius: "8px", padding: "12px", marginBottom: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <input value={newGoal.title} onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))} placeholder="목표 이름" style={{ padding: "6px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.875rem", background: "var(--color-lifted)", color: "var(--color-ink)" }} />
              <input value={newGoal.subject} onChange={e => setNewGoal(p => ({ ...p, subject: e.target.value }))} placeholder="과목" style={{ padding: "6px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.875rem", background: "var(--color-lifted)", color: "var(--color-ink)" }} />
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <label style={{ fontSize: "0.8125rem" }}>목표:</label>
                <input type="number" value={newGoal.target_minutes} onChange={e => setNewGoal(p => ({ ...p, target_minutes: Number(e.target.value) }))} style={{ width: "70px", padding: "4px 8px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.875rem", background: "var(--color-lifted)", color: "var(--color-ink)" }} />
                <span style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>분</span>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={createGoal} style={{ padding: "6px 12px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.8125rem" }}>추가</button>
                <button onClick={() => setShowGoalForm(false)} style={{ padding: "6px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", background: "transparent", cursor: "pointer", fontSize: "0.8125rem" }}>취소</button>
              </div>
            </div>
          )}
          {goals.length === 0 ? <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>목표가 없습니다.</p> : goals.map(g => (
            <div key={g.id} style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", alignItems: "center" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{g.title}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>{g.current_minutes}/{g.target_minutes}분</span>
                  <button onClick={() => deleteGoal(g.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "2px", fontSize: "0.8rem", lineHeight: 1 }}>✕</button>
                </div>
              </div>
              <div style={{ height: "6px", background: "var(--color-hairline)", borderRadius: "99px", overflow: "hidden" }}>
                <div style={{ height: "100%", background: g.completed ? "#10b981" : "var(--color-accent)", width: `${Math.min(100, (g.current_minutes / g.target_minutes) * 100)}%`, transition: "width 0.3s" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Session history */}
      <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "16px", padding: "24px" }}>
        <h3 style={{ fontWeight: 600, marginBottom: "16px" }}>학습 기록</h3>
        {sessions.length === 0 ? <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>기록이 없습니다.</p> : sessions.slice(0, 10).map(s => (
          <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--color-hairline)" }}>
            <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{s.subject}</span>
            <span style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>{s.duration}분 · {fmtDate(s.started_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
