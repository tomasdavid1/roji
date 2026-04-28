import { STORE_URL, TOOLS, toolHref } from "@/lib/tools";

/**
 * Site-wide footer.
 *
 * Three rows per spec:
 *   1. Tool name links (horizontal on desktop)
 *   2. Store link · Privacy · Terms
 *   3. Disclaimer copy (centered, 11px, muted, with top border)
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 px-5 pb-12">
      <div className="mx-auto max-w-3xl">
        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px] text-roji-muted">
          {TOOLS.map((tool) => (
            <li key={tool.slug}>
              <a
                href={toolHref(tool)}
                className="hover:text-roji-text transition-colors"
              >
                {tool.name}
              </a>
            </li>
          ))}
        </ul>

        <ul className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[13px] text-roji-muted">
          <li>
            <a
              href={STORE_URL}
              className="hover:text-roji-text transition-colors"
            >
              rojipeptides.com
            </a>
          </li>
          <li className="text-roji-dim" aria-hidden="true">
            ·
          </li>
          <li>
            <a
              href={`${STORE_URL}/privacy/`}
              className="hover:text-roji-text transition-colors"
            >
              Privacy
            </a>
          </li>
          <li className="text-roji-dim" aria-hidden="true">
            ·
          </li>
          <li>
            <a
              href={`${STORE_URL}/terms/`}
              className="hover:text-roji-text transition-colors"
            >
              Terms
            </a>
          </li>
        </ul>

        <p
          className="mt-6 mx-auto max-w-[700px] border-t border-white/[0.04] pt-6 text-center text-[11px] leading-relaxed text-roji-dim"
        >
          All tools are for educational and informational purposes only.
          These tools do not provide medical advice, diagnosis, or
          treatment recommendations. Products available on rojipeptides.com
          are intended for research and laboratory use only. Not intended
          for human dosing, injection, or ingestion. Must be 21+ to
          purchase. © {year} Roji Peptides. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
