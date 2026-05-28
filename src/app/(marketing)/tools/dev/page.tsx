"use client";
import { useState, useCallback } from "react";

const TABS = [
  { id: "ip",        label: "IP 조회" },
  { id: "uuid",      label: "UUID" },
  { id: "hash",      label: "Hash" },
  { id: "base64",    label: "Base64" },
  { id: "url",       label: "URL 인코딩" },
  { id: "json",      label: "JSON" },
  { id: "timestamp", label: "Timestamp" },
  { id: "color",     label: "색상 변환" },
  { id: "regex",     label: "정규식" },
  { id: "text",      label: "텍스트 도구" },
  { id: "dns",       label: "DNS 조회" },
  { id: "jwt",       label: "JWT 디코드" },
];

// ─── Shared Copy Button ───────────────────────────────────────────────────────
function CopyBtn({ text, style }: { text: string; style?: React.CSSProperties }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button onClick={copy} style={{
      background: "none", border: "1px solid var(--color-hairline-strong)",
      borderRadius: "6px", padding: "4px 10px", cursor: "pointer",
      fontSize: "0.75rem", fontFamily: "var(--font-sans)",
      color: copied ? "#16a34a" : "var(--color-muted)",
      flexShrink: 0, transition: "color 0.15s", ...style,
    }}>
      {copied ? "✓ 복사됨" : "복사"}
    </button>
  );
}

// ─── Success/Error icons ──────────────────────────────────────────────────────
function OkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function WarnIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

