import { redirect } from "next/navigation";

export default function RootPage() {
  // Default landing: KPIs at a glance. Funnel/path/behavioral analysis
  // lives in GA4 Explore (see ADS-PLAYBOOK.md → "GA4 Explore reports —
  // recipes"). The /funnel page in this dashboard remains as a
  // Google-Ads-side cross-cut (ad-click → Reserve order with spend +
  // implied CAC), but it's not the daily landing surface.
  redirect("/performance");
}
