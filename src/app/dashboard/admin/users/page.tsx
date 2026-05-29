"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface AdminUser {
  id: string; email: string; name: string | null; plan: string;
  verified: number; created_at: number; link_count: number;
  email_count: number; is_blocked: boolean; is_community_banned: boolean; is_admin: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [banReason, setBanReason] = useState("");
  const [modal, setModal] = useState<"block" | "ban" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}&page=${page}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users ?? []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [q, page]);

  useEffect(() => { load(); }, [load]);

  async function handleBlock(userId: string, unblock = false) {
    if (unblock) {
      await fetch(`/api/admin/users/${userId}/block`, { method: "DELETE" });
    } else {
      await fetch(`/api/admin/users/${userId}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: blockReason }),
      });
    }
    setModal(null);
    setBlockReason("");
    load();
  }

  async function handleCommunityBan(userId: string, unban = false) {
    if (unban) {
      await fetch(`/api/admin/community/${userId}/ban`, { method: "DELETE" });
    } else {
      await fetch(`/api/admin/community/${userId}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: banReason }),
      });
    }
    setModal(null);
    setBanReason("");
    load();
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div style={{ padding: "32px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "8px" }}>사용자 관리</h1>
      <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)", marginBottom: "24px" }}>
        전체 {total.toLocaleString()}명의 사용자
      </p>

      {/* Search */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "400px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)", pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="이메일 또는 이름 검색..."
            style={{
              width: "100%", padding: "9px 12px 9px 38px", border: "1px solid var(--color-hairline)",
              borderRadius: "var(--radius-md)", background: "var(--color-lifted)", fontSize: "0.9rem",
              color: "var(--color-ink)", outline: "none",
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
        <div style={{ overflow: "auto" }}>
          <table className="data-table" style={{ minWidth: "800px" }}>
            <thead>
              <tr>
                <th>사용자</th>
                <th>플랜</th>
                <th>링크</th>
                <th>이메일</th>
                <th>가입일</th>
                <th>상태</th>
                <th style={{ textAlign: "right" }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "48px", color: "var(--color-muted)" }}>로딩 중...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "48px", color: "var(--color-muted)" }}>사용자 없음</td></tr>
              ) : users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>{u.name ?? "—"}</p>
                    <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>{u.email}</p>
                    {u.is_admin && (
                      <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "4px", background: "#7C3AED20", color: "#7C3AED", fontWeight: 600 }}>관리자</span>
                    )}
                  </td>
                  <td><span style={{ fontSize: "0.8125rem", fontWeight: 600, textTransform: "uppercase" }}>{u.plan}</span></td>
                  <td>{u.link_count}</td>
                  <td>{u.email_count}</td>
                  <td style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>
                    {new Date(Number(u.created_at)).toLocaleDateString("ko-KR")}
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                      {u.is_blocked && (
                        <span style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: "4px", background: "#DC262620", color: "#DC2626", fontWeight: 600 }}>차단됨</span>
                      )}
                      {u.is_community_banned && (
                        <span style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: "4px", background: "#D9770620", color: "#D97706", fontWeight: 600 }}>커뮤니티 차단</span>
                      )}
                      {!u.is_blocked && !u.is_community_banned && (
                        <span style={{ fontSize: "0.7rem", color: "var(--color-muted)" }}>정상</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                      {u.is_blocked ? (
                        <button
                          onClick={() => handleBlock(u.id, true)}
                          className="btn btn-ghost btn-sm"
                          style={{ color: "#059669", fontSize: "0.8rem" }}
                        >차단 해제</button>
                      ) : (
                        <button
                          onClick={() => { setSelected(u); setModal("block"); }}
                          className="btn btn-ghost btn-sm"
                          style={{ color: "#DC2626", fontSize: "0.8rem" }}
                        >차단</button>
                      )}
                      {u.is_community_banned ? (
                        <button
                          onClick={() => handleCommunityBan(u.id, true)}
                          className="btn btn-ghost btn-sm"
                          style={{ color: "#059669", fontSize: "0.8rem" }}
                        >커뮤 해제</button>
                      ) : (
                        <button
                          onClick={() => { setSelected(u); setModal("ban"); }}
                          className="btn btn-ghost btn-sm"
                          style={{ color: "#D97706", fontSize: "0.8rem" }}
                        >커뮤 차단</button>
                      )}
                      <Link href={`/dashboard/admin/users/${u.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: "0.8rem" }}>
                        상세
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: "8px", marginTop: "16px", justifyContent: "center" }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn btn-ghost btn-sm">이전</button>
          <span style={{ padding: "6px 12px", fontSize: "0.875rem", color: "var(--color-muted)" }}>
            {page} / {totalPages}
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn btn-ghost btn-sm">다음</button>
        </div>
      )}

      {/* Block Modal */}
      {modal && selected && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => setModal(null)}>
          <div style={{
            background: "var(--color-canvas)", borderRadius: "var(--radius-xl)",
            padding: "28px", width: "400px", maxWidth: "90vw",
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px" }}>
              {modal === "block" ? "사용자 차단" : "커뮤니티 차단"}
            </h3>
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginBottom: "16px" }}>
              <strong>{selected.email}</strong>
            </p>
            <textarea
              placeholder="차단 사유 (선택사항)"
              value={modal === "block" ? blockReason : banReason}
              onChange={(e) => modal === "block" ? setBlockReason(e.target.value) : setBanReason(e.target.value)}
              rows={3}
              style={{
                width: "100%", padding: "10px", border: "1px solid var(--color-hairline)",
                borderRadius: "var(--radius-md)", fontSize: "0.875rem",
                background: "var(--color-lifted)", color: "var(--color-ink)",
                resize: "vertical", marginBottom: "16px",
              }}
            />
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => setModal(null)} className="btn btn-ghost btn-sm">취소</button>
              <button
                onClick={() => modal === "block" ? handleBlock(selected.id) : handleCommunityBan(selected.id)}
                className="btn btn-sm"
                style={{ background: "#DC2626", color: "white", border: "none" }}
              >차단 적용</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
