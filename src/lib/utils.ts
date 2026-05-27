import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ─── CSS class merging ────────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── ID generation ────────────────────────────────────────────────────────────
export function generateId(prefix?: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix ? `${prefix}_${id}` : id;
}

// ─── Slug generation ──────────────────────────────────────────────────────────
export function generateSlug(length = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let slug = "";
  for (let i = 0; i < length; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

// ─── Slug validation ──────────────────────────────────────────────────────────
const RESERVED_SLUGS = new Set([
  "api", "dashboard", "login", "register", "logout", "settings",
  "analytics", "qr", "links", "files", "paste", "webhook", "status",
  "docs", "pricing", "about", "legal", "terms", "privacy", "blog",
  "help", "support", "contact", "404", "500", "admin", "user",
  "s", "r", "go", "l", "p", "f", "w", "b",
]);

export function isValidSlug(slug: string): { valid: boolean; reason?: string } {
  if (!slug) return { valid: false, reason: "슬러그를 입력해주세요." };
  if (slug.length < 2) return { valid: false, reason: "슬러그는 최소 2자 이상이어야 합니다." };
  if (slug.length > 64) return { valid: false, reason: "슬러그는 최대 64자까지 가능합니다." };
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return { valid: false, reason: "슬러그는 영문자, 숫자, 하이픈(-), 언더스코어(_)만 사용 가능합니다." };
  }
  if (RESERVED_SLUGS.has(slug.toLowerCase())) {
    return { valid: false, reason: "이미 예약된 슬러그입니다." };
  }
  return { valid: true };
}

// ─── URL validation ───────────────────────────────────────────────────────────
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// ─── URL normalization ────────────────────────────────────────────────────────
export function normalizeUrl(url: string): string {
  try {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    const parsed = new URL(url);
    return parsed.href;
  } catch {
    return url;
  }
}

// ─── Domain extraction ────────────────────────────────────────────────────────
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// ─── Number formatting ────────────────────────────────────────────────────────
export function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString("ko-KR");
}

// ─── Date formatting ─────────────────────────────────────────────────────────
/**
 * Converts any date value to milliseconds since epoch.
 * Handles: Date objects, JS numbers, numeric strings (PostgreSQL BIGINT),
 * and ISO/RFC 2822 strings.
 * Returns null for null/undefined/invalid inputs.
 */
function toMs(date: Date | number | string | null | undefined): number | null {
  if (date == null) return null;
  if (date instanceof Date) {
    const t = date.getTime();
    return isNaN(t) ? null : t;
  }
  if (typeof date === "number") return isNaN(date) ? null : date;
  if (typeof date === "string") {
    // Pure numeric string = milliseconds from PostgreSQL BIGINT
    if (/^\d+$/.test(date.trim())) return Number(date);
    const t = new Date(date).getTime();
    return isNaN(t) ? null : t;
  }
  return null;
}

export function formatDate(date: Date | number | string | null | undefined): string {
  const ms = toMs(date);
  if (ms == null) return "—";
  return new Date(ms).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | number | string | null | undefined): string {
  const ms = toMs(date);
  if (ms == null) return "—";
  return new Date(ms).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(date: Date | number | string | null | undefined): string {
  const ms = toMs(date);
  if (ms == null) return "—";
  const d = new Date(ms);
  const now = Date.now();
  const diff = now - ms;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  return formatDate(d);
}

export function isExpired(expiresAt: number | null | undefined): boolean {
  if (!expiresAt) return false;
  return Date.now() > expiresAt;
}

// ─── Hash (for passwords/IPs) ─────────────────────────────────────────────────
export async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function md5(text: string): Promise<string> {
  // Use SHA-256 instead of MD5 (MD5 not available in Web Crypto)
  return (await sha256(text)).substring(0, 32);
}

// ─── Device detection from UA ─────────────────────────────────────────────────
export function getDeviceType(ua: string): "mobile" | "tablet" | "desktop" | "bot" {
  const botPattern = /bot|crawler|spider|scraper|curl|wget|python|java|go-http/i;
  if (botPattern.test(ua)) return "bot";

  const mobilePattern = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const tabletPattern = /iPad|Android(?!.*Mobile)|Tablet/i;

  if (tabletPattern.test(ua)) return "tablet";
  if (mobilePattern.test(ua)) return "mobile";
  return "desktop";
}

// ─── Country names (ISO 3166-1) ───────────────────────────────────────────────
const COUNTRY_NAMES: Record<string, string> = {
  KR: "대한민국", US: "미국", JP: "일본", CN: "중국", GB: "영국",
  DE: "독일", FR: "프랑스", CA: "캐나다", AU: "호주", IN: "인도",
  BR: "브라질", MX: "멕시코", SG: "싱가포르", TW: "대만", HK: "홍콩",
  TH: "태국", VN: "베트남", ID: "인도네시아", MY: "말레이시아",
  PH: "필리핀", NL: "네덜란드", ES: "스페인", IT: "이탈리아",
  RU: "러시아", PL: "폴란드", SE: "스웨덴", NO: "노르웨이",
  DK: "덴마크", FI: "핀란드", CH: "스위스", AT: "오스트리아",
  BE: "벨기에", PT: "포르투갈", NZ: "뉴질랜드", ZA: "남아프리카",
};

export function getCountryName(code: string): string {
  return COUNTRY_NAMES[code?.toUpperCase()] ?? code;
}

// ─── Truncate text ────────────────────────────────────────────────────────────
export function truncate(text: string, maxLength = 50): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

// ─── Short URL builder ────────────────────────────────────────────────────────
export function buildShortUrl(slug: string, domain = "krl.kr"): string {
  return `https://${domain}/${slug}`;
}

// ─── API key generation ───────────────────────────────────────────────────────
export function generateApiKey(): string {
  const prefix = "krl";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = `${prefix}_`;
  for (let i = 0; i < 40; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// ─── Bytes formatting ─────────────────────────────────────────────────────────
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export function paginate<T>(items: T[], page: number, perPage = 20): {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
} {
  const total = items.length;
  const totalPages = Math.ceil(total / perPage);
  const start = (page - 1) * perPage;
  const end = start + perPage;
  return {
    items: items.slice(start, end),
    total,
    page,
    perPage,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
