import type { Metadata } from "next";

import { AiAssistant } from "@/components/AiAssistant";
import { PageHero, MoreTools, StoreCTA } from "@/components/PageChrome";

export const metadata: Metadata = {
  title: "AI Research Assistant — cited answers from peptide literature",
  description:
    "Ask about peptide research and get answers grounded in real PubMed studies, with citations. Strictly research education — never dosing or medical advice.",
};

export default function AiPage() {
  return (
    <>
      <PageHero
        pill="AI · Beta · Free"
        title="AI Research Assistant"
        lede="Ask about peptide research. We pull recent PubMed studies and answer with citations. Never dosing advice. Never medical advice."
      />
      <AiAssistant />
      <p className="mx-auto max-w-3xl px-6 pb-10 text-center text-xs text-roji-dim">
        Tightly-scoped research assistant. We refuse dosing questions, off-topic queries, and anything that smells like medical advice. Always consult a healthcare provider for medical decisions.
      </p>
      <StoreCTA
        source="ai"
        title="Got a research compound in mind?"
        body="Once you've narrowed in on a compound, Roji ships ≥99% Janoshik-verified vials with the COA on file. Same trust we apply to citations, applied to physical product."
      />
      <MoreTools currentSlug="ai" />
    </>
  );
}
