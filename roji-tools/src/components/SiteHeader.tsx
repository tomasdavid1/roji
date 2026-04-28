"use client";

import Link from "next/link";
import { useState } from "react";

import { TOOLS, STORE_URL, PROTOCOL_URL } from "@/lib/tools";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-roji-border bg-roji-black/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl font-semibold text-roji-accent">Roji</span>
          <span className="text-xs font-mono uppercase tracking-[0.18em] text-roji-muted group-hover:text-roji-text transition-colors">
            Tools
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm md:flex">
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-roji-text/80 hover:text-roji-text transition-colors flex items-center gap-1"
            aria-haspopup="true"
            aria-expanded={open}
          >
            All tools
            <svg width="9" height="6" viewBox="0 0 10 6" className="opacity-60">
              <path
                d="M1 1l4 4 4-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
          <a
            href={PROTOCOL_URL}
            className="text-roji-text/80 hover:text-roji-text transition-colors"
          >
            Protocol Engine
          </a>
          <a
            href={STORE_URL}
            className="text-roji-text/80 hover:text-roji-text transition-colors"
          >
            Shop
          </a>
          <a
            href={`${STORE_URL}/research-library/`}
            className="text-roji-text/80 hover:text-roji-text transition-colors"
          >
            Research
          </a>
        </nav>

        <a
          href={STORE_URL}
          className="hidden md:inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-roji-muted hover:text-roji-text transition-colors"
        >
          rojipeptides.com →
        </a>
      </div>

      {open && (
        <div className="border-t border-roji-border bg-roji-darker">
          <div className="mx-auto grid max-w-6xl gap-3 px-6 py-6 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map((t) => (
              <Link
                key={t.slug}
                href={t.href}
                className="group flex items-start gap-3 rounded-roji border border-roji-border p-3 transition-colors hover:border-roji-border-hover"
                onClick={() => setOpen(false)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {t.shortTitle}
                    {t.status === "beta" && (
                      <span className="rounded-full bg-roji-warning/10 px-2 py-[1px] text-[9px] font-mono uppercase tracking-wider text-roji-warning">
                        Beta
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-roji-muted leading-snug">
                    {t.tagline}
                  </div>
                </div>
                <span className="text-roji-dim transition-colors group-hover:text-roji-accent">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
