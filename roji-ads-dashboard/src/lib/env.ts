/**
 * Central env-var resolver for the dashboard.
 *
 * History note: the calculator/wizard surface used to live at
 * `protocol.rojipeptides.com` and the env vars were named
 * `NEXT_PUBLIC_PROTOCOL_*`. It now lives at `tools.rojipeptides.com` under the
 * "Research Tools" framing (compliance: no "protocol" language in customer-
 * facing copy or ads). To avoid a hard env-var migration on Vercel, every
 * accessor below reads the new `NEXT_PUBLIC_TOOLS_*` name first and falls
 * back to the legacy `NEXT_PUBLIC_PROTOCOL_*` value.
 *
 * Migrate at your own pace; both names work indefinitely. Once the legacy
 * keys are unset on Vercel, drop the fallbacks here in a future cleanup.
 */

export const DEFAULT_TOOLS_URL = "https://tools.rojipeptides.com";
export const DEFAULT_STORE_URL = "https://rojipeptides.com";

export function toolsUrl(): string {
  return (
    process.env.NEXT_PUBLIC_TOOLS_URL ||
    process.env.NEXT_PUBLIC_PROTOCOL_URL ||
    DEFAULT_TOOLS_URL
  );
}

export function storeUrl(): string {
  return process.env.ROJI_STORE_URL || DEFAULT_STORE_URL;
}

export function toolsTestMode(): boolean {
  return (
    process.env.NEXT_PUBLIC_TOOLS_TEST_MODE === "1" ||
    process.env.NEXT_PUBLIC_PROTOCOL_TEST_MODE === "1"
  );
}

export function gadsId(): string | undefined {
  return process.env.NEXT_PUBLIC_GADS_ID || undefined;
}

export function ga4Id(): string | undefined {
  return process.env.NEXT_PUBLIC_GA4_ID || undefined;
}

/**
 * Conversion-action label for the macro tool-completion event.
 * Was `protocol_complete`; now `tool_complete` going forward.
 */
export function gadsToolCompleteLabel(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_GADS_TOOL_COMPLETE_LABEL ||
    process.env.NEXT_PUBLIC_GADS_PROTOCOL_LABEL ||
    undefined
  );
}

export function gadsLeadLabel(): string | undefined {
  return process.env.NEXT_PUBLIC_GADS_LEAD_LABEL || undefined;
}

/**
 * Conversion-action label for the PRIMARY purchase macro-conversion. Fires on
 * the WooCommerce thank-you page after the reserve-order checkout. This is the
 * label campaigns optimize against.
 */
export function gadsPurchaseLabel(): string | undefined {
  return process.env.NEXT_PUBLIC_GADS_PURCHASE_LABEL || undefined;
}

/**
 * Conversion-action label for the secondary add-to-cart signal. Fires when the
 * cart is loaded with items (typically via a tools deep-link).
 */
export function gadsAddToCartLabel(): string | undefined {
  return process.env.NEXT_PUBLIC_GADS_ADD_TO_CART_LABEL || undefined;
}
