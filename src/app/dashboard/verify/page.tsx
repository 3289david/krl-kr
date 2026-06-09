"use client";
import { useState, useEffect, useRef } from "react";

interface VerifyRecord { id: string; fileName: string; fileSize: number; mimeType: string; sha256: string; note: string; isPublic: boolean; createdAt: number; }

function fmt(bytes: number) { if (bytes < 1024) return `${bytes}B`; if (bytes < 1048576) return `${(bytes/1024).toFixed(1)}KB`; return `${(bytes/1048576).toFixed(1)}MB`; }
function shortSha(h: string) { return h.slice(0,8)+"..."+h.slice(-8); }
function relTime(ts: number) { const d = Date.now()-ts; if(d<60000) return "방금"; if(d<3600000) return `${Math.floor(d/60000)}분 전`; if(d<86400000) return `${Math.floor(d/3600000)}시간 전`; return new Date(ts).toLocaleDateString("ko-KR"); }
function mimeIcon(mime: string, size = 18) {
  const p = { width:size, height:size, viewBox:"0 0 24 24", fill:"none", stroke:"#64748b", strokeWidth:1.5, strokeLinecap:"round" as const, strokeLinejoin:"round" as const };
  if (mime.startsWith("image/")) return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
  if (mime.startsWith("audio/")) return <svg {...p}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
  if (mime.startsWith("video/")) return <svg {...p}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>;
  return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
}

