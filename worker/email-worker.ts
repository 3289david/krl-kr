/**
 * KRL.KR — Cloudflare Email Worker
 *
 * Receives ALL emails sent to *@mail.krl.kr via Cloudflare Email Routing.
 * Parses the email and sends it to the KRL.KR API for storage.
 * Users can then view their inbox at /dashboard/email.
 *
 * Setup in Cloudflare Dashboard:
 * 1. Email > Email Routing > Routing Rules
 * 2. Add catch-all rule: *@mail.krl.kr → Worker (this worker)
 * 3. Deploy: wrangler deploy --config wrangler.email.toml
 */

export interface EmailEnv {
  APP_URL: string;
  WORKER_SECRET: string;
}

interface EmailMessage {
  from: string;
  to: string;
  headers: Headers;
  raw: ReadableStream;
  rawSize: number;
  setReject(reason: string): void;
  forward(rcptTo: string, headers?: Headers): Promise<void>;
}

export default {
  async email(message: EmailMessage, env: EmailEnv): Promise<void> {
    try {
      const to = message.to;
      const from = message.from;

      // Extract alias from recipient (danwoo@mail.krl.kr → "danwoo")
      const alias = to.split("@")[0]?.toLowerCase() ?? "";

      if (!alias) {
        message.setReject("Invalid recipient");
        return;
      }

      // Read raw email (max 10MB)
      const rawEmail = await new Response(message.raw).text();

      // Parse headers
      const headersObj: Record<string, string> = {};
      message.headers.forEach((value: string, key: string) => {
        headersObj[key] = value;
      });

      // Extract subject from headers
      const subject = message.headers.get("subject") ?? "(제목 없음)";

      // Extract body parts
      const { bodyText, bodyHtml } = parseEmailBody(rawEmail);

      // Send to KRL.KR API
      const response = await fetch(`${env.APP_URL}/api/v1/email/receive`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Worker-Secret": env.WORKER_SECRET,
        },
        body: JSON.stringify({
          alias,
          from_address: from,
          to_address: to,
          subject,
          body_text: bodyText,
          body_html: bodyHtml,
          headers: headersObj,
          size: message.rawSize,
          received_at: Date.now(),
        }),
      });

      if (!response.ok) {
        console.error(`Failed to store email: ${response.status} ${await response.text()}`);
      }
    } catch (err) {
      console.error("Email worker error:", err);
    }
  },
};

/**
 * Simple MIME email body parser.
 * Extracts text/plain and text/html parts from raw email.
 */
function parseEmailBody(raw: string): { bodyText: string; bodyHtml: string } {
  let bodyText = "";
  let bodyHtml = "";

  // Find boundary
  const boundaryMatch = raw.match(/boundary=["']?([^"'\r\n;]+)["']?/i);

  if (!boundaryMatch) {
    // Simple non-multipart email
    const headerEnd = raw.indexOf("\r\n\r\n");
    if (headerEnd !== -1) {
      bodyText = raw.substring(headerEnd + 4).trim();
    } else {
      const headerEnd2 = raw.indexOf("\n\n");
      if (headerEnd2 !== -1) {
        bodyText = raw.substring(headerEnd2 + 2).trim();
      }
    }
    return { bodyText, bodyHtml };
  }

  const boundary = boundaryMatch[1];
  const parts = raw.split(`--${boundary}`);

  for (const part of parts) {
    if (part.startsWith("--") || part.trim() === "") continue;

    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;

    const partHeaders = part.substring(0, headerEnd).toLowerCase();
    const partBody = part.substring(headerEnd + 4);

    if (partHeaders.includes("content-type: text/plain")) {
      bodyText = decodeBody(partBody, partHeaders);
    } else if (partHeaders.includes("content-type: text/html")) {
      bodyHtml = decodeBody(partBody, partHeaders);
    }
  }

  return { bodyText, bodyHtml };
}

function decodeBody(body: string, headers: string): string {
  const isBase64 = headers.includes("content-transfer-encoding: base64");
  const isQP = headers.includes("content-transfer-encoding: quoted-printable");

  if (isBase64) {
    try {
      return atob(body.replace(/\s/g, ""));
    } catch {
      return body;
    }
  }

  if (isQP) {
    return body
      .replace(/=\r\n/g, "")
      .replace(/=([0-9A-F]{2})/gi, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      );
  }

  return body.trim();
}
