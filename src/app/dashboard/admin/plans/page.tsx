"use client";
import { useState, useEffect, useCallback } from "react";

interface PlanRow {
  id: number;
  user_id: number;
  plan: string;
  bmc_email: string | null;
  bmc_order_id: string | null;
  verified_at: number | null;
  expires_at: number | null;
  created_at: number;
  user_email?: string;
  user_name?: string;
}

const PLAN_COLORS: Record<string, string> = {
  free: "#6b7280",
  pro: "#2563eb",
  vip: "#7c3aed",
};

export default function AdminPlansPage() {
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editPlan, setEditPlan] = useState("free");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/plans");
      const data = await res.json();
      setRows(data.rows ?? []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleUpdate(userId: number, plan: string) {
    setError(""); setSuccess("");
    const res = await fetch("/api/admin/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, plan }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setSuccess(`플랜이 ${plan}으로 변경되었습니다.`);
    setEditId(null);
    load();
  }

  return (
    <div className="dashboard-page">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.02em" }}>플랜 관리</h1>
        <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem", marginTop: 4 }}>
          BMC 인증 요청을 검토하고 사용자 플랜을 변경합니다.
        </p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

      {loading ? (
        <p style={{ color: "var(--color-muted)" }}>불러오는 중...</p>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 32px", background: "var(--color-surface)", borderRadius: 12, border: "1px solid var(--color-hairline)" }}>
          <p style={{ color: "var(--color-muted)" }}>아직 플랜 신청이 없습니다.</p>
        </div>
      ) : (
        <div style={{ background: "var(--color-surface)", borderRadius: 12, border: "1px solid var(--color-hairline)", overflow: "hidden" }}>
          {rows.map((row, i) => (
            <div key={row.id} style={{ padding: "16px 20px", borderBottom: i < rows.length - 1 ? "1px solid var(--color-hairline)" : "none", display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{row.user_email ?? `User #${row.user_id}`}</div>
                {row.user_name && <div style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>{row.user_name}</div>}
                {row.bmc_email && (
                  <div style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginTop: 4 }}>
                    BMC: {row.bmc_email}
                    {row.bmc_order_id && ` · 주문ID: ${row.bmc_order_id}`}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {editId === row.id ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select className="input" value={editPlan} onChange={e => setEditPlan(e.target.value)} style={{ height: 34, fontSize: "0.875rem" }}>
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="vip">VIP</option>
                    </select>
                    <button onClick={() => handleUpdate(row.user_id, editPlan)} className="btn btn-sm btn-primary">저장</button>
                    <button onClick={() => setEditId(null)} className="btn btn-sm btn-ghost">취소</button>
                  </div>
                ) : (
                  <>
                    <span style={{
                      padding: "3px 10px", borderRadius: 9999, fontSize: "0.75rem", fontWeight: 700,
                      background: `${PLAN_COLORS[row.plan] ?? "#6b7280"}20`,
                      color: PLAN_COLORS[row.plan] ?? "#6b7280",
                      textTransform: "uppercase"
                    }}>
                      {row.plan}
                    </span>
                    <button onClick={() => { setEditId(row.id); setEditPlan(row.plan); }} className="btn btn-sm btn-ghost">
                      변경
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
