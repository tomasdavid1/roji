import Link from "next/link";

import { TOOLS, STORE_URL, PROTOCOL_URL } from "@/lib/tools";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-roji-border bg-roji-darker">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-roji-accent">Roji</span>
              <span className="text-[11px] font-mono uppercase tracking-wider text-roji-muted">
                Tools
              </span>
            </div>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-roji-muted">
              Free, ad-free, research-grade tools for the peptide and biohacker
              community. No paywalls, no upsells in your face — built and
              maintained by{" "}
              <a
                href={STORE_URL}
                className="text-roji-accent hover:text-roji-accent-hover"
              >
                Roji Peptides
              </a>
              .
            </p>
            <p className="mt-4 text-xs leading-relaxed text-roji-dim">
              These tools are provided for informational and research purposes
              only. Nothing here is medical advice. Always consult a qualified
              healthcare provider for medical decisions.
            </p>
          </div>

          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-roji-muted">
              Tools
            </div>
            <ul className="mt-3 grid gap-2 text-sm">
              {TOOLS.slice(0, 6).map((t) => (
                <li key={t.slug}>
                  <Link
                    href={t.href}
                    className="text-roji-text/80 hover:text-roji-text transition-colors"
                  >
                    {t.shortTitle}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-roji-muted">
              Roji
            </div>
            <ul className="mt-3 grid gap-2 text-sm">
              <li>
                <a
                  href={PROTOCOL_URL}
                  className="text-roji-text/80 hover:text-roji-text transition-colors"
                >
                  Protocol Engine
                </a>
              </li>
              <li>
                <a
                  href={STORE_URL}
                  className="text-roji-text/80 hover:text-roji-text transition-colors"
                >
                  Shop
                </a>
              </li>
              <li>
                <a
                  href={`${STORE_URL}/research-library/`}
                  className="text-roji-text/80 hover:text-roji-text transition-colors"
                >
                  Research Library
                </a>
              </li>
              <li>
                <a
                  href={`${STORE_URL}/coa/`}
                  className="text-roji-text/80 hover:text-roji-text transition-colors"
                >
                  COA Library
                </a>
              </li>
              <li>
                <a
                  href={`${STORE_URL}/become-an-affiliate/`}
                  className="text-roji-text/80 hover:text-roji-text transition-colors"
                >
                  Affiliate Program
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-roji-border pt-6 text-xs text-roji-dim md:flex-row md:items-center md:justify-between">
          <div>© {year} Bonetti Software LLC d/b/a Roji Peptides.</div>
          <div className="flex gap-4">
            <a
              href={`${STORE_URL}/terms/`}
              className="hover:text-roji-text transition-colors"
            >
              Terms
            </a>
            <a
              href={`${STORE_URL}/privacy/`}
              className="hover:text-roji-text transition-colors"
            >
              Privacy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
