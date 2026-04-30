import Link from "next/link";

import {
  ga4Id,
  gadsAddToCartLabel,
  gadsId,
  gadsLeadLabel,
  gadsPurchaseLabel,
  gadsToolCompleteLabel,
  storeUrl,
  toolsTestMode,
  toolsUrl,
} from "@/lib/env";

export const dynamic = "force-dynamic";

interface TrackingProbe {
  name: string;
  description: string;
  expected_event: string;
  url_to_check: string;
  how_to_verify: string;
}

function buildProbes(): TrackingProbe[] {
  const tools = toolsUrl();
  const store = storeUrl();
  return [
    {
      name: "Purchase (thank-you page) — PRIMARY",
      expected_event: "purchase + Google Ads conversion",
      description:
        "The macro-conversion the campaign optimizes against. Fires on the WooCommerce thank-you page after the reserve-order checkout, with full transaction value and items array. ROJI_GADS_PURCHASE_LABEL must be defined in Kinsta wp-config.php.",
      url_to_check: "(complete a real reserve-order checkout)",
      how_to_verify:
        "Add a product to cart on rojipeptides.com, complete the reserve-order checkout. On the thank-you page Tag Assistant should show a 'purchase' event with transaction_id + value + items, AND a Google Ads 'conversion' event firing 'send_to: AW-18130000394/<purchase_label>'.",
    },
    {
      name: "Add-to-cart (tools → store)",
      expected_event: "add_to_cart + Google Ads conversion",
      description:
        "Secondary signal. Fires when the WC cart is loaded via a Research Tools deep-link (?protocol_stack=... — query-param name retained for back-compat with WP wiring). Measures the tools→store transition.",
      url_to_check:
        store + "/cart/?protocol_stack=wolverine&utm_source=research_tools",
      how_to_verify:
        "Visit the URL with Tag Assistant. You should see an 'add_to_cart' event with an items array AND a Google Ads 'conversion' event firing 'send_to: AW-18130000394/<add_to_cart_label>' (only if ROJI_GADS_ADD_TO_CART_LABEL is defined in wp-config.php).",
    },
    {
      name: "Cross-domain linker (tools ↔ store)",
      expected_event: "_gl URL parameter on cross-domain navigation",
      description:
        "Critical for attribution. When a user clicks from Research Tools to the store, gtag's linker appends a `_gl=...` query parameter to the destination URL. Preserves gclid + GA4 client_id across subdomains so Google Ads can credit the conversion to the originating click.",
      url_to_check: tools,
      how_to_verify:
        "On a tools page, click any 'Buy on Roji' / 'View Stack' CTA that goes to rojipeptides.com. The destination URL should contain a `_gl=...` parameter. If it doesn't, check that NEXT_PUBLIC_GTAG_LINKER_DOMAINS lists both 'rojipeptides.com,tools.rojipeptides.com'.",
    },
    {
      name: "Tool completion (NOT WIRED — soft signal only)",
      expected_event: "tool_complete (GA4 only, no Google Ads conversion)",
      description:
        "Available as a soft mid-funnel signal but NOT currently wired as a Google Ads conversion. Campaigns optimize on `purchase`, not `tool_complete` — tool engagement is a poor proxy for buying intent. The toolComplete() helper exists in roji-tools/src/lib/track.ts for future use if we ever spin up a separate lead-gen campaign.",
      url_to_check: tools + "/results",
      how_to_verify:
        "Currently unused in production campaigns. Skip this probe unless explicitly running a lead-gen experiment.",
    },
    {
      name: "Lead capture (TEST mode only)",
      expected_event: "lead_capture (+ optional GAds conversion if label set)",
      description:
        "Only relevant when the Research Tools surface is in TOOLS_TEST_MODE (pre-store launch). Fires when a visitor submits the 'email me when this stack is ready' form. Skip in production.",
      url_to_check: tools + "/results",
      how_to_verify:
        "Skip in production (LIVE mode). In TEST mode, submit a real email through the form on the results page. Check that (a) Tag Assistant shows a 'lead_capture' event, (b) the API responds 201, (c) if ROJI_LEAD_WEBHOOK_URL is set, the webhook receives a JSON payload, (d) if NEXT_PUBLIC_GADS_LEAD_LABEL is set, a Google Ads 'conversion' event fires.",
    },
  ];
}

