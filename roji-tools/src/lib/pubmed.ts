/**
 * PubMed E-utilities client (server-side).
 *
 * Documentation: https://www.ncbi.nlm.nih.gov/books/NBK25500/
 *
 * We use ESearch to find PMIDs, ESummary to fetch metadata (title,
 * authors, journal, date), and don't pull full abstracts in bulk because
 * they require EFetch with XML and are heavier. The compound search page
 * fetches a tiny subset of abstracts on demand.
 *
 * Rate limit: 3 req/s without key, 10 req/s with `NCBI_API_KEY`.
 */
const ESEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const ESUMMARY = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi";
const EFETCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";

const TOOL = "rojipeptides-tools";
const EMAIL = process.env.NCBI_CONTACT_EMAIL ?? "research@rojipeptides.com";

function withCommonParams(params: Record<string, string>) {
  const sp = new URLSearchParams({
    ...params,
    tool: TOOL,
    email: EMAIL,
  });
  if (process.env.NCBI_API_KEY) sp.set("api_key", process.env.NCBI_API_KEY);
  return sp;
}

export interface PubmedHit {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  pubYear: string;
  doi?: string;
  pubTypes: string[]; // e.g. "Review", "Clinical Trial", "Journal Article"
  url: string;
}

/**
 * Search PubMed and return summary metadata for the top N results.
 * Combines ESearch + ESummary into one logical call.
 */
export async function searchPubmed(
  query: string,
  options: { limit?: number; sort?: "relevance" | "date" } = {},
): Promise<PubmedHit[]> {
  const limit = options.limit ?? 20;
  const sort = options.sort ?? "relevance";

  // Step 1: ESearch.
  const searchUrl = `${ESEARCH}?${withCommonParams({
    db: "pubmed",
    term: query,
    retmax: String(limit),
    retmode: "json",
    sort: sort === "date" ? "pub+date" : "relevance",
  }).toString()}`;
  const sRes = await fetch(searchUrl, { next: { revalidate: 1800 } });
  if (!sRes.ok) {
    throw new Error(`PubMed ESearch failed: ${sRes.status}`);
  }
  const sJson = (await sRes.json()) as {
    esearchresult?: { idlist?: string[] };
  };
  const ids = sJson.esearchresult?.idlist ?? [];
  if (!ids.length) return [];

  // Step 2: ESummary.
  const sumUrl = `${ESUMMARY}?${withCommonParams({
    db: "pubmed",
    id: ids.join(","),
    retmode: "json",
  }).toString()}`;
  const sumRes = await fetch(sumUrl, { next: { revalidate: 1800 } });
  if (!sumRes.ok) throw new Error(`PubMed ESummary failed: ${sumRes.status}`);
  const sumJson = (await sumRes.json()) as {
    result?: Record<string, unknown>;
  };
  const result = sumJson.result ?? {};

  const out: PubmedHit[] = [];
  for (const id of ids) {
    const r = result[id] as
      | {
          uid?: string;
          title?: string;
          authors?: { name?: string }[];
          fulljournalname?: string;
          source?: string;
          pubdate?: string;
          articleids?: { idtype?: string; value?: string }[];
          pubtype?: string[];
        }
      | undefined;
    if (!r) continue;
    const doi = (r.articleids ?? []).find((a) => a.idtype === "doi")?.value;
    const pubYear = (r.pubdate ?? "").match(/\d{4}/)?.[0] ?? "";
    const hit: PubmedHit = {
      pmid: id,
      title: (r.title ?? "").replace(/[.\s]+$/, ""),
      authors: (r.authors ?? []).map((a) => a.name ?? "").filter(Boolean),
      journal: r.fulljournalname ?? r.source ?? "",
      pubYear,
      pubTypes: (r.pubtype ?? []).filter(Boolean),
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
    };
    if (doi) hit.doi = doi;
    out.push(hit);
  }
  return out;
}

/**
 * Fetch the abstract text for a single PMID. Used on hover/expand only,
 * not for bulk lists.
 */
export async function fetchAbstract(pmid: string): Promise<string> {
  const url = `${EFETCH}?${withCommonParams({
    db: "pubmed",
    id: pmid,
    rettype: "abstract",
    retmode: "text",
  }).toString()}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return "";
  return await res.text();
}

/**
 * Tag a hit's primary "study type" pill out of common PubMed
 * publication-type strings, ordered by clinical strength.
 */
export function classifyHit(hit: PubmedHit):
  | "Meta-analysis"
  | "Systematic Review"
  | "RCT"
  | "Clinical Trial"
  | "Cohort"
  | "Review"
  | "Animal"
  | "In vitro"
  | "Other" {
  const set = new Set(hit.pubTypes.map((p) => p.toLowerCase()));
  if (set.has("meta-analysis")) return "Meta-analysis";
  if (set.has("systematic review")) return "Systematic Review";
  if (set.has("randomized controlled trial")) return "RCT";
  if (set.has("clinical trial")) return "Clinical Trial";
  if (set.has("observational study") || set.has("cohort study")) return "Cohort";
  if (set.has("review")) return "Review";
  if (
    hit.title.toLowerCase().includes("rat") ||
    hit.title.toLowerCase().includes("mouse") ||
    hit.title.toLowerCase().includes("mice")
  )
    return "Animal";
  if (
    hit.title.toLowerCase().includes("in vitro") ||
    hit.title.toLowerCase().includes("in-vitro")
  )
    return "In vitro";
  return "Other";
}
