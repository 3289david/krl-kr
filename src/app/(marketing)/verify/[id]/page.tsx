"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";

function fmt(bytes: number) { if (bytes < 1024) return `${bytes}B`; if (bytes < 1048576) return `${(bytes/1024).toFixed(1)}KB`; return `${(bytes/1048576).toFixed(1)}MB`; }

export default function PublicVerifyPage() {
  const params = useParams();
  const id = params.id as string;
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkFile, setCheckFile] = useState<File|null>(null);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/v1/verify/${id}`).then(r => r.json()).then(d => { setRecord(d.record ?? null); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  async function check() {
    if (!checkFile) return;
    setChecking(true); setResult(null);
    const fd = new FormData(); fd.append("file", checkFile);
    const r = await fetch(`/api/v1/verify/${id}`, { method:"POST", body:fd });
    const d = await r.json();
    setChecking(false);
    if (r.ok) setResult(d);
  }

  if (loading) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh", color:"#888" }}>불러오는 중...</div>;
  if (!record) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh", flexDirection:"column", gap:12, color:"#94a3b8" }}>
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <div style={{ fontWeight:700, color:"#1e293b" }}>찾을 수 없습니다</div>
    </div>
  );

  return (
    <div style={{ maxWidth:600, margin:"0 auto", padding:"40px 20px", fontFamily:"system-ui" }}>
      <div style={{ textAlign:"center", marginBottom:32 }}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:12 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h1 style={{ fontSize:"1.5rem", fontWeight:800 }}>KRL Verify — 진위 검증</h1>
        <p style={{ color:"#64748b", fontSize:".875rem", marginTop:4 }}>이 기록으로 파일의 원본 여부를 확인합니다</p>
      </div>

      {/* Record info */}
      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e2e8f0", padding:20, marginBottom:24, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
        <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
          <div style={{ width:48, height:48, borderRadius:12, background:"#eff6ff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:"1rem" }}>{record.fileName}</div>
            <div style={{ fontSize:".8rem", color:"#64748b", marginTop:2 }}>{fmt(record.fileSize)} · {record.mimeType}</div>
            {record.note && <div style={{ marginTop:6, fontSize:".875rem", color:"#64748b" }}>{record.note}</div>}
            {record.ownerName && <div style={{ marginTop:4, fontSize:".75rem", color:"#94a3b8" }}>등록: {record.ownerName}</div>}
          </div>
        </div>
        <div style={{ marginTop:14, background:"#f8fafc", borderRadius:8, padding:"10px 14px" }}>
          <div style={{ fontSize:".72rem", color:"#94a3b8", marginBottom:4 }}>SHA-256 해시</div>
          <code style={{ fontSize:".72rem", fontFamily:"monospace", wordBreak:"break-all", color:"#1e293b" }}>{record.sha256}</code>
        </div>
        <div style={{ marginTop:8, fontSize:".75rem", color:"#94a3b8" }}>기록일: {new Date(record.createdAt).toLocaleString("ko-KR")}</div>
      </div>

      {/* Check */}
      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e2e8f0", padding:20, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
        <div style={{ fontWeight:700, marginBottom:14 }}>파일 진위 확인</div>
        <div style={{ border:"2px dashed #e2e8f0", borderRadius:10, padding:20, textAlign:"center", cursor:"pointer", marginBottom:14, background:checkFile?"#f0fdf4":"#f8fafc" }}
          onClick={() => fileRef.current?.click()}>
          {checkFile ? (
            <>
              <div style={{ fontWeight:600 }}>{checkFile.name}</div>
              <div style={{ color:"#64748b", fontSize:".8rem" }}>{fmt(checkFile.size)}</div>
            </>
          ) : (
            <>
              <div style={{ display:"flex", justifyContent:"center", marginBottom:6 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div style={{ fontSize:".875rem", color:"#64748b" }}>확인할 파일을 선택하세요</div>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" style={{ display:"none" }} onChange={e => { setCheckFile(e.target.files?.[0]??null); setResult(null); }} />
        <button onClick={check} disabled={!checkFile||checking} style={{ width:"100%", background:"#1e293b", color:"#fff", border:"none", borderRadius:10, padding:"12px", fontSize:".9375rem", fontWeight:700, cursor:"pointer", opacity:(!checkFile||checking)?0.5:1 }}>
          {checking ? "검증 중..." : "진위 검증하기"}
        </button>
        {result && (
          <div style={{ marginTop:16, background:result.match?"#f0fdf4":"#fef2f2", border:`1px solid ${result.match?"#bbf7d0":"#fecaca"}`, borderRadius:10, padding:16, textAlign:"center" }}>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:8 }}>
              {result.match
                ? <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                : <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
            </div>
            <div style={{ fontWeight:800, fontSize:"1.1rem", color:result.match?"#166534":"#dc2626", marginTop:2 }}>
              {result.match ? "원본 파일입니다" : "파일이 변조되었거나 다른 파일입니다"}
            </div>
            {!result.match && <div style={{ marginTop:8, fontSize:".75rem", color:"#64748b" }}>해시값이 일치하지 않습니다</div>}
          </div>
        )}
      </div>

      <div style={{ textAlign:"center", marginTop:24, color:"#94a3b8", fontSize:".8rem" }}>
        <a href="/dashboard/verify" style={{ color:"#3b82f6" }}>내 파일 기록하기</a> · <a href="/" style={{ color:"#3b82f6" }}>KRL.KR</a>
      </div>
    </div>
  );
}
