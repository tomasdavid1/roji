import "@/styles/globals.css";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
  variable: "--font-mono",
});

const SITE_URL = "https://tools.rojipeptides.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Roji Research Tools — Free Calculators & Databases",
    template: "%s · Roji Research Tools",
  },
  description:
    "Free research tools for the scientific community. Reconstitution calculators, half-life databases, COA analyzers, bloodwork interpreters, and more. No signup required.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Free Research Tools — Roji Peptides",
    description:
      "Calculators, analyzers, and databases for the research community. Free, no signup, open references.",
    type: "website",
    url: SITE_URL,
    siteName: "Roji Research Tools",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Research Tools — Roji Peptides",
    description:
      "Calculators, analyzers, and databases for the research community. Free, no signup, open references.",
    images: ["/opengraph-image.png"],
  },
  alternates: { canonical: SITE_URL },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Default to the production Roji GA4 stream so the site is tracked
  // out of the box on Vercel without requiring an env-var migration.
  // Override per-environment by setting NEXT_PUBLIC_GA4_ID.
  const ga4Id = process.env.NEXT_PUBLIC_GA4_ID ?? "G-7SK3K1GD0N";
  // Google Ads conversion ID — only set once the Ads account is approved
  // and a conversion action exists. Until then this is intentionally
  // undefined so we don't fire an empty AW config.
  const adsId = process.env.NEXT_PUBLIC_GADS_ID;
  const gtagAnyId = adsId || ga4Id;
  // Cross-domain attribution between the store and the tools subdomain.
  // protocol.rojipeptides.com is included so any 301'd legacy traffic
  // still preserves gclid / GA4 client_id during the bounce.
  const linkerDomains = (
    process.env.NEXT_PUBLIC_GTAG_LINKER_DOMAINS ??
    "rojipeptides.com,tools.rojipeptides.com,protocol.rojipeptides.com"
  )
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="bg-roji-black text-roji-text min-h-screen flex flex-col">
        {gtagAnyId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gtagAnyId}`}
              strategy="afterInteractive"
            />
            <Script id="gtag-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                ${ga4Id ? `gtag('config', '${ga4Id}', { linker: { domains: ${JSON.stringify(linkerDomains)} } });` : ""}
                ${adsId ? `gtag('config', '${adsId}', { linker: { domains: ${JSON.stringify(linkerDomains)} } });` : ""}
              `}
            </Script>
          </>
        )}
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
