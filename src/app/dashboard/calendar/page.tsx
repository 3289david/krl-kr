"use client";
import { useState, useEffect, useCallback } from "react";

interface CalEvent { id: string; title: string; start_at: number; end_at: number; all_day: boolean; color: string; }

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function CalendarPage() {
  const [today] = useState(new Date());
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newEvent, setNewEvent] = useState({ title: "", start_at: "", end_at: "", all_day: false, color: "#6366f1" });

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
    if (!newEvent.title || !newEvent.start_at) return;
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
      setNewEvent({ title: "", start_at: "", end_at: "", all_day: false, color: "#6366f1" });
    }
  }

  function openModalForDate(date: Date) {
    setSelectedDate(date);
    const dateStr = date.toISOString().slice(0, 16);
    setNewEvent(p => ({ ...p, start_at: dateStr }));
    setShowModal(true);
  }

  const cells = getDaysInMonth();

  return (
    <div style={{ padding: "24px", maxWidth: "900px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={prevMonth} style={{ padding: "6px 12px", border: "1px solid var(--color-hairline)", borderRadius: "6px", background: "var(--color-surface)", cursor: "pointer" }}>‹</button>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{current.getFullYear()}년 {current.getMonth() + 1}월</h2>
          <button onClick={nextMonth} style={{ padding: "6px 12px", border: "1px solid var(--color-hairline)", borderRadius: "6px", background: "var(--color-surface)", cursor: "pointer" }}>›</button>
          <button onClick={() => setCurrent(new Date(today.getFullYear(), today.getMonth(), 1))} style={{ padding: "6px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", background: "var(--color-surface)", cursor: "pointer", fontSize: "0.8125rem" }}>오늘</button>
        </div>
        <button onClick={() => { setSelectedDate(null); setShowModal(true); }} style={{ padding: "8px 16px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.875rem" }}>+ 일정 추가</button>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: "4px" }}>
        {DAYS.map((d, i) => (
          <div key={d} style={{ textAlign: "center", fontSize: "0.8125rem", fontWeight: 700, color: i === 0 ? "#ef4444" : i === 6 ? "#3b82f6" : "var(--color-muted)", padding: "8px 0" }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", border: "1px solid var(--color-hairline)", borderRadius: "12px", overflow: "hidden" }}>
        {cells.map((date, idx) => {
          const isToday = date && date.toDateString() === today.toDateString();
          const dayEvents = date ? getEventsForDay(date) : [];
          return (
            <div key={idx} onClick={() => date && openModalForDate(date)}
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
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8125rem", fontWeight: isToday ? 700 : 400, background: isToday ? "var(--color-accent)" : "transparent", color: isToday ? "white" : date.getDay() === 0 ? "#ef4444" : date.getDay() === 6 ? "#3b82f6" : "var(--color-ink)" }}>
                    {date.getDate()}
                  </div>
                  {dayEvents.slice(0, 3).map(e => (
                    <div key={e.id} style={{ marginTop: "2px", padding: "1px 5px", borderRadius: "4px", fontSize: "0.7rem", background: e.color + "30", color: e.color, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.title}
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
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "16px", padding: "24px", width: "400px" }}>
            <h3 style={{ fontWeight: 700, marginBottom: "16px" }}>일정 추가</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} placeholder="일정 제목" style={{ padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: "8px", fontSize: "0.9375rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "0.8125rem", color: "var(--color-muted)", display: "block", marginBottom: "4px" }}>시작</label>
                  <input type="datetime-local" value={newEvent.start_at} onChange={e => setNewEvent(p => ({ ...p, start_at: e.target.value }))} style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.875rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "0.8125rem", color: "var(--color-muted)", display: "block", marginBottom: "4px" }}>종료</label>
                  <input type="datetime-local" value={newEvent.end_at} onChange={e => setNewEvent(p => ({ ...p, end_at: e.target.value }))} style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.875rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
                </div>
              </div>
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
                <button onClick={createEvent} style={{ padding: "8px 16px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.875rem" }}>추가</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
