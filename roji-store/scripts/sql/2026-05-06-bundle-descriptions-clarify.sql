-- Roji Peptides — clarify the three bundle short descriptions
-- Date: 2026-05-06 (PM follow-up to the stack rename earlier today)
-- Why:  The compound-led names alone are not enough. Visitors landing
--       on the PDP or seeing the card in the archive need a single
--       plain-English line that explains *what's in the box* and what
--       the published research focuses on — without crossing into
--       therapeutic-claim territory.
--
--       Paired change: the inline "save by bundling" tip above the
--       Individuals archive was retired (the per-card green chip
--       already implies the savings), and a contextual bundle pitch
--       was added to each individual PDP buy box. Together those
--       moves shift bundle promotion from interruptive (above the
--       grid, before intent) to contextual (after a click into a
--       specific compound, when intent is high).
--
-- Idempotent: matches by post_title (already renamed in the AM
-- migration), so re-running is a no-op once the new excerpt is set.

-- ── BPC-157 + TB-500 Stack ───────────────────────────────────────────
UPDATE wp_posts
SET post_excerpt = 'One vial each of BPC-157 (10mg) and TB-500 (10mg) — the two compounds whose preclinical literature most often appears together in tissue-repair and angiogenesis research. 4-week research supply.'
WHERE post_type = 'product'
  AND post_title = 'BPC-157 + TB-500 Stack';

UPDATE wp_posts
SET post_excerpt = 'One vial each of BPC-157 (10mg) and TB-500 (10mg) — the two compounds whose preclinical literature most often appears together in tissue-repair and angiogenesis research. 4-week research supply, autoship.'
WHERE post_type = 'product'
  AND post_title = 'BPC-157 + TB-500 Stack — Autoship';

-- ── CJC-1295 + Ipamorelin + MK-677 Stack ─────────────────────────────
UPDATE wp_posts
SET post_excerpt = 'CJC-1295 (DAC) 5mg + Ipamorelin 5mg + a 30-day MK-677 oral supply — the three GH-axis compounds with the most extensive published pharmacokinetic research, all in one stack. 4-week research supply.'
WHERE post_type = 'product'
  AND post_title = 'CJC-1295 + Ipamorelin + MK-677 Stack';

UPDATE wp_posts
SET post_excerpt = 'CJC-1295 (DAC) 5mg + Ipamorelin 5mg + a 30-day MK-677 oral supply — the three GH-axis compounds with the most extensive published pharmacokinetic research, all in one stack. 4-week research supply, autoship.'
WHERE post_type = 'product'
  AND post_title = 'CJC-1295 + Ipamorelin + MK-677 Stack — Autoship';

-- ── Full Protocol ────────────────────────────────────────────────────
UPDATE wp_posts
SET post_excerpt = 'All five compounds — BPC-157, TB-500, CJC-1295 (DAC), Ipamorelin, MK-677 — across 12 weeks of research supply, ships monthly. Both stacks combined, plus bacteriostatic water and a printed research reference card.'
WHERE post_type = 'product'
  AND post_title IN ('Full Protocol', 'Full Protocol — Autoship');
