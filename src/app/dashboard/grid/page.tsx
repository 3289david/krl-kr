"use client";
import { useState, useEffect, useRef } from "react";

interface Node { id: string; name: string; cpu_cores: number; ram_gb: number; os?: string; available_from?: string; available_to?: string; status: string; total_hours: number; created_at: number; }
interface Job { id: string; title: string; type: string; cpu_req: number; ram_req: number; node_id?: string; node_name?: string; status: string; result?: string; result_file_id?: string; result_file_name?: string; created_at: number; updated_at: number; }

function relTime(ts: number) { const n = Number(ts); const d = Date.now()-n; if(d<60000) return "방금"; if(d<3600000) return `${Math.floor(d/60000)}분 전`; if(d<86400000) return `${Math.floor(d/3600000)}시간 전`; return new Date(n).toLocaleDateString("ko-KR"); }
const statusColor = (s: string) => ({ available: "#16a34a", busy: "#f59e0b", offline: "#6b7280", pending: "#3b82f6", running: "#f59e0b", done: "#10b981", failed: "#dc2626" }[s] ?? "#6b7280");
const statusLabel = (s: string) => ({ available: "사용 가능", busy: "사용 중", offline: "오프라인", pending: "대기중", running: "실행중", done: "완료", failed: "실패" }[s] ?? s);
const inputStyle = { width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-canvas)", color: "var(--color-ink)", boxSizing: "border-box" as const };

