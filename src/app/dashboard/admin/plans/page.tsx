"use client";
import { useState, useEffect, useCallback } from "react";

interface PlanRow {
  id: number;
  user_id: string;
  plan: string;
  bmc_email: string | null;
  verified_at: number | null;
  expires_at: number | null;
  extra_storage_bytes: number;
  storage_override_bytes: number | null;
  created_at: number;
  user_email?: string;
  user_name?: string;
}

const PLAN_COLORS: Record<string, string> = {
  free: "#6b7280", pro: "#2563eb", vip: "#7c3aed",
};

function fmtBytes(b: number) {
  if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(1)}GB`;
  if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(0)}MB`;
  return `${Math.round(b / 1024)}KB`;
}

export default function AdminPlansPage() {
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Inline plan edit
  const [editId, setEditId] = useState<number | null>(null);
  const [editPlan, setEditPlan] = useState("free");

  // Storage panel
  const [storageId, setStorageId] = useState<number | null>(null);
  const [addGb, setAddGb] = useState("10");
  const [overrideGb, setOverrideGb] = useState("");

  // Manual change form
  const [manualEmail, setManualEmail] = useState("");
  const [manualPlan, setManualPlan] = useState("pro");
  const [savingManual, setSavingManual] = useState(false);

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

  function notify(msg: string, isErr = false) {
    if (isErr) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(""); setSuccess(""); }, 4000);
  }

  async function api(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { notify(data.error ?? "오류 발생", true); return false; }
    return true;
  }

  async function handlePlanUpdate(userId: string, plan: string) {
    if (await api({ user_id: userId, plan })) {
      notify(`플랜이 ${plan}으로 변경되었습니다.`);
      setEditId(null);
      load();
    }
  }

  async function handleManualChange(e: React.FormEvent) {
    e.preventDefault();
    if (!manualEmail.trim()) return;
    setSavingManual(true);
    if (await api({ email: manualEmail.trim(), plan: manualPlan })) {
      notify(`${manualEmail} → ${manualPlan} 변경 완료`);
      setManualEmail("");
      load();
    }
    setSavingManual(false);
  }

  async function handleAddStorage(userId: string) {
    const gb = parseFloat(addGb);
    if (!gb || gb <= 0) { notify("올바른 GB를 입력하세요.", true); return; }
    if (await api({ user_id: userId, extra_storage_gb: gb })) {
      notify(`+${gb}GB 추가 완료`);
      setStorageId(null);
      load();
    }
  }

  async function handleOverrideStorage(userId: string) {
    const val = overrideGb === "" ? null : parseFloat(overrideGb);
    if (await api({ user_id: userId, storage_override_gb: val })) {
      notify(val == null ? "저장공간 오버라이드 해제됨" : `저장공간 ${val}GB로 고정`);
      setStorageId(null);
      load();
    }
  }

  async function handleResetExtra(userId: string) {
    if (!confirm("추가 저장공간을 0으로 초기화하시겠습니까?")) return;
    if (await api({ user_id: userId, action: "reset_extra_storage" })) {
      notify("추가 저장공간 초기화됨");
      load();
    }
  }

  const activeRow = storageId != null ? rows.find(r => r.id === storageId) : null;

  return (
    <div className="dashboard-page">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.02em" }}>플랜 · 저장공간 관리</h1>
        <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem", marginTop: 4 }}>
          사용자 플랜 변경, 추가 저장공간 부여, 저장공간 한도 고정
        </p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

      {/* Manual change form */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
        <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: 16 }}>이메일로 플랜 변경</h3>
        <form onSubmit={handleManualChange} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, marginBottom: 6 }}>유저 이메일</label>
            <input className="input" type="email" placeholder="user@example.com" value={manualEmail}
              onChange={e => setManualEmail(e.target.value)} required style={{ height: 38 }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, marginBottom: 6 }}>플랜</label>
            <select className="input" value={manualPlan} onChange={e => setManualPlan(e.target.value)} style={{ height: 38, fontSize: "0.875rem" }}>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="vip">VIP</option>
            </select>
          </div>
          <button type="submit" disabled={savingManual || !manualEmail.trim()} className="btn btn-primary btn-sm" style={{ height: 38 }}>
            {savingManual ? "변경 중..." : "변경"}
          </button>
        </form>
      </div>

      {/* Storage panel modal */}
      {activeRow && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setStorageId(null); }}>
          <div style={{ background: "var(--color-canvas)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            <h3 style={{ fontWeight: 700, marginBottom: 4, fontSize: "1.0625rem" }}>저장공간 관리</h3>
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginBottom: 20 }}>
              {activeRow.user_email ?? activeRow.user_id}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20, padding: "14px 16px", background: "var(--color-surface)", borderRadius: 10, border: "1px solid var(--color-hairline)" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginBottom: 2 }}>추가 저장공간</div>
                <div style={{ fontWeight: 700, fontSize: "1.0625rem" }}>{fmtBytes(activeRow.extra_storage_bytes ?? 0)}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginBottom: 2 }}>한도 고정</div>
                <div style={{ fontWeight: 700, fontSize: "1.0625rem" }}>
                  {activeRow.storage_override_bytes != null ? fmtBytes(activeRow.storage_override_bytes) : "없음"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Add extra storage */}
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: 8 }}>추가 저장공간 부여 (GB)</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="input" type="number" min="1" max="1000" value={addGb} onChange={e => setAddGb(e.target.value)} style={{ flex: 1 }} placeholder="10" />
                  <button className="btn btn-primary btn-sm" onClick={() => handleAddStorage(activeRow.user_id)}>+추가</button>
                </div>
                {(activeRow.extra_storage_bytes ?? 0) > 0 && (
                  <button className="btn btn-sm btn-ghost" style={{ marginTop: 6, fontSize: "0.8125rem", color: "#dc2626" }}
                    onClick={() => handleResetExtra(activeRow.user_id)}>추가 저장공간 초기화</button>
                )}
              </div>

              {/* Override limit */}
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: 8 }}>한도 직접 고정 (GB, 비워두면 해제)</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="input" type="number" min="1" max="100000" value={overrideGb} onChange={e => setOverrideGb(e.target.value)} style={{ flex: 1 }} placeholder="예: 50" />
                  <button className="btn btn-primary btn-sm" onClick={() => handleOverrideStorage(activeRow.user_id)}>저장</button>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: 4 }}>설정하면 플랜 기본 + 추가 계산을 무시하고 이 값으로 고정됩니다.</p>
              </div>
            </div>

            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
              <button className="btn btn-sm btn-ghost" onClick={() => setStorageId(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* Plan rows */}
      <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: 12 }}>플랜 보유 유저 목록</h3>
      {loading ? (
        <p style={{ color: "var(--color-muted)" }}>불러오는 중...</p>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 32px", background: "var(--color-surface)", borderRadius: 12, border: "1px solid var(--color-hairline)" }}>
          <p style={{ color: "var(--color-muted)" }}>플랜 데이터가 없습니다.</p>
        </div>
      ) : (
        <div style={{ background: "var(--color-surface)", borderRadius: 12, border: "1px solid var(--color-hairline)", overflow: "hidden" }}>
          {rows.map((row, i) => (
            <div key={row.id} style={{ padding: "14px 20px", borderBottom: i < rows.length - 1 ? "1px solid var(--color-hairline)" : "none", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{row.user_email ?? row.user_id}</div>
                {row.user_name && <div style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>{row.user_name}</div>}
                <div style={{ display: "flex", gap: 10, marginTop: 3, flexWrap: "wrap" }}>
                  {row.expires_at && (
                    <span style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>
                      만료: {new Date(Number(row.expires_at)).toLocaleDateString("ko-KR")}
                    </span>
                  )}
                  {(row.extra_storage_bytes ?? 0) > 0 && (
                    <span style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 600 }}>
                      +{fmtBytes(row.extra_storage_bytes)} 추가
                    </span>
                  )}
                  {row.storage_override_bytes != null && (
                    <span style={{ fontSize: "0.75rem", color: "#d97706", fontWeight: 600 }}>
                      한도고정 {fmtBytes(row.storage_override_bytes)}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {editId === row.id ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select className="input" value={editPlan} onChange={e => setEditPlan(e.target.value)} style={{ height: 34, fontSize: "0.875rem" }}>
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="vip">VIP</option>
                    </select>
                    <button onClick={() => handlePlanUpdate(row.user_id, editPlan)} className="btn btn-sm btn-primary">저장</button>
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
                    <button onClick={() => { setEditId(row.id); setEditPlan(row.plan); }} className="btn btn-sm btn-ghost">플랜</button>
                    <button onClick={() => { setStorageId(row.id); setAddGb("10"); setOverrideGb(row.storage_override_bytes != null ? String(Math.round(row.storage_override_bytes / 1024 ** 3)) : ""); }} className="btn btn-sm btn-ghost">저장공간</button>
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
