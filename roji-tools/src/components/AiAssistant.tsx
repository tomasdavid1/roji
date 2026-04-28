"use client";

import { useState } from "react";

import { track } from "@/lib/track";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

interface Citation {
  pmid: string;
  title: string;
  year: string;
  url: string;
}

const STARTERS = [
  "What does the research say about BPC-157 and tendon healing?",
  "Summarize the difference between CJC-1295 with and without DAC.",
  "What animal studies exist on TB-500 for muscle injury recovery?",
  "What's the strongest published evidence for MOTS-c metabolic effects?",
];

export function AiAssistant() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text.trim() }];
    setMessages(next);
    setDraft("");
    setBusy(true);
    setErr(null);
    track("ai_message_sent", { len: text.length });
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Error ${res.status}`);
      }
      const data = (await res.json()) as {
        reply: string;
        citations: Citation[];
      };
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      setCitations(data.citations ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something broke.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl px-6 py-10">
      <div className="space-y-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="text-sm text-roji-muted">
              Try one of these:
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="roji-card-interactive text-left text-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <Bubble key={i} msg={m} />
        ))}
        {busy && (
          <div className="text-sm text-roji-muted">Pulling studies and thinking…</div>
        )}
        {err && (
          <div className="rounded-roji border border-roji-danger/40 bg-roji-danger/5 p-3 text-sm text-roji-text/85">
            {err}
          </div>
        )}
        {citations.length > 0 && (
          <div className="rounded-roji border border-roji-border bg-roji-darker p-4">
            <div className="mb-2 text-[10px] font-mono uppercase tracking-wider text-roji-muted">
              Studies referenced
            </div>
            <ul className="space-y-1 text-xs">
              {citations.map((c) => (
                <li key={c.pmid}>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-roji-accent hover:text-roji-accent-hover"
                  >
                    {c.title}
                  </a>{" "}
                  <span className="text-roji-dim">
                    — {c.year} (PMID: {c.pmid})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="mt-6 flex gap-2"
      >
        <input
          className="roji-input flex-1"
          placeholder="Ask about peptide research…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={busy}
        />
        <button type="submit" disabled={busy} className="roji-btn-primary">
          Ask
        </button>
      </form>
    </section>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div
      className={`rounded-roji-lg p-4 text-sm leading-relaxed ${
        isUser
          ? "bg-roji-accent/10 border border-roji-accent/30"
          : "bg-roji-card border border-roji-border"
      }`}
    >
      <div
        className={`mb-2 text-[10px] font-mono uppercase tracking-wider ${
          isUser ? "text-roji-accent" : "text-roji-muted"
        }`}
      >
        {isUser ? "You" : "Roji AI"}
      </div>
      <div className="whitespace-pre-wrap">{msg.content}</div>
    </div>
  );
}