export default function GridDashboard() {
  const [myNodes, setMyNodes] = useState<Node[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [availNodes, setAvailNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"nodes" | "jobs" | "browse">("nodes");
  const [creatingNode, setCreatingNode] = useState(false);
  const [creatingJob, setCreatingJob] = useState(false);
  const [nodeForm, setNodeForm] = useState({ name: "", cpu_cores: "1", ram_gb: "1", os: "", available_from: "", available_to: "" });
  const [jobForm, setJobForm] = useState({ title: "", description: "", type: "compute", cpu_req: "1", ram_req: "1", node_id: "" });
  const [saving, setSaving] = useState(false);
  const [uploadingJobId, setUploadingJobId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/grid/nodes?mine=1").then(r => r.json()),
      fetch("/api/v1/grid/jobs").then(r => r.json()),
      fetch("/api/v1/grid/nodes").then(r => r.json()),
    ]).then(([n, j, a]) => {
      setMyNodes(n.nodes ?? []);
      setMyJobs(j.jobs ?? []);
      setAvailNodes(a.nodes ?? []);
      setLoading(false);
    });
  }, []);

  async function createNode(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const r = await fetch("/api/v1/grid/nodes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...nodeForm, cpu_cores: Number(nodeForm.cpu_cores), ram_gb: Number(nodeForm.ram_gb) }) });
    const d = await r.json();
    if (d.node) { setMyNodes(prev => [d.node, ...prev]); setCreatingNode(false); setNodeForm({ name: "", cpu_cores: "1", ram_gb: "1", os: "", available_from: "", available_to: "" }); }
    setSaving(false);
  }

  async function createJob(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const r = await fetch("/api/v1/grid/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...jobForm, cpu_req: Number(jobForm.cpu_req), ram_req: Number(jobForm.ram_req), node_id: jobForm.node_id || undefined }) });
    const d = await r.json();
    if (d.job) { setMyJobs(prev => [d.job, ...prev]); setCreatingJob(false); setJobForm({ title: "", description: "", type: "compute", cpu_req: "1", ram_req: "1", node_id: "" }); }
    setSaving(false);
  }

  async function updateNodeStatus(id: string, status: string) {
    await fetch(`/api/v1/grid/nodes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setMyNodes(prev => prev.map(n => n.id === id ? { ...n, status } : n));
  }

  async function delNode(id: string) {
    if (!confirm("이 컴퓨터를 삭제하시겠습니까?")) return;
    await fetch(`/api/v1/grid/nodes/${id}`, { method: "DELETE" });
    setMyNodes(prev => prev.filter(n => n.id !== id));
  }

  async function completeJob(id: string) {
    await fetch("/api/v1/grid/jobs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "done" }) });
    setMyJobs(prev => prev.map(j => j.id === id ? { ...j, status: "done" } : j));
  }

  async function uploadResult(jobId: string, file: File) {
    setUploadingJobId(jobId);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", file.name);

    const uploadR = await fetch("/api/v1/drive", { method: "POST", body: formData });
    const uploadD = await uploadR.json();
    if (!uploadD.file) { alert("업로드 실패: " + (uploadD.error ?? "알 수 없는 오류")); setUploadingJobId(null); return; }

    const fileId = uploadD.file.id;
    const fileName = uploadD.file.name;

    await fetch("/api/v1/grid/jobs", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: jobId, status: "done", result_file_id: fileId, result_file_name: fileName }),
    });
    setMyJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: "done", result_file_id: fileId, result_file_name: fileName } : j));
    setUploadingJobId(null);
  }

  const tabStyle = (active: boolean) => ({ padding: "8px 18px", border: "none", background: "transparent", cursor: "pointer", fontSize: ".875rem", fontWeight: active ? 600 : 400, color: active ? "var(--color-ink)" : "var(--color-muted)", borderBottom: active ? "2px solid var(--color-ink)" : "2px solid transparent", marginBottom: -1 });

  return (
    <div style={{ padding: "clamp(16px,4vw,32px)", maxWidth: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 2 }}>KRL Grid</h1>
          <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>남는 컴퓨터 공유 분산 연산</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setCreatingNode(true)} style={{ padding: "8px 16px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: ".875rem" }}>내 컴퓨터 등록</button>
          <button onClick={() => setCreatingJob(true)} style={{ padding: "8px 18px", background: "var(--color-ink)", color: "var(--color-canvas)", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: ".875rem" }}>작업 제출</button>
        </div>
      </div>

      <input ref={fileRef} type="file" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f && uploadingJobId) uploadResult(uploadingJobId, f); e.target.value = ""; }} />

      {creatingNode && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }} onClick={e => e.target === e.currentTarget && setCreatingNode(false)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: 500, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h2 style={{ fontWeight: 700, marginBottom: 18 }}>컴퓨터 등록</h2>
            <form onSubmit={createNode} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>이름 *</label><input value={nodeForm.name} onChange={e => setNodeForm(p => ({ ...p, name: e.target.value }))} required placeholder="내 데스크톱" style={inputStyle} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>CPU 코어 *</label><input type="number" min="1" value={nodeForm.cpu_cores} onChange={e => setNodeForm(p => ({ ...p, cpu_cores: e.target.value }))} required style={inputStyle} /></div>
                <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>RAM (GB) *</label><input type="number" min="0.5" step="0.5" value={nodeForm.ram_gb} onChange={e => setNodeForm(p => ({ ...p, ram_gb: e.target.value }))} required style={inputStyle} /></div>
              </div>
              <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>OS</label><input value={nodeForm.os} onChange={e => setNodeForm(p => ({ ...p, os: e.target.value }))} placeholder="Ubuntu 24.04, Windows 11 등" style={inputStyle} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>가용 시작</label><input type="time" value={nodeForm.available_from} onChange={e => setNodeForm(p => ({ ...p, available_from: e.target.value }))} style={inputStyle} /></div>
                <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>가용 종료</label><input type="time" value={nodeForm.available_to} onChange={e => setNodeForm(p => ({ ...p, available_to: e.target.value }))} style={inputStyle} /></div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setCreatingNode(false)} style={{ padding: "8px 16px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: "transparent", cursor: "pointer" }}>취소</button>
                <button type="submit" disabled={saving} style={{ padding: "8px 20px", background: "var(--color-ink)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "등록 중..." : "등록"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {creatingJob && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }} onClick={e => e.target === e.currentTarget && setCreatingJob(false)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: 500, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h2 style={{ fontWeight: 700, marginBottom: 18 }}>작업 제출</h2>
            <form onSubmit={createJob} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>제목 *</label><input value={jobForm.title} onChange={e => setJobForm(p => ({ ...p, title: e.target.value }))} required placeholder="영상 인코딩 작업" style={inputStyle} /></div>
              <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>설명</label><textarea value={jobForm.description} onChange={e => setJobForm(p => ({ ...p, description: e.target.value }))} rows={2} style={{ ...inputStyle, resize: "vertical" }} /></div>
              <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>유형</label>
                <select value={jobForm.type} onChange={e => setJobForm(p => ({ ...p, type: e.target.value }))} style={inputStyle}>
                  <option value="compute">일반 연산</option>
                  <option value="render">렌더링</option>
                  <option value="ml">머신러닝</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>최소 CPU 코어</label><input type="number" min="1" value={jobForm.cpu_req} onChange={e => setJobForm(p => ({ ...p, cpu_req: e.target.value }))} style={inputStyle} /></div>
                <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>최소 RAM (GB)</label><input type="number" min="0.5" step="0.5" value={jobForm.ram_req} onChange={e => setJobForm(p => ({ ...p, ram_req: e.target.value }))} style={inputStyle} /></div>
              </div>
              <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>특정 노드 (선택)</label>
                <select value={jobForm.node_id} onChange={e => setJobForm(p => ({ ...p, node_id: e.target.value }))} style={inputStyle}>
                  <option value="">자동 매칭</option>
                  {availNodes.map(n => <option key={n.id} value={n.id}>{n.name} (CPU {n.cpu_cores}코어 / RAM {n.ram_gb}GB)</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setCreatingJob(false)} style={{ padding: "8px 16px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: "transparent", cursor: "pointer" }}>취소</button>
                <button type="submit" disabled={saving} style={{ padding: "8px 20px", background: "var(--color-ink)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "제출 중..." : "제출"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid var(--color-hairline)" }}>
        {(["nodes", "jobs", "browse"] as const).map((v, i) => (
          <button key={v} onClick={() => setTab(v)} style={tabStyle(tab === v)}>{["내 컴퓨터", "내 작업", "전체 노드"][i]}</button>
        ))}
      </div>

      {tab === "nodes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {loading ? <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>불러오는 중...</p> : myNodes.length === 0 ? (
            <div style={{ textAlign: "center", padding: 48, border: "2px dashed var(--color-hairline)", borderRadius: 12 }}><p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>등록된 컴퓨터가 없습니다</p></div>
          ) : myNodes.map(n => (
            <div key={n.id} style={{ background: "#fff", border: "1px solid var(--color-hairline)", borderRadius: 12, padding: "14px 16px", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: `${statusColor(n.status)}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={statusColor(n.status)} strokeWidth={1.5}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: ".9375rem" }}>{n.name}</div>
                <div style={{ fontSize: ".8125rem", color: "var(--color-muted)" }}>CPU {Number(n.cpu_cores)}코어 / RAM {Number(n.ram_gb)}GB{n.os ? ` / ${n.os}` : ""}</div>
                {(n.available_from || n.available_to) && <div style={{ fontSize: ".8125rem", color: "var(--color-muted)" }}>가용시간: {n.available_from ?? "?"}–{n.available_to ?? "?"}</div>}
                <div style={{ fontSize: ".75rem", color: "var(--color-muted)", marginTop: 2 }}>{relTime(Number(n.created_at))} · 총 {Number(n.total_hours)}시간 제공</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: ".75rem", padding: "3px 10px", borderRadius: 99, background: `${statusColor(n.status)}15`, color: statusColor(n.status), fontWeight: 600 }}>{statusLabel(n.status)}</span>
                {n.status !== "offline" && <button onClick={() => updateNodeStatus(n.id, "offline")} style={{ padding: "4px 10px", border: "1px solid var(--color-hairline)", borderRadius: 6, background: "transparent", cursor: "pointer", fontSize: ".75rem" }}>오프라인</button>}
                {n.status === "offline" && <button onClick={() => updateNodeStatus(n.id, "available")} style={{ padding: "4px 10px", border: "1px solid #d1fae5", borderRadius: 6, background: "transparent", cursor: "pointer", fontSize: ".75rem", color: "#16a34a" }}>활성화</button>}
                <button onClick={() => delNode(n.id)} style={{ padding: "4px 8px", border: "1px solid #fecdd3", borderRadius: 6, background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: ".75rem" }}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "jobs" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {myJobs.length === 0 ? <p style={{ color: "var(--color-muted)", fontSize: ".875rem", textAlign: "center", padding: 40 }}>제출한 작업이 없습니다.</p> : myJobs.map(j => (
            <div key={j.id} style={{ background: "#fff", border: "1px solid var(--color-hairline)", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{j.title}</div>
                  <div style={{ fontSize: ".8125rem", color: "var(--color-muted)" }}>{j.type} · CPU {Number(j.cpu_req)}코어 · RAM {Number(j.ram_req)}GB{j.node_name ? ` · ${j.node_name}` : ""}</div>
                  <div style={{ fontSize: ".75rem", color: "var(--color-muted)", marginTop: 2 }}>{relTime(Number(j.created_at))}</div>
                </div>
                <span style={{ fontSize: ".75rem", padding: "3px 10px", borderRadius: 99, background: `${statusColor(j.status)}15`, color: statusColor(j.status), fontWeight: 600, flexShrink: 0 }}>{statusLabel(j.status)}</span>
                {j.status === "running" && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => completeJob(j.id)} style={{ padding: "4px 10px", border: "none", borderRadius: 6, background: "#10b981", color: "#fff", cursor: "pointer", fontSize: ".75rem", fontWeight: 600 }}>완료</button>
                    <button
                      onClick={() => { setUploadingJobId(j.id); fileRef.current?.click(); }}
                      disabled={uploadingJobId === j.id}
                      style={{ padding: "4px 10px", border: "1px solid var(--color-hairline)", borderRadius: 6, background: "transparent", cursor: "pointer", fontSize: ".75rem" }}
                    >
                      {uploadingJobId === j.id ? "업로드 중..." : "결과 파일 업로드"}
                    </button>
                  </div>
                )}
              </div>
              {j.result_file_id && (
                <div style={{ marginTop: 10, padding: "8px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span style={{ fontSize: ".8125rem", color: "#166534", flex: 1 }}>{j.result_file_name}</span>
                  <a href={`/api/v1/drive/${j.result_file_id}/download`} download style={{ fontSize: ".75rem", color: "#16a34a", textDecoration: "none", fontWeight: 600 }}>다운로드</a>
                </div>
              )}
              {j.result && !j.result_file_id && (
                <div style={{ marginTop: 10, padding: "8px 12px", background: "var(--color-canvas)", borderRadius: 8, fontSize: ".8125rem", color: "var(--color-muted)", fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{j.result}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "browse" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {availNodes.length === 0 ? <p style={{ color: "var(--color-muted)", fontSize: ".875rem", gridColumn: "1/-1", textAlign: "center", padding: 40 }}>사용 가능한 컴퓨터가 없습니다.</p> : availNodes.map(n => (
            <div key={n.id} style={{ background: "#fff", border: "1px solid var(--color-hairline)", borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor(n.status) }} />
                <span style={{ fontWeight: 600 }}>{n.name}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: ".8125rem" }}>
                <div style={{ background: "var(--color-canvas)", borderRadius: 6, padding: "6px 10px", textAlign: "center" }}><div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{Number(n.cpu_cores)}</div><div style={{ color: "var(--color-muted)" }}>코어</div></div>
                <div style={{ background: "var(--color-canvas)", borderRadius: 6, padding: "6px 10px", textAlign: "center" }}><div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{Number(n.ram_gb)}</div><div style={{ color: "var(--color-muted)" }}>GB RAM</div></div>
              </div>
              {n.os && <p style={{ fontSize: ".75rem", color: "var(--color-muted)", marginTop: 8 }}>{n.os}</p>}
              {(n.available_from || n.available_to) && <p style={{ fontSize: ".75rem", color: "var(--color-muted)" }}>{n.available_from}–{n.available_to}</p>}
              <button onClick={() => { setCreatingJob(true); setJobForm(p => ({ ...p, node_id: n.id })); setTab("jobs"); }} style={{ marginTop: 10, width: "100%", padding: "6px", border: "1px solid var(--color-hairline)", borderRadius: 6, background: "transparent", cursor: "pointer", fontSize: ".8125rem" }}>이 노드에 작업 제출</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
