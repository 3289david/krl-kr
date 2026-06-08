"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

/* ─── Types ─────────────────────────────────────────────── */
interface User { id: string; name: string; username: string | null; discriminator: string | null; avatar: string | null; }
interface Reaction { emoji: string; count: number; mine: boolean; }
interface Attachment { id?: number; name: string; mimeType: string; size: number; url: string; }
interface Message {
  id: number; roomId: number; userId: string; content: string | null;
  type: string; threadId: number | null; replyCount: number;
  editedAt: number | null; deletedAt: number | null; createdAt: number;
  author: User | null; reactions: Reaction[]; attachments: Attachment[]; isOwn: boolean;
}
interface Room {
  id: number; type: "direct"|"group"|"channel"; name: string | null;
  description: string | null; avatar: string | null; isPublic: boolean;
  ownerId: string | null; inviteCode: string | null; role: string;
  lastReadAt: number; unread: number; otherMembers: User[];
  lastMessage: { id: number; content: string; userId: string; name: string; createdAt: number } | null;
  createdAt: number; updatedAt: number;
}
interface Friend { id: number; friendId: string; name: string; username: string|null; avatar: string|null; status: string; direction: string; online: boolean; }
interface Profile { id: string; name: string; username: string|null; discriminator: string|null; email: string; avatar: string|null; plan: string; }

/* ─── SVG Icons ─────────────────────────────────────────── */
const I = {
  send: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  attach: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>,
  mic: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  stop: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>,
  ai: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 12l4-4 4 4"/><path d="M16 8v8"/></svg>,
  user: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  x: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  reply: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>,
  edit: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 0V4h4v2"/></svg>,
  smile: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
  copy: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  star: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  folder: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  hash: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>,
  users: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  download: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  check: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>,
};

const EMOJI_LIST = ["👍","❤️","😂","😮","😢","😡","🎉","🔥","👏","✅","❓","💯","🙏","😍","🤔","👎","⭐","🎊","💡","🚀","😎","🥰","😭","🤣"];
const api = (path: string, opts?: RequestInit) => fetch(`/api/v1/chat${path}`, { headers: { "Content-Type": "application/json" }, ...opts });
const COLORS = ["#3b82f6","#8b5cf6","#ec4899","#ef4444","#f59e0b","#10b981","#6366f1","#14b8a6"];

/* ─── Helpers ─────────────────────────────────────────────── */
function Av({ user, size = 32 }: { user: User|null; size?: number }) {
  const name = user?.name ?? "?";
  const color = COLORS[(name.charCodeAt(0) ?? 0) % COLORS.length];
  if (user?.avatar) return <img src={user.avatar} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, fontWeight: 700, color: "#fff", flexShrink: 0, userSelect: "none" }}>{name.charAt(0).toUpperCase()}</div>;
}
function fmt(bytes: number) { if (bytes < 1024) return `${bytes}B`; if (bytes < 1048576) return `${(bytes/1024).toFixed(1)}KB`; return `${(bytes/1048576).toFixed(1)}MB`; }
function relTime(ts: number) { try { return formatDistanceToNow(new Date(ts), { addSuffix: true, locale: ko }); } catch { return ""; } }
function shortTime(ts: number) { return new Date(ts).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }); }
function roomName(room: Room, myId: string) {
  if (room.type === "direct") return room.otherMembers.find(m => m.id !== myId)?.name ?? "DM";
  return room.name ?? "채팅방";
}
function userTag(u: { name: string; username?: string|null; discriminator?: string|null }) {
  if (u.username && u.discriminator) return `@${u.username}#${u.discriminator}`;
  if (u.username) return `@${u.username}`;
  return u.name;
}

/* ─── Attachment Preview ──────────────────────────────────── */
function AttachView({ att }: { att: Attachment }) {
  const isImg = att.mimeType.startsWith("image/");
  const isAudio = att.mimeType.startsWith("audio/");
  const isVideo = att.mimeType.startsWith("video/");
  if (isImg) return (
    <a href={att.url} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 6 }}>
      <img src={att.url} alt={att.name} style={{ maxWidth: 280, maxHeight: 200, borderRadius: 8, objectFit: "cover", cursor: "zoom-in" }} />
    </a>
  );
  if (isAudio) return (
    <div style={{ marginTop: 6, background: "var(--color-canvas)", borderRadius: 10, padding: "8px 12px", maxWidth: 280 }}>
      <div style={{ fontSize: ".75rem", color: "var(--color-muted)", marginBottom: 4 }}>{att.name}</div>
      <audio controls src={att.url} style={{ width: "100%", height: 32 }} />
    </div>
  );
  if (isVideo) return <video controls src={att.url} style={{ marginTop: 6, maxWidth: 280, maxHeight: 180, borderRadius: 8, display: "block" }} />;
  return (
    <a href={att.url} download={att.name} target="_blank" rel="noreferrer" style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--color-canvas)", borderRadius: 8, textDecoration: "none", color: "var(--color-ink)", border: "1px solid var(--color-hairline)" }}>
      {I.download}<span style={{ fontSize: ".8125rem" }}>{att.name}</span><span style={{ fontSize: ".72rem", color: "var(--color-muted)" }}>{fmt(att.size)}</span>
    </a>
  );
}

