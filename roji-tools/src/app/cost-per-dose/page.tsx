import type { Metadata } from "next";

import { CostPerDoseCalculator } from "@/components/CostPerDoseCalculator";
import { PageHero, MoreTools, StoreCTA } from "@/components/PageChrome";
import { StickyStoreBanner } from "@/components/StickyStoreBanner";
import { ToolView } from "@/components/ToolView";
import { ToolJsonLd } from "@/components/ToolJsonLd";

export const metadata: Metadata = {
  title: "Cost-Per-Dose Calculator — true peptide cost across vendors",
  description:
    "Input vial mg + price + target dose. Get $/mg, $/dose, and total doses per vial. Compare any vendor anonymously.",
};

export default function CostPerDosePage() {
  return (
    <>
      <ToolJsonLd
        slug="cost-per-dose"
        name="Peptide Cost-Per-Dose Comparison Calculator"
        description="Compare research cost across peptide vendors. Input vial mg, purity, price, and shipping. Get per-vendor: cost per mg, cost per dose, total doses per vial, and best-value highlight."
        featureList={[
          "Vendor-agnostic — add any number of entries",
          "Cost per mg + cost per dose + total doses",
          "Effective mg accounting for purity",
          "Best-value highlight",
        ]}
      />
      <ToolView slug="cost-per-dose" />
      <PageHero
        pill="Calculator · Free"
        title="Cost-Per-Dose Comparison"
        lede="What's a vial actually costing you per dose? Add any number of vendor entries — we do the math and rank them."
      />
      <CostPerDoseCalculator />
      <StoreCTA
        source="cost-per-dose"
        title="See where Roji lands."
        body="Add 'Roji' as one of your vendor entries above and compare directly. We're confident in the math; we don't have to bury it in marketing fluff."
      />
      <MoreTools currentSlug="cost-per-dose" />
      <StickyStoreBanner source="cost-per-dose" label="Add Roji to your comparison → See our pricing" />
    </>
  );
}
