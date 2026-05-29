"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";

interface UserDetail {
  id: string; email: string; name: string | null; plan: string; verified: number; created_at: number;
}
interface LinkRow { id: string; slug: string; original_url: string; title: string | null; click_count: number; is_active: number; created_at: number; }
interface EmailRow { id: string; alias: string; forward_to: string; is_active: number; created_at: number; }
interface SubRow { id: string; subdomain: string; type: string; target: string; is_active: number; created_at: number; }
interface BlockRow { reason: string | null; blocked_by: string; blocked_at: number; expires_at: number | null; block_type: string; }
interface NoteRow { id: number; admin_email: string; note: string; created_at: number; }
interface AppealRow { id: number; reason: string; status: string; created_at: number; admin_response: string | null; }

function Section({ title, children, count }: { title: string; children: React.ReactNode; count?: number }) {
  return (
    <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", marginBottom: "20px", overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", gap: "8px" }}>
        <h3 style={{ fontSize: "0.9375rem", fontWeight: 700 }}>{title}</h3>
        {count !== undefined && (
          <span style={{ fontSize: "0.75rem", background: "var(--color-surface-card)", padding: "1px 7px", borderRadius: "10px", fontWeight: 600 }}>{count}</span>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<{
    user: UserDetail; links: LinkRow[]; emails: EmailRow[];
    subdomains: SubRow[]; block: BlockRow | null; communityBan: BlockRow | null;
    notes: NoteRow[]; appeals: AppealRow[]; isMaster: boolean;
  } | null>(null);
  const [note, setNote] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockModal, setBlockModal] = useState<"block" | "ban" | null>(null);

  async function load() {
    const res = await fetch(`/api/admin/users/${id}`);
    if (res.ok) setData(await res.json());
  }

  useEffect(() => { load(); }, [id]);

  async function doBlock() {
    await fetch(`/api/admin/users/${id}/block`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: blockReason }),
    });
    setBlockModal(null); setBlockReason(""); load();
  }
  async function doUnblock() {
    await fetch(`/api/admin/users/${id}/block`, { method: "DELETE" }); load();
  }
  async function doCommunityBan() {
    await fetch(`/api/admin/community/${id}/ban`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: blockReason }),
    });
    setBlockModal(null); setBlockReason(""); load();
  }
  async function doCommunityUnban() {
    await fetch(`/api/admin/community/${id}/ban`, { method: "DELETE" }); load();
  }
  async function doDelete() {
    if (!confirm("이 계정과 모든 데이터를 영구 삭제하시겠습니까? 복구 불가!")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) window.location.href = "/dashboard/admin/users";
  }
  async function addNote() {
    if (!note.trim()) return;
    await fetch(`/api/admin/users/${id}/notes`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    setNote(""); load();
  }
  async function deleteLink(lid: string) {
    if (!confirm("링크를 삭제하시겠습니까?")) return;
    await fetch(`/api/admin/users/${id}/links/${lid}`, { method: "DELETE" }); load();
  }
  async function toggleLink(lid: string) {
    await fetch(`/api/admin/users/${id}/links/${lid}`, { method: "PATCH" }); load();
  }
  async function deleteEmail(eid: string) {
    if (!confirm("이메일 별칭을 삭제하시겠습니까?")) return;
    await fetch(`/api/admin/users/${id}/emails/${eid}`, { method: "DELETE" }); load();
  }
  async function deleteSub(sid: string) {
    if (!confirm("서브도메인을 삭제하시겠습니까?")) return;
    await fetch(`/api/admin/users/${id}/subdomains/${sid}`, { method: "DELETE" }); load();
  }
  async function toggleSub(sid: string) {
    await fetch(`/api/admin/users/${id}/subdomains/${sid}`, { method: "PATCH" }); load();
  }
  async function deleteNote(noteId: number) {
    await fetch(`/api/admin/users/${id}/notes?noteId=${noteId}`, { method: "DELETE" }); load();
  }

  if (!data) return <div style={{ padding: "48px", textAlign: "center", color: "var(--color-muted)" }}>로딩 중...</div>;

  const { user, links, emails, subdomains, block, communityBan, notes, appeals, isMaster } = data;

  return (
    <div style={{ padding: "28px" }}>
      {/* Back */}
      <Link href="/dashboard/admin/users" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--color-muted)", textDecoration: "none", fontSize: "0.875rem", marginBottom: "20px" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        사용자 목록
      </Link>

      {/* User header */}
      <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "24px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{user.name ?? "이름 없음"}</h1>
              {isMaster && <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "var(--radius-pill)", background: "var(--color-ink)", color: "var(--color-canvas)", fontWeight: 700 }}>마스터 관리자</span>}
              {block && <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "var(--radius-pill)", background: "#DC262620", color: "#DC2626", fontWeight: 700 }}>차단됨</span>}
              {communityBan && <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "var(--radius-pill)", background: "#D9770620", color: "#D97706", fontWeight: 700 }}>커뮤 차단</span>}
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", fontFamily: "var(--font-mono)" }}>{user.email}</p>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginTop: "4px" }}>
              플랜: <strong>{user.plan}</strong> · 가입: {new Date(Number(user.created_at)).toLocaleDateString("ko-KR")} · ID: {user.id.slice(0, 12)}
            </p>
          </div>
          {!isMaster && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {block ? (
                <button onClick={doUnblock} className="btn btn-ghost btn-sm" style={{ color: "#059669" }}>차단 해제</button>
              ) : (
                <button onClick={() => setBlockModal("block")} className="btn btn-ghost btn-sm" style={{ color: "#DC2626" }}>차단</button>
              )}
              {communityBan ? (
                <button onClick={doCommunityUnban} className="btn btn-ghost btn-sm" style={{ color: "#059669" }}>커뮤 해제</button>
              ) : (
                <button onClick={() => setBlockModal("ban")} className="btn btn-ghost btn-sm" style={{ color: "#D97706" }}>커뮤 차단</button>
              )}
              <button onClick={doDelete} className="btn btn-sm" style={{ background: "#DC2626", color: "white", border: "none" }}>계정 삭제</button>
            </div>
          )}
        </div>

        {/* Block info */}
        {block && (
          <div style={{ marginTop: "16px", padding: "12px 14px", background: "#DC262208", borderRadius: "var(--radius-md)", border: "1px solid #DC262230" }}>
            <p style={{ fontSize: "0.8125rem", color: "#DC2626", fontWeight: 600, marginBottom: "3px" }}>차단 사유: {block.reason ?? "사유 없음"}</p>
            <p style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>
              차단자: {block.blocked_by} · {new Date(Number(block.blocked_at)).toLocaleDateString("ko-KR")}
              {block.expires_at ? ` · 만료: ${new Date(Number(block.expires_at)).toLocaleDateString("ko-KR")}` : " · 영구"}
            </p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "링크", value: links.length },
          { label: "이메일", value: emails.length },
          { label: "서브도메인", value: subdomains.length },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-lg)", padding: "14px 18px", textAlign: "center" }}>
            <p style={{ fontSize: "1.75rem", fontWeight: 700 }}>{s.value}</p>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Links */}
      <Section title="단축 링크" count={links.length}>
        {links.length === 0 ? (
          <p style={{ padding: "20px", color: "var(--color-muted)", fontSize: "0.875rem" }}>링크 없음</p>
        ) : (
          <table className="data-table">
            <thead><tr><th>슬러그</th><th>원본 URL</th><th>클릭</th><th>상태</th><th style={{ textAlign: "right" }}>관리</th></tr></thead>
            <tbody>
              {links.map(l => (
                <tr key={l.id}>
                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.875rem" }}>/{l.slug}</td>
                  <td style={{ fontSize: "0.8125rem", color: "var(--color-muted)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.original_url}</td>
                  <td>{l.click_count}</td>
                  <td><span style={{ fontSize: "0.75rem", padding: "1px 6px", borderRadius: "4px", background: l.is_active ? "#05966920" : "#DC262220", color: l.is_active ? "#059669" : "#DC2626", fontWeight: 600 }}>{l.is_active ? "활성" : "비활성"}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                      <button onClick={() => toggleLink(l.id)} className="btn btn-ghost btn-sm" style={{ fontSize: "0.8rem" }}>{l.is_active ? "비활성" : "활성"}</button>
                      <button onClick={() => deleteLink(l.id)} className="btn btn-ghost btn-sm" style={{ color: "#DC2626", fontSize: "0.8rem" }}>삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Emails */}
      <Section title="이메일 별칭" count={emails.length}>
        {emails.length === 0 ? (
          <p style={{ padding: "20px", color: "var(--color-muted)", fontSize: "0.875rem" }}>이메일 없음</p>
        ) : (
          <table className="data-table">
            <thead><tr><th>별칭</th><th>전달 주소</th><th>생성일</th><th style={{ textAlign: "right" }}>관리</th></tr></thead>
            <tbody>
              {emails.map(e => (
                <tr key={e.id}>
                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.875rem" }}>{e.alias}@krl.kr</td>
                  <td style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>{e.forward_to}</td>
                  <td style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>{new Date(Number(e.created_at)).toLocaleDateString("ko-KR")}</td>
                  <td style={{ textAlign: "right" }}>
                    <button onClick={() => deleteEmail(e.id)} className="btn btn-ghost btn-sm" style={{ color: "#DC2626", fontSize: "0.8rem" }}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Subdomains */}
      <Section title="서브도메인" count={subdomains.length}>
        {subdomains.length === 0 ? (
          <p style={{ padding: "20px", color: "var(--color-muted)", fontSize: "0.875rem" }}>서브도메인 없음</p>
        ) : (
          <table className="data-table">
            <thead><tr><th>서브도메인</th><th>유형</th><th>대상</th><th>상태</th><th style={{ textAlign: "right" }}>관리</th></tr></thead>
            <tbody>
              {subdomains.map(s => (
                <tr key={s.id}>
                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.875rem" }}>{s.subdomain}.krl.kr</td>
                  <td style={{ fontSize: "0.8125rem" }}>{s.type}</td>
                  <td style={{ fontSize: "0.8125rem", color: "var(--color-muted)", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.target}</td>
                  <td><span style={{ fontSize: "0.75rem", padding: "1px 6px", borderRadius: "4px", background: s.is_active ? "#05966920" : "#DC262220", color: s.is_active ? "#059669" : "#DC2626", fontWeight: 600 }}>{s.is_active ? "활성" : "비활성"}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                      <button onClick={() => toggleSub(s.id)} className="btn btn-ghost btn-sm" style={{ fontSize: "0.8rem" }}>{s.is_active ? "비활성" : "활성"}</button>
                      <button onClick={() => deleteSub(s.id)} className="btn btn-ghost btn-sm" style={{ color: "#DC2626", fontSize: "0.8rem" }}>삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Appeals */}
      {appeals.length > 0 && (
        <Section title="이의제기 내역" count={appeals.length}>
          {appeals.map(a => (
            <div key={a.id} style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-hairline)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span style={{ fontSize: "0.75rem", padding: "1px 7px", borderRadius: "4px", fontWeight: 700,
                  background: a.status === "pending" ? "#D9770620" : a.status === "approved" ? "#05966920" : "#DC262220",
                  color: a.status === "pending" ? "#D97706" : a.status === "approved" ? "#059669" : "#DC2626" }}>
                  {a.status === "pending" ? "검토 중" : a.status === "approved" ? "승인" : "거부"}
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{new Date(Number(a.created_at)).toLocaleDateString("ko-KR")}</span>
              </div>
              <p style={{ fontSize: "0.875rem", marginBottom: a.admin_response ? "6px" : 0 }}>{a.reason}</p>
              {a.admin_response && <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", fontStyle: "italic" }}>관리자: {a.admin_response}</p>}
            </div>
          ))}
        </Section>
      )}

      {/* Notes */}
      <Section title="관리자 메모">
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-hairline)", display: "flex", gap: "10px" }}>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="메모 추가..."
            onKeyDown={e => { if (e.key === "Enter") addNote(); }}
            style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", background: "var(--color-canvas)", color: "var(--color-ink)" }}
          />
          <button onClick={addNote} disabled={!note.trim()} className="btn btn-primary btn-sm">추가</button>
        </div>
        {notes.length === 0 ? (
          <p style={{ padding: "16px 20px", color: "var(--color-muted)", fontSize: "0.875rem" }}>메모 없음</p>
        ) : notes.map(n => (
          <div key={n.id} style={{ padding: "12px 20px", borderBottom: "1px solid var(--color-hairline)", display: "flex", gap: "10px", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: "0.875rem", marginBottom: "3px" }}>{n.note}</p>
              <p style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{n.admin_email} · {new Date(Number(n.created_at)).toLocaleDateString("ko-KR")}</p>
            </div>
            <button onClick={() => deleteNote(n.id)} className="btn btn-ghost btn-sm" style={{ color: "var(--color-muted)", flexShrink: 0, fontSize: "0.8rem" }}>삭제</button>
          </div>
        ))}
      </Section>

      {/* Block Modal */}
      {blockModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setBlockModal(null)}>
          <div style={{ background: "var(--color-canvas)", borderRadius: "var(--radius-xl)", padding: "28px", width: "400px", maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px" }}>
              {blockModal === "block" ? "사용자 차단" : "커뮤니티 차단"}
            </h3>
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginBottom: "14px" }}>{user.email}</p>
            <textarea
              placeholder="차단 사유 (선택사항)"
              value={blockReason}
              onChange={e => setBlockReason(e.target.value)}
              rows={3}
              style={{ width: "100%", padding: "10px", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", background: "var(--color-lifted)", color: "var(--color-ink)", resize: "vertical", marginBottom: "16px" }}
            />
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => setBlockModal(null)} className="btn btn-ghost btn-sm">취소</button>
              <button onClick={blockModal === "block" ? doBlock : doCommunityBan} className="btn btn-sm" style={{ background: "#DC2626", color: "white", border: "none" }}>차단 적용</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
