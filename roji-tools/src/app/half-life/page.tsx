import type { Metadata } from "next";

import { HalfLifeBrowser } from "@/components/HalfLifeBrowser";
import { PageHero, MoreTools, StoreCTA } from "@/components/PageChrome";
import { StickyStoreBanner } from "@/components/StickyStoreBanner";
import { ToolView } from "@/components/ToolView";

export const metadata: Metadata = {
  title: "Compound Half-Life Database — peptide pharmacokinetics",
  description:
    "Half-life, molecular weight, route, and storage data for 20+ research peptides. Each entry cited from peer-reviewed literature.",
};

export default function HalfLifePage() {
  return (
    <>
      <ToolView slug="half-life" />
      <PageHero
        pill="Database · Free"
        title="Compound Half-Life Database"
        lede="Half-life ranges, molecular weights, and pharmacokinetics for the most-researched bioactive peptides. Every entry cited."
      />
      <HalfLifeBrowser />
      <StoreCTA
        source="halflife"
        title="Need pure compounds for research?"
        body="Roji Peptides ships ≥99% Janoshik-verified vials of the compounds listed in this database. Each batch comes with a third-party COA."
      />
      <MoreTools currentSlug="half-life" />
      <StickyStoreBanner source="halflife" label="These compounds are available as research stacks → View shop" />
    </>
  );
}
