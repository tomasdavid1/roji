import Link from "next/link";

import { TypewriterRotator } from "@/components/TypewriterRotator";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Ambient depth: faint dotted grid + a blurred indigo orb behind
          the headline. Pointer-events-none so they never intercept clicks.
          Both layers fade with mask-image so they don't fight the content
          farther down the page. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          backgroundPosition: "center top",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 35%, #000 40%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 35%, #000 40%, transparent 80%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-32 h-[640px] w-[1100px] rounded-full blur-[120px] opacity-60 animate-roji-orb-drift"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(79,109,245,0.32) 0%, rgba(79,109,245,0.08) 35%, transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(79,109,245,0.4) 50%, transparent 100%)",
        }}
      />

      {/* Content */}
      <div className="relative px-5 pt-24 pb-24 sm:pt-28 lg:pt-32">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-roji-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-roji-accent shadow-[0_0_12px_rgba(79,109,245,0.8)]" />
            Roji Peptides · Protocol Engine
          </span>

          <h1 className="text-[40px] sm:text-[56px] lg:text-[64px] font-semibold mt-5 leading-[1.05] tracking-tightest">
            Build your research
            <br />
            protocol for{" "}
            <TypewriterRotator
              words={["recovery", "recomposition", "longevity", "performance"]}
              className="text-roji-accent"
            />
          </h1>

          <p className="mt-7 text-roji-muted text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
            A free, evidence-based protocol calculator. Input your parameters,
            get a personalized framework with published references and a
            calibrated compound schedule.
          </p>

          <div className="mt-9 flex items-center justify-center gap-3">
            <Link
              href="/protocol"
              className="roji-btn-primary !px-8 !py-4 text-base"
            >
              Start protocol builder →
            </Link>
          </div>

          <p className="mt-4 text-[11px] font-mono uppercase tracking-widest text-roji-dim">
            60 seconds · no signup · no payment
          </p>
        </div>

        {/* Hierarchy: Calibrated + Cited are the differentiators (large,
            iconified). Free is the supporting line, demoted to a quieter
            card that visually defers to the other two. */}
        <div className="max-w-4xl mx-auto mt-20 grid lg:grid-cols-[1fr_1fr_0.75fr] gap-3 text-left">
          <PrimaryFeature
            number="01"
            title="Calibrated"
            body="Dosing scaled by body weight (mcg/kg), sex, and prior research experience. Your stats, not someone else's."
            icon={<CalibratedIcon />}
          />
          <PrimaryFeature
            number="02"
            title="Cited"
            body="Every recommendation links to peer-reviewed published literature. PubMed IDs, not vibes."
            icon={<CitedIcon />}
          />
          <SupportingFeature
            number="03"
            title="Free"
            body="No signup, no payment. The output is yours."
          />
        </div>

        <p className="text-[11px] text-roji-dim text-center mt-20 leading-relaxed max-w-md mx-auto">
          For research and laboratory use only. Not intended for human dosing
          or ingestion. Must be 21+ to access related products.
        </p>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Feature cards                                                               */
/* -------------------------------------------------------------------------- */

function PrimaryFeature({
  number,
  title,
  body,
  icon,
}: {
  number: string;
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="roji-card !p-6 relative overflow-hidden group hover:border-roji-border-hover transition-colors">
      {/* Subtle accent corner that lights up on hover. */}
      <div
        aria-hidden="true"
        className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-roji-accent/5 blur-2xl group-hover:bg-roji-accent/15 transition-colors"
      />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="h-9 w-9 rounded-roji border border-roji-border bg-roji-accent-subtle text-roji-accent flex items-center justify-center">
            {icon}
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-roji-dim mt-1.5">
            {number}
          </span>
        </div>
        <h3 className="text-base font-semibold text-roji-text">{title}</h3>
        <p className="text-xs text-roji-muted mt-2 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function SupportingFeature({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-roji border border-dashed border-roji-border bg-transparent p-5 flex flex-col justify-center">
      <span className="font-mono text-[10px] uppercase tracking-widest text-roji-dim">
        {number} · {title}
      </span>
      <p className="text-xs text-roji-muted mt-1.5 leading-relaxed">{body}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Inline icons (no external deps — keeps the bundle lean)                     */
/* -------------------------------------------------------------------------- */

function CalibratedIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2 12V4M2 12h12M5 12V8M8 12V6M11 12V9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CitedIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3 3h7l3 3v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M10 3v3h3M5 9h6M5 11.5h4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