export default function TrackingPage() {
  const probes = buildProbes();
  const env = {
    GADS_ID: gadsId(),
    GADS_PURCHASE_LABEL: gadsPurchaseLabel(),
    GADS_ADD_TO_CART_LABEL: gadsAddToCartLabel(),
    GADS_TOOL_COMPLETE_LABEL: gadsToolCompleteLabel(),
    GADS_LEAD_LABEL: gadsLeadLabel(),
    GA4_ID: ga4Id(),
    TOOLS_TEST_MODE: toolsTestMode() ? "1" : undefined,
    TOOLS_URL: toolsUrl(),
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Tracking</h1>
        <p className="text-roji-muted text-sm mt-1 max-w-2xl">
          Conversion-tracking checklist. Use this to verify every event is
          firing on both apps before pressing &quot;Provision live&quot; on the
          Campaigns page.
        </p>
      </header>

      <section className="mb-6">
        <h2 className="text-[10px] font-mono uppercase tracking-widest text-roji-dim mb-2">
          Configured environment
        </h2>
        <div className="roji-card !p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
          {Object.entries(env).map(([k, v]) => (
            <div key={k}>
              <div className="text-roji-dim">{k}</div>
              <div
                className={
                  "mt-0.5 " + (v ? "text-roji-success" : "text-roji-warning")
                }
              >
                {v ? truncate(String(v), 24) : "(unset)"}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-roji-muted mt-2 leading-relaxed">
          Server-side env vars are not shown here for security. Set them in
          Vercel + the WordPress <code>wp-config.php</code>. Legacy names
          (<code>NEXT_PUBLIC_PROTOCOL_URL</code>,{" "}
          <code>NEXT_PUBLIC_PROTOCOL_TEST_MODE</code>,{" "}
          <code>NEXT_PUBLIC_GADS_PROTOCOL_LABEL</code>) still resolve as
          fallbacks for the new <code>TOOLS_*</code> /{" "}
          <code>TOOL_COMPLETE</code> names.
        </p>
      </section>

      <section className="space-y-4">
        {probes.map((p) => (
          <article key={p.name} className="roji-card !p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-sm font-semibold text-roji-text">{p.name}</h3>
              <span className="roji-pill-muted text-[10px] font-mono whitespace-nowrap">
                {p.expected_event}
              </span>
            </div>
            <p className="text-xs text-roji-muted leading-relaxed mb-3">
              {p.description}
            </p>
            <div className="text-[10px] font-mono uppercase tracking-widest text-roji-dim">
              URL to check
            </div>
            {p.url_to_check.startsWith("http") ? (
              <Link
                href={p.url_to_check}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-roji-accent break-all hover:underline"
              >
                {p.url_to_check} ↗
              </Link>
            ) : (
              <div className="text-xs font-mono text-roji-muted break-all">
                {p.url_to_check}
              </div>
            )}
            <div className="text-[10px] font-mono uppercase tracking-widest text-roji-dim mt-3">
              How to verify
            </div>
            <p className="text-xs text-roji-muted leading-relaxed mt-1">
              {p.how_to_verify}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-8 roji-card !p-5">
        <h2 className="text-sm font-semibold text-roji-text mb-2">
          Tag Assistant quick-start
        </h2>
        <ol className="text-xs text-roji-muted space-y-1.5 leading-relaxed list-decimal pl-4">
          <li>
            Install the{" "}
            <Link
              href="https://chromewebstore.google.com/detail/tag-assistant-companion/jmekfmbnaedfebfnmakmokmlfpblbfdm"
              target="_blank"
              rel="noopener"
              className="text-roji-accent hover:underline"
            >
              Google Tag Assistant Companion ↗
            </Link>{" "}
            extension.
          </li>
          <li>
            Go to{" "}
            <Link
              href="https://tagassistant.google.com/"
              target="_blank"
              rel="noopener"
              className="text-roji-accent hover:underline"
            >
              tagassistant.google.com ↗
            </Link>{" "}
            and enter the Roji Research Tools URL.
          </li>
          <li>
            Walk through the user journey (pick a tool → complete it → click
            through to the store).
          </li>
          <li>
            Each gtag event will appear in Tag Assistant&apos;s left rail with
            its parameters.
          </li>
        </ol>
      </section>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
