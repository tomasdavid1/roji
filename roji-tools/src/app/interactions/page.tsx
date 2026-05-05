import type { Metadata } from "next";

import { InteractionChecker } from "@/components/InteractionChecker";
import { PageHero, MoreTools, StoreCTA } from "@/components/PageChrome";
import { HeroShopCTA } from "@/components/HeroShopCTA";
import { ToolView } from "@/components/ToolView";

export const metadata: Metadata = {
  title: "Supplement Interaction Checker — free OTC stack analyzer",
  description:
    "Pick your supplements; we'll flag absorption conflicts, redundancies, and synergies. 50+ vitamins, minerals, and botanicals supported.",
};

export default function InteractionsPage() {
  return (
    <>
      <ToolView slug="interactions" />
      <PageHero
        pill="Calculator · Free"
        title="Supplement Interaction Checker"
        lede="Pick everything you're taking. We'll flag what conflicts, what's synergistic, and what's redundant."
      />
      <HeroShopCTA
        toolSlug="interactions"
        label="Looking for ≥99% verified inputs to your stack? See research-grade compounds."
      />
      <InteractionChecker />
      <p className="mx-auto max-w-3xl px-6 pb-10 text-center text-xs text-roji-dim">
        OTC supplements only. We don't analyze prescription drugs. For medication interactions, talk to your pharmacist.
      </p>
      <StoreCTA
        source="interactions"
        title="Need cleaner inputs to your stack?"
        body="The supplement industry runs on hope and good marketing. Roji ships ≥99% Janoshik-verified peptides — for when 'wishful thinking' isn't enough."
      />
      <MoreTools currentSlug="interactions" />
    </>
  );
}
