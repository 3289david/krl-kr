/**
 * rukkit.workers.dev — KRL.KR Email Worker
 *
 * Receives ALL emails sent to *@krl.kr via Cloudflare Email Routing,
 * parses them, and stores them in the KRL.KR database by calling
 * https://krl.kr/api/v1/email/receive
 *
 * Setup:
 *   1. Cloudflare Dashboard → Email Routing → Routing Rules
 *      Add catch-all rule: *@krl.kr → Send to Worker → this worker
 *   2. Add secret WORKER_SECRET in Workers → Settings → Variables
 *      Value: 992dead654b94aba5a0ef595fea7498d76c46ad1bbee62307b3eb35b77fcd5b4
 *   3. Deploy: wrangler deploy
 */

const KRL_API = "https://krl.kr/api/v1/email/receive";

// ─── Read ReadableStream into ArrayBuffer ─────────────────────────────────────
async function streamToBuffer(stream, size) {
  const buf = new Uint8Array(size);
  let offset = 0;
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf.set(value, offset);
    offset += value.length;
  }
  return buf.buffer;
}

// ─── Simple RFC822 parser (no external deps needed) ──────────────────────────
function parseEmail(raw) {
  const text = typeof raw === "string" ? raw : new TextDecoder("utf-8", { fatal: false }).decode(raw);

  // Split headers from body
  const headerBodySep = text.indexOf("\r\n\r\n");
  const headerSection = headerBodySep >= 0 ? text.slice(0, headerBodySep) : text;
  const rawBody = headerBodySep >= 0 ? text.slice(headerBodySep + 4) : "";

  // Parse headers into a map
  const headers = {};
  const headerLines = headerSection.replace(/\r\n\t/g, " ").replace(/\r\n /g, " ").split("\r\n");
  for (const line of headerLines) {
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const val = line.slice(idx + 1).trim();
    headers[key] = val;
  }

  // Decode subject (handle RFC2047 encoded words like =?UTF-8?B?...?=)
  let subject = headers["subject"] || "";
  subject = subject.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, charset, encoding, encoded) => {
    try {
      if (encoding.toUpperCase() === "B") {
        const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
        return new TextDecoder(charset).decode(bytes);
      } else {
        return decodeURIComponent(encoded.replace(/_/g, " ").replace(/=([A-Fa-f0-9]{2})/g, (_, h) => "%" + h));
      }
    } catch {
      return encoded;
    }
  });

  // Find content-type and boundary
  const contentType = headers["content-type"] || "text/plain";
  const boundaryMatch = contentType.match(/boundary="?([^";]+)"?/i);
  const boundary = boundaryMatch ? boundaryMatch[1] : null;

  let bodyText = "";
  let bodyHtml = "";

  if (boundary) {
    // Multipart — split by boundary
    const parts = rawBody.split(`--${boundary}`);
    for (const part of parts) {
      if (part.startsWith("--") || part.trim() === "") continue;
      const partSep = part.indexOf("\r\n\r\n");
      if (partSep < 0) continue;
      const partHeaderText = part.slice(0, partSep);
      const partBody = part.slice(partSep + 4).replace(/\r\n--.*$/, "").trimEnd();

      const partHeaders = {};
      for (const line of partHeaderText.replace(/\r\n\t/g, " ").replace(/\r\n /g, " ").split("\r\n")) {
        const i = line.indexOf(":");
        if (i < 0) continue;
        partHeaders[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
      }

      const partCT = partHeaders["content-type"] || "";
      const partEnc = (partHeaders["content-transfer-encoding"] || "").toLowerCase();

      let decoded = partBody;
      if (partEnc === "base64") {
        try { decoded = new TextDecoder().decode(Uint8Array.from(atob(partBody.replace(/\s/g, "")), (c) => c.charCodeAt(0))); } catch { decoded = partBody; }
      } else if (partEnc === "quoted-printable") {
        decoded = partBody.replace(/=\r\n/g, "").replace(/=([A-Fa-f0-9]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
      }

      if (partCT.includes("text/plain") && !bodyText) bodyText = decoded;
      if (partCT.includes("text/html") && !bodyHtml) bodyHtml = decoded;
    }
  } else {
    // Single part
    const enc = (headers["content-transfer-encoding"] || "").toLowerCase();
    let decoded = rawBody;
    if (enc === "base64") {
      try { decoded = new TextDecoder().decode(Uint8Array.from(atob(rawBody.replace(/\s/g, "")), (c) => c.charCodeAt(0))); } catch {}
    } else if (enc === "quoted-printable") {
      decoded = rawBody.replace(/=\r\n/g, "").replace(/=([A-Fa-f0-9]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    }
    if (contentType.includes("text/html")) bodyHtml = decoded;
    else bodyText = decoded;
  }

  return { subject, bodyText: bodyText.trim(), bodyHtml: bodyHtml.trim(), headers };
}

// ─── Email event handler ──────────────────────────────────────────────────────
export default {
  // Handle incoming HTTP requests (existing worker functionality preserved)
  async fetch(request, env, ctx) {
    return new Response("rukkit worker ok", { status: 200 });
  },

  // Handle incoming email
  async email(message, env, ctx) {
    const start = Date.now();
    const alias = message.to.split("@")[0].toLowerCase().trim();

    console.log(`[Email Worker] Received email for alias: ${alias} from ${message.from}`);

    try {
      // Read raw email bytes
      const rawBuffer = await streamToBuffer(message.raw, message.rawSize);
      const { subject, bodyText, bodyHtml, headers } = parseEmail(rawBuffer);

      // Call KRL.KR receive API
      const res = await fetch(KRL_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Worker-Secret": env.WORKER_SECRET || "",
        },
        body: JSON.stringify({
          alias,
          from_address: message.from,
          to_address: message.to,
          subject,
          body_text: bodyText,
          body_html: bodyHtml,
          headers,
          size: message.rawSize,
          received_at: Date.now(),
        }),
      });

      if (res.ok) {
        const result = await res.json();
        console.log(`[Email Worker] Stored: id=${result.id} alias=${alias} (${Date.now() - start}ms)`);
      } else {
        const errText = await res.text();
        console.error(`[Email Worker] API error ${res.status}: ${errText}`);
      }
    } catch (err) {
      console.error(`[Email Worker] Exception for ${alias}:`, err);
    }
  },
};
