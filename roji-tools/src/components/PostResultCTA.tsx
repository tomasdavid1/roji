"use client";

import { useEffect, useRef, useState } from "react";

import { STORE_URL } from "@/lib/tools";
import { track, toolComplete } from "@/lib/track";

interface PostResultCTAProps {
  toolSlug: string;
  title: string;
  buttonLabel: string;
  /** Custom href — defaults to store /shop/ with UTM. */
  href?: string;
}

/**
 * Contextual CTA that fades in after a tool calculation completes.
 * Fires `toolComplete()` on mount, so each tool only needs to
 * conditionally render this component when results are ready.
 *
 * Renders as a subtle inline card directly below results — not a
 * popup, not a modal. Compliance-safe: framed as "from the team
 * behind this tool."
 */
export function PostResultCTA({
  toolSlug,
  title,
  buttonLabel,
  href,
}: PostResultCTAProps) {
  const [shown, setShown] = useState(false);
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    toolComplete(toolSlug);
    const t = setTimeout(() => setShown(true), 400);
    return () => clearTimeout(t);
  }, [toolSlug]);

  const target =
    href ??
    `${STORE_URL}/shop/?utm_source=tools&utm_medium=referral&utm_campaign=${encodeURIComponent(toolSlug)}_post_result`;

  return (
    <div
      className={`mt-6 transition-all duration-500 ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <div className="rounded-roji border border-roji-border/50 bg-roji-card/50 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-roji-muted">{title}</p>
        <a
          href={target}
          onClick={() =>
            track("store_outbound_click", {
              source: toolSlug,
              via: "post_result",
              label: buttonLabel,
            })
          }
          className="shrink-0 text-xs font-medium text-roji-accent hover:text-roji-accent-hover transition-colors"
        >
          {buttonLabel}
        </a>
      </div>
    </div>
  );
}
