import { SiteFooter } from "@/components/SiteFooter";
import { ToolCard } from "@/components/ToolCard";
import { TrustSignals } from "@/components/TrustSignals";
import { TypewriterRotator } from "@/components/TypewriterRotator";
import { STORE_URL, TOOLS } from "@/lib/tools";

export default function HomePage() {
  return (
    <>
      <main className="relative min-h-screen overflow-hidden">
        {/* Ambient depth: dotted grid + indigo orb behind the hero. */}
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

        <div className="relative px-5 pt-24 pb-12 sm:pt-28 lg:pt-32">
          {/* ── HERO ────────────────────────────────────────────────── */}
          <section className="max-w-3xl mx-auto text-center">
            <span
              className="inline-flex items-center gap-2 font-mono uppercase text-roji-accent"
              style={{
                fontSize: "11px",
                letterSpacing: "0.2em",
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full bg-roji-accent shadow-[0_0_12px_rgba(79,109,245,0.8)]"
                aria-hidden="true"
              />
              Roji Peptides · Research Tools
            </span>

            <h1 className="text-[40px] sm:text-[56px] lg:text-[64px] font-semibold mt-5 leading-[1.05] tracking-tightest">
              Free tools for{" "}
              <TypewriterRotator
                words={["researchers", "biohackers", "the curious", "your lab"]}
                className="text-roji-accent"
              />
            </h1>

            <p
              className="mt-7 text-roji-muted text-base sm:text-lg leading-relaxed mx-auto"
              style={{ maxWidth: "520px" }}
            >
              Calculators, analyzers, and databases. No signup. No cost. Built
              by researchers who understand the science.
            </p>
          </section>

          {/* ── TOOL GRID ───────────────────────────────────────────── */}
          <section className="mt-20 max-w-4xl mx-auto" aria-labelledby="tools-heading">
            <h2
              id="tools-heading"
              className="font-mono uppercase text-roji-accent mb-5"
              style={{ fontSize: "11px", letterSpacing: "0.2em" }}
            >
              Tools
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TOOLS.map((tool) => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
            </div>
          </section>

          {/* ── TRUST SIGNALS ───────────────────────────────────────── */}
          <section className="mt-12 max-w-4xl mx-auto" aria-label="Trust signals">
            <TrustSignals />
          </section>

          {/* ── ABOUT ──────────────────────────────────────────────── */}
          <section
            className="mt-20 max-w-2xl mx-auto text-center"
            aria-labelledby="about-heading"
          >
            <h2
              id="about-heading"
              className="text-2xl sm:text-3xl font-semibold text-roji-text"
            >
              Built by Roji Peptides
            </h2>
            <p className="mt-4 text-roji-muted leading-relaxed">
              We build tools for the research community because we are the
              research community. Every tool is free, every data point is
              referenced, and every calculation is transparent. Our research
              compound stacks are held to the same standard — third-party
              tested, independently verified, 99%+ purity guaranteed.
            </p>
            <a
              href={`${STORE_URL}/shop/?utm_source=protocol_landing&utm_medium=referral&utm_campaign=tools_directory`}
              className="mt-6 inline-flex items-center gap-1.5 text-roji-accent hover:text-roji-accent-hover transition-colors text-sm font-medium"
            >
              Explore research stacks
              <span aria-hidden="true">→</span>
            </a>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
