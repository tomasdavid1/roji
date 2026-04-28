-- Roji Peptides — compliance copy rewrite
-- Date: 2026-04-28
-- Why:  Soften any therapeutic / use-case-implying language on customer-
--       facing product copy. Match the framing peer vendors use:
--       "preclinical research", "no usage instructions or dosing guidelines",
--       no "for tissue work" / "comprehensive GH-axis stack" framing.
--
-- Idempotent: rewrites by post_title so it can be re-run safely.

-- ── Wolverine Stack (one-time + autoship) ────────────────────────────
UPDATE wp_posts
SET post_content = 'A two-compound research stack referenced from peer-reviewed preclinical literature. Includes one vial of BPC-157 (10mg) and one vial of TB-500 (10mg). All compounds are tested at ≥99% purity with a batch-specific Certificate of Analysis. For research and laboratory use only. We do not provide usage instructions, dosing guidelines, or any advice regarding the application of our products. Not intended for human or animal consumption.'
WHERE post_type = 'product'
  AND post_title IN ('Wolverine Stack', 'Wolverine Stack — Autoship');

-- ── Recomp Stack (one-time + autoship) ───────────────────────────────
UPDATE wp_posts
SET post_content = 'A three-compound research stack covering the GH-axis, referenced from preclinical and clinical pharmacokinetic literature. Includes one vial of CJC-1295 with DAC (5mg), one vial of Ipamorelin (5mg), and a 30-day supply of MK-677 oral capsules. ≥99% purity with a batch-specific Certificate of Analysis. For research and laboratory use only. We do not provide usage instructions, dosing guidelines, or any advice regarding the application of our products. Not intended for human or animal consumption.'
WHERE post_type = 'product'
  AND post_title IN ('Recomp Stack', 'Recomp Stack — Autoship');

-- ── Full Protocol (one-time + autoship) ──────────────────────────────
UPDATE wp_posts
SET post_content = 'A 12-week research-grade compound supply, shipping monthly. Combines the Wolverine and Recomp stacks across three monthly deliveries, plus bacteriostatic water and a printed research reference card with reconstitution math drawn from published literature. ≥99% purity with a batch-specific Certificate of Analysis on every vial. Per-month price; total billed in three monthly deliveries. For research and laboratory use only. We do not provide usage instructions, dosing guidelines, or any advice regarding the application of our products. Not intended for human or animal consumption.',
    post_excerpt = 'Wolverine + Recomp stacks × 3 months. Includes a printed research reference card.'
WHERE post_type = 'product'
  AND post_title IN ('Full Protocol', 'Full Protocol — Autoship');

-- ── Rename product categories away from outcome-framing ─────────────
-- Match on either literal '&' or html-encoded '&amp;' since some
-- WordPress installs store the encoded form.
-- "Healing & Recovery" → "Tissue-Research Compounds"
UPDATE wp_terms
SET name = 'Tissue-Research Compounds', slug = 'tissue-research-compounds'
WHERE name IN ('Healing & Recovery', 'Healing &amp; Recovery');

-- "Body Recomposition" → "GH-Axis Compounds"
UPDATE wp_terms
SET name = 'GH-Axis Compounds', slug = 'gh-axis-compounds'
WHERE name = 'Body Recomposition';

-- "Full Protocols" → "Multi-Compound Bundles"
UPDATE wp_terms
SET name = 'Multi-Compound Bundles', slug = 'multi-compound-bundles'
WHERE name = 'Full Protocols';

-- ── Drop the "healing" / "recovery" / "recomp" tags off products ────
-- Product tags can carry the same outcome framing as category names.
-- We delete tag-product associations where the tag implies an outcome.
DELETE tr FROM wp_term_relationships tr
INNER JOIN wp_term_taxonomy tt ON tt.term_taxonomy_id = tr.term_taxonomy_id
INNER JOIN wp_terms t ON t.term_id = tt.term_id
WHERE tt.taxonomy = 'product_tag'
  AND t.slug IN ('healing', 'recovery', 'recomp');

-- ── Updated disclaimer post_meta on every research stack ────────────
-- Apply to both one-time and autoship variants
UPDATE wp_postmeta pm
INNER JOIN wp_posts p ON p.ID = pm.post_id
SET pm.meta_value = 'For research and laboratory use only. We do not provide usage instructions, dosing guidelines, or any advice regarding the application of our products. Not intended for human or animal consumption.'
WHERE pm.meta_key = '_disclaimer'
  AND p.post_type = 'product'
  AND p.post_title IN (
    'Wolverine Stack', 'Wolverine Stack — Autoship',
    'Recomp Stack',    'Recomp Stack — Autoship',
    'Full Protocol',   'Full Protocol — Autoship'
  );
