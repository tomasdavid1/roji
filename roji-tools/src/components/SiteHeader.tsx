"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { STORE_URL } from "@/lib/tools";

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
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-xl font-semibold text-roji-accent">Roji</span>
            <span className="text-xs font-mono uppercase tracking-[0.18em] text-roji-muted group-hover:text-roji-text transition-colors">
              Research Tools
            </span>
          </Link>
        ) : (
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-roji-muted hover:text-roji-text transition-colors"
          >
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
