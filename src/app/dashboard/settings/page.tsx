"use client";
import { useState, useEffect } from "react";
import { CheckIcon, AlertCircleIcon, EyeIcon, EyeOffIcon } from "@/components/icons";
import Link from "next/link";

interface User {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  avatar_url: string | null;
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Plan / BMC
  const [planInfo, setPlanInfo] = useState<{ plan: string; bmc_email?: string } | null>(null);
  const [bmcEmail, setBmcEmail] = useState("");
  const [bmcOrderId, setBmcOrderId] = useState("");
  const [savingBmc, setSavingBmc] = useState(false);
  const [bmcSaved, setBmcSaved] = useState(false);
  const [bmcError, setBmcError] = useState("");

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUser(d.user);
          setName(d.user.name ?? "");
          setAvatarUrl(d.user.avatar_url ?? "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch("/api/v1/plan")
      .then(r => r.json())
      .then(d => {
        setPlanInfo({ plan: d.plan, bmc_email: d.row?.bmc_email });
        if (d.row?.bmc_email) setBmcEmail(d.row.bmc_email);
        if (d.row?.bmc_order_id) setBmcOrderId(d.row.bmc_order_id);
      })
      .catch(() => {});
  }, []);

  async function handleBmcSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingBmc(true); setBmcError(""); setBmcSaved(false);
    try {
      const res = await fetch("/api/v1/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bmc_email: bmcEmail, bmc_order_id: bmcOrderId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setBmcError(data.error); return; }
      setBmcSaved(true);
      // If plan was auto-activated, refresh plan info
      if (data.activated) {
        fetch("/api/v1/plan").then(r => r.json()).then(d => {
          setPlanInfo({ plan: d.plan, bmc_email: d.row?.bmc_email });
        }).catch(() => {});
      }
      setTimeout(() => setBmcSaved(false), 4000);
    } catch { setBmcError("저장 오류"); }
    setSavingBmc(false);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError("");
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, avatar_url: avatarUrl || null }),
      });
      if (res.ok) {
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 2000);
      } else {
        const d = await res.json();
        setProfileError(d.error ?? "저장에 실패했습니다.");
      }
    } catch { setProfileError("네트워크 오류가 발생했습니다."); }
    finally { setSavingProfile(false); }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("비밀번호는 최소 8자 이상이어야 합니다.");
      return;
    }
    setSavingPassword(true);
    setPasswordError("");
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      if (res.ok) {
        setPasswordSaved(true);
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
        setTimeout(() => setPasswordSaved(false), 2000);
      } else {
        const d = await res.json();
        setPasswordError(d.error ?? "비밀번호 변경에 실패했습니다.");
      }
    } catch { setPasswordError("네트워크 오류가 발생했습니다."); }
    finally { setSavingPassword(false); }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== user?.email) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/auth/me", { method: "DELETE" });
      if (res.ok) window.location.href = "/";
    } catch {}
    setDeleting(false);
  }

  const PLAN_LABELS: Record<string, string> = { free: "무료", pro: "프로", business: "비즈니스" };

  if (loading) return <div style={{ padding: "32px", color: "var(--color-muted)" }}>로딩 중...</div>;

  return (
    <div style={{ padding: "32px", maxWidth: "640px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "4px" }}>설정</h1>
        <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)" }}>계정 정보를 관리하세요.</p>
      </div>

      {/* Profile */}
      <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "24px", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "20px" }}>프로필</h3>
        {profileError && (
          <div style={{ padding: "12px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "var(--radius-sm)", marginBottom: "16px", color: "#9B1C1C", fontSize: "0.875rem", display: "flex", gap: "8px" }}>
            <AlertCircleIcon size={16} />{profileError}
          </div>
        )}
        <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>이메일</label>
            <input type="email" value={user?.email ?? ""} disabled className="input" style={{ opacity: 0.6 }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>이름</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="이름을 입력하세요" className="input" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>프로필 이미지 URL</label>
            <input type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://example.com/avatar.jpg" className="input" />
          </div>
          <button type="submit" disabled={savingProfile} className="btn btn-primary btn-sm btn-pill" style={{ alignSelf: "flex-start", gap: "6px" }}>
            {profileSaved ? <><CheckIcon size={14} />저장됨</> : savingProfile ? "저장 중..." : "프로필 저장"}
          </button>
        </form>
      </div>

      {/* Password */}
      <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "24px", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "20px" }}>비밀번호 변경</h3>
        {passwordError && (
          <div style={{ padding: "12px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "var(--radius-sm)", marginBottom: "16px", color: "#9B1C1C", fontSize: "0.875rem", display: "flex", gap: "8px" }}>
            <AlertCircleIcon size={16} />{passwordError}
          </div>
        )}
        <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {[
            { label: "현재 비밀번호", value: currentPassword, onChange: setCurrentPassword, show: showCurrentPw, setShow: setShowCurrentPw },
            { label: "새 비밀번호", value: newPassword, onChange: setNewPassword, show: showNewPw, setShow: setShowNewPw },
            { label: "새 비밀번호 확인", value: confirmPassword, onChange: setConfirmPassword, show: showNewPw, setShow: () => {} },
          ].map((field) => (
            <div key={field.label}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>{field.label}</label>
              <div style={{ position: "relative" }}>
                <input type={field.show ? "text" : "password"} value={field.value} onChange={(e) => field.onChange(e.target.value)} required className="input" style={{ paddingRight: "44px" }} />
                <button type="button" onClick={() => field.setShow(!field.show)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", display: "flex", padding: "4px" }}>
                  {field.show ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                </button>
              </div>
            </div>
          ))}
          <button type="submit" disabled={savingPassword} className="btn btn-primary btn-sm btn-pill" style={{ alignSelf: "flex-start", gap: "6px" }}>
            {passwordSaved ? <><CheckIcon size={14} />변경됨</> : savingPassword ? "변경 중..." : "비밀번호 변경"}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div style={{ background: "var(--color-lifted)", border: "1px solid #FECDD3", borderRadius: "var(--radius-xl)", padding: "24px" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-danger)", marginBottom: "12px" }}>위험 구역</h3>
        <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginBottom: "16px" }}>
          계정을 삭제하면 모든 링크, 파일, 분석 데이터가 영구적으로 삭제됩니다. 복구할 수 없습니다.
        </p>
        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>
            확인을 위해 이메일 주소를 입력하세요: <strong>{user?.email}</strong>
          </label>
          <input type="email" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder={user?.email ?? ""} className="input" />
        </div>
        <button
          onClick={handleDeleteAccount}
          disabled={deleteConfirm !== user?.email || deleting}
          className="btn btn-sm btn-pill"
          style={{ background: "var(--color-danger)", color: "white", border: "none" }}
        >
          {deleting ? "삭제 중..." : "계정 영구 삭제"}
        </button>
      </div>

      {/* BMC Plan Verification */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)", borderRadius: 16, padding: 24, marginTop: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <h2 style={{ fontSize: "1.0625rem", fontWeight: 700, margin: 0 }}>요금제</h2>
        </div>
        <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginBottom: 20 }}>
          현재 플랜: <strong style={{ textTransform: "uppercase" }}>{planInfo?.plan ?? "free"}</strong>
          {" · "}
          <Link href="/pricing" style={{ color: "var(--color-ink)" }}>요금제 비교</Link>
        </p>
        {planInfo?.plan === "free" && (
          <div style={{ padding: "12px 16px", background: "#eff6ff", borderRadius: 10, marginBottom: 20, fontSize: "0.875rem", color: "#1d4ed8" }}>
            <a href="https://www.buymeacoffee.com/krlkr/membership" target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: "#1d4ed8" }}>BuyMeACoffee 멤버십</a>에 가입하면 Drive 20GB+, 웹 호스팅, AI 이미지 생성 등을 이용할 수 있습니다.
          </div>
        )}
        <form onSubmit={handleBmcSubmit}>
          <div className="form-group">
            <label className="form-label">BuyMeACoffee 가입 이메일</label>
            <input className="input" value={bmcEmail} onChange={e => setBmcEmail(e.target.value)} placeholder="bmc@example.com" type="email" />
            <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginTop: 6 }}>BuyMeACoffee에 가입할 때 사용한 이메일을 입력하면 자동으로 플랜이 활성화됩니다.</p>
          </div>
          <div className="form-group">
            <label className="form-label">주문 ID (선택사항)</label>
            <input className="input" value={bmcOrderId} onChange={e => setBmcOrderId(e.target.value)} placeholder="BMC 주문 확인 ID" />
          </div>
          {bmcError && <p style={{ color: "var(--color-danger)", fontSize: "0.875rem", marginBottom: 12 }}>{bmcError}</p>}
          {bmcSaved && <p style={{ color: "#16a34a", fontSize: "0.875rem", marginBottom: 12 }}>✓ {planInfo?.plan !== "free" ? `플랜이 활성화되었습니다! (${planInfo?.plan?.toUpperCase()})` : "저장되었습니다. 결제 후 자동으로 업그레이드됩니다."}</p>}
          <button type="submit" className="btn btn-sm btn-pill" disabled={savingBmc || !bmcEmail}>
            {savingBmc ? "저장 중..." : "연결하기"}
          </button>
        </form>
      </div>
    </div>
  );
}
