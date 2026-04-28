import type { Metadata } from "next";

import { StackTracker } from "@/components/StackTracker";
import { PageHero, MoreTools, StoreCTA } from "@/components/PageChrome";

export const metadata: Metadata = {
  title: "Stack Tracker — private journal for your peptide / supplement protocol",
  description:
    "Free local-first journal. Log your stack, daily subjective metrics, and visualize trends over time. Stored only in your browser.",
};

export default function TrackerPage() {
  return (
    <>
      <PageHero
        pill="Tracker · Beta · Free"
        title="Stack Tracker"
        lede="A private journal for your stack and how you're feeling. Log daily, see your trends. Everything stored locally — no accounts, no upload."
      />
      <StackTracker />
      <StoreCTA
        source="tracker"
        title="Cleaner inputs = clearer signals."
        body="The data only matters if your inputs are pure. Roji ships ≥99% Janoshik-verified vials with the COA on file — so what you log is actually what you took."
      />
      <MoreTools currentSlug="tracker" />
    </>
  );
}
