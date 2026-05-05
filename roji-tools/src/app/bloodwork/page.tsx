import type { Metadata } from "next";

import { BloodworkInterpreter } from "@/components/BloodworkInterpreter";
import { PageHero, MoreTools, StoreCTA } from "@/components/PageChrome";
import { HeroShopCTA } from "@/components/HeroShopCTA";
import { StickyStoreBanner } from "@/components/StickyStoreBanner";
import { ToolView } from "@/components/ToolView";

export const metadata: Metadata = {
  title: "Bloodwork Interpreter — free blood panel analyzer",
  description:
    "Free blood panel interpreter. See where each marker falls relative to reference ranges. Track multiple panels over time. No accounts.",
};

export default function BloodworkPage() {
  return (
    <>
      <ToolView slug="bloodwork" />
      <PageHero
        pill="Calculator · Free"
        title="Bloodwork Interpreter"
        lede="Drop in a blood panel. We'll show you where each marker falls relative to standard reference ranges and explain what each one means."
      />
      <HeroShopCTA
        toolSlug="bloodwork"
        label="Researching peptides alongside your bloodwork? See what we ship."
      />
      <BloodworkInterpreter />
      <p className="mx-auto max-w-3xl px-6 pb-10 text-center text-xs text-roji-dim">
        This tool is for informational purposes only. It does not diagnose, treat, or interpret your health. Always consult a qualified healthcare provider for medical decisions.
      </p>
      <StoreCTA
        source="bloodwork"
        title="Research compounds from the team behind this tool"
        body="Roji Peptides provides research-only compounds with third-party Janoshik verification, transparent COAs, and 21+ checkout controls."
        buttonLabel="Explore research tools and compounds →"
      />
      <MoreTools currentSlug="bloodwork" />
      <StickyStoreBanner source="bloodwork" label="Research compounds from the team behind this tool → Browse stacks" />
    </>
  );
}
