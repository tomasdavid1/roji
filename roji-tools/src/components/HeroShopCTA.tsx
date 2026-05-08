"use client";

import { useEffect, useRef, useState } from "react";

import { STORE_URL } from "@/lib/tools";
import { track } from "@/lib/track";

interface HeroShopCTAProps {
  /**
   * Tool slug — used as the utm_campaign suffix and as the
   * `tool` event param so the funnel can segment which calculator
   * sourced the click.
   */
  toolSlug: string;
  /**
   * Short framing line. Shown to the left of the button. Keep it
   * one line on desktop. Per-tool override so we can match the
   * compound the page is about ("BPC-157 vials in stock" reads
   * very differently on the half-life page vs. the COA page).
   *
   * Defaults to a generic research-stack pitch.
   */
  label?: string;
  /** Override the button text. Defaults to "Browse research stacks →". */
  buttonLabel?: string;
  /** Custom href. Defaults to /shop/ on the store with UTM. */
  href?: string;
}

/**
 * Above-the-tool shop bridge.
 *
 * Goal: paid clickers who arrive on a calculator page and decide
 * "actually I just want the compound, not the math" should be one
 * click from /shop/ WITHOUT scrolling past the calculator. The
 * StoreCTA card lives further down the page (good for completers),
 * but the funnel data from May 2026 showed only ~3% of paid clicks
 * even reached the calculator results — most bounced before scroll.
 *
 * Visual hierarchy on a tool page is now:
 *   1. PageHero (title + lede)            — what this page is for
 *   2. HeroShopCTA (this component)       — express lane to /shop/
 *   3. The actual calculator/tool         — the substance of the page
 *   4. StoreCTA (the bigger card)         — for tool-completers
 *   5. MoreTools / sticky banner          — for browsers
 *
 * Tracking is intentionally distinct from header_shop_click and
 * store_outbound_click so we can measure the marginal lift of
 * having a CTA above the tool specifically.
 */
export function HeroShopCTA({
  toolSlug,
  label = "Need peptides for your research?",
  buttonLabel = "Shop peptides →",
  href,
}: HeroShopCTAProps) {
  const target =
    href ??
    `${STORE_URL}/shop/?utm_source=tools&utm_medium=hero_cta&utm_campaign=${encodeURIComponent(
      toolSlug,
    )}`;

  // Prefetch /shop/ HTML when:
  //   - the user hovers / focuses the CTA (desktop intent signal), or
  //   - the CTA scrolls into view (mobile, since hover doesn't exist).
  //
  // Why fetch() instead of <link rel="prefetch">: cross-origin
  // <link rel="prefetch"> is unreliably implemented (Chrome treats
  // it as low-priority and often skips it; Safari ignores it
  // entirely). A direct fetch with no-cors mode warms the browser's
  // HTTP cache + Cloudflare's edge cache for the same URL the user
  // will navigate to, so the actual click is served from cache.
  // Resulting click latency drops from ~300-500ms (cold) to <50ms
  // when the prefetch lands first.
  //
  // Ref guards prevent double-prefetching across hover / focus /
  // intersection-observer triggers.
  const prefetched = useRef(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const [observerActive, setObserverActive] = useState(false);

  const prefetch = () => {
    if (prefetched.current) return;
    prefetched.current = true;
    // We deliberately do NOT include the per-click utm_campaign in
    // the prefetched URL because that would prefetch a per-tool
    // unique URL Cloudflare wouldn't have cached. The bare /shop/
    // HTML is the same regardless of utm_*; the actual click still
    // navigates to the full URL with utm_* attached.
    const prefetchUrl = `${STORE_URL}/shop/`;
    try {
      // mode: no-cors — cross-origin fetch we don't need to read.
      // priority: high — race against page-render, not idle.
      // keepalive: true — let the request finish even if the user
      // navigates away mid-flight (which is exactly the case here).
      void fetch(prefetchUrl, {
        method: "GET",
        mode: "no-cors",
        credentials: "omit",
        priority: "high",
        keepalive: true,
        // Cache-Control hint to the browser so it actually stores
        // the response. Some browsers default to bypassing the
        // cache for fetch() — this nudges them to keep the entry.
        cache: "default",
      } as RequestInit & { priority?: "high" | "low" | "auto" });
    } catch {
      /* noop — best-effort warmup */
    }
  };

  useEffect(() => {
    if (observerActive) return;
    setObserverActive(true);
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            prefetch();
            io.disconnect();
          }
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(node);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Visual brief (2026-05-07 PM): the previous boxed style — white-ish
  // accent border + tinted card + monospace "From Roji" eyebrow chip —
  // looked like a banner ad and got glanced over (4 real clicks across
  // 729 tool pageviews in 7 days). Stripped to a borderless soft tint
  // with a single conversational question + a slightly larger pill
  // button. The eyebrow chip is gone (we're already on rojipeptides;
  // no need to brand the inline note).
  return (
    <section
      ref={sectionRef}
      className="mx-auto max-w-3xl px-6 -mt-1 mb-6"
      data-hero-shop-cta
      data-tool-slug={toolSlug}
    >
      <div
        className={[
          "flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 sm:gap-5",
          "rounded-roji-lg bg-roji-accent-subtle/50",
          "px-5 py-4 sm:px-6 sm:py-4",
        ].join(" ")}
      >
        <p className="text-[15px] sm:text-base text-roji-text leading-snug font-medium">
          {label}
        </p>
        <a
          href={target}
          onMouseEnter={prefetch}
          onFocus={prefetch}
          onTouchStart={prefetch}
          onClick={() =>
            track("hero_shop_cta_click", {
              tool: toolSlug,
              surface: "tool_hero_cta",
              label: buttonLabel,
            })
          }
          className={[
            "inline-flex shrink-0 items-center gap-1.5 rounded-roji",
            "px-5 py-2.5 sm:px-5 sm:py-2.5",
            "bg-roji-accent text-roji-black hover:bg-roji-accent/90 transition-colors",
            "text-sm sm:text-[15px] font-semibold whitespace-nowrap",
          ].join(" ")}
        >
          {buttonLabel}
        </a>
      </div>
    </section>
  );
}
