/**
 * 로그인 페이지 — Server Component
 *
 * challenge를 서버에서 생성해서 LoginForm에 prop으로 전달합니다.
 * 브라우저에서 /api/challenge를 fetch하지 않으므로 Cloudflare 캐시 문제 없음.
 */
import { createAltchaChallenge } from "@/lib/altcha";
import { LoginForm } from "./LoginForm";

// 매 요청마다 새로운 challenge를 생성해야 하므로 정적 pre-rendering 금지
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const challenge = await createAltchaChallenge();
  return <LoginForm challengeJson={JSON.stringify(challenge)} />;
}
