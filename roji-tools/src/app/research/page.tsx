import type { Metadata } from "next";

import { ResearchSearch } from "@/components/ResearchSearch";
import { PageHero, MoreTools } from "@/components/PageChrome";
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
      <ResearchSearch />
      <p className="mx-auto max-w-3xl px-6 pb-10 text-center text-xs text-roji-dim">
        All studies link directly to their original PubMed source. Results are
        for educational and informational purposes only.
      </p>
      <MoreTools currentSlug="research" />
    </>
  );
}
