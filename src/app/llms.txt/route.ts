import { NextResponse } from "next/server";

const LLMS_TXT = `# KRL.KR — LLM Context File
# Generated: ${new Date().toISOString().slice(0, 10)}
# This file helps LLMs understand the KRL.KR API.

## Overview
KRL.KR is a Korean URL shortener and link management platform.
Base URL: https://krl.kr
API Base: https://krl.kr/api/v1
Authentication: Bearer token (API key) via Authorization header or X-API-Key header

## Authentication
All authenticated endpoints require:
  Authorization: Bearer <api_key>
  Content-Type: application/json

API keys are generated in the dashboard at https://krl.kr/dashboard/api-keys

## Core Endpoints

### URL Shortening
POST /api/v1/shorten
  Body: { "url": "https://example.com", "slug": "optional-custom-slug", "title": "optional title" }
  Response: { "short_url": "https://krl.kr/abc", "slug": "abc", "id": "..." }

### Links
GET  /api/v1/links          — List user's links (auth required)
GET  /api/v1/links/:id      — Get single link
POST /api/v1/links          — Create link (same as /shorten but with more options)
PATCH /api/v1/links/:id     — Update link
DELETE /api/v1/links/:id    — Delete link

### Analytics
GET /api/v1/analytics/:linkId            — Click stats for a link
GET /api/v1/analytics/:linkId/countries  — Clicks by country
GET /api/v1/analytics/:linkId/devices    — Clicks by device type

### QR Codes
GET /api/v1/qr/:slug?format=svg|png      — Get QR code for a short link

### Files
POST /api/v1/files       — Upload file (multipart/form-data, max 500MB)
GET  /api/v1/files       — List user's files
DELETE /api/v1/files/:id — Delete file

### Subdomains
GET    /api/v1/subdomains       — List user's subdomains
POST   /api/v1/subdomains       — Create subdomain
PATCH  /api/v1/subdomains/:id   — Update subdomain
DELETE /api/v1/subdomains/:id   — Delete subdomain
Types: redirect | github | vercel | html | api

### Community
GET  /api/v1/community                — List posts (supports ?board=notice|free|feature)
GET  /api/v1/community/:id            — Get single post
POST /api/v1/community                — Create post (auth required)
PATCH /api/v1/community/:id           — Update post (auth required, own post)
DELETE /api/v1/community/:id          — Delete post

### Search (no auth required)
GET /api/v1/search?q=query&category=general&page=1
  — Web search powered by local SearXNG (categories: general, web, images, news, videos, science, map)
  Returns: { query, results: [{url, title, content, engine, score}], suggestions, answers, infoboxes }

### AI Chat (no auth required)
POST /api/v1/ai/chat
  Body: { "messages": [{ "role": "user|assistant", "content": "..." }], "stream": false }
  Returns: { "content": "AI response text" }
  — Supports multi-turn conversation (up to 20 turns)

### AI Search Summary (no auth required)
POST /api/v1/ai/search-summary
  Body: { "query": "search term", "snippets": [{ "title", "content", "url" }] }
  Returns: { "summary": "2-3 sentence AI summary of results" }

### Status
GET /api/v1/status   — Service health check
GET /api/v1/metrics  — Server metrics (CPU, memory, request count)

## Rate Limits
- Public endpoints: 60 req/min per IP
- Authenticated: 300 req/min per API key
- File uploads: 10/hour per user
- Link creation: 50/day (free plan), unlimited (pro)

## Error Format
All errors return: { "error": "message", "code": "ERROR_CODE" }
HTTP status codes: 400 (validation), 401 (auth), 403 (forbidden), 404 (not found), 429 (rate limit), 500 (server error)

## Example: Shorten a URL
curl -X POST https://krl.kr/api/v1/shorten \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer krl_your_api_key" \\
  -d '{"url": "https://example.com/very/long/path"}'

## Example: List Links
curl https://krl.kr/api/v1/links \\
  -H "Authorization: Bearer krl_your_api_key"

## Notes for LLMs
- Short URLs follow pattern: https://krl.kr/{slug} where slug is 4-8 chars
- Custom slugs are allowed (alphanumeric + hyphens, 3-50 chars)
- The platform is Korean-language focused but API is language-agnostic
- Webhook testing: POST requests to /tools/webhook/{id} are captured in real-time
- Bio pages: https://krl.kr/@username shows a link-in-bio page
- Subdomains: https://{name}.krl.kr routes to configured target

## Full API Documentation
https://krl.kr/docs
`;

export async function GET() {
  return new NextResponse(LLMS_TXT, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
