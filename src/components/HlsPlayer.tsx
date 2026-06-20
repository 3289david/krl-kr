"use client";

import { useEffect, useRef, useState } from "react";

interface HlsPlayerProps {
  /** Direct stream URL (can be .m3u8 playlist or regular video file) */
  src: string;
  /** HLS playlist URL — if provided, used when HLS is ready; falls back to src */
  hlsSrc?: string;
  style?: React.CSSProperties;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  onReady?: () => void;
  onError?: () => void;
}

export default function HlsPlayer({
  src,
  hlsSrc,
  style,
  className,
  autoPlay = false,
  muted = false,
  loop = false,
  onReady,
  onError,
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [hlsReady, setHlsReady] = useState(false);
  const [hlsChecked, setHlsChecked] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Poll HLS readiness if hlsSrc is provided
  useEffect(() => {
    if (!hlsSrc) {
      setHlsChecked(true);
      return;
    }

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout>;

    async function check() {
      try {
        // Extract type/id from hlsSrc like /api/v1/hls/drive/123/playlist.m3u8
        const parts = hlsSrc!.split("/");
        const typeIdx = parts.indexOf("hls");
        if (typeIdx < 0) { setHlsChecked(true); return; }
        const statusUrl = parts.slice(0, typeIdx + 3).join("/");

        const res = await fetch(statusUrl, { method: "HEAD" });
        if (cancelled) return;
        if (res.ok) {
          setHlsReady(true);
          setHlsChecked(true);
        } else if (res.status === 202) {
          setProcessing(true);
          // Poll every 5 seconds while processing
          pollTimer = setTimeout(check, 5000);
        } else {
          setHlsChecked(true);
        }
      } catch {
        if (!cancelled) setHlsChecked(true);
      }
    }

    check();
    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
    };
  }, [hlsSrc]);

  // Mount HLS.js once we know which src to use
  useEffect(() => {
    if (!hlsChecked) return;
    const video = videoRef.current;
    if (!video) return;

    const activeSrc = hlsReady && hlsSrc ? hlsSrc : src;

    // Safari / native HLS support
    if (video.canPlayType("application/vnd.apple.mpegurl") && activeSrc.endsWith(".m3u8")) {
      video.src = activeSrc;
      onReady?.();
      return;
    }

    if (activeSrc.endsWith(".m3u8")) {
      // Use hls.js for Chrome/Firefox
      import("hls.js").then(({ default: Hls }) => {
        if (!Hls.isSupported()) {
          video.src = src; // fallback to range stream
          onReady?.();
          return;
        }
        const hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60 });
        hlsRef.current = hls;
        hls.loadSource(activeSrc);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => onReady?.());
        hls.on(Hls.Events.ERROR, (_: any, data: any) => {
          if (data.fatal) {
            // Fall back to range stream
            hls.destroy();
            video.src = src;
          }
        });
      });
    } else {
      // Range-based streaming (non-HLS fallback)
      video.src = activeSrc;
      onReady?.();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [hlsChecked, hlsReady, hlsSrc, src, onReady]);

  return (
    <div style={{ position: "relative", ...style }} className={className}>
      <video
        ref={videoRef}
        controls
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        onError={onError}
        style={{ width: "100%", height: "100%", background: "#000" }}
      />
      {processing && !hlsReady && (
        <div style={{
          position: "absolute",
          bottom: "4px",
          right: "8px",
          fontSize: "0.7rem",
          color: "rgba(255,255,255,0.7)",
          background: "rgba(0,0,0,0.5)",
          padding: "2px 6px",
          borderRadius: "4px",
          pointerEvents: "none",
        }}>
          스트리밍 준비 중…
        </div>
      )}
    </div>
  );
}
