<?php
/**
 * Roji Child — research-compound database powering /research/* pages.
 *
 * Hand-curated, version-controlled, plain-facts ONLY. Every entry is
 * compliance-reviewed:
 *   - NO human dosing recommendations.
 *   - NO clinical advice.
 *   - NO efficacy claims.
 *   - Mechanism + chemistry + reference literature only.
 *
 * Each compound describes WHAT the molecule is and WHAT has been
 * studied in preclinical/clinical literature — never what someone
 * "should" do with it. Every page also carries the standard
 * research-use-only disclaimer.
 *
 * Data sources for chemistry: PubChem (CID), DrugBank (DB ID where
 * applicable). All citations link to PubMed.
 *
 * Each combination references existing compound slugs and adds the
 * "co-studied" rationale + the carried stack (if any) it maps to.
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Master compound dataset.
 *
 * Schema per entry:
 *   slug          string  /research/<slug>/ URL segment
 *   name          string  display name ("BPC-157")
 *   aliases       array   alternative names ("Body Protection Compound", etc)
 *   category      string  display tag (Healing | GH-Axis | GLP-1 | Cosmetic | Cognitive | Sleep)
 *   carried       bool    do we sell this on rojipeptides.com?
 *   product_slug  string  WC product slug if carried, else best-related slug
 *   chemistry     array   { sequence, mw, formula, pubchem_cid, drugbank_id }
 *   pharmacology  array   { half_life, route_studied, mechanism, storage }
 *   research_focus array  bullet list of areas studied (NOT outcomes)
 *   citations     array   [{ title, url (PubMed), year }]
 *   meta_desc     string  ≤155 chars for <meta description>
 *
 * @return array<string, array<string,mixed>>
 */
