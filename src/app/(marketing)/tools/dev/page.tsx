"use client";
import { useState, useCallback } from "react";
import type { Metadata } from "next";

const TABS = [
  { id: "ip",      label: "IP 조회" },
  { id: "uuid",    label: "UUID" },
  { id: "hash",    label: "Hash" },
  { id: "base64",  label: "Base64" },
  { id: "dns",     label: "DNS 조회" },
  { id: "jwt",     label: "JWT 디코드" },
];

// ─── IP Lookup ────────────────────────────────────────────────────────────────
function IpTool() {
  const [data, setData] = useState<Record<string, string | null> | null>(null);
  const [loading, setLoading] = useState(false);
  const [custom, setCustom] = useState("");

  async function lookup(ip?: string) {
    setLoading(true);
    try {
      const url = ip ? `/api/v1/tools/ip?ip=${encodeURIComponent(ip)}` : "/api/v1/tools/ip";
      const res = await fetch(url);
      setData(await res.json());
    } catch { setData(null); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>현재 접속 IP 주소와 지역 정보를 확인합니다.</p>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button className="btn btn-primary btn-sm" onClick={() => lookup()} disabled={loading}>
          {loading ? "조회 중…" : "내 IP 조회"}
        </button>
        <div style={{ display: "flex", gap: "6px", flex: 1, minWidth: "200px" }}>
          <input className="input" style={{ flex: 1 }} placeholder="다른 IP 입력 (예: 8.8.8.8)" value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === "Enter" && lookup(custom)} />
          <button className="btn btn-secondary btn-sm" onClick={() => lookup(custom)}>조회</button>
        </div>
      </div>
      {data && (
        <div style={{ background: "var(--color-surface-card)", borderRadius: "10px", padding: "16px", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>
          {Object.entries(data).filter(([k]) => k !== "timestamp").map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: "12px", padding: "4px 0", borderBottom: "1px solid var(--color-hairline)" }}>
              <span style={{ color: "var(--color-muted)", minWidth: "120px" }}>{k}</span>
              <span style={{ color: "var(--color-ink)", fontWeight: 600 }}>{v ?? "—"}</span>
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
  const [copied, setCopied] = useState<string | null>(null);

  function generate() {
    const generated = Array.from({ length: count }, () => crypto.randomUUID());
    setUuids(generated);
  }

  async function copy(val: string) {
    await navigator.clipboard.writeText(val);
    setCopied(val);
    setTimeout(() => setCopied(null), 1500);
  }

  async function copyAll() {
    await navigator.clipboard.writeText(uuids.join("\n"));
    setCopied("all");
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>랜덤 UUID v4를 생성합니다.</p>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ fontSize: "0.875rem", color: "var(--color-ink)" }}>개수:</label>
        <input type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} className="input" style={{ width: "80px" }} />
        <button className="btn btn-primary btn-sm" onClick={generate}>생성</button>
        {uuids.length > 0 && <button className="btn btn-secondary btn-sm" onClick={copyAll}>{copied === "all" ? "복사됨!" : "전체 복사"}</button>}
      </div>
      {uuids.length > 0 && (
        <div style={{ background: "var(--color-surface-card)", borderRadius: "10px", padding: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {uuids.map((u) => (
            <div key={u} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", padding: "6px 8px", borderRadius: "6px", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>
              <span style={{ color: "var(--color-ink)" }}>{u}</span>
              <button onClick={() => copy(u)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: copied === u ? "var(--color-success)" : "var(--color-muted)", fontFamily: "var(--font-sans)", flexShrink: 0 }}>
                {copied === u ? "✓" : "복사"}
              </button>
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
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);

  async function computeHash() {
    if (!input) return;
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest(algo, enc.encode(input));
    const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    setResult(hex);
    setCopied(false);
  }

  async function copy() {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>텍스트의 해시값을 계산합니다. 계산은 브라우저에서 직접 수행됩니다.</p>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {["SHA-1", "SHA-256", "SHA-384", "SHA-512"].map((a) => (
          <button key={a} onClick={() => setAlgo(a)} style={{
            padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--color-hairline-strong)",
            background: algo === a ? "var(--color-ink)" : "var(--color-lifted)",
            color: algo === a ? "var(--color-canvas)" : "var(--color-body)",
            cursor: "pointer", fontSize: "0.8125rem", fontWeight: 500, fontFamily: "var(--font-sans)",
          }}>{a}</button>
        ))}
      </div>
      <textarea className="input" rows={4} placeholder="해시할 텍스트를 입력하세요…" value={input} onChange={(e) => setInput(e.target.value)} style={{ resize: "vertical", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }} />
      <button className="btn btn-primary btn-sm" onClick={computeHash} disabled={!input}>계산</button>
      {result && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--color-surface-card)", borderRadius: "10px", padding: "14px 16px" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--color-ink)", wordBreak: "break-all", flex: 1 }}>{result}</span>
          <button onClick={copy} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.8125rem", color: copied ? "var(--color-success)" : "var(--color-muted)", flexShrink: 0, fontFamily: "var(--font-sans)" }}>
            {copied ? "✓복사됨" : "복사"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Base64 ───────────────────────────────────────────────────────────────────
function Base64Tool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function process() {
    setError(""); setOutput("");
    try {
      if (mode === "encode") {
        setOutput(btoa(unescape(encodeURIComponent(input))));
      } else {
        setOutput(decodeURIComponent(escape(atob(input))));
      }
    } catch {
      setError("잘못된 Base64 형식입니다.");
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>텍스트를 Base64로 인코딩하거나 디코딩합니다.</p>
      <div style={{ display: "flex", gap: "8px" }}>
        {(["encode", "decode"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: "7px 16px", borderRadius: "8px", border: "1px solid var(--color-hairline-strong)",
            background: mode === m ? "var(--color-ink)" : "var(--color-lifted)",
            color: mode === m ? "var(--color-canvas)" : "var(--color-body)",
            cursor: "pointer", fontSize: "0.875rem", fontWeight: 500, fontFamily: "var(--font-sans)",
          }}>{m === "encode" ? "인코딩" : "디코딩"}</button>
        ))}
      </div>
      <textarea className="input" rows={5} placeholder={mode === "encode" ? "인코딩할 텍스트…" : "Base64 문자열…"} value={input} onChange={(e) => setInput(e.target.value)} style={{ resize: "vertical" }} />
      <button className="btn btn-primary btn-sm" onClick={process} disabled={!input}>
        {mode === "encode" ? "인코딩" : "디코딩"}
      </button>
      {error && <p style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>{error}</p>}
      {output && (
        <div style={{ position: "relative" }}>
          <textarea readOnly value={output} rows={5} className="input" style={{ resize: "vertical", background: "var(--color-surface-card)", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }} />
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
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function lookup() {
    if (!domain) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setError("DNS 조회에 실패했습니다.");
    } finally { setLoading(false); }
  }

  const dnsResult = result as { Status?: number; Answer?: Array<{ name: string; type: number; TTL: number; data: string }> } | null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>Google DNS (8.8.8.8)를 통해 DNS 레코드를 조회합니다.</p>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {["A", "AAAA", "CNAME", "MX", "TXT", "NS"].map((t) => (
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
      {dnsResult && (
        <div style={{ background: "var(--color-surface-card)", borderRadius: "10px", padding: "16px" }}>
          <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginBottom: "8px" }}>
            상태: {dnsResult.Status === 0 ? "성공 (NOERROR)" : `오류 코드 ${dnsResult.Status}`}
          </p>
          {dnsResult.Answer && dnsResult.Answer.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {dnsResult.Answer.map((a, i) => (
                <div key={i} style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", padding: "8px 10px", background: "var(--color-lifted)", borderRadius: "6px", wordBreak: "break-all" }}>
                  <span style={{ color: "var(--color-muted)" }}>{a.name} TTL={a.TTL} </span>
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
  const isExpired = exp ? exp * 1000 < Date.now() : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>JWT 토큰을 디코딩합니다. 검증 없이 클라이언트에서만 처리됩니다.</p>
      <textarea className="input" rows={5} placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9…" value={token} onChange={(e) => setToken(e.target.value)} style={{ resize: "vertical", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", wordBreak: "break-all" }} />
      <button className="btn btn-primary btn-sm" onClick={decode} disabled={!token}>디코드</button>
      {error && <p style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>{error}</p>}
      {decoded && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {exp && (
            <div style={{ padding: "10px 14px", borderRadius: "8px", background: isExpired ? "#FFF1F2" : "#ECFDF5", border: `1px solid ${isExpired ? "#FECDD3" : "#A7F3D0"}` }}>
              <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: isExpired ? "#9B1C1C" : "#065F46" }}>
                {isExpired ? "⚠️ 만료된 토큰" : "✓ 유효한 토큰"} — 만료: {new Date(exp * 1000).toLocaleString("ko-KR")}
              </p>
            </div>
          )}
          {(["header", "payload"] as const).map((part) => (
            <div key={part}>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{part}</p>
              <pre style={{ background: "var(--color-surface-card)", borderRadius: "8px", padding: "12px 14px", fontSize: "0.8125rem", fontFamily: "var(--font-mono)", overflowX: "auto", color: "var(--color-ink)", margin: 0, lineHeight: 1.5 }}>
                {JSON.stringify(decoded[part], null, 2)}
              </pre>
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
  ip:     IpTool,
  uuid:   UuidTool,
  hash:   HashTool,
  base64: Base64Tool,
  dns:    DnsTool,
  jwt:    JwtTool,
};

export default function DevToolsPage() {
  const [active, setActive] = useState("ip");
  const ToolComponent = TOOL_COMPONENTS[active];

  return (
    <main style={{ minHeight: "100vh", background: "var(--color-canvas)" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "40px 24px 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <p className="section-label" style={{ marginBottom: "8px" }}>웹 서비스</p>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.025em", marginBottom: "8px" }}>개발자 도구</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem" }}>IP 조회, UUID 생성, 해시, Base64, DNS, JWT 디코드 등 자주 쓰는 도구 모음</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "24px", overflowX: "auto", paddingBottom: "4px" }}>
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActive(tab.id)} style={{
              padding: "8px 16px", borderRadius: "99px", border: "1px solid",
              borderColor: active === tab.id ? "var(--color-ink)" : "var(--color-hairline-strong)",
              background: active === tab.id ? "var(--color-ink)" : "var(--color-lifted)",
              color: active === tab.id ? "var(--color-canvas)" : "var(--color-body)",
              cursor: "pointer", fontSize: "0.875rem", fontWeight: 500, fontFamily: "var(--font-sans)",
              whiteSpace: "nowrap", transition: "all 0.15s",
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tool panel */}
        <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "16px", padding: "28px 28px" }}>
          <ToolComponent />
        </div>

        {/* All tools grid */}
        <div style={{ marginTop: "40px" }}>
          <p className="section-label" style={{ marginBottom: "16px" }}>다른 도구</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px" }}>
            {[
              { href: "/qr", label: "QR 코드 생성기", icon: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z" },
              { href: "/tools/drop", label: "파일 공유", icon: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" },
              { href: "/tools/paste", label: "Pastebin", icon: "M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" },
              { href: "/tools/bio", label: "Link-in-bio", icon: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" },
            ].map((tool) => (
              <a key={tool.href} href={tool.href} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 16px", borderRadius: "10px", textDecoration: "none", background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", color: "var(--color-ink)", fontSize: "0.875rem", fontWeight: 500, transition: "border-color 0.15s" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-muted)", flexShrink: 0 }}>
                  <path d={tool.icon} />
                </svg>
                {tool.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
