"use client";
import { useState, useEffect, useRef, useCallback } from "react";

/* ─── Types ─────────────────────────────────────────────── */
interface VoiceRoom {
  id: number; name: string; description: string | null;
  isPublic: boolean; isTemporary: boolean; stageMode: boolean;
  ownerId: string | null; quickCode: string | null;
  memberCount: number; members: VoiceMember[]; joined: boolean;
  expiresAt: number | null; createdAt: number;
}
interface VoiceMember {
  userId: string; name: string; username: string | null; avatar: string | null;
  role: string; isMuted: boolean; screenSharing: boolean;
}

/* ─── ICE Config ────────────────────────────────────────── */
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/* ─── Avatar ─────────────────────────────────────────────── */
const COLORS = ["#3b82f6","#8b5cf6","#ec4899","#ef4444","#f59e0b","#10b981","#6366f1"];
function Av({ name, avatar, size = 52, speaking = false }: { name: string; avatar?: string|null; size?: number; speaking?: boolean }) {
  const color = COLORS[(name?.charCodeAt(0) ?? 0) % COLORS.length];
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      {speaking && <div style={{ position: "absolute", inset: -3, borderRadius: "50%", border: "2.5px solid #22c55e", animation: "pulse 1s infinite" }} />}
      {avatar
        ? <img src={avatar} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />
        : <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, color: "#fff" }}>
            {(name ?? "?").charAt(0).toUpperCase()}
          </div>}
    </div>
  );
}

