"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import HlsPlayer from "@/components/HlsPlayer";

/* ── Types ── */
interface RoomInfo { code: string; name: string; ownerName: string|null; archivedAt: number|null; createdAt: number; lastActiveAt: number; note: string; fileCount: number; messageCount: number; }
interface Msg { id: number; authorName: string; userId: string|null; guestId: string|null; content: string; type: string; createdAt: number; }
interface RoomFile { id: number; name: string; mimeType: string; size: number; url: string; uploaderName: string; createdAt: number; }

const api = (path: string, opts?: RequestInit) => fetch(`/api/v1/room${path}`, { headers: { "Content-Type": "application/json" }, ...opts });
function fmt(bytes: number) { if (bytes < 1024) return `${bytes}B`; if (bytes < 1048576) return `${(bytes/1024).toFixed(1)}KB`; return `${(bytes/1048576).toFixed(1)}MB`; }
function shortTime(ts: number) { return new Date(ts).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }); }
const COLORS = ["#3b82f6","#8b5cf6","#ec4899","#ef4444","#f59e0b","#10b981"];
function nameColor(name: string) { return COLORS[name.charCodeAt(0) % COLORS.length]; }
function mimeIcon(mime: string) {
  const p = { width:18, height:18, viewBox:"0 0 24 24", fill:"none", stroke:"#64748b", strokeWidth:1.5, strokeLinecap:"round" as const, strokeLinejoin:"round" as const };
  if (mime.startsWith("image/")) return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
  if (mime.startsWith("audio/")) return <svg {...p}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
  if (mime.startsWith("video/")) return <svg {...p}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>;
  return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [room, setRoom] = useState<RoomInfo|null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [files, setFiles] = useState<RoomFile[]>([]);
  const [note, setNote] = useState("");
  const [noteEditing, setNoteEditing] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [input, setInput] = useState("");
  const [tab, setTab] = useState<"chat"|"files"|"note">("chat");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  // Guest identity
  const [guestId] = useState(() => {
    if (typeof window === "undefined") return "g_" + Math.random().toString(36).slice(2);
    let id = localStorage.getItem("krl_guest_id");
    if (!id) { id = "g_" + Math.random().toString(36).slice(2, 10); localStorage.setItem("krl_guest_id", id); }
    return id;
  });
  const [guestName, setGuestName] = useState(() => {
    if (typeof window === "undefined") return "Guest";
    return localStorage.getItem("krl_guest_name") ?? "";
  });
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const msgEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sseRef = useRef<EventSource|null>(null);

  useEffect(() => {
    if (!guestName) setShowNameModal(true);
  }, [guestName]);

  const loadRoom = useCallback(async () => {
    const r = await fetch(`/api/v1/room/${code}`);
    if (!r.ok) { setError("방을 찾을 수 없습니다"); setLoading(false); return; }
    const d = await r.json();
    setRoom(d);
    setNote(d.note ?? "");
    setNoteDraft(d.note ?? "");
    setLoading(false);
  }, [code]);

  const loadMessages = useCallback(async () => {
    const r = await fetch(`/api/v1/room/${code}/messages?limit=50`);
    const d = await r.json();
    setMessages(d.messages ?? []);
    setTimeout(() => msgEndRef.current?.scrollIntoView(), 50);
  }, [code]);

  const loadFiles = useCallback(async () => {
    const r = await fetch(`/api/v1/room/${code}/files`);
    const d = await r.json();
    setFiles(d.files ?? []);
  }, [code]);

  useEffect(() => {
    loadRoom();
    loadMessages();
    loadFiles();
  }, [loadRoom, loadMessages, loadFiles]);

  // SSE
  useEffect(() => {
    const es = new EventSource(`/api/v1/room/${code}/events`);
    sseRef.current = es;
    es.onmessage = e => {
      try {
        const ev = JSON.parse(e.data);
        if (ev.type === "message") {
          setMessages(prev => prev.find(m => m.id === ev.data.id) ? prev : [...prev, ev.data]);
          setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 40);
        }
        if (ev.type === "file") setFiles(prev => [ev.data, ...prev]);
        if (ev.type === "note") { setNote(ev.data.content); setNoteDraft(ev.data.content); }
      } catch {}
    };
    return () => es.close();
  }, [code]);

  async function sendMessage() {
    if (!input.trim() || sending) return;
    setSending(true);
    const r = await api(`/${code}/messages`, { method: "POST", body: JSON.stringify({ content: input.trim(), guestId, guestName }) });
    const d = await r.json();
    setSending(false);
    if (r.ok) {
      setMessages(prev => prev.find(m => m.id === d.message.id) ? prev : [...prev, d.message]);
      setInput("");
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 40);
    }
  }

  async function uploadFile(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("guestId", guestId);
    fd.append("guestName", guestName);
    const r = await fetch(`/api/v1/room/${code}/files`, { method: "POST", body: fd });
    const d = await r.json();
    if (r.ok) setFiles(prev => [d.file, ...prev]);
    setUploading(false);
  }

  async function saveNote() {
    await api(`/${code}/note`, { method: "PUT", body: JSON.stringify({ content: noteDraft }) });
    setNote(noteDraft);
    setNoteEditing(false);
  }

  function saveName() {
    const n = nameDraft.trim() || "Guest";
    setGuestName(n);
    localStorage.setItem("krl_guest_name", n);
    setShowNameModal(false);
  }

  if (loading) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontSize:"1rem", color:"#888" }}>방 불러오는 중...</div>;
  if (error) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100vh", gap:16 }}>
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M14 21v-5a2 2 0 0 0-2-2h0a2 2 0 0 0-2 2v5"/></svg>
      <div style={{ fontWeight:700, fontSize:"1.2rem" }}>{error}</div>
      <a href="/room" style={{ color:"#3b82f6", textDecoration:"underline" }}>새 방 만들기</a>
    </div>
  );
  if (room?.archivedAt) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100vh", gap:12 }}>
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
      <div style={{ fontWeight:700, fontSize:"1.2rem" }}>이 방은 아카이브되었습니다</div>
      <div style={{ color:"#888", fontSize:".875rem" }}>7일 이상 활동이 없어 자동으로 닫혔습니다</div>
      <a href="/room" style={{ color:"#3b82f6", textDecoration:"underline" }}>새 방 만들기</a>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100dvh", background:"#f8fafc", fontFamily:"var(--font-sans, system-ui)" }}>
      <style>{`
        * { box-sizing: border-box; margin:0; padding:0; }
        .rm-input { width:100%; border:1.5px solid #e2e8f0; border-radius:10px; padding:9px 12px; font-size:.9375rem; outline:none; background:#fff; transition:border-color .15s; }
        .rm-input:focus { border-color:#3b82f6; }
        .rm-btn { border:none; border-radius:8px; cursor:pointer; font-size:.875rem; font-weight:600; padding:8px 16px; transition:background .15s; }
        .rm-btn-primary { background:#3b82f6; color:#fff; }
        .rm-btn-primary:hover { background:#2563eb; }
        .rm-btn-ghost { background:none; color:#64748b; }
        .rm-btn-ghost:hover { background:#f1f5f9; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Name modal */}
      {showNameModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:16 }}>
          <div style={{ background:"#fff", borderRadius:14, padding:28, width:"100%", maxWidth:360, boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
            <div style={{ fontWeight:700, fontSize:"1.1rem", marginBottom:6 }}>이름을 설정하세요</div>
            <div style={{ color:"#64748b", fontSize:".875rem", marginBottom:16 }}>채팅에서 사용할 이름입니다 (익명 OK)</div>
            <input className="rm-input" placeholder="이름 입력 (예: 홍길동, 익명, ...)" autoFocus
              value={nameDraft} onChange={e => setNameDraft(e.target.value)} onKeyDown={e => e.key==="Enter" && saveName()} style={{ marginBottom:12 }} />
            <button className="rm-btn rm-btn-primary" onClick={saveName} style={{ width:"100%" }}>시작하기</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"12px 20px", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg, #3b82f6, #8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:"1rem" }}>{room?.name || `KRL Room · ${code}`}</div>
          <div style={{ fontSize:".75rem", color:"#64748b" }}>
            {room?.ownerName ? `${room.ownerName} 님의 방` : "임시 협업 공간"} · 코드: <code style={{ fontFamily:"monospace", background:"#f1f5f9", padding:"0 4px", borderRadius:4 }}>{code}</code>
          </div>
        </div>
        <button className="rm-btn rm-btn-ghost" style={{ fontSize:".8rem", padding:"5px 10px", display:"flex", alignItems:"center", gap:4 }} onClick={() => { navigator.clipboard.writeText(window.location.href); }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          링크 복사
        </button>
        <button className="rm-btn rm-btn-ghost" style={{ fontSize:".8rem", padding:"5px 10px", display:"flex", alignItems:"center", gap:4 }} onClick={() => setShowNameModal(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          {guestName || "이름 설정"}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", display:"flex", flexShrink:0 }}>
        {(["chat","files","note"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex:1, padding:"10px", border:"none", background:"none", cursor:"pointer", fontWeight:tab===t?700:400, color:tab===t?"#3b82f6":"#64748b", borderBottom:tab===t?"2px solid #3b82f6":"2px solid transparent", fontSize:".875rem", transition:"color .1s", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
            {t==="chat" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
            {t==="files" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>}
            {t==="note" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
            {t==="chat"?"채팅":t==="files"?`파일 (${files.length})`:"메모"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* CHAT TAB */}
        {tab === "chat" && (
          <>
            <div style={{ flex:1, overflowY:"auto", padding:"12px 16px", display:"flex", flexDirection:"column", gap:2 }}>
              {messages.length === 0 && <div style={{ textAlign:"center", color:"#94a3b8", padding:"40px 0", fontSize:".9rem" }}>아직 메시지가 없습니다. 첫 메시지를 보내세요!</div>}
              {messages.map((m, i) => {
                const prev = messages[i-1];
                const sameUser = prev && prev.authorName === m.authorName && m.createdAt - prev.createdAt < 180_000;
                return (
                  <div key={m.id} style={{ display:"flex", gap:8, alignItems:"flex-start", padding:sameUser?"1px 0":"6px 0 1px" }}>
                    {!sameUser
                      ? <div style={{ width:32, height:32, borderRadius:"50%", background:nameColor(m.authorName), display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#fff", flexShrink:0 }}>{m.authorName.charAt(0).toUpperCase()}</div>
                      : <div style={{ width:32, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <span style={{ fontSize:".6rem", color:"#94a3b8" }}>{shortTime(m.createdAt)}</span>
                        </div>
                    }
                    <div style={{ flex:1, minWidth:0 }}>
                      {!sameUser && (
                        <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:2 }}>
                          <span style={{ fontWeight:700, fontSize:".875rem" }}>{m.authorName}</span>
                          <span style={{ fontSize:".7rem", color:"#94a3b8" }}>{shortTime(m.createdAt)}</span>
                        </div>
                      )}
                      <div style={{ fontSize:".9375rem", lineHeight:1.5, wordBreak:"break-word", whiteSpace:"pre-wrap", color:"#1e293b" }}>{m.content}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={msgEndRef} />
            </div>
            <div style={{ padding:"10px 16px", background:"#fff", borderTop:"1px solid #e2e8f0", display:"flex", gap:8, alignItems:"flex-end" }}>
              <button onClick={() => fileRef.current?.click()} style={{ background:"none", border:"none", cursor:"pointer", color:"#64748b", padding:"6px", borderRadius:6, flexShrink:0, display:"flex", alignItems:"center" }} title="파일 첨부" disabled={uploading}>
                {uploading
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ animation:"spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>}
              </button>
              <textarea className="rm-input" style={{ flex:1, resize:"none", minHeight:40, maxHeight:120 }} rows={1}
                placeholder="메시지 입력... (Enter 전송, Shift+Enter 줄바꿈)"
                value={input} onChange={e => { setInput(e.target.value); e.currentTarget.style.height="auto"; e.currentTarget.style.height=e.currentTarget.scrollHeight+"px"; }}
                onKeyDown={e => { if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); sendMessage(); } }} />
              <button className="rm-btn rm-btn-primary" onClick={sendMessage} disabled={!input.trim()||sending} style={{ flexShrink:0, opacity:(!input.trim()||sending)?0.5:1 }}>전송</button>
            </div>
            <input ref={fileRef} type="file" multiple style={{ display:"none" }} onChange={e => { Array.from(e.target.files??[]).forEach(f => uploadFile(f)); e.target.value=""; }} />
          </>
        )}

        {/* FILES TAB */}
        {tab === "files" && (
          <div style={{ flex:1, overflowY:"auto", padding:16 }}>
            <div style={{ marginBottom:12, display:"flex", gap:8 }}>
              <button className="rm-btn rm-btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ display:"flex", alignItems:"center", gap:6 }}>
                {uploading ? "업로드 중..." : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    파일 업로드
                  </>
                )}
              </button>
              <input ref={fileRef} type="file" multiple style={{ display:"none" }} onChange={e => { Array.from(e.target.files??[]).forEach(f => uploadFile(f)); e.target.value=""; }} />
            </div>
            {files.length === 0 && <div style={{ textAlign:"center", color:"#94a3b8", padding:"40px 0", fontSize:".9rem" }}>업로드된 파일이 없습니다</div>}
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {files.map(f => (
                <div key={f.id} style={{ background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", padding:12 }}>
                  {f.mimeType.startsWith("image/") && <img src={f.url} alt={f.name} style={{ maxWidth:"100%", maxHeight:200, borderRadius:8, objectFit:"cover", display:"block", marginBottom:8 }} />}
                  {f.mimeType.startsWith("audio/") && <audio controls src={f.url} style={{ width:"100%", marginBottom:8 }} />}
                  {f.mimeType.startsWith("video/") && (
                    <HlsPlayer
                      src={f.url}
                      hlsSrc={`/api/v1/hls/room/${f.id}/playlist.m3u8`}
                      style={{ maxWidth:"100%", maxHeight:200, borderRadius:8, marginBottom:8 }}
                    />
                  )}
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ flexShrink:0 }}>{mimeIcon(f.mimeType)}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:".875rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.name}</div>
                      <div style={{ fontSize:".72rem", color:"#64748b" }}>{fmt(f.size)} · {f.uploaderName} · {shortTime(f.createdAt)}</div>
                    </div>
                    <a href={f.url} download={f.name} style={{ color:"#3b82f6", fontSize:".8rem", textDecoration:"none", padding:"4px 8px", border:"1px solid #3b82f6", borderRadius:6 }}>다운</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NOTE TAB */}
        {tab === "note" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", padding:16 }}>
            <div style={{ marginBottom:10, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontWeight:700, flex:1 }}>공유 메모</span>
              {!noteEditing
                ? <button className="rm-btn rm-btn-primary" style={{ padding:"6px 14px", display:"flex", alignItems:"center", gap:5 }} onClick={() => { setNoteDraft(note); setNoteEditing(true); }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    편집
                  </button>
                : <><button className="rm-btn rm-btn-primary" style={{ padding:"6px 14px" }} onClick={saveNote}>저장</button>
                   <button className="rm-btn rm-btn-ghost" style={{ padding:"6px 14px" }} onClick={() => setNoteEditing(false)}>취소</button></>}
            </div>
            {noteEditing
              ? <textarea value={noteDraft} onChange={e => setNoteDraft(e.target.value)}
                  style={{ flex:1, width:"100%", border:"1.5px solid #3b82f6", borderRadius:10, padding:"12px 14px", fontSize:".9375rem", outline:"none", resize:"none", lineHeight:1.7, fontFamily:"inherit" }}
                  placeholder="공유 메모를 입력하세요... 마크다운, 회의록, 할 일 목록 등" />
              : <div style={{ flex:1, background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", padding:"12px 14px", fontSize:".9375rem", lineHeight:1.7, overflowY:"auto", whiteSpace:"pre-wrap", wordBreak:"break-word", color: note?"#1e293b":"#94a3b8" }}>
                  {note || "메모가 없습니다. 편집 버튼을 눌러 작성하세요."}
                </div>
            }
          </div>
        )}
      </div>
    </div>
  );
}
