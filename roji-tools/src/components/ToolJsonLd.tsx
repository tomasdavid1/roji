/**
 * Per-tool JSON-LD structured data.
 *
 * Drop this component on any tool page (reconstitution, half-life,
 * COA, cost-per-dose, etc.) to emit a `SoftwareApplication` schema
 * that tells search engines and LLM grounding layers exactly what
 * the page is.
 *
 * Why a separate component (not just inline JSON in each page):
 *   - Single source of truth for the shape and required fields.
 *   - Easier to add `FAQPage` and `Dataset` overlays later without
 *     touching every page.
 *   - Easier to test/lint that every tool page calls it.
 *
 * Schema.org context:
 *   `applicationCategory: "ScientificResearchApplication"` is the
 *   correct value per <https://schema.org/SoftwareApplication> for
 *   research/academic tools. Google Search Console accepts this
 *   without warnings; Google Dataset Search uses it as a hint
 *   that the result is research-relevant.
 *
 *   `offers: { price: "0" }` is required when a SoftwareApplication
 *   is free — without it, Google will warn about an incomplete
 *   schema even though there's no actual offer to make.
 */

import Script from "next/script";

const SITE_URL = "https://tools.rojipeptides.com";
const STORE_URL = "https://rojipeptides.com";

interface ToolJsonLdProps {
  /** Tool slug — used as the `@id` and as part of the canonical URL. */
  slug: string;
  /** Human-readable tool name (e.g. "Reconstitution Calculator"). */
  name: string;
  /** One-sentence description, ≤300 chars. */
  description: string;
  /** Optional list of features for the `featureList` field. */
  featureList?: string[];
  /** Optional FAQ entries to emit as a sibling FAQPage schema. */
  faqs?: { question: string; answer: string }[];
}

export function ToolJsonLd({
  slug,
  name,
  description,
  featureList,
  faqs,
}: ToolJsonLdProps) {
  const url = `${SITE_URL}/${slug}`;
  const application = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${url}#software`,
    name,
    description,
    url,
    applicationCategory: "ScientificResearchApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires a modern browser with JavaScript.",
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    publisher: { "@id": `${STORE_URL}/#organization` },
    inLanguage: "en-US",
    ...(featureList && featureList.length > 0
      ? { featureList: featureList.join(", ") }
      : {}),
  };

  const faqPage =
    faqs && faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "@id": `${url}#faq`,
          mainEntity: faqs.map((q) => ({
            "@type": "Question",
            name: q.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: q.answer,
            },
          })),
        }
      : null;

  return (
    <>
      <Script
        id={`ld-tool-${slug}`}
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(application) }}
      />
      {faqPage && (
        <Script
          id={`ld-faq-${slug}`}
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
        />
      )}
    </>
  );
}

interface DatasetJsonLdProps {
  slug: string;
  name: string;
  description: string;
  /** Number of records in the dataset. */
  count?: number;
  /** Where the data is sourced from (e.g. "PubMed citations"). */
  citation?: string;
}

/**
 * Specialized schema for the half-life database.
 *
 * Datasets are crawled separately by Google Dataset Search
 * (<https://datasetsearch.research.google.com/>) — emitting
 * `Dataset` schema gets us into that index, which is *the* place
 * researchers go when looking for structured biomedical reference
 * data. We're the only peptide vendor with a curated half-life
 * dataset; this is a moat-able position if we claim it.
 */
export function DatasetJsonLd({
  slug,
  name,
  description,
  count,
  citation,
}: DatasetJsonLdProps) {
  const url = `${SITE_URL}/${slug}`;
  const dataset = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${url}#dataset`,
    name,
    description,
    url,
    keywords:
      "peptide pharmacokinetics, half-life, research compounds, BPC-157, TB-500, CJC-1295, Ipamorelin, MK-677",
    license: "https://creativecommons.org/licenses/by-nc/4.0/",
    creator: { "@id": `${STORE_URL}/#organization` },
    isAccessibleForFree: true,
    inLanguage: "en-US",
    ...(count != null
      ? {
          variableMeasured: `${count} research compound entries`,
        }
      : {}),
    ...(citation ? { citation } : {}),
  };
  return (
    <Script
      id={`ld-dataset-${slug}`}
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(dataset) }}
    />
  );
}
