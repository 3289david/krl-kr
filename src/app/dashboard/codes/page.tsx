"use client";
import { useState, useEffect, useCallback } from "react";

interface InviteCode { id: string; code: string; max_uses: number | null; uses: number; reward_type: string; reward_value: string; active: boolean; created_at: string; }
interface InviteUse { id: string; code_id: string; used_by_email: string; used_at: string; }
interface Coupon { id: string; code: string; description: string; discount_type: string; discount_value: number; max_uses: number | null; uses: number; expires_at: string | null; active: boolean; created_at: string; }
interface LicenseKey { id: string; key: string; label: string; product: string; max_activations: number; activations: number; expires_at: string | null; active: boolean; created_at: string; }
interface OTP { id: string; code: string; purpose: string; expires_at: string; used: boolean; created_at: string; }
interface ShortUrl { id: string; code: string; target_url: string; title: string; clicks: number; active: boolean; created_at: string; }

const TABS = [
  { id: "invite", label: "초대 코드" },
  { id: "coupon", label: "쿠폰" },
  { id: "license", label: "라이선스 키" },
  { id: "otp", label: "OTP" },
  { id: "url", label: "URL 단축" },
  { id: "dev", label: "개발자 API" },
];

function Badge({ active }: { active: boolean }) {
  return (
    <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "99px", background: active ? "#DCFCE7" : "#FEE2E2", color: active ? "#166534" : "#991B1B" }}>
      {active ? "활성" : "비활성"}
    </span>
  );
}

function ErrBox({ msg }: { msg: string }) {
  return <div style={{ padding: "10px 14px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "8px", marginBottom: "12px", color: "#9B1C1C", fontSize: "0.875rem" }}>{msg}</div>;
}

function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ padding: "7px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.875rem", background: "var(--color-surface)", color: "var(--color-ink)", width: "100%" }} />
  );
}

function Btn({ onClick, disabled, children, variant = "primary" }: { onClick: () => void; disabled?: boolean; children: React.ReactNode; variant?: "primary" | "ghost" | "danger" }) {
  const styles = {
    primary: { background: "var(--color-accent)", color: "white", border: "none" },
    ghost: { background: "transparent", color: "var(--color-body)", border: "1px solid var(--color-hairline)" },
    danger: { background: "transparent", color: "#DC2626", border: "1px solid #FECDD3" },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: "7px 14px", borderRadius: "6px", cursor: disabled ? "not-allowed" : "pointer", fontSize: "0.875rem", fontWeight: 500, opacity: disabled ? 0.6 : 1, ...styles[variant] }}>
      {children}
    </button>
  );
}

function ts(v: string | null | undefined): string {
  if (!v) return "-";
  const n = Number(v);
  if (isNaN(n) || n === 0) return "-";
  return new Date(n).toLocaleDateString("ko-KR");
}

function copyText(text: string) {
  try { navigator.clipboard.writeText(text); } catch {}
}

// ─── Invite Tab ──────────────────────────────────────────────────────────────

