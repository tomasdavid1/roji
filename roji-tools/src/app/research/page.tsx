import type { Metadata } from "next";

import { ResearchSearch } from "@/components/ResearchSearch";
import { PageHero, MoreTools, StoreCTA } from "@/components/PageChrome";

export const metadata: Metadata = {
  title: "Peptide Research Library — searchable PubMed for biohackers",
  description:
    "Free, ad-free search of published peptide research. Plain-English summaries, study-type tags, direct PubMed links.",
};

export default function ResearchPage() {
  return (
    <>
      <PageHero
        pill="Database · Free"
        title="Peptide Research Library"
        lede="PubMed, made human-readable. Search 30+ million peer-reviewed studies. Filter by study type. No accounts, no paywall."
      />
      <ResearchSearch />
      <StoreCTA
        source="research"
        title="Research a compound, then source it cleanly."
        body="When you've decided which compound you want to work with, Roji ships ≥99% Janoshik-verified vials with the COA on file."
      />
      <MoreTools currentSlug="research" />
    </>
  );
}
