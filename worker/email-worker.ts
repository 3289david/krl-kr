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
    let rawBytes: Uint8Array;
    try {
      rawBytes = await streamToBytes(message.raw);
    } catch (err) {
      console.error("[email-worker] Failed to read raw email:", err);
      message.setReject("Failed to read message body");
      return;
    }

    // Decode raw bytes as latin-1 (byte-safe for MIME parsing)
    const rawEmail = bytesToLatin1(rawBytes);

    // Flatten headers into a plain object
    const headersObj: Record<string, string> = {};
    message.headers.forEach((value: string, key: string) => {
      headersObj[key.toLowerCase()] = value;
    });

    // Subject — try message.headers first (Cloudflare may decode it), then raw headers
    const rawSubject =
      message.headers.get("subject") ??
      headersObj["subject"] ??
      "(제목 없음)";

    // Decode RFC 2047 encoded-words (=?UTF-8?B?...?= or =?UTF-8?Q?...?=)
    const subject = decodeEncodedWords(rawSubject);

    // Parse MIME body
    const { bodyText, bodyHtml } = parseEmailBody(rawEmail);

    // ── POST to KRL.KR VPS API ───────────────────────────────────────────────
    try {
      const resp = await fetch(`${env.APP_URL}/api/v1/email/receive`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Worker-Secret": env.WORKER_SECRET ?? "",
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
 * Read a ReadableStream<Uint8Array> to a Uint8Array (raw bytes).
 */
async function streamToBytes(
  stream: ReadableStream<Uint8Array>
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}

/**
 * Convert raw bytes to a latin-1 string (byte-safe).
 * MIME boundary detection and base64/QP content are handled in the byte domain
 * so we need to preserve byte values 0-255 as characters.
 */
function bytesToLatin1(bytes: Uint8Array): string {
  let s = "";
  // Process in chunks to avoid stack overflow for large emails
  const CHUNK = 32768;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return s;
}

/**
 * Decode RFC 2047 encoded-words in email header values.
 * Handles both Base64 (B) and Quoted-Printable (Q) encodings.
 * Example: =?UTF-8?B?7ZWcIDi7mOyKpA==?= → "한글 제목"
 */
function decodeEncodedWords(text: string): string {
  // Remove folding whitespace between encoded words
  const unfolded = text.replace(/\?=\s+=\?/g, "?==?");

  return unfolded.replace(
    /=\?([^?]+)\?([BQbq])\?([^?]*)\?=/g,
    (_match, charset: string, encoding: string, encoded: string) => {
      try {
        const charsetNorm = charset.trim().toLowerCase();
        const enc = encoding.toUpperCase();

        if (enc === "B") {
          // Base64 encoded
          const binary = atob(encoded);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          return new TextDecoder(charsetNorm, { fatal: false }).decode(bytes);
        } else if (enc === "Q") {
          // Quoted-Printable encoded (RFC 2047 variant — underscore = space)
          const qp = encoded.replace(/_/g, " ");
          const bytes: number[] = [];
          let i = 0;
          while (i < qp.length) {
            if (qp[i] === "=" && i + 2 < qp.length) {
              bytes.push(parseInt(qp.slice(i + 1, i + 3), 16));
              i += 3;
            } else {
              bytes.push(qp.charCodeAt(i));
              i++;
            }
          }
          return new TextDecoder(charsetNorm, { fatal: false }).decode(
            new Uint8Array(bytes)
          );
        }
      } catch {
        // Decoding failed — return original encoded word
      }
      return _match;
    }
  );
}

/**
 * Decode a base64 body part, producing a UTF-8 string.
 */
function decodeBase64Body(b64: string, charset: string): string {
  try {
    const clean = b64.replace(/\s+/g, "");
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder(charset || "utf-8", { fatal: false }).decode(bytes);
  } catch {
    return b64;
  }
}

/**
 * Decode a quoted-printable body part with proper multibyte (UTF-8) support.
 */
function decodeQuotedPrintableBody(text: string, charset: string): string {
  // Remove soft line breaks (=\n or =\r\n)
  const clean = text.replace(/=\r?\n/g, "");

  const bytes: number[] = [];
  let i = 0;
  while (i < clean.length) {
    if (clean[i] === "=" && i + 2 < clean.length && /[0-9A-Fa-f]{2}/.test(clean.slice(i + 1, i + 3))) {
      bytes.push(parseInt(clean.slice(i + 1, i + 3), 16));
      i += 3;
    } else {
      bytes.push(clean.charCodeAt(i) & 0xff);
      i++;
    }
  }

  return new TextDecoder(charset || "utf-8", { fatal: false }).decode(
    new Uint8Array(bytes)
  );
}

/**
 * Decode a MIME body part according to Content-Transfer-Encoding.
 * Also extracts the charset from the Content-Type header for correct decoding.
 */
function decodeBody(body: string, headers: string): string {
  const lh = headers.toLowerCase();

  // Extract charset from Content-Type (e.g., charset="euc-kr" or charset=utf-8)
  const charsetMatch = lh.match(/charset=["']?([^"';\s\n]+)["']?/);
  const charset = charsetMatch?.[1]?.trim() ?? "utf-8";

  // Extract Content-Transfer-Encoding (be robust to extra whitespace)
  const cteMatch = lh.match(/content-transfer-encoding:\s*(\S+)/);
  const cte = cteMatch?.[1]?.toLowerCase() ?? "7bit";

  if (cte === "base64") {
    return decodeBase64Body(body, charset);
  }

  if (cte === "quoted-printable") {
    return decodeQuotedPrintableBody(body, charset);
  }

  // 7bit / 8bit / binary — interpret as the declared charset
  if (charset && charset !== "utf-8" && charset !== "us-ascii") {
    try {
      const bytes = new Uint8Array(body.length);
      for (let i = 0; i < body.length; i++) {
        bytes[i] = body.charCodeAt(i) & 0xff;
      }
      return new TextDecoder(charset, { fatal: false }).decode(bytes);
    } catch {
      // Fall through to return as-is
    }
  }

  return body;
}

/**
 * Minimal MIME email body parser.
 * Supports:
 *   - Simple (non-multipart) emails
 *   - multipart/alternative with text/plain and text/html parts
 *   - base64 and quoted-printable content-transfer-encoding
 *   - Nested multipart (takes the first matching part at any depth)
 *   - UTF-8, EUC-KR, and other charsets
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

  const topHeaders = normalized.substring(0, headerBodySplit);

  // Check for a boundary (multipart)
  const topHeadersLower = topHeaders.toLowerCase();
  const boundaryMatch =
    topHeadersLower.match(/content-type:[^\n]*boundary=["']?([^"'\n;]+)["']?/i) ??
    normalized.match(/boundary=["']?([^"'\n;]+)["']?/i);

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
