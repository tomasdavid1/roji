import type { Metadata } from "next";

import { RecompCalculator } from "@/components/RecompCalculator";
import { PageHero, MoreTools, StoreCTA } from "@/components/PageChrome";

export const metadata: Metadata = {
  title: "Body Recomp Calculator — TDEE, macros, and 16-week projection",
  description:
    "Calculate TDEE, macros, and project lean mass over 8/12/16 weeks based on your goal, training frequency, and current body composition.",
};

export default function RecompPage() {
  return (
    <>
      <PageHero
        pill="Calculator · Free"
        title="Body Recomp Calculator"
        lede="TDEE, macros, and a realistic projection of your body composition over 8, 12, and 16 weeks. Pick a goal — we do the math."
      />
      <RecompCalculator />
      <StoreCTA
        source="recomp"
        title="Calibrate the rest of your protocol."
        body="Once you know your calorie + macro target, the Roji Protocol Engine builds a research-backed compound stack to match your goal and timeframe."
        buttonLabel="Open the Protocol Engine →"
        href={process.env.NEXT_PUBLIC_PROTOCOL_URL ?? "https://protocol.rojipeptides.com"}
      />
      <MoreTools currentSlug="recomp" />
    </>
  );
}
