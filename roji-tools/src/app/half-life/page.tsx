import type { Metadata } from "next";

import { HalfLifeBrowser } from "@/components/HalfLifeBrowser";
import { PageHero, MoreTools, StoreCTA } from "@/components/PageChrome";
import { HeroShopCTA } from "@/components/HeroShopCTA";
import { StickyStoreBanner } from "@/components/StickyStoreBanner";
import { ToolView } from "@/components/ToolView";
import { ToolJsonLd, DatasetJsonLd } from "@/components/ToolJsonLd";
import { COMPOUNDS } from "@/data/compounds";

export const metadata: Metadata = {
  title: "Compound Half-Life Database — peptide pharmacokinetics",
  description:
    "Half-life, molecular weight, route, and storage data for 20+ research peptides. Each entry cited from peer-reviewed literature.",
};

export default function HalfLifePage() {
  return (
    <>
      <ToolJsonLd
        slug="half-life"
        name="Compound Half-Life Database"
        description="Curated half-life, molecular weight, route, and storage data for 20+ research peptides including BPC-157, TB-500, CJC-1295, Ipamorelin, MK-677, Selank, Semax, and PT-141. Each entry cited from peer-reviewed literature."
        featureList={[
          "Half-life ranges with literature citations",
          "Molecular weight and pharmacokinetic profiles",
          "Decay curve visualizations",
          "Storage and stability notes",
        ]}
      />
      <DatasetJsonLd
        slug="half-life"
        name="Roji Peptide Half-Life Reference Dataset"
        description="Curated half-life, molecular weight, mechanism, and storage data for research peptides. Each entry references peer-reviewed PubMed citations."
        count={COMPOUNDS.length}
        citation="Citations sourced from peer-reviewed literature on PubMed."
      />
      <ToolView slug="half-life" />
      <PageHero
        pill="Database · Free"
        title="Compound Half-Life Database"
        lede="Half-life ranges, molecular weights, and pharmacokinetics for the most-researched bioactive peptides. Every entry cited."
      />
      <HeroShopCTA
        toolSlug="half-life"
        label="Most compounds in this database are in stock as ≥99% Janoshik-verified vials."
        buttonLabel="See available compounds →"
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
