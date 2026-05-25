/**
 * KRL.KR — Email Service
 * Uses Nodemailer with SMTP for transactional emails.
 * For email alias forwarding, uses Cloudflare Email Routing API.
 */
import nodemailer from "nodemailer";

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT ?? "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return _transporter;
}

const FROM = process.env.SMTP_FROM ?? "noreply@krl.kr";
const APP_URL = process.env.APP_URL ?? "https://krl.kr";

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  try {
    await getTransporter().sendMail({
      from: `KRL.KR <${FROM}>`,
      to: email,
      subject: "KRL.KR에 오신 것을 환영합니다!",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; color: #141413;">안녕하세요, ${name || "새 회원"}님!</h1>
          <p style="color: #696969; line-height: 1.6;">KRL.KR에 가입해 주셔서 감사합니다. 이제 URL 단축, QR 코드 생성, 파일 공유 등 다양한 서비스를 이용하실 수 있습니다.</p>
          <a href="${APP_URL}/dashboard" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #141413; color: #F3F0EE; border-radius: 9999px; text-decoration: none; font-weight: 500;">대시보드 바로가기</a>
          <p style="margin-top: 40px; font-size: 13px; color: #B5B2AF;">KRL.KR · <a href="${APP_URL}/legal/privacy" style="color: #696969;">개인정보처리방침</a></p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send welcome email:", err);
  }
}

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<void> {
  const resetUrl = `${APP_URL}/auth/reset-password?token=${token}`;
  try {
    await getTransporter().sendMail({
      from: `KRL.KR <${FROM}>`,
      to: email,
      subject: "KRL.KR 비밀번호 재설정",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; color: #141413;">비밀번호 재설정</h1>
          <p style="color: #696969; line-height: 1.6;">비밀번호 재설정을 요청하셨습니다. 아래 링크를 클릭하여 새 비밀번호를 설정하세요. 링크는 1시간 후 만료됩니다.</p>
          <a href="${resetUrl}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #141413; color: #F3F0EE; border-radius: 9999px; text-decoration: none; font-weight: 500;">비밀번호 재설정</a>
          <p style="margin-top: 20px; font-size: 13px; color: #B5B2AF;">이 요청을 본인이 하지 않았다면 이 이메일을 무시하세요.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send password reset email:", err);
  }
}

// ─── Cloudflare Email Routing (for alias forwarding) ─────────────────────────

interface CFEmailRule {
  matchers: Array<{ type: string; field: string; value: string }>;
  actions: Array<{ type: string; value: string[] }>;
  enabled: boolean;
  name: string;
  priority: number;
}

export async function createEmailForwardingRule(
  alias: string,
  forwardTo: string
): Promise<{ ruleId: string | null; error?: string }> {
  const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;
  const cfZoneId = process.env.CLOUDFLARE_ZONE_ID;

  if (!cfApiToken || !cfZoneId) {
    return { ruleId: null, error: "Cloudflare API not configured" };
  }

  const aliasEmail = `${alias}@krl.kr`;
  const rule: CFEmailRule = {
    matchers: [{ type: "literal", field: "to", value: aliasEmail }],
    actions: [{ type: "forward", value: [forwardTo] }],
    enabled: true,
    name: `KRL alias: ${alias}`,
    priority: 1,
  };

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/email/routing/rules`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfApiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rule),
      }
    );
    const data = await res.json() as { success: boolean; result?: { tag: string } };
    if (!data.success) return { ruleId: null, error: "Failed to create rule" };
    return { ruleId: data.result?.tag ?? null };
  } catch (err) {
    return { ruleId: null, error: String(err) };
  }
}

export async function deleteEmailForwardingRule(ruleId: string): Promise<void> {
  const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;
  const cfZoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!cfApiToken || !cfZoneId) return;

  try {
    await fetch(
      `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/email/routing/rules/${ruleId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${cfApiToken}` },
      }
    );
  } catch {}
}
