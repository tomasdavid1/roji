-- Roji Peptides — rename research stacks to lead with compound names
-- Date: 2026-05-06
-- Why:  "Wolverine Stack" and "Recomp Stack" alone are ambiguous to
--       paid-search visitors arriving from compound-name keywords
--       (`bpc 157`, `tb 500`, `cjc 1295 ipamorelin`). Renaming the
--       products to lead with the compounds makes the value prop
--       legible the moment they hit the shop archive.
--
--       Slugs (`wolverine-stack`, `recomp-stack`) are intentionally
--       NOT changed — existing inbound links + the tracking URLs
--       (`?protocol_stack=wolverine`) keep working. The rename is
--       display-only.
--
-- Idempotent: matches by old post_title so re-running is a no-op
-- once the rename has applied. Safe to run multiple times.

-- ── BPC-157 + TB-500 Stack (was "Wolverine Stack") ───────────────────
UPDATE wp_posts
SET post_title = 'BPC-157 + TB-500 Stack',
    post_excerpt = 'BPC-157 10mg + TB-500 10mg. The two-compound tissue-research stack. 4-week supply.'
WHERE post_type = 'product'
  AND post_title = 'Wolverine Stack';

UPDATE wp_posts
SET post_title = 'BPC-157 + TB-500 Stack — Autoship',
    post_excerpt = 'BPC-157 10mg + TB-500 10mg. The two-compound tissue-research stack. 4-week supply, autoship.'
WHERE post_type = 'product'
  AND post_title = 'Wolverine Stack — Autoship';

-- ── CJC-1295 + Ipamorelin + MK-677 Stack (was "Recomp Stack") ────────
UPDATE wp_posts
SET post_title = 'CJC-1295 + Ipamorelin + MK-677 Stack',
    post_excerpt = 'CJC-1295 (DAC) 5mg + Ipamorelin 5mg + MK-677 30-day oral. The three-compound GH-axis stack. 4-week supply.'
WHERE post_type = 'product'
  AND post_title = 'Recomp Stack';

UPDATE wp_posts
SET post_title = 'CJC-1295 + Ipamorelin + MK-677 Stack — Autoship',
    post_excerpt = 'CJC-1295 (DAC) 5mg + Ipamorelin 5mg + MK-677 30-day oral. The three-compound GH-axis stack. 4-week supply, autoship.'
WHERE post_type = 'product'
  AND post_title = 'Recomp Stack — Autoship';

-- ── Full Protocol — update copy referencing the old stack names ──────
UPDATE wp_posts
SET post_excerpt = 'BPC-157 + TB-500 + CJC-1295 + Ipamorelin + MK-677 across 12 weeks. Ships monthly. Includes a printed research reference card.',
    post_content = 'A 12-week research-grade compound supply, shipping monthly. Combines the BPC-157 + TB-500 stack and the CJC-1295 + Ipamorelin + MK-677 stack across three monthly deliveries, plus bacteriostatic water and a printed research reference card with reconstitution math drawn from published literature. ≥99% purity with a batch-specific Certificate of Analysis on every vial. Per-month price; total billed in three monthly deliveries. For research and laboratory use only. We do not provide usage instructions, dosing guidelines, or any advice regarding the application of our products. Not intended for human or animal consumption.'
WHERE post_type = 'product'
  AND post_title IN ('Full Protocol', 'Full Protocol — Autoship');
