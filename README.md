# KRL.KR

> 링크를 더 스마트하게. URL 단축 + QR + 분석 + 서브도메인 + 개발자 도구 올인원 플랫폼

[English](#english) | 한국어

---

## 기능 (Features)

### URL 단축
- 커스텀 슬러그 (`krl.kr/youtube`)
- 만료 날짜 / 시간
- 비밀번호 보호
- 최대 클릭 수 제한
- 다이나믹 링크 (목적지 변경 가능)

### 분석 (Analytics)
- 실시간 클릭 추적
- 국가 / 지역별 분포
- 디바이스 / 브라우저 통계
- 유입 경로 분석
- 일별 클릭 차트

### QR 코드
- SVG / PNG 다운로드
- 색상 / 크기 커스텀
- 다이나믹 QR (링크 변경 시 QR 그대로)
- 스캔 통계

### 서브도메인 서비스
- `danwoo.krl.kr` — GitHub Pages / Vercel / HTML / 리다이렉트 연결
- 4글자 이상 슬러그만 허용
- Cloudflare DNS API로 즉시 활성화

### 개발자 도구
- **Pastebin** — 코드/로그 공유, 만료 링크, 비밀번호
- **파일 공유** — 드래그앤드롭, 만료, 다운로드 제한
- **웹훅 인스펙터** — 실시간 HTTP 요청 모니터링
- **JSON 호스팅** — Mock API, 설정 파일 즉시 배포
- **REST API** — 완전한 API, API 키 인증

### 기타
- **Link-in-bio** — `krl.kr/bio/@danwoo`
- **이메일 별칭** — `name@krl.kr` (Cloudflare Email Routing)
- **앱 링크** — iOS/Android 자동 분기
- **엣지 리다이렉트 룰** — 국가/디바이스 기반 분기

---

## 아키텍처

```
+---------------------------------------------+
|                   VPS (주 서버)               |
|                                             |
|  +--------------+  +-------------------+   |
|  |  Next.js App  |  |   PostgreSQL DB    |   |
|  |  (Port 3000)  |  |   (Port 5432)     |   |
|  +--------------+  +-------------------+   |
|                                             |
|  +--------------+  +-------------------+   |
|  |    Redis      |  |  Local Storage    |   |
|  |  (Port 6379)  |  |  /var/uploads/    |   |
|  +--------------+  +-------------------+   |
+---------------------------------------------+
              ^ Nginx (Port 80/443)

Cloudflare (선택적):
- DNS 프록시 (CDN + DDoS 방어)
- 서브도메인 DNS 레코드 생성 API
- 이메일 포워딩 룰 생성 API
```

---

## 빠른 시작 (Docker Compose)

```bash
git clone https://github.com/3289david/krl-kr
cd krl-kr
cp .env.example .env.local
# .env.local 파일을 편집하세요

docker-compose up -d
```

마이그레이션은 자동으로 실행됩니다 (`docker-entrypoint-initdb.d/`).

---

## 수동 설치

### 1. 의존성

```bash
# Ubuntu/Debian
apt install -y nodejs npm postgresql redis-server nginx

# Node.js 최신 버전 (권장)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### 2. 데이터베이스 설정

```bash
sudo -u postgres psql
CREATE USER krlkr WITH PASSWORD 'yourpassword';
CREATE DATABASE krlkr OWNER krlkr;
\q

psql postgresql://krlkr:yourpassword@localhost/krlkr -f migrations/0001_init_postgres.sql
```

### 3. 앱 설치

```bash
git clone https://github.com/3289david/krl-kr /var/www/krl-kr
cd /var/www/krl-kr
npm install
cp .env.example .env.local
nano .env.local  # 환경변수 수정

npm run build
npm start
```

### 4. Nginx 설정

```nginx
server {
    listen 80;
    server_name krl.kr www.krl.kr;

    client_max_body_size 500M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 업로드 파일 직접 서빙
    location /uploads/ {
        alias /var/www/krl-kr/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 5. Systemd 서비스

```ini
[Unit]
Description=KRL.KR
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/krl-kr
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=on-failure
Environment=NODE_ENV=production
EnvironmentFile=/var/www/krl-kr/.env.local

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable krl-kr
systemctl start krl-kr
```

---

## 환경변수

| 변수 | 설명 | 필수 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 연결 URL | 필수 |
| `REDIS_URL` | Redis 연결 URL | 필수 |
| `JWT_SECRET` | JWT 서명 비밀키 (64자+) | 필수 |
| `APP_URL` | 앱 기본 URL | 필수 |
| `SMTP_HOST` | SMTP 서버 주소 | 필수 |
| `SMTP_USER` | SMTP 사용자 | 필수 |
| `SMTP_PASS` | SMTP 비밀번호 | 필수 |
| `UPLOAD_DIR` | 파일 업로드 경로 | 선택 |
| `MAX_FILE_SIZE_MB` | 익명 파일 크기 제한 (기본: 100) | 선택 |
| `CLOUDFLARE_API_TOKEN` | CF API 토큰 (서브도메인/이메일 기능) | 선택 |
| `CLOUDFLARE_ZONE_ID` | CF 존 ID | 선택 |

---

## API 레퍼런스

### 인증 불필요 (로그인 없이 사용 가능)

```
POST /api/v1/shorten          URL 단축
POST /api/v1/qr               QR 코드 생성
POST /api/v1/paste            Pastebin 생성
GET  /api/v1/paste/:slug      Paste 조회
POST /api/v1/files            파일 업로드
GET  /api/v1/files/:slug      파일 다운로드
POST /api/v1/webhook          웹훅 엔드포인트 생성
```

### 인증 필요

```
# Authorization: Bearer YOUR_JWT_TOKEN
# 또는 X-API-Key: krl_YOUR_API_KEY

GET    /api/v1/links           내 링크 목록
POST   /api/v1/links           링크 생성
PATCH  /api/v1/links/:id       링크 수정
DELETE /api/v1/links/:id       링크 삭제
GET    /api/v1/links/:id/stats 클릭 분석
GET    /api/auth/me            내 정보
```

### URL 단축 예시

```bash
curl -X POST https://krl.kr/api/v1/shorten \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/very-long-url",
    "slug": "mylink",
    "expires_at": "2025-12-31"
  }'

# 응답
{
  "slug": "mylink",
  "short_url": "https://krl.kr/mylink",
  "id": "lnk_abc123"
}
```

---

## 로그인 없이 사용 가능한 기능

- URL 단축 (시간당 20개 익명 제한)
- QR 코드 생성
- Pastebin (코드/텍스트 공유)
- 파일 공유 (최대 100MB)
- 웹훅 엔드포인트
- Link-in-bio 페이지 조회
- API (기본 기능)

## 로그인 필요 기능

- 클릭 분석 / 통계
- 링크 수정 / 삭제
- 서브도메인 서비스
- 이메일 별칭
- 무제한 파일 (최대 500MB)
- API 키 관리

---

## 개발 환경

```bash
# 의존성 설치
npm install

# 로컬 PostgreSQL + Redis 실행 (Docker)
docker run -d --name krl-pg \
  -e POSTGRES_PASSWORD=krlkr \
  -e POSTGRES_USER=krlkr \
  -e POSTGRES_DB=krlkr \
  -p 5432:5432 postgres:16-alpine

docker run -d --name krl-redis -p 6379:6379 redis:7-alpine

# 스키마 적용
psql postgresql://krlkr:krlkr@localhost/krlkr -f migrations/0001_init_postgres.sql

# .env.local 설정
# DATABASE_URL=postgresql://krlkr:krlkr@localhost/krlkr
# REDIS_URL=redis://localhost:6379
# JWT_SECRET=dev-secret-only-change-in-production

# 개발 서버 시작
npm run dev
```

---

<a name="english"></a>

## English

KRL.KR is an all-in-one link management platform built on VPS with PostgreSQL, Redis, and Next.js 15. Cloudflare is used **optionally** only for:

1. **DNS API** — to create user subdomains (`user.krl.kr`)
2. **Email Routing API** — to set up email alias forwarding
3. **CDN proxy** — optional DDoS protection (user's choice)

All core functionality runs on your own VPS with no Cloudflare dependency.

### Tech Stack

- **Runtime**: Node.js 20 + Next.js 15 App Router
- **Database**: PostgreSQL 16 (via `pg` connection pool)
- **Cache**: Redis 7 (via `ioredis`)
- **Storage**: Local filesystem (`uploads/` directory)
- **Email**: Nodemailer SMTP
- **Auth**: JWT (jose) + PBKDF2 password hashing

### Self-Hosting

1. Clone this repo
2. Set up PostgreSQL and Redis on your VPS
3. Copy `.env.example` to `.env.local` and configure
4. Run `npm install && npm run build && npm start`
5. Set up Nginx as reverse proxy

### Docker Compose

```bash
cp .env.example .env.local
# Edit .env.local
docker-compose up -d
```

### Contributing

PRs welcome. Open an issue first for large changes.

---

Support: [buymeacoffee.com/rukkitofficial](https://buymeacoffee.com/rukkitofficial)

License: MIT
