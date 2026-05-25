"use client";
import Link from "next/link";
import { useState } from "react";
import { MenuIcon, XIcon } from "@/components/icons";

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating pill nav */}
      <header
        style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 50,
          width: "calc(100% - 40px)",
          maxWidth: "960px",
        }}
      >
        <nav
          className="nav-pill"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 20px",
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: "1.0625rem",
              letterSpacing: "0.04em",
              color: "var(--color-ink)",
              textDecoration: "none",
            }}
          >
            KRL.KR
          </Link>

          {/* Desktop links */}
          <div
            className="desktop-nav"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
            }}
          >
            {[
              { href: "/features", label: "기능" },
              { href: "/pricing", label: "요금제" },
              { href: "/docs", label: "문서" },
              { href: "/about", label: "소개" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  fontSize: "0.9375rem",
                  fontWeight: 500,
                  color: "var(--color-body)",
                  textDecoration: "none",
                  padding: "6px 12px",
                  borderRadius: "var(--radius-sm)",
                  transition: "background-color 0.1s ease, color 0.1s ease",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = "var(--color-surface-card)";
                  (e.target as HTMLElement).style.color = "var(--color-ink)";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = "transparent";
                  (e.target as HTMLElement).style.color = "var(--color-body)";
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* CTA buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Link
              href="/login"
              style={{
                fontSize: "0.9375rem",
                fontWeight: 500,
                color: "var(--color-body)",
                textDecoration: "none",
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
              }}
              className="hidden-mobile"
            >
              로그인
            </Link>
            <Link
              href="/register"
              className="btn btn-primary btn-sm btn-pill"
              style={{ textDecoration: "none" }}
            >
              무료 시작
            </Link>

            {/* Mobile hamburger */}
            <button
              className="btn btn-icon btn-ghost show-mobile"
              onClick={() => setOpen(!open)}
              aria-label="메뉴"
              style={{
                display: "none",
              }}
            >
              {open ? <XIcon size={18} /> : <MenuIcon size={18} />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu overlay */}
      {open && (
        <div
          className="menu-overlay"
          onClick={() => setOpen(false)}
          style={{ zIndex: 40 }}
        />
      )}

      {/* Mobile menu drawer */}
      {open && (
        <div
          style={{
            position: "fixed",
            top: "80px",
            left: "20px",
            right: "20px",
            zIndex: 50,
            background: "var(--color-white)",
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--color-hairline)",
            boxShadow: "var(--shadow-card)",
            padding: "16px",
          }}
        >
          {[
            { href: "/features", label: "기능" },
            { href: "/pricing", label: "요금제" },
            { href: "/docs", label: "문서" },
            { href: "/about", label: "소개" },
            { href: "/login", label: "로그인" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              style={{
                display: "block",
                padding: "12px 16px",
                fontSize: "1rem",
                fontWeight: 500,
                color: "var(--color-ink)",
                textDecoration: "none",
                borderRadius: "var(--radius-sm)",
              }}
            >
              {item.label}
            </Link>
          ))}
          <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid var(--color-hairline)" }}>
            <Link
              href="/register"
              className="btn btn-primary btn-pill"
              style={{ textDecoration: "none", width: "100%", justifyContent: "center" }}
              onClick={() => setOpen(false)}
            >
              무료 시작
            </Link>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .hidden-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
        @media (min-width: 769px) {
          .show-mobile { display: none !important; }
        }
      `}</style>
    </>
  );
}
