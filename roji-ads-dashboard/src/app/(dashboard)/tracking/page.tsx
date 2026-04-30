import Link from "next/link";

import {
  ga4Id,
  gadsId,
  gadsLeadLabel,
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
      name: "Tool completion",
      expected_event: "tool_complete (+ Google Ads conversion)",
      description:
        "Fires when a user finishes a calculator/framework tool and sees their generated output. The single most important micro-conversion — Google Ads optimizes against this until 30+ purchases have landed.",
      url_to_check: tools + "/results",
      how_to_verify:
        "Open Roji Research Tools in Chrome with Tag Assistant Companion enabled. Complete a calculator. On the results page, Tag Assistant should show a 'tool_complete' event AND (if NEXT_PUBLIC_GADS_TOOL_COMPLETE_LABEL is set) a 'conversion' event going to AW-XXXX/yourLabel. Legacy event name 'protocol_complete' is still emitted in parallel for back-compat.",
    },
    {
      name: "Lead capture (TEST mode only)",
      expected_event: "lead_capture (+ Google Ads conversion if label set)",
      description:
        "Only relevant when the Research Tools surface is in TEST_MODE (pre-store launch). Fires when a visitor submits the 'email me when this stack is ready' form.",
      url_to_check: tools + "/results",
      how_to_verify:
        "Submit a real email through the form on the results page. Check that (a) Tag Assistant shows a 'lead_capture' event, (b) the API responds 201, (c) if ROJI_LEAD_WEBHOOK_URL is set, the webhook receives a JSON payload, (d) if NEXT_PUBLIC_GADS_LEAD_LABEL is set, a Google Ads 'conversion' event fires.",
    },
    {
      name: "Add-to-cart (tools → store)",
      expected_event: "add_to_cart (+ optional GAds conversion)",
      description:
        "Fires only when the WC cart is loaded via a Research Tools deep-link (?protocol_stack=... — query-param name retained for back-compat with WP wiring). Measures the tools→store transition.",
      url_to_check:
        store + "/cart/?protocol_stack=wolverine&utm_source=research_tools",
      how_to_verify:
        "Visit the URL with Tag Assistant. You should see an 'add_to_cart' event with an items array. The Google Ads conversion fires only if ROJI_GADS_ADD_TO_CART_LABEL is defined in wp-config.php.",
    },
    {
      name: "Purchase (thank-you page)",
      expected_event: "purchase + conversion",
      description:
        "The macro-conversion. Fires on the WooCommerce thank-you page with full transaction value and items array. Once 30+ purchases land, switch the campaign primary conversion from tool_complete to purchase.",
      url_to_check: "(complete a real test order)",
      how_to_verify:
        "Place a test order through the full checkout. On the thank-you page Tag Assistant should show a 'purchase' event with transaction_id + value + items, and a Google Ads 'conversion' event using ROJI_GADS_PURCHASE_LABEL.",
    },
    {
      name: "Cross-domain linker",
      expected_event: "_gl URL parameter",
      description:
        "When a user clicks from Research Tools to the store, the gtag linker should append a `_gl=...` query parameter to the destination URL. Preserves gclid + GA4 client_id across subdomains.",
      url_to_check: tools,
      how_to_verify:
        "On the Research Tools results page, complete a tool and click through to the store. The destination URL should contain a `_gl=` parameter. If it doesn't, check that NEXT_PUBLIC_GTAG_LINKER_DOMAINS lists both domains.",
    },
  ];
}

export default function TrackingPage() {
  const probes = buildProbes();
  const env = {
    GADS_ID: gadsId(),
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
