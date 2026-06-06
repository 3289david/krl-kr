"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";

type Tool = "pen" | "eraser" | "rect" | "circle" | "text";

interface Stroke {
  tool: Tool;
  color: string;
  size: number;
  points?: { x: number; y: number }[];
  x?: number; y?: number; w?: number; h?: number;
  text?: string;
}

export default function WhiteboardEditorPage() {
  const params = useParams();
  const id = params.id as string;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(3);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [name, setName] = useState("화이트보드");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/whiteboard/${id}`).then(r => r.json()).then(d => {
      if (d.whiteboard) {
        setName(d.whiteboard.name);
        try {
          const data = typeof d.whiteboard.data === "string" ? JSON.parse(d.whiteboard.data) : d.whiteboard.data;
          if (data?.strokes) setStrokes(data.strokes);
        } catch {}
      }
    }).catch(() => {});
  }, [id]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    [...strokes, ...(currentStroke ? [currentStroke] : [])].forEach(stroke => {
      ctx.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (stroke.tool === "pen" || stroke.tool === "eraser") {
        if (!stroke.points || stroke.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        stroke.points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      } else if (stroke.tool === "rect") {
        ctx.strokeRect(stroke.x!, stroke.y!, stroke.w!, stroke.h!);
      } else if (stroke.tool === "circle") {
        ctx.beginPath();
        ctx.ellipse(stroke.x! + stroke.w! / 2, stroke.y! + stroke.h! / 2, Math.abs(stroke.w! / 2), Math.abs(stroke.h! / 2), 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (stroke.tool === "text" && stroke.text) {
        ctx.font = `${stroke.size * 5}px sans-serif`;
        ctx.fillStyle = stroke.color;
        ctx.fillText(stroke.text, stroke.x!, stroke.y!);
      }
    });
  }, [strokes, currentStroke]);

  useEffect(() => { redraw(); }, [redraw]);

  function getPos(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const pos = getPos(e);
    setStartPos(pos);
    setIsDrawing(true);
    if (tool === "text") {
      const text = prompt("텍스트 입력:");
      if (text) setStrokes(prev => [...prev, { tool: "text", color, size, text, x: pos.x, y: pos.y }]);
      return;
    }
    const stroke: Stroke = { tool, color, size };
    if (tool === "pen" || tool === "eraser") stroke.points = [pos];
    else { stroke.x = pos.x; stroke.y = pos.y; stroke.w = 0; stroke.h = 0; }
    setCurrentStroke(stroke);
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing || !currentStroke) return;
    const pos = getPos(e);
    if (tool === "pen" || tool === "eraser") {
      setCurrentStroke(prev => prev ? { ...prev, points: [...(prev.points ?? []), pos] } : prev);
    } else {
      setCurrentStroke(prev => prev ? { ...prev, w: pos.x - startPos.x, h: pos.y - startPos.y } : prev);
    }
  }

  function onMouseUp() {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke) { setStrokes(prev => [...prev, currentStroke]); setCurrentStroke(null); }
  }

  async function saveBoard() {
    setSaving(true);
    const canvas = canvasRef.current;
    const thumbnail = canvas?.toDataURL("image/png", 0.3);
    await fetch(`/api/v1/whiteboard/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: JSON.stringify({ strokes }), thumbnail, name }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const tools: { key: Tool; label: string; icon: string }[] = [
    { key: "pen", label: "펜", icon: "M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" },
    { key: "eraser", label: "지우개", icon: "M20 20H7L3 16l10-10 7 7-3 4 M6.5 17.5 16 8" },
    { key: "rect", label: "사각형", icon: "M3 3h18v18H3z" },
    { key: "circle", label: "원", icon: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" },
    { key: "text", label: "텍스트", icon: "M4 7V4h16v3 M9 20h6 M12 4v16" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 54px)" }}>
      {/* Toolbar */}
      <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, flexWrap: "wrap" }}>
        <input value={name} onChange={e => setName(e.target.value)} style={{ fontWeight: 600, border: "none", outline: "none", background: "transparent", color: "var(--color-ink)", fontSize: "1rem", width: "160px" }} />
        <div style={{ width: "1px", height: "24px", background: "var(--color-hairline)" }} />
        {tools.map(t => (
          <button key={t.key} onClick={() => setTool(t.key)} title={t.label} style={{ padding: "6px 10px", border: `1px solid ${tool === t.key ? "var(--color-accent)" : "var(--color-hairline)"}`, borderRadius: "6px", background: tool === t.key ? "var(--color-accent)" : "transparent", color: tool === t.key ? "white" : "var(--color-body)", cursor: "pointer" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {t.icon.split(" M").map((d, i) => <path key={i} d={i === 0 ? d : "M" + d} />)}
            </svg>
          </button>
        ))}
        <div style={{ width: "1px", height: "24px", background: "var(--color-hairline)" }} />
        <input type="color" value={color} onChange={e => setColor(e.target.value)} title="색상" style={{ width: "32px", height: "32px", border: "none", cursor: "pointer", borderRadius: "4px", padding: 0 }} />
        <input type="range" min="1" max="20" value={size} onChange={e => setSize(Number(e.target.value))} title="굵기" style={{ width: "80px" }} />
        <span style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>{size}px</span>
        <button onClick={() => setStrokes([])} style={{ padding: "6px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", background: "transparent", cursor: "pointer", fontSize: "0.8125rem", color: "#ef4444" }}>지우기</button>
        <button onClick={saveBoard} disabled={saving} style={{ marginLeft: "auto", padding: "6px 16px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem" }}>
          {saved ? "저장됨" : saving ? "저장 중..." : "저장"}
        </button>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, overflow: "hidden", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <canvas
          ref={canvasRef}
          width={1400}
          height={900}
          style={{ cursor: tool === "eraser" ? "cell" : "crosshair", maxWidth: "100%", maxHeight: "100%" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        />
      </div>
    </div>
  );
}