function roji_research_compounds() {
	static $cache = null;
	if ( $cache !== null ) {
		return $cache;
	}

	$cache = array(
		// =====================================================
		// Healing / Tissue-repair peptides
		// =====================================================
		'bpc-157' => array(
			'slug'         => 'bpc-157',
			'name'         => 'BPC-157',
			'aliases'      => array( 'Body Protection Compound 157', 'Pentadecapeptide BPC 157' ),
			'category'     => 'Tissue Repair',
			'carried'      => true,
			'product_slug' => 'bpc-157-10mg',
			'chemistry'    => array(
				'sequence'     => 'GEPPPGKPADDAGLV',
				'mw'           => '1419.55 g/mol',
				'formula'      => 'C62H98N16O22',
				'pubchem_cid'  => '108101',
				'drugbank_id'  => '',
			),
			'pharmacology' => array(
				'half_life'      => '~30 min (parenteral, preclinical rodent models)',
				'route_studied'  => 'Intraperitoneal, oral, intragastric (rodent models)',
				'mechanism'      => 'Modulation of nitric-oxide system; angiogenesis via VEGFR2 upregulation; growth-hormone receptor expression in tendon fibroblasts.',
				'storage'        => 'Lyophilized: stable at room temperature short-term; refrigerate (2–8°C) for long-term storage. Reconstituted: refrigerate, use within 30 days.',
			),
			'research_focus' => array(
				'Gastrointestinal mucosal integrity (rodent ulcer models)',
				'Tendon-to-bone healing (rat Achilles transection models)',
				'Vascular wound healing and angiogenesis',
				'Inflammatory bowel disease preclinical research',
			),
			'citations' => array(
				array( 'title' => 'Stable gastric pentadecapeptide BPC 157 in clinical trials as a therapy for inflammatory bowel disease', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/22950504/', 'year' => 2012 ),
				array( 'title' => 'BPC 157 and Standard Angiogenic Growth Factors. Gastrointestinal Tract Healing, Lessons from Tendon, Ligament, Muscle and Bone Healing', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/29886824/', 'year' => 2018 ),
				array( 'title' => 'Pentadecapeptide BPC 157 enhances the growth hormone receptor expression in tendon fibroblasts', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/24531255/', 'year' => 2014 ),
			),
			'meta_desc' => 'BPC-157 research profile: pentadecapeptide chemistry, half-life, mechanism (NO/VEGFR2/GH-receptor), storage, and PubMed-cited tissue-repair literature.',
		),

		'tb-500' => array(
			'slug'         => 'tb-500',
			'name'         => 'TB-500',
			'aliases'      => array( 'Thymosin Beta-4 fragment', 'TB4-Frag', 'AcSDKP-derived' ),
			'category'     => 'Tissue Repair',
			'carried'      => true,
			'product_slug' => 'tb-500-10mg',
			'chemistry'    => array(
				'sequence'     => 'LKKTETQ (active fragment of full Thymosin β-4, 43-aa parent)',
				'mw'           => '~889 g/mol (synthetic LKKTETQ); ~4963 g/mol (full Tβ4)',
				'formula'      => 'C37H67N9O11 (LKKTETQ fragment)',
				'pubchem_cid'  => '16132341',
				'drugbank_id'  => '',
			),
			'pharmacology' => array(
				'half_life'      => '~2 h (synthetic fragment, preclinical models)',
				'route_studied'  => 'Subcutaneous, intramuscular (rodent and equine models)',
				'mechanism'      => 'Actin-sequestering peptide; promotes endothelial cell migration and angiogenesis; upregulates laminin-5 and integrin-linked kinase.',
				'storage'        => 'Lyophilized: stable at room temperature short-term; refrigerate (2–8°C) for long-term storage. Reconstituted: refrigerate, use within 30 days.',
			),
			'research_focus' => array(
				'Cardiac tissue regeneration (preclinical mouse infarct models)',
				'Corneal wound healing',
				'Equine soft-tissue injury research',
				'Hair-follicle stem-cell research',
			),
			'citations' => array(
				array( 'title' => 'Thymosin beta-4: a multi-functional regenerative peptide. Basic properties and clinical applications', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/22394215/', 'year' => 2012 ),
				array( 'title' => 'Thymosin beta4 induces adult epicardial progenitor mobilization and neovascularization', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/17554338/', 'year' => 2007 ),
			),
			'meta_desc' => 'TB-500 (Thymosin β-4 fragment) research profile: chemistry, ~2h half-life, actin-sequestering mechanism, storage, and PubMed citations.',
		),

		'ghk-cu' => array(
			'slug'         => 'ghk-cu',
			'name'         => 'GHK-Cu',
			'aliases'      => array( 'Copper Tripeptide-1', 'Glycyl-L-Histidyl-L-Lysine Copper' ),
			'category'     => 'Cosmetic / Tissue Repair',
			'carried'      => false,
			'product_slug' => 'wolverine-stack',
			'chemistry'    => array(
				'sequence'     => 'GHK + Cu²⁺',
				'mw'           => '340.79 g/mol (GHK-Cu complex)',
				'formula'      => 'C14H22CuN6O4',
				'pubchem_cid'  => '53477736',
				'drugbank_id'  => '',
			),
			'pharmacology' => array(
				'half_life'      => 'Plasma GHK ~30 min; tissue retention longer when complexed to Cu²⁺.',
				'route_studied'  => 'Topical, subcutaneous (rodent and human cosmetic studies)',
				'mechanism'      => 'Copper-delivery tripeptide; modulates fibroblast collagen/elastin synthesis; upregulates antioxidant SOD2.',
				'storage'        => 'Lyophilized: refrigerate (2–8°C). Solution: protect from light; refrigerate.',
			),
			'research_focus' => array(
				'Dermal collagen and elastin remodeling',
				'Skin barrier and wound-healing models',
				'Antioxidant response upregulation',
			),
			'citations' => array(
				array( 'title' => 'GHK Peptide as a Natural Modulator of Multiple Cellular Pathways in Skin Regeneration', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/26236730/', 'year' => 2015 ),
				array( 'title' => 'Tissue protective and regenerative properties of GHK', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/22134346/', 'year' => 2012 ),
			),
			'meta_desc' => 'GHK-Cu (copper tripeptide) research profile: 340.79 g/mol chemistry, mechanism (collagen/SOD2), and PubMed citations from dermal regeneration literature.',
		),

		// =====================================================
		// GH-axis / Growth-hormone secretagogues
		// =====================================================
		'cjc-1295' => array(
			'slug'         => 'cjc-1295',
			'name'         => 'CJC-1295 with DAC',
			'aliases'      => array( 'CJC-1295 DAC', 'Drug Affinity Complex GHRH', 'Tetrasubstituted GHRH analog' ),
			'category'     => 'GH-Axis',
			'carried'      => true,
			'product_slug' => 'cjc-1295-dac-5mg',
			'chemistry'    => array(
				'sequence'     => 'Tyr-D-Ala-Asp-Ala-Ile-Phe-Thr-Gln-Ser-Tyr-Arg-Lys-Val-Leu-Ala-Gln-Leu-Ser-Ala-Arg-Lys-Leu-Leu-Gln-Asp-Ile-Leu-Ser-Arg-Gln + DAC',
				'mw'           => '~3367 g/mol (with DAC)',
				'formula'      => 'C152H252N44O42 (peptide portion)',
				'pubchem_cid'  => '16129662',
				'drugbank_id'  => '',
			),
			'pharmacology' => array(
				'half_life'      => '~6–8 days (DAC-conjugated; binds plasma albumin)',
				'route_studied'  => 'Subcutaneous (Phase I human clinical trial)',
				'mechanism'      => 'Long-acting GHRH analog; stimulates pituitary somatotrophs to release endogenous GH; DAC moiety extends plasma half-life via covalent albumin binding.',
				'storage'        => 'Lyophilized: refrigerate (2–8°C). Reconstituted: refrigerate, use within 30 days.',
			),
			'research_focus' => array(
				'Pulsatile GH release pharmacokinetics',
				'IGF-1 elevation studies in adult subjects',
				'Comparison with native GHRH(1-29)',
			),
			'citations' => array(
				array( 'title' => 'A phase I, open-label, ascending-dose study of CJC-1295, a long-acting GHRH analog, in healthy adults', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/16352683/', 'year' => 2006 ),
				array( 'title' => 'Sustained, sevenfold increase in mean GH levels in adult men following a single injection of CJC-1295', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/16352682/', 'year' => 2006 ),
			),
			'meta_desc' => 'CJC-1295 with DAC research profile: GHRH analog chemistry, 6–8 day half-life, albumin-binding mechanism, and Phase I PubMed citations.',
		),

		'ipamorelin' => array(
			'slug'         => 'ipamorelin',
			'name'         => 'Ipamorelin',
			'aliases'      => array( 'NNC 26-0161', 'Selective GH secretagogue' ),
			'category'     => 'GH-Axis',
			'carried'      => true,
			'product_slug' => 'ipamorelin-5mg',
			'chemistry'    => array(
				'sequence'     => 'Aib-His-D-2-Nal-D-Phe-Lys-NH2',
				'mw'           => '711.86 g/mol',
				'formula'      => 'C38H49N9O5',
				'pubchem_cid'  => '9831659',
				'drugbank_id'  => '',
			),
			'pharmacology' => array(
				'half_life'      => '~2 h (preclinical models)',
				'route_studied'  => 'Subcutaneous, intravenous (rodent and Phase I human)',
				'mechanism'      => 'Selective ghrelin receptor (GHS-R1a) agonist; releases endogenous GH without significant ACTH, cortisol, prolactin, or aldosterone elevation.',
				'storage'        => 'Lyophilized: refrigerate (2–8°C). Reconstituted: refrigerate, use within 30 days.',
			),
			'research_focus' => array(
				'GH-release selectivity vs. other secretagogues',
				'Postoperative ileus research (Phase II)',
				'Bone-formation marker studies in juvenile rodents',
			),
			'citations' => array(
				array( 'title' => 'Ipamorelin, the first selective growth hormone secretagogue', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/9849822/', 'year' => 1998 ),
				array( 'title' => 'The effects of selective growth hormone secretagogue MK-677 on the ileus model', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/15140895/', 'year' => 2004 ),
			),
			'meta_desc' => 'Ipamorelin research profile: 711 g/mol chemistry, ~2h half-life, selective GHS-R1a mechanism, and PubMed citations.',
		),

		'mk-677' => array(
			'slug'         => 'mk-677',
			'name'         => 'MK-677',
			'aliases'      => array( 'Ibutamoren', 'Ibutamoren mesylate', 'L-163,191' ),
			'category'     => 'GH-Axis',
			'carried'      => true,
			'product_slug' => 'mk-677-30caps',
			'chemistry'    => array(
				'sequence'     => 'Non-peptide spiropiperidine',
				'mw'           => '528.66 g/mol (free base)',
				'formula'      => 'C27H36N4O5S',
				'pubchem_cid'  => '5024',
				'drugbank_id'  => 'DB12130',
			),
			'pharmacology' => array(
				'half_life'      => '~4–6 h (oral)',
				'route_studied'  => 'Oral (multi-year clinical trials in older adults)',
				'mechanism'      => 'Orally bioavailable ghrelin-receptor agonist; mimics endogenous ghrelin signaling at GHS-R1a in the pituitary.',
				'storage'        => 'Capsules: cool, dry, away from direct light. Refrigeration not required.',
			),
			'research_focus' => array(
				'Long-term GH/IGF-1 axis modulation',
				'Body composition in older adults (24-month trial)',
				'Hip-fracture recovery research',
				'Sleep architecture studies',
			),
			'citations' => array(
				array( 'title' => 'Two-year treatment with the oral growth hormone secretagogue MK-677 in older adults', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/19075081/', 'year' => 2008 ),
				array( 'title' => 'Effects of MK-677, a non-peptide growth hormone secretagogue, on hip fracture recovery in older adults', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/19696399/', 'year' => 2009 ),
			),
			'meta_desc' => 'MK-677 (Ibutamoren) research profile: oral non-peptide ghrelin agonist, chemistry, 4–6h half-life, mechanism, and 2-year clinical PubMed citations.',
		),

		'tesamorelin' => array(
			'slug'         => 'tesamorelin',
			'name'         => 'Tesamorelin',
			'aliases'      => array( 'TH9507', 'Egrifta', 'Stabilized GHRH(1-44)' ),
			'category'     => 'GH-Axis',
			'carried'      => false,
			'product_slug' => 'recomp-stack',
			'chemistry'    => array(
				'sequence'     => 'trans-3-hexenoyl-Tyr-Ala-Asp-Ala-Ile-Phe-Thr-... (44-aa stabilized GHRH analog)',
				'mw'           => '5135.85 g/mol',
				'formula'      => 'C221H366N72O67S',
				'pubchem_cid'  => '16129575',
				'drugbank_id'  => 'DB08886',
			),
			'pharmacology' => array(
				'half_life'      => '~26 min (subcutaneous, human)',
				'route_studied'  => 'Subcutaneous (FDA-approved for HIV-associated lipodystrophy)',
				'mechanism'      => 'GHRH(1-44) analog stabilized against DPP-IV cleavage; pulsatile pituitary GH release.',
				'storage'        => 'Lyophilized: refrigerate (2–8°C); 14-day stability after reconstitution at 2–8°C.',
			),
			'research_focus' => array(
				'Visceral adipose tissue reduction in HIV-associated lipodystrophy',
				'Cognitive-function studies in older adults',
				'NAFLD / hepatic-fat research',
			),
			'citations' => array(
				array( 'title' => 'Effects of tesamorelin on visceral fat in HIV-infected patients with abdominal fat accumulation', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/19064767/', 'year' => 2008 ),
				array( 'title' => 'Effects of tesamorelin on liver fat in HIV-infected patients', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/25278613/', 'year' => 2014 ),
			),
			'meta_desc' => 'Tesamorelin research profile: stabilized GHRH(1-44) analog, FDA-approved for HIV lipodystrophy, chemistry, mechanism, and PubMed clinical citations.',
		),

		'sermorelin' => array(
			'slug'         => 'sermorelin',
			'name'         => 'Sermorelin',
			'aliases'      => array( 'GHRH(1-29)', 'Geref', 'GRF 1-29' ),
			'category'     => 'GH-Axis',
			'carried'      => false,
			'product_slug' => 'recomp-stack',
			'chemistry'    => array(
				'sequence'     => 'Tyr-Ala-Asp-Ala-Ile-Phe-Thr-Asn-Ser-Tyr-Arg-Lys-Val-Leu-Gly-Gln-Leu-Ser-Ala-Arg-Lys-Leu-Leu-Gln-Asp-Ile-Met-Ser-Arg-NH2',
				'mw'           => '3357.93 g/mol',
				'formula'      => 'C149H246N44O42S',
				'pubchem_cid'  => '16129620',
				'drugbank_id'  => 'DB00010',
			),
			'pharmacology' => array(
				'half_life'      => '~10–20 min (subcutaneous, human)',
				'route_studied'  => 'Subcutaneous (historic FDA approval as Geref for pediatric GHD diagnostic)',
				'mechanism'      => 'Truncated 1–29 residue GHRH analog; stimulates pituitary GH release via GHRH-R agonism.',
				'storage'        => 'Lyophilized: refrigerate (2–8°C); use solution within 14 days at 2–8°C.',
			),
			'research_focus' => array(
				'Pituitary GH-reserve diagnostic testing',
				'Pediatric growth-failure preclinical research',
				'Comparison with CJC-1295 / Tesamorelin',
			),
			'citations' => array(
				array( 'title' => 'Sermorelin: a better approach to management of adult-onset growth hormone insufficiency?', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/12701816/', 'year' => 2003 ),
			),
			'meta_desc' => 'Sermorelin (GHRH 1-29) research profile: chemistry, 10–20 min half-life, GHRH-R mechanism, and PubMed citations.',
		),

		'hexarelin' => array(
			'slug'         => 'hexarelin',
			'name'         => 'Hexarelin',
			'aliases'      => array( 'Examorelin', 'EP23905' ),
			'category'     => 'GH-Axis',
			'carried'      => false,
			'product_slug' => 'recomp-stack',
			'chemistry'    => array(
				'sequence'     => 'His-D-2-methyl-Trp-Ala-Trp-D-Phe-Lys-NH2',
				'mw'           => '887.05 g/mol',
				'formula'      => 'C47H58N12O6',
				'pubchem_cid'  => '44137676',
				'drugbank_id'  => '',
			),
			'pharmacology' => array(
				'half_life'      => '~55 min (subcutaneous, human)',
				'route_studied'  => 'Subcutaneous, intravenous, intranasal (Phase I/II human)',
				'mechanism'      => 'Synthetic hexapeptide ghrelin-receptor agonist; potent GH release; cardioprotective signaling via CD36.',
				'storage'        => 'Lyophilized: refrigerate (2–8°C). Reconstituted: refrigerate, use within 30 days.',
			),
			'research_focus' => array(
				'Cardioprotection in ischemia/reperfusion models',
				'GH release in dwarfism research',
			),
			'citations' => array(
				array( 'title' => 'Hexarelin: a synthetic hexapeptide with growth hormone-releasing and cardioprotective activities', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/9140428/', 'year' => 1997 ),
			),
			'meta_desc' => 'Hexarelin research profile: hexapeptide ghrelin agonist, 887 g/mol chemistry, ~55 min half-life, cardioprotection PubMed citations.',
		),

		'ghrp-2' => array(
			'slug'         => 'ghrp-2',
			'name'         => 'GHRP-2',
			'aliases'      => array( 'Pralmorelin', 'KP-102' ),
			'category'     => 'GH-Axis',
			'carried'      => false,
			'product_slug' => 'recomp-stack',
			'chemistry'    => array(
				'sequence'     => 'D-Ala-D-2-Nal-Ala-Trp-D-Phe-Lys-NH2',
				'mw'           => '817.97 g/mol',
				'formula'      => 'C45H55N9O6',
				'pubchem_cid'  => '6419757',
				'drugbank_id'  => '',
			),
			'pharmacology' => array(
				'half_life'      => '~15–60 min (route-dependent)',
				'route_studied'  => 'Subcutaneous, intranasal, oral (Japanese diagnostic GH-stimulation use)',
				'mechanism'      => 'Synthetic hexapeptide ghrelin-receptor agonist; mimics native ghrelin GH-release pulse.',
				'storage'        => 'Lyophilized: refrigerate (2–8°C). Reconstituted: refrigerate, use within 30 days.',
			),
			'research_focus' => array(
				'GH-stimulation diagnostic research (approved in Japan as Pralmorelin)',
				'Comparative pharmacokinetics with GHRP-6 / Hexarelin',
			),
			'citations' => array(
				array( 'title' => 'A new orally active growth hormone-releasing peptide: GHRP-2', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/8904598/', 'year' => 1996 ),
			),
			'meta_desc' => 'GHRP-2 (Pralmorelin) research profile: hexapeptide ghrelin agonist chemistry, half-life, GH-stimulation diagnostic citations.',
		),

		'ghrp-6' => array(
			'slug'         => 'ghrp-6',
			'name'         => 'GHRP-6',
			'aliases'      => array( 'Growth Hormone Releasing Peptide-6' ),
			'category'     => 'GH-Axis',
			'carried'      => false,
			'product_slug' => 'recomp-stack',
			'chemistry'    => array(
				'sequence'     => 'His-D-Trp-Ala-Trp-D-Phe-Lys-NH2',
				'mw'           => '872.99 g/mol',
				'formula'      => 'C46H56N12O6',
				'pubchem_cid'  => '6918262',
				'drugbank_id'  => '',
			),
			'pharmacology' => array(
				'half_life'      => '~15–60 min (route-dependent)',
				'route_studied'  => 'Subcutaneous, intravenous (preclinical and Phase I human)',
				'mechanism'      => 'Hexapeptide ghrelin-receptor agonist; stimulates GH release with measurable appetite signaling.',
				'storage'        => 'Lyophilized: refrigerate (2–8°C). Reconstituted: refrigerate, use within 30 days.',
			),
			'research_focus' => array(
				'GH-pulse pharmacokinetics in humans and rodents',
				'Hypothalamic appetite signaling research',
			),
			'citations' => array(
				array( 'title' => 'GHRP-6 increases endogenous growth hormone secretion in normal men', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/3360884/', 'year' => 1988 ),
			),
			'meta_desc' => 'GHRP-6 research profile: classical hexapeptide ghrelin agonist, chemistry, mechanism, and original GH-release PubMed citation.',
		),

		// =====================================================
		// GLP-1 / Incretin agonists
		// =====================================================
		'tirzepatide' => array(
			'slug'         => 'tirzepatide',
			'name'         => 'Tirzepatide',
			'aliases'      => array( 'LY3298176', 'Mounjaro', 'Zepbound', 'GIP/GLP-1 dual agonist' ),
			'category'     => 'GLP-1 / Incretin',
			'carried'      => false,
			'product_slug' => 'recomp-stack',
			'chemistry'    => array(
				'sequence'     => '39-aa synthetic peptide based on GIP backbone with C20 fatty diacid moiety',
				'mw'           => '4813.50 g/mol',
				'formula'      => 'C225H348N48O68',
				'pubchem_cid'  => '156588324',
				'drugbank_id'  => 'DB15171',
			),
			'pharmacology' => array(
				'half_life'      => '~5 days (subcutaneous, human)',
				'route_studied'  => 'Subcutaneous (FDA-approved for T2DM and chronic weight management)',
				'mechanism'      => 'Dual GIP and GLP-1 receptor agonist; albumin-binding fatty-acid extension provides once-weekly PK.',
				'storage'        => 'Refrigerate (2–8°C); protect from light; do not freeze.',
			),
			'research_focus' => array(
				'SURPASS T2DM glycemic-control program',
				'SURMOUNT chronic weight-management trials',
				'Cardiometabolic and hepatic-fat research',
			),
			'citations' => array(
				array( 'title' => 'Tirzepatide once weekly for the treatment of obesity (SURMOUNT-1)', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/35658024/', 'year' => 2022 ),
				array( 'title' => 'Tirzepatide versus semaglutide once weekly in patients with type 2 diabetes (SURPASS-2)', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/34170647/', 'year' => 2021 ),
			),
			'meta_desc' => 'Tirzepatide (Mounjaro/Zepbound) research profile: dual GIP/GLP-1 agonist chemistry, ~5 day half-life, SURPASS/SURMOUNT PubMed citations.',
		),

		'retatrutide' => array(
			'slug'         => 'retatrutide',
			'name'         => 'Retatrutide',
			'aliases'      => array( 'LY3437943', 'GIP/GLP-1/Glucagon triple agonist' ),
			'category'     => 'GLP-1 / Incretin',
			'carried'      => false,
			'product_slug' => 'recomp-stack',
			'chemistry'    => array(
				'sequence'     => '39-aa synthetic peptide; GIP-based backbone with C20 diacid lipidation',
				'mw'           => '~4731 g/mol',
				'formula'      => 'C221H343N51O66 (approximate)',
				'pubchem_cid'  => '163044170',
				'drugbank_id'  => '',
			),
			'pharmacology' => array(
				'half_life'      => '~6 days (subcutaneous, Phase II human)',
				'route_studied'  => 'Subcutaneous (Phase II/III obesity and T2DM trials)',
				'mechanism'      => 'Triple agonist at GIP, GLP-1, and glucagon receptors; glucagon-arm contributes additional energy-expenditure signaling.',
				'storage'        => 'Refrigerate (2–8°C); protect from light; do not freeze.',
			),
			'research_focus' => array(
				'TRIUMPH chronic-weight-management Phase II trial',
				'Hepatic-fat and cardiometabolic research',
				'T2DM glycemic-control studies',
			),
			'citations' => array(
				array( 'title' => 'Triple-Hormone-Receptor Agonist Retatrutide for Obesity — A Phase 2 Trial', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/37366315/', 'year' => 2023 ),
			),
			'meta_desc' => 'Retatrutide (LY3437943) research profile: triple GIP/GLP-1/glucagon agonist, ~6 day half-life, Phase II obesity trial PubMed citation.',
		),

		'semaglutide' => array(
			'slug'         => 'semaglutide',
			'name'         => 'Semaglutide',
			'aliases'      => array( 'Ozempic', 'Wegovy', 'Rybelsus', 'NN9535' ),
			'category'     => 'GLP-1 / Incretin',
			'carried'      => false,
			'product_slug' => 'recomp-stack',
			'chemistry'    => array(
				'sequence'     => '31-aa GLP-1 analog with Aib substitution and C18 fatty-acid linker',
				'mw'           => '4113.58 g/mol',
				'formula'      => 'C187H291N45O59',
				'pubchem_cid'  => '56843331',
				'drugbank_id'  => 'DB13928',
			),
			'pharmacology' => array(
				'half_life'      => '~7 days (subcutaneous; oral formulation has shorter half-life)',
				'route_studied'  => 'Subcutaneous and oral (FDA-approved for T2DM and chronic weight management)',
				'mechanism'      => 'GLP-1 receptor agonist; albumin-binding lipid moiety enables once-weekly subcutaneous PK and DPP-IV resistance.',
				'storage'        => 'Refrigerate (2–8°C); protect from light; do not freeze.',
			),
			'research_focus' => array(
				'SUSTAIN T2DM glycemic-control program',
				'STEP chronic weight-management trials',
				'SELECT cardiovascular-outcomes trial',
			),
			'citations' => array(
				array( 'title' => 'Once-Weekly Semaglutide in Adults with Overweight or Obesity (STEP 1)', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/33567185/', 'year' => 2021 ),
				array( 'title' => 'Semaglutide and Cardiovascular Outcomes in Obesity without Diabetes (SELECT)', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/37952131/', 'year' => 2023 ),
			),
			'meta_desc' => 'Semaglutide (Ozempic/Wegovy) research profile: GLP-1 receptor agonist chemistry, ~7 day half-life, STEP/SELECT PubMed citations.',
		),

		// =====================================================
		// Cosmetic / dermal
		// =====================================================
		'mt-2' => array(
			'slug'         => 'mt-2',
			'name'         => 'Melanotan II',
			'aliases'      => array( 'MT-II', 'MT-2', 'Ac-Nle-cyclo[Asp-His-D-Phe-Arg-Trp-Lys]-NH2' ),
			'category'     => 'Cosmetic',
			'carried'      => false,
			'product_slug' => 'wolverine-stack',
			'chemistry'    => array(
				'sequence'     => 'Ac-Nle-cyclo[Asp-His-D-Phe-Arg-Trp-Lys]-NH2',
				'mw'           => '1024.18 g/mol',
				'formula'      => 'C50H69N15O9',
				'pubchem_cid'  => '92432',
				'drugbank_id'  => '',
			),
			'pharmacology' => array(
				'half_life'      => '~30–60 min (preclinical models)',
				'route_studied'  => 'Subcutaneous (early Phase I/II investigational)',
				'mechanism'      => 'Non-selective melanocortin receptor agonist (MC1R / MC3R / MC4R / MC5R); upregulates melanin biosynthesis via MC1R.',
				'storage'        => 'Lyophilized: refrigerate (2–8°C). Reconstituted: refrigerate, use within 30 days.',
			),
			'research_focus' => array(
				'Skin-pigmentation research',
				'Erectile-physiology research (MC4R signaling)',
				'Appetite-signaling preclinical models',
			),
			'citations' => array(
				array( 'title' => 'A new long-acting melanotropin: discovery, design and pharmacological characterization of MT-II', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/2554180/', 'year' => 1989 ),
			),
			'meta_desc' => 'Melanotan II research profile: cyclic melanocortin agonist, 1024 g/mol chemistry, mechanism (MC1R–MC5R), PubMed citations.',
		),

		'pt-141' => array(
			'slug'         => 'pt-141',
			'name'         => 'PT-141',
			'aliases'      => array( 'Bremelanotide', 'Vyleesi' ),
			'category'     => 'Cosmetic / Cognitive',
			'carried'      => false,
			'product_slug' => 'wolverine-stack',
			'chemistry'    => array(
				'sequence'     => 'Ac-Nle-cyclo[Asp-His-D-Phe-Arg-Trp-Lys]-OH',
				'mw'           => '1025.18 g/mol',
				'formula'      => 'C50H68N14O10',
				'pubchem_cid'  => '9941379',
				'drugbank_id'  => 'DB14906',
			),
			'pharmacology' => array(
				'half_life'      => '~2.7 h (subcutaneous, human)',
				'route_studied'  => 'Subcutaneous (FDA-approved for HSDD as Vyleesi)',
				'mechanism'      => 'Selective MC4R / MC3R melanocortin agonist; CNS-mediated activity rather than peripheral vascular.',
				'storage'        => 'Lyophilized: refrigerate (2–8°C). Reconstituted: refrigerate, use within 30 days.',
			),
			'research_focus' => array(
				'Female hypoactive sexual desire disorder (FDA-approved indication)',
				'Erectile-physiology research',
				'Melanocortin CNS-signaling studies',
			),
			'citations' => array(
				array( 'title' => 'Bremelanotide for the treatment of hypoactive sexual desire disorder', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/31193504/', 'year' => 2019 ),
			),
			'meta_desc' => 'PT-141 (Bremelanotide / Vyleesi) research profile: MC4R agonist chemistry, ~2.7h half-life, HSDD clinical PubMed citation.',
		),

		// =====================================================
		// Cognitive / Neuropeptides
		// =====================================================
		'selank' => array(
			'slug'         => 'selank',
			'name'         => 'Selank',
			'aliases'      => array( 'TP-7', 'Tuftsin analog' ),
			'category'     => 'Cognitive',
			'carried'      => false,
			'product_slug' => 'wolverine-stack',
			'chemistry'    => array(
				'sequence'     => 'Thr-Lys-Pro-Arg-Pro-Gly-Pro',
				'mw'           => '751.88 g/mol',
				'formula'      => 'C33H57N11O9',
				'pubchem_cid'  => '11765873',
				'drugbank_id'  => '',
			),
			'pharmacology' => array(
				'half_life'      => 'Short (minutes); active metabolites studied via intranasal route.',
				'route_studied'  => 'Intranasal (Russian clinical research)',
				'mechanism'      => 'Heptapeptide tuftsin analog; modulates GABAergic and serotonergic systems; influences enkephalin metabolism.',
				'storage'        => 'Lyophilized: refrigerate (2–8°C). Solution: refrigerate, use within 30 days.',
			),
			'research_focus' => array(
				'Anxiolytic-style research (Russian clinical literature)',
				'BDNF expression studies in rodents',
			),
			'citations' => array(
				array( 'title' => 'Effect of Selank on the level of mRNA expression of brain-derived neurotrophic factor and serotonergic system genes in rat brain', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/27447769/', 'year' => 2016 ),
			),
			'meta_desc' => 'Selank research profile: tuftsin analog heptapeptide, chemistry, mechanism (GABA/serotonin), PubMed citations.',
		),

		'semax' => array(
			'slug'         => 'semax',
			'name'         => 'Semax',
			'aliases'      => array( 'ACTH(4-10) analog' ),
			'category'     => 'Cognitive',
			'carried'      => false,
			'product_slug' => 'wolverine-stack',
			'chemistry'    => array(
				'sequence'     => 'Met-Glu-His-Phe-Pro-Gly-Pro',
				'mw'           => '813.94 g/mol',
				'formula'      => 'C37H51N9O10S',
				'pubchem_cid'  => '5462657',
				'drugbank_id'  => '',
			),
			'pharmacology' => array(
				'half_life'      => 'Short (minutes); active metabolites studied via intranasal route.',
				'route_studied'  => 'Intranasal (Russian clinical research; approved in Russia for stroke).',
				'mechanism'      => 'Synthetic heptapeptide analog of ACTH(4-10) without corticotropic activity; modulates BDNF/NGF expression.',
				'storage'        => 'Lyophilized: refrigerate (2–8°C). Solution: refrigerate, use within 30 days.',
			),
			'research_focus' => array(
				'Ischemic-stroke recovery research',
				'Cognitive-function studies in rodents and humans',
				'BDNF/NGF expression in hippocampus',
			),
			'citations' => array(
				array( 'title' => 'Heptapeptide Semax: studies in rats and humans', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/19834611/', 'year' => 2009 ),
			),
			'meta_desc' => 'Semax research profile: ACTH(4-10) analog, 813 g/mol chemistry, intranasal mechanism, BDNF/NGF PubMed citations.',
		),

		'cerebrolysin' => array(
			'slug'         => 'cerebrolysin',
			'name'         => 'Cerebrolysin',
			'aliases'      => array( 'FPF-1070', 'Porcine-brain hydrolysate' ),
			'category'     => 'Cognitive',
			'carried'      => false,
			'product_slug' => 'wolverine-stack',
			'chemistry'    => array(
				'sequence'     => 'Heterogeneous porcine-brain peptide hydrolysate (~25% peptides ≤10 kDa)',
				'mw'           => 'Mixture; peptides up to ~10 kDa',
				'formula'      => 'Heterogeneous mixture',
				'pubchem_cid'  => '',
				'drugbank_id'  => '',
			),
			'pharmacology' => array(
				'half_life'      => 'Heterogeneous; multi-component PK.',
				'route_studied'  => 'Intramuscular, intravenous (European clinical use for stroke and dementia).',
				'mechanism'      => 'Mixture of low-MW neuropeptides and amino acids; neurotrophic-mimetic activity in preclinical models.',
				'storage'        => 'Refrigerate (2–8°C); protect from light.',
			),
			'research_focus' => array(
				'Acute ischemic stroke recovery (CARS, CASTA trials)',
				'Vascular dementia and Alzheimer’s research',
				'Traumatic brain injury rehabilitation research',
			),
			'citations' => array(
				array( 'title' => 'Cerebrolysin in patients with acute ischemic stroke in Asia (CASTA)', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/22156697/', 'year' => 2012 ),
			),
			'meta_desc' => 'Cerebrolysin research profile: porcine-brain peptide hydrolysate, mechanism, stroke/dementia PubMed citations.',
		),

		// =====================================================
		// Sleep / Recovery
		// =====================================================
		'dsip' => array(
			'slug'         => 'dsip',
			'name'         => 'DSIP',
			'aliases'      => array( 'Delta Sleep-Inducing Peptide' ),
			'category'     => 'Sleep',
			'carried'      => false,
			'product_slug' => 'recomp-stack',
			'chemistry'    => array(
				'sequence'     => 'Trp-Ala-Gly-Gly-Asp-Ala-Ser-Gly-Glu',
				'mw'           => '848.81 g/mol',
				'formula'      => 'C35H48N10O15',
				'pubchem_cid'  => '68816',
				'drugbank_id'  => '',
			),
			'pharmacology' => array(
				'half_life'      => '~7 min (intravenous, preclinical)',
				'route_studied'  => 'Intravenous, intracerebroventricular (rabbit, rodent, limited human EEG)',
				'mechanism'      => 'Endogenous nonapeptide isolated from rabbit brain; modulates EEG delta-power and stress-axis activity.',
				'storage'        => 'Lyophilized: refrigerate (2–8°C). Reconstituted: refrigerate, use within 30 days.',
			),
			'research_focus' => array(
				'EEG sleep-architecture research',
				'Stress-axis (HPA) modulation research',
			),
			'citations' => array(
				array( 'title' => 'Delta sleep-inducing peptide (DSIP): a still unresolved puzzle', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/9587088/', 'year' => 1998 ),
			),
			'meta_desc' => 'DSIP (Delta Sleep-Inducing Peptide) research profile: nonapeptide chemistry, ~7 min half-life, EEG sleep PubMed citations.',
		),

		'epitalon' => array(
			'slug'         => 'epitalon',
			'name'         => 'Epitalon',
			'aliases'      => array( 'Epithalon', 'Ala-Glu-Asp-Gly' ),
			'category'     => 'Longevity Research',
			'carried'      => false,
			'product_slug' => 'recomp-stack',
			'chemistry'    => array(
				'sequence'     => 'Ala-Glu-Asp-Gly',
				'mw'           => '390.35 g/mol',
				'formula'      => 'C14H22N4O9',
				'pubchem_cid'  => '5485293',
				'drugbank_id'  => '',
			),
			'pharmacology' => array(
				'half_life'      => 'Short (minutes); preclinical PK characterization limited.',
				'route_studied'  => 'Subcutaneous, intramuscular (Russian preclinical and clinical research).',
				'mechanism'      => 'Synthetic tetrapeptide derived from pineal-gland epithalamin; in-vitro telomerase upregulation and circadian-axis modulation.',
				'storage'        => 'Lyophilized: refrigerate (2–8°C). Solution: refrigerate, use within 30 days.',
			),
			'research_focus' => array(
				'Telomerase activity in human cell lines',
				'Pineal-axis / melatonin research',
				'Murine longevity studies (Russian)',
			),
			'citations' => array(
				array( 'title' => 'Peptide Epitalon activates chromatin at the old age', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/14523876/', 'year' => 2003 ),
			),
			'meta_desc' => 'Epitalon (Ala-Glu-Asp-Gly) research profile: tetrapeptide chemistry, mechanism (telomerase/pineal), PubMed citations.',
		),

		// =====================================================
		// Metabolic / fat-loss research
		// =====================================================
		'aod-9604' => array(
			'slug'         => 'aod-9604',
			'name'         => 'AOD-9604',
			'aliases'      => array( 'hGH(177-191) analog', 'Tyr-hGH(177-191)' ),
			'category'     => 'Metabolic',
			'carried'      => false,
			'product_slug' => 'recomp-stack',
			'chemistry'    => array(
				'sequence'     => 'Tyr-Leu-Arg-Ile-Val-Gln-Cys-Arg-Ser-Val-Glu-Gly-Ser-Cys-Gly-Phe',
				'mw'           => '1815.13 g/mol',
				'formula'      => 'C78H125N23O23S2',
				'pubchem_cid'  => '16133721',
				'drugbank_id'  => '',
			),
			'pharmacology' => array(
				'half_life'      => '~30 min (intravenous, preclinical)',
				'route_studied'  => 'Subcutaneous, oral (Phase II human obesity trials)',
				'mechanism'      => 'C-terminal hGH(177-191) fragment; lipolytic and antilipogenic activity without GH-receptor mediated metabolic effects.',
				'storage'        => 'Lyophilized: refrigerate (2–8°C). Reconstituted: refrigerate, use within 30 days.',
			),
			'research_focus' => array(
				'Adipose-tissue lipolysis research',
				'Phase II obesity trials',
				'Cartilage research (preclinical)',
			),
			'citations' => array(
				array( 'title' => 'AOD9604, a peptide fragment of growth hormone, has potent effects on body fat in obese rats', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/11410549/', 'year' => 2001 ),
			),
			'meta_desc' => 'AOD-9604 research profile: hGH(177-191) lipolytic fragment, chemistry, mechanism, Phase II obesity PubMed citations.',
		),

		'5-amino-1mq' => array(
			'slug'         => '5-amino-1mq',
			'name'         => '5-Amino-1MQ',
			'aliases'      => array( '5-Amino-1-methylquinolinium', 'NNMT inhibitor' ),
			'category'     => 'Metabolic',
			'carried'      => false,
			'product_slug' => 'recomp-stack',
			'chemistry'    => array(
				'sequence'     => 'Small-molecule (not a peptide)',
				'mw'           => '174.22 g/mol',
				'formula'      => 'C10H12N2',
				'pubchem_cid'  => '53366611',
				'drugbank_id'  => '',
			),
			'pharmacology' => array(
				'half_life'      => 'Limited public PK data; preclinical only.',
				'route_studied'  => 'Oral (rodent obesity models)',
				'mechanism'      => 'Selective nicotinamide-N-methyltransferase (NNMT) inhibitor; preclinical adipose-tissue NAD+ modulation.',
				'storage'        => 'Refrigerate (2–8°C); protect from moisture.',
			),
			'research_focus' => array(
				'NNMT inhibition in murine obesity models',
				'Adipose-tissue NAD+ pathway research',
			),
			'citations' => array(
				array( 'title' => 'A small molecule inhibitor of nicotinamide N-methyltransferase for the treatment of metabolic disorders', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/29748555/', 'year' => 2018 ),
			),
			'meta_desc' => '5-Amino-1MQ research profile: NNMT inhibitor small-molecule chemistry, mechanism, preclinical obesity PubMed citation.',
		),

		'mots-c' => array(
			'slug'         => 'mots-c',
			'name'         => 'MOTS-c',
			'aliases'      => array( 'Mitochondrial-derived peptide', 'MOTS-c (16-aa)' ),
			'category'     => 'Metabolic',
			'carried'      => false,
			'product_slug' => 'recomp-stack',
			'chemistry'    => array(
				'sequence'     => 'MRWQEMGYIFYPRKLR',
				'mw'           => '2174.59 g/mol',
				'formula'      => 'C99H148N28O22S2',
				'pubchem_cid'  => '102492568',
				'drugbank_id'  => '',
			),
			'pharmacology' => array(
				'half_life'      => 'Preclinical PK only.',
				'route_studied'  => 'Intraperitoneal (rodent metabolic models).',
				'mechanism'      => '16-aa peptide encoded within mitochondrial 12S rRNA; activates AMPK; modulates insulin sensitivity and glucose homeostasis.',
				'storage'        => 'Lyophilized: refrigerate (2–8°C). Reconstituted: refrigerate, use within 30 days.',
			),
			'research_focus' => array(
				'AMPK activation in skeletal muscle',
				'Insulin-sensitivity and glucose-homeostasis preclinical research',
				'Exercise-mimetic research',
			),
			'citations' => array(
				array( 'title' => 'The mitochondrial-derived peptide MOTS-c promotes metabolic homeostasis and reduces obesity and insulin resistance', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/25738459/', 'year' => 2015 ),
			),
			'meta_desc' => 'MOTS-c research profile: mitochondrial-derived 16-aa peptide, chemistry, AMPK mechanism, PubMed metabolic-research citations.',
		),

		// =====================================================
		// NAD+ pathway
		// =====================================================
		'nad-plus' => array(
			'slug'         => 'nad-plus',
			'name'         => 'NAD+',
			'aliases'      => array( 'Nicotinamide Adenine Dinucleotide', 'β-NAD' ),
			'category'     => 'Metabolic',
			'carried'      => false,
			'product_slug' => 'recomp-stack',
			'chemistry'    => array(
				'sequence'     => 'Nicotinamide–ribose–phosphate–phosphate–ribose–adenine',
				'mw'           => '663.43 g/mol',
				'formula'      => 'C21H27N7O14P2',
				'pubchem_cid'  => '5893',
				'drugbank_id'  => 'DB00787',
			),
			'pharmacology' => array(
				'half_life'      => 'Plasma minutes; intracellular pool half-life longer.',
				'route_studied'  => 'Intravenous, subcutaneous, oral precursors (NMN, NR) in human research.',
				'mechanism'      => 'Universal redox cofactor; substrate for sirtuin deacetylases, PARPs, and CD38; central to mitochondrial OXPHOS.',
				'storage'        => 'Lyophilized: refrigerate (2–8°C); protect from light. Reconstituted: refrigerate, use within 30 days.',
			),
			'research_focus' => array(
				'Sirtuin and aging research',
				'Mitochondrial OXPHOS bioenergetics',
				'Clinical NAD+-precursor trials (NMN, NR)',
			),
			'citations' => array(
				array( 'title' => 'NAD+ Metabolism and Its Roles in Cellular Processes during Ageing', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/33353981/', 'year' => 2020 ),
			),
			'meta_desc' => 'NAD+ research profile: redox-cofactor chemistry, mechanism (sirtuins/PARPs/OXPHOS), aging-research PubMed citations.',
		),

		// =====================================================
		// Misc / specialty
		// =====================================================
		'follistatin-344' => array(
			'slug'         => 'follistatin-344',
			'name'         => 'Follistatin-344',
			'aliases'      => array( 'FST-344', 'Activin-binding protein analog' ),
			'category'     => 'Specialty',
			'carried'      => false,
			'product_slug' => 'recomp-stack',
			'chemistry'    => array(
				'sequence'     => '344-aa human follistatin isoform',
				'mw'           => '~38 kDa',
				'formula'      => 'Heterogeneous (protein)',
				'pubchem_cid'  => '',
				'drugbank_id'  => '',
			),
			'pharmacology' => array(
				'half_life'      => 'Preclinical; protein PK.',
				'route_studied'  => 'Intramuscular (preclinical AAV gene-therapy delivery in primates).',
				'mechanism'      => 'Glycoprotein that binds and neutralizes myostatin and activin A; preclinical hypertrophy in murine and primate skeletal-muscle models.',
				'storage'        => 'Lyophilized: refrigerate (2–8°C); avoid freeze-thaw cycles when reconstituted.',
			),
			'research_focus' => array(
				'Myostatin-blockade muscle-hypertrophy preclinical research',
				'Gene-therapy delivery research',
			),
			'citations' => array(
				array( 'title' => 'Sustained myostatin inhibition with muscle-restricted AAV-mediated follistatin gene therapy', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/19258420/', 'year' => 2009 ),
			),
			'meta_desc' => 'Follistatin-344 research profile: myostatin-binding glycoprotein, chemistry, AAV gene-therapy PubMed citations.',
		),

		'kpv' => array(
			'slug'         => 'kpv',
			'name'         => 'KPV',
			'aliases'      => array( 'α-MSH C-terminal tripeptide', 'Lysine-Proline-Valine' ),
			'category'     => 'Tissue Repair',
			'carried'      => false,
			'product_slug' => 'wolverine-stack',
			'chemistry'    => array(
				'sequence'     => 'Lys-Pro-Val',
				'mw'           => '342.44 g/mol',
				'formula'      => 'C16H30N4O4',
				'pubchem_cid'  => '5497208',
				'drugbank_id'  => '',
			),
			'pharmacology' => array(
				'half_life'      => 'Short (minutes); preclinical.',
				'route_studied'  => 'Oral, topical, intracolonic (rodent inflammation models).',
				'mechanism'      => 'C-terminal tripeptide of α-MSH; anti-inflammatory activity via NF-κB pathway modulation in keratinocytes and intestinal epithelium.',
				'storage'        => 'Lyophilized: refrigerate (2–8°C). Solution: refrigerate, use within 30 days.',
			),
			'research_focus' => array(
				'IBD (inflammatory bowel disease) preclinical models',
				'Dermatitis and wound-healing research',
			),
			'citations' => array(
				array( 'title' => 'KPV inhibits intestinal inflammation', 'url' => 'https://pubmed.ncbi.nlm.nih.gov/19164494/', 'year' => 2009 ),
			),
			'meta_desc' => 'KPV research profile: α-MSH C-terminal tripeptide, 342 g/mol chemistry, anti-inflammatory mechanism, IBD PubMed citation.',
		),
	);

	return $cache;
}

/**
 * Combination definitions — each maps to one /research/<combo-slug>/ URL.
 *
 * Combo slugs are deterministic: alphabetically-sorted compound slugs
 * joined by `-and-` (e.g. bpc-157-and-tb-500). This guarantees one
 * canonical URL per pair regardless of inbound order.
 *
 * `compounds`     array of compound slugs (2-3 entries).
 * `name`          display label.
 * `category`      shared theme.
 * `rationale`     plain-fact sentence describing WHY they're co-studied.
 * `carried_stack` WC product slug if we sell this combo as a stack, else ''.
 * `meta_desc`     ≤155 chars.
 *
 * @return array<string, array<string,mixed>>
 */
function roji_research_combinations() {
	static $cache = null;
	if ( $cache !== null ) {
		return $cache;
	}

	$cache = array(
		// Combos we sell as stacks — these convert directly.
		'bpc-157-and-tb-500' => array(
			'compounds'     => array( 'bpc-157', 'tb-500' ),
			'name'          => 'BPC-157 + TB-500',
			'category'      => 'Tissue Repair',
			'rationale'     => 'BPC-157 and TB-500 are the two most-cited tissue-repair peptides in preclinical literature, with complementary mechanisms (BPC-157 acts via the nitric-oxide / VEGFR2 axis; TB-500 via actin sequestration and angiogenesis). They are commonly co-investigated in soft-tissue and tendon healing models.',
			'carried_stack' => 'wolverine-stack',
			'meta_desc'     => 'BPC-157 + TB-500 research stack: complementary tissue-repair mechanisms (NO/VEGFR2 + actin sequestration). Chemistry, half-life, and PubMed co-study citations.',
		),

		'cjc-1295-and-ipamorelin' => array(
			'compounds'     => array( 'cjc-1295', 'ipamorelin' ),
			'name'          => 'CJC-1295 + Ipamorelin',
			'category'      => 'GH-Axis',
			'rationale'     => 'CJC-1295 (long-acting GHRH analog) and Ipamorelin (selective ghrelin-receptor agonist) act on two distinct nodes of GH release. The pairing is the canonical research combination for studying synergistic pituitary somatotroph activation.',
			'carried_stack' => 'recomp-stack',
			'meta_desc'     => 'CJC-1295 + Ipamorelin research pairing: GHRH + GHS-R1a complementary GH-axis mechanism. Chemistry, half-lives, PubMed citations.',
		),

		'cjc-1295-and-ipamorelin-and-mk-677' => array(
			'compounds'     => array( 'cjc-1295', 'ipamorelin', 'mk-677' ),
			'name'          => 'CJC-1295 + Ipamorelin + MK-677',
			'category'      => 'GH-Axis',
			'rationale'     => 'Adding orally-active MK-677 to the CJC-1295 + Ipamorelin pairing covers all three major secretagogue mechanisms — GHRH analog, injectable ghrelin analog, and oral ghrelin agonist — over different pharmacokinetic windows.',
			'carried_stack' => 'recomp-stack',
			'meta_desc'     => 'CJC-1295 + Ipamorelin + MK-677 research stack: GHRH analog + injectable + oral ghrelin-axis triple coverage. Chemistry, mechanism, citations.',
		),

		// Co-studied research pairs (no carried stack — request-stocking CTA).
		'bpc-157-and-ghk-cu' => array(
			'compounds'     => array( 'bpc-157', 'ghk-cu' ),
			'name'          => 'BPC-157 + GHK-Cu',
			'category'      => 'Tissue Repair',
			'rationale'     => 'BPC-157 and GHK-Cu are independently studied in dermal and soft-tissue regeneration. BPC-157 acts on the VEGFR2 / nitric-oxide axis; GHK-Cu modulates fibroblast collagen and elastin synthesis with copper-mediated antioxidant activity.',
			'carried_stack' => '',
			'meta_desc'     => 'BPC-157 + GHK-Cu research pairing: VEGFR2/NO axis + collagen/elastin remodeling. Chemistry, mechanism, PubMed citations.',
		),

		'bpc-157-and-kpv' => array(
			'compounds'     => array( 'bpc-157', 'kpv' ),
			'name'          => 'BPC-157 + KPV',
			'category'      => 'Tissue Repair',
			'rationale'     => 'Both compounds appear in IBD and intestinal-inflammation preclinical literature: BPC-157 is studied extensively in rodent ulcer models, while KPV (α-MSH C-terminal tripeptide) acts on NF-κB inflammatory signaling.',
			'carried_stack' => '',
			'meta_desc'     => 'BPC-157 + KPV research pairing: complementary GI-inflammation mechanisms (VEGFR2/NO + NF-κB). PubMed citations.',
		),

		'ghk-cu-and-tb-500' => array(
			'compounds'     => array( 'ghk-cu', 'tb-500' ),
			'name'          => 'TB-500 + GHK-Cu',
			'category'      => 'Tissue Repair',
			'rationale'     => 'Both peptides feature in dermal and corneal-wound-healing literature: TB-500 acts via actin sequestration and endothelial migration; GHK-Cu modulates collagen synthesis and provides copper for SOD-mediated antioxidant activity.',
			'carried_stack' => '',
			'meta_desc'     => 'TB-500 + GHK-Cu research pairing: actin/angiogenesis + collagen/SOD2. Dermal and corneal-healing PubMed citations.',
		),

		'cjc-1295-and-tesamorelin' => array(
			'compounds'     => array( 'cjc-1295', 'tesamorelin' ),
			'name'          => 'CJC-1295 + Tesamorelin',
			'category'      => 'GH-Axis',
			'rationale'     => 'CJC-1295 (DAC-conjugated, ~1-week half-life) and Tesamorelin (~26-min half-life) are commonly compared in pharmacokinetic literature: the same GHRH agonism with markedly different exposure profiles.',
			'carried_stack' => '',
			'meta_desc'     => 'CJC-1295 + Tesamorelin comparative research: GHRH analog PK contrast (~1 week vs. ~26 min). PubMed citations.',
		),

		'ipamorelin-and-tesamorelin' => array(
			'compounds'     => array( 'ipamorelin', 'tesamorelin' ),
			'name'          => 'Ipamorelin + Tesamorelin',
			'category'      => 'GH-Axis',
			'rationale'     => 'Combines a selective ghrelin-receptor agonist with a stabilized GHRH analog — the dual-pathway approach to pituitary somatotroph activation, studied in GH-axis pharmacology research.',
			'carried_stack' => '',
			'meta_desc'     => 'Ipamorelin + Tesamorelin research pairing: dual GHRH + GHS-R1a mechanism. Chemistry, half-lives, PubMed citations.',
		),

		'ipamorelin-and-sermorelin' => array(
			'compounds'     => array( 'ipamorelin', 'sermorelin' ),
			'name'          => 'Ipamorelin + Sermorelin',
			'category'      => 'GH-Axis',
			'rationale'     => 'Sermorelin (GHRH 1–29) and Ipamorelin (selective GHS-R1a agonist) are routinely paired in GH-stimulation research because they activate distinct receptor systems on the same pituitary cell type.',
			'carried_stack' => '',
			'meta_desc'     => 'Ipamorelin + Sermorelin research pairing: GHRH(1-29) + selective GHS-R1a. Chemistry, mechanism, PubMed citations.',
		),

		'cjc-1295-and-ghrp-2' => array(
			'compounds'     => array( 'cjc-1295', 'ghrp-2' ),
			'name'          => 'GHRP-2 + CJC-1295',
			'category'      => 'GH-Axis',
			'rationale'     => 'A long-standing pharmacology pairing: a GHRH analog (CJC-1295) with a hexapeptide ghrelin-receptor agonist (GHRP-2). Dual-pathway pituitary activation has been studied since the 1990s GHRP literature.',
			'carried_stack' => '',
			'meta_desc'     => 'GHRP-2 + CJC-1295 research pairing: ghrelin agonist + GHRH analog dual pathway. PubMed citations.',
		),

		'cjc-1295-and-ghrp-6' => array(
			'compounds'     => array( 'cjc-1295', 'ghrp-6' ),
			'name'          => 'GHRP-6 + CJC-1295',
			'category'      => 'GH-Axis',
			'rationale'     => 'GHRP-6 plus CJC-1295 is the most-published version of the dual-mechanism pituitary-stimulation pairing, dating to early Phase I GHRP human studies.',
			'carried_stack' => '',
			'meta_desc'     => 'GHRP-6 + CJC-1295 research pairing: classical GHRP + GHRH dual GH-axis stimulation. PubMed citations.',
		),

		// GLP-1 / Incretin pairings.
		'retatrutide-and-tirzepatide' => array(
			'compounds'     => array( 'retatrutide', 'tirzepatide' ),
			'name'          => 'Tirzepatide + Retatrutide',
			'category'      => 'GLP-1 / Incretin',
			'rationale'     => 'Tirzepatide (GIP/GLP-1 dual agonist) and Retatrutide (GIP/GLP-1/Glucagon triple agonist) are the two leading incretin-class molecules in current Phase II/III obesity trials and are routinely compared head-to-head in published research.',
			'carried_stack' => '',
			'meta_desc'     => 'Tirzepatide + Retatrutide comparative research: GIP/GLP-1 dual vs. GIP/GLP-1/Glucagon triple agonism. PubMed citations.',
		),

		'semaglutide-and-tirzepatide' => array(
			'compounds'     => array( 'semaglutide', 'tirzepatide' ),
			'name'          => 'Semaglutide + Tirzepatide',
			'category'      => 'GLP-1 / Incretin',
			'rationale'     => 'Semaglutide (GLP-1 mono-agonist) and Tirzepatide (GIP/GLP-1 dual agonist) have been directly compared in the SURPASS-2 head-to-head trial and feature prominently in the obesity-pharmacology literature.',
			'carried_stack' => '',
			'meta_desc'     => 'Semaglutide + Tirzepatide research comparison: GLP-1 mono vs. GIP/GLP-1 dual agonism (SURPASS-2). PubMed citations.',
		),

		'aod-9604-and-semaglutide' => array(
			'compounds'     => array( 'aod-9604', 'semaglutide' ),
			'name'          => 'Semaglutide + AOD-9604',
			'category'      => 'Metabolic',
			'rationale'     => 'GLP-1 receptor agonism (Semaglutide) and the lipolytic hGH(177-191) fragment (AOD-9604) target distinct metabolic pathways. Both appear in the obesity-pharmacology literature.',
			'carried_stack' => '',
			'meta_desc'     => 'Semaglutide + AOD-9604 research comparison: GLP-1 mono-agonist + hGH lipolytic fragment. Mechanism contrast, PubMed citations.',
		),

		// Cognitive pairing.
		'selank-and-semax' => array(
			'compounds'     => array( 'selank', 'semax' ),
			'name'          => 'Selank + Semax',
			'category'      => 'Cognitive',
			'rationale'     => 'Selank (tuftsin analog, anxiolytic-style research) and Semax (ACTH(4-10) analog, cognitive/stroke research) are the two most-cited Russian neuropeptides and are commonly studied together in BDNF/serotonergic neuropharmacology.',
			'carried_stack' => '',
			'meta_desc'     => 'Selank + Semax research pairing: complementary neuropeptide mechanisms (GABA/serotonin + BDNF/NGF). PubMed citations.',
		),

		// Sleep / longevity pairing.
		'dsip-and-epitalon' => array(
			'compounds'     => array( 'dsip', 'epitalon' ),
			'name'          => 'DSIP + Epitalon',
			'category'      => 'Sleep / Longevity',
			'rationale'     => 'Both peptides feature in pineal-axis and circadian-rhythm research: DSIP modulates EEG delta-power; Epitalon is derived from pineal-gland epithalamin and influences melatonin signaling.',
			'carried_stack' => '',
			'meta_desc'     => 'DSIP + Epitalon research pairing: EEG delta-power + pineal-axis modulation. Chemistry, mechanism, PubMed citations.',
		),
	);

	return $cache;
}

/**
 * Sort + slugify a list of compound slugs into the canonical combo slug.
 *
 * "BPC-157 + TB-500" → ['bpc-157','tb-500'] → "bpc-157-and-tb-500"
 *
 * @param string[] $slugs Compound slugs.
 * @return string Canonical combo slug.
 */
function roji_research_combo_slug( array $slugs ) {
	$clean = array_map( 'sanitize_title', array_filter( array_map( 'strval', $slugs ) ) );
	$clean = array_unique( $clean );
	sort( $clean, SORT_STRING );
	return implode( '-and-', $clean );
}

/**
 * Lookup helper: get a compound by slug.
 *
 * @param string $slug Compound slug.
 * @return array|null
 */
function roji_research_get_compound( $slug ) {
	$db = roji_research_compounds();
	return $db[ $slug ] ?? null;
}

/**
 * Lookup helper: get a combination by slug.
 *
 * @param string $slug Combo slug.
 * @return array|null
 */
function roji_research_get_combination( $slug ) {
	$db = roji_research_combinations();
	return $db[ $slug ] ?? null;
}

/**
 * All slugs (compounds and combinations) — used by the sitemap and
 * for routing precedence checks.
 *
 * @return string[]
 */
function roji_research_all_slugs() {
	return array_merge(
		array_keys( roji_research_compounds() ),
		array_keys( roji_research_combinations() )
	);
}
