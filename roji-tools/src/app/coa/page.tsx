import type { Metadata } from "next";

import { CoaUploader } from "@/components/CoaUploader";
import { PageHero, MoreTools, StoreCTA } from "@/components/PageChrome";
import { StickyStoreBanner } from "@/components/StickyStoreBanner";
import { ToolView } from "@/components/ToolView";

export const metadata: Metadata = {
  title: "COA Verifier — Is your peptide vendor's Certificate of Analysis legit?",
  description:
    "Drop in any vendor's Certificate of Analysis PDF. We translate every line into plain English and flag red flags. Files never leave your device.",
};

export default function CoaPage() {
  return (
    <>
      <ToolView slug="coa" />
      <PageHero
        pill="Verifier · Free"
        title="COA Verifier"
        lede="Drop a Certificate of Analysis PDF here. We'll translate every line into plain English and flag what's missing. Your file never leaves your device."
      />
      <CoaUploader />
      <section className="mx-auto max-w-3xl px-6 pb-10">
        <details className="rounded-roji border border-roji-border bg-roji-card p-5 text-sm">
          <summary className="cursor-pointer text-roji-text font-medium">
            What's a COA actually supposed to show?
          </summary>
          <div className="mt-3 space-y-3 text-roji-muted leading-relaxed">
            <p>
              A real Certificate of Analysis from a third-party lab should
              include, at minimum:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>HPLC purity</strong> — typically ≥98% for research-grade.
              </li>
              <li>
                <strong>Mass spectrometry confirmation</strong> — proves the
                molecular weight matches the expected sequence.
              </li>
              <li>
                <strong>Water content (Karl Fischer)</strong> — should be
                ≤10%.
              </li>
              <li>
                <strong>Peptide content</strong> — true peptide mass after
                subtracting water and counter-ions.
              </li>
              <li>
                <strong>Amino acid sequence</strong> printed on the report.
              </li>
              <li>
                <strong>Named third-party lab</strong> with accreditation.
              </li>
              <li>
                <strong>Batch / lot number</strong> tying the COA to a
                specific production run.
              </li>
              <li>
                <strong>Date</strong> within the last 18 months.
              </li>
            </ul>
            <p className="text-xs text-roji-dim">
              We're heuristic — every flag we surface is just a signal, not
              a verdict. If a result is missing, ask the vendor directly.
            </p>
          </div>
        </details>
      </section>
      <StoreCTA
        source="coa"
        title="Roji COAs pass every check on this page."
        body="Every Roji batch ships with a Janoshik third-party COA: HPLC purity ≥99%, MS confirmation, water and peptide content, sequence printed, dated within 30 days of shipping."
        buttonLabel="See our COA library →"
        href={(process.env.NEXT_PUBLIC_STORE_URL ?? "https://rojipeptides.com") + "/coa/"}
      />
      <MoreTools currentSlug="coa" />
      <StickyStoreBanner source="coa" label="Roji COAs pass every check on this page → See our COA library" />
    </>
  );
}
