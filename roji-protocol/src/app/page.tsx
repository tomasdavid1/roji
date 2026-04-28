import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-16">
      <div className="max-w-2xl w-full">
        <div className="text-center">
          <span className="font-mono text-xs uppercase tracking-widest text-roji-accent">
            Roji Peptides
          </span>
          <h1 className="text-4xl sm:text-5xl font-semibold mt-4 leading-tight">
            Build your research
            <br />
            protocol in 60 seconds.
          </h1>
          <p className="mt-6 text-roji-muted text-base leading-relaxed max-w-xl mx-auto">
            A free, evidence-based research protocol calculator. Input your
            parameters, get a personalized framework with published references
            and a calibrated compound schedule.
          </p>

          <div className="mt-10 flex items-center justify-center gap-3">
            <Link href="/protocol" className="roji-btn-primary !px-7 !py-4 text-base">
              Start protocol builder →
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-3 text-left">
            <Feature
              meta="01"
              title="Calibrated"
              body="Dosing scaled by body weight (mcg/kg), sex, and prior research experience."
            />
            <Feature
              meta="02"
              title="Cited"
              body="Every recommendation links to peer-reviewed published literature."
            />
            <Feature
              meta="03"
              title="Free"
              body="No signup. No payment. The tool is free and the output is yours."
            />
          </div>
        </div>

        <p className="text-[11px] text-roji-dim text-center mt-16 leading-relaxed">
          For research and laboratory use only. Not intended for human dosing
          or ingestion. Must be 21+ to access related products.
        </p>
      </div>
    </main>
  );
}

function Feature({
  meta,
  title,
  body,
}: {
  meta: string;
  title: string;
  body: string;
}) {
  return (
    <div className="roji-card !p-5">
      <span className="font-mono text-[10px] uppercase tracking-widest text-roji-dim">
        {meta}
      </span>
      <h3 className="text-sm font-semibold mt-2 text-roji-text">{title}</h3>
      <p className="text-xs text-roji-muted mt-1.5 leading-relaxed">{body}</p>
    </div>
  );
}