/* ─── Message Item ────────────────────────────────────────── */
function MsgItem({ msg, prevMsg, myId, onReact, onEdit, onDelete, onThread }: {
  msg: Message; prevMsg: Message|null; myId: string;
  onReact(id: number, emoji: string): void;
  onEdit(msg: Message): void;
  onDelete(id: number): void;
  onThread(msg: Message): void;
}) {
  const [hover, setHover] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const sameUser = prevMsg?.userId === msg.userId && msg.createdAt - (prevMsg?.createdAt ?? 0) < 300_000;
  const isOwn = msg.userId === myId;
  if (msg.deletedAt) return <div style={{ padding: "2px 16px 2px 62px", color: "var(--color-muted)", fontSize: ".8125rem", fontStyle: "italic" }}>메시지가 삭제되었습니다.</div>;
  return (
    <div style={{ display: "flex", gap: 10, padding: sameUser ? "1px 16px" : "8px 16px 1px", position: "relative", background: hover ? "var(--color-canvas)" : "transparent", transition: "background .08s" }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setEmojiOpen(false); }}>
      <div style={{ width: 36, flexShrink: 0, paddingTop: 2, display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
        {sameUser
          ? <span style={{ fontSize: ".65rem", color: "var(--color-muted)", opacity: hover ? 1 : 0, transition: "opacity .1s", whiteSpace: "nowrap", paddingTop: 4 }}>{shortTime(msg.createdAt)}</span>
          : <Av user={msg.author} size={36} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {!sameUser && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 2 }}>
            <span style={{ fontWeight: 700, fontSize: ".9375rem" }}>{msg.author?.name ?? "알 수 없음"}</span>
            {msg.author?.username && <span style={{ fontSize: ".75rem", color: "var(--color-muted)" }}>@{msg.author.username}</span>}
            <span style={{ fontSize: ".72rem", color: "var(--color-muted)" }}>{relTime(msg.createdAt)}</span>
          </div>
        )}
        {msg.content && (
          <div style={{ fontSize: ".9375rem", lineHeight: 1.55, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
            {msg.content}
            {msg.editedAt && <span style={{ fontSize: ".72rem", color: "var(--color-muted)", marginLeft: 5 }}>(수정됨)</span>}
          </div>
        )}
        {(msg.attachments ?? []).map((a, i) => <AttachView key={i} att={a} />)}
        {(msg.reactions ?? []).length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}>
            {msg.reactions.map(r => (
              <button key={r.emoji} onClick={() => onReact(msg.id, r.emoji)}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 10, border: `1px solid ${r.mine ? "#3b82f6" : "var(--color-hairline)"}`, background: r.mine ? "#eff6ff" : "var(--color-canvas)", cursor: "pointer", fontSize: ".875rem" }}>
                {r.emoji}<span style={{ fontSize: ".75rem", fontWeight: 600, color: r.mine ? "#3b82f6" : "var(--color-muted)" }}>{r.count}</span>
              </button>
            ))}
            <button onClick={() => setEmojiOpen(v => !v)} style={{ display: "inline-flex", alignItems: "center", padding: "2px 6px", borderRadius: 10, border: "1px solid var(--color-hairline)", background: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: ".875rem" }}>{I.smile}</button>
          </div>
        )}
        {msg.replyCount > 0 && !msg.threadId && (
          <button onClick={() => onThread(msg)} style={{ marginTop: 4, background: "none", border: "none", cursor: "pointer", color: "#3b82f6", fontSize: ".8125rem", display: "flex", alignItems: "center", gap: 4 }}>
            {I.reply} {msg.replyCount}개 답글 보기
          </button>
        )}
      </div>
      {hover && (
        <div style={{ position: "absolute", right: 16, top: -14, display: "flex", gap: 2, background: "var(--color-surface)", border: "1px solid var(--color-hairline)", borderRadius: 8, padding: "2px 4px", boxShadow: "0 2px 8px rgba(0,0,0,.12)", zIndex: 10 }}>
          <button onClick={() => setEmojiOpen(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 5, color: "var(--color-muted)" }} title="반응">{I.smile}</button>
          <button onClick={() => onThread(msg)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 5, color: "var(--color-muted)" }} title="답글">{I.reply}</button>
          {isOwn && <button onClick={() => onEdit(msg)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 5, color: "var(--color-muted)" }} title="수정">{I.edit}</button>}
          {isOwn && <button onClick={() => onDelete(msg.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 5, color: "#dc2626" }} title="삭제">{I.trash}</button>}
          {emojiOpen && (
            <div style={{ position: "absolute", right: 0, top: 28, background: "var(--color-surface)", border: "1px solid var(--color-hairline)", borderRadius: 10, padding: 8, display: "flex", flexWrap: "wrap", gap: 3, width: 212, boxShadow: "0 8px 24px rgba(0,0,0,.15)", zIndex: 20 }}>
              {EMOJI_LIST.map(e => (
                <button key={e} onClick={() => { onReact(msg.id, e); setEmojiOpen(false); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", padding: "3px", borderRadius: 5, transition: "background .1s" }}
                  onMouseEnter={el => (el.currentTarget.style.background = "var(--color-canvas)")}
                  onMouseLeave={el => (el.currentTarget.style.background = "none")}>{e}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── AI Modal ───────────────────────────────────────────── */
function AIModal({ roomId, plan, onClose }: { roomId: number; plan: string; onClose(): void }) {
  const [action, setAction] = useState<"summary"|"suggest"|"meeting_notes">("summary");
  const [result, setResult] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const isPro = plan === "pro" || plan === "vip" || plan === "starter";

  async function run() {
    if (!isPro) return;
    setLoading(true); setErr(""); setResult(""); setSuggestions([]);
    const r = await api(`/${roomId}/ai`, { method: "POST", body: JSON.stringify({ action }) });
    const d = await r.json();
    if (!r.ok) { setErr(d.error); setLoading(false); return; }
    if (action === "suggest") setSuggestions(d.suggestions ?? []);
    else setResult(d.result ?? "");
    setLoading(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--color-surface)", borderRadius: 14, width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,.2)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", gap: 8 }}>
          {I.ai}
          <span style={{ fontWeight: 700, flex: 1 }}>AI 기능</span>
          {!isPro && <span style={{ fontSize: ".75rem", background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>PRO 전용</span>}
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)" }}>{I.x}</button>
        </div>
        <div style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {(["summary","suggest","meeting_notes"] as const).map(a => (
              <button key={a} onClick={() => setAction(a)}
                style={{ flex: 1, padding: "7px 4px", borderRadius: 8, border: `1.5px solid ${action===a?"#3b82f6":"var(--color-hairline)"}`, cursor: "pointer", fontSize: ".8rem", fontWeight: action===a?600:400, background: action===a?"#eff6ff":"none", color: action===a?"#3b82f6":"var(--color-muted)" }}>
                {a==="summary"?"요약":a==="suggest"?"답변 제안":"회의록"}
              </button>
            ))}
          </div>
          {!isPro ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: "var(--color-muted)", fontSize: ".875rem" }}>
              AI 기능은 Pro 플랜에서 이용 가능합니다.<br />
              <a href="/dashboard/settings" style={{ color: "#3b82f6" }}>업그레이드 →</a>
            </div>
          ) : (
            <>
              <button onClick={run} disabled={loading} className="btn btn-primary" style={{ width: "100%", height: 36, justifyContent: "center", marginBottom: 12 }}>
                {loading ? "AI 처리 중..." : "실행"}
              </button>
              {err && <div style={{ color: "#dc2626", fontSize: ".8125rem", marginBottom: 8 }}>{err}</div>}
              {action === "suggest" && suggestions.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => { navigator.clipboard.writeText(s); onClose(); }}
                      style={{ padding: "10px 14px", background: "var(--color-canvas)", border: "1px solid var(--color-hairline)", borderRadius: 8, cursor: "pointer", textAlign: "left", fontSize: ".875rem", transition: "border-color .1s" }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "#3b82f6")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-hairline)")}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {result && (
                <div style={{ background: "var(--color-canvas)", borderRadius: 8, padding: "12px 14px", fontSize: ".875rem", lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto" }}>
                  {result}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── New Room Modal ─────────────────────────────────────── */
function NewRoomModal({ onClose, onCreate, myId }: { onClose(): void; onCreate(r: Room): void; myId: string }) {
  const [tab, setTab] = useState<"create"|"join"|"dm"|"open">("create");
  const [type, setType] = useState<"group"|"channel">("group");
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [code, setCode] = useState("");
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [openRooms, setOpenRooms] = useState<Room[]>([]);

  useEffect(() => {
    if (tab === "open") {
      api("?public=1").then(r => r.json()).then(d => setOpenRooms((d.rooms ?? []).filter((r: Room) => r.isPublic)));
    }
  }, [tab]);

  async function submit() {
    setLoading(true); setErr("");
    try {
      if (tab === "join") {
        const r = await api("/join", { method: "POST", body: JSON.stringify({ code: code.trim() }) });
        const d = await r.json();
        if (!r.ok) { setErr(d.error); return; }
        window.location.href = `/dashboard/chat?room=${d.roomId}`; return;
      }
      if (tab === "dm") {
        // Send the full username string (including # discriminator if present)
        // The DM route resolves @username, username#DISC, or plain userId
        const trimmed = target.trim();
        const body = trimmed.includes("@") || trimmed.includes("#")
          ? { username: trimmed }
          : { userId: trimmed, username: trimmed }; // could be ID or username
        const r = await api("/dm", { method: "POST", body: JSON.stringify(body) });
        const d = await r.json();
        if (!r.ok) { setErr(d.error); return; }
        window.location.href = `/dashboard/chat?room=${d.roomId}`; return;
      }
      const r = await api("", { method: "POST", body: JSON.stringify({ type, name: name.trim(), isPublic }) });
      const d = await r.json();
      if (!r.ok) { setErr(d.error); return; }
      onCreate(d.room); onClose();
    } finally { setLoading(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--color-surface)", borderRadius: 14, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,.2)", overflow: "hidden", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontWeight: 700, flex: 1 }}>새 채팅</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)" }}>{I.x}</button>
        </div>
        <div style={{ display: "flex", gap: 2, padding: "8px 12px", borderBottom: "1px solid var(--color-hairline)", flexShrink: 0 }}>
          {(["create","join","dm","open"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: "6px 2px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: ".8rem", fontWeight: tab===t?600:400, background: tab===t?"var(--color-canvas)":"none", color: tab===t?"var(--color-ink)":"var(--color-muted)" }}>
              {t==="create"?"만들기":t==="join"?"초대코드":t==="dm"?"DM":"오픈채팅"}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
          {tab === "create" && (
            <>
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {(["group","channel"] as const).map(t => (
                  <button key={t} onClick={() => setType(t)}
                    style={{ flex: 1, padding: "7px", borderRadius: 8, border: `1.5px solid ${type===t?"#3b82f6":"var(--color-hairline)"}`, cursor: "pointer", fontSize: ".875rem", fontWeight: type===t?600:400, background: type===t?"#eff6ff":"none", color: type===t?"#3b82f6":"var(--color-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    {type==="group" && t==="group" ? <>{I.users} 그룹</> : type==="channel" && t==="channel" ? <>{I.hash} 채널</> : t==="group" ? <>{I.users} 그룹</> : <>{I.hash} 채널</>}
                  </button>
                ))}
              </div>
              <input className="input" placeholder={type==="channel"?"채널 이름 (예: 일반)":"그룹 이름"} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key==="Enter" && submit()} style={{ width: "100%", marginBottom: 10, height: 36 }} autoFocus />
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: ".875rem", marginBottom: 16 }}>
                <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} style={{ cursor: "pointer" }} />
                공개 채팅방 (오픈채팅 목록에 표시)
              </label>
            </>
          )}
          {tab === "join" && <input className="input" placeholder="초대 코드 입력" value={code} onChange={e => setCode(e.target.value)} style={{ width: "100%", marginBottom: 14, height: 36 }} autoFocus />}
          {tab === "dm" && <input className="input" placeholder="@username 또는 사용자 ID" value={target} onChange={e => setTarget(e.target.value)} style={{ width: "100%", marginBottom: 14, height: 36 }} autoFocus />}
          {tab === "open" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {openRooms.length === 0 ? <div style={{ textAlign: "center", color: "var(--color-muted)", padding: "20px 0", fontSize: ".875rem" }}>공개 채팅방이 없습니다</div> : openRooms.map(r => (
                <button key={r.id} onClick={async () => {
                  setLoading(true);
                  const res = await api("/join", { method: "POST", body: JSON.stringify({ roomId: r.id }) });
                  const d = await res.json();
                  setLoading(false);
                  if (!res.ok) { setErr(d.error); return; }
                  window.location.href = `/dashboard/chat?room=${d.roomId}`;
                }}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--color-canvas)", border: "1px solid var(--color-hairline)", borderRadius: 10, cursor: "pointer", textAlign: "left" }}>
                  <span style={{ width: 32, height: 32, borderRadius: 8, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{r.type==="channel"?I.hash:I.users}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: ".875rem" }}>{r.name}</div>
                    {r.description && <div style={{ fontSize: ".75rem", color: "var(--color-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description}</div>}
                  </div>
                  <span style={{ fontSize: ".75rem", color: "var(--color-muted)", flexShrink: 0 }}>참여 →</span>
                </button>
              ))}
            </div>
          )}
          {err && <div style={{ color: "#dc2626", fontSize: ".8125rem", marginBottom: 10 }}>{err}</div>}
          {tab !== "open" && (
            <button onClick={submit} disabled={loading} className="btn btn-primary" style={{ width: "100%", height: 36, justifyContent: "center" }}>
              {loading?"처리 중...":tab==="create"?"만들기":tab==="join"?"참여":"DM 시작"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Profile Settings Modal ──────────────────────────────── */
function ProfileModal({ profile, onClose, onSave }: { profile: Profile; onClose(): void; onSave(p: Profile): void }) {
  const [name, setName] = useState(profile.name ?? "");
  const [username, setUsername] = useState(profile.username ?? "");
  const [disc, setDisc] = useState(profile.discriminator ?? "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [addFriend, setAddFriend] = useState("");
  const [friendMsg, setFriendMsg] = useState("");

  async function save() {
    setLoading(true); setErr(""); setOk(false);
    const body: Record<string, string> = {};
    if (name !== profile.name) body.name = name;
    if (username !== (profile.username ?? "")) body.username = username;
    if (disc !== (profile.discriminator ?? "") && disc.length === 4) body.discriminator = disc;
    const r = await api("/profile", { method: "PATCH", body: JSON.stringify(body) });
    const d = await r.json();
    setLoading(false);
    if (!r.ok) { setErr(d.error); return; }
    setOk(true);
    onSave({ ...profile, name, username: username || null, discriminator: disc || null });
  }

  async function sendFriend() {
    const r = await api("/friends", { method: "POST", body: JSON.stringify({ username: addFriend.replace(/^@/,"") }) });
    const d = await r.json();
    setFriendMsg(d.message ?? d.error ?? "전송됨");
    setAddFriend("");
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--color-surface)", borderRadius: 14, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,.2)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", gap: 8 }}>
          {I.settings}<span style={{ fontWeight: 700, flex: 1 }}>내 프로필 설정</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)" }}>{I.x}</button>
        </div>
        <div style={{ padding: "16px 20px" }}>
          {/* ID display */}
          <div style={{ background: "var(--color-canvas)", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
            <div style={{ fontSize: ".72rem", color: "var(--color-muted)", marginBottom: 2 }}>내 사용자 ID</div>
            <div style={{ fontFamily: "monospace", fontSize: ".9rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              {profile.username ? `@${profile.username}` : profile.id}
              {profile.discriminator && <span style={{ color: "var(--color-muted)", fontSize: ".85rem" }}>#{profile.discriminator}</span>}
              <button onClick={() => navigator.clipboard.writeText(profile.username ? `@${profile.username}${profile.discriminator?"#"+profile.discriminator:""}` : profile.id)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", marginLeft: 4 }}>{I.copy}</button>
            </div>
          </div>
          <label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 5 }}>표시 이름</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", marginBottom: 12, height: 36 }} />
          <label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 5 }}>사용자명 (@username)</label>
          <input className="input" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,""))} placeholder="영문 소문자·숫자·_" style={{ width: "100%", marginBottom: 12, height: 36 }} />
          <label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 5 }}>태그 (4자리 영숫자, 발로란트 스타일)</label>
          <input className="input" value={disc} onChange={e => setDisc(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,4))} placeholder="예: AB12" maxLength={4} style={{ width: "100%", marginBottom: 4, height: 36, fontFamily: "monospace" }} />
          <div style={{ fontSize: ".72rem", color: "var(--color-muted)", marginBottom: 16 }}>
            친구 추가 시 표시: <strong>{username?"@"+username:"@username"}{disc?"#"+disc:""}</strong>
          </div>
          {err && <div style={{ color: "#dc2626", fontSize: ".8125rem", marginBottom: 8 }}>{err}</div>}
          {ok && <div style={{ color: "#16a34a", fontSize: ".8125rem", marginBottom: 8, display: "flex", gap: 4 }}>{I.check} 저장되었습니다</div>}
          <button onClick={save} disabled={loading} className="btn btn-primary" style={{ width: "100%", height: 36, justifyContent: "center", marginBottom: 16 }}>
            {loading?"저장 중...":"저장"}
          </button>
          <div style={{ borderTop: "1px solid var(--color-hairline)", paddingTop: 14 }}>
            <label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 5 }}>친구 추가</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input className="input" value={addFriend} onChange={e => setAddFriend(e.target.value)} placeholder="@username 입력" style={{ flex: 1, height: 34 }} onKeyDown={e => e.key==="Enter" && sendFriend()} />
              <button onClick={sendFriend} className="btn btn-primary btn-sm" style={{ height: 34 }}>추가</button>
            </div>
            {friendMsg && <div style={{ fontSize: ".8125rem", marginTop: 6, color: friendMsg.includes("실패")||friendMsg.includes("없")||friendMsg.includes("오류")?"#dc2626":"#16a34a" }}>{friendMsg}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────── */
export default function ChatPage() {
  const [myId, setMyId] = useState("");
  const [profile, setProfile] = useState<Profile|null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room|null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [threadMsg, setThreadMsg] = useState<Message|null>(null);
  const [threadMsgs, setThreadMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [threadInput, setThreadInput] = useState("");
  const [editMsg, setEditMsg] = useState<Message|null>(null);
  const [editContent, setEditContent] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [panel, setPanel] = useState<"rooms"|"friends">("rooms");
  const [typingUsers, setTypingUsers] = useState<Map<string,{name:string;ts:number}>>(new Map());
  const [search, setSearch] = useState("");
  const [friendSearch, setFriendSearch] = useState("");
  const [micError, setMicError] = useState("");

  const msgEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingRef = useRef<ReturnType<typeof setTimeout>>();
  const sseRef = useRef<EventSource|null>(null);
  const recorderRef = useRef<MediaRecorder|null>(null);
  const recTimerRef = useRef<ReturnType<typeof setInterval>>();
  const micStreamRef = useRef<MediaStream|null>(null);
  const loadedRef = useRef(false);

  // Load me
  useEffect(() => {
    fetch("/api/auth/me").then(r=>r.json()).then(d => {
      if (d.user) setMyId(d.user.id);
    });
    api("/profile").then(r=>r.json()).then(d => { if (d.id) setProfile(d); }).catch(()=>{});
    loadRooms();
    loadFriends();
    // Online heartbeat — sets online:{userId} in Redis with 65s TTL
    fetch("/api/v1/chat/online", { method: "POST" }).catch(() => {});
    const hb = setInterval(() => { fetch("/api/v1/chat/online", { method: "POST" }).catch(() => {}); }, 30000);
    return () => clearInterval(hb);
  }, []);

  const loadRooms = useCallback(async () => {
    const r = await api("");
    const d = await r.json();
    if (d.rooms) setRooms(d.rooms);
  }, []);

  const loadFriends = useCallback(async () => {
    const r = await api("/friends");
    const d = await r.json();
    if (d.friends) setFriends(d.friends);
  }, []);

  // Auto-select from URL
  useEffect(() => {
    if (!rooms.length || loadedRef.current) return;
    const sp = new URLSearchParams(window.location.search);
    const id = sp.get("room");
    if (id) { const r = rooms.find(r => String(r.id) === id); if (r) { selectRoom(r); loadedRef.current = true; } }
  }, [rooms]);

  // SSE
  useEffect(() => {
    if (!myId) return;
    const es = new EventSource("/api/v1/chat/events");
    sseRef.current = es;
    es.onmessage = e => { try { handleSSE(JSON.parse(e.data)); } catch {} };
    return () => es.close();
  }, [myId]); // eslint-disable-line

  function handleSSE(ev: any) {
    if (ev.type === "message") {
      const msg: Message = { ...ev.data, isOwn: ev.data.userId === myId };
      if (!msg.threadId) {
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        const el = scrollRef.current;
        if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 120) setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 40);
      } else {
        setThreadMsgs(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        setMessages(prev => prev.map(m => m.id === msg.threadId ? { ...m, replyCount: m.replyCount + 1 } : m));
      }
      setRooms(prev => prev.map(r => {
        if (r.id !== msg.roomId) return r;
        return { ...r, lastMessage: { id: msg.id, content: msg.content ?? "", userId: msg.userId, name: msg.author?.name ?? "", createdAt: msg.createdAt }, unread: msg.userId === myId ? r.unread : r.unread + 1 };
      }));
    }
    if (ev.type === "edit") {
      const upd = (m: Message) => m.id === ev.messageId ? { ...m, content: ev.content, editedAt: ev.editedAt } : m;
      setMessages(prev => prev.map(upd)); setThreadMsgs(prev => prev.map(upd));
    }
    if (ev.type === "delete") {
      const del = (m: Message) => m.id === ev.messageId ? { ...m, deletedAt: Date.now(), content: null } : m;
      setMessages(prev => prev.map(del)); setThreadMsgs(prev => prev.map(del));
    }
    if (ev.type === "react") {
      const upd = (m: Message) => m.id === ev.messageId ? { ...m, reactions: ev.reactions } : m;
      setMessages(prev => prev.map(upd)); setThreadMsgs(prev => prev.map(upd));
    }
    if (ev.type === "typing") {
      if (ev.userId === myId) return;
      setTypingUsers(prev => { const n = new Map(prev); n.set(ev.userId, { name: ev.name, ts: Date.now() }); return n; });
      setTimeout(() => setTypingUsers(prev => { const n = new Map(prev); if ((n.get(ev.userId)?.ts ?? 0) < Date.now()-3500) n.delete(ev.userId); return n; }), 3500);
    }
    if (ev.type === "friend_request") {
      loadFriends();
    }
  }

  const loadMsgs = useCallback(async (room: Room, before?: number) => {
    setLoadingMsgs(true);
    const q = before ? `?before=${before}&limit=50` : "?limit=50";
    const r = await api(`/${room.id}/messages${q}`);
    const d = await r.json();
    const msgs: Message[] = (d.messages ?? []).map((m: Message) => ({ ...m, isOwn: m.userId === myId }));
    setHasMore(msgs.length === 50);
    if (before) setMessages(prev => [...msgs, ...prev]);
    else { setMessages(msgs); setTimeout(() => msgEndRef.current?.scrollIntoView(), 50); }
    setLoadingMsgs(false);
  }, [myId]);

  function selectRoom(room: Room) {
    setActiveRoom(room); setMessages([]); setThreadMsg(null); setThreadMsgs([]); setHasMore(true); setInput(""); setPendingAttachments([]);
    loadMsgs(room);
    api(`/${room.id}/read`, { method: "POST" });
    setRooms(prev => prev.map(r => r.id === room.id ? { ...r, unread: 0 } : r));
    if (window.innerWidth < 768) setSidebarOpen(false);
  }

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    if (e.currentTarget.scrollTop < 80 && hasMore && !loadingMsgs && activeRoom) {
      const first = messages[0]?.id;
      if (first) loadMsgs(activeRoom, first);
    }
  }

  async function sendMsg(content: string, threadId?: number) {
    if (!content.trim() && pendingAttachments.length === 0) return;
    const r = await api(`/${activeRoom!.id}/messages`, { method: "POST", body: JSON.stringify({ content: content.trim(), threadId, attachments: pendingAttachments }) });
    const d = await r.json();
    if (r.ok) {
      const msg: Message = { ...d.message, isOwn: true };
      // Dedup: SSE may have already delivered this message before the HTTP response resolved
      if (threadId) {
        setThreadMsgs(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        setMessages(prev => prev.map(m => m.id === threadId ? { ...m, replyCount: m.replyCount+1 } : m));
      } else {
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 40);
      }
      setPendingAttachments([]);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>, isThread = false) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isThread) { sendMsg(threadInput, threadMsg!.id); setThreadInput(""); }
      else { sendMsg(input); setInput(""); }
    }
  }

  function handleTyping() {
    if (!activeRoom) return;
    clearTimeout(typingRef.current);
    api(`/${activeRoom.id}/typing`, { method: "POST" });
  }

  async function uploadFile(file: File) {
    if (!activeRoom) return;
    setUploading(true);
    const fd = new FormData(); fd.append("file", file);
    const r = await fetch(`/api/v1/chat/${activeRoom.id}/upload`, { method: "POST", body: fd });
    const d = await r.json();
    if (r.ok) setPendingAttachments(prev => [...prev, d.attachment]);
    setUploading(false);
  }

  async function startRecording() {
    setMicError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError("이 브라우저는 음성 메시지를 지원하지 않습니다. HTTPS 환경의 Chrome/Safari를 사용해주세요.");
      return;
    }
    try {
      // Reuse existing stream to avoid repeated permission prompts
      let stream = micStreamRef.current;
      if (!stream || !stream.active) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true } });
        micStreamRef.current = stream;
      }
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4"
        : "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const ext = mimeType.includes("mp4") ? "m4a" : "webm";
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      const roomId = activeRoom!.id;
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const file = new File([blob], `voice_${Date.now()}.${ext}`, { type: blob.type });
        const fd = new FormData(); fd.append("file", file);
        setUploading(true);
        const up = await fetch(`/api/v1/chat/${roomId}/upload`, { method: "POST", body: fd }).catch(() => null);
        setUploading(false);
        if (!up?.ok) { setMicError("음성 메시지 업로드에 실패했습니다"); return; }
        const ud = await up.json();
        const res = await api(`/${roomId}/messages`, { method: "POST", body: JSON.stringify({ content: "[음성 메시지]", type: "text", attachments: [ud.attachment] }) });
        const rd = await res.json();
        if (res.ok) {
          const msg: Message = { ...rd.message, isOwn: true };
          setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
          setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 40);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true); setRecSec(0);
      recTimerRef.current = setInterval(() => setRecSec(s => s + 1), 1000);
    } catch (e: any) {
      if (e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError") {
        micStreamRef.current = null;
        setMicError("마이크 접근이 거부되었습니다. 브라우저 주소창 옆 자물쇠 아이콘 → 마이크 허용 후 다시 시도해주세요.");
      } else if (e?.name === "NotFoundError") {
        setMicError("마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.");
      } else {
        setMicError(`마이크 오류: ${e?.message ?? "알 수 없는 오류"}`);
      }
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    clearInterval(recTimerRef.current);
    setRecording(false); setRecSec(0);
  }

  // Release mic on unmount
  useEffect(() => {
    return () => { micStreamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  async function react(msgId: number, emoji: string) {
    await api(`/messages/${msgId}/react`, { method: "POST", body: JSON.stringify({ emoji }) });
  }

  async function deleteMsg(id: number) {
    if (!confirm("삭제하시겠습니까?")) return;
    await api(`/messages/${id}`, { method: "DELETE" });
  }

  async function saveEdit() {
    if (!editMsg || !editContent.trim()) return;
    await api(`/messages/${editMsg.id}`, { method: "PATCH", body: JSON.stringify({ content: editContent }) });
    setEditMsg(null);
  }

  async function loadThread(msg: Message) {
    setThreadMsg(msg);
    const r = await api(`/${msg.roomId}/messages?thread=${msg.id}&limit=100`);
    const d = await r.json();
    setThreadMsgs((d.messages ?? []).map((m: Message) => ({ ...m, isOwn: m.userId === myId })));
  }

  async function openDM(friendId: string) {
    const r = await api("/dm", { method: "POST", body: JSON.stringify({ userId: friendId }) });
    const d = await r.json();
    if (r.ok) { loadRooms().then(() => { setPanel("rooms"); }); }
  }

  async function acceptFriend(id: number) {
    await api(`/friends/${id}`, { method: "PATCH", body: JSON.stringify({ action: "accept" }) });
    loadFriends();
  }
  async function removeFriend(id: number) {
    await api(`/friends/${id}`, { method: "DELETE" });
    loadFriends();
  }

  const typing = Array.from(typingUsers.values()).filter(v => v.ts > Date.now()-3500).map(v => v.name);
  const dmRooms = rooms.filter(r => r.type==="direct" && (roomName(r,myId).toLowerCase().includes(search.toLowerCase()) || !search));
  const groupRooms = rooms.filter(r => r.type==="group" && ((r.name??"")||"").toLowerCase().includes(search.toLowerCase()) || !search && r.type==="group");
  const channelRooms = rooms.filter(r => r.type==="channel" && ((r.name??"")||"").toLowerCase().includes(search.toLowerCase()) || !search && r.type==="channel");
  const pendingFriends = friends.filter(f => f.status==="pending" && f.direction==="received");
  const acceptedFriends = friends.filter(f => f.status==="accepted");

  return (
    <div className="chat-app" style={{ display: "flex", overflow: "hidden", background: "var(--color-canvas)", fontFamily: "var(--font-sans)" }}>
      <style>{`
        /* Desktop */
        .chat-app { height: calc(100dvh - 54px); margin: -24px 0; }
        @media(min-width:769px){ .chat-app { margin: -24px 0; } }

        /* Mobile: fixed full-screen below header, above bottom nav */
        @media(max-width:768px){
          .chat-app {
            position: fixed !important;
            top: 54px !important;
            left: 0 !important;
            right: 0 !important;
            bottom: calc(60px + env(safe-area-inset-bottom, 0px)) !important;
            height: auto !important;
            margin: 0 !important;
            z-index: 20;
          }
        }

        .chat-sb { width:240px; flex-shrink:0; display:flex; flex-direction:column; background:var(--color-surface); border-right:1px solid var(--color-hairline); overflow:hidden; }
        .room-btn { display:flex; align-items:center; gap:8px; padding:6px 8px; border:none; background:none; cursor:pointer; width:100%; text-align:left; border-radius:8px; transition:background .1s; }
        .room-btn:hover { background:var(--color-canvas); }
        .room-btn.active { background:#eff6ff; }
        .sect-label { padding:6px 8px 2px; font-size:.7rem; font-weight:700; color:var(--color-muted); text-transform:uppercase; letter-spacing:.05em; }
        .chat-textarea { width:100%; border:1.5px solid var(--color-hairline); border-radius:10px; padding:9px 12px; font-family:var(--font-sans); font-size:.9375rem; resize:none; outline:none; background:var(--color-canvas); color:var(--color-ink); transition:border-color .15s; min-height:40px; max-height:120px; }
        .chat-textarea:focus { border-color:#3b82f6; }
        .icon-btn { background:none; border:none; cursor:pointer; padding:5px; border-radius:6px; color:var(--color-muted); display:flex; align-items:center; transition:background .1s,color .1s; }
        .icon-btn:hover { background:var(--color-canvas); color:var(--color-ink); }
        .thread-panel { width:300px; flex-shrink:0; border-left:1px solid var(--color-hairline); display:flex; flex-direction:column; background:var(--color-surface); overflow:hidden; }
        @media(max-width:768px){
          .chat-sb { position:absolute; left:0; top:0; bottom:0; width:260px; z-index:50; transform:translateX(-100%); transition:transform .2s; box-shadow: 4px 0 20px rgba(0,0,0,.15); }
          .chat-sb.open { transform:translateX(0); }
          .thread-panel { display:none; }
          .mobile-overlay { display:block !important; }
          .chat-textarea { font-size:16px !important; } /* prevent iOS zoom */
        }
      `}</style>

      {/* ── Sidebar ── */}
      <div className={`chat-sb${sidebarOpen?" open":""}`}>
        {/* Header */}
        <div style={{ padding: "10px 8px 6px", borderBottom: "1px solid var(--color-hairline)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
            <button onClick={() => setPanel("rooms")} style={{ flex: 1, padding: "4px 8px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: ".8rem", fontWeight: panel==="rooms"?700:400, background: panel==="rooms"?"var(--color-canvas)":"none", color: "var(--color-ink)" }}>채팅</button>
            <button onClick={() => { setPanel("friends"); loadFriends(); }} style={{ flex: 1, padding: "4px 8px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: ".8rem", fontWeight: panel==="friends"?700:400, background: panel==="friends"?"var(--color-canvas)":"none", color: "var(--color-ink)", position: "relative" }}>
              친구{pendingFriends.length > 0 && <span style={{ position: "absolute", top: -2, right: 2, background: "#ef4444", color: "#fff", borderRadius: 10, fontSize: ".6rem", padding: "0 4px", fontWeight: 700 }}>{pendingFriends.length}</span>}
            </button>
            <button onClick={() => setShowNew(true)} className="icon-btn" title="새 채팅">{I.plus}</button>
            <button onClick={() => setShowProfile(true)} className="icon-btn" title="프로필">{I.settings}</button>
          </div>
          {panel === "rooms" && (
            <input className="input" placeholder="검색..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: "100%", height: 28, fontSize: ".8rem" }} />
          )}
          {panel === "friends" && (
            <input className="input" placeholder="친구 검색..." value={friendSearch} onChange={e => setFriendSearch(e.target.value)} style={{ width: "100%", height: 28, fontSize: ".8rem" }} />
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
          {panel === "rooms" ? (
            <>
              {dmRooms.length > 0 && <><div className="sect-label">다이렉트 메시지</div>{dmRooms.map(r => <RoomBtn key={r.id} room={r} myId={myId} active={activeRoom?.id===r.id} onClick={() => selectRoom(r)} />)}</>}
              {groupRooms.length > 0 && <><div className="sect-label" style={{ marginTop: 6 }}>그룹</div>{groupRooms.map(r => <RoomBtn key={r.id} room={r} myId={myId} active={activeRoom?.id===r.id} onClick={() => selectRoom(r)} />)}</>}
              {channelRooms.length > 0 && <><div className="sect-label" style={{ marginTop: 6 }}>채널</div>{channelRooms.map(r => <RoomBtn key={r.id} room={r} myId={myId} active={activeRoom?.id===r.id} onClick={() => selectRoom(r)} />)}</>}
              {rooms.length === 0 && <div style={{ padding: "24px 8px", textAlign: "center", color: "var(--color-muted)", fontSize: ".85rem" }}>채팅방 없음<br /><button onClick={() => setShowNew(true)} style={{ marginTop: 8, background: "none", border: "none", color: "#3b82f6", cursor: "pointer", textDecoration: "underline", fontSize: ".85rem" }}>새 채팅 시작</button></div>}
            </>
          ) : (
            <>
              {pendingFriends.length > 0 && (
                <>
                  <div className="sect-label">친구 요청 ({pendingFriends.length})</div>
                  {pendingFriends.filter(f => !friendSearch || f.name.toLowerCase().includes(friendSearch.toLowerCase())).map(f => (
                    <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: "#eff6ff", marginBottom: 4 }}>
                      <Av user={{ id: f.friendId, name: f.name, username: f.username, avatar: f.avatar, discriminator: null }} size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: ".875rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                        {f.username && <div style={{ fontSize: ".7rem", color: "var(--color-muted)" }}>@{f.username}</div>}
                      </div>
                      <button onClick={() => acceptFriend(f.id)} style={{ background: "#22c55e", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", padding: "3px 7px", fontSize: ".75rem" }}>수락</button>
                      <button onClick={() => removeFriend(f.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)" }}>{I.x}</button>
                    </div>
                  ))}
                </>
              )}
              <div className="sect-label" style={{ marginTop: 6 }}>친구 {acceptedFriends.length}명</div>
              {acceptedFriends.filter(f => !friendSearch || f.name.toLowerCase().includes(friendSearch.toLowerCase())).map(f => (
                <div key={f.id} className="room-btn">
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <Av user={{ id: f.friendId, name: f.name, username: f.username, avatar: f.avatar, discriminator: null }} size={28} />
                    <div style={{ position: "absolute", bottom: -1, right: -1, width: 8, height: 8, borderRadius: "50%", background: f.online ? "#22c55e" : "var(--color-muted)", border: "1.5px solid var(--color-surface)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: ".875rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                    <div style={{ fontSize: ".7rem", color: "var(--color-muted)" }}>{f.online ? "온라인" : "오프라인"}</div>
                  </div>
                  <button onClick={() => openDM(f.friendId)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "2px" }} title="DM">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </button>
                  <button onClick={() => removeFriend(f.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "2px" }} title="삭제">{I.x}</button>
                </div>
              ))}
              {acceptedFriends.length === 0 && !pendingFriends.length && (
                <div style={{ padding: "20px 8px", textAlign: "center", color: "var(--color-muted)", fontSize: ".85rem" }}>
                  친구가 없습니다<br />
                  <button onClick={() => setShowProfile(true)} style={{ marginTop: 6, background: "none", border: "none", color: "#3b82f6", cursor: "pointer", textDecoration: "underline", fontSize: ".85rem" }}>친구 추가하기</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Profile bar */}
        {profile && (
          <div style={{ padding: "8px 10px", borderTop: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ position: "relative" }}>
              <Av user={{ id: profile.id, name: profile.name, username: profile.username, avatar: profile.avatar, discriminator: null }} size={28} />
              <div style={{ position: "absolute", bottom: -1, right: -1, width: 8, height: 8, borderRadius: "50%", background: "#22c55e", border: "1.5px solid var(--color-surface)" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: ".8125rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.name}</div>
              <div style={{ fontSize: ".7rem", color: "var(--color-muted)" }}>
                {profile.username ? `@${profile.username}${profile.discriminator?"#"+profile.discriminator:""}` : "사용자명 없음"}
              </div>
            </div>
            <button onClick={() => setShowProfile(true)} className="icon-btn">{I.settings}</button>
          </div>
        )}
      </div>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative" }}>
        {activeRoom ? (
          <>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderBottom: "1px solid var(--color-hairline)", background: "var(--color-surface)", flexShrink: 0 }}>
              <button onClick={() => setSidebarOpen(v=>!v)} className="icon-btn" style={{ display: "none" }} id="menu-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
              {activeRoom.type==="direct" && <Av user={activeRoom.otherMembers[0]??null} size={28} />}
              {activeRoom.type==="channel" && <span style={{ color: "var(--color-muted)" }}>{I.hash}</span>}
              {activeRoom.type==="group" && <span style={{ color: "var(--color-muted)" }}>{I.users}</span>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 700, fontSize: ".9375rem" }}>{roomName(activeRoom, myId)}</span>
                {activeRoom.description && <span style={{ fontSize: ".75rem", color: "var(--color-muted)", marginLeft: 8 }}>{activeRoom.description}</span>}
              </div>
              <button onClick={() => setShowAI(true)} className="icon-btn" title="AI 기능">{I.ai}</button>
              {activeRoom.inviteCode && (
                <div style={{ position: "relative" }}>
                  <button onClick={() => setShowInvite(v=>!v)} className="icon-btn" title="초대 코드">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  </button>
                  {showInvite && (
                    <div style={{ position: "absolute", right: 0, top: 34, background: "var(--color-surface)", border: "1px solid var(--color-hairline)", borderRadius: 10, padding: 14, minWidth: 220, boxShadow: "0 8px 24px rgba(0,0,0,.12)", zIndex: 50 }}>
                      <div style={{ fontSize: ".75rem", color: "var(--color-muted)", marginBottom: 6 }}>초대 코드</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <code style={{ flex: 1, background: "var(--color-canvas)", borderRadius: 6, padding: "5px 8px", fontSize: ".875rem", fontFamily: "monospace" }}>{activeRoom.inviteCode}</code>
                        <button onClick={async () => { await navigator.clipboard.writeText(activeRoom.inviteCode!); setCopied(true); setTimeout(()=>setCopied(false),2000); }}
                          className="btn btn-sm btn-primary" style={{ height: 30 }}>{copied?I.check:"복사"}</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Messages */}
            <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, overflowY: "auto", paddingTop: 8, paddingBottom: 4 }}>
              {loadingMsgs && hasMore && <div style={{ textAlign: "center", padding: "10px 0", color: "var(--color-muted)", fontSize: ".8rem" }}>불러오는 중...</div>}
              {messages.map((m, i) => (
                <MsgItem key={m.id} msg={m} prevMsg={messages[i-1]??null} myId={myId}
                  onReact={react} onEdit={m => { setEditMsg(m); setEditContent(m.content??""); }}
                  onDelete={deleteMsg} onThread={loadThread} />
              ))}
              {typing.length > 0 && <div style={{ padding: "4px 16px 4px 62px", fontSize: ".8125rem", color: "var(--color-muted)", fontStyle: "italic" }}>{typing.join(", ")} 입력 중...</div>}
              <div ref={msgEndRef} />
            </div>

            {/* Edit bar */}
            {editMsg && (
              <div style={{ padding: "6px 14px", background: "#fffbeb", borderTop: "1px solid #fde68a", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: ".8125rem", color: "#92400e", flex: 1 }}>메시지 수정 중</span>
                <input className="input" value={editContent} onChange={e => setEditContent(e.target.value)} onKeyDown={e => { if(e.key==="Enter") saveEdit(); if(e.key==="Escape") setEditMsg(null); }} style={{ flex: 3, height: 32 }} autoFocus />
                <button onClick={saveEdit} className="btn btn-sm btn-primary" style={{ height: 32 }}>저장</button>
                <button onClick={() => setEditMsg(null)} className="icon-btn">{I.x}</button>
              </div>
            )}

            {/* Pending attachments */}
            {pendingAttachments.length > 0 && (
              <div style={{ padding: "6px 14px", display: "flex", gap: 8, flexWrap: "wrap", borderTop: "1px solid var(--color-hairline)", background: "var(--color-surface)", flexShrink: 0 }}>
                {pendingAttachments.map((a, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: "var(--color-canvas)", borderRadius: 6, border: "1px solid var(--color-hairline)", fontSize: ".8rem" }}>
                    {a.mimeType.startsWith("image/") ? <img src={a.url} alt={a.name} style={{ width: 24, height: 24, objectFit: "cover", borderRadius: 3 }} /> : I.attach}
                    <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                    <button onClick={() => setPendingAttachments(prev => prev.filter((_,j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)" }}>{I.x}</button>
                  </div>
                ))}
              </div>
            )}

            {/* Mic error */}
            {micError && (
              <div style={{ padding: "6px 14px", background: "#fef2f2", borderTop: "1px solid #fecaca", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: ".8125rem", color: "#991b1b", flex: 1 }}>{micError}</span>
                <button onClick={() => setMicError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#991b1b" }}>{I.x}</button>
              </div>
            )}

            {/* Input */}
            <div style={{ padding: "10px 14px", borderTop: "1px solid var(--color-hairline)", background: "var(--color-surface)", flexShrink: 0 }}>
              {recording ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#fef2f2", borderRadius: 10, border: "1.5px solid #fecaca" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "pulse 1s infinite" }} />
                  <span style={{ flex: 1, fontSize: ".875rem", color: "#991b1b" }}>녹음 중... {Math.floor(recSec/60).toString().padStart(2,"0")}:{(recSec%60).toString().padStart(2,"0")}</span>
                  <button onClick={stopRecording} className="btn btn-sm" style={{ background: "#ef4444", color: "#fff", height: 30 }}>{I.stop} 전송</button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                  <button onClick={() => fileRef.current?.click()} className="icon-btn" title="파일 첨부" disabled={uploading}>{uploading ? "..." : I.attach}</button>
                  <button onClick={startRecording} className="icon-btn" title="음성 메시지">{I.mic}</button>
                  <textarea ref={inputRef} className="chat-textarea" style={{ flex: 1 }}
                    placeholder={`${roomName(activeRoom, myId)}에 메시지... (Enter 전송, Shift+Enter 줄바꿈)`}
                    value={input} onChange={e => { setInput(e.target.value); handleTyping(); e.currentTarget.style.height="auto"; e.currentTarget.style.height=e.currentTarget.scrollHeight+"px"; }}
                    onKeyDown={handleKey} rows={1} />
                  <button onClick={() => setShowAI(true)} className="icon-btn" title="AI">{I.ai}</button>
                  <button onClick={() => { sendMsg(input); setInput(""); }} disabled={!input.trim() && pendingAttachments.length===0}
                    style={{ background: "#3b82f6", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", padding: "8px 12px", display: "flex", alignItems: "center", flexShrink: 0, opacity: (!input.trim() && pendingAttachments.length===0)?0.4:1 }}>
                    {I.send}
                  </button>
                </div>
              )}
              <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={e => { Array.from(e.target.files??[]).forEach(f => uploadFile(f)); e.target.value=""; }} />
            </div>
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: "2.5rem" }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>KRL Chat</div>
            <div style={{ color: "var(--color-muted)", fontSize: ".9rem" }}>채팅방 선택 또는 새 채팅 시작</div>
            <button onClick={() => setShowNew(true)} className="btn btn-primary" style={{ marginTop: 4 }}>새 채팅 시작</button>
          </div>
        )}
      </div>

      {/* ── Thread panel ── */}
      {threadMsg && (
        <div className="thread-panel">
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
            <span style={{ fontWeight: 700, fontSize: ".875rem", flex: 1 }}>스레드</span>
            <button onClick={() => { setThreadMsg(null); setThreadMsgs([]); }} className="icon-btn">{I.x}</button>
          </div>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--color-hairline)", background: "var(--color-canvas)", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <Av user={threadMsg.author} size={24} />
              <div><div style={{ fontWeight: 600, fontSize: ".8125rem" }}>{threadMsg.author?.name}</div><div style={{ fontSize: ".875rem", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{threadMsg.content}</div></div>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", paddingTop: 4 }}>
            {threadMsgs.map((m, i) => <MsgItem key={m.id} msg={m} prevMsg={threadMsgs[i-1]??null} myId={myId} onReact={react} onEdit={m=>{setEditMsg(m);setEditContent(m.content??"");}} onDelete={deleteMsg} onThread={()=>{}} />)}
          </div>
          <div style={{ padding: "8px 12px", borderTop: "1px solid var(--color-hairline)", background: "var(--color-surface)" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
              <textarea className="chat-textarea" style={{ flex: 1, fontSize: ".875rem" }} placeholder="답글..." value={threadInput}
                onChange={e => { setThreadInput(e.target.value); e.currentTarget.style.height="auto"; e.currentTarget.style.height=e.currentTarget.scrollHeight+"px"; }}
                onKeyDown={e => handleKey(e, true)} rows={1} />
              <button onClick={() => { sendMsg(threadInput, threadMsg.id); setThreadInput(""); }} disabled={!threadInput.trim()}
                style={{ background: "#3b82f6", border: "none", borderRadius: 7, color: "#fff", cursor: "pointer", padding: "7px 10px", display: "flex", alignItems: "center", opacity: !threadInput.trim()?0.4:1 }}>
                {I.send}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile overlay */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.3)", zIndex: 45, display: "none" }} className="mobile-overlay" />}

      {/* Modals */}
      {showNew && <NewRoomModal myId={myId} onClose={() => setShowNew(false)} onCreate={r => { setRooms(prev => [r,...prev]); selectRoom(r); }} />}
      {showAI && activeRoom && <AIModal roomId={activeRoom.id} plan={profile?.plan ?? "free"} onClose={() => setShowAI(false)} />}
      {showProfile && profile && <ProfileModal profile={profile} onClose={() => setShowProfile(false)} onSave={p => setProfile(p)} />}

      <style>{`
        @media(max-width:768px){
          #menu-btn { display:flex !important; }
        }
      `}</style>
    </div>
  );
}

/* ── Room Button ── */
function RoomBtn({ room, myId, active, onClick }: { room: Room; myId: string; active: boolean; onClick(): void }) {
  const name = room.type==="direct" ? (room.otherMembers.find(m=>m.id!==myId)?.name ?? "DM") : (room.name ?? "채팅방");
  const other = room.type==="direct" ? (room.otherMembers.find(m=>m.id!==myId) ?? room.otherMembers[0]) : null;
  const COLORS = ["#3b82f6","#8b5cf6","#ec4899","#ef4444","#f59e0b","#10b981","#6366f1","#14b8a6"];
  const color = COLORS[(name.charCodeAt(0)??0) % COLORS.length];
  return (
    <button className={`room-btn${active?" active":""}`} onClick={onClick}>
      {room.type==="direct"
        ? other?.avatar
          ? <img src={other.avatar} alt={name} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          : <div style={{ width: 28, height: 28, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{(name??"?").charAt(0).toUpperCase()}</div>
        : <span style={{ width: 28, height: 28, borderRadius: 8, background: room.type==="channel"?"#eff6ff":"#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: room.type==="channel"?"#3b82f6":"#8b5cf6" }}>
            {room.type==="channel"
              ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>
              : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          </span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: ".875rem", fontWeight: room.unread>0?700:500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
        {room.lastMessage && <div style={{ fontSize: ".72rem", color: "var(--color-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{room.lastMessage.content?.slice(0,35) ?? "(첨부파일)"}</div>}
      </div>
      {room.unread > 0 && <span style={{ background: "#3b82f6", color: "#fff", borderRadius: 10, padding: "0 5px", fontSize: ".7rem", fontWeight: 700, flexShrink: 0, minWidth: 16, textAlign: "center" }}>{room.unread>99?"99+":room.unread}</span>}
    </button>
  );
}
