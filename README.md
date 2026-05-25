# KRL.KR — 스마트한 링크 단축 플랫폼

> URL 단축, 분석, QR 코드, 서브도메인, 개발자 도구 — 모든 링크를 한 곳에서.

**Stack:** Next.js 15 · Cloudflare Pages · Cloudflare D1 · Cloudflare KV · Cloudflare R2 · TypeScript · Tailwind CSS 4

---

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. Cloudflare D1 데이터베이스 생성

```bash
# D1 DB 생성
wrangler d1 create krl-kr-db

# KV Namespace 생성
wrangler kv:namespace create URL_CACHE

# R2 버킷 생성
wrangler r2 bucket create krl-kr-storage
```

생성된 ID를 `wrangler.toml`에 입력하세요.

### 3. 마이그레이션 실행

```bash
# 로컬 개발 DB
wrangler d1 execute krl-kr-db --file=migrations/0001_init.sql --local

# 프로덕션 DB
wrangler d1 execute krl-kr-db --file=migrations/0001_init.sql
```

### 4. 환경 변수 설정

`wrangler.toml`에서 `JWT_SECRET`을 안전한 랜덤 문자열로 교체하세요:

```bash
openssl rand -base64 32
```

### 5. 개발 서버 시작

```bash
npm run dev
```

---

## 배포

### Cloudflare Pages (Next.js 앱)

```bash
npm run build
npx wrangler pages deploy .next
```

### Cloudflare Worker (엣지 리다이렉트)

```bash
wrangler deploy worker/index.ts
```

---

## DNS 설정 (KRL.KR 도메인)

Cloudflare Dashboard에서:

```
krl.kr          A     192.0.2.1  (Cloudflare Pages IP)
www.krl.kr      CNAME krl.kr
*.krl.kr        CNAME krl.kr     (서브도메인 서비스용)
```

### Workers Route

```
krl.kr/*  → krl-kr-worker
```

---

## 기능 목록

| 기능 | 상태 | 설명 |
|------|------|------|
| URL 단축 | ✅ | 커스텀 슬러그, 만료, 비밀번호 |
| 클릭 분석 | ✅ | 국가, 디바이스, 브라우저, 유입 경로 |
| QR 코드 | ✅ | SVG/PNG, 스타일 커스텀 |
| 다이나믹 링크 | ✅ | 목적지 URL 변경 가능 |
| 앱 링크 | ✅ | iOS/Android 자동 분기 |
| Geo 리다이렉트 | ✅ | 국가별 다른 URL |
| API | ✅ | REST API + API 키 |
| 대시보드 | ✅ | 링크 관리, 분석 |
| 이용약관 | ✅ | 한국어, 법적 요건 충족 |
| 개인정보처리방침 | ✅ | PIPA 준수 |
| 파일 공유 | 🔧 | 구현 예정 |
| Pastebin | 🔧 | 구현 예정 |
| 서브도메인 서비스 | 🔧 | 구현 예정 |
| Link-in-bio | 🔧 | 구현 예정 |
| 웹훅 인스펙터 | 🔧 | 구현 예정 |

---

## API 문서

### URL 단축

```http
POST /api/v1/shorten
Content-Type: application/json
X-API-Key: krl_your_api_key  (선택)

{
  "url": "https://example.com/very-long-url",
  "slug": "my-link",         // 선택: 커스텀 슬러그
  "title": "이벤트 페이지",   // 선택
  "password": "1234",        // 선택: 비밀번호 보호
  "expires_at": "2025-12-31T23:59:59Z",  // 선택
  "max_clicks": 100,         // 선택: 최대 클릭 수
  "is_dynamic": true,        // 선택: 다이나믹 링크
  "ios_url": "https://apps.apple.com/...",  // 선택
  "android_url": "https://play.google.com/..."  // 선택
}
```

**응답:**

```json
{
  "id": "lnk_abc123",
  "slug": "my-link",
  "short_url": "https://krl.kr/my-link",
  "original_url": "https://example.com/very-long-url",
  "qr_url": "https://krl.kr/api/qr/my-link",
  "created_at": "2025-05-25T00:00:00.000Z"
}
```

### QR 코드

```http
GET /api/qr/{slug}?format=svg&size=400&fg=%23141413&bg=%23ffffff
```

| 파라미터 | 기본값 | 설명 |
|---------|-------|------|
| format | svg | `svg` 또는 `png` |
| size | 400 | 100~1000px |
| fg | #141413 | 전경색 |
| bg | #ffffff | 배경색 |
| margin | 2 | 여백 0~10 |

---

## 프로젝트 구조

```
krl-kr/
├── src/
│   ├── app/
│   │   ├── (marketing)/     # 랜딩 페이지, 법적 고지
│   │   ├── (auth)/          # 로그인, 회원가입
│   │   ├── (dashboard)/     # 대시보드
│   │   ├── [slug]/          # URL 리다이렉트
│   │   └── api/             # REST API
│   ├── components/          # React 컴포넌트
│   │   ├── icons/           # SVG 아이콘
│   │   └── marketing/       # 마케팅 컴포넌트
│   └── lib/
│       ├── auth.ts          # JWT 인증
│       ├── db/              # D1 데이터베이스
│       ├── qr.ts            # QR 코드 생성
│       └── utils.ts         # 유틸리티
├── worker/
│   └── index.ts             # Cloudflare 엣지 워커
├── migrations/
│   └── 0001_init.sql        # DB 스키마
└── wrangler.toml            # Cloudflare 설정
```

---

## 라이선스

Copyright © 2025 KRL.KR. All rights reserved.
