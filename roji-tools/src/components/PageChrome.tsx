"use client";

import Link from "next/link";

import { otherTools } from "@/lib/tools";
import { track } from "@/lib/track";

interface PageHeroProps {
  pill: string;
  title: string;
  lede: string;
  /** Slug of current tool, so we can de-dupe in "Other tools" rows. */
  currentSlug?: string;
}

export function PageHero({ pill, title, lede }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-roji-border">
      <div className="roji-orb" aria-hidden="true" />
      <div className="relative mx-auto max-w-3xl px-6 pt-16 pb-12 text-center">
        <div className="roji-pill mb-4">{pill}</div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl tracking-tight text-roji-text">
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-roji-muted">
          {lede}
        </p>
      </div>
    </section>
  );
}

export function MoreTools({ currentSlug }: { currentSlug: string }) {
  const others = otherTools(currentSlug, 4);
  if (!others.length) return null;
  return (
    <section className="mx-auto max-w-5xl px-6 py-14">
      <div className="mb-5 flex items-end justify-between">
        <h2 className="text-lg font-semibold">More tools</h2>
        <Link
          href="/"
          className="text-xs font-mono uppercase tracking-wider text-roji-muted hover:text-roji-text"
        >
          View all →
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {others.map((t) => (
          <Link
            key={t.slug}
            href={t.href}
            onClick={() =>
              track("more_tools_click", { from: currentSlug, to: t.slug })
            }
            className="roji-card-interactive flex flex-col gap-2 p-5"
          >
            <div className="text-[12px] font-mono uppercase tracking-wider text-roji-accent">
              {t.category}
            </div>
            <div className="font-semibold">{t.shortTitle}</div>
            <p className="text-xs leading-snug text-roji-muted">{t.tagline}</p>
            <div className="mt-2 text-xs text-roji-dim">Open →</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

interface StoreCTAProps {
  /** Override the suggested CTA. Defaults to a research-stack pitch. */
  title?: string;
  body?: string;
  buttonLabel?: string;
  /** Append a `?utm_*` source so we can attribute conversions back to the tool. */
  source: string;
  href?: string;
}

export function StoreCTA({
  title = "Need research-grade peptides?",
  body = "Roji Peptides ships third-party Janoshik-verified, ≥99% purity research compounds with transparent COAs. Stacks calibrated for recovery, recomposition, and longevity.",
  buttonLabel = "Browse research stacks →",
  source,
  href,
}: StoreCTAProps) {
  const STORE = process.env.NEXT_PUBLIC_STORE_URL ?? "https://rojipeptides.com";
  const target =
    href ??
    `${STORE}/shop/?utm_source=tools&utm_medium=referral&utm_campaign=${encodeURIComponent(
      source,
    )}`;
  return (
    <section className="mx-auto max-w-5xl px-6 pb-14">
      <div className="relative overflow-hidden rounded-roji-lg border border-roji-accent/30 bg-gradient-to-br from-roji-card to-roji-darker p-8 sm:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full opacity-40 blur-3xl"
          style={{ background: "rgba(79,109,245,0.25)" }}
        />
        <div className="relative grid gap-6 sm:grid-cols-[2fr_1fr] sm:items-center">
          <div>
            <div className="roji-pill mb-3">From the team behind this tool</div>
            <h3 className="mb-2 text-xl font-semibold">{title}</h3>
            <p className="max-w-xl text-sm leading-relaxed text-roji-muted">
              {body}
            </p>
          </div>
          <div className="sm:text-right">
            <a
              href={target}
              onClick={() =>
                track("store_outbound_click", { source, label: buttonLabel })
              }
              className="roji-btn-primary"
            >
              {buttonLabel}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
