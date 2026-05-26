# KRL.KR

> 무료 링크 단축 · QR 코드 · 파일 공유 · 서브도메인 · 커뮤니티 서비스  
> **[krl.kr](https://krl.kr)** — 한국형 커뮤니티 유틸리티

---

## 주요 기능

### 링크 & QR
| 기능 | 설명 |
|------|------|
| URL 단축 | `krl.kr/abc`, `krl.kr/youtube` — 로그인 없이 바로 사용 |
| 원하는 주소 설정 | `krl.kr/내주소` 형태로 직접 설정 |
| 다이나믹 링크 | QR 코드 유지하면서 목적지 URL 변경 |
| 임시 링크 | 시간 또는 클릭 횟수 후 자동 만료 |
| 앱 링크 | Android/iOS별 다른 주소로 분기 |
| QR 코드 | SVG·PNG 다운로드, 로고 삽입, 색상 변경, 스캔 통계 |

### 파일 & 공유
| 기능 | 설명 |
|------|------|
| 파일 공유 | 드래그앤드롭 업로드, 만료 설정, 다운로드 횟수 제한 |
| 코드·텍스트 공유 | 14개 언어 문법 강조, 만료, 비밀번호 |
| 이메일 수신함 | `이름@krl.kr` 주소로 메일 수신 후 웹에서 확인 |
| 웹훅 테스트 | HTTP 요청 실시간 캡처 및 검사 |

### 웹사이트
| 기능 | 설명 |
|------|------|
| 서브도메인 | `내이름.krl.kr` — GitHub Pages, Vercel, HTML 직접 연결 |
| 즉시 배포 | HTML 파일 업로드 → HTTPS 자동 적용 |
| Link-in-bio | `krl.kr/@닉네임` — 인스타·틱톡 프로필 링크 모음 |
| 임시 서브도메인 | `tmp123.krl.kr` — 테스트용, 1시간 후 자동 삭제 |

### 분석
- 국가·도시별 클릭 분포
- 기기 타입 (데스크톱/모바일/태블릿)
- 브라우저·운영체제
- 유입 경로 추적
- 일별·주별·월별 차트

### 자동화 (API)
- Bearer 토큰 / API 키 인증
- 3,000 요청/일 (인증 사용자)
- JSON 응답
- Discord Bot, CI/CD, 스크립트 연동 가능

---

## 기술 스택

| 항목 | 기술 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) |
| 데이터베이스 | PostgreSQL (VPS) |
| 캐시 | Redis (ioredis) |
| 인증 | JWT (jose) + PBKDF2 해시 |
| 스토리지 | 로컬 디스크 (VPS) |
| Edge | Cloudflare Workers (리다이렉트 캐시) |
| 이메일 | Cloudflare Email Workers |
| 배포 | VPS (Ubuntu) + PM2 |

---

## 로컬 개발

### 요구사항
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### 설정

```bash
# 저장소 복제
git clone https://github.com/3289david/krl-kr.git
cd krl-kr

# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env.local
# .env.local 파일을 편집하여 DATABASE_URL 등 설정

# 개발 서버 실행
npm run dev
```

### 환경변수 (.env.local)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/krlkr
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-64-char-hex-secret
APP_URL=http://localhost:3000
SHORT_DOMAIN=localhost:3000
```

---

## 데이터베이스 초기화

```bash
psql -U postgres -d krlkr -f schema.sql
```

---

## Cloudflare Workers 배포 (선택사항)

Edge 리다이렉트, 이메일 수신, 캐시 관리를 위한 Workers.

```bash
# Edge redirect worker
wrangler deploy

# Email worker
wrangler deploy --config wrangler.email.toml

# Cache management worker
wrangler deploy --config wrangler.cache.toml
```

Workers 시크릿 설정:
```bash
wrangler secret put WORKER_SECRET
wrangler secret put APP_URL
```

---

## 프로덕션 배포 (VPS)

```bash
npm run build
pm2 start ecosystem.config.js
```

---

## 디렉토리 구조

```
src/
├── app/
│   ├── (marketing)/     # 공개 마케팅 페이지
│   ├── (auth)/          # 로그인, 회원가입
│   ├── dashboard/       # 로그인 후 관리 페이지
│   ├── api/             # API 라우트
│   └── [slug]/          # 단축 링크 리다이렉트
├── components/
│   ├── layout/          # SiteHeader, DashboardTabs
│   ├── marketing/       # Footer
│   └── icons/           # SVG 아이콘
├── lib/
│   ├── db/              # PostgreSQL 클라이언트
│   ├── auth.ts          # JWT, 비밀번호 해시
│   ├── redis.ts         # Redis 클라이언트
│   ├── cache.ts         # Cloudflare KV 캐시
│   └── api-error.ts     # API 오류 처리 헬퍼
└── middleware.ts         # 슬러그 라우팅
worker/
├── index.ts             # Edge redirect worker
├── email-worker.ts      # Email receive worker
└── cache-worker.ts      # Cache management worker
```

---

## 기여하기

1. 이슈를 먼저 등록해주세요
2. Fork → 브랜치 생성 → PR
3. 코드 스타일: ESLint + TypeScript strict

---

## 라이선스

MIT License — 자유롭게 사용, 수정, 배포 가능합니다.

---

## 문의

- 이메일: contact@rukkit.net
- GitHub Issues: [github.com/3289david/krl-kr/issues](https://github.com/3289david/krl-kr/issues)
