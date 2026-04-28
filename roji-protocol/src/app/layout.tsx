import "@/styles/globals.css";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";

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

const SITE_URL = "https://protocol.rojipeptides.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Roji Research Tools — Free Calculators & Databases",
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
  },
  alternates: { canonical: SITE_URL },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adsId = process.env.NEXT_PUBLIC_GADS_ID;
  const ga4Id = process.env.NEXT_PUBLIC_GA4_ID;
  const gtagAnyId = adsId || ga4Id;
  // Cross-domain attribution between rojipeptides.com (store),
  // protocol.rojipeptides.com (this app), and tools.rojipeptides.com
  // (tools subdomain). Override via env for staging.
  const linkerDomains = (
    process.env.NEXT_PUBLIC_GTAG_LINKER_DOMAINS ??
    "rojipeptides.com,protocol.rojipeptides.com,tools.rojipeptides.com"
  )
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="bg-roji-black text-roji-text min-h-screen">
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
        {children}
      </body>
    </html>
  );
}
