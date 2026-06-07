"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

/* ─── Types ───────────────────────────────────────────────────────── */
interface User { id: string; name: string; avatar: string | null; }
interface Reaction { emoji: string; count: number; mine: boolean; }
interface Attachment { id: number; name: string; mimeType: string; size: number; url: string; }
interface Message {
  id: number; roomId: number; userId: string; content: string | null;
  type: string; threadId: number | null; replyCount: number;
  editedAt: number | null; deletedAt: number | null; createdAt: number;
  author: User | null; reactions: Reaction[]; attachments: Attachment[]; isOwn: boolean;
}
interface Room {
  id: number; type: "direct" | "group" | "channel"; name: string | null;
  description: string | null; avatar: string | null; isPublic: boolean;
  ownerId: string | null; inviteCode: string | null; role: string;
  lastReadAt: number; unread: number; otherMembers: User[];
  lastMessage: { id: number; content: string; userId: string; name: string; createdAt: number } | null;
  createdAt: number; updatedAt: number;
}

/* ─── Constants ───────────────────────────────────────────────────── */
const EMOJI_LIST = ["👍","❤️","😂","😮","😢","😡","🎉","🔥","👏","✅","❓","💯","🙏","😍","🤔","👎"];
const api = (path: string, opts?: RequestInit) => fetch(`/api/v1/chat${path}`, { headers: { "Content-Type": "application/json" }, ...opts });

