"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Form { id: string; title: string; description: string; is_public: boolean; created_at: number; }

function fmtDate(ts: number | string | null | undefined): string {
  if (!ts) return "";
  return new Date(Number(ts)).toLocaleDateString("ko-KR");
}

export default function FormsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/v1/forms").then(r => r.json()).then(d => {
      if (d.forms) setForms(d.forms);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function createForm() {
    if (creating) return;
    setCreating(true);
    const r = await fetch("/api/v1/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "새 설문", questions: [] }),
    });
    const d = await r.json();
    if (d.form) window.location.href = `/dashboard/forms/${d.form.id}`;
    setCreating(false);
  }

  async function deleteForm(id: string, e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/v1/forms/${id}`, { method: "DELETE" });
    setForms(prev => prev.filter(f => f.id !== id));
  }

  return (
    <div style={{ padding: "32px", maxWidth: "800px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "4px" }}>KRL Forms</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem" }}>설문 폼 제작</p>
        </div>
        <button onClick={createForm} disabled={creating} style={{ padding: "8px 20px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.9375rem", fontWeight: 600, opacity: creating ? 0.7 : 1 }}>{creating ? "만드는 중..." : "+ 새 설문"}</button>
      </div>

      {loading ? <div style={{ color: "var(--color-muted)" }}>로딩 중...</div> : forms.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--color-muted)" }}>설문이 없습니다.</div>
      ) : forms.map(form => (
        <Link key={form.id} href={`/dashboard/forms/${form.id}`} style={{ textDecoration: "none" }}>
          <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "12px", padding: "16px 20px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "12px", transition: "border-color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--color-accent)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-hairline)")}
          >
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, color: "var(--color-ink)", marginBottom: "4px" }}>{form.title}</p>
              {form.description && <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>{form.description}</p>}
              <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: "4px" }}>{fmtDate(form.created_at)}</p>
            </div>
            {form.is_public && <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "99px", background: "#10b98120", color: "#10b981", fontWeight: 600 }}>공개</span>}
            <Link href={`/form/${form.id}`} onClick={e => e.stopPropagation()} style={{ fontSize: "0.75rem", padding: "4px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", color: "var(--color-muted)", textDecoration: "none" }}>링크</Link>
            <button onClick={e => deleteForm(form.id, e)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "4px" }}>✕</button>
          </div>
        </Link>
      ))}
    </div>
  );
}