export default function VerifyPage() {
  const [records, setRecords] = useState<VerifyRecord[]>([]);
  const [tab, setTab] = useState<"list"|"create"|"check">("list");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{text:string; ok:boolean}|null>(null);

  // Create state
  const [createFile, setCreateFile] = useState<File|null>(null);
  const [createNote, setCreateNote] = useState("");
  const [createPublic, setCreatePublic] = useState(true);
  const [newRecord, setNewRecord] = useState<VerifyRecord&{verifyUrl:string}|null>(null);

  // Check state
  const [checkFile, setCheckFile] = useState<File|null>(null);
  const [checkId, setCheckId] = useState("");
  const [checkResult, setCheckResult] = useState<any>(null);

  const createFileRef = useRef<HTMLInputElement>(null);
  const checkFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadRecords(); }, []);

  async function loadRecords() {
    const r = await fetch("/api/v1/verify");
    const d = await r.json();
    setRecords(d.records ?? []);
  }

  async function create() {
    if (!createFile) return;
    setLoading(true); setMsg(null);
    const fd = new FormData();
    fd.append("file", createFile);
    fd.append("note", createNote);
    fd.append("isPublic", String(createPublic));
    const r = await fetch("/api/v1/verify", { method:"POST", body:fd });
    const d = await r.json();
    setLoading(false);
    if (!r.ok) { setMsg({ text: d.error, ok:false }); return; }
    setNewRecord(d);
    setCreateFile(null); setCreateNote(""); setMsg(null);
    loadRecords();
  }

  async function check() {
    if (!checkFile || !checkId.trim()) return;
    setLoading(true); setCheckResult(null);
    const fd = new FormData();
    fd.append("file", checkFile);
    const r = await fetch(`/api/v1/verify/${checkId.trim()}`, { method:"POST", body:fd });
    const d = await r.json();
    setLoading(false);
    if (!r.ok) { setMsg({ text: d.error, ok:false }); return; }
    setCheckResult(d);
  }

  async function deleteRecord(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/v1/verify/${id}`, { method:"DELETE" });
    setRecords(prev => prev.filter(r => r.id !== id));
  }

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontWeight:800, fontSize:"1.5rem", marginBottom:4 }}>KRL Verify</h1>
        <p style={{ color:"var(--color-muted)", fontSize:".9rem" }}>파일의 SHA-256 해시를 기록해 위조 여부를 나중에 검증합니다</p>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:24, background:"var(--color-canvas)", borderRadius:10, padding:4 }}>
        {(["list","create","check"] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setMsg(null); setCheckResult(null); setNewRecord(null); }}
            style={{ flex:1, padding:"8px", border:"none", borderRadius:8, cursor:"pointer", fontWeight:tab===t?700:400, background:tab===t?"var(--color-surface)":"none", color:tab===t?"var(--color-ink)":"var(--color-muted)", boxShadow:tab===t?"0 1px 4px rgba(0,0,0,.1)":"none", fontSize:".875rem", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
            {t==="list" && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>}
            {t==="create" && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
            {t==="check" && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>}
            {t==="list"?"내 기록":t==="create"?"새 기록":"검증"}
          </button>
        ))}
      </div>

      {/* LIST TAB */}
      {tab === "list" && (
        <div>
          {records.length === 0 && (
            <div style={{ textAlign:"center", padding:"48px 0", color:"var(--color-muted)" }}>
              <div style={{ marginBottom:8, display:"flex", justifyContent:"center" }}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div style={{ fontWeight:600 }}>기록이 없습니다</div>
              <div style={{ fontSize:".875rem", marginTop:4 }}>파일을 업로드해 진위 기록을 생성하세요</div>
              <button onClick={() => setTab("create")} className="btn btn-primary btn-sm" style={{ marginTop:12 }}>새 기록 만들기</button>
            </div>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {records.map(r => (
              <div key={r.id} style={{ background:"var(--color-surface)", borderRadius:12, padding:"14px 16px", border:"1px solid var(--color-hairline)" }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:"#eff6ff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {mimeIcon(r.mimeType, 20)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:".9375rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.fileName}</div>
                    <div style={{ fontSize:".75rem", color:"var(--color-muted)", marginTop:2 }}>{fmt(r.fileSize)} · {relTime(r.createdAt)} · {r.isPublic?"공개":"비공개"}</div>
                    {r.note && <div style={{ fontSize:".8125rem", marginTop:4, color:"var(--color-muted)" }}>{r.note}</div>}
                    <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:8 }}>
                      <code style={{ fontSize:".7rem", background:"var(--color-canvas)", padding:"2px 6px", borderRadius:4, fontFamily:"monospace", color:"var(--color-muted)" }}>{shortSha(r.sha256)}</code>
                      <button onClick={() => navigator.clipboard.writeText(r.sha256)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--color-muted)", fontSize:".7rem" }}>복사</button>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                    {r.isPublic && <a href={`/verify/${r.id}`} target="_blank" className="btn btn-sm" style={{ fontSize:".75rem" }}>공개 링크</a>}
                    <button onClick={() => deleteRecord(r.id)} className="btn btn-sm" style={{ fontSize:".75rem", color:"#dc2626" }}>삭제</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE TAB */}
      {tab === "create" && (
        <div style={{ maxWidth:520 }}>
          {newRecord ? (
            <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:12, padding:20 }}>
              <div style={{ fontWeight:700, color:"#166534", marginBottom:12, fontSize:"1rem", display:"flex", alignItems:"center", gap:6 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                기록이 생성되었습니다!
              </div>
              <div style={{ background:"#fff", borderRadius:8, padding:14, marginBottom:12 }}>
                <div style={{ fontSize:".8rem", color:"var(--color-muted)", marginBottom:4 }}>파일명</div>
                <div style={{ fontWeight:600 }}>{newRecord.fileName}</div>
                <div style={{ fontSize:".8rem", color:"var(--color-muted)", marginTop:8, marginBottom:4 }}>SHA-256 해시</div>
                <code style={{ fontSize:".75rem", fontFamily:"monospace", wordBreak:"break-all", display:"block" }}>{newRecord.sha256}</code>
                <div style={{ fontSize:".8rem", color:"var(--color-muted)", marginTop:8, marginBottom:4 }}>검증 URL</div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <code style={{ fontSize:".8rem", background:"var(--color-canvas)", padding:"4px 8px", borderRadius:6 }}>krl.kr{newRecord.verifyUrl}</code>
                  <button onClick={() => navigator.clipboard.writeText(`https://krl.kr${newRecord.verifyUrl}`)} className="btn btn-sm btn-primary" style={{ fontSize:".75rem" }}>복사</button>
                </div>
              </div>
              <button onClick={() => setNewRecord(null)} className="btn btn-primary" style={{ width:"100%" }}>새 기록 만들기</button>
            </div>
          ) : (
            <div>
              <div style={{ border:"2px dashed var(--color-hairline)", borderRadius:12, padding:28, textAlign:"center", cursor:"pointer", marginBottom:16, background:createFile?"#f0fdf4":"var(--color-canvas)" }}
                onClick={() => createFileRef.current?.click()}>
                {createFile ? (
                  <>
                    <div style={{ display:"flex", justifyContent:"center", marginBottom:4 }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    </div>
                    <div style={{ fontWeight:700, marginTop:4 }}>{createFile.name}</div>
                    <div style={{ color:"var(--color-muted)", fontSize:".8rem" }}>{fmt(createFile.size)}</div>
                  </>
                ) : (
                  <>
                    <div style={{ display:"flex", justifyContent:"center", marginBottom:8 }}>
                      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    </div>
                    <div style={{ fontWeight:600 }}>클릭하여 파일 선택</div>
                    <div style={{ color:"var(--color-muted)", fontSize:".8rem" }}>최대 500MB · 모든 파일 형식</div>
                  </>
                )}
              </div>
              <input ref={createFileRef} type="file" style={{ display:"none" }} onChange={e => setCreateFile(e.target.files?.[0]??null)} />
              <input className="input" placeholder="메모 (선택, 예: 2024 계약서 v2)" value={createNote} onChange={e => setCreateNote(e.target.value)} style={{ width:"100%", marginBottom:12, height:38 }} />
              <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", marginBottom:16, fontSize:".875rem" }}>
                <input type="checkbox" checked={createPublic} onChange={e => setCreatePublic(e.target.checked)} />
                공개 검증 링크 생성 (누구나 파일 진위 확인 가능)
              </label>
              {msg && <div style={{ marginBottom:12, padding:"8px 12px", borderRadius:8, background:msg.ok?"#f0fdf4":"#fef2f2", color:msg.ok?"#166534":"#dc2626", fontSize:".875rem" }}>{msg.text}</div>}
              <button onClick={create} disabled={!createFile||loading} className="btn btn-primary" style={{ width:"100%", justifyContent:"center", height:40 }}>
                {loading ? "처리 중..." : "해시 생성 및 기록"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* CHECK TAB */}
      {tab === "check" && (
        <div style={{ maxWidth:520 }}>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:".8125rem", fontWeight:600, display:"block", marginBottom:5 }}>검증 ID 또는 URL</label>
            <input className="input" placeholder="예: abc123... 또는 krl.kr/verify/abc123" value={checkId} onChange={e => setCheckId(e.target.value.replace(/.*\/verify\//,"").trim())} style={{ width:"100%", height:38 }} />
          </div>
          <div style={{ border:"2px dashed var(--color-hairline)", borderRadius:12, padding:20, textAlign:"center", cursor:"pointer", marginBottom:16, background:checkFile?"#eff6ff":"var(--color-canvas)" }}
            onClick={() => checkFileRef.current?.click()}>
            {checkFile ? (
              <>
                <div style={{ fontWeight:700 }}>{checkFile.name}</div>
                <div style={{ color:"var(--color-muted)", fontSize:".8rem" }}>{fmt(checkFile.size)}</div>
              </>
            ) : (
              <>
                <div style={{ display:"flex", justifyContent:"center", marginBottom:4 }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                <div style={{ fontWeight:600 }}>검증할 파일 선택</div>
              </>
            )}
          </div>
          <input ref={checkFileRef} type="file" style={{ display:"none" }} onChange={e => setCheckFile(e.target.files?.[0]??null)} />
          {msg && <div style={{ marginBottom:12, padding:"8px 12px", borderRadius:8, background:"#fef2f2", color:"#dc2626", fontSize:".875rem" }}>{msg.text}</div>}
          <button onClick={check} disabled={!checkFile||!checkId.trim()||loading} className="btn btn-primary" style={{ width:"100%", justifyContent:"center", height:40, marginBottom:16 }}>
            {loading ? "검증 중..." : "진위 검증"}
          </button>
          {checkResult && (
            <div style={{ background:checkResult.match?"#f0fdf4":"#fef2f2", border:`1px solid ${checkResult.match?"#bbf7d0":"#fecaca"}`, borderRadius:12, padding:16 }}>
              <div style={{ fontWeight:800, fontSize:"1.1rem", color:checkResult.match?"#166534":"#dc2626", marginBottom:8, display:"flex", alignItems:"center", gap:8 }}>
                {checkResult.match
                  ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
                {checkResult.match ? "일치 — 원본 파일입니다" : "불일치 — 파일이 변조되었거나 다른 파일입니다"}
              </div>
              <div style={{ fontSize:".8rem", color:"var(--color-muted)" }}>
                <div>원본: {checkResult.original?.fileName} ({fmt(checkResult.original?.fileSize)})</div>
                <div style={{ marginTop:4 }}>업로드: {checkResult.uploaded?.fileName} ({fmt(checkResult.uploaded?.fileSize)})</div>
                {!checkResult.match && (
                  <>
                    <div style={{ marginTop:8, fontFamily:"monospace", fontSize:".7rem" }}>원본 SHA-256: {checkResult.original?.sha256}</div>
                    <div style={{ fontFamily:"monospace", fontSize:".7rem" }}>업로드 SHA-256: {checkResult.uploaded?.sha256}</div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
