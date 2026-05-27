"use client";
/**
 * AltchaWidget — PoW CAPTCHA 위젯
 *
 * 두 가지 모드:
 *
 * Mode A (권장 — 로그인/회원가입): challengeJson prop 전달
 *   → 서버에서 미리 생성한 challenge를 HTML에 직접 임베드
 *   → 브라우저에서 /api/* fetch 없음 → Cloudflare 캐시/인터셉션 완전 차단
 *
 *   사용 예:
 *     const challenge = await createAltchaChallenge(); // 서버 컴포넌트에서
 *     <AltchaWidget challengeJson={JSON.stringify(challenge)} />
 *
 * Mode B (대시보드 모달 등): challengeJson 없이 사용
 *   → 마운트 후 /api/challenge?_=TIMESTAMP 를 client-side fetch
 *   → timestamp 덕분에 Cloudflare 캐시 히트 없음
 */

import Script from "next/script";
import React, { useState, useEffect } from "react";

interface AltchaWidgetProps {
  name?: string;
  /** Mode A: 서버에서 생성한 challenge JSON 문자열. 있으면 네트워크 요청 없음. */
  challengeJson?: string;
}

const WIDGET_STYLE = {
  "--altcha-border-radius": "10px",
  "--altcha-border-width": "1px",
  "--altcha-color-border": "var(--color-hairline-strong)",
  "--altcha-max-width": "100%",
  width: "100%",
} as React.CSSProperties;

export function AltchaWidget({ name = "altcha", challengeJson }: AltchaWidgetProps) {
  // Mode A: challengeJson이 주어지면 바로 렌더링
  if (challengeJson) {
    return (
      <>
        <Script src="/altcha/altcha.min.js" strategy="afterInteractive" />
        {React.createElement("altcha-widget", {
          challengejson: challengeJson,
          name,
          auto: "onload",
          hidefooter: "",
          style: WIDGET_STYLE,
        })}
      </>
    );
  }

  // Mode B: challengeJson 없으면 client-side에서 URL로 fetch
  return <AltchaWidgetFetch name={name} />;
}

/** Mode B — 대시보드 모달용. 마운트 후 timestamp URL로 fresh challenge fetch. */
function AltchaWidgetFetch({ name }: { name: string }) {
  // useEffect로 설정하면 SSR HTML에 URL이 절대 bake-in 되지 않음
  const [challengeUrl, setChallengeUrl] = useState<string | null>(null);

  useEffect(() => {
    setChallengeUrl(`/api/challenge?_=${Date.now()}`);
  }, []);

  // SSR/hydration 중에는 렌더링하지 않음 (stale URL이 HTML에 남지 않도록)
  if (!challengeUrl) return null;

  return (
    <>
      <Script src="/altcha/altcha.min.js" strategy="afterInteractive" />
      {React.createElement("altcha-widget", {
        challengeurl: challengeUrl,
        name,
        auto: "onload",
        hidefooter: "",
        style: WIDGET_STYLE,
      })}
    </>
  );
}
