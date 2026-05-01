/**
 * Global JSON-LD structured data emitted on every page.
 *
 * Why this exists:
 *   The LLM-VISIBILITY-AUDIT found that tools.rojipeptides.com has
 *   zero structured data — no Organization, no WebSite, no
 *   SoftwareApplication, no Dataset, no FAQPage. Schema.org markup
 *   is the single highest-leverage signal for Answer Engine
 *   Optimization (AEO) — it's how Bing/ChatGPT, Google AI Overviews,
 *   Perplexity, and Claude (via Brave) disambiguate "what is this
 *   site about" without crawling all of it linearly.
 *
 *   See: LLM-VISIBILITY-AUDIT.md, Tier 2 recommendations.
 *
 * What we emit globally (this component):
 *   - **Organization**: Bonetti Software LLC d/b/a Roji Peptides,
 *     legal name, logo, sameAs links to social/canonical URLs.
 *   - **WebSite**: the tools subdomain itself, with a SearchAction
 *     pointing at the tool directory.
 *
 * What we emit per-page (via `<ToolJsonLd>` and friends):
 *   - **SoftwareApplication**: each calculator / database tool.
 *     Marked `applicationCategory: "ScientificResearchApplication"`
 *     with `offers: { price: "0" }` since they're free.
 *   - **Dataset** for the half-life database.
 *   - **FAQPage** for tools that publish "How does it work?" copy.
 *
 * Important: keep this small. Schema.org payloads above ~5KB get
 * truncated by some crawlers. The global section is intentionally
 * minimal so per-page schemas have headroom.
 */

import Script from "next/script";

const SITE_URL = "https://tools.rojipeptides.com";
const STORE_URL = "https://rojipeptides.com";
const LOGO_URL = `${SITE_URL}/r-mark.svg`;

const ORGANIZATION = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${STORE_URL}/#organization`,
  name: "Roji Peptides",
  legalName: "Bonetti Software LLC",
  alternateName: "Roji",
  url: STORE_URL,
  logo: {
    "@type": "ImageObject",
    url: LOGO_URL,
    width: 512,
    height: 512,
  },
  description:
    "Research-grade peptide stacks for laboratory use. US-based, third-party tested, COA-verified.",
  sameAs: [SITE_URL, `${STORE_URL}/coa/`, `${STORE_URL}/research-library/`],
} as const;

const WEBSITE = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: "Roji Research Tools",
  description:
    "Free peptide research calculators, half-life databases, COA analyzers, and PubMed search tools.",
  publisher: { "@id": `${STORE_URL}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
  inLanguage: "en-US",
} as const;

export function SiteJsonLd() {
  // Two scripts (one per @id) keeps each payload compact and
  // makes search-console audits easier to read.
  return (
    <>
      <Script
        id="ld-organization"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION) }}
      />
      <Script
        id="ld-website"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE) }}
      />
    </>
  );
}
