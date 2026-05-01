import type { Metadata } from "next";

import { RecompCalculator } from "@/components/RecompCalculator";
import { PageHero, MoreTools, StoreCTA } from "@/components/PageChrome";
import { StickyStoreBanner } from "@/components/StickyStoreBanner";
import { ToolView } from "@/components/ToolView";

export const metadata: Metadata = {
  title: "Body Recomp Calculator — TDEE, macros, and 16-week projection",
  description:
    "Calculate TDEE, macros, and project lean mass over 8/12/16 weeks based on your goal, training frequency, and current body composition.",
};

export default function RecompPage() {
  return (
    <>
      <ToolView slug="recomp" />
      <PageHero
        pill="Calculator · Free"
        title="Body Recomp Calculator"
        lede="TDEE, macros, and a realistic projection of your body composition over 8, 12, and 16 weeks. Pick a goal — we do the math."
      />
      <RecompCalculator />
      <StoreCTA
        source="recomp"
        title="Planning research variables?"
        body="Roji Peptides ships third-party verified research compound stacks calibrated for recovery and recomposition research. Every batch Janoshik-verified, ≥99% purity."
        buttonLabel="Explore research stacks →"
      />
      <MoreTools currentSlug="recomp" />
      <StickyStoreBanner source="recomp" label="Explore research stacks calibrated for recomp → Browse shop" />
    </>
  );
}
