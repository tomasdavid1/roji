import Link from "next/link";

import { TOOLS, STORE_URL, PROTOCOL_URL } from "@/lib/tools";

export default function HomePage() {
  const grouped = TOOLS.reduce<Record<string, typeof TOOLS[number][]>>(
    (acc, t) => {
      (acc[t.category] = acc[t.category] || []).push(t);
      return acc;
    },
    {},
  );

  return (
    <>
      <section className="relative overflow-hidden border-b border-roji-border">
        <div className="roji-orb" aria-hidden="true" />
        <div className="relative mx-auto max-w-4xl px-6 pt-20 pb-16 text-center">
          <div className="roji-pill mb-5">Free · No accounts · No ads</div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl tracking-tight">
            Tools we wish someone else had built.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-roji-muted sm:text-lg">
            A working set of calculators, databases, and verifiers for the peptide research community. Built by{" "}
            <a
              href={STORE_URL}
              className="text-roji-accent hover:text-roji-accent-hover"
            >
              Roji Peptides
            </a>
            . Free because you shouldn't have to dig through Reddit threads to do reconstitution math.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm">
            <Link href="/reconstitution" className="roji-btn-primary">
              Reconstitution Calculator →
            </Link>
            <a href={PROTOCOL_URL} className="roji-btn">
              Protocol Engine →
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-14">
        {Object.entries(grouped).map(([cat, tools]) => (
          <div key={cat} className="mb-12 last:mb-0">
            <div className="mb-5 flex items-end justify-between">
              <h2 className="text-lg font-semibold">{cat}</h2>
              <span className="text-[11px] font-mono uppercase tracking-wider text-roji-muted">
                {tools.length} {tools.length === 1 ? "tool" : "tools"}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((t) => (
                <Link
                  key={t.slug}
                  href={t.href}
                  className="roji-card-interactive group flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-roji-accent">
                      {t.category}
                    </span>
                    {t.status === "beta" && (
                      <span className="rounded-full bg-roji-warning/10 px-2 py-[2px] text-[10px] font-mono uppercase tracking-wider text-roji-warning">
                        Beta
                      </span>
                    )}
                    {t.status === "soon" && (
                      <span className="rounded-full bg-roji-dim/10 px-2 py-[2px] text-[10px] font-mono uppercase tracking-wider text-roji-dim">
                        Soon
                      </span>
                    )}
                  </div>
                  <div className="text-lg font-semibold">{t.shortTitle}</div>
                  <p className="flex-1 text-sm leading-relaxed text-roji-muted">
                    {t.tagline}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-roji-dim">Open</span>
                    <span className="text-roji-accent transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <section className="border-t border-roji-border bg-roji-darker">
        <div className="mx-auto max-w-3xl px-6 py-14 text-center">
          <h3 className="text-2xl font-semibold">
            Why we ship these for free.
          </h3>
          <p className="mt-4 text-sm leading-relaxed text-roji-muted">
            Roji Peptides exists for serious researchers. Most of the math, reading, and verification you do before buying anything in this category is unnecessarily painful. Building these tools costs us a few weekends. The trust and goodwill it builds is worth a thousand banner ads.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-roji-muted">
            If you find one of these tools useful and you happen to need research-grade peptides, we'd love your business. If not — keep using the tools. They'll always be free.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a href={`${STORE_URL}/shop/`} className="roji-btn-primary">
              Browse research stacks →
            </a>
            <a href={`${STORE_URL}/research-library/`} className="roji-btn">
              Read our research library
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
