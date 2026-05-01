"use client";

import { useEffect, useState } from "react";

import { STORE_URL } from "@/lib/tools";
import { track } from "@/lib/track";

interface StickyStoreBannerProps {
  source: string;
  label?: string;
}

/**
 * Subtle 40px sticky footer bar that appears after the user scrolls
 * past the inline StoreCTA. Dismissable. Tracks clicks as
 * `store_outbound_click` with `via: "sticky"`.
 */
export function StickyStoreBanner({
  source,
  label = "From the makers of this tool → Browse research stacks",
}: StickyStoreBannerProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;

    const handleScroll = () => {
      const storeCta = document.querySelector("[data-store-cta]");
      if (!storeCta) {
        setVisible(false);
        return;
      }
      const rect = storeCta.getBoundingClientRect();
      setVisible(rect.bottom < 0);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [dismissed]);

  if (dismissed || !visible) return null;

  const target = `${STORE_URL}/shop/?utm_source=tools&utm_medium=referral&utm_campaign=${encodeURIComponent(source)}_sticky`;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-roji-border bg-roji-black/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
        <a
          href={target}
          onClick={() =>
            track("store_outbound_click", { source, via: "sticky", label })
          }
          className="text-xs text-roji-muted hover:text-roji-accent transition-colors truncate"
        >
          {label}
        </a>
        <button
          onClick={() => setDismissed(true)}
          className="ml-3 shrink-0 text-roji-dim hover:text-roji-muted transition-colors"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 3l8 8M11 3l-8 8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
