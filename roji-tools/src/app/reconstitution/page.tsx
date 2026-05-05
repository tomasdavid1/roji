import type { Metadata } from "next";

import { ReconCalculator } from "@/components/ReconCalculator";
import { PageHero, MoreTools, StoreCTA } from "@/components/PageChrome";
import { HeroShopCTA } from "@/components/HeroShopCTA";
import { StickyStoreBanner } from "@/components/StickyStoreBanner";
import { ToolView } from "@/components/ToolView";
import { ToolJsonLd } from "@/components/ToolJsonLd";

export const metadata: Metadata = {
  title: "Peptide Reconstitution Calculator — mg / mL → mcg per syringe unit",
  description:
    "Free reconstitution calculator. Input vial size and BAC water volume, get exact mcg per insulin-syringe tick mark and units per target dose. No ads, no signup.",
};

export default function ReconstitutionPage() {
  return (
    <>
      <ToolJsonLd
        slug="reconstitution"
        name="Peptide Reconstitution Calculator"
        description="Calculate research peptide concentration from vial size in mg and bacteriostatic water volume in mL. Returns concentration in mcg/mL, units per measurement, mL per measurement, and total preparations from the vial. For research and laboratory use only."
        featureList={[
          "mg vial + mL water → concentration math",
          "Multiple insulin syringe types (u100, u50, u40)",
          "Total preparation count per vial",
          "Suggested measurement alternatives",
        ]}
      />
      <ToolView slug="reconstitution" />
      <PageHero
        pill="Calculator · Free"
        title="Reconstitution Calculator"
        lede="Vial size + BAC water volume → exact mcg per insulin-syringe tick. The math you need before you ever touch a vial."
      />
      <HeroShopCTA
        toolSlug="reconstitution"
        label="Need vials + BAC water + syringes for your research? We ship the whole kit."
      />
      <ReconCalculator />
      <section className="mx-auto max-w-3xl px-6 pb-10">
        <details className="rounded-roji border border-roji-border bg-roji-card p-5 text-sm">
          <summary className="cursor-pointer text-roji-text font-medium">
            How the math works
          </summary>
          <div className="mt-3 space-y-3 text-roji-muted leading-relaxed">
            <p>
              A vial labelled <strong>5 mg</strong> contains 5,000 mcg of dry
              peptide. When you add bacteriostatic water, the powder dissolves
              and the total volume of liquid becomes the volume of water you
              added.
            </p>
            <p>
              The concentration is{" "}
              <code className="text-roji-text">total_mcg ÷ water_mL</code>. A
              standard U-100 insulin syringe is graduated such that one tick
              ("unit") = 0.01 mL. So the mcg delivered per unit is{" "}
              <code className="text-roji-text">concentration × 0.01</code>.
            </p>
            <p>
              To get any target dose:{" "}
              <code className="text-roji-text">
                units = dose_mcg ÷ mcg_per_unit
              </code>
              . That's it — the rest is rounding for what you can actually
              measure on a syringe.
            </p>
            <p className="text-xs text-roji-dim">
              This calculator does not constitute medical or dosing advice.
              It performs a unit conversion. The user decides what
              concentration to prepare and what dose, if any, to extract.
            </p>
          </div>
        </details>
      </section>
      <StoreCTA
        source="reconstitution"
        title="Need BAC water and clean vials?"
        body="Roji Peptides ships research-grade peptide vials (≥99% Janoshik-verified purity) along with bacteriostatic water and insulin syringes — everything you'd otherwise have to source from three different vendors."
      />
      <MoreTools currentSlug="reconstitution" />
      <StickyStoreBanner source="reconstitution" label="Need BAC water and research compounds? → Browse Roji stacks" />
    </>
  );
}
