"use client";

import { useEffect, useRef, useState } from "react";

import { STORE_URL } from "@/lib/tools";
import { track, toolComplete } from "@/lib/track";

interface PostResultCTAProps {
  toolSlug: string;
  title: string;
  buttonLabel: string;
  /**
   * Optional compound slug for contextual copy & analytics segmentation.
   * Example: `"bpc-157"` when the user computed a BPC-157 reconstitution.
   * When provided, emits `compound` as an event param on every tracked
   * event so we can slice the funnel by specific peptide the user was
   * researching.
   */
  compound?: string;
  /**
   * Optional subtitle shown under the title. Use to reinforce the
   * research/COA framing without repeating the title.
   */
  subtitle?: string;
  /** Custom href — defaults to store /shop/ with UTM. */
  href?: string;
  /**
   * Visual emphasis. `card` (default) renders a full inline card with
   * a proper button — use this in the main result pane to convert
   * tool-completers into store visits. `inline` renders the legacy
   * compact text-link style for secondary placements.
   */
  variant?: "card" | "inline";
}

/**
 * Contextual CTA that fades in after a tool calculation completes.
 *
 * Fires three separate events so we can measure the bridge from
 * tool-complete → store-click at step-resolution:
 *
 *   1. `tool_result_rendered`    — CTA component mounted + tool_complete fired
 *   2. `tool_result_shop_view`   — CTA scrolled into view (IntersectionObserver)
 *   3. `tool_result_shop_click`  — user clicked through to the store
 *
 * `store_outbound_click` is ALSO fired on click so it stays in sync
 * with the existing funnel dashboards (which key off that event).
 *
 * Compliance-safe: framed as "from the team behind this tool,"
 * inline-not-modal, no interstitial patterns. The variant=card
 * style is upgraded vs. the 2026-04 text-link version — designed
 * after the 2026-05-04 analysis showing only 3.3% of paid clickers
 * were crossing from tool → store; tiny text links don't compete
 * with "go back to Google" intent.
 */
export function PostResultCTA({
  toolSlug,
  title,
  buttonLabel,
  compound,
  subtitle,
  href,
  variant = "card",
}: PostResultCTAProps) {
  const [shown, setShown] = useState(false);
  const firedRef = useRef(false);
  const viewTrackedRef = useRef(false);
  const nodeRef = useRef<HTMLDivElement | null>(null);

  // Mount — fire tool_complete + tool_result_rendered exactly once.
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    toolComplete(toolSlug);
    track("tool_result_rendered", {
      tool: toolSlug,
      ...(compound ? { compound } : {}),
      surface: "post_result_cta",
    });
    const t = setTimeout(() => setShown(true), 400);
    return () => clearTimeout(t);
  }, [toolSlug, compound]);

  // Fire tool_result_shop_view exactly once when the CTA enters the
  // viewport. Distinguishes "never saw it" (bailed above the fold)
  // from "saw it and didn't click" (copy didn't land).
  useEffect(() => {
    if (!shown) return;
    const node = nodeRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !viewTrackedRef.current) {
            viewTrackedRef.current = true;
            track("tool_result_shop_view", {
              tool: toolSlug,
              ...(compound ? { compound } : {}),
              surface: "post_result_cta",
              variant,
            });
            obs.disconnect();
          }
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [shown, toolSlug, compound, variant]);

  const target =
    href ??
    `${STORE_URL}/shop/?utm_source=tools&utm_medium=referral&utm_campaign=${encodeURIComponent(
      toolSlug,
    )}_post_result${compound ? `&utm_content=${encodeURIComponent(compound)}` : ""}`;

  const handleClick = () => {
    // Fire BOTH events — tool_result_shop_click is new and compound-
    // segmented; store_outbound_click stays for existing funnel queries.
    const common = {
      source: toolSlug,
      via: "post_result",
      label: buttonLabel,
      ...(compound ? { compound } : {}),
    };
    track("tool_result_shop_click", common);
    track("store_outbound_click", common);
  };

  if (variant === "inline") {
    // Legacy compact text-link style, preserved for secondary
    // placements that don't deserve a full card.
    return (
      <div
        ref={nodeRef}
        className={`mt-6 transition-all duration-500 ${
          shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        <div className="rounded-roji border border-roji-border/50 bg-roji-card/50 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-roji-muted">{title}</p>
          <a
            href={target}
            onClick={handleClick}
            className="shrink-0 text-xs font-medium text-roji-accent hover:text-roji-accent-hover transition-colors"
          >
            {buttonLabel}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={nodeRef}
      className={`mt-6 transition-all duration-500 ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
      data-tool-slug={toolSlug}
      {...(compound ? { "data-compound": compound } : {})}
    >
      <div className="rounded-roji-lg border border-roji-accent/25 bg-roji-accent-subtle/60 px-5 py-5 sm:px-6 sm:py-5">
        <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
          <div className="flex-1 min-w-0">
            <div className="font-mono uppercase text-roji-accent mb-2 text-[10px] tracking-[0.18em]">
              {compound ? `Matches ${compound.toUpperCase()}` : "From Roji"}
            </div>
            <p className="text-sm sm:text-[15px] font-medium text-roji-text leading-snug">
              {title}
            </p>
            {subtitle && (
              <p className="mt-1.5 text-xs sm:text-[13px] text-roji-muted leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          <a
            href={target}
            onClick={handleClick}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-roji-lg bg-roji-accent px-4 py-2 font-semibold text-roji-black text-xs sm:text-sm hover:bg-roji-accent/90 transition-colors"
          >
            {buttonLabel}
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </div>
  );
}
