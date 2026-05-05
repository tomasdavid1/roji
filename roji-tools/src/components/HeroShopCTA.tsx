"use client";

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
  label = "Skip the math — browse research-grade vials",
  buttonLabel = "Browse research stacks →",
  href,
}: HeroShopCTAProps) {
  const target =
    href ??
    `${STORE_URL}/shop/?utm_source=tools&utm_medium=hero_cta&utm_campaign=${encodeURIComponent(
      toolSlug,
    )}`;

  return (
    <section
      className="mx-auto max-w-3xl px-6 -mt-2 mb-6"
      data-hero-shop-cta
      data-tool-slug={toolSlug}
    >
      <div
        className={[
          "flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 sm:gap-4",
          "rounded-roji-lg border border-roji-accent/25 bg-roji-accent-subtle/40",
          "px-4 py-3 sm:px-5 sm:py-3.5",
        ].join(" ")}
      >
        <p className="text-sm text-roji-text leading-snug">
          <span className="font-mono uppercase text-roji-accent text-[10px] tracking-[0.18em] mr-2">
            From Roji
          </span>
          {label}
        </p>
        <a
          href={target}
          onClick={() =>
            track("hero_shop_cta_click", {
              tool: toolSlug,
              surface: "tool_hero_cta",
              label: buttonLabel,
            })
          }
          className={[
            "inline-flex shrink-0 items-center gap-1.5 rounded-roji px-3.5 py-1.5",
            "bg-roji-accent text-roji-black hover:bg-roji-accent/90 transition-colors",
            "text-xs sm:text-sm font-semibold",
          ].join(" ")}
        >
          {buttonLabel}
        </a>
      </div>
    </section>
  );
}
