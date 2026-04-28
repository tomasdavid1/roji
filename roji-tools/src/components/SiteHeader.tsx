"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { STORE_URL } from "@/lib/tools";

/**
 * Roji R monogram. Inline SVG so the header has zero external image
 * requests and the mark inherits its color from the parent's Tailwind
 * `text-*` class via `currentColor`. The geometry mirrors
 * `/brand/src/r-mark.svg` — keep them in sync if you tweak the curve.
 */
function RojiMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 256 256"
      className={className}
      fill="currentColor"
      aria-hidden="true"
      role="img"
    >
      <path
        fillRule="evenodd"
        d="M 56 48 L 56 208 L 88 208 L 88 152 L 124 152 L 168 208 L 208 208 L 208 200 L 158 142 C 184 132 196 116 196 92 C 196 64 174 48 142 48 Z M 88 80 L 138 80 C 154 80 164 86 164 100 C 164 116 152 124 138 124 L 88 124 Z"
      />
    </svg>
  );
}

/**
 * Site-wide header.
 *
 * Two visual states:
 *
 *   1. On the homepage ("/") → minimal: just the Roji Tools brand mark
 *      and a quiet rojipeptides.com link in the top-right. The hero
 *      section IS the navigation; we don't repeat it here.
 *
 *   2. On any tool page → the brand mark on the left becomes a
 *      "← All Tools" back link so the directory page is one click
 *      away. This is required by the Google-Ads compliance brief.
 *
 * Compliance considerations:
 *   - No "Protocol Engine" link (the protocol subdomain is being
 *     killed in favor of this app being the canonical entrypoint).
 *   - No Shop link in the primary nav. The store has exactly one
 *     subtle reference: the rojipeptides.com text mark on the right.
 *   - No tool-name dropdown. The directory page is the entry point
 *     and the only place the tool catalog should be enumerated.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-30 border-b border-roji-border bg-roji-black/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {isHome ? (
          <Link href="/" className="flex items-center gap-2.5 group">
            <RojiMark className="h-7 w-7 text-roji-accent transition-transform group-hover:scale-105" />
            <span className="flex items-baseline gap-2">
              <span className="text-xl font-semibold tracking-tight text-roji-text">
                roji
              </span>
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-roji-muted group-hover:text-roji-text transition-colors">
                Research Tools
              </span>
            </span>
          </Link>
        ) : (
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-roji-muted hover:text-roji-text transition-colors group"
          >
            <RojiMark className="h-5 w-5 text-roji-accent" />
            <span aria-hidden="true">←</span>
            <span>All tools</span>
          </Link>
        )}

        <a
          href={STORE_URL}
          className="hidden md:inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-roji-muted hover:text-roji-text transition-colors"
        >
          rojipeptides.com →
        </a>
      </div>
    </header>
  );
}
