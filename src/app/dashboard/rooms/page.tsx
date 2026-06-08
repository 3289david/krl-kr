"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Room { code: string; name: string; archivedAt: number|null; createdAt: number; lastActiveAt: number; msgCount: number; fileCount: number; }

function relTime(ts: number) { const d = Date.now()-ts; if(d<60000) return "방금"; if(d<3600000) return `${Math.floor(d/60000)}분 전`; if(d<86400000) return `${Math.floor(d/3600000)}시간 전`; if(d<604800000) return `${Math.floor(d/86400000)}일 전`; return new Date(ts).toLocaleDateString("ko-KR"); }

export default function RoomsDashboard() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/room/mine").then(r => r.json()).then(d => { setRooms(d.rooms ?? []); setLoading(false); });
  }, []);

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <div>
          <h1 style={{ fontWeight:800, fontSize:"1.5rem", marginBottom:4 }}>KRL Room</h1>
          <p style={{ color:"var(--color-muted)", fontSize:".9rem" }}>내가 만든 협업 공간 목록</p>
        </div>
        <div style={{ flex:1 }}/>
        <Link href="/room" className="btn btn-primary">새 방 만들기 →</Link>
      </div>

      {loading && <div style={{ color:"var(--color-muted)" }}>불러오는 중...</div>}
      {!loading && rooms.length === 0 && (
        <div style={{ textAlign:"center", padding:"48px 0", color:"var(--color-muted)" }}>
          <div style={{ fontSize:"3rem", marginBottom:8 }}>🏠</div>
          <div style={{ fontWeight:600 }}>방이 없습니다</div>
          <div style={{ fontSize:".875rem", marginTop:4 }}>로그인 상태로 방을 만들면 여기서 관리할 수 있습니다</div>
          <Link href="/room" className="btn btn-primary btn-sm" style={{ display:"inline-block", marginTop:12 }}>방 만들기</Link>
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {rooms.map(r => (
          <div key={r.code} style={{ background:"var(--color-surface)", borderRadius:12, padding:"14px 16px", border:`1px solid ${r.archivedAt?"var(--color-hairline)":"var(--color-hairline)"}`, opacity:r.archivedAt?0.6:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:r.archivedAt?"#f1f5f9":"linear-gradient(135deg, #3b82f6, #8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:".9375rem" }}>{r.name || `방 ${r.code}`}</div>
                <div style={{ fontSize:".75rem", color:"var(--color-muted)", marginTop:2 }}>
                  코드: <code style={{ fontFamily:"monospace", background:"var(--color-canvas)", padding:"0 4px", borderRadius:3 }}>{r.code}</code>
                  {" · "}{r.msgCount}개 메시지 · {r.fileCount}개 파일
                  {" · "}{r.archivedAt ? "아카이브됨" : `최근 활동 ${relTime(r.lastActiveAt)}`}
                </div>
              </div>
              {!r.archivedAt && (
                <Link href={`/room/${r.code}`} className="btn btn-sm btn-primary" style={{ fontSize:".8rem" }}>입장 →</Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
