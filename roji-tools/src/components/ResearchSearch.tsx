"use client";

import { useEffect, useState } from "react";

import { track } from "@/lib/track";
import { PostResultCTA } from "./PostResultCTA";

interface Hit {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  pubYear: string;
  url: string;
  doi?: string;
  pubTypes: string[];
  studyType: string;
}

const SUGGESTIONS = [
  "BPC-157 tendon",
  "TB-500 healing",
  "CJC-1295 ipamorelin",
  "MK-677 IGF-1",
  "MOTS-c metabolic",
  "epithalon telomerase",
  "GHK-Cu skin",
  "PT-141 sexual",
  "selank anxiety",
  "thymosin alpha-1 immune",
];

const STUDY_BADGE: Record<string, string> = {
  "Meta-analysis": "bg-roji-accent/15 text-roji-accent",
  "Systematic Review": "bg-roji-accent/15 text-roji-accent",
  RCT: "bg-roji-success/15 text-roji-success",
  "Clinical Trial": "bg-roji-success/15 text-roji-success",
  Cohort: "bg-roji-success/15 text-roji-success",
  Review: "bg-roji-warning/10 text-roji-warning",
  Animal: "bg-white/5 text-roji-muted",
  "In vitro": "bg-white/5 text-roji-muted",
  Other: "bg-white/5 text-roji-muted",
};

export function ResearchSearch() {
  const [query, setQuery] = useState("");
  const [committed, setCommitted] = useState("");
  const [sort, setSort] = useState<"relevance" | "date">("relevance");
  const [filter, setFilter] = useState<string>("All");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!committed) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    const url = `/api/pubmed?q=${encodeURIComponent(committed)}&limit=30&sort=${sort}`;
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Search failed (${r.status})`);
        return (await r.json()) as { hits: Hit[]; count: number };
      })
      .then((data) => {
        if (cancelled) return;
        setHits(data.hits ?? []);
        track("research_search", { q: committed, count: data.count });
      })
      .catch((e) => {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : "Search failed");
        setHits([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [committed, sort]);

  const filtered = hits
    ? filter === "All"
      ? hits
      : hits.filter((h) => h.studyType === filter)
    : null;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCommitted(query.trim());
  };

  return (
    <section className="mx-auto max-w-4xl px-6 py-10">
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input
          className="roji-input flex-1"
          placeholder="Search a compound, condition, or mechanism (e.g. BPC-157 tendon)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <button type="submit" className="roji-btn-primary">
          Search PubMed
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setQuery(s);
              setCommitted(s);
            }}
            className="rounded-full border border-roji-border bg-roji-dark px-3 py-1 text-xs text-roji-muted hover:border-roji-accent hover:text-roji-text transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      {hits && (
        <div className="mt-8 mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-roji-muted">
            {filtered?.length ?? 0} results
            {committed && ` for "${committed}"`}
          </div>
          <div className="flex gap-2">
            <select
              className="roji-select text-xs py-2"
              value={sort}
              onChange={(e) => setSort(e.target.value as "relevance" | "date")}
            >
              <option value="relevance">Relevance</option>
              <option value="date">Most recent</option>
            </select>
            <select
              className="roji-select text-xs py-2"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option>All</option>
              <option>Meta-analysis</option>
              <option>Systematic Review</option>
              <option>RCT</option>
              <option>Clinical Trial</option>
              <option>Cohort</option>
              <option>Review</option>
              <option>Animal</option>
              <option>In vitro</option>
              <option>Other</option>
            </select>
          </div>
        </div>
      )}

      {loading && (
        <div className="mt-10 text-center text-sm text-roji-muted">
          Searching PubMed…
        </div>
      )}
      {err && (
        <div className="mt-6 rounded-roji border border-roji-danger/40 bg-roji-danger/5 p-4 text-sm text-roji-text/85">
          {err}
        </div>
      )}

      {filtered && (
        <div className="mt-2 grid gap-3">
          {filtered.map((h) => (
            <a
              key={h.pmid}
              href={h.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="roji-card-interactive group block"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px] font-mono uppercase tracking-wider text-roji-muted">
                    <span
                      className={`rounded-full px-2 py-[1px] ${STUDY_BADGE[h.studyType] ?? "bg-white/5 text-roji-muted"}`}
                    >
                      {h.studyType}
                    </span>
                    <span>{h.journal}</span>
                    {h.pubYear && <span>· {h.pubYear}</span>}
                  </div>
                  <h3 className="text-base font-semibold leading-snug text-roji-text">
                    {h.title}
                  </h3>
                  <div className="mt-2 text-xs text-roji-muted">
                    {h.authors.slice(0, 4).join(", ")}
                    {h.authors.length > 4 && ` +${h.authors.length - 4} more`}
                  </div>
                </div>
                <span className="text-roji-dim transition-colors group-hover:text-roji-accent">
                  →
                </span>
              </div>
            </a>
          ))}
          {!filtered.length && !loading && (
            <div className="py-10 text-center text-sm text-roji-muted">
              No results match that filter.
            </div>
          )}
        </div>
      )}

      {hits !== null && !loading && (
        <PostResultCTA
          toolSlug="research"
          title="Reading the research? Roji ships the compounds these papers reference — Janoshik-verified, ≥99% purity."
          buttonLabel="Browse research stacks →"
        />
      )}

      <p className="mt-10 text-[12px] text-roji-dim">
        Search powered by NCBI PubMed E-utilities. Results cached for 30
        minutes. Educational use only — Roji does not endorse, verify, or
        translate the conclusions of any individual paper.
      </p>
    </section>
  );
}
