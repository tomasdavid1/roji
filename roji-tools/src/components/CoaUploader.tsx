"use client";

import { useState } from "react";

import { analyzeCoaText, type CoaAnalysis } from "@/lib/coa-analyze";
import { track } from "@/lib/track";

export function CoaUploader() {
  const [analysis, setAnalysis] = useState<CoaAnalysis | null>(null);
  const [text, setText] = useState("");
  const [filename, setFilename] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onFile = async (file: File) => {
    setBusy(true);
    setErr(null);
    setFilename(file.name);
    try {
      const buf = await file.arrayBuffer();
      // Dynamically import pdfjs in the browser only.
      const pdfjs = (await import(
        "pdfjs-dist/legacy/build/pdf.mjs"
      )) as unknown as {
        GlobalWorkerOptions: { workerSrc: string };
        getDocument: (args: { data: ArrayBuffer }) => {
          promise: Promise<{
            numPages: number;
            getPage: (i: number) => Promise<{
              getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
            }>;
          }>;
        };
      };
      // Worker config — point to the CDN worker bundle (matches major version).
      pdfjs.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.worker.min.mjs";

      const doc = await pdfjs.getDocument({ data: buf }).promise;
      let extracted = "";
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        extracted +=
          content.items.map((it) => it.str ?? "").join(" ") + "\n\n";
      }
      setText(extracted);
      const a = analyzeCoaText(extracted);
      setAnalysis(a);
      track("coa_analyzed", {
        score: a.trustScore,
        lab: a.identifiedLab ?? "unknown",
        compound: a.identifiedCompound ?? "unknown",
      });
    } catch (e) {
      setErr(
        e instanceof Error
          ? e.message
          : "Couldn't read this PDF. Try a different file or paste text below.",
      );
    } finally {
      setBusy(false);
    }
  };

  const onPasteAnalyze = () => {
    if (!text.trim()) return;
    const a = analyzeCoaText(text);
    setAnalysis(a);
    track("coa_analyzed", { method: "paste", score: a.trustScore });
  };

  return (
    <section className="mx-auto max-w-4xl px-6 py-10">
      <div
        className="rounded-roji-lg border-2 border-dashed border-roji-border bg-roji-card p-8 text-center transition-colors hover:border-roji-accent"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
      >
        <div className="roji-pill mb-3">100% client-side · file never uploaded</div>
        <div className="text-lg font-semibold">Drop a COA PDF here</div>
        <div className="mt-1 text-sm text-roji-muted">
          Or click to browse. Janoshik, Anresco, Pyrum, vendor-internal — we'll
          handle whichever format shows up.
        </div>
        <label className="mt-5 inline-block cursor-pointer">
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
          <span className="roji-btn-primary">Choose PDF</span>
        </label>
        {filename && (
          <div className="mt-3 text-xs text-roji-dim font-mono">
            {filename}
          </div>
        )}
      </div>

      <div className="mt-6">
        <details className="rounded-roji border border-roji-border bg-roji-card p-5 text-sm">
          <summary className="cursor-pointer text-roji-text font-medium">
            Or paste COA text directly
          </summary>
          <div className="mt-3">
            <textarea
              className="roji-input min-h-[160px] font-mono text-xs"
              placeholder="Paste the contents of your COA here…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="mt-2 flex justify-end">
              <button onClick={onPasteAnalyze} className="roji-btn-primary">
                Analyze
              </button>
            </div>
          </div>
        </details>
      </div>

      {busy && (
        <div className="mt-8 text-center text-sm text-roji-muted">
          Reading PDF…
        </div>
      )}
      {err && (
        <div className="mt-8 rounded-roji border border-roji-danger/40 bg-roji-danger/5 p-4 text-sm">
          {err}
        </div>
      )}

      {analysis && <AnalysisPanel analysis={analysis} />}
    </section>
  );
}

function AnalysisPanel({ analysis }: { analysis: CoaAnalysis }) {
  const score = analysis.trustScore;
  const tone =
    score >= 80
      ? { label: "Looks solid", color: "var(--roji-success)" }
      : score >= 50
        ? { label: "Partial coverage", color: "var(--roji-warning)" }
        : { label: "Significant gaps", color: "var(--roji-danger)" };

  return (
    <div className="mt-10 space-y-5">
      <div className="roji-card flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="roji-mono-label">Overall</div>
          <div className="text-2xl font-semibold" style={{ color: tone.color }}>
            {tone.label}
          </div>
          <div className="mt-1 text-xs text-roji-muted">
            {analysis.identifiedCompound && (
              <>
                Compound: <span className="text-roji-text">{analysis.identifiedCompound}</span>{" "}
                ·{" "}
              </>
            )}
            {analysis.identifiedLab && (
              <>
                Lab: <span className="text-roji-text">{analysis.identifiedLab}</span>{" "}
                ·{" "}
              </>
            )}
            {analysis.identifiedDate && (
              <>
                Date: <span className="text-roji-text">{analysis.identifiedDate}</span>
              </>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="roji-mono-label">Trust score</div>
          <div className="font-mono text-3xl" style={{ color: tone.color }}>
            {score}
            <span className="text-base text-roji-dim">/100</span>
          </div>
        </div>
      </div>

      {(analysis.positives.length > 0 || analysis.flags.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {analysis.positives.length > 0 && (
            <div className="rounded-roji border border-roji-success/40 bg-roji-success/5 p-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-roji-success">
                ✓ Positives
              </div>
              <ul className="space-y-1 text-sm text-roji-text/85">
                {analysis.positives.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          {analysis.flags.length > 0 && (
            <div className="rounded-roji border border-roji-warning/40 bg-roji-warning/5 p-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-roji-warning">
                ⚠ Flags
              </div>
              <ul className="space-y-1 text-sm text-roji-text/85">
                {analysis.flags.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="roji-card">
        <div className="roji-mono-label mb-3">Field-by-field breakdown</div>
        <div className="grid gap-3">
          {analysis.fields.map((f) => (
            <div key={f.key} className="border-b border-roji-border pb-3 last:border-b-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{f.label}</div>
                  <div className="mt-1 text-xs text-roji-muted">{f.explainer}</div>
                </div>
                <div className="text-right">
                  <div
                    className={`font-mono text-sm ${
                      f.good === true
                        ? "text-roji-success"
                        : f.good === false
                          ? "text-roji-warning"
                          : "text-roji-text"
                    }`}
                  >
                    {f.value ?? "—"}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {analysis.fields.length === 0 && (
            <div className="text-sm text-roji-muted">
              We couldn't extract any structured fields from this document.
              Try uploading a clearer scan or paste the COA text directly.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
