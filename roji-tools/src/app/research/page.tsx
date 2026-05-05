import type { Metadata } from "next";

import { ResearchSearch } from "@/components/ResearchSearch";
import { PageHero, MoreTools, StoreCTA } from "@/components/PageChrome";
import { HeroShopCTA } from "@/components/HeroShopCTA";
import { StickyStoreBanner } from "@/components/StickyStoreBanner";
import { ToolView } from "@/components/ToolView";

export const metadata: Metadata = {
  title: "Research Database — searchable PubMed for biohackers",
  description:
    "Free, ad-free search of published peptide research. Plain-English summaries, study-type tags, direct PubMed links. No signup.",
};

export default function ResearchPage() {
  return (
    <>
      <ToolView slug="research" />
      <PageHero
        pill="Database · Free"
        title="Research Database"
        lede="PubMed, made human-readable. Search 30+ million peer-reviewed studies. Filter by study type. No accounts, no paywall."
      />
      <HeroShopCTA
        toolSlug="research"
        label="Many compounds in this database are stocked as ≥99% Janoshik-verified vials."
        buttonLabel="Browse referenced stacks →"
      />
      <ResearchSearch />
      <p className="mx-auto max-w-3xl px-6 pb-10 text-center text-xs text-roji-dim">
        All studies link directly to their original PubMed source. Results are
        for educational and informational purposes only.
      </p>
      <StoreCTA
        source="research"
        title="Pair literature with verified compounds"
        body="Roji Peptides provides research-only compounds with Janoshik-verified COAs for the compounds referenced in these studies. Every batch independently tested."
        buttonLabel="Browse referenced research stacks →"
      />
      <MoreTools currentSlug="research" />
      <StickyStoreBanner source="research" label="Verified research compounds from the team behind this database → Browse stacks" />
    </>
  );
}
