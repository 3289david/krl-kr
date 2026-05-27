"use client";
import Script from "next/script";
import React, { useState, useEffect } from "react";

interface AltchaWidgetProps {
  name?: string;
  /**
   * 서버에서 createAltchaChallenge()로 생성한 challenge JSON 문자열.
   * 로그인/회원가입 페이지: 반드시 전달 (Cloudflare 캐시 우회)
   * 대시보드 페이지: 생략 가능 (URL fetch 방식 fallback)
   */
  challengeJson?: string;
}

const STYLE = {
  "--altcha-border-radius": "10px",
  "--altcha-border-width": "1px",
  "--altcha-color-border": "var(--color-hairline-strong)",
  "--altcha-max-width": "100%",
  width: "100%",
} as React.CSSProperties;

export function AltchaWidget({ name = "altcha", challengeJson }: AltchaWidgetProps) {
  // challengeJson이 있으면 inline JSON 모드 (네트워크 요청 없음)
  if (challengeJson) {
    return (
      <>
        <Script src="/altcha/altcha.min.js" strategy="afterInteractive" />
        {React.createElement("altcha-widget", {
          // JSON 문자열이 '{'로 시작하면 altcha가 URL이 아닌 inline JSON으로 처리
          challenge: challengeJson,
          verifyurl: "/api/verify",
          name,
          auto: "onload",
          hidefooter: "",
          style: STYLE,
        })}
      </>
    );
  }

  // challengeJson 없으면 URL fetch 방식 (대시보드 페이지용)
  return <AltchaWidgetURL name={name} />;
}

/** 대시보드 모달용: 마운트 후 timestamp URL로 fresh challenge fetch */
function AltchaWidgetURL({ name }: { name: string }) {
  const [challengeUrl, setChallengeUrl] = useState<string | null>(null);

  useEffect(() => {
    // timestamp 붙여서 Cloudflare가 이 URL을 절대 캐시 못하게 함
    setChallengeUrl(`/api/challenge?_=${Date.now()}`);
  }, []);

  if (!challengeUrl) return null;

  return (
    <>
      <Script src="/altcha/altcha.min.js" strategy="afterInteractive" />
      {React.createElement("altcha-widget", {
        challenge: challengeUrl,
        verifyurl: "/api/verify",
        name,
        auto: "onload",
        hidefooter: "",
        style: STYLE,
      })}
    </>
  );
}
