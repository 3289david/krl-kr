import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import NoticePopup from "@/components/notice-popup";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://krl.kr"),
  title: {
    default: "KRL.KR — 스마트한 링크 단축 서비스",
    template: "%s | KRL.KR",
  },
  description:
    "KRL.KR은 링크 단축, 분석, QR 코드 생성, 서브도메인 서비스를 제공하는 개발자 친화적 플랫폼입니다.",
  keywords: [
    "url shortener",
    "링크 단축",
    "url 단축",
    "qr 코드",
    "link analytics",
    "krl.kr",
    "도메인 서비스",
  ],
  authors: [{ name: "KRL.KR" }],
  creator: "KRL.KR",
  publisher: "KRL.KR",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://krl.kr",
    siteName: "KRL.KR",
    title: "KRL.KR — 스마트한 링크 단축 서비스",
    description:
      "링크 단축, 분석, QR 코드, 서브도메인 — 모든 링크를 한 곳에서 관리하세요.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "KRL.KR",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KRL.KR — 스마트한 링크 단축 서비스",
    description:
      "링크 단축, 분석, QR 코드, 서브도메인 — 모든 링크를 한 곳에서 관리하세요.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#F3F0EE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        {/* Google AdSense — must be in raw <head> for verification */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3656867929224668"
          crossOrigin="anonymous"
        />
      </head>
      <body className={GeistSans.className}>
        {children}
        <NoticePopup />
      </body>
    </html>
  );
}
