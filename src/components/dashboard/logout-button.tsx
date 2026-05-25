"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOutIcon } from "@/components/icons";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    router.push("/login");
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="sidebar-link"
      style={{
        background: "none",
        border: "none",
        cursor: loading ? "default" : "pointer",
        width: "100%",
        textAlign: "left",
        opacity: loading ? 0.6 : 1,
      }}
    >
      <span style={{ color: "var(--color-muted)", flexShrink: 0 }}>
        <LogOutIcon size={17} />
      </span>
      {loading ? "로그아웃 중..." : "로그아웃"}
    </button>
  );
}
