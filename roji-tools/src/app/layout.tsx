import "@/styles/globals.css";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

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

export const metadata: Metadata = {
  title: {
    default: "Roji Tools — Free calculators for the peptide research community",
    template: "%s · Roji Tools",
  },
  description:
    "Free, ad-free, research-grade tools: reconstitution calculator, half-life database, COA verifier, bloodwork interpreter, body recomp planner, and more. Built by Roji Peptides.",
  robots: { index: true, follow: true },
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
  // protocol.rojipeptides.com (engine), and tools.rojipeptides.com (this app).
  const linkerDomains = (
    process.env.NEXT_PUBLIC_GTAG_LINKER_DOMAINS ??
    "rojipeptides.com,protocol.rojipeptides.com,tools.rojipeptides.com"
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
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
