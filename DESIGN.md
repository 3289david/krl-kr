# KRL.KR — 디자인 시스템

> 개발자와 디자이너가 함께 참고하는 UI/UX 가이드.

---

## 1. 브랜드 원칙

| 원칙 | 설명 |
|------|------|
| **단순함** | 불필요한 장식 없음. 기능이 곧 디자인 |
| **접근성** | 누구나 쉽게 사용 가능. 회원가입 없이도 핵심 기능 사용 |
| **커뮤니티** | 판매하는 제품이 아닌, 함께 쓰는 무료 서비스 |
| **신뢰** | 개인정보 최소 수집. 광고 없음 |

---

## 2. 색상 팔레트

```css
/* 배경 & 표면 */
--color-canvas:          #F3F0EE;  /* 메인 배경 */
--color-white:           #FFFFFF;  /* 카드, 인풋 */
--color-lifted:          #EDE9E6;  /* 탭바, 사이드 영역 */
--color-surface-card:    #E8E4E0;  /* 버튼 배경, 칩 */

/* 텍스트 */
--color-ink:             #141413;  /* 제목, 강조 텍스트 */
--color-body:            #2D2C2A;  /* 본문 */
--color-muted:           #6B6862;  /* 설명, 보조 */
--color-ash:             #9E9A95;  /* placeholder */

/* 선 */
--color-hairline:        rgba(20,20,19,0.08);
--color-hairline-strong: rgba(20,20,19,0.16);

/* 상태 */
--color-success:         #16a34a;
--color-error:           #dc2626;
--color-warning:         #d97706;

/* 다크 영역 */
--color-surface-dark:    #1C1B1A;
```

---

## 3. 타이포그래피

| 폰트 | 용도 | CSS 변수 |
|------|------|----------|
| Geist Sans | 본문, UI | `var(--font-sans)` |
| Geist Mono | 코드, 단축 URL | `var(--font-mono)` |

### 크기 스케일

```
2.75rem  — 페이지 주 제목
2rem     — 섹션 제목
1.5rem   — 카드 제목
1rem     — 본문 기본
0.875rem — 보조, 라벨
0.8125rem — 캡션, 메타 정보
0.75rem  — 업퍼케이스 레이블
```

### 규칙
- 제목: `font-weight: 600`, `letter-spacing: -0.025em`
- 본문: `line-height: 1.6`
- **이모지 사용 금지** — 항상 SVG 아이콘 사용 (`src/components/icons/index.tsx`)

---

## 4. 간격 시스템 (4px 베이스)

```
4px  — 아이콘 간격
8px  — 인라인 요소
12px — 버튼 패딩 수평
16px — 카드 내부 간격
24px — 카드 패딩
32px — 섹션 내 요소 간격
48px — 섹션 간격
64px — 페이지 섹션 패딩
```

---

## 5. 반경 (Border Radius)

```css
--radius-sm:   6px;
--radius-md:   10px;
--radius-lg:   14px;
--radius-xl:   18px;
--radius-pill: 9999px;
```

---

## 6. 그림자

```css
--shadow-nav:   0 2px 12px rgba(20,20,19,0.08);
--shadow-card:  0 4px 20px rgba(20,20,19,0.08);
--shadow-modal: 0 12px 48px rgba(20,20,19,0.16);
```

---

## 7. 버튼 클래스

```html
<button class="btn btn-primary">단축하기</button>
<button class="btn btn-secondary">복사</button>
<button class="btn btn-ghost">취소</button>
<button class="btn btn-primary btn-sm">작은</button>
<button class="btn btn-primary btn-lg">큰</button>
<button class="btn btn-primary btn-pill">알약형</button>
<button class="btn btn-ghost btn-icon"><svg/></button>
```

---

## 8. 네비게이션 구조

```
헤더 (sticky, 52px)
├── KRL.KR (로고)
├── 링크/QR ▼
│   ├── URL 단축기
│   ├── QR 코드
│   ├── 다이나믹 링크
│   ├── 임시 링크
│   └── 앱 링크 (iOS/Android)
├── 공유 ▼
│   ├── 파일 공유
│   ├── 코드·텍스트 공유
│   ├── 이메일 수신함
│   └── 웹훅 테스트
├── 웹사이트 ▼
│   ├── 서브도메인
│   ├── Link-in-bio
│   └── 즉시 배포
├── 커뮤니티
├── API
└── 로그인 | 회원가입 (또는 내 계정 ▼)

대시보드 탭 (로그인 후)
내 링크 | QR 코드 | 파일 공유 | 코드 공유 | 웹훅 | Link-in-bio | 서브도메인 | 받은 메일 | API 키 | 설정
```

---

## 9. 레이아웃

### 마케팅 페이지
```
<SiteHeader />        ← sticky, 52px
<main>
  <section>           ← padding: 64px 24px
    <div.container>   ← max-width: 1100px, margin: 0 auto
```

### 대시보드
```
<SiteHeader />
<DashboardTabs />
<div>                 ← max-width: 1100px, padding: 32px 24px
```

---

## 10. 반응형 브레이크포인트

```
640px  — 모바일 (햄버거 메뉴)
768px  — 태블릿 세로
1024px — 태블릿 가로
1100px — 컨테이너 최대 너비
```

---

## 11. 한국어 카피 원칙

| 쓰지 말 것 | 대신 쓸 것 |
|-----------|-----------|
| "엣지에서 처리" | "빠르게 작동" |
| "커스텀 슬러그" | "원하는 주소로" |
| "API 엔드포인트" | "연결하기" |
| "서버리스" | 언급하지 않음 |
| "Cloudflare Edge" | 언급하지 않음 |
| "레이턴시" | "응답 속도" |
