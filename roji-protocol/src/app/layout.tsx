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

export const metadata: Metadata = {
  title: "Roji Protocol Engine — Build your research protocol",
  description:
    "Free research protocol builder. Personalized, evidence-based protocol framework for research compounds. Powered by Roji Peptides.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adsId = process.env.NEXT_PUBLIC_GADS_ID;
  const ga4Id = process.env.NEXT_PUBLIC_GA4_ID;
  const gtagAnyId = adsId || ga4Id;

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
                ${adsId ? `gtag('config', '${adsId}');` : ""}
                ${ga4Id ? `gtag('config', '${ga4Id}');` : ""}
              `}
            </Script>
          </>
        )}
        {children}
      </body>
    </html>
  );
}
