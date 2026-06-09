"use client";
import { useState, useEffect, useCallback } from "react";

interface CalEvent { id: string; title: string; start_at: number; end_at: number; all_day: boolean; color: string; description?: string; location?: string; }

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function CalendarPage() {
  const [today] = useState(new Date());
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [editMode, setEditMode] = useState<"create" | "detail">("create");
  const [newEvent, setNewEvent] = useState({ title: "", start_at: "", end_at: "", all_day: false, color: "#6366f1", description: "", location: "" });
  const [submitting, setSubmitting] = useState(false);

  const loadEvents = useCallback(async () => {
    const start = current.getTime();
    const end = new Date(current.getFullYear(), current.getMonth() + 1, 0).getTime() + 86400000;
    const r = await fetch(`/api/v1/calendar?start=${start}&end=${end}`);
    const d = await r.json();
    if (d.events) setEvents(d.events.map((e: CalEvent) => ({ ...e, start_at: Number(e.start_at), end_at: Number(e.end_at) })));
  }, [current]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  function prevMonth() { setCurrent(new Date(current.getFullYear(), current.getMonth() - 1, 1)); }
  function nextMonth() { setCurrent(new Date(current.getFullYear(), current.getMonth() + 1, 1)); }

  function getDaysInMonth() {
    const year = current.getFullYear();
    const month = current.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }

  function getEventsForDay(date: Date) {
    const start = date.getTime();
    const end = start + 86400000;
    return events.filter(e => e.start_at < end && e.end_at >= start);
  }

  async function createEvent() {
    if (submitting || !newEvent.title || !newEvent.start_at) return;
    setSubmitting(true);
    try {
      const start_at = new Date(newEvent.start_at).getTime();
      const end_at = newEvent.end_at ? new Date(newEvent.end_at).getTime() : start_at + 3600000;
      const r = await fetch("/api/v1/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newEvent, start_at, end_at }),
      });
      const d = await r.json();
      if (d.event) {
        setEvents(prev => [...prev, { ...d.event, start_at: Number(d.event.start_at), end_at: Number(d.event.end_at) }]);
        setShowModal(false);
        setNewEvent({ title: "", start_at: "", end_at: "", all_day: false, color: "#6366f1", description: "", location: "" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function updateEvent() {
    if (!selectedEvent || submitting) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/v1/calendar/${selectedEvent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: selectedEvent.title,
          color: selectedEvent.color,
          description: selectedEvent.description,
          location: selectedEvent.location,
        }),
      });
      const d = await r.json();
      if (d.event) {
        setEvents(prev => prev.map(e => e.id === d.event.id ? { ...d.event, start_at: Number(d.event.start_at), end_at: Number(d.event.end_at) } : e));
        setShowModal(false);
        setSelectedEvent(null);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteEvent(id: string) {
    if (!confirm("일정을 삭제하시겠습니까?")) return;
    await fetch(`/api/v1/calendar/${id}`, { method: "DELETE" });
    setEvents(prev => prev.filter(e => e.id !== id));
    setShowModal(false);
    setSelectedEvent(null);
  }

  function openCreateModal(date?: Date) {
    setEditMode("create");
    setSelectedEvent(null);
    const dateStr = date ? date.toISOString().slice(0, 16) : "";
    setNewEvent(p => ({ ...p, start_at: dateStr }));
    setShowModal(true);
  }

  function openEventDetail(event: CalEvent, e: React.MouseEvent) {
    e.stopPropagation();
    setEditMode("detail");
    setSelectedEvent({ ...event });
    setShowModal(true);
  }

  const cells = getDaysInMonth();

  return (
    <div style={{ padding: "24px", maxWidth: "900px" }}>
      <style>{`
        @media (max-width: 768px) {
          .cal-header { flex-direction: column; align-items: flex-start !important; gap: 10px !important; }
          .cal-header-add { width: 100%; }
          .cal-day-header { font-size: 0.6875rem !important; padding: 5px 0 !important; }
          .cal-cell { min-height: 60px !important; padding: 3px !important; }
          .cal-event-chip { font-size: 0.6rem !important; padding: 1px 3px !important; }
          .cal-day-num { width: 20px !important; height: 20px !important; font-size: 0.75rem !important; }
          .cal-modal-inner { width: calc(100vw - 32px) !important; padding: 18px !important; }
          .cal-datetime-row { flex-direction: column !important; }
        }
        @media (max-width: 480px) {
          .cal-cell { min-height: 48px !important; }
        }
      `}</style>
      {/* Header */}
      <div className="cal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={prevMonth} style={{ padding: "6px 12px", border: "1px solid var(--color-hairline)", borderRadius: "6px", background: "var(--color-surface)", cursor: "pointer" }}>‹</button>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{current.getFullYear()}년 {current.getMonth() + 1}월</h2>
          <button onClick={nextMonth} style={{ padding: "6px 12px", border: "1px solid var(--color-hairline)", borderRadius: "6px", background: "var(--color-surface)", cursor: "pointer" }}>›</button>
          <button onClick={() => setCurrent(new Date(today.getFullYear(), today.getMonth(), 1))} style={{ padding: "6px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", background: "var(--color-surface)", cursor: "pointer", fontSize: "0.8125rem" }}>오늘</button>
        </div>
        <button className="cal-header-add" onClick={() => openCreateModal()} style={{ padding: "8px 16px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.875rem" }}>+ 일정 추가</button>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: "4px" }}>
        {DAYS.map((d, i) => (
          <div key={d} className="cal-day-header" style={{ textAlign: "center", fontSize: "0.8125rem", fontWeight: 700, color: i === 0 ? "#ef4444" : i === 6 ? "#3b82f6" : "var(--color-muted)", padding: "8px 0" }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", border: "1px solid var(--color-hairline)", borderRadius: "12px", overflow: "hidden" }}>
        {cells.map((date, idx) => {
          const isToday = date && date.toDateString() === today.toDateString();
          const dayEvents = date ? getEventsForDay(date) : [];
          return (
            <div key={idx} className="cal-cell" onClick={() => date && openCreateModal(date)}
              style={{
                minHeight: "90px", padding: "6px", borderRight: idx % 7 < 6 ? "1px solid var(--color-hairline)" : "none",
                borderBottom: idx < cells.length - 7 ? "1px solid var(--color-hairline)" : "none",
                background: date ? "var(--color-lifted)" : "var(--color-surface)",
                cursor: date ? "pointer" : "default",
              }}
              onMouseEnter={e => { if (date) (e.currentTarget as HTMLElement).style.background = "var(--color-surface-card)"; }}
              onMouseLeave={e => { if (date) (e.currentTarget as HTMLElement).style.background = "var(--color-lifted)"; }}
            >
              {date && (
                <>
                  <div className="cal-day-num" style={{ width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8125rem", fontWeight: isToday ? 700 : 400, background: isToday ? "var(--color-accent)" : "transparent", color: isToday ? "white" : date.getDay() === 0 ? "#ef4444" : date.getDay() === 6 ? "#3b82f6" : "var(--color-ink)" }}>
                    {date.getDate()}
                  </div>
                  {dayEvents.slice(0, 3).map(ev => (
                    <div key={ev.id} className="cal-event-chip" onClick={e => openEventDetail(ev, e)}
                      style={{ marginTop: "2px", padding: "2px 5px", borderRadius: "4px", fontSize: "0.7rem", background: ev.color + "30", color: ev.color, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}
                      title={ev.title}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && <div style={{ fontSize: "0.7rem", color: "var(--color-muted)", marginTop: "2px" }}>+{dayEvents.length - 3}</div>}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setSelectedEvent(null); } }}>
          <div className="cal-modal-inner" style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "16px", padding: "24px", width: "420px", maxWidth: "calc(100vw - 32px)" }}>
            {editMode === "create" ? (
              <>
                <h3 style={{ fontWeight: 700, marginBottom: "16px" }}>일정 추가</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <input value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} placeholder="일정 제목 *" style={{ padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: "8px", fontSize: "0.9375rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
                  <div className="cal-datetime-row" style={{ display: "flex", gap: "8px" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: "0.8125rem", color: "var(--color-muted)", display: "block", marginBottom: "4px" }}>시작 *</label>
                      <input type="datetime-local" value={newEvent.start_at} onChange={e => setNewEvent(p => ({ ...p, start_at: e.target.value }))} style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.875rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: "0.8125rem", color: "var(--color-muted)", display: "block", marginBottom: "4px" }}>종료</label>
                      <input type="datetime-local" value={newEvent.end_at} onChange={e => setNewEvent(p => ({ ...p, end_at: e.target.value }))} style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.875rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
                    </div>
                  </div>
                  <input value={newEvent.location} onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))} placeholder="장소 (선택)" style={{ padding: "6px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.875rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
                  <textarea value={newEvent.description} onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))} placeholder="설명 (선택)" rows={2} style={{ padding: "6px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.875rem", background: "var(--color-surface)", color: "var(--color-ink)", resize: "none" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <label style={{ fontSize: "0.875rem" }}>색상:</label>
                    <input type="color" value={newEvent.color} onChange={e => setNewEvent(p => ({ ...p, color: e.target.value }))} style={{ width: "40px", height: "32px", border: "none", cursor: "pointer", borderRadius: "4px" }} />
                    <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.875rem", marginLeft: "auto" }}>
                      <input type="checkbox" checked={newEvent.all_day} onChange={e => setNewEvent(p => ({ ...p, all_day: e.target.checked }))} />
                      종일
                    </label>
                  </div>
                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    <button onClick={() => setShowModal(false)} style={{ padding: "8px 16px", border: "1px solid var(--color-hairline)", borderRadius: "8px", background: "var(--color-surface)", cursor: "pointer", fontSize: "0.875rem" }}>취소</button>
                    <button onClick={createEvent} disabled={submitting || !newEvent.title || !newEvent.start_at} style={{ padding: "8px 16px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.875rem", opacity: submitting ? 0.7 : 1 }}>
                      {submitting ? "추가 중..." : "추가"}
                    </button>
                  </div>
                </div>
              </>
            ) : selectedEvent && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div style={{ flex: 1 }}>
                    <input
                      value={selectedEvent.title}
                      onChange={e => setSelectedEvent(p => p ? { ...p, title: e.target.value } : p)}
                      style={{ fontSize: "1.125rem", fontWeight: 700, border: "none", outline: "none", background: "transparent", color: "var(--color-ink)", width: "100%" }}
                    />
                  </div>
                  <button onClick={() => { setShowModal(false); setSelectedEvent(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: "1.25rem", padding: "0 4px" }}>×</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                  <div style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
                    <span>🕐 {new Date(selectedEvent.start_at).toLocaleString("ko-KR")}</span>
                    {selectedEvent.end_at !== selectedEvent.start_at && (
                      <span> → {new Date(selectedEvent.end_at).toLocaleString("ko-KR")}</span>
                    )}
                  </div>
                  {selectedEvent.location && <div style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>📍 {selectedEvent.location}</div>}
                  <textarea
                    value={selectedEvent.description ?? ""}
                    onChange={e => setSelectedEvent(p => p ? { ...p, description: e.target.value } : p)}
                    placeholder="설명 추가..."
                    rows={2}
                    style={{ padding: "6px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.875rem", background: "var(--color-surface)", color: "var(--color-ink)", resize: "none" }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <label style={{ fontSize: "0.875rem" }}>색상:</label>
                    <input type="color" value={selectedEvent.color} onChange={e => setSelectedEvent(p => p ? { ...p, color: e.target.value } : p)} style={{ width: "36px", height: "28px", border: "none", cursor: "pointer", borderRadius: "4px", padding: 0 }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", justifyContent: "space-between" }}>
                  <button onClick={() => deleteEvent(selectedEvent.id)} style={{ padding: "7px 14px", background: "#ef444420", color: "#ef4444", border: "1px solid #ef444440", borderRadius: "8px", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}>삭제</button>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => { setShowModal(false); setSelectedEvent(null); }} style={{ padding: "7px 14px", border: "1px solid var(--color-hairline)", borderRadius: "8px", background: "var(--color-surface)", cursor: "pointer", fontSize: "0.875rem" }}>취소</button>
                    <button onClick={updateEvent} disabled={submitting} style={{ padding: "7px 14px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.875rem" }}>
                      {submitting ? "저장 중..." : "저장"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
