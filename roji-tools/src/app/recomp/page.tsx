import type { Metadata } from "next";

import { RecompCalculator } from "@/components/RecompCalculator";
import { PageHero, MoreTools } from "@/components/PageChrome";
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
      <MoreTools currentSlug="recomp" />
    </>
  );
}
