"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { STORE_URL } from "@/lib/tools";
import { track } from "@/lib/track";

interface HeroShopCTAProps {
  /**
   * Tool slug — used as the utm_campaign suffix and as the
   * `tool` event param so the funnel can segment which calculator
   * sourced the click. Use "home" for the tools landing page.
   */
  toolSlug: string;
  /**
   * Short framing line. Shown next to the button. Keep it tight —
   * one line on desktop. Per-tool override so we can match the
   * compound the page is about ("BPC-157 vials in stock" reads
   * very differently on the half-life page vs. the COA page).
   */
  label?: string;
  /** Override the button text. Defaults to "Shop peptides →". */
  buttonLabel?: string;
  /** Custom href. Defaults to /shop/ on the store with UTM. */
  href?: string;
  /**
   * GA4 event surface — distinguishes where on the site the CTA
   * lives so we can compare conversion rates per placement.
   * Defaults to "tool_hero_cta" (above-the-tool position).
   * Use "home_hero_cta" when rendered on the tools landing page,
   * which gets ~2x more traffic than any individual tool page but
   * was generating zero clicks before.
   */
  surface?: string;
  /**
   * Visual variant.
   *   "card"        — full card with product thumbnail + label + button.
   *                   Default; this is what tool pages render above
   *                   the calculator.
   *   "button-only" — just the prefetching/tracked accent button. Use
   *                   when the parent already provides framing copy
   *                   and an enclosing card (e.g. the homepage shop
   *                   bridge), to avoid double-cards.
   */
  variant?: "card" | "button-only";
  /**
   * Override the outer <section> wrapper classes. Defaults to the
   * tool-page positioning (centered on mobile, with vertical margin
   * to slot in between PageHero and the calculator). Set this when
   * embedding inside another card.
   */
  wrapperClassName?: string;
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
  surface = "tool_hero_cta",
  variant = "card",
  wrapperClassName,
}: HeroShopCTAProps) {
  // Wrapper defaults differ per variant — the card needs a wider canvas
  // and centered layout, the button-only variant should be tight.
  const resolvedWrapper =
    wrapperClassName ??
    (variant === "card"
      ? "mx-auto max-w-3xl px-6 -mt-1 mb-6"
      : "mx-auto max-w-3xl px-6 -mt-1 mb-6 flex justify-center sm:justify-end");
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

  // Visual journey:
  //   v1 (2026-05-06): boxed card, accent border, "From Roji" eyebrow,
  //                    long sentence + chunky button. 4 real clicks /
  //                    729 tool pageviews in 7 days.
  //   v2 (2026-05-07 PM): stripped border + eyebrow + jargon, kept
  //                       a soft tinted bar with question + button.
  //   v3 (2026-05-07 late): added a small product thumbnail.
  //   v4 (2026-05-07 late): user feedback was the bar still looked
  //                         off and the white photo bg clashed with
  //                         the dark page. Stripped down to JUST the
  //                         accent button. NOTE: this version never
  //                         actually shipped to users — Vercel
  //                         deploys had been silently failing for
  //                         3 days (ESLint rule disable comment for
  //                         a rule not in Next 14's plugin set).
  //                         What users saw the whole time was v3.
  //   v5 (2026-05-10): unblocked Vercel by removing the offending
  //                    eslint-disable comment, so v4 finally went
  //                    live. User reviewed v4 live for the first
  //                    time and confirmed they wanted the image
  //                    back — this v5 brings it back, with two
  //                    fixes for the original issues: (a) the
  //                    white-photo-on-dark clash is solved by
  //                    putting the vials in a cream-tinted circular
  //                    frame, so the white blends into a deliberate
  //                    disc; (b) cramped multi-line text is solved
  //                    by tightening every per-tool label to ≤6
  //                    words. Card layout is [disc][label][button]
  //                    inside a soft accent border + subtle gradient
  //                    so it reads as one shoppable unit rather
  //                    than three loose elements.
  //                    Also adds variant="button-only" for places
  //                    that already provide their own framing card
  //                    (the homepage shop bridge), to avoid
  //                    rendering a card-inside-a-card.
  return (
    <section
      ref={sectionRef}
      className={resolvedWrapper}
      data-hero-shop-cta
      data-tool-slug={toolSlug}
      data-cta-label={label}
      data-variant={variant}
      aria-label={label}
    >
      {variant === "button-only" ? (
        <a
          href={target}
          onMouseEnter={prefetch}
          onFocus={prefetch}
          onTouchStart={prefetch}
          onClick={() =>
            track("hero_shop_cta_click", {
              tool: toolSlug,
              surface,
              label: buttonLabel,
            })
          }
          className={[
            "inline-flex items-center gap-1.5 rounded-roji",
            "px-5 py-2.5",
            "bg-roji-accent text-roji-black hover:bg-roji-accent/90 transition-colors",
            "text-sm sm:text-[15px] font-semibold whitespace-nowrap",
          ].join(" ")}
        >
          {buttonLabel}
        </a>
      ) : (
        // CARD VARIANT
        // Layout: [thumbnail in light circular frame] [label] [button]
        // - Thumbnail: the product photo has a white background. To
        //   stop it clashing with the dark page, we wrap it in an
        //   off-white circular container — the white photo bg blends
        //   into the circle, so the vials look like they're sitting
        //   on a deliberate disc rather than a foreign rectangle.
        // - Label: single line on desktop, allowed to wrap to 2 on
        //   the narrowest mobile widths.
        // - Button: solid accent, dominant CTA, never wraps.
        // - Whole card: subtle accent border + faint gradient so it
        //   reads as a coherent shoppable unit, not a banner ad.
        <a
          href={target}
          onMouseEnter={prefetch}
          onFocus={prefetch}
          onTouchStart={prefetch}
          onClick={() =>
            track("hero_shop_cta_click", {
              tool: toolSlug,
              surface,
              label: buttonLabel,
            })
          }
          className={[
            "group block rounded-roji-lg border",
            "px-3 py-3 sm:px-4 sm:py-4",
            "transition-[border-color,background-color] duration-200",
            "hover:border-roji-accent/60",
          ].join(" ")}
          style={{
            background:
              "linear-gradient(135deg, rgba(79,109,245,0.08) 0%, rgba(79,109,245,0.02) 100%)",
            borderColor: "rgba(79,109,245,0.30)",
          }}
        >
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Thumbnail in cream-tinted circular frame */}
            <div
              aria-hidden="true"
              className={[
                "shrink-0 overflow-hidden rounded-full",
                "h-12 w-12 sm:h-14 sm:w-14",
                "ring-1 ring-roji-accent/25",
                "flex items-center justify-center",
              ].join(" ")}
              style={{ background: "#f5f1ea" }}
            >
              <Image
                src="/cta/peptide-vials.webp"
                alt=""
                width={56}
                height={56}
                className="h-full w-full object-cover"
                sizes="56px"
                priority={false}
              />
            </div>

            {/* Framing copy — hidden on mobile to keep [thumb][button]
                on a single tidy line. At narrow widths there isn't room
                for thumb + meaningful label + button without word-by-word
                wrapping (rendered as "Peptides / + / BAC / water, / ready
                / to / ship." in May 2026 user feedback). The label is
                still in the DOM for screen readers via aria-label on the
                section wrapper, and it's preserved as a data-cta-label
                attribute. Desktop (sm and up) shows it inline as designed. */}
            <span
              className={[
                "hidden sm:inline",
                "min-w-0 flex-1",
                "text-[14px] sm:text-[15px] font-medium leading-snug",
                "text-roji-text",
              ].join(" ")}
            >
              {label}
            </span>

            {/* Button — never wraps, never shrinks. ml-auto pushes
                it to the right edge of the card on mobile (where
                the label is hidden, so without ml-auto disc + button
                would sit shoulder-to-shoulder on the left with empty
                space behind the button). On sm+ the visible label
                takes flex-1 between disc and button so ml-auto is a
                no-op. */}
            <span
              className={[
                "ml-auto sm:ml-0",
                "shrink-0 inline-flex items-center gap-1.5 rounded-roji",
                "px-4 py-2 sm:px-5 sm:py-2.5",
                "bg-roji-accent text-roji-black",
                "group-hover:bg-roji-accent/90 transition-colors",
                "text-[13px] sm:text-[15px] font-semibold whitespace-nowrap",
              ].join(" ")}
            >
              {buttonLabel}
            </span>
          </div>
        </a>
      )}
    </section>
  );
}