function InviteTab() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [uses, setUses] = useState<InviteUse[]>([]);
  const [maxUses, setMaxUses] = useState("");
  const [rewardType, setRewardType] = useState("none");
  const [rewardValue, setRewardValue] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/v1/codes/invite");
      if (r.ok) {
        const d = await r.json();
        setCodes(Array.isArray(d.codes) ? d.codes : []);
        setUses(Array.isArray(d.uses) ? d.uses : []);
      }
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (submitting) return;
    setErr("");
    setSubmitting(true);
    try {
      const r = await fetch("/api/v1/codes/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_uses: maxUses ? Number(maxUses) : null, reward_type: rewardType, reward_value: rewardValue, custom_code: customCode || undefined }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "생성 실패"); }
      else {
        if (d.code) setCodes(prev => [d.code, ...prev]);
        setMaxUses(""); setRewardType("none"); setRewardValue(""); setCustomCode("");
        load();
      }
    } catch { setErr("네트워크 오류"); }
    setSubmitting(false);
  }

  async function del(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/v1/codes/invite?id=${id}`, { method: "DELETE" });
    setCodes(prev => prev.filter(c => c.id !== id));
  }

  return (
    <div>
      <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
        <p style={{ fontWeight: 600, marginBottom: "10px" }}>새 초대 코드 생성</p>
        {err && <ErrBox msg={err} />}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
          <div style={{ flex: "1 1 180px" }}><Input value={customCode} onChange={setCustomCode} placeholder="커스텀 코드 (선택)" /></div>
          <div style={{ flex: "1 1 100px" }}><Input value={maxUses} onChange={setMaxUses} placeholder="최대 사용 횟수" type="number" /></div>
          <select value={rewardType} onChange={e => setRewardType(e.target.value)}
            style={{ padding: "7px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.875rem", background: "var(--color-surface)", color: "var(--color-ink)" }}>
            <option value="none">보상 없음</option>
            <option value="discount">할인</option>
            <option value="credit">크레딧</option>
            <option value="custom">기타</option>
          </select>
          {rewardType !== "none" && <div style={{ flex: "1 1 120px" }}><Input value={rewardValue} onChange={setRewardValue} placeholder="보상 값" /></div>}
        </div>
        <Btn onClick={create} disabled={submitting}>{submitting ? "생성 중..." : "생성"}</Btn>
      </div>

      {codes.length === 0
        ? <p style={{ color: "var(--color-muted)", textAlign: "center", padding: "32px" }}>초대 코드가 없습니다. 위에서 생성해보세요.</p>
        : codes.map(c => (
          <div key={c.id} style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "8px", padding: "12px 16px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <code style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.9375rem", flex: 1, letterSpacing: "0.08em", cursor: "pointer" }} onClick={() => copyText(c.code)} title="클릭하여 복사">{c.code}</code>
            <span style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>사용 {c.uses}{c.max_uses !== null ? `/${c.max_uses}` : ""}회</span>
            {c.reward_type !== "none" && <span style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>{c.reward_type}: {c.reward_value}</span>}
            <Badge active={c.active} />
            <span style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{ts(c.created_at)}</span>
            <Btn onClick={() => del(c.id)} variant="danger">삭제</Btn>
          </div>
        ))}

      {uses.length > 0 && (
        <>
          <p style={{ fontWeight: 600, margin: "20px 0 8px" }}>사용 기록</p>
          {uses.map(u => (
            <div key={u.id} style={{ padding: "8px 12px", background: "var(--color-surface)", border: "1px solid var(--color-hairline)", borderRadius: "6px", marginBottom: "4px", display: "flex", gap: "12px", fontSize: "0.8375rem", color: "var(--color-muted)" }}>
              <span>{u.used_by_email || "(이메일 없음)"}</span>
              <span style={{ marginLeft: "auto" }}>{ts(u.used_at)}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Coupon Tab ──────────────────────────────────────────────────────────────

function CouponTab() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/v1/codes/coupon");
      if (r.ok) {
        const d = await r.json();
        setCoupons(Array.isArray(d.coupons) ? d.coupons : []);
      }
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (submitting) return;
    setErr("");
    setSubmitting(true);
    try {
      const r = await fetch("/api/v1/codes/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code || undefined,
          description,
          discount_type: discountType,
          discount_value: Number(discountValue) || 0,
          max_uses: maxUses ? Number(maxUses) : null,
          expires_at: expiresAt ? new Date(expiresAt).getTime() : null,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "생성 실패"); }
      else {
        if (d.coupon) setCoupons(prev => [d.coupon, ...prev]);
        setCode(""); setDescription(""); setDiscountValue(""); setMaxUses(""); setExpiresAt("");
        load();
      }
    } catch { setErr("네트워크 오류"); }
    setSubmitting(false);
  }

  async function toggle(c: Coupon) {
    const r = await fetch(`/api/v1/codes/coupon/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !c.active }) });
    if (r.ok) { const d = await r.json(); setCoupons(prev => prev.map(x => x.id === c.id ? d.coupon : x)); }
  }

  async function del(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/v1/codes/coupon/${id}`, { method: "DELETE" });
    setCoupons(prev => prev.filter(c => c.id !== id));
  }

  return (
    <div>
      <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
        <p style={{ fontWeight: 600, marginBottom: "10px" }}>새 쿠폰 생성</p>
        {err && <ErrBox msg={err} />}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
          <div style={{ flex: "1 1 140px" }}><Input value={code} onChange={setCode} placeholder="코드 (비우면 자동생성)" /></div>
          <div style={{ flex: "2 1 200px" }}><Input value={description} onChange={setDescription} placeholder="설명" /></div>
          <select value={discountType} onChange={e => setDiscountType(e.target.value)}
            style={{ padding: "7px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.875rem", background: "var(--color-surface)", color: "var(--color-ink)" }}>
            <option value="percent">퍼센트 (%)</option>
            <option value="amount">고정 금액</option>
          </select>
          <div style={{ flex: "1 1 80px" }}><Input value={discountValue} onChange={setDiscountValue} placeholder="할인 값" type="number" /></div>
          <div style={{ flex: "1 1 100px" }}><Input value={maxUses} onChange={setMaxUses} placeholder="최대 사용" type="number" /></div>
          <div style={{ flex: "1 1 140px" }}><Input value={expiresAt} onChange={setExpiresAt} placeholder="만료일" type="date" /></div>
        </div>
        <Btn onClick={create} disabled={submitting}>{submitting ? "생성 중..." : "생성"}</Btn>
      </div>

      {coupons.length === 0
        ? <p style={{ color: "var(--color-muted)", textAlign: "center", padding: "32px" }}>쿠폰이 없습니다. 위에서 생성해보세요.</p>
        : coupons.map(c => (
          <div key={c.id} style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "8px", padding: "12px 16px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <code style={{ fontFamily: "monospace", fontWeight: 700, cursor: "pointer" }} onClick={() => copyText(c.code)} title="클릭하여 복사">{c.code}</code>
            {c.description && <span style={{ fontSize: "0.8rem", color: "var(--color-muted)", flex: 1 }}>{c.description}</span>}
            <span style={{ fontSize: "0.8rem", background: "var(--color-surface)", padding: "2px 8px", borderRadius: "99px" }}>
              {c.discount_type === "percent" ? `${c.discount_value}%` : `${c.discount_value}원`} 할인
            </span>
            <span style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>사용 {c.uses}{c.max_uses !== null ? `/${c.max_uses}` : ""}회</span>
            {c.expires_at && <span style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>~{ts(c.expires_at)}</span>}
            <Badge active={c.active} />
            <Btn onClick={() => toggle(c)} variant="ghost">{c.active ? "비활성화" : "활성화"}</Btn>
            <Btn onClick={() => del(c.id)} variant="danger">삭제</Btn>
          </div>
        ))}
    </div>
  );
}

// ─── License Tab ─────────────────────────────────────────────────────────────

function LicenseTab() {
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [label, setLabel] = useState("");
  const [product, setProduct] = useState("");
  const [maxActivations, setMaxActivations] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");
  const [customKey, setCustomKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/v1/codes/license");
      if (r.ok) {
        const d = await r.json();
        setKeys(Array.isArray(d.keys) ? d.keys : []);
      }
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (submitting) return;
    setErr("");
    setSubmitting(true);
    try {
      const r = await fetch("/api/v1/codes/license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label, product,
          max_activations: Number(maxActivations) || 1,
          expires_at: expiresAt ? new Date(expiresAt).getTime() : null,
          custom_key: customKey || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "생성 실패"); }
      else {
        if (d.key) setKeys(prev => [d.key, ...prev]);
        setLabel(""); setProduct(""); setMaxActivations("1"); setExpiresAt(""); setCustomKey("");
        load();
      }
    } catch { setErr("네트워크 오류"); }
    setSubmitting(false);
  }

  async function toggle(k: LicenseKey) {
    const r = await fetch(`/api/v1/codes/license/${k.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !k.active }) });
    if (r.ok) { const d = await r.json(); setKeys(prev => prev.map(x => x.id === k.id ? d.key : x)); }
  }

  async function del(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/v1/codes/license/${id}`, { method: "DELETE" });
    setKeys(prev => prev.filter(k => k.id !== id));
  }

  return (
    <div>
      <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
        <p style={{ fontWeight: 600, marginBottom: "10px" }}>새 라이선스 키 생성</p>
        {err && <ErrBox msg={err} />}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
          <div style={{ flex: "1 1 140px" }}><Input value={label} onChange={setLabel} placeholder="라벨 (예: Standard)" /></div>
          <div style={{ flex: "1 1 140px" }}><Input value={product} onChange={setProduct} placeholder="제품명" /></div>
          <div style={{ flex: "1 1 80px" }}><Input value={maxActivations} onChange={setMaxActivations} placeholder="최대 활성화" type="number" /></div>
          <div style={{ flex: "1 1 140px" }}><Input value={expiresAt} onChange={setExpiresAt} placeholder="만료일" type="date" /></div>
          <div style={{ flex: "2 1 200px" }}><Input value={customKey} onChange={setCustomKey} placeholder="커스텀 키 (선택)" /></div>
        </div>
        <Btn onClick={create} disabled={submitting}>{submitting ? "생성 중..." : "생성"}</Btn>
      </div>

      {keys.length === 0
        ? <p style={{ color: "var(--color-muted)", textAlign: "center", padding: "32px" }}>라이선스 키가 없습니다. 위에서 생성해보세요.</p>
        : keys.map(k => (
          <div key={k.id} style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "8px", padding: "12px 16px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <code style={{ fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer", fontSize: "0.875rem" }} onClick={() => copyText(k.key)} title="클릭하여 복사">{k.key}</code>
            {k.label && <span style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>{k.label}</span>}
            {k.product && <span style={{ fontSize: "0.8rem", padding: "1px 6px", background: "var(--color-surface)", borderRadius: "99px" }}>{k.product}</span>}
            <span style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>활성화 {k.activations ?? 0}/{k.max_activations ?? 1}</span>
            {k.expires_at && <span style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>~{ts(k.expires_at)}</span>}
            <Badge active={k.active} />
            <Btn onClick={() => toggle(k)} variant="ghost">{k.active ? "비활성화" : "활성화"}</Btn>
            <Btn onClick={() => del(k.id)} variant="danger">삭제</Btn>
          </div>
        ))}
    </div>
  );
}

// ─── OTP Tab ─────────────────────────────────────────────────────────────────

function OtpTab() {
  const [otps, setOtps] = useState<OTP[]>([]);
  const [purpose, setPurpose] = useState("");
  const [ttl, setTtl] = useState("10");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; error?: string; purpose?: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/v1/codes/otp");
      if (r.ok) {
        const d = await r.json();
        setOtps(Array.isArray(d.codes) ? d.codes : []);
      }
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (submitting) return;
    setErr("");
    setSubmitting(true);
    try {
      const r = await fetch("/api/v1/codes/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose, ttl_minutes: Number(ttl) || 10 }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "생성 실패"); }
      else {
        if (d.otp) setOtps(prev => [d.otp, ...prev]);
        setPurpose("");
        load();
      }
    } catch { setErr("네트워크 오류"); }
    setSubmitting(false);
  }

  async function verify() {
    setVerifyResult(null);
    try {
      const r = await fetch("/api/v1/codes/otp?action=verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode }),
      });
      const d = await r.json();
      setVerifyResult(d);
      if (d.valid) { setVerifyCode(""); load(); }
    } catch { setVerifyResult({ valid: false, error: "네트워크 오류" }); }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
        <div style={{ flex: "1 1 280px", background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "10px", padding: "16px" }}>
          <p style={{ fontWeight: 600, marginBottom: "10px" }}>OTP 생성</p>
          {err && <ErrBox msg={err} />}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <Input value={purpose} onChange={setPurpose} placeholder="용도 (예: 이메일 인증)" />
            <Input value={ttl} onChange={setTtl} placeholder="유효 시간 (분)" type="number" />
            <Btn onClick={create} disabled={submitting}>{submitting ? "생성 중..." : "OTP 생성"}</Btn>
          </div>
        </div>
        <div style={{ flex: "1 1 280px", background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "10px", padding: "16px" }}>
          <p style={{ fontWeight: 600, marginBottom: "10px" }}>OTP 검증</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <Input value={verifyCode} onChange={setVerifyCode} placeholder="6자리 코드 입력" />
            <Btn onClick={verify}>검증</Btn>
            {verifyResult && (
              <div style={{ padding: "8px 10px", borderRadius: "6px", background: verifyResult.valid ? "#DCFCE7" : "#FEE2E2", color: verifyResult.valid ? "#166534" : "#991B1B", fontSize: "0.875rem" }}>
                {verifyResult.valid ? `✓ 유효한 코드${verifyResult.purpose ? ` (${verifyResult.purpose})` : ""}` : `✗ ${verifyResult.error}`}
              </div>
            )}
          </div>
        </div>
      </div>

      {otps.length === 0
        ? <p style={{ color: "var(--color-muted)", textAlign: "center", padding: "32px" }}>생성된 OTP가 없습니다. 위에서 생성해보세요.</p>
        : otps.slice(0, 20).map(o => (
          <div key={o.id} style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "8px", padding: "10px 16px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "12px" }}>
            <code style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "1.1rem", letterSpacing: "0.2em", cursor: "pointer" }} onClick={() => copyText(o.code)}>{o.code}</code>
            {o.purpose && <span style={{ fontSize: "0.8rem", color: "var(--color-muted)", flex: 1 }}>{o.purpose}</span>}
            <span style={{ fontSize: "0.75rem", padding: "1px 6px", borderRadius: "99px", background: o.used ? "#FEE2E2" : "#DCFCE7", color: o.used ? "#991B1B" : "#166534" }}>{o.used ? "사용됨" : "미사용"}</span>
            <span style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>~{ts(o.expires_at)}</span>
          </div>
        ))}
    </div>
  );
}

// ─── URL Shortener Tab ────────────────────────────────────────────────────────

function UrlTab() {
  const [urls, setUrls] = useState<ShortUrl[]>([]);
  const [targetUrl, setTargetUrl] = useState("");
  const [title, setTitle] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/v1/codes/url");
      if (r.ok) {
        const d = await r.json();
        setUrls(Array.isArray(d.urls) ? d.urls : []);
      }
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (submitting || !targetUrl) return;
    setErr("");
    setSubmitting(true);
    try {
      const r = await fetch("/api/v1/codes/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_url: targetUrl, title, custom_code: customCode || undefined }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "생성 실패"); }
      else {
        if (d.url) setUrls(prev => [d.url, ...prev]);
        setTargetUrl(""); setTitle(""); setCustomCode("");
        load();
      }
    } catch { setErr("네트워크 오류"); }
    setSubmitting(false);
  }

  async function toggle(u: ShortUrl) {
    const r = await fetch(`/api/v1/codes/url/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !u.active }) });
    if (r.ok) { const d = await r.json(); setUrls(prev => prev.map(x => x.id === u.id ? d.url : x)); }
  }

  async function del(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/v1/codes/url/${id}`, { method: "DELETE" });
    setUrls(prev => prev.filter(u => u.id !== id));
  }

  return (
    <div>
      <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
        <p style={{ fontWeight: 600, marginBottom: "10px" }}>URL 단축</p>
        {err && <ErrBox msg={err} />}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
          <div style={{ flex: "3 1 240px" }}><Input value={targetUrl} onChange={setTargetUrl} placeholder="https://..." /></div>
          <div style={{ flex: "1 1 120px" }}><Input value={title} onChange={setTitle} placeholder="제목 (선택)" /></div>
          <div style={{ flex: "1 1 120px" }}><Input value={customCode} onChange={setCustomCode} placeholder="커스텀 코드 (선택)" /></div>
        </div>
        <Btn onClick={create} disabled={submitting || !targetUrl}>{submitting ? "생성 중..." : "단축하기"}</Btn>
      </div>

      {urls.length === 0
        ? <p style={{ color: "var(--color-muted)", textAlign: "center", padding: "32px" }}>단축 URL이 없습니다. 위에서 생성해보세요.</p>
        : urls.map(u => (
          <div key={u.id} style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "8px", padding: "12px 16px", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
              <code style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--color-accent)", cursor: "pointer" }}
                onClick={() => copyText(`https://go.krl.kr/${u.code}`)} title="클릭하여 복사">
                go.krl.kr/{u.code}
              </code>
              {u.title && <span style={{ fontSize: "0.8rem", color: "var(--color-muted)", flex: 1 }}>{u.title}</span>}
              <span style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>클릭 {u.clicks}회</span>
              <Badge active={u.active} />
              <Btn onClick={() => toggle(u)} variant="ghost">{u.active ? "비활성화" : "활성화"}</Btn>
              <Btn onClick={() => del(u.id)} variant="danger">삭제</Btn>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--color-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>→ {u.target_url}</p>
          </div>
        ))}
    </div>
  );
}

