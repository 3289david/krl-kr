import type { Metadata } from "next";
import DocsContent from "./DocsContent";

export const metadata: Metadata = {
  title: "API 문서 | KRL.KR",
  description:
    "KRL.KR REST API 문서 — URL 단축, QR 코드, 분석, 파일 공유, 이메일 별칭, 서브도메인 등 모든 기능을 API로 자동화하세요.",
};

export default function DocsPage() {
  return <DocsContent />;
}