// ─── IP Lookup ────────────────────────────────────────────────────────────────
function IpTool() {
  const [data, setData] = useState<Record<string, string | number | null> | null>(null);
  const [loading, setLoading] = useState(false);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState("");

  async function lookup(ip?: string) {
    setLoading(true); setError("");
    try {
      const url = ip ? `/api/v1/tools/ip?ip=${encodeURIComponent(ip)}` : "/api/v1/tools/ip";
      const res = await fetch(url);
      const json = await res.json() as Record<string, string | number | null>;
      if (!res.ok) { setError(json.error as string ?? "조회 실패"); setData(null); }
      else setData(json);
    } catch { setError("네트워크 오류"); setData(null); }
    finally { setLoading(false); }
  }

  const FIELD_LABELS: Record<string, string> = {
    ip: "IP 주소", country: "국가", country_code: "국가 코드", city: "도시",
    region: "지역", region_code: "지역 코드", zip: "우편번호",
    lat: "위도", lon: "경도", timezone: "시간대", isp: "ISP", org: "조직", as: "AS 번호",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>IP 주소와 지역 정보를 확인합니다. 다른 IP 주소도 조회할 수 있습니다.</p>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button className="btn btn-primary btn-sm" onClick={() => lookup()} disabled={loading}>
          {loading ? "조회 중…" : "내 IP 조회"}
        </button>
        <div style={{ display: "flex", gap: "6px", flex: 1, minWidth: "200px" }}>
          <input className="input" style={{ flex: 1, minWidth: 0 }} placeholder="IP 입력 (예: 8.8.8.8)" value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === "Enter" && lookup(custom)} />
          <button className="btn btn-secondary btn-sm" onClick={() => lookup(custom)} disabled={!custom || loading}>조회</button>
        </div>
      </div>
      {error && <p style={{ fontSize: "0.875rem", color: "var(--color-danger)" }}>{error}</p>}
      {data && (
        <div style={{ background: "var(--color-surface-card)", borderRadius: "10px", padding: "16px", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>
          {Object.entries(data)
            .filter(([k]) => k !== "timestamp" && k !== "error")
            .map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "6px 0", borderBottom: "1px solid var(--color-hairline)", alignItems: "center" }}>
                <span style={{ color: "var(--color-muted)", flexShrink: 0 }}>{FIELD_LABELS[k] ?? k}</span>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", minWidth: 0 }}>
                  <span style={{ color: "var(--color-ink)", fontWeight: 600, wordBreak: "break-all" }}>{v !== null && v !== undefined ? String(v) : "—"}</span>
                  {v && <CopyBtn text={String(v)} />}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── UUID Generator ───────────────────────────────────────────────────────────
function UuidTool() {
  const [uuids, setUuids] = useState<string[]>([]);
  const [count, setCount] = useState(5);
  const [version, setVersion] = useState<"v4" | "v7">("v4");

  function generate() {
    const generated = Array.from({ length: count }, () => {
      if (version === "v7") {
        // UUID v7: time-ordered (first 48 bits = ms timestamp)
        const now = Date.now(); // milliseconds, 48-bit safe integer
        const rand = crypto.getRandomValues(new Uint8Array(10));
        // Split 48-bit timestamp: hi = upper 36 bits, mid = lower 12 bits
        const hi = Math.floor(now / 4096) >>> 0; // ts >> 12, lower 32 bits
        const mid = now & 0xfff;
        const b = new Uint8Array(16);
        b[0] = (hi >> 24) & 0xff; b[1] = (hi >> 16) & 0xff; b[2] = (hi >> 8) & 0xff; b[3] = hi & 0xff;
        b[4] = (mid >> 8) & 0xff; b[5] = mid & 0xff;
        b[6] = (0x70 | (rand[0] & 0x0f));
        b[7] = rand[1]; b[8] = (0x80 | (rand[2] & 0x3f)); b[9] = rand[3];
        for (let i = 0; i < 6; i++) b[10 + i] = rand[4 + i];
        return [...b].map((x, i) => ([3, 5, 7, 9].includes(i) ? "-" : "") + x.toString(16).padStart(2, "0")).join("");
      }
      return crypto.randomUUID();
    });
    setUuids(generated);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>랜덤 UUID를 생성합니다. v4(랜덤) 또는 v7(시간순) 방식을 선택하세요.</p>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "4px" }}>
          {(["v4", "v7"] as const).map((v) => (
            <button key={v} onClick={() => setVersion(v)} style={{
              padding: "6px 14px", borderRadius: "8px", border: "1px solid var(--color-hairline-strong)",
              background: version === v ? "var(--color-ink)" : "var(--color-lifted)",
              color: version === v ? "var(--color-canvas)" : "var(--color-body)",
              cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, fontFamily: "var(--font-sans)",
            }}>{v.toUpperCase()}</button>
          ))}
        </div>
        <label style={{ fontSize: "0.875rem", color: "var(--color-ink)" }}>개수:</label>
        <input type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} className="input" style={{ width: "72px" }} />
        <button className="btn btn-primary btn-sm" onClick={generate}>생성</button>
        {uuids.length > 0 && <CopyBtn text={uuids.join("\n")} style={{ padding: "7px 14px" }} />}
      </div>
      {uuids.length > 0 && (
        <div style={{ background: "var(--color-surface-card)", borderRadius: "10px", padding: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {uuids.map((u) => (
            <div key={u} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", padding: "6px 8px", borderRadius: "6px" }}>
              <span style={{ color: "var(--color-ink)", fontFamily: "var(--font-mono)", fontSize: "0.875rem", wordBreak: "break-all" }}>{u}</span>
              <CopyBtn text={u} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Hash ─────────────────────────────────────────────────────────────────────
function HashTool() {
  const [input, setInput] = useState("");
  const [algo, setAlgo] = useState("SHA-256");
  const [results, setResults] = useState<Record<string, string>>({});
  const [allMode, setAllMode] = useState(false);

  async function computeHash(selectedAlgo?: string) {
    if (!input) return;
    const enc = new TextEncoder();
    const algos = allMode ? ["SHA-1", "SHA-256", "SHA-384", "SHA-512"] : [selectedAlgo ?? algo];
    const newResults: Record<string, string> = {};
    for (const a of algos) {
      const buf = await crypto.subtle.digest(a, enc.encode(input));
      newResults[a] = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    setResults(newResults);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>텍스트의 해시값을 계산합니다. 브라우저 내에서 직접 처리됩니다.</p>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        {["SHA-1", "SHA-256", "SHA-384", "SHA-512"].map((a) => (
          <button key={a} onClick={() => { setAlgo(a); setAllMode(false); }} style={{
            padding: "5px 12px", borderRadius: "6px", border: "1px solid var(--color-hairline-strong)",
            background: algo === a && !allMode ? "var(--color-ink)" : "var(--color-lifted)",
            color: algo === a && !allMode ? "var(--color-canvas)" : "var(--color-body)",
            cursor: "pointer", fontSize: "0.8125rem", fontWeight: 500, fontFamily: "var(--font-sans)",
          }}>{a}</button>
        ))}
        <button onClick={() => setAllMode(true)} style={{
          padding: "5px 12px", borderRadius: "6px", border: "1px solid var(--color-hairline-strong)",
          background: allMode ? "var(--color-ink)" : "var(--color-lifted)",
          color: allMode ? "var(--color-canvas)" : "var(--color-body)",
          cursor: "pointer", fontSize: "0.8125rem", fontWeight: 500, fontFamily: "var(--font-sans)",
        }}>전체</button>
      </div>
      <textarea className="input" rows={3} placeholder="해시할 텍스트를 입력하세요…" value={input} onChange={(e) => setInput(e.target.value)} style={{ resize: "vertical", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }} />
      <button className="btn btn-primary btn-sm" onClick={() => computeHash()} disabled={!input} style={{ alignSelf: "flex-start" }}>계산</button>
      {Object.entries(results).map(([a, hash]) => (
        <div key={a}>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{a}</p>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--color-surface-card)", borderRadius: "8px", padding: "10px 12px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--color-ink)", wordBreak: "break-all", flex: 1 }}>{hash}</span>
            <CopyBtn text={hash} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Base64 ───────────────────────────────────────────────────────────────────
function Base64Tool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [urlSafe, setUrlSafe] = useState(false);
  const [error, setError] = useState("");

  function process() {
    setError(""); setOutput("");
    try {
      if (mode === "encode") {
        let result = btoa(unescape(encodeURIComponent(input)));
        if (urlSafe) result = result.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        setOutput(result);
      } else {
        let sanitized = input.trim();
        if (urlSafe) sanitized = sanitized.replace(/-/g, "+").replace(/_/g, "/");
        setOutput(decodeURIComponent(escape(atob(sanitized))));
      }
    } catch {
      setError("잘못된 입력입니다.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>텍스트를 Base64로 인코딩하거나 디코딩합니다.</p>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        {(["encode", "decode"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: "7px 16px", borderRadius: "8px", border: "1px solid var(--color-hairline-strong)",
            background: mode === m ? "var(--color-ink)" : "var(--color-lifted)",
            color: mode === m ? "var(--color-canvas)" : "var(--color-body)",
            cursor: "pointer", fontSize: "0.875rem", fontWeight: 500, fontFamily: "var(--font-sans)",
          }}>{m === "encode" ? "인코딩" : "디코딩"}</button>
        ))}
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.875rem", color: "var(--color-body)", cursor: "pointer" }}>
          <input type="checkbox" checked={urlSafe} onChange={(e) => setUrlSafe(e.target.checked)} />
          URL-safe
        </label>
      </div>
      <textarea className="input" rows={4} placeholder={mode === "encode" ? "인코딩할 텍스트…" : "Base64 문자열…"} value={input} onChange={(e) => setInput(e.target.value)} style={{ resize: "vertical" }} />
      <button className="btn btn-primary btn-sm" onClick={process} disabled={!input} style={{ alignSelf: "flex-start" }}>
        {mode === "encode" ? "인코딩" : "디코딩"}
      </button>
      {error && <p style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>{error}</p>}
      {output && (
        <div style={{ position: "relative" }}>
          <textarea readOnly value={output} rows={4} className="input" style={{ resize: "vertical", background: "var(--color-surface-card)", fontFamily: "var(--font-mono)", fontSize: "0.875rem", paddingRight: "80px" }} />
          <div style={{ position: "absolute", top: "10px", right: "10px" }}><CopyBtn text={output} /></div>
        </div>
      )}
    </div>
  );
}

// ─── URL Encoding ─────────────────────────────────────────────────────────────
function UrlTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<"encode" | "decode" | "parse">("encode");
  const [error, setError] = useState("");
  const [parsedUrl, setParsedUrl] = useState<Record<string, string> | null>(null);

  function process() {
    setError(""); setOutput(""); setParsedUrl(null);
    try {
      if (mode === "encode") {
        setOutput(encodeURIComponent(input));
      } else if (mode === "decode") {
        setOutput(decodeURIComponent(input));
      } else {
        // Parse URL
        const u = new URL(input.startsWith("http") ? input : "https://" + input);
        const params: Record<string, string> = {};
        u.searchParams.forEach((v, k) => { params[k] = v; });
        setParsedUrl({
          "프로토콜": u.protocol,
          "호스트": u.hostname,
          "포트": u.port || "(기본값)",
          "경로": u.pathname,
          "쿼리": u.search || "(없음)",
          "해시": u.hash || "(없음)",
          ...Object.fromEntries(Object.entries(params).map(([k, v]) => [`파라미터 ${k}`, v])),
        });
      }
    } catch {
      setError("잘못된 입력입니다.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>URL 인코딩/디코딩, URL 파싱 도구입니다.</p>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {([["encode", "인코딩"], ["decode", "디코딩"], ["parse", "URL 분석"]] as const).map(([m, label]) => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: "7px 14px", borderRadius: "8px", border: "1px solid var(--color-hairline-strong)",
            background: mode === m ? "var(--color-ink)" : "var(--color-lifted)",
            color: mode === m ? "var(--color-canvas)" : "var(--color-body)",
            cursor: "pointer", fontSize: "0.875rem", fontWeight: 500, fontFamily: "var(--font-sans)",
          }}>{label}</button>
        ))}
      </div>
      <textarea className="input" rows={3} placeholder={mode === "parse" ? "https://example.com/path?key=value" : mode === "encode" ? "인코딩할 텍스트…" : "디코딩할 URL 인코딩 문자열…"} value={input} onChange={(e) => setInput(e.target.value)} style={{ resize: "vertical", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }} />
      <button className="btn btn-primary btn-sm" onClick={process} disabled={!input} style={{ alignSelf: "flex-start" }}>실행</button>
      {error && <p style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>{error}</p>}
      {output && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--color-surface-card)", borderRadius: "8px", padding: "12px 14px" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--color-ink)", wordBreak: "break-all", flex: 1 }}>{output}</span>
          <CopyBtn text={output} />
        </div>
      )}
      {parsedUrl && (
        <div style={{ background: "var(--color-surface-card)", borderRadius: "10px", padding: "16px", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>
          {Object.entries(parsedUrl).map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: "12px", padding: "5px 0", borderBottom: "1px solid var(--color-hairline)" }}>
              <span style={{ color: "var(--color-muted)", minWidth: "100px", flexShrink: 0 }}>{k}</span>
              <span style={{ color: "var(--color-ink)", fontWeight: 600, wordBreak: "break-all" }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── JSON Formatter ───────────────────────────────────────────────────────────
function JsonTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [indent, setIndent] = useState(2);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<{ keys: number; depth: number } | null>(null);

  function countKeys(obj: unknown, depth = 0): { keys: number; depth: number } {
    if (typeof obj !== "object" || obj === null) return { keys: 0, depth };
    let total = 0, maxDepth = depth;
    for (const v of Object.values(obj as Record<string, unknown>)) {
      total++;
      const sub = countKeys(v, depth + 1);
      total += sub.keys;
      if (sub.depth > maxDepth) maxDepth = sub.depth;
    }
    return { keys: total, depth: maxDepth };
  }

  function format() {
    setError(""); setOutput(""); setStats(null);
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, indent));
      setStats(countKeys(parsed));
    } catch (e) {
      setError(e instanceof Error ? e.message : "잘못된 JSON");
    }
  }

  function minify() {
    setError(""); setOutput(""); setStats(null);
    try {
      setOutput(JSON.stringify(JSON.parse(input)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "잘못된 JSON");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>JSON을 포맷하고 검증합니다.</p>
      <textarea className="input" rows={6} placeholder='{"key": "value", "array": [1, 2, 3]}' value={input} onChange={(e) => setInput(e.target.value)} style={{ resize: "vertical", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }} />
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn btn-primary btn-sm" onClick={format} disabled={!input}>포맷</button>
        <button className="btn btn-secondary btn-sm" onClick={minify} disabled={!input}>최소화</button>
        <label style={{ fontSize: "0.875rem", color: "var(--color-body)", display: "flex", alignItems: "center", gap: "6px" }}>
          들여쓰기:
          <select value={indent} onChange={(e) => setIndent(Number(e.target.value))} className="input" style={{ width: "72px" }}>
            {[2, 4].map((n) => <option key={n} value={n}>{n}칸</option>)}
          </select>
        </label>
      </div>
      {error && (
        <div style={{ display: "flex", gap: "8px", alignItems: "center", padding: "10px 12px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "8px", color: "#9B1C1C", fontSize: "0.875rem" }}>
          <WarnIcon /> {error}
        </div>
      )}
      {stats && (
        <div style={{ display: "flex", gap: "12px", fontSize: "0.8125rem", color: "var(--color-muted)" }}>
          <span style={{ color: "#16a34a", display: "flex", alignItems: "center", gap: "4px" }}><OkIcon /> 유효한 JSON</span>
          <span>키 {stats.keys}개</span>
          <span>깊이 {stats.depth}단계</span>
        </div>
      )}
      {output && (
        <div style={{ position: "relative" }}>
          <textarea readOnly value={output} rows={8} className="input" style={{ resize: "vertical", background: "var(--color-surface-card)", fontFamily: "var(--font-mono)", fontSize: "0.875rem", paddingRight: "80px" }} />
          <div style={{ position: "absolute", top: "10px", right: "10px" }}><CopyBtn text={output} /></div>
        </div>
      )}
    </div>
  );
}

// ─── Timestamp Converter ──────────────────────────────────────────────────────
function TimestampTool() {
  const [ts, setTs] = useState("");
  const [result, setResult] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState("");

  function convert() {
    setError(""); setResult(null);
    try {
      const input = ts.trim();
      let date: Date;
      if (/^\d{10}$/.test(input)) {
        date = new Date(Number(input) * 1000); // Unix seconds
      } else if (/^\d{13}$/.test(input)) {
        date = new Date(Number(input)); // Unix milliseconds
      } else {
        date = new Date(input);
      }
      if (isNaN(date.getTime())) throw new Error("잘못된 날짜 형식");
      const kstOffset = 9 * 60;
      const kstDate = new Date(date.getTime() + kstOffset * 60000);
      setResult({
        "UTC": date.toUTCString(),
        "KST (한국)": kstDate.toISOString().replace("T", " ").replace("Z", ""),
        "로컬": date.toLocaleString("ko-KR"),
        "Unix (초)": Math.floor(date.getTime() / 1000).toString(),
        "Unix (밀리초)": date.getTime().toString(),
        "ISO 8601": date.toISOString(),
        "날짜": date.toLocaleDateString("ko-KR"),
        "시간": date.toLocaleTimeString("ko-KR"),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "변환 실패");
    }
  }

  function now() {
    const n = Date.now();
    setTs(Math.floor(n / 1000).toString());
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>Unix timestamp와 날짜/시간을 변환합니다. 초(10자리), 밀리초(13자리) 또는 날짜 문자열을 입력하세요.</p>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <input className="input" style={{ flex: 1, minWidth: "200px" }} placeholder="1748304000 또는 2026-05-27T00:00:00Z" value={ts} onChange={(e) => setTs(e.target.value)} onKeyDown={(e) => e.key === "Enter" && convert()} />
        <button className="btn btn-primary btn-sm" onClick={convert} disabled={!ts}>변환</button>
        <button className="btn btn-secondary btn-sm" onClick={now}>지금</button>
      </div>
      {error && <p style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>{error}</p>}
      {result && (
        <div style={{ background: "var(--color-surface-card)", borderRadius: "10px", padding: "16px", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>
          {Object.entries(result).map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "6px 0", borderBottom: "1px solid var(--color-hairline)" }}>
              <span style={{ color: "var(--color-muted)", minWidth: "110px", flexShrink: 0, fontFamily: "var(--font-sans)", fontSize: "0.8125rem" }}>{k}</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                <span style={{ color: "var(--color-ink)", fontWeight: 600, wordBreak: "break-all" }}>{v}</span>
                <CopyBtn text={v} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Color Converter ──────────────────────────────────────────────────────────
function ColorTool() {
  const [hex, setHex] = useState("#141413");
  const [rgb, setRgb] = useState({ r: 20, g: 20, b: 19 });
  const [hsl, setHsl] = useState({ h: 60, s: 3, l: 8 });

  function hexToRgb(h: string): { r: number; g: number; b: number } | null {
    const m = h.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!m) return null;
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
  }

  function rgbToHsl(r: number, g: number, b: number) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function updateFromHex(h: string) {
    setHex(h);
    const r = hexToRgb(h);
    if (r) { setRgb(r); setHsl(rgbToHsl(r.r, r.g, r.b)); }
  }

  function updateFromRgb(r: number, g: number, b: number) {
    setRgb({ r, g, b });
    const h = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    setHex(h);
    setHsl(rgbToHsl(r, g, b));
  }

  const cssHsl = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  const cssRgb = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>HEX, RGB, HSL 색상 형식을 변환합니다.</p>
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "12px", background: hex, border: "1px solid var(--color-hairline-strong)", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginBottom: "4px", display: "block" }}>HEX</label>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input type="color" value={hex} onChange={(e) => updateFromHex(e.target.value)} style={{ width: "40px", height: "36px", padding: "2px", border: "1px solid var(--color-hairline-strong)", borderRadius: "6px", cursor: "pointer", background: "var(--color-lifted)" }} />
            <input className="input" value={hex} onChange={(e) => updateFromHex(e.target.value)} style={{ fontFamily: "var(--font-mono)", width: "120px" }} />
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
        {([["R", rgb.r, (v: number) => updateFromRgb(v, rgb.g, rgb.b)], ["G", rgb.g, (v: number) => updateFromRgb(rgb.r, v, rgb.b)], ["B", rgb.b, (v: number) => updateFromRgb(rgb.r, rgb.g, v)]] as const).map(([label, val, setter]) => (
          <div key={label}>
            <label style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginBottom: "4px", display: "block" }}>{label}</label>
            <input type="number" min={0} max={255} value={val} onChange={(e) => setter(Number(e.target.value))} className="input" style={{ fontFamily: "var(--font-mono)" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "var(--color-surface-card)", borderRadius: "10px", padding: "14px" }}>
        {[["HEX", hex], ["RGB", cssRgb], ["HSL", cssHsl]].map(([label, val]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 700, fontSize: "0.75rem", color: "var(--color-muted)", width: "40px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--color-ink)", flex: 1 }}>{val}</span>
            <CopyBtn text={val} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Regex Tester ─────────────────────────────────────────────────────────────
function RegexTool() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("g");
  const [text, setText] = useState("");
  const [matches, setMatches] = useState<{ match: string; index: number; groups: string[] }[] | null>(null);
  const [error, setError] = useState("");

  function test() {
    setError(""); setMatches(null);
    if (!pattern) return;
    try {
      const re = new RegExp(pattern, flags);
      const results: { match: string; index: number; groups: string[] }[] = [];
      let m;
      if (flags.includes("g")) {
        while ((m = re.exec(text)) !== null) {
          results.push({ match: m[0], index: m.index, groups: [...(m.slice(1) ?? [])] });
          if (m[0].length === 0) re.lastIndex++;
          if (results.length > 100) break;
        }
      } else {
        m = re.exec(text);
        if (m) results.push({ match: m[0], index: m.index, groups: [...(m.slice(1) ?? [])] });
      }
      setMatches(results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "잘못된 정규식");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>정규식을 테스트합니다. 매치된 결과를 실시간으로 확인하세요.</p>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-muted)", fontSize: "1.1rem" }}>/</span>
        <input className="input" style={{ flex: 1, fontFamily: "var(--font-mono)" }} placeholder="정규식 패턴…" value={pattern} onChange={(e) => setPattern(e.target.value)} />
        <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-muted)", fontSize: "1.1rem" }}>/</span>
        <input className="input" style={{ width: "60px", fontFamily: "var(--font-mono)" }} placeholder="flags" value={flags} onChange={(e) => setFlags(e.target.value)} />
      </div>
      <textarea className="input" rows={5} placeholder="테스트할 텍스트를 입력하세요…" value={text} onChange={(e) => setText(e.target.value)} style={{ resize: "vertical" }} />
      <button className="btn btn-primary btn-sm" onClick={test} disabled={!pattern} style={{ alignSelf: "flex-start" }}>테스트</button>
      {error && <p style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>{error}</p>}
      {matches !== null && (
        <div>
          <p style={{ fontSize: "0.875rem", color: matches.length > 0 ? "#16a34a" : "var(--color-muted)", marginBottom: "8px", fontWeight: 600 }}>
            {matches.length > 0 ? `${matches.length}개 일치` : "일치 없음"}
          </p>
          {matches.map((m, i) => (
            <div key={i} style={{ background: "var(--color-surface-card)", borderRadius: "8px", padding: "8px 12px", marginBottom: "6px", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>
              <span style={{ color: "var(--color-muted)", marginRight: "8px" }}>#{i + 1} @{m.index}</span>
              <span style={{ background: "#fef08a", color: "#713f12", padding: "1px 4px", borderRadius: "4px" }}>{m.match}</span>
              {m.groups.length > 0 && <span style={{ color: "var(--color-muted)", marginLeft: "8px" }}>그룹: [{m.groups.join(", ")}]</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Text Tools ───────────────────────────────────────────────────────────────
function TextTool() {
  const [text, setText] = useState("");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);

  const lines = text ? text.split("\n").length : 0;
  const words = text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const chars = text.length;
  const bytes = new TextEncoder().encode(text).length;

  function transform(type: string) {
    let result = text;
    switch (type) {
      case "upper": result = text.toUpperCase(); break;
      case "lower": result = text.toLowerCase(); break;
      case "title": result = text.replace(/\b\w/g, (c) => c.toUpperCase()); break;
      case "reverse": result = text.split("").reverse().join(""); break;
      case "trim": result = text.split("\n").map((l) => l.trim()).join("\n"); break;
      case "sort": result = text.split("\n").sort().join("\n"); break;
      case "dedup": result = [...new Set(text.split("\n"))].join("\n"); break;
      case "slug": result = text.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, ""); break;
    }
    setOutput(result);
    setCopied(false);
  }

  async function copy() {
    await navigator.clipboard.writeText(output || text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>텍스트 변환, 통계, 정렬 등 다양한 텍스트 도구입니다.</p>
      <textarea className="input" rows={6} placeholder="텍스트를 입력하세요…" value={text} onChange={(e) => setText(e.target.value)} style={{ resize: "vertical" }} />
      {text && (
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "0.8125rem", color: "var(--color-muted)", background: "var(--color-surface-card)", borderRadius: "8px", padding: "10px 14px" }}>
          <span><strong style={{ color: "var(--color-ink)" }}>{chars}</strong> 자</span>
          <span><strong style={{ color: "var(--color-ink)" }}>{bytes}</strong> 바이트</span>
          <span><strong style={{ color: "var(--color-ink)" }}>{words}</strong> 단어</span>
          <span><strong style={{ color: "var(--color-ink)" }}>{lines}</strong> 줄</span>
        </div>
      )}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {[
          ["upper", "대문자"], ["lower", "소문자"], ["title", "타이틀"], ["reverse", "뒤집기"],
          ["trim", "공백제거"], ["sort", "정렬"], ["dedup", "중복제거"], ["slug", "슬러그"],
        ].map(([type, label]) => (
          <button key={type} className="btn btn-secondary btn-sm" onClick={() => transform(type)} disabled={!text}>
            {label}
          </button>
        ))}
      </div>
      {output && (
        <div style={{ position: "relative" }}>
          <textarea readOnly value={output} rows={4} className="input" style={{ resize: "vertical", background: "var(--color-surface-card)", fontFamily: "var(--font-mono)", fontSize: "0.875rem", paddingRight: "80px" }} />
          <button onClick={copy} style={{ position: "absolute", top: "10px", right: "10px", background: copied ? "var(--color-ink)" : "var(--color-lifted)", border: "1px solid var(--color-hairline-strong)", borderRadius: "6px", padding: "4px 10px", cursor: "pointer", fontSize: "0.75rem", color: copied ? "var(--color-canvas)" : "var(--color-muted)", fontFamily: "var(--font-sans)" }}>
            {copied ? "✓복사됨" : "복사"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── DNS Lookup ───────────────────────────────────────────────────────────────
function DnsTool() {
  const [domain, setDomain] = useState("");
  const [type, setType] = useState("A");
  const [result, setResult] = useState<{ Status?: number; Answer?: Array<{ name: string; type: number; TTL: number; data: string }> } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function lookup() {
    if (!domain) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`);
      setResult(await res.json());
    } catch {
      setError("DNS 조회에 실패했습니다.");
    } finally { setLoading(false); }
  }

  const TYPE_NAMES: Record<number, string> = { 1: "A", 2: "NS", 5: "CNAME", 15: "MX", 16: "TXT", 28: "AAAA", 33: "SRV" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>Google DNS를 통해 DNS 레코드를 조회합니다.</p>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV"].map((t) => (
          <button key={t} onClick={() => setType(t)} style={{
            padding: "5px 12px", borderRadius: "6px", border: "1px solid var(--color-hairline-strong)",
            background: type === t ? "var(--color-ink)" : "var(--color-lifted)",
            color: type === t ? "var(--color-canvas)" : "var(--color-body)",
            cursor: "pointer", fontSize: "0.8125rem", fontWeight: 500, fontFamily: "var(--font-sans)",
          }}>{t}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <input className="input" style={{ flex: 1 }} placeholder="도메인 입력 (예: krl.kr)" value={domain} onChange={(e) => setDomain(e.target.value)} onKeyDown={(e) => e.key === "Enter" && lookup()} />
        <button className="btn btn-primary btn-sm" onClick={lookup} disabled={!domain || loading}>{loading ? "조회 중…" : "조회"}</button>
      </div>
      {error && <p style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>{error}</p>}
      {result && (
        <div style={{ background: "var(--color-surface-card)", borderRadius: "10px", padding: "16px" }}>
          <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginBottom: "8px" }}>
            상태: {result.Status === 0 ? "성공 (NOERROR)" : `오류 코드 ${result.Status}`}
          </p>
          {result.Answer && result.Answer.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {result.Answer.map((a, i) => (
                <div key={i} style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", padding: "8px 10px", background: "var(--color-lifted)", borderRadius: "6px", wordBreak: "break-all" }}>
                  <span style={{ color: "var(--color-muted)" }}>{TYPE_NAMES[a.type] ?? a.type} TTL={a.TTL} </span>
                  <span style={{ color: "var(--color-ink)", fontWeight: 600 }}>{a.data}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>레코드 없음</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── JWT Decoder ──────────────────────────────────────────────────────────────
function JwtTool() {
  const [token, setToken] = useState("");
  const [decoded, setDecoded] = useState<{ header: unknown; payload: unknown; signature: string } | null>(null);
  const [error, setError] = useState("");

  function decode() {
    setError(""); setDecoded(null);
    try {
      const parts = token.trim().split(".");
      if (parts.length !== 3) throw new Error("JWT는 3개 부분으로 구성됩니다.");
      const pad = (s: string) => s + "=".repeat((4 - (s.length % 4)) % 4);
      const header = JSON.parse(atob(pad(parts[0].replace(/-/g, "+").replace(/_/g, "/"))));
      const payload = JSON.parse(atob(pad(parts[1].replace(/-/g, "+").replace(/_/g, "/"))));
      setDecoded({ header, payload, signature: parts[2] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "디코드 실패");
    }
  }

  const payloadData = decoded?.payload as Record<string, unknown> | undefined;
  const exp = payloadData?.exp as number | undefined;
  const iat = payloadData?.iat as number | undefined;
  const isExpired = exp ? exp * 1000 < Date.now() : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>JWT 토큰을 디코딩합니다. 검증 없이 클라이언트에서만 처리됩니다.</p>
      <textarea className="input" rows={4} placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9…" value={token} onChange={(e) => setToken(e.target.value)} style={{ resize: "vertical", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", wordBreak: "break-all" }} />
      <button className="btn btn-primary btn-sm" onClick={decode} disabled={!token} style={{ alignSelf: "flex-start" }}>디코드</button>
      {error && <p style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>{error}</p>}
      {decoded && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {exp && (
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "10px 14px", borderRadius: "8px",
              background: isExpired ? "#FFF1F2" : "#ECFDF5",
              border: `1px solid ${isExpired ? "#FECDD3" : "#A7F3D0"}`,
              color: isExpired ? "#9B1C1C" : "#065F46", fontSize: "0.8125rem", fontWeight: 600,
            }}>
              {isExpired ? <WarnIcon /> : <OkIcon />}
              {isExpired ? "만료된 토큰" : "유효한 토큰"}
              {" — "} 만료: {new Date(exp * 1000).toLocaleString("ko-KR")}
              {iat && ` / 발급: ${new Date(iat * 1000).toLocaleString("ko-KR")}`}
            </div>
          )}
          {(["header", "payload"] as const).map((part) => (
            <div key={part}>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{part}</p>
              <div style={{ position: "relative" }}>
                <pre style={{ background: "var(--color-surface-card)", borderRadius: "8px", padding: "12px 14px", paddingRight: "70px", fontSize: "0.8125rem", fontFamily: "var(--font-mono)", overflowX: "auto", color: "var(--color-ink)", margin: 0, lineHeight: 1.5 }}>
                  {JSON.stringify(decoded[part], null, 2)}
                </pre>
                <div style={{ position: "absolute", top: "10px", right: "10px" }}>
                  <CopyBtn text={JSON.stringify(decoded[part], null, 2)} />
                </div>
              </div>
            </div>
          ))}
          <div>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>signature</p>
            <div style={{ background: "var(--color-surface-card)", borderRadius: "8px", padding: "10px 14px", fontSize: "0.8125rem", fontFamily: "var(--font-mono)", color: "var(--color-ink)", wordBreak: "break-all" }}>{decoded.signature}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const TOOL_COMPONENTS: Record<string, React.FC> = {
  ip: IpTool, uuid: UuidTool, hash: HashTool, base64: Base64Tool,
  url: UrlTool, json: JsonTool, timestamp: TimestampTool, color: ColorTool,
  regex: RegexTool, text: TextTool, dns: DnsTool, jwt: JwtTool,
};

export default function DevToolsPage() {
  const [active, setActive] = useState("ip");
  const ToolComponent = TOOL_COMPONENTS[active];

  return (
    <main style={{ minHeight: "100vh", background: "var(--color-canvas)" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "40px 16px 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <p className="section-label" style={{ marginBottom: "8px" }}>웹 서비스</p>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.025em", marginBottom: "6px" }}>개발자 도구</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem" }}>IP, UUID, Hash, Base64, URL, JSON, Timestamp, 색상, 정규식, DNS, JWT 등 12가지 도구</p>
        </div>

        {/* Tabs — horizontal scroll on mobile */}
        <div style={{
          display: "flex", gap: "6px", marginBottom: "20px",
          overflowX: "auto", paddingBottom: "6px",
          // Hide scrollbar but keep scrollability
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        } as React.CSSProperties}>
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActive(tab.id)} style={{
              padding: "8px 14px", borderRadius: "99px", border: "1px solid",
              borderColor: active === tab.id ? "var(--color-ink)" : "var(--color-hairline-strong)",
              background: active === tab.id ? "var(--color-ink)" : "var(--color-lifted)",
              color: active === tab.id ? "var(--color-canvas)" : "var(--color-body)",
              cursor: "pointer", fontSize: "0.875rem", fontWeight: 500, fontFamily: "var(--font-sans)",
              whiteSpace: "nowrap", transition: "all 0.15s", flexShrink: 0,
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tool panel */}
        <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "16px", padding: "24px" }}>
          <ToolComponent />
        </div>

        {/* Other tools grid */}
        <div style={{ marginTop: "40px" }}>
          <p className="section-label" style={{ marginBottom: "16px" }}>다른 도구</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px" }}>
            {[
              { href: "/qr", label: "QR 코드 생성기", d: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z" },
              { href: "/tools/drop", label: "파일 공유", d: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" },
              { href: "/tools/paste", label: "Pastebin", d: "M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" },
              { href: "/tools/bio", label: "Link-in-bio", d: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" },
              { href: "/tools/webhook", label: "Webhook 테스터", d: "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 01.38 2.2 2 2 0 012.36.03h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.06 6.06l.84-.84a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" },
            ].map((tool) => (
              <a key={tool.href} href={tool.href} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px", borderRadius: "10px", textDecoration: "none", background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", color: "var(--color-ink)", fontSize: "0.875rem", fontWeight: 500, transition: "border-color 0.15s" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-muted)", flexShrink: 0 }}>
                  <path d={tool.d} />
                </svg>
                {tool.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Hide scrollbar for tab bar */}
      <style>{`
        div[style*="scrollbarWidth"] { scrollbar-width: none; }
        div[style*="scrollbarWidth"]::-webkit-scrollbar { display: none; }
      `}</style>
    </main>
  );
}
