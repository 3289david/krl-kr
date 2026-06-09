"use client";
import { useState, useEffect } from "react";
import { CheckIcon, AlertCircleIcon, EyeIcon, EyeOffIcon } from "@/components/icons";
import Image from "next/image";

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

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  // 2FA state
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpSection, setTotpSection] = useState<"idle" | "setup" | "disable">("idle");
  const [totpSecret, setTotpSecret] = useState("");
  const [totpQR, setTotpQR] = useState("");
  const [totpToken, setTotpToken] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError, setTotpError] = useState("");
  const [totpSuccess, setTotpSuccess] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUser(d.user);
          setName(d.user.name ?? "");
          setAvatarUrl(d.user.avatar_url ?? "");
          setTotpEnabled(!!d.user.totp_enabled);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

  async function handleStart2FASetup() {
    setTotpLoading(true);
    setTotpError("");
    try {
      const res = await fetch("/api/v1/auth/2fa/setup");
      const d = await res.json();
      if (!res.ok) { setTotpError(d.error ?? "오류가 발생했습니다."); return; }
      setTotpSecret(d.secret);
      setTotpQR(d.qr_data_url);
      setTotpSection("setup");
    } catch { setTotpError("네트워크 오류"); }
    finally { setTotpLoading(false); }
  }

  async function handleVerify2FA() {
    setTotpLoading(true);
    setTotpError("");
    try {
      const res = await fetch("/api/v1/auth/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: totpToken }),
      });
      const d = await res.json();
      if (!res.ok) { setTotpError(d.error ?? "오류"); return; }
      setTotpEnabled(true);
      setTotpSection("idle");
      setTotpToken("");
      setTotpSuccess("2단계 인증이 활성화되었습니다.");
      setTimeout(() => setTotpSuccess(""), 3000);
    } catch { setTotpError("네트워크 오류"); }
    finally { setTotpLoading(false); }
  }

  async function handleDisable2FA() {
    setTotpLoading(true);
    setTotpError("");
    try {
      const res = await fetch("/api/v1/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: totpToken }),
      });
      const d = await res.json();
      if (!res.ok) { setTotpError(d.error ?? "오류"); return; }
      setTotpEnabled(false);
      setTotpSection("idle");
      setTotpToken("");
      setTotpSuccess("2단계 인증이 비활성화되었습니다.");
      setTimeout(() => setTotpSuccess(""), 3000);
    } catch { setTotpError("네트워크 오류"); }
    finally { setTotpLoading(false); }
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

  if (loading) return <div style={{ padding: "32px", color: "var(--color-muted)" }}>로딩 중...</div>;

  return (
    <div className="settings-page" style={{ padding: "32px", maxWidth: "640px" }}>
      <style>{`
        @media (max-width: 640px) {
          .settings-page { padding: 16px !important; }
        }
      `}</style>
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

      {/* 2FA */}
      <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "24px", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "8px" }}>2단계 인증 (2FA)</h3>
        <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginBottom: "16px" }}>
          {totpEnabled ? "2단계 인증이 활성화되어 있습니다. 로그인 시 OTP 앱에서 코드를 입력해야 합니다." : "2단계 인증을 활성화하면 보안이 강화됩니다."}
        </p>
        {totpError && (
          <div style={{ padding: "10px 14px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "8px", marginBottom: "12px", color: "#9B1C1C", fontSize: "0.875rem" }}>
            {totpError}
          </div>
        )}
        {totpSuccess && (
          <div style={{ padding: "10px 14px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "8px", marginBottom: "12px", color: "#14532D", fontSize: "0.875rem" }}>
            {totpSuccess}
          </div>
        )}
        {totpSection === "idle" && (
          <button
            onClick={() => { setTotpError(""); totpEnabled ? setTotpSection("disable") : handleStart2FASetup(); }}
            disabled={totpLoading}
            className="btn btn-sm btn-pill"
            style={{ background: totpEnabled ? "var(--color-danger)" : "var(--color-accent)", color: "white", border: "none" }}
          >
            {totpLoading ? "처리 중..." : totpEnabled ? "비활성화" : "활성화"}
          </button>
        )}
        {totpSection === "setup" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {totpQR && (
              <div>
                <p style={{ fontSize: "0.875rem", marginBottom: "8px", fontWeight: 500 }}>QR 코드를 스캔하세요</p>
                <Image src={totpQR} alt="TOTP QR Code" width={200} height={200} style={{ borderRadius: "8px" }} unoptimized />
              </div>
            )}
            {!totpQR && totpSecret && (
              <div>
                <p style={{ fontSize: "0.875rem", marginBottom: "4px" }}>비밀 키 (수동 입력):</p>
                <code style={{ fontSize: "0.875rem", background: "var(--color-surface)", padding: "8px 12px", borderRadius: "6px", display: "block" }}>{totpSecret}</code>
              </div>
            )}
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>앱에서 생성된 6자리 코드 입력</label>
              <input
                type="text" inputMode="numeric" maxLength={6}
                value={totpToken} onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, ""))}
                placeholder="000000" className="input" style={{ maxWidth: "180px", letterSpacing: "0.2em", textAlign: "center" }}
              />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleVerify2FA} disabled={totpLoading || totpToken.length !== 6} className="btn btn-primary btn-sm btn-pill">
                {totpLoading ? "확인 중..." : "인증 완료"}
              </button>
              <button onClick={() => { setTotpSection("idle"); setTotpToken(""); setTotpError(""); }} className="btn btn-sm btn-pill" style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)" }}>
                취소
              </button>
            </div>
          </div>
        )}
        {totpSection === "disable" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>현재 OTP 코드를 입력하세요</label>
              <input
                type="text" inputMode="numeric" maxLength={6}
                value={totpToken} onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, ""))}
                placeholder="000000" className="input" style={{ maxWidth: "180px", letterSpacing: "0.2em", textAlign: "center" }}
              />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleDisable2FA} disabled={totpLoading || totpToken.length !== 6} className="btn btn-sm btn-pill" style={{ background: "var(--color-danger)", color: "white", border: "none" }}>
                {totpLoading ? "처리 중..." : "비활성화 확인"}
              </button>
              <button onClick={() => { setTotpSection("idle"); setTotpToken(""); setTotpError(""); }} className="btn btn-sm btn-pill" style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)" }}>
                취소
              </button>
            </div>
          </div>
        )}
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
    </div>
  );
}
