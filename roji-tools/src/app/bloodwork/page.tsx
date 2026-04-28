import type { Metadata } from "next";

import { BloodworkInterpreter } from "@/components/BloodworkInterpreter";
import { PageHero, MoreTools } from "@/components/PageChrome";

export const metadata: Metadata = {
  title: "Bloodwork Interpreter — free blood panel analyzer",
  description:
    "Free blood panel interpreter. See where each marker falls relative to reference ranges. Track multiple panels over time. No accounts.",
};

export default function BloodworkPage() {
  return (
    <>
      <PageHero
        pill="Calculator · Free"
        title="Bloodwork Interpreter"
        lede="Drop in a blood panel. We'll show you where each marker falls relative to standard reference ranges and explain what each one means."
      />
      <BloodworkInterpreter />
      <p className="mx-auto max-w-3xl px-6 pb-10 text-center text-xs text-roji-dim">
        This tool is for informational purposes only. It does not diagnose, treat, or interpret your health. Always consult a qualified healthcare provider for medical decisions.
      </p>
      <MoreTools currentSlug="bloodwork" />
    </>
  );
}
