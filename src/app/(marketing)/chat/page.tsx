"use client";
import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
}

// ─── Markdown → HTML (minimal, safe) ─────────────────────────────────────────
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // code blocks
    .replace(/```[\s\S]*?```/g, (m) => {
      const code = m.slice(3, -3).replace(/^[^\n]*\n/, "");
      return `<pre style="background:var(--color-surface-card);border:1px solid var(--color-hairline);border-radius:8px;padding:12px;overflow-x:auto;font-size:0.8125rem;line-height:1.5"><code>${code}</code></pre>`;
    })
    // inline code
    .replace(/`([^`]+)`/g, '<code style="background:var(--color-surface-card);padding:2px 5px;border-radius:4px;font-size:0.875em">$1</code>')
    // bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#1a0dab;text-decoration:underline">$1</a>')
    // newlines
    .replace(/\n/g, "<br>");
}

function BotIcon() {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: "10px",
      background: "var(--color-ink)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-canvas)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2z"/>
        <path d="M5 14v7M19 14v7M9 14v7M15 14v7"/>
        <path d="M9 21H5M19 21h-4"/>
      </svg>
    </div>
  );
}

function UserIcon() {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: "10px",
      background: "var(--color-surface-card)",
      border: "1px solid var(--color-hairline)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/>
      </svg>
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: "4px", alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: "50%",
          background: "var(--color-muted)",
          display: "inline-block",
          animation: `bounce 1.2s ease infinite ${i * 0.2}s`,
        }} />
      ))}
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
    </div>
  );
}

const SUGGESTIONS = [
  "URL 단축 서비스는 어떻게 사용하나요?",
  "QR 코드 생성 방법을 알려주세요",
  "파일 공유 기능에 대해 설명해줘",
  "단축 URL의 통계를 볼 수 있나요?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const loadingMsg: Message = { role: "assistant", content: "", loading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setIsLoading(true);

    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const history = [...messages, userMsg].map(({ role, content }) => ({ role, content }));

      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      const data = await res.json();
      const reply = data.content ?? data.error ?? "응답을 받지 못했습니다.";

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: reply };
        return updated;
      });
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "오류가 발생했습니다. 잠시 후 다시 시도해주세요." };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  }

  const isEmpty = messages.length === 0;

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "calc(100vh - 64px)",
      maxWidth: "800px", margin: "0 auto",
      padding: "0 16px",
    }}>
      {/* Messages area */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "24px 0 16px",
        scrollbarWidth: "thin",
      }}>
        {isEmpty ? (
          /* Welcome screen */
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", height: "100%",
            gap: "24px",
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "16px",
                background: "var(--color-ink)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 14px",
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-canvas)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2z"/>
                  <path d="M5 14v7M19 14v7M9 14v7M15 14v7"/>
                </svg>
              </div>
              <h1 style={{
                fontFamily: "var(--font-sans)", fontWeight: 700,
                fontSize: "1.5rem", color: "var(--color-ink)",
                margin: "0 0 6px",
              }}>AI 어시스턴트</h1>
              <p style={{
                fontSize: "0.9375rem", color: "var(--color-muted)",
                maxWidth: "400px", lineHeight: 1.6,
              }}>
                무엇이든 물어보세요. 질문에 답하거나 정보를 정리해 드립니다.
              </p>
            </div>

            {/* Suggestion chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", maxWidth: "540px" }}>
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} style={{
                  padding: "8px 16px", borderRadius: "99px",
                  border: "1px solid var(--color-hairline)",
                  background: "var(--color-lifted)",
                  color: "var(--color-body)", cursor: "pointer",
                  fontSize: "0.875rem", fontFamily: "var(--font-sans)",
                  transition: "border-color 0.12s, background 0.12s",
                  textAlign: "left", lineHeight: 1.4,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-ink)";
                  e.currentTarget.style.background = "var(--color-surface-card)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-hairline)";
                  e.currentTarget.style.background = "var(--color-lifted)";
                }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message list */
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: "flex", gap: "12px",
                flexDirection: "row",
                alignItems: "flex-start",
              }}>
                {msg.role === "assistant" ? <BotIcon /> : <UserIcon />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {msg.loading ? (
                    <TypingDots />
                  ) : (
                    <div
                      style={{
                        fontSize: "0.9375rem",
                        color: "var(--color-ink)",
                        lineHeight: 1.65,
                        padding: msg.role === "user"
                          ? "10px 14px"
                          : "0",
                        background: msg.role === "user"
                          ? "var(--color-surface-card)"
                          : "transparent",
                        borderRadius: msg.role === "user" ? "12px" : "0",
                        border: msg.role === "user"
                          ? "1px solid var(--color-hairline)"
                          : "none",
                        display: "inline-block",
                        maxWidth: "100%",
                        wordBreak: "break-word",
                      }}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                    />
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div style={{
        padding: "12px 0 24px",
        position: "sticky", bottom: 0,
        background: "var(--color-canvas)",
      }}>
        <div style={{
          display: "flex", alignItems: "flex-end", gap: "8px",
          background: "var(--color-lifted)",
          border: "1.5px solid var(--color-hairline-strong)",
          borderRadius: "16px",
          padding: "10px 12px 10px 16px",
          boxShadow: "0 2px 16px rgba(20,20,19,0.06)",
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요… (Shift+Enter로 줄바꿈)"
            rows={1}
            disabled={isLoading}
            style={{
              flex: 1, border: "none", outline: "none",
              background: "transparent",
              fontSize: "0.9375rem",
              color: "var(--color-ink)",
              fontFamily: "var(--font-sans)",
              resize: "none", lineHeight: "1.5",
              maxHeight: "160px", overflow: "auto",
              scrollbarWidth: "none",
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || isLoading}
            style={{
              width: 36, height: 36, borderRadius: "10px",
              background: input.trim() && !isLoading ? "var(--color-ink)" : "var(--color-surface-card)",
              border: "none",
              cursor: input.trim() && !isLoading ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.15s",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={input.trim() && !isLoading ? "var(--color-canvas)" : "var(--color-muted)"}
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p style={{
          fontSize: "0.75rem", color: "var(--color-muted)",
          textAlign: "center", marginTop: "8px",
        }}>
          AI가 생성한 내용은 부정확할 수 있습니다. 중요한 정보는 직접 확인하세요.
        </p>
      </div>
    </div>
  );
}
