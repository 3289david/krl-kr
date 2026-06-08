"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function GhostPage() {
  const params = useParams();
  const username = params.username as string;
  const [box, setBox] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch(`/api/v1/public/ghost/${username}`).then(r => r.json()).then(d => { setBox(d.id ? d : null); setLoading(false); }).catch(() => setLoading(false));
  }, [username]);

  async function send() {
    if (!content.trim() || sending) return;
    setSending(true); setErr("");
    const r = await fetch(`/api/v1/ghost/${box.id}/feedbacks`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ content: content.trim() }) });
    const d = await r.json();
    setSending(false);
    if (!r.ok) { setErr(d.error); return; }
    setSent(true); setContent("");
  }

  if (loading) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", color:"#888" }}>불러오는 중...</div>;
  if (!box) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100vh", gap:12 }}>
      <div style={{ fontSize:"3rem" }}>👻</div>
      <div style={{ fontWeight:700 }}>페이지를 찾을 수 없습니다</div>
      <a href="/" style={{ color:"#3b82f6" }}>KRL.KR로 돌아가기</a>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg, #0f0f14 0%, #1a1a2e 50%, #16213e 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"system-ui" }}>
      <div style={{ width:"100%", maxWidth:480 }}>
        {/* Ghost card */}
        <div style={{ background:"rgba(255,255,255,.04)", backdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,.1)", borderRadius:20, padding:32, boxShadow:"0 20px 60px rgba(0,0,0,.5)" }}>
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{ fontSize:"3rem", marginBottom:12 }}>👻</div>
            <h1 style={{ color:"#fff", fontWeight:800, fontSize:"1.4rem", marginBottom:6 }}>{box.title}</h1>
            <div style={{ color:"rgba(255,255,255,.5)", fontSize:".8rem" }}>@{box.username} 님에게 익명으로 메시지</div>
            {box.description && <div style={{ color:"rgba(255,255,255,.6)", fontSize:".875rem", marginTop:10, lineHeight:1.5 }}>{box.description}</div>}
          </div>

          {!box.isActive ? (
            <div style={{ textAlign:"center", padding:"20px 0", color:"rgba(255,255,255,.4)" }}>
              <div style={{ fontSize:"1.5rem", marginBottom:8 }}>🔒</div>
              피드백 박스가 비활성화되었습니다
            </div>
          ) : sent ? (
            <div style={{ textAlign:"center", padding:"28px 0" }}>
              <div style={{ fontSize:"2.5rem", marginBottom:12 }}>✉️</div>
              <div style={{ color:"#fff", fontWeight:700, fontSize:"1.1rem", marginBottom:6 }}>익명으로 전송되었습니다</div>
              <div style={{ color:"rgba(255,255,255,.5)", fontSize:".875rem", marginBottom:20 }}>누가 보냈는지 알 수 없습니다</div>
              <button onClick={() => setSent(false)} style={{ background:"rgba(255,255,255,.1)", color:"#fff", border:"1px solid rgba(255,255,255,.2)", borderRadius:10, padding:"10px 20px", cursor:"pointer", fontSize:".875rem" }}>
                또 보내기
              </button>
            </div>
          ) : (
            <>
              <textarea value={content} onChange={e => setContent(e.target.value)}
                placeholder="익명으로 메시지를 보내세요... 솔직한 피드백, 응원, 질문 모두 괜찮아요"
                style={{ width:"100%", minHeight:140, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.15)", borderRadius:12, padding:"14px 16px", color:"#fff", fontSize:".9375rem", resize:"none", outline:"none", fontFamily:"inherit", lineHeight:1.6, transition:"border-color .15s" }}
                onFocus={e => e.currentTarget.style.borderColor="rgba(139,92,246,.6)"}
                onBlur={e => e.currentTarget.style.borderColor="rgba(255,255,255,.15)"} />
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8, marginBottom:16 }}>
                <span style={{ fontSize:".75rem", color:"rgba(255,255,255,.3)" }}>{content.length}/2000</span>
                <span style={{ fontSize:".72rem", color:"rgba(255,255,255,.3)" }}>🔒 완전 익명 · 발신자 정보 없음</span>
              </div>
              {err && <div style={{ background:"rgba(239,68,68,.15)", border:"1px solid rgba(239,68,68,.3)", borderRadius:8, padding:"8px 12px", color:"#fca5a5", fontSize:".8rem", marginBottom:12 }}>{err}</div>}
              <button onClick={send} disabled={!content.trim()||sending||content.length>2000}
                style={{ width:"100%", background:"linear-gradient(135deg, #8b5cf6, #6366f1)", color:"#fff", border:"none", borderRadius:12, padding:"14px", fontSize:"1rem", fontWeight:700, cursor:"pointer", opacity:(!content.trim()||sending)?0.5:1, transition:"opacity .15s" }}>
                {sending ? "전송 중..." : "👻 익명으로 보내기"}
              </button>
            </>
          )}
        </div>

        <div style={{ textAlign:"center", marginTop:20, color:"rgba(255,255,255,.2)", fontSize:".75rem" }}>
          Powered by <a href="/" style={{ color:"rgba(255,255,255,.4)", textDecoration:"none" }}>KRL.KR</a> · 스팸은 자동 필터링됩니다
        </div>
      </div>
    </div>
  );
}
