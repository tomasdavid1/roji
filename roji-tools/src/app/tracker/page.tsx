import type { Metadata } from "next";

import { StackTracker } from "@/components/StackTracker";
import { PageHero, MoreTools } from "@/components/PageChrome";
import { ToolView } from "@/components/ToolView";

export const metadata: Metadata = {
  title: "Stack Tracker — private journal for compounds and metrics",
  description:
    "Free local-first journal. Log your stack, daily subjective metrics, and visualize trends. Everything stored locally in your browser.",
};

export default function TrackerPage() {
  return (
    <>
      <ToolView slug="tracker" />
      <PageHero
        pill="Tracker · Beta · Free"
        title="Stack Tracker"
        lede="A private journal for your stack and how you're feeling. Log daily, see your trends. Everything stored locally — no accounts, no upload."
      />
      <StackTracker />
      <p className="mx-auto max-w-3xl px-6 pb-10 text-center text-xs text-roji-dim">
        For research and personal-tracking purposes only. Not medical advice and
        not a substitute for clinical monitoring.
      </p>
      <MoreTools currentSlug="tracker" />
    </>
  );
}
