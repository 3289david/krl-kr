"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RoomLandingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const guestId = typeof window !== "undefined"
    ? (localStorage.getItem("krl_guest_id") || (() => { const id = "g_"+Math.random().toString(36).slice(2,10); localStorage.setItem("krl_guest_id",id); return id; })())
    : "guest";

  async function create() {
    setLoading(true); setErr("");
    const r = await fetch("/api/v1/room", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ name: name.trim(), guestId }) });
    const d = await r.json();
    setLoading(false);
    if (!r.ok) { setErr(d.error); return; }
    router.push(`/room/${d.code}`);
  }

  async function join() {
    const c = code.trim().toLowerCase();
    if (!c) return;
    setLoading(true); setErr("");
    const r = await fetch(`/api/v1/room/${c}`);
    setLoading(false);
    if (!r.ok) { setErr("방을 찾을 수 없습니다"); return; }
    const d = await r.json();
    if (d.archivedAt) { setErr("이 방은 아카이브되었습니다"); return; }
    router.push(`/room/${c}`);
  }

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"system-ui" }}>
      <div style={{ width:"100%", maxWidth:440 }}>
        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ width:64, height:64, borderRadius:18, background:"linear-gradient(135deg, #3b82f6, #8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <h1 style={{ fontSize:"1.75rem", fontWeight:800, background:"linear-gradient(135deg, #3b82f6, #8b5cf6)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:6 }}>KRL Room</h1>
          <p style={{ color:"#64748b", fontSize:".9375rem" }}>회원가입 없이 즉석 협업 공간 — 채팅·파일·메모</p>
        </div>

        {/* Create */}
        <div style={{ background:"#fff", borderRadius:16, padding:28, boxShadow:"0 4px 24px rgba(0,0,0,.08)", marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:"1rem", marginBottom:16 }}>🆕 새 방 만들기</div>
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key==="Enter" && create()}
            placeholder="방 이름 (선택)" style={{ width:"100%", border:"1.5px solid #e2e8f0", borderRadius:10, padding:"10px 14px", fontSize:".9375rem", outline:"none", marginBottom:12, fontFamily:"inherit" }} />
          <button onClick={create} disabled={loading} style={{ width:"100%", background:"linear-gradient(135deg, #3b82f6, #8b5cf6)", color:"#fff", border:"none", borderRadius:10, padding:"12px", fontSize:"1rem", fontWeight:700, cursor:"pointer", opacity:loading?0.7:1 }}>
            {loading ? "생성 중..." : "방 만들기"}
          </button>
        </div>

        {/* Join */}
        <div style={{ background:"#fff", borderRadius:16, padding:28, boxShadow:"0 4px 24px rgba(0,0,0,.08)" }}>
          <div style={{ fontWeight:700, fontSize:"1rem", marginBottom:16 }}>🔑 코드로 참여</div>
          <input value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key==="Enter" && join()}
            placeholder="방 코드 입력 (예: abc123)" style={{ width:"100%", border:"1.5px solid #e2e8f0", borderRadius:10, padding:"10px 14px", fontSize:".9375rem", outline:"none", marginBottom:12, fontFamily:"monospace" }} />
          <button onClick={join} disabled={loading || !code.trim()} style={{ width:"100%", background:"#f8fafc", color:"#1e293b", border:"1.5px solid #e2e8f0", borderRadius:10, padding:"12px", fontSize:".9375rem", fontWeight:600, cursor:"pointer", opacity:(loading||!code.trim())?0.5:1 }}>
            참여하기
          </button>
        </div>

        {err && <div style={{ marginTop:12, background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10, padding:"10px 14px", color:"#dc2626", fontSize:".875rem" }}>{err}</div>}

        <div style={{ textAlign:"center", marginTop:24, color:"#94a3b8", fontSize:".8rem" }}>
          방은 7일 이상 비활성 시 자동 아카이브됩니다 · <a href="/" style={{ color:"#3b82f6" }}>KRL.KR 홈</a>
        </div>
      </div>
    </div>
  );
}
