import type { Metadata } from "next";

import { CostPerDoseCalculator } from "@/components/CostPerDoseCalculator";
import { PageHero, MoreTools, StoreCTA } from "@/components/PageChrome";

export const metadata: Metadata = {
  title: "Cost-Per-Dose Calculator — true peptide cost across vendors",
  description:
    "Input vial mg + price + target dose. Get $/mg, $/dose, and total doses per vial. Compare any vendor anonymously.",
};

export default function CostPerDosePage() {
  return (
    <>
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
    </>
  );
}
