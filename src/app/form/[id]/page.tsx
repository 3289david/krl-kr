"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type QuestionType = "text" | "choice" | "checkbox" | "rating" | "email";
interface Question { id: string; type: QuestionType; label: string; required: boolean; options?: string[]; }
interface FormData { id: string; title: string; description: string; questions: Question[]; is_public: boolean; }

export default function PublicFormPage() {
  const params = useParams();
  const formId = params.id as string;
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/forms/${formId}`).then(r => r.json()).then(d => {
      if (d.form) {
        const questions = typeof d.form.questions === "string" ? JSON.parse(d.form.questions) : d.form.questions;
        setForm({ ...d.form, questions: questions ?? [] });
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }).catch(() => { setNotFound(true); setLoading(false); });
  }, [formId]);

  function setAnswer(id: string, value: string | string[]) {
    setAnswers(prev => ({ ...prev, [id]: value }));
  }

  function toggleCheckbox(qid: string, option: string) {
    const current = (answers[qid] as string[]) ?? [];
    if (current.includes(option)) {
      setAnswer(qid, current.filter(o => o !== option));
    } else {
      setAnswer(qid, [...current, option]);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    for (const q of (form?.questions ?? [])) {
      if (q.required && !answers[q.id]) { setError(`"${q.label}" 항목을 입력해주세요.`); return; }
    }
    setSubmitting(true);
    const r = await fetch(`/api/v1/forms/${formId}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    if (r.ok) {
      setSubmitted(true);
    } else {
      const d = await r.json();
      setError(d.error ?? "제출에 실패했습니다.");
    }
    setSubmitting(false);
  }

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>로딩 중...</div>;
  if (notFound) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <p style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "12px" }}>설문을 찾을 수 없습니다.</p>
      <Link href="/" style={{ color: "#6366f1", textDecoration: "none" }}>KRL.KR 홈으로</Link>
    </div>
  );
  if (submitted) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", background: "#f9fafb" }}>
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "48px 40px", textAlign: "center", maxWidth: "480px" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "8px" }}>응답이 제출되었습니다!</h2>
        <p style={{ color: "#6b7280", marginBottom: "24px" }}>소중한 의견 감사합니다.</p>
        <Link href="/" style={{ color: "#6366f1", textDecoration: "none" }}>KRL.KR 홈으로</Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", padding: "32px 16px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ background: "white", borderRadius: "16px", padding: "32px", marginBottom: "16px", borderTop: "4px solid #6366f1" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "8px" }}>{form?.title}</h1>
          {form?.description && <p style={{ color: "#6b7280", fontSize: "0.9375rem" }}>{form.description}</p>}
        </div>
        <form onSubmit={submit}>
          {form?.questions.map(q => (
            <div key={q.id} style={{ background: "white", borderRadius: "12px", padding: "24px", marginBottom: "12px", border: "1px solid #e5e7eb" }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: "12px", fontSize: "0.9375rem" }}>
                {q.label}{q.required && <span style={{ color: "#ef4444", marginLeft: "4px" }}>*</span>}
              </label>
              {q.type === "text" && (
                <input value={(answers[q.id] as string) ?? ""} onChange={e => setAnswer(q.id, e.target.value)} placeholder="답변 입력..." required={q.required} style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "0.9375rem", boxSizing: "border-box" }} />
              )}
              {q.type === "email" && (
                <input type="email" value={(answers[q.id] as string) ?? ""} onChange={e => setAnswer(q.id, e.target.value)} placeholder="이메일 주소" required={q.required} style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "0.9375rem", boxSizing: "border-box" }} />
              )}
              {q.type === "choice" && (q.options ?? []).map(opt => (
                <label key={opt} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0", cursor: "pointer", fontSize: "0.9375rem" }}>
                  <input type="radio" name={q.id} value={opt} checked={(answers[q.id] as string) === opt} onChange={() => setAnswer(q.id, opt)} required={q.required} />
                  {opt}
                </label>
              ))}
              {q.type === "checkbox" && (q.options ?? []).map(opt => (
                <label key={opt} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0", cursor: "pointer", fontSize: "0.9375rem" }}>
                  <input type="checkbox" checked={((answers[q.id] as string[]) ?? []).includes(opt)} onChange={() => toggleCheckbox(q.id, opt)} />
                  {opt}
                </label>
              ))}
              {q.type === "rating" && (
                <div style={{ display: "flex", gap: "8px" }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button" onClick={() => setAnswer(q.id, String(n))} style={{ width: "44px", height: "44px", borderRadius: "8px", border: `2px solid ${(answers[q.id] as string) === String(n) ? "#6366f1" : "#e5e7eb"}`, background: (answers[q.id] as string) === String(n) ? "#6366f1" : "white", color: (answers[q.id] as string) === String(n) ? "white" : "#374151", fontSize: "1rem", cursor: "pointer", fontWeight: 600 }}>
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {error && <div style={{ padding: "12px 16px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "8px", marginBottom: "12px", color: "#9B1C1C", fontSize: "0.875rem" }}>{error}</div>}
          <button type="submit" disabled={submitting} style={{ width: "100%", padding: "14px", background: "#6366f1", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 700, fontSize: "1rem" }}>
            {submitting ? "제출 중..." : "제출하기"}
          </button>
        </form>
        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "0.8125rem", color: "#9ca3af" }}>
          <Link href="/" style={{ color: "#6366f1", textDecoration: "none" }}>KRL.KR</Link>로 만든 설문
        </p>
      </div>
    </div>
  );
}