// ─── Developer API Tab ────────────────────────────────────────────────────────

function DevTab() {
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/keys").then(r => r.json()).then(d => {
      const keys = d.keys ?? d.apiKeys ?? [];
      if (keys.length > 0) setApiKey(`${keys[0].key_prefix}...`);
    }).catch(() => {});
  }, []);

  const codeBlock = (code: string) => (
    <pre style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)", borderRadius: "8px", padding: "14px 16px", overflow: "auto", fontSize: "0.8125rem", fontFamily: "monospace", lineHeight: 1.6 }}>{code}</pre>
  );

  return (
    <div style={{ maxWidth: "720px" }}>
      <div style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px" }}>
        <p style={{ fontWeight: 600, marginBottom: "4px" }}>Base URL: <code style={{ fontFamily: "monospace" }}>https://krl.kr/api/code</code></p>
        <p style={{ fontSize: "0.875rem", color: "#0369A1" }}>모든 요청에 <code>X-API-Key</code> 헤더가 필요합니다.</p>
        <p style={{ marginTop: "8px", fontSize: "0.8125rem" }}>
          {apiKey
            ? <>API 키 접두사: <code style={{ fontFamily: "monospace", background: "white", padding: "1px 6px", borderRadius: "4px" }}>{apiKey}</code></>
            : <a href="/dashboard/api-keys" style={{ color: "#0369A1" }}>API 키 발급하기 →</a>}
        </p>
      </div>

      <h3 style={{ fontWeight: 700, marginBottom: "8px" }}>OTP 생성</h3>
      {codeBlock(`POST /api/code?action=create\nX-API-Key: your-api-key\nContent-Type: application/json\n\n{\n  "type": "otp",\n  "purpose": "이메일 인증",\n  "ttl_minutes": 10\n}`)}

      <h3 style={{ fontWeight: 700, margin: "16px 0 8px" }}>OTP 검증</h3>
      {codeBlock(`POST /api/code?action=verify\nX-API-Key: your-api-key\n\n{\n  "type": "otp",\n  "code": "482910"\n}`)}

      <h3 style={{ fontWeight: 700, margin: "16px 0 8px" }}>쿠폰 검증</h3>
      {codeBlock(`POST /api/code?action=verify\nX-API-Key: your-api-key\n\n{\n  "type": "coupon",\n  "code": "SUMMER20"\n}`)}

      <h3 style={{ fontWeight: 700, margin: "16px 0 8px" }}>라이선스 검증</h3>
      {codeBlock(`POST /api/code?action=verify\nX-API-Key: your-api-key\n\n{\n  "type": "license",\n  "key": "XXXX-XXXX-XXXX-XXXX"\n}`)}

      <h3 style={{ fontWeight: 700, margin: "16px 0 8px" }}>URL 단축 생성</h3>
      {codeBlock(`POST /api/code?action=create\nX-API-Key: your-api-key\n\n{\n  "type": "url",\n  "target_url": "https://example.com/very/long/path",\n  "title": "내 링크"\n}\n\n// Response\n{ "success": true, "short_url": "https://go.krl.kr/aB3x9" }`)}

      <h3 style={{ fontWeight: 700, margin: "16px 0 8px" }}>쿠폰 사용 처리</h3>
      {codeBlock(`POST /api/code?action=redeem\nX-API-Key: your-api-key\n\n{\n  "type": "coupon",\n  "code": "SUMMER20"\n}`)}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CodesPage() {
  const [tab, setTab] = useState("invite");

  return (
    <div style={{ padding: "32px", maxWidth: "960px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "4px" }}>KRL Codes</h1>
        <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>초대 코드, 쿠폰, 라이선스 키, OTP, URL 단축 통합 관리</p>
      </div>

      <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid var(--color-hairline)", marginBottom: "24px", flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: "8px 16px", background: "none", border: "none", cursor: "pointer",
              fontSize: "0.9rem", fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? "var(--color-ink)" : "var(--color-muted)",
              borderBottom: tab === t.id ? "2px solid var(--color-ink)" : "2px solid transparent",
              marginBottom: "-1px", fontFamily: "var(--font-sans)", transition: "color 0.1s",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "invite" && <InviteTab />}
      {tab === "coupon" && <CouponTab />}
      {tab === "license" && <LicenseTab />}
      {tab === "otp" && <OtpTab />}
      {tab === "url" && <UrlTab />}
      {tab === "dev" && <DevTab />}
    </div>
  );
}
