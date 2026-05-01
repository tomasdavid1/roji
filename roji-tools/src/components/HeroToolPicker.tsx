"use client";

import Link from "next/link";

import { ToolIcon, type IconKey } from "@/components/ToolIcon";
import { STORE_URL } from "@/lib/tools";
import { track } from "@/lib/track";

/**
 * Above-the-fold tool picker.
 *
 * Goal: paid clickers landing on the homepage self-route to the right
 * tool in **one click**, before scrolling, before seeing the typewriter
 * rotator or the "Built by Roji Peptides" copy. The full 8-tool grid
 * still lives further down for browsing visitors.
 *
 * The 4 tools shown here are the 4 with dedicated Google Ads ad groups
 * (Reconstitution / Half-Life / COA / Cost Compare). Body Recomp and
 * Research Database aren't surfaced in this picker because they're not
 * what paid traffic is searching for — they live in the broader grid.
 *
 * Tracks `hero_tool_pick` and `hero_shop_click` events so the GA4-side
 * funnel can attribute "ad click → first-click destination."
 */

interface PickerOption {
  slug: string;
  href: string;
  short: string;
  blurb: string;
  icon: IconKey;
}

const PICKERS: readonly PickerOption[] = [
  {
    slug: "reconstitution",
    href: "/reconstitution",
    short: "Reconstitution",
    blurb: "Volume math",
    icon: "calculator",
  },
  {
    slug: "half-life",
    href: "/half-life",
    short: "Half-Life",
    blurb: "Decay curves",
    icon: "clock",
  },
  {
    slug: "coa-analyzer",
    href: "/coa",
    short: "COA Analyzer",
    blurb: "Verify a COA",
    icon: "shieldCheck",
  },
  {
    slug: "cost-calculator",
    href: "/cost-per-dose",
    short: "Cost Compare",
    blurb: "Cost per unit",
    icon: "dollarSign",
  },
];

export function HeroToolPicker() {
  return (
    <div className="mt-9 max-w-3xl mx-auto">
      <div
        className="font-mono uppercase text-roji-muted mb-3 text-center"
        style={{ fontSize: "10px", letterSpacing: "0.22em" }}
      >
        Pick your tool
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {PICKERS.map((p) => (
          <Link
            key={p.slug}
            href={p.href}
            onClick={() =>
              track("hero_tool_pick", {
                tool: p.slug,
                surface: "homepage_hero",
              })
            }
            className={[
              "group relative bg-roji-card border border-roji-border rounded-roji-lg",
              "px-3 py-3.5 sm:px-4 sm:py-4 text-left",
              "transition-[transform,border-color,background-color] duration-200",
              "hover:border-roji-accent/50 hover:bg-roji-accent-subtle/40 hover:-translate-y-0.5",
            ].join(" ")}
            data-tool-slug={p.slug}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="h-7 w-7 rounded-roji border border-roji-border bg-roji-accent-subtle text-roji-accent flex items-center justify-center group-hover:border-roji-accent/50 transition-colors">
                <ToolIcon name={p.icon} />
              </span>
            </div>
            <div className="text-[15px] font-semibold text-roji-text leading-tight">
              {p.short}
            </div>
            <div className="text-[12px] text-roji-muted mt-0.5">{p.blurb}</div>
          </Link>
        ))}
      </div>

      {/* Secondary action — shop is one click away from the hero. */}
      <div className="mt-5 flex items-center justify-center gap-3 text-sm">
        <a
          href={`${STORE_URL}/shop/?utm_source=tools&utm_medium=hero&utm_campaign=hero_picker`}
          onClick={() =>
            track("hero_shop_click", { surface: "homepage_hero" })
          }
          className={[
            "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-roji-lg",
            "bg-roji-accent/10 border border-roji-accent/30 text-roji-accent",
            "hover:bg-roji-accent/15 hover:border-roji-accent/50 transition-colors",
            "font-medium",
          ].join(" ")}
        >
          Shop research stacks
          <span aria-hidden="true">→</span>
        </a>
        <a
          href="#tools-heading"
          className="text-roji-muted hover:text-roji-text transition-colors"
        >
          See all tools ↓
        </a>
      </div>
    </div>
  );
}
