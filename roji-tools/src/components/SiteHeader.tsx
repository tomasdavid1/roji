"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { STORE_URL } from "@/lib/tools";
import { track } from "@/lib/track";

/**
 * Roji R monogram - kept exported for use in places like breadcrumbs
 * (Revolut-style) and the favicon, but the primary site lockup is
 * deliberately the lowercase "roji" wordmark by itself. Don't add this
 * back to the header without a design conversation - the wordmark IS
 * the logo.
 */
export function RojiMark({ className }: { className?: string }) {
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
 *   - One Shop CTA on the right. Iteration history:
 *       2026-04   quiet "rojipeptides.com →" text — too easy to miss.
 *       2026-05-01 promoted to a solid accent-fill pill — converted
 *                  better but the page now had two solid-fill blue
 *                  pills (header + hero picker) which felt like a lot.
 *       2026-05-05 reverted to a bordered tinted-accent pill. With
 *                  the new in-tool HeroShopCTA also fill-accent on
 *                  every calculator page, having the header ALSO be
 *                  fill-accent was visually noisy. Bordered version
 *                  is still clearly a button (not a quiet text link)
 *                  but defers to the in-tool CTA for primary emphasis.
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
          <Link href="/" className="flex items-baseline gap-3 group">
            <span className="text-xl font-semibold tracking-tight text-roji-text">
              roji
            </span>
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-roji-muted group-hover:text-roji-text transition-colors">
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
          href={`${STORE_URL}/shop/?utm_source=tools&utm_medium=header&utm_campaign=site_header`}
          onClick={() => track("header_shop_click", { surface: "site_header" })}
          className={[
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-roji",
            "bg-roji-accent/10 border border-roji-accent/30 text-roji-accent",
            "hover:bg-roji-accent/15 hover:border-roji-accent/50 transition-colors",
            "text-xs sm:text-sm font-medium",
          ].join(" ")}
          aria-label="Shop research stacks at rojipeptides.com"
        >
          <span>Shop</span>
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </header>
  );
}