/* ─── Avatar ──────────────────────────────────────────────────────── */
const AVATAR_COLORS = ["#3b82f6","#8b5cf6","#ec4899","#ef4444","#f59e0b","#10b981","#6366f1","#14b8a6"];
function Avatar({ user, size = 32 }: { user: User | null; size?: number }) {
  const name = user?.name ?? "?";
  const color = AVATAR_COLORS[(name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
  if (user?.avatar) return <img src={user.avatar} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, fontWeight: 700, color: "#fff", flexShrink: 0, userSelect: "none" }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

/* ─── Room display name ───────────────────────────────────────────── */
function roomDisplayName(room: Room, myId: string): string {
  if (room.type === "direct") {
    const other = room.otherMembers.find(m => m.id !== myId) ?? room.otherMembers[0];
    return other?.name ?? "DM";
  }
  if (room.type === "channel") return `# ${room.name ?? "채널"}`;
  return room.name ?? "그룹";
}

/* ─── Time helper ─────────────────────────────────────────────────── */
function relTime(ts: number) {
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true, locale: ko }); } catch { return ""; }
}
function shortTime(ts: number) {
  return new Date(ts).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

/* ─── Message item ────────────────────────────────────────────────── */
function MsgItem({
  msg, prevMsg, myId, onReact, onEdit, onDelete, onThread,
}: {
  msg: Message; prevMsg: Message | null; myId: string;
  onReact(msgId: number, emoji: string): void;
  onEdit(msg: Message): void;
  onDelete(msgId: number): void;
  onThread(msg: Message): void;
}) {
  const [hover, setHover] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const sameUser = prevMsg?.userId === msg.userId && msg.createdAt - (prevMsg?.createdAt ?? 0) < 5 * 60 * 1000;
  const isOwn = msg.isOwn || msg.userId === myId;

  if (msg.deletedAt) return (
    <div style={{ padding: "2px 16px", color: "var(--color-muted)", fontSize: ".8125rem", fontStyle: "italic" }}>
      메시지가 삭제되었습니다.
    </div>
  );

  return (
    <div className={`chat-msg${hover ? " hover" : ""}`}
      style={{ display: "flex", gap: 10, padding: sameUser ? "2px 16px" : "10px 16px 2px", position: "relative" }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setEmojiOpen(false); }}>

      {/* Avatar / time stub */}
      <div style={{ width: 36, flexShrink: 0, paddingTop: 2, display: "flex", justifyContent: "center" }}>
        {sameUser
          ? <span style={{ fontSize: ".65rem", color: "var(--color-muted)", opacity: hover ? 1 : 0, transition: "opacity .1s", whiteSpace: "nowrap", paddingTop: 3 }}>{shortTime(msg.createdAt)}</span>
          : <Avatar user={msg.author} size={36} />}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!sameUser && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
            <span style={{ fontWeight: 600, fontSize: ".9375rem" }}>{msg.author?.name ?? "알 수 없음"}</span>
            <span style={{ fontSize: ".72rem", color: "var(--color-muted)" }}>{relTime(msg.createdAt)}</span>
          </div>
        )}
        <div style={{ fontSize: ".9375rem", lineHeight: 1.55, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
          {msg.content}
          {msg.editedAt && <span style={{ fontSize: ".72rem", color: "var(--color-muted)", marginLeft: 4 }}>(수정됨)</span>}
        </div>

        {/* Reactions */}
        {msg.reactions.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
            {msg.reactions.map(r => (
              <button key={r.emoji} onClick={() => onReact(msg.id, r.emoji)}
                className={`chat-react-btn${r.mine ? " mine" : ""}`}>
                {r.emoji} <span>{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Thread reply count */}
        {msg.replyCount > 0 && !msg.threadId && (
          <button onClick={() => onThread(msg)} className="chat-thread-btn">
            💬 {msg.replyCount}개 답글
          </button>
        )}
      </div>

      {/* Hover actions */}
      {hover && (
        <div className="chat-actions" style={{ position: "absolute", right: 16, top: -14, display: "flex", gap: 2, background: "var(--color-surface)", border: "1px solid var(--color-hairline)", borderRadius: 8, padding: "2px 4px", boxShadow: "0 2px 8px rgba(0,0,0,.1)", zIndex: 10 }}>
          <button className="chat-act" onClick={() => setEmojiOpen(v => !v)} title="반응">😊</button>
          <button className="chat-act" onClick={() => onThread(msg)} title="답글">💬</button>
          {isOwn && <button className="chat-act" onClick={() => onEdit(msg)} title="수정">✏️</button>}
          {isOwn && <button className="chat-act danger" onClick={() => onDelete(msg.id)} title="삭제">🗑</button>}
          {emojiOpen && (
            <div className="emoji-picker">
              {EMOJI_LIST.map(e => (
                <button key={e} onClick={() => { onReact(msg.id, e); setEmojiOpen(false); }}>{e}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── New Room Modal ──────────────────────────────────────────────── */
function NewRoomModal({ onClose, onCreate, myId }: {
  onClose(): void;
  onCreate(room: Room): void;
  myId: string;
}) {
  const [type, setType] = useState<"group" | "channel" | "dm">("group");
  const [name, setName] = useState("");
  const [targetId, setTargetId] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<"create" | "join" | "dm">("create");

  async function submit() {
    setLoading(true); setErr("");
    try {
      if (tab === "join") {
        const r = await api("/join", { method: "POST", body: JSON.stringify({ code: inviteCode.trim() }) });
        const d = await r.json();
        if (!r.ok) { setErr(d.error); return; }
        window.location.href = `/dashboard/chat?room=${d.roomId}`;
        return;
      }
      if (tab === "dm") {
        const r = await api("/dm", { method: "POST", body: JSON.stringify({ userId: targetId.trim() }) });
        const d = await r.json();
        if (!r.ok) { setErr(d.error); return; }
        window.location.href = `/dashboard/chat?room=${d.roomId}`;
        return;
      }
      const r = await api("", { method: "POST", body: JSON.stringify({ type, name: name.trim(), isPublic: false }) });
      const d = await r.json();
      if (!r.ok) { setErr(d.error); return; }
      onCreate(d.room);
      onClose();
    } finally { setLoading(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--color-surface)", borderRadius: 14, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,.2)", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
            <span style={{ fontSize: "1.05rem", fontWeight: 700, flex: 1 }}>새 채팅</span>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: "1.1rem" }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
            {(["create", "join", "dm"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ flex: 1, padding: "7px 4px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: ".8125rem", fontWeight: tab === t ? 600 : 400, background: tab === t ? "var(--color-canvas)" : "none", color: tab === t ? "var(--color-ink)" : "var(--color-muted)" }}>
                {t === "create" ? "방 만들기" : t === "join" ? "초대 코드" : "DM"}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: "0 24px 24px" }}>
          {tab === "create" && (
            <>
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {(["group", "channel"] as const).map(t => (
                  <button key={t} onClick={() => setType(t)}
                    style={{ flex: 1, padding: "7px 4px", borderRadius: 8, border: `1.5px solid ${type === t ? "#3b82f6" : "var(--color-hairline)"}`, cursor: "pointer", fontSize: ".875rem", fontWeight: type === t ? 600 : 400, background: type === t ? "#eff6ff" : "none", color: type === t ? "#3b82f6" : "var(--color-muted)" }}>
                    {t === "group" ? "👥 그룹" : "# 채널"}
                  </button>
                ))}
              </div>
              <input className="input" placeholder={type === "channel" ? "채널 이름 (예: 일반)" : "그룹 이름"} value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submit()} style={{ width: "100%", marginBottom: 14, height: 38 }} />
            </>
          )}
          {tab === "join" && (
            <input className="input" placeholder="초대 코드 입력" value={inviteCode} onChange={e => setInviteCode(e.target.value)}
              style={{ width: "100%", marginBottom: 14, height: 38 }} />
          )}
          {tab === "dm" && (
            <input className="input" placeholder="사용자 ID 입력" value={targetId} onChange={e => setTargetId(e.target.value)}
              style={{ width: "100%", marginBottom: 14, height: 38 }} />
          )}
          {err && <div style={{ color: "#dc2626", fontSize: ".8125rem", marginBottom: 10 }}>{err}</div>}
          <button onClick={submit} disabled={loading} className="btn btn-primary" style={{ width: "100%", height: 38, justifyContent: "center" }}>
            {loading ? "처리 중..." : tab === "create" ? "만들기" : tab === "join" ? "참여" : "DM 시작"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────── */
export default function ChatPage() {
  const [myId, setMyId] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadMsg, setThreadMsg] = useState<Message | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [threadInput, setThreadInput] = useState("");
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [editContent, setEditContent] = useState("");
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Map<number, { name: string; ts: number }>>(new Map());
  const [search, setSearch] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  const msgEndRef = useRef<HTMLDivElement>(null);
  const msgScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const sseRef = useRef<EventSource | null>(null);
  const loadedRoomsRef = useRef(false);

  /* load me */
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => { if (d.user) setMyId(d.user.id); });
  }, []);

  /* load rooms */
  const loadRooms = useCallback(async () => {
    const r = await api("");
    const d = await r.json();
    if (d.rooms) setRooms(d.rooms);
  }, []);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  /* auto-select room from URL */
  useEffect(() => {
    if (!rooms.length || loadedRoomsRef.current) return;
    const sp = new URLSearchParams(window.location.search);
    const roomId = sp.get("room");
    if (roomId) {
      const r = rooms.find(r => String(r.id) === roomId);
      if (r) { setActiveRoom(r); loadedRoomsRef.current = true; }
    }
  }, [rooms]);

  /* SSE */
  useEffect(() => {
    if (!myId) return;
    sseRef.current?.close();
    const es = new EventSource("/api/v1/chat/events");
    sseRef.current = es;

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        handleSSEEvent(event);
      } catch {}
    };

    return () => { es.close(); };
  }, [myId]); // eslint-disable-line

  function handleSSEEvent(event: any) {
    const { type } = event;
    if (type === "message") {
      const msg: Message = event.data;
      msg.isOwn = msg.userId === myId;
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (msg.threadId) {
        setThreadMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // Update reply count
        setMessages(prev => prev.map(m => m.id === msg.threadId ? { ...m, replyCount: m.replyCount + 1 } : m));
      }
      setRooms(prev => prev.map(r => {
        if (r.id !== msg.roomId) return r;
        const unread = msg.userId === myId ? r.unread : r.unread + 1;
        return { ...r, lastMessage: { id: msg.id, content: msg.content ?? "", userId: msg.userId, name: msg.author?.name ?? "", createdAt: msg.createdAt }, unread };
      }));
      // Auto-scroll if near bottom
      const el = msgScrollRef.current;
      if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 100) {
        setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    }
    if (type === "edit") {
      setMessages(prev => prev.map(m => m.id === event.messageId ? { ...m, content: event.content, editedAt: event.editedAt } : m));
      setThreadMessages(prev => prev.map(m => m.id === event.messageId ? { ...m, content: event.content, editedAt: event.editedAt } : m));
    }
    if (type === "delete") {
      setMessages(prev => prev.map(m => m.id === event.messageId ? { ...m, deletedAt: Date.now(), content: null } : m));
      setThreadMessages(prev => prev.map(m => m.id === event.messageId ? { ...m, deletedAt: Date.now(), content: null } : m));
    }
    if (type === "react") {
      const update = (prev: Message[]) => prev.map(m => m.id === event.messageId
        ? { ...m, reactions: event.reactions.map((r: Reaction) => ({ ...r, mine: r.mine ?? false })) }
        : m);
      setMessages(update);
      setThreadMessages(update);
    }
    if (type === "typing") {
      if (event.userId === myId) return;
      setTypingUsers(prev => {
        const next = new Map(prev);
        next.set(event.userId, { name: event.name, ts: Date.now() });
        return next;
      });
      setTimeout(() => {
        setTypingUsers(prev => {
          const next = new Map(prev);
          if ((next.get(event.userId)?.ts ?? 0) < Date.now() - 3000) next.delete(event.userId);
          return next;
        });
      }, 3500);
    }
  }

  /* load messages */
  const loadMessages = useCallback(async (room: Room, before?: number) => {
    setLoadingMsgs(true);
    try {
      const q = before ? `?before=${before}&limit=50` : "?limit=50";
      const r = await api(`/${room.id}/messages${q}`);
      const d = await r.json();
      const msgs: Message[] = d.messages ?? [];
      setHasMore(msgs.length === 50);
      if (before) {
        setMessages(prev => [...msgs, ...prev]);
      } else {
        setMessages(msgs);
        setTimeout(() => msgEndRef.current?.scrollIntoView(), 50);
      }
    } finally { setLoadingMsgs(false); }
  }, []);

  function selectRoom(room: Room) {
    setActiveRoom(room);
    setMessages([]);
    setThreadMsg(null);
    setThreadMessages([]);
    setHasMore(true);
    setInput("");
    loadMessages(room);
    api(`/${room.id}/read`, { method: "POST" });
    setRooms(prev => prev.map(r => r.id === room.id ? { ...r, unread: 0 } : r));
    if (window.innerWidth < 768) setSidebarOpen(false);
  }

  /* scroll up to load more */
  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    if (e.currentTarget.scrollTop < 80 && hasMore && !loadingMsgs && activeRoom) {
      const firstId = messages[0]?.id;
      if (firstId) loadMessages(activeRoom, firstId);
    }
  }

  /* send message */
  async function sendMessage(roomId: number, content: string, threadId?: number) {
    if (!content.trim()) return;
    const r = await api(`/${roomId}/messages`, { method: "POST", body: JSON.stringify({ content: content.trim(), threadId }) });
    const d = await r.json();
    if (r.ok) {
      const msg: Message = { ...d.message, isOwn: true };
      if (threadId) {
        setThreadMessages(prev => [...prev, msg]);
        setMessages(prev => prev.map(m => m.id === threadId ? { ...m, replyCount: m.replyCount + 1 } : m));
      } else {
        setMessages(prev => [...prev, msg]);
        setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, isThread = false) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isThread) { sendMessage(activeRoom!.id, threadInput, threadMsg!.id); setThreadInput(""); }
      else { sendMessage(activeRoom!.id, input); setInput(""); }
    }
  }

  function handleTyping() {
    if (!activeRoom) return;
    clearTimeout(typingTimerRef.current);
    api(`/${activeRoom.id}/typing`, { method: "POST" });
    typingTimerRef.current = setTimeout(() => {}, 3000);
  }

  async function react(msgId: number, emoji: string) {
    await api(`/messages/${msgId}/react`, { method: "POST", body: JSON.stringify({ emoji }) });
  }

  async function deleteMsg(msgId: number) {
    if (!confirm("메시지를 삭제할까요?")) return;
    await api(`/messages/${msgId}`, { method: "DELETE" });
  }

  async function saveEdit() {
    if (!editingMsg || !editContent.trim()) return;
    await api(`/messages/${editingMsg.id}`, { method: "PATCH", body: JSON.stringify({ content: editContent.trim() }) });
    setEditingMsg(null);
  }

  async function loadThread(msg: Message) {
    setThreadMsg(msg);
    const r = await api(`/${msg.roomId}/messages?thread=${msg.id}&limit=100`);
    const d = await r.json();
    setThreadMessages(d.messages ?? []);
  }

  async function copyInvite() {
    if (!activeRoom?.inviteCode) return;
    await navigator.clipboard.writeText(activeRoom.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const filteredRooms = rooms.filter(r => {
    const displayName = r.type === "direct"
      ? (r.otherMembers[0]?.name ?? "DM")
      : (r.name ?? "");
    return displayName.toLowerCase().includes(search.toLowerCase());
  });

  const dmRooms = filteredRooms.filter(r => r.type === "direct");
  const groupRooms = filteredRooms.filter(r => r.type === "group");
  const channelRooms = filteredRooms.filter(r => r.type === "channel");

  const typingList = Array.from(typingUsers.entries())
    .filter(([, v]) => v.ts > Date.now() - 3500)
    .map(([, v]) => v.name);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 60px)", overflow: "hidden", background: "var(--color-canvas)", fontFamily: "var(--font-sans)" }}>
      <style>{`
        /* ── Sidebar ── */
        .chat-sidebar { width:240px; flex-shrink:0; display:flex; flex-direction:column; background:var(--color-surface); border-right:1px solid var(--color-hairline); overflow:hidden; transition:width .2s; }
        .chat-room-btn { display:flex; align-items:center; gap:8px; padding:7px 10px; border:none; background:none; cursor:pointer; width:100%; text-align:left; border-radius:8px; transition:background .1s; }
        .chat-room-btn:hover { background:var(--color-canvas); }
        .chat-room-btn.active { background:#eff6ff; }
        .chat-section { padding:6px 8px 2px; font-size:.7rem; font-weight:700; color:var(--color-muted); text-transform:uppercase; letter-spacing:.05em; margin-top:4px; }
        /* ── Messages ── */
        .chat-msg { transition:background .08s; }
        .chat-msg.hover { background:var(--color-canvas); }
        .chat-act { background:none; border:none; cursor:pointer; padding:4px 6px; border-radius:5px; font-size:.9rem; transition:background .1s; }
        .chat-act:hover { background:var(--color-hairline); }
        .chat-act.danger:hover { background:#fef2f2; }
        .chat-react-btn { display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:10px; border:1px solid var(--color-hairline); background:var(--color-canvas); cursor:pointer; font-size:.875rem; transition:border-color .1s; }
        .chat-react-btn:hover { border-color:#3b82f6; }
        .chat-react-btn.mine { border-color:#3b82f6; background:#eff6ff; }
        .chat-react-btn span { font-size:.75rem; color:var(--color-muted); font-weight:600; }
        .chat-thread-btn { margin-top:4px; background:none; border:none; cursor:pointer; color:#3b82f6; font-size:.8125rem; padding:2px 0; display:flex; align-items:center; gap:4px; }
        .chat-thread-btn:hover { text-decoration:underline; }
        .emoji-picker { position:absolute; right:0; top:28px; background:var(--color-surface); border:1px solid var(--color-hairline); border-radius:10px; padding:8px; display:flex; flex-wrap:wrap; gap:4px; width:200px; box-shadow:0 8px 24px rgba(0,0,0,.15); z-index:20; }
        .emoji-picker button { background:none; border:none; cursor:pointer; font-size:1.25rem; padding:4px; border-radius:6px; transition:background .1s; }
        .emoji-picker button:hover { background:var(--color-canvas); }
        /* ── Input ── */
        .chat-input-wrap { border-top:1px solid var(--color-hairline); padding:12px 16px; background:var(--color-surface); }
        .chat-textarea { width:100%; border:1.5px solid var(--color-hairline); border-radius:10px; padding:10px 12px; font-family:var(--font-sans); font-size:.9375rem; resize:none; outline:none; background:var(--color-canvas); color:var(--color-ink); transition:border-color .15s; min-height:42px; max-height:160px; }
        .chat-textarea:focus { border-color:#3b82f6; }
        /* ── Thread panel ── */
        .chat-thread { width:320px; flex-shrink:0; border-left:1px solid var(--color-hairline); display:flex; flex-direction:column; background:var(--color-surface); overflow:hidden; }
        /* ── Mobile ── */
        @media(max-width:768px){
          .chat-sidebar { position:absolute; left:0; top:0; bottom:0; z-index:50; transform:translateX(-100%); transition:transform .2s; }
          .chat-sidebar.open { transform:translateX(0); }
          .chat-thread { display:none; }
          .chat-thread.open { display:flex; position:absolute; left:0; right:0; top:0; bottom:0; z-index:40; width:100%; }
        }
        @media(max-width:640px){
          .chat-sidebar { width:min(280px,85vw); }
        }
      `}</style>

      {/* ── Sidebar ── */}
      <div className={`chat-sidebar${sidebarOpen ? " open" : ""}`}>
        {/* Header */}
        <div style={{ padding: "12px 10px 8px", borderBottom: "1px solid var(--color-hairline)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: "1rem", fontWeight: 700, flex: 1 }}>💬 KRL Chat</span>
            <button onClick={() => setShowNew(true)} className="btn btn-primary btn-sm" style={{ height: 28, padding: "0 8px", fontSize: ".8rem" }}>+ 새 채팅</button>
          </div>
          <input className="input" placeholder="검색..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", height: 30, fontSize: ".8125rem" }} />
        </div>

        {/* Room list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
          {dmRooms.length > 0 && (
            <>
              <div className="chat-section">다이렉트 메시지</div>
              {dmRooms.map(r => <RoomBtn key={r.id} room={r} myId={myId} active={activeRoom?.id === r.id} onClick={() => selectRoom(r)} />)}
            </>
          )}
          {groupRooms.length > 0 && (
            <>
              <div className="chat-section" style={{ marginTop: 8 }}>그룹</div>
              {groupRooms.map(r => <RoomBtn key={r.id} room={r} myId={myId} active={activeRoom?.id === r.id} onClick={() => selectRoom(r)} />)}
            </>
          )}
          {channelRooms.length > 0 && (
            <>
              <div className="chat-section" style={{ marginTop: 8 }}>채널</div>
              {channelRooms.map(r => <RoomBtn key={r.id} room={r} myId={myId} active={activeRoom?.id === r.id} onClick={() => selectRoom(r)} />)}
            </>
          )}
          {rooms.length === 0 && (
            <div style={{ padding: "24px 8px", textAlign: "center", color: "var(--color-muted)", fontSize: ".85rem" }}>
              채팅방이 없습니다.<br />
              <button onClick={() => setShowNew(true)} style={{ marginTop: 8, background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: ".85rem", textDecoration: "underline" }}>새 채팅 시작</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative" }}>
        {activeRoom ? (
          <>
            {/* Room header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--color-hairline)", background: "var(--color-surface)", flexShrink: 0 }}>
              <button onClick={() => setSidebarOpen(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "4px 6px", borderRadius: 6, display: "none" }} className="mobile-menu-btn">☰</button>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                {activeRoom.type === "direct" && <Avatar user={activeRoom.otherMembers[0] ?? null} size={32} />}
                <div>
                  <div style={{ fontWeight: 700, fontSize: ".9375rem" }}>{roomDisplayName(activeRoom, myId)}</div>
                  {activeRoom.description && <div style={{ fontSize: ".75rem", color: "var(--color-muted)" }}>{activeRoom.description}</div>}
                </div>
              </div>
              {activeRoom.inviteCode && (
                <div style={{ position: "relative" }}>
                  <button onClick={() => setShowInvite(v => !v)} className="btn btn-ghost btn-sm" style={{ height: 30, padding: "0 8px", fontSize: ".8rem" }}>초대</button>
                  {showInvite && (
                    <div style={{ position: "absolute", right: 0, top: 36, background: "var(--color-surface)", border: "1px solid var(--color-hairline)", borderRadius: 10, padding: 14, minWidth: 220, boxShadow: "0 8px 24px rgba(0,0,0,.12)", zIndex: 50 }}>
                      <div style={{ fontSize: ".75rem", color: "var(--color-muted)", marginBottom: 6 }}>초대 코드</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <code style={{ flex: 1, background: "var(--color-canvas)", borderRadius: 6, padding: "5px 8px", fontSize: ".875rem", fontFamily: "monospace" }}>{activeRoom.inviteCode}</code>
                        <button onClick={copyInvite} className="btn btn-sm btn-primary" style={{ height: 30 }}>{copied ? "✓" : "복사"}</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Messages */}
            <div ref={msgScrollRef} onScroll={handleScroll}
              style={{ flex: 1, overflowY: "auto", paddingTop: 8, paddingBottom: 8 }}>
              {loadingMsgs && hasMore && (
                <div style={{ textAlign: "center", padding: "12px 0", color: "var(--color-muted)", fontSize: ".8rem" }}>불러오는 중...</div>
              )}
              {messages.map((msg, i) => (
                <MsgItem key={msg.id} msg={msg} prevMsg={messages[i - 1] ?? null} myId={myId}
                  onReact={react} onEdit={m => { setEditingMsg(m); setEditContent(m.content ?? ""); }}
                  onDelete={deleteMsg} onThread={loadThread} />
              ))}
              {typingList.length > 0 && (
                <div style={{ padding: "4px 16px 4px 62px", fontSize: ".8125rem", color: "var(--color-muted)", fontStyle: "italic" }}>
                  {typingList.join(", ")} 이(가) 입력 중...
                </div>
              )}
              <div ref={msgEndRef} />
            </div>

            {/* Edit overlay */}
            {editingMsg && (
              <div style={{ padding: "6px 16px", background: "#fffbeb", borderTop: "1px solid #fde68a", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: ".8125rem", color: "#92400e", flex: 1 }}>메시지 수정 중</span>
                  <button onClick={() => setEditingMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#92400e" }}>✕</button>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <input className="input" value={editContent} onChange={e => setEditContent(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingMsg(null); }}
                    style={{ flex: 1, height: 34 }} autoFocus />
                  <button onClick={saveEdit} className="btn btn-sm btn-primary">저장</button>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="chat-input-wrap">
              <textarea ref={inputRef} className="chat-textarea"
                placeholder={`${roomDisplayName(activeRoom, myId)}에 메시지 보내기... (Enter: 전송, Shift+Enter: 줄바꿈)`}
                value={input}
                onChange={e => { setInput(e.target.value); handleTyping(); e.currentTarget.style.height = "auto"; e.currentTarget.style.height = e.currentTarget.scrollHeight + "px"; }}
                onKeyDown={e => handleKeyDown(e)} rows={1}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                <button onClick={() => { sendMessage(activeRoom.id, input); setInput(""); }} disabled={!input.trim()}
                  className="btn btn-primary btn-sm" style={{ height: 30, padding: "0 14px" }}>전송</button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: "3rem" }}>💬</div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>KRL Chat</div>
            <div style={{ color: "var(--color-muted)", fontSize: ".9rem" }}>채팅방을 선택하거나 새 채팅을 시작하세요</div>
            <button onClick={() => setShowNew(true)} className="btn btn-primary" style={{ marginTop: 8 }}>새 채팅 시작</button>
          </div>
        )}
      </div>

      {/* ── Thread panel ── */}
      {threadMsg && (
        <div className={`chat-thread${threadMsg ? " open" : ""}`}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ fontWeight: 700, fontSize: ".9rem", flex: 1 }}>💬 스레드</span>
            <button onClick={() => { setThreadMsg(null); setThreadMessages([]); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)" }}>✕</button>
          </div>
          {/* Original msg */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--color-hairline)", background: "var(--color-canvas)", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <Avatar user={threadMsg.author} size={28} />
              <div>
                <div style={{ fontWeight: 600, fontSize: ".875rem" }}>{threadMsg.author?.name}</div>
                <div style={{ fontSize: ".875rem", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{threadMsg.content}</div>
              </div>
            </div>
          </div>
          {/* Thread messages */}
          <div style={{ flex: 1, overflowY: "auto", paddingTop: 8 }}>
            {threadMessages.map((m, i) => (
              <MsgItem key={m.id} msg={m} prevMsg={threadMessages[i - 1] ?? null} myId={myId}
                onReact={react} onEdit={msg => { setEditingMsg(msg); setEditContent(msg.content ?? ""); }}
                onDelete={deleteMsg} onThread={() => {}} />
            ))}
          </div>
          {/* Thread input */}
          <div className="chat-input-wrap">
            <textarea className="chat-textarea" placeholder="답글 입력..." value={threadInput}
              onChange={e => { setThreadInput(e.target.value); e.currentTarget.style.height = "auto"; e.currentTarget.style.height = e.currentTarget.scrollHeight + "px"; }}
              onKeyDown={e => handleKeyDown(e, true)} rows={1} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
              <button onClick={() => { sendMessage(activeRoom!.id, threadInput, threadMsg.id); setThreadInput(""); }}
                disabled={!threadInput.trim()} className="btn btn-primary btn-sm" style={{ height: 30, padding: "0 14px" }}>답글</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.3)", zIndex: 45, display: "none" }}
          className="mobile-overlay" />
      )}

      {/* ── Modals ── */}
      {showNew && (
        <NewRoomModal myId={myId} onClose={() => setShowNew(false)}
          onCreate={room => { setRooms(prev => [room, ...prev]); selectRoom(room); }} />
      )}

      <style>{`
        @media(max-width:768px){
          .mobile-menu-btn { display:flex !important; }
          .mobile-overlay { display:block !important; }
        }
      `}</style>
    </div>
  );
}

/* ── Room Button ── */
function RoomBtn({ room, myId, active, onClick }: { room: Room; myId: string; active: boolean; onClick(): void }) {
  const name = room.type === "direct"
    ? (room.otherMembers.find(m => m.id !== myId)?.name ?? room.otherMembers[0]?.name ?? "DM")
    : (room.name ?? "채팅방");
  const avatar = room.type === "direct" ? (room.otherMembers.find(m => m.id !== myId) ?? room.otherMembers[0]) : null;

  return (
    <button className={`chat-room-btn${active ? " active" : ""}`} onClick={onClick}>
      {room.type === "direct"
        ? <Avatar user={avatar} size={28} />
        : <span style={{ width: 28, height: 28, borderRadius: 8, background: room.type === "channel" ? "#eff6ff" : "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".85rem", flexShrink: 0 }}>
            {room.type === "channel" ? "#" : "👥"}
          </span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: ".875rem", fontWeight: room.unread > 0 ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
        {room.lastMessage && (
          <div style={{ fontSize: ".72rem", color: "var(--color-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {room.lastMessage.content?.slice(0, 40) ?? "(삭제된 메시지)"}
          </div>
        )}
      </div>
      {room.unread > 0 && (
        <span style={{ background: "#3b82f6", color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: ".7rem", fontWeight: 700, flexShrink: 0 }}>
          {room.unread > 99 ? "99+" : room.unread}
        </span>
      )}
    </button>
  );
}
