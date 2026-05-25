/**
 * KRL.KR — Cloudflare Email Worker
 *
 * Receives ALL emails sent to *@krl.kr via Cloudflare Email Routing.
 * Parses the raw email (MIME) and forwards the data to the KRL.KR VPS API
 * for storage. Users then view their inbox at /dashboard/email.
 *
 * Cloudflare Dashboard setup:
 *   Email > Email Routing > Routing Rules
 *   → Catch-all rule: *@krl.kr → Worker (this worker)
 *
 * Deploy:
 *   wrangler deploy --config wrangler.email.toml
 *
 * Secret (set once, never commit):
 *   wrangler secret put WORKER_SECRET --config wrangler.email.toml
 */

export interface EmailEnv {
  APP_URL: string;
  WORKER_SECRET: string;
}

/**
 * Cloudflare Email Workers – ForwardableEmailMessage
 * (matches the runtime API; mirrors @cloudflare/workers-types)
 */
interface ForwardableEmailMessage {
  readonly from: string;
  readonly to: string;
  readonly headers: Headers;
  readonly raw: ReadableStream<Uint8Array>;
  readonly rawSize: number;
  setReject(reason: string): void;
  forward(rcptTo: string, headers?: Headers): Promise<void>;
}

export default {
  /**
   * `email` handler — invoked by Cloudflare for every inbound email.
   */
  async email(
    message: ForwardableEmailMessage,
    env: EmailEnv,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _ctx: any
  ): Promise<void> {
    const to = message.to;
    const from = message.from;

    // Extract alias: danwoo@krl.kr  →  "danwoo"
    const alias = to.split("@")[0]?.toLowerCase() ?? "";

    if (!alias) {
      message.setReject("Invalid recipient");
      return;
    }

    // Read raw email bytes (Cloudflare limit: 10 MB)
    let rawEmail: string;
    try {
      rawEmail = await streamToText(message.raw);
    } catch (err) {
      console.error("[email-worker] Failed to read raw email:", err);
      message.setReject("Failed to read message body");
      return;
    }

    // Flatten headers into a plain object
    const headersObj: Record<string, string> = {};
    message.headers.forEach((value: string, key: string) => {
      headersObj[key.toLowerCase()] = value;
    });

    // Subject (fallback if missing)
    const subject =
      message.headers.get("subject") ??
      headersObj["subject"] ??
      "(제목 없음)";

    // Parse MIME body
    const { bodyText, bodyHtml } = parseEmailBody(rawEmail);

    // ── POST to KRL.KR VPS API ───────────────────────────────────────────────
    try {
      const resp = await fetch(`${env.APP_URL}/api/v1/email/receive`, {
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

      if (!resp.ok) {
        const body = await resp.text().catch(() => "(no body)");
        console.error(
          `[email-worker] API error ${resp.status}: ${body}`
        );
        // Don't reject the message — delivery already happened at the SMTP layer.
        // Cloudflare won't retry, so we silently log.
      } else {
        console.log(
          `[email-worker] Stored email for alias "${alias}" (${message.rawSize} bytes)`
        );
      }
    } catch (err) {
      console.error("[email-worker] Network error sending to API:", err);
      // Same reasoning as above — don't reject.
    }
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Read a ReadableStream<Uint8Array> to a UTF-8 string.
 */
async function streamToText(
  stream: ReadableStream<Uint8Array>
): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  // Concatenate all chunks
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

/**
 * Minimal MIME email body parser.
 * Supports:
 *   - Simple (non-multipart) emails
 *   - multipart/alternative with text/plain and text/html parts
 *   - base64 and quoted-printable content-transfer-encoding
 *   - Nested multipart (takes the first matching part at any depth)
 */
function parseEmailBody(raw: string): {
  bodyText: string;
  bodyHtml: string;
} {
  let bodyText = "";
  let bodyHtml = "";

  // Normalize line endings
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Split header section from the first body
  const headerBodySplit = normalized.indexOf("\n\n");
  if (headerBodySplit === -1) {
    return { bodyText: normalized.trim(), bodyHtml: "" };
  }

  const topHeaders = normalized.substring(0, headerBodySplit).toLowerCase();

  // Check for a boundary (multipart)
  const boundaryMatch = topHeaders.match(
    /content-type:[^\n]*boundary=["']?([^"'\n;]+)["']?/i
  ) ?? normalized.match(/boundary=["']?([^"'\n;]+)["']?/i);

  if (!boundaryMatch) {
    // Plain (non-multipart) message
    const body = normalized.substring(headerBodySplit + 2);
    bodyText = decodeBody(body, topHeaders).trim();
    return { bodyText, bodyHtml };
  }

  const boundary = boundaryMatch[1].trim();
  parseParts(normalized, boundary, (partHeaders, partBody) => {
    const ct = partHeaders.match(/content-type:\s*([^\n;]+)/i)?.[1]?.trim() ?? "";
    const lct = ct.toLowerCase();

    if (!bodyText && lct.startsWith("text/plain")) {
      bodyText = decodeBody(partBody, partHeaders).trim();
    } else if (!bodyHtml && lct.startsWith("text/html")) {
      bodyHtml = decodeBody(partBody, partHeaders).trim();
    } else if (lct.startsWith("multipart/")) {
      // Nested multipart — recurse
      const innerBoundaryMatch = partHeaders.match(
        /boundary=["']?([^"'\n;]+)["']?/i
      );
      if (innerBoundaryMatch) {
        const innerBoundary = innerBoundaryMatch[1].trim();
        parseParts(partBody, innerBoundary, (ih, ib) => {
          const ict = (ih.match(/content-type:\s*([^\n;]+)/i)?.[1] ?? "").trim().toLowerCase();
          if (!bodyText && ict.startsWith("text/plain")) {
            bodyText = decodeBody(ib, ih).trim();
          } else if (!bodyHtml && ict.startsWith("text/html")) {
            bodyHtml = decodeBody(ib, ih).trim();
          }
        });
      }
    }
  });

  return { bodyText, bodyHtml };
}

/**
 * Iterate over MIME parts separated by `--boundary`.
 * Calls `callback(headers, body)` for each complete part.
 */
function parseParts(
  text: string,
  boundary: string,
  callback: (partHeaders: string, partBody: string) => void
): void {
  const delimiter = `\n--${boundary}`;
  const parts = text.split(delimiter);

  for (const part of parts) {
    // Skip preamble, epilogue, and end boundary ("--")
    const trimmed = part.trimStart();
    if (trimmed.startsWith("--") || trimmed.trim() === "") continue;

    // Strip any leading newline after boundary marker
    const clean = trimmed.startsWith("\n") ? trimmed.substring(1) : trimmed;

    const sepIdx = clean.indexOf("\n\n");
    if (sepIdx === -1) continue;

    const partHeaders = clean.substring(0, sepIdx);
    const partBody = clean.substring(sepIdx + 2);

    callback(partHeaders, partBody);
  }
}

/**
 * Decode a MIME body part according to Content-Transfer-Encoding.
 */
function decodeBody(body: string, headers: string): string {
  const lh = headers.toLowerCase();

  if (lh.includes("content-transfer-encoding: base64")) {
    try {
      // Remove all whitespace before decoding
      return atob(body.replace(/\s+/g, ""));
    } catch {
      return body;
    }
  }

  if (lh.includes("content-transfer-encoding: quoted-printable")) {
    return body
      .replace(/=\n/g, "")          // soft line breaks
      .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      );
  }

  return body;
}
