"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

type QuestionType = "text" | "choice" | "checkbox" | "rating" | "email";

interface Question {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options?: string[];
}

interface FormData { id: string; title: string; description: string; questions: Question[]; is_public: boolean; }
interface Response { id: string; answers: Record<string, string | string[]>; created_at: number; }

function fmtDate(ts: number | string | null | undefined): string {
  if (!ts) return "";
  return new Date(Number(ts)).toLocaleString("ko-KR");
}

const Q_TYPES: { key: QuestionType; label: string }[] = [
  { key: "text", label: "단답형" },
  { key: "choice", label: "객관식" },
  { key: "checkbox", label: "체크박스" },
  { key: "rating", label: "별점" },
  { key: "email", label: "이메일" },
];

export default function FormBuilderPage() {
  const params = useParams();
  const id = params.id as string;
  const [form, setForm] = useState<FormData | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [tab, setTab] = useState<"build" | "responses">("build");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/forms/${id}`).then(r => r.json()).then(d => {
      if (d.form) {
        const questions = typeof d.form.questions === "string" ? JSON.parse(d.form.questions) : d.form.questions;
        setForm({ ...d.form, questions: questions ?? [] });
      }
    });
  }, [id]);

  useEffect(() => {
    if (tab === "responses") {
      fetch(`/api/v1/forms/${id}/responses`).then(r => r.json()).then(d => {
        if (d.responses) setResponses(d.responses);
      });
    }
  }, [tab, id]);

  async function save(updatedForm: FormData) {
    setSaving(true);
    await fetch(`/api/v1/forms/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: updatedForm.title, description: updatedForm.description, questions: updatedForm.questions, is_public: updatedForm.is_public }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function addQuestion() {
    if (!form) return;
    const q: Question = { id: Date.now().toString(), type: "text", label: "새 질문", required: false };
    const updated = { ...form, questions: [...form.questions, q] };
    setForm(updated);
  }

  function updateQuestion(qid: string, patch: Partial<Question>) {
    if (!form) return;
    const updated = { ...form, questions: form.questions.map(q => q.id === qid ? { ...q, ...patch } : q) };
    setForm(updated);
  }

  function removeQuestion(qid: string) {
    if (!form) return;
    setForm({ ...form, questions: form.questions.filter(q => q.id !== qid) });
  }

  function moveQuestion(qid: string, dir: -1 | 1) {
    if (!form) return;
    const idx = form.questions.findIndex(q => q.id === qid);
    if (idx < 0) return;
    const arr = [...form.questions];
    const swap = idx + dir;
    if (swap < 0 || swap >= arr.length) return;
    [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
    setForm({ ...form, questions: arr });
  }

  if (!form) return <div style={{ padding: "32px", color: "var(--color-muted)" }}>로딩 중...</div>;

  return (
    <div style={{ padding: "24px", maxWidth: "800px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "4px" }}>
          {(["build", "responses"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "6px 14px", border: `1px solid ${tab === t ? "var(--color-accent)" : "var(--color-hairline)"}`, borderRadius: "6px", background: tab === t ? "var(--color-accent)" : "transparent", color: tab === t ? "white" : "var(--color-body)", cursor: "pointer", fontSize: "0.875rem" }}>
              {t === "build" ? "편집" : `응답 (${responses.length})`}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <label style={{ display: "flex", gap: "6px", alignItems: "center", fontSize: "0.875rem" }}>
            <input type="checkbox" checked={form.is_public} onChange={e => setForm(p => p ? { ...p, is_public: e.target.checked } : p)} />
            공개
          </label>
          <a href={`/form/${id}`} target="_blank" rel="noreferrer" style={{ padding: "6px 12px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.875rem", textDecoration: "none", color: "var(--color-body)" }}>미리보기</a>
          <button onClick={() => save(form)} disabled={saving} style={{ padding: "6px 16px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem" }}>
            {saved ? "저장됨" : saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      {tab === "build" ? (
        <>
          {/* Form meta */}
          <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
            <input value={form.title} onChange={e => setForm(p => p ? { ...p, title: e.target.value } : p)} style={{ width: "100%", fontSize: "1.25rem", fontWeight: 700, border: "none", outline: "none", background: "transparent", color: "var(--color-ink)", marginBottom: "8px" }} placeholder="설문 제목" />
            <input value={form.description} onChange={e => setForm(p => p ? { ...p, description: e.target.value } : p)} style={{ width: "100%", fontSize: "0.9375rem", border: "none", outline: "none", background: "transparent", color: "var(--color-muted)" }} placeholder="설명 (선택)" />
          </div>

          {/* Questions */}
          {form.questions.map((q, idx) => (
            <div key={q.id} style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px", alignItems: "center" }}>
                <span style={{ fontSize: "0.8125rem", color: "var(--color-muted)", minWidth: "24px" }}>Q{idx + 1}</span>
                <input value={q.label} onChange={e => updateQuestion(q.id, { label: e.target.value })} style={{ flex: 1, padding: "6px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.9375rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
                <select value={q.type} onChange={e => updateQuestion(q.id, { type: e.target.value as QuestionType })} style={{ padding: "6px 8px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.875rem", background: "var(--color-surface)", color: "var(--color-ink)" }}>
                  {Q_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
                <label style={{ display: "flex", gap: "4px", alignItems: "center", fontSize: "0.8125rem" }}>
                  <input type="checkbox" checked={q.required} onChange={e => updateQuestion(q.id, { required: e.target.checked })} />
                  필수
                </label>
                <button onClick={() => moveQuestion(q.id, -1)} disabled={idx === 0} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: "1rem", padding: "0 4px" }}>↑</button>
                <button onClick={() => moveQuestion(q.id, 1)} disabled={idx === form.questions.length - 1} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: "1rem", padding: "0 4px" }}>↓</button>
                <button onClick={() => removeQuestion(q.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "0 4px" }}>✕</button>
              </div>
              {(q.type === "choice" || q.type === "checkbox") && (
                <div style={{ marginTop: "8px" }}>
                  <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginBottom: "6px" }}>선택지 (한 줄에 하나):</p>
                  <textarea value={(q.options ?? []).join("\n")} onChange={e => updateQuestion(q.id, { options: e.target.value.split("\n") })} rows={3} style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.875rem", background: "var(--color-surface)", color: "var(--color-ink)", resize: "vertical" }} />
                </div>
              )}
            </div>
          ))}

          <button onClick={addQuestion} style={{ width: "100%", padding: "12px", border: "2px dashed var(--color-hairline)", borderRadius: "12px", background: "transparent", cursor: "pointer", color: "var(--color-muted)", fontSize: "0.9375rem" }}>+ 질문 추가</button>
        </>
      ) : (
        <div>
          {responses.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px", color: "var(--color-muted)" }}>아직 응답이 없습니다.</div>
          ) : responses.map((resp, i) => (
            <div key={resp.id} style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
              <p style={{ fontWeight: 600, marginBottom: "8px", fontSize: "0.875rem", color: "var(--color-muted)" }}>응답 #{i + 1} · {fmtDate(resp.created_at)}</p>
              {form.questions.map(q => {
                const answer = (typeof resp.answers === "string" ? JSON.parse(resp.answers) : resp.answers)[q.id];
                return (
                  <div key={q.id} style={{ marginBottom: "8px" }}>
                    <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-ink)" }}>{q.label}</p>
                    <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>{Array.isArray(answer) ? answer.join(", ") : answer || "(응답 없음)"}</p>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
