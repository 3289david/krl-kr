"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface Queue { name: string; description?: string; max_size: number; is_active: number; }

export default function QueueJoinPage() {
  const { slug } = useParams() as { slug: string };
  const [queue, setQueue] = useState<Queue | null>(null);
  const [waiting, setWaiting] = useState(0);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", note: "" });
  const [joined, setJoined] = useState<{ ticket_number: number; position: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/queue/${slug}`)
      .then(r => r.json())
      .then(d => {
        if (d.queue) { setQueue(d.queue); setWaiting(d.waiting ?? 0); }
        else setError(d.error ?? "오류");
      })
      .catch(() => setError("로드 실패"));
  }, [slug]);

  async function join(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true); setError("");
    const r = await fetch(`/api/v1/queue/${slug}/join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await r.json();
    if (d.ok) { setJoined({ ticket_number: d.ticket_number, position: d.position }); }
    else { setError(d.error ?? "오류가 발생했습니다."); }
    setSubmitting(false);
  }

  if (error) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#dc2626", marginBottom: 16 }}>{error}</p>
        <a href="/" style={{ color: "#3b82f6", textDecoration: "none" }}>홈으로</a>
      </div>
    </div>
  );

  if (!queue) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#94a3b8" }}>불러오는 중...</p>
    </div>
  );

  if (joined) return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "48px 40px", maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "0 4px 40px rgba(0,0,0,.08)" }}>
        <div style={{ width: 80, height: 80, borderRadius: 16, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2}><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 8 }}>대기열 등록 완료</h1>
        <p style={{ color: "#64748b", marginBottom: 32 }}>{queue.name}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
          <div style={{ background: "#f8fafc", borderRadius: 12, padding: "20px 16px" }}>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#1e293b" }}>#{joined.ticket_number}</div>
            <div style={{ fontSize: ".8125rem", color: "#64748b" }}>번호표</div>
          </div>
          <div style={{ background: "#f8fafc", borderRadius: 12, padding: "20px 16px" }}>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#3b82f6" }}>{joined.position}</div>
            <div style={{ fontSize: ".8125rem", color: "#64748b" }}>현재 순서</div>
          </div>
        </div>
        <p style={{ fontSize: ".875rem", color: "#94a3b8" }}>호출 시까지 기다려주세요.</p>
        <p style={{ fontSize: ".8125rem", color: "#cbd5e1", marginTop: 8 }}>현재 대기: {waiting}명</p>
      </div>
    </div>
  );

  if (!queue.is_active) return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 48, maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "0 4px 40px rgba(0,0,0,.08)" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 8 }}>{queue.name}</h1>
        <p style={{ color: "#64748b" }}>현재 대기열이 운영되지 않습니다.</p>
      </div>
    </div>
  );

  const inputStyle = { width: "100%", padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: ".9375rem", background: "#f8fafc", color: "#1e293b", boxSizing: "border-box" as const };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "40px 32px", maxWidth: 420, width: "100%", boxShadow: "0 4px 40px rgba(0,0,0,.08)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 14, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={1.5}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700, marginBottom: 6 }}>{queue.name}</h1>
          {queue.description && <p style={{ color: "#64748b", fontSize: ".875rem" }}>{queue.description}</p>}
          <div style={{ display: "inline-flex", gap: 6, alignItems: "center", background: "#f1f5f9", borderRadius: 99, padding: "4px 14px", marginTop: 10, fontSize: ".875rem", color: "#3b82f6", fontWeight: 600 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            현재 대기 {waiting}명
          </div>
        </div>

        {error && <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px 14px", borderRadius: 10, marginBottom: 16, fontSize: ".875rem" }}>{error}</div>}

        <form onSubmit={join} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 5, color: "#374151" }}>이름 *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="홍길동" style={inputStyle} /></div>
          <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 5, color: "#374151" }}>연락처 (선택)</label><input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="010-0000-0000" style={inputStyle} /></div>
          <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 5, color: "#374151" }}>메모 (선택)</label><input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} placeholder="참고 사항" style={inputStyle} /></div>
          <button type="submit" disabled={submitting} style={{ padding: "13px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: "1rem", marginTop: 4 }}>{submitting ? "등록 중..." : "대기열 등록"}</button>
        </form>
        <p style={{ textAlign: "center", marginTop: 20, fontSize: ".75rem", color: "#94a3b8" }}>KRL.KR Queue로 운영됩니다</p>
      </div>
    </div>
  );
}