/* ─── SVG Icons ─────────────────────────────────────────── */
const Mic = ({ off, size = 20 }: { off?: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {off ? <>
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
      <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
    </> : <>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
    </>}
  </svg>
);
const Headphones = ({ off, size = 20 }: { off?: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {off && <line x1="1" y1="1" x2="23" y2="23"/>}
    <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
  </svg>
);
const Monitor = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);
const Phone = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.64 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.55 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.08 6.08l1.09-.9a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

/* ─── Create Room Modal ─────────────────────────────────── */
function CreateModal({ onClose, onCreate }: { onClose(): void; onCreate(r: VoiceRoom): void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isTemporary, setIsTemporary] = useState(false);
  const [stageMode, setStageMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (!name.trim()) return;
    setLoading(true); setErr("");
    const r = await fetch("/api/v1/voice", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim(), isPublic, isTemporary, stageMode }),
    });
    const d = await r.json();
    if (!r.ok) { setErr(d.error); setLoading(false); return; }
    onCreate(d.room);
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--color-surface)", borderRadius: 14, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,.25)", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--color-hairline)", display: "flex", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: "1rem", flex: 1 }}>음성방 만들기</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 5 }}>방 이름</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="예: 공부방, 게임방" onKeyDown={e => e.key === "Enter" && submit()} style={{ width: "100%", marginBottom: 12, height: 36 }} autoFocus />
          <label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 5 }}>설명 (선택)</label>
          <input className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="방에 대한 설명" style={{ width: "100%", marginBottom: 16, height: 36 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {([
              { key: "isPublic", label: "공개 방", desc: "누구나 입장 가능", val: isPublic, set: setIsPublic },
              { key: "isTemporary", label: "임시 방", desc: "모두 나가면 자동 삭제", val: isTemporary, set: setIsTemporary },
              { key: "stageMode", label: "발표 모드 (Stage)", desc: "호스트만 발언, 나머지는 청중", val: stageMode, set: setStageMode },
            ] as const).map(opt => (
              <label key={opt.key} style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={opt.val as boolean} onChange={e => (opt.set as any)(e.target.checked)} style={{ marginTop: 3, cursor: "pointer" }} />
                <div>
                  <div style={{ fontSize: ".875rem", fontWeight: 600 }}>{opt.label}</div>
                  <div style={{ fontSize: ".75rem", color: "var(--color-muted)" }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
          {err && <div style={{ color: "#dc2626", fontSize: ".8125rem", marginBottom: 10 }}>{err}</div>}
          <button onClick={submit} disabled={loading || !name.trim()} className="btn btn-primary" style={{ width: "100%", height: 38, justifyContent: "center" }}>
            {loading ? "만드는 중..." : "방 만들기"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Voice Page ───────────────────────────────────── */
export default function VoicePage() {
  const [rooms, setRooms] = useState<VoiceRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<VoiceRoom | null>(null);
  const [myId, setMyId] = useState("");
  const [myName, setMyName] = useState("");
  const [myAvatar, setMyAvatar] = useState<string | null>(null);
  const [members, setMembers] = useState<VoiceMember[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMap, setSpeakingMap] = useState<Map<string, boolean>>(new Map());
  const [screenSharing, setScreenSharing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [quickCode, setQuickCode] = useState("");
  const [showQuickJoin, setShowQuickJoin] = useState(false);
  const [joinError, setJoinError] = useState("");

  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const sseRef = useRef<EventSource | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const activeRoomIdRef = useRef<number | null>(null);

  // Load me + rooms
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user) { setMyId(d.user.id); setMyName(d.user.name ?? ""); setMyAvatar(d.user.avatar_url ?? null); }
    });
    loadRooms();
  }, []);

  async function loadRooms() {
    setLoading(true);
    const r = await fetch("/api/v1/voice", { credentials: "include" });
    const d = await r.json();
    setRooms(d.rooms ?? []);
    setLoading(false);
  }

  // SSE for voice signals
  useEffect(() => {
    if (!myId) return;
    const es = new EventSource("/api/v1/chat/events");
    sseRef.current = es;
    es.onmessage = e => {
      try { handleEvent(JSON.parse(e.data)); } catch {}
    };
    return () => es.close();
  }, [myId]); // eslint-disable-line

  function handleEvent(ev: any) {
    if (ev.type === "voice_join") handleVoiceJoin(ev.user);
    if (ev.type === "voice_leave") handleVoiceLeave(ev.userId);
    if (ev.type === "voice_state") handleVoiceState(ev);
    if (ev.type === "voice_signal") handleSignal(ev);
  }

  function handleVoiceJoin(user: VoiceMember) {
    if (user.userId === myId) return;
    setMembers(prev => prev.find(m => m.userId === user.userId) ? prev : [...prev, user]);
    // Existing members initiate offers to new joiners
    if (activeRoomIdRef.current) initiateOffer(user.userId);
  }

  function handleVoiceLeave(userId: string) {
    setMembers(prev => prev.filter(m => m.userId !== userId));
    const pc = pcsRef.current.get(userId);
    if (pc) { pc.close(); pcsRef.current.delete(userId); }
    const audio = audioRefs.current.get(userId);
    if (audio) { audio.srcObject = null; audio.remove(); audioRefs.current.delete(userId); }
    remoteStreamsRef.current.delete(userId);
  }

  function handleVoiceState(ev: any) {
    setMembers(prev => prev.map(m => m.userId === ev.userId
      ? { ...m, isMuted: ev.isMuted ?? m.isMuted, screenSharing: ev.screenSharing ?? m.screenSharing }
      : m));
  }

  async function handleSignal(ev: any) {
    const { subtype, fromId, sdp, candidate } = ev;
    if (subtype === "offer") {
      const pc = createPeerConnection(fromId);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignal("answer", fromId, { sdp: pc.localDescription });
    }
    if (subtype === "answer") {
      const pc = pcsRef.current.get(fromId);
      if (pc && pc.signalingState !== "stable") {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp)).catch(() => {});
      }
    }
    if (subtype === "ice") {
      const pc = pcsRef.current.get(fromId);
      if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    }
  }

  function createPeerConnection(userId: string): RTCPeerConnection {
    const existing = pcsRef.current.get(userId);
    if (existing && existing.signalingState !== "closed") return existing;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
    }
    pc.onicecandidate = e => {
      if (e.candidate) sendSignal("ice", userId, { candidate: e.candidate });
    };
    pc.ontrack = e => {
      const stream = e.streams[0];
      remoteStreamsRef.current.set(userId, stream);
      let audio = audioRefs.current.get(userId);
      if (!audio) {
        audio = document.createElement("audio");
        audio.autoplay = true;
        document.body.appendChild(audio);
        audioRefs.current.set(userId, audio);
      }
      audio.srcObject = stream;

      // Remote speaking detection
      try {
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        const src = ctx.createMediaStreamSource(stream);
        src.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const check = setInterval(() => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setSpeakingMap(prev => new Map(prev).set(userId, avg > 15));
        }, 150);
        pc.addEventListener("connectionstatechange", () => {
          if (pc.connectionState === "closed" || pc.connectionState === "failed") {
            clearInterval(check); ctx.close();
          }
        });
      } catch {}
    };
    pcsRef.current.set(userId, pc);
    return pc;
  }

  async function initiateOffer(userId: string) {
    const pc = createPeerConnection(userId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendSignal("offer", userId, { sdp: pc.localDescription });
  }

  function sendSignal(type: string, toId: string, data: object) {
    fetch("/api/v1/voice/signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, toId, roomId: activeRoomIdRef.current, ...data }),
    }).catch(() => {});
  }

  async function joinRoom(room: VoiceRoom) {
    if (connecting) return;
    setConnecting(true);
    try {
      // Get local audio
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("이 브라우저는 음성 채팅을 지원하지 않습니다. HTTPS 환경의 Chrome/Safari를 사용해주세요.");
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true, sampleRate: 48000 },
          video: false,
        });
      } catch (micErr: any) {
        if (micErr.name === "NotAllowedError" || micErr.name === "PermissionDeniedError") {
          throw new Error("마이크 접근이 거부되었습니다. 브라우저 주소창 옆 자물쇠 아이콘 → 마이크 허용 후 다시 시도해주세요.");
        }
        if (micErr.name === "NotFoundError") {
          throw new Error("마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.");
        }
        throw new Error(`마이크 오류: ${micErr.message}`);
      }
      localStreamRef.current = stream;

      // Speaking detection for self
      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        const src = ctx.createMediaStreamSource(stream);
        src.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const interval = setInterval(() => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setIsSpeaking(avg > 18);
        }, 150);
        stream.getAudioTracks()[0]?.addEventListener("ended", () => clearInterval(interval));
      } catch {}

      // Join via API
      const r = await fetch(`/api/v1/voice/${room.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "입장 실패. 다시 로그인해 주세요.");

      activeRoomIdRef.current = room.id;

      // Load current members
      const rm = await fetch(`/api/v1/voice/${room.id}`, { credentials: "include" });
      const rd = await rm.json();
      setMembers(rd.members ?? []);
      setActiveRoom({ ...room, joined: true });

      // Existing members will send us offers via SSE (triggered by voice_join broadcast)
    } catch (err: any) {
      setJoinError(err.message ?? "입장 실패");
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    setConnecting(false);
  }

  async function leaveRoom() {
    if (!activeRoom) return;
    await fetch(`/api/v1/voice/${activeRoom.id}`, { method: "DELETE" });
    // Close all peer connections
    pcsRef.current.forEach(pc => pc.close());
    pcsRef.current.clear();
    // Stop local stream
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    // Remove remote audio elements
    audioRefs.current.forEach(a => { a.srcObject = null; a.remove(); });
    audioRefs.current.clear();
    remoteStreamsRef.current.clear();
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    activeRoomIdRef.current = null;
    setActiveRoom(null);
    setMembers([]);
    setIsMuted(false); setIsDeafened(false); setScreenSharing(false);
    loadRooms();
  }

  async function toggleMute() {
    const muted = !isMuted;
    setIsMuted(muted);
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !muted; });
    if (activeRoom) {
      fetch(`/api/v1/voice/${activeRoom.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isMuted: muted }),
      }).catch(() => {});
    }
  }

  async function toggleDeafen() {
    const deaf = !isDeafened;
    setIsDeafened(deaf);
    audioRefs.current.forEach(a => { a.muted = deaf; });
  }

  async function toggleScreenShare() {
    if (screenSharing) {
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      setScreenSharing(false);
      fetch(`/api/v1/voice/${activeRoom?.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screenSharing: false }),
      }).catch(() => {});
    } else {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        screenStreamRef.current = screen;
        setScreenSharing(true);
        fetch(`/api/v1/voice/${activeRoom?.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ screenSharing: true }),
        }).catch(() => {});
        // Replace/add video track in peer connections
        screen.getVideoTracks()[0]?.addEventListener("ended", () => { setScreenSharing(false); screenStreamRef.current = null; });
      } catch {}
    }
  }

  async function quickJoin() {
    if (!quickCode.trim()) return;
    const r = await fetch("/api/v1/chat/join", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: quickCode.trim().toUpperCase() }),
    });
    if (r.ok) {
      const d = await r.json();
      window.location.href = `/dashboard/voice`;
      loadRooms();
    } else {
      const d = await r.json();
      alert(d.error);
    }
    setShowQuickJoin(false);
  }

  const myMember = members.find(m => m.userId === myId);

  return (
    <div className="voice-app" style={{ display: "flex", overflow: "hidden", background: "var(--color-canvas)", fontFamily: "var(--font-sans)" }}>
      <style>{`
        .voice-app { height: calc(100dvh - 54px); margin: -24px 0; }
        @media(max-width:768px){
          .voice-app {
            position: fixed !important;
            top: 54px !important; left: 0 !important; right: 0 !important;
            bottom: calc(60px + env(safe-area-inset-bottom, 0px)) !important;
            height: auto !important; margin: 0 !important; z-index: 20;
          }
          .voice-list { width: 100% !important; border-right: none !important; }
          .voice-main { display: none; }
          .voice-list.has-active { display: none; }
          .voice-main.has-active { display: flex !important; position: absolute; inset: 0; z-index: 30; }
        }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.7;transform:scale(1.06)} }
        .voice-card { background:var(--color-surface); border:1.5px solid var(--color-hairline); border-radius:14px; padding:16px; cursor:pointer; transition:box-shadow .15s,border-color .15s; }
        .voice-card:hover { box-shadow:0 4px 14px rgba(0,0,0,.08); border-color:var(--color-muted); }
        .voice-ctrl { width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:none; cursor:pointer; transition:background .15s; }
        .voice-ctrl.active { background:#ef4444; color:#fff; }
        .voice-ctrl.normal { background:var(--color-surface); color:var(--color-ink); border:1.5px solid var(--color-hairline); }
        .voice-ctrl.normal:hover { background:var(--color-canvas); }
        .voice-ctrl.leave { background:#ef4444; color:#fff; }
        .voice-ctrl.leave:hover { background:#dc2626; }
        .participant-card { display:flex; flex-direction:column; align-items:center; gap:8px; padding:16px 12px; border-radius:12px; background:var(--color-surface); border:1.5px solid var(--color-hairline); transition:border-color .15s; min-width:100px; }
        .participant-card.speaking { border-color:#22c55e; }
        .member-row { display:flex; align-items:center; gap:8px; padding:6px 10px; border-radius:8px; transition:background .1s; }
        .member-row:hover { background:var(--color-canvas); }
      `}</style>

      {/* ── Left: Room List ── */}
      <div className={`voice-list${activeRoom?" has-active":""}`} style={{ width: 280, flexShrink: 0, borderRight: "1px solid var(--color-hairline)", background: "var(--color-surface)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid var(--color-hairline)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/>
              <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
            </svg>
            <span style={{ fontWeight: 700, fontSize: "1rem", flex: 1 }}>KRL Voice</span>
            <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm" style={{ height: 28, padding: "0 10px", fontSize: ".8rem" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              새 방
            </button>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input className="input" placeholder="빠른 코드 입력 (XXXXXXXX)" value={quickCode} onChange={e => setQuickCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && quickJoin()}
              style={{ flex: 1, height: 30, fontSize: ".8rem", textTransform: "uppercase" }} />
            <button onClick={quickJoin} className="btn btn-ghost btn-sm" style={{ height: 30, padding: "0 8px" }}>입장</button>
          </div>
          {joinError && (
            <div style={{ margin: "8px 0 0", padding: "8px 12px", background: "#fee2e2", borderRadius: 8, fontSize: ".8rem", color: "#dc2626", lineHeight: 1.4 }}
              onClick={() => setJoinError("")}>
              {joinError}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--color-muted)", fontSize: ".875rem" }}>불러오는 중...</div>
          ) : rooms.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--color-muted)", fontSize: ".875rem" }}>
              공개 음성방이 없습니다.<br />
              <button onClick={() => setShowCreate(true)} style={{ marginTop: 8, background: "none", border: "none", color: "#3b82f6", cursor: "pointer", textDecoration: "underline", fontSize: ".875rem" }}>새 방 만들기</button>
            </div>
          ) : (
            rooms.map(room => (
              <div key={room.id} className="member-row" style={{ padding: "8px 10px", cursor: "pointer", marginBottom: 2 }}
                onClick={() => !activeRoom && joinRoom(room)}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/>
                    <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: ".875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{room.name}</div>
                  <div style={{ fontSize: ".72rem", color: "var(--color-muted)" }}>
                    {room.stageMode ? "🎤 발표 모드 · " : ""}{room.memberCount}명 참여 중
                    {room.isTemporary ? " · 임시" : ""}
                  </div>
                </div>
                {room.joined && <span style={{ background: "#22c55e", color: "#fff", borderRadius: 6, padding: "2px 6px", fontSize: ".7rem", fontWeight: 700 }}>참여중</span>}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Right: Room / Welcome ── */}
      <div className={`voice-main${activeRoom?" has-active":""}`} style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {activeRoom ? (
          <>
            {/* Room header */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-hairline)", background: "var(--color-surface)", display: "flex", alignItems: "center", gap: 10 }}>
              {/* Mobile back button */}
              <button onClick={leaveRoom} style={{ display: "none", background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "2px 4px" }} className="voice-back-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <style>{`.voice-main.has-active .voice-back-btn { display:flex !important; } @media(min-width:769px){ .voice-back-btn { display:none !important; } }`}</style>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
              </svg>
              <span style={{ fontWeight: 700, flex: 1, fontSize: ".9375rem" }}>{activeRoom.name}</span>
              {activeRoom.quickCode && (
                <code style={{ fontSize: ".75rem", background: "var(--color-canvas)", padding: "3px 8px", borderRadius: 6, fontFamily: "monospace", color: "var(--color-muted)" }}>
                  {activeRoom.quickCode}
                </code>
              )}
              <span style={{ fontSize: ".8125rem", color: "var(--color-muted)" }}>{members.length}명</span>
            </div>

            {/* Participant grid */}
            <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
              {activeRoom.stageMode && (
                <div style={{ marginBottom: 16, padding: "8px 14px", background: "#fef3c7", borderRadius: 8, fontSize: ".8125rem", color: "#92400e", display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
                  발표 모드 활성화 — 호스트만 발언 가능
                </div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {/* Self */}
                <div className={`participant-card${isSpeaking && !isMuted ? " speaking" : ""}`}>
                  <Av name={myName} avatar={myAvatar} size={52} speaking={isSpeaking && !isMuted} />
                  <div style={{ fontSize: ".8125rem", fontWeight: 600, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>{myName}</div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {isMuted && <svg width="12" height="12" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth={0}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><line x1="1" y1="1" x2="23" y2="23" stroke="#ef4444" strokeWidth={2}/></svg>}
                    {isDeafened && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2}><path d="M3 18v-6a9 9 0 0 1 18 0v6"/></svg>}
                    {screenSharing && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={2}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>}
                    {!isMuted && !isDeafened && !screenSharing && <span style={{ fontSize: ".7rem", color: "var(--color-muted)" }}>나</span>}
                  </div>
                </div>
                {/* Others */}
                {members.filter(m => m.userId !== myId).map(m => {
                  const speaking = speakingMap.get(m.userId) ?? false;
                  return (
                    <div key={m.userId} className={`participant-card${speaking && !m.isMuted ? " speaking" : ""}`}>
                      <Av name={m.name} avatar={m.avatar} size={52} speaking={speaking && !m.isMuted} />
                      <div style={{ fontSize: ".8125rem", fontWeight: 600, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>{m.name}</div>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        {m.isMuted && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2}><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/></svg>}
                        {m.screenSharing && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={2}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/></svg>}
                        <span style={{ fontSize: ".7rem", color: "var(--color-muted)" }}>{m.role === "host" ? "호스트" : m.role === "listener" ? "청중" : ""}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Controls */}
            <div style={{ padding: "14px 20px", borderTop: "1px solid var(--color-hairline)", background: "var(--color-surface)", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <div style={{ textAlign: "center" }}>
                <button className={`voice-ctrl${isMuted ? " active" : " normal"}`} onClick={toggleMute} title={isMuted ? "음소거 해제" : "음소거"}>
                  <Mic off={isMuted} />
                </button>
                <div style={{ fontSize: ".65rem", color: "var(--color-muted)", marginTop: 3 }}>{isMuted ? "음소거" : "마이크"}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <button className={`voice-ctrl${isDeafened ? " active" : " normal"}`} onClick={toggleDeafen} title={isDeafened ? "수신 해제" : "수신 음소거"}>
                  <Headphones off={isDeafened} />
                </button>
                <div style={{ fontSize: ".65rem", color: "var(--color-muted)", marginTop: 3 }}>수신</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <button className={`voice-ctrl${screenSharing ? " active" : " normal"}`} onClick={toggleScreenShare} title="화면 공유">
                  <Monitor />
                </button>
                <div style={{ fontSize: ".65rem", color: "var(--color-muted)", marginTop: 3 }}>화면</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <button className="voice-ctrl leave" onClick={leaveRoom} title="나가기">
                  <Phone />
                </button>
                <div style={{ fontSize: ".65rem", color: "#ef4444", marginTop: 3 }}>나가기</div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/>
                <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
              </svg>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: "1.25rem", marginBottom: 6 }}>KRL Voice</div>
              <div style={{ color: "var(--color-muted)", fontSize: ".9rem", marginBottom: 20 }}>브라우저에서 바로 음성 채팅 — 설치 불필요</div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={() => setShowCreate(true)} className="btn btn-primary">새 방 만들기</button>
                <button onClick={loadRooms} className="btn btn-ghost">새로고침</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 24, marginTop: 8 }}>
              {[
                { icon: "🎤", text: "Opus 코덱", sub: "최고 음질" },
                { icon: "🔇", text: "노이즈 제거", sub: "자동 처리" },
                { icon: "🖥️", text: "화면 공유", sub: "탭/창/전체" },
                { icon: "🎭", text: "발표 모드", sub: "청중 지원" },
              ].map(f => (
                <div key={f.icon} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>{f.icon}</div>
                  <div style={{ fontSize: ".8rem", fontWeight: 600 }}>{f.text}</div>
                  <div style={{ fontSize: ".72rem", color: "var(--color-muted)" }}>{f.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreate={room => { setRooms(prev => [room, ...prev]); joinRoom(room); }} />
      )}

      {connecting && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600 }}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: "32px 40px", textAlign: "center" }}>
            <div style={{ marginBottom: 12, color: "var(--color-muted)", fontSize: ".9rem" }}>마이크 권한 요청 중...</div>
            <div style={{ width: 36, height: 36, border: "3px solid #3b82f6", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} />
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
