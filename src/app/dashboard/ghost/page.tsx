"use client";
import { useState, useEffect } from "react";

interface Box { id: string; username: string; title: string; description: string; isActive: boolean; createdAt: number; total: number; unread: number; }
interface Feedback { id: number; content: string; isSpam: boolean; isRead: boolean; isPinned: boolean; createdAt: number; }

function relTime(ts: number) { const d = Date.now()-ts; if(d<60000) return "방금"; if(d<3600000) return `${Math.floor(d/60000)}분 전`; if(d<86400000) return `${Math.floor(d/3600000)}시간 전`; return new Date(ts).toLocaleDateString("ko-KR"); }

function GhostIcon({ size = 24, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 10h.01"/><path d="M15 10h.01"/>
      <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/>
    </svg>
  );
}

export default function GhostDashboard() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [activeBox, setActiveBox] = useState<Box|null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [tab, setTab] = useState<"inbox"|"create">("inbox");
  const [showSpam, setShowSpam] = useState(false);
  const [loading, setLoading] = useState(false);

  // Create form
  const [username, setUsername] = useState("");
  const [title, setTitle] = useState("익명 피드백");
  const [description, setDescription] = useState("");
  const [createMsg, setCreateMsg] = useState<{text:string;ok:boolean}|null>(null);

  useEffect(() => { loadBoxes(); }, []);

  async function loadBoxes() {
    const r = await fetch("/api/v1/ghost");
    const d = await r.json();
    const list = d.boxes ?? [];
    setBoxes(list);
    if (list.length > 0 && !activeBox) setActiveBox(list[0]);
  }

  useEffect(() => {
    if (activeBox) loadFeedbacks(activeBox.id);
  }, [activeBox, showSpam]);

  async function loadFeedbacks(boxId: string) {
    setLoading(true);
    const r = await fetch(`/api/v1/ghost/${boxId}/feedbacks${showSpam?"?spam=1":""}`);
    const d = await r.json();
    setFeedbacks(d.feedbacks ?? []);
    setLoading(false);
    setBoxes(prev => prev.map(b => b.id === boxId ? { ...b, unread: 0 } : b));
  }

  async function action(feedbackId: number, act: "pin"|"spam"|"delete") {
    if (!activeBox) return;
    await fetch(`/api/v1/ghost/${activeBox.id}/feedbacks`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ feedbackId, action: act }) });
    if (act === "delete") setFeedbacks(prev => prev.filter(f => f.id !== feedbackId));
    else if (act === "pin") setFeedbacks(prev => prev.map(f => f.id === feedbackId ? { ...f, isPinned: !f.isPinned } : f));
    else if (act === "spam") setFeedbacks(prev => prev.map(f => f.id === feedbackId ? { ...f, isSpam: !f.isSpam } : f));
  }

  async function toggleActive(box: Box) {
    await fetch(`/api/v1/ghost/${box.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ isActive: !box.isActive }) });
    setBoxes(prev => prev.map(b => b.id === box.id ? { ...b, isActive: !b.isActive } : b));
    if (activeBox?.id === box.id) setActiveBox(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
  }

  async function createBox() {
    setLoading(true); setCreateMsg(null);
    const r = await fetch("/api/v1/ghost", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ username, title, description }) });
    const d = await r.json();
    setLoading(false);
    if (!r.ok) { setCreateMsg({ text: d.error, ok:false }); return; }
    setCreateMsg({ text: `ghost.krl.kr/${d.username} 생성 완료!`, ok:true });
    setUsername(""); setTitle("익명 피드백"); setDescription("");
    loadBoxes();
    setTimeout(() => setTab("inbox"), 1200);
  }

  async function deleteBox(box: Box) {
    if (!confirm(`"${box.username}" 박스를 삭제하시겠습니까? 모든 피드백이 삭제됩니다.`)) return;
    await fetch(`/api/v1/ghost/${box.id}`, { method:"DELETE" });
    setBoxes(prev => prev.filter(b => b.id !== box.id));
    if (activeBox?.id === box.id) { setActiveBox(null); setFeedbacks([]); }
  }

  return (
    <div className="ghost-page">
      <style>{`
        @media (max-width: 640px) {
          .ghost-inbox { flex-direction: column !important; }
          .ghost-box-list { width: 100% !important; display: flex !important; flex-direction: row !important; overflow-x: auto; gap: 6px !important; }
          .ghost-box-list > button { flex-shrink: 0; width: auto !important; min-width: 120px; margin-bottom: 0 !important; }
          .ghost-feedback-header { flex-wrap: wrap; gap: 8px !important; }
        }
      `}</style>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontWeight:800, fontSize:"1.5rem", marginBottom:4, display:"flex", alignItems:"center", gap:8 }}>
          <GhostIcon size={26} color="var(--color-ink)" />
          KRL Ghost
        </h1>
        <p style={{ color:"var(--color-muted)", fontSize:".9rem" }}>익명 피드백 박스 — ghost.krl.kr/[이름]으로 공유</p>
      </div>

      <div style={{ display:"flex", gap:4, marginBottom:24, background:"var(--color-canvas)", borderRadius:10, padding:4 }}>
        <button onClick={() => setTab("inbox")} style={{ flex:1, padding:"8px", border:"none", borderRadius:8, cursor:"pointer", fontWeight:tab==="inbox"?700:400, background:tab==="inbox"?"var(--color-surface)":"none", fontSize:".875rem", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
          피드백 받은 함
        </button>
        <button onClick={() => setTab("create")} style={{ flex:1, padding:"8px", border:"none", borderRadius:8, cursor:"pointer", fontWeight:tab==="create"?700:400, background:tab==="create"?"var(--color-surface)":"none", fontSize:".875rem", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          새 박스 만들기
        </button>
      </div>

      {tab === "inbox" && (
        boxes.length === 0 ? (
          <div style={{ textAlign:"center", padding:"48px 0", color:"var(--color-muted)" }}>
            <div style={{ marginBottom:8, display:"flex", justifyContent:"center" }}>
              <GhostIcon size={52} color="var(--color-muted)" />
            </div>
            <div style={{ fontWeight:600 }}>피드백 박스가 없습니다</div>
            <button onClick={() => setTab("create")} className="btn btn-primary btn-sm" style={{ marginTop:12 }}>박스 만들기</button>
          </div>
        ) : (
          <div className="ghost-inbox" style={{ display:"flex", gap:20 }}>
            {/* Box list */}
            <div className="ghost-box-list" style={{ width:220, flexShrink:0 }}>
              {boxes.map(b => (
                <button key={b.id} onClick={() => setActiveBox(b)}
                  style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1.5px solid ${activeBox?.id===b.id?"#3b82f6":"var(--color-hairline)"}`, background:activeBox?.id===b.id?"#eff6ff":"var(--color-surface)", cursor:"pointer", textAlign:"left", marginBottom:6, display:"flex", gap:8, alignItems:"center" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:".875rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>@{b.username}</div>
                    <div style={{ fontSize:".7rem", color:"var(--color-muted)" }}>{b.total}개 · {b.isActive?"활성":"비활성"}</div>
                  </div>
                  {b.unread > 0 && <span style={{ background:"#ef4444", color:"#fff", borderRadius:10, fontSize:".65rem", padding:"1px 6px", fontWeight:700 }}>{b.unread}</span>}
                </button>
              ))}
            </div>

            {/* Feedback list */}
            {activeBox && (
              <div style={{ flex:1, minWidth:0 }}>
                <div className="ghost-feedback-header" style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                  <span style={{ fontWeight:700 }}>@{activeBox.username}</span>
                  <a href={`/ghost/${activeBox.username}`} target="_blank" style={{ fontSize:".75rem", color:"#3b82f6" }}>공개 링크 →</a>
                  <div style={{ flex:1 }}/>
                  <button onClick={() => toggleActive(activeBox)} className={`btn btn-sm ${activeBox.isActive?"":"btn-primary"}`} style={{ fontSize:".75rem" }}>
                    {activeBox.isActive?"비활성화":"활성화"}
                  </button>
                  <label style={{ fontSize:".75rem", display:"flex", alignItems:"center", gap:4, cursor:"pointer" }}>
                    <input type="checkbox" checked={showSpam} onChange={e => setShowSpam(e.target.checked)} /> 스팸 표시
                  </label>
                  <button onClick={() => deleteBox(activeBox)} style={{ background:"none", border:"none", cursor:"pointer", color:"#dc2626", fontSize:".75rem" }}>삭제</button>
                </div>

                {loading && <div style={{ color:"var(--color-muted)", fontSize:".875rem" }}>불러오는 중...</div>}
                {!loading && feedbacks.length === 0 && (
                  <div style={{ textAlign:"center", padding:"32px 0", color:"var(--color-muted)" }}>
                    <div style={{ display:"flex", justifyContent:"center", marginBottom:6 }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
                    </div>
                    <div>아직 피드백이 없습니다</div>
                    <div style={{ fontSize:".8rem", marginTop:4 }}>링크를 공유하면 익명 메시지를 받을 수 있습니다</div>
                  </div>
                )}
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {feedbacks.map(f => (
                    <div key={f.id} style={{ background:"var(--color-surface)", borderRadius:10, padding:14, border:`1px solid ${f.isPinned?"#3b82f6":"var(--color-hairline)"}`, opacity:f.isSpam?0.5:1 }}>
                      <div style={{ fontSize:".9375rem", lineHeight:1.6, whiteSpace:"pre-wrap", wordBreak:"break-word", marginBottom:8 }}>{f.content}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontSize:".72rem", color:"var(--color-muted)", flex:1 }}>{relTime(f.createdAt)}{f.isSpam?" · 스팸":""}{f.isPinned?" · 고정":""}</span>
                        <button onClick={() => action(f.id, "pin")} style={{ background:"none", border:"none", cursor:"pointer", color:f.isPinned?"#3b82f6":"var(--color-muted)", display:"flex", alignItems:"center", gap:3, fontSize:".75rem" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill={f.isPinned?"#3b82f6":"none"} stroke={f.isPinned?"#3b82f6":"currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"/></svg>
                          {f.isPinned?"해제":"고정"}
                        </button>
                        <button onClick={() => action(f.id, "spam")} style={{ background:"none", border:"none", cursor:"pointer", color:f.isSpam?"#f59e0b":"var(--color-muted)", display:"flex", alignItems:"center", gap:3, fontSize:".75rem" }}>
                          {f.isSpam ? (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                              복원
                            </>
                          ) : "스팸"}
                        </button>
                        <button onClick={() => action(f.id, "delete")} style={{ background:"none", border:"none", cursor:"pointer", fontSize:".75rem", color:"#dc2626" }}>삭제</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {tab === "create" && (
        <div style={{ maxWidth:440 }}>
          <label style={{ fontSize:".8125rem", fontWeight:600, display:"block", marginBottom:5 }}>URL 이름 <span style={{ color:"var(--color-muted)", fontWeight:400 }}>ghost.krl.kr/[이름]</span></label>
          <input className="input" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g,""))} placeholder="예: danwoo, my-team, class-2024" style={{ width:"100%", marginBottom:14, height:38 }} />
          <label style={{ fontSize:".8125rem", fontWeight:600, display:"block", marginBottom:5 }}>제목</label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="익명 피드백" style={{ width:"100%", marginBottom:14, height:38 }} />
          <label style={{ fontSize:".8125rem", fontWeight:600, display:"block", marginBottom:5 }}>설명 (선택)</label>
          <textarea className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="이 피드백 박스에 대한 설명..." style={{ width:"100%", marginBottom:16, height:80, resize:"vertical" }} />
          {createMsg && <div style={{ marginBottom:12, padding:"8px 12px", borderRadius:8, background:createMsg.ok?"#f0fdf4":"#fef2f2", color:createMsg.ok?"#166534":"#dc2626", fontSize:".875rem" }}>{createMsg.text}</div>}
          <button onClick={createBox} disabled={!username||loading} className="btn btn-primary" style={{ width:"100%", justifyContent:"center", height:40 }}>
            {loading ? "생성 중..." : "박스 만들기"}
          </button>
        </div>
      )}
    </div>
  );
}
