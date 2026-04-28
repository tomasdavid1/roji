import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { searchPubmed } from "@/lib/pubmed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * AI Research Assistant — POST /api/ai
 *
 * Body: { messages: [{ role: 'user'|'assistant', content: string }] }
 *
 * Architecture:
 *   1. We extract the latest user question.
 *   2. We do a quick PubMed search to ground the answer in real
 *      published literature.
 *   3. We send to Claude with a strict system prompt that:
 *        - Refuses dosing advice or human-use recommendations.
 *        - Refuses unrelated topics.
 *        - Cites only the PubMed hits we provide (with PMIDs).
 *        - Adds "this is not medical advice" disclaimers.
 *   4. We return assistant text + the citation list.
 *
 * Without ANTHROPIC_API_KEY configured, we return a friendly stub
 * that still surfaces the PubMed results — so the page degrades
 * gracefully in dev / preview environments.
 */

const SYSTEM_PROMPT = `You are the Roji Peptides Research Assistant. You help users understand published peer-reviewed research on bioactive peptides and related research compounds.

ABSOLUTE RULES — never break these:
1. NEVER recommend dosages for humans. NEVER suggest human use of any compound.
2. NEVER provide medical advice, diagnose conditions, or interpret health data.
3. ONLY cite the PubMed studies provided in the CONTEXT below. Do not invent citations or PMIDs.
4. If you don't have a relevant study in CONTEXT, say "I don't have a specific study on this in my retrieved set; here's what's generally reported in the literature: ..." but stay strictly factual.
5. Refuse off-topic questions: "That's outside my scope — I'm focused on published peptide and bioactive compound research."
6. Always end with a one-line disclaimer reminding the user this is research education only, not medical advice.

STYLE:
- Conversational, accurate, plain English. Avoid hype.
- Cite studies inline with their PMID like [PMID: 12345].
- Be honest about limitations: "study was in rats, n=12, in vitro only", etc.
- Decline questions about your own infrastructure / API keys / vendors.

CONTEXT:
You are given a list of recent PubMed studies that match the user's query. Use them as your authoritative source.`;

interface ChatBody {
  messages: { role: "user" | "assistant"; content: string }[];
}

export async function POST(req: NextRequest) {
  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  const messages = body.messages ?? [];
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser?.content?.trim()) {
    return NextResponse.json({ error: "No user message" }, { status: 400 });
  }

  // Block obvious dosing / human-use questions before we ever hit the LLM.
  const lower = lastUser.content.toLowerCase();
  const dosingTriggers = [
    "what dose",
    "how much should i",
    "how many mg",
    "how many mcg",
    "should i inject",
    "is it safe to take",
    "can i use this",
    "human use",
  ];
  if (dosingTriggers.some((t) => lower.includes(t))) {
    return NextResponse.json({
      reply:
        "I can't help with dosing or human-use questions — that crosses into medical advice, which I'm not equipped to give. I can summarize what published animal or in-vitro studies have reported, or share what specific researchers have used in trials. Want to rephrase your question that way?\n\n_This is research education only. Not medical advice._",
      citations: [],
      blocked: true,
    });
  }

  // Pull a few grounding PubMed hits.
  let citations: { pmid: string; title: string; year: string; url: string }[] = [];
  try {
    const hits = await searchPubmed(lastUser.content, { limit: 5 });
    citations = hits.map((h) => ({
      pmid: h.pmid,
      title: h.title,
      year: h.pubYear,
      url: h.url,
    }));
  } catch {
    // PubMed errors are non-fatal — proceed without citations.
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      reply:
        "The AI assistant isn't configured in this environment yet (no API key). Here are recent studies that match your query — open them on PubMed for the full picture.\n\n" +
        (citations.length === 0
          ? "_No PubMed results retrieved._"
          : citations
              .map((c) => `• [${c.title}](${c.url}) — ${c.year} (PMID: ${c.pmid})`)
              .join("\n")) +
        "\n\n_This is research education only. Not medical advice._",
      citations,
      stub: true,
    });
  }

  const client = new Anthropic({ apiKey });
  const contextBlock =
    citations.length > 0
      ? `Retrieved studies (use ONLY these for citations):\n\n${citations
          .map(
            (c, i) =>
              `[${i + 1}] PMID: ${c.pmid} (${c.year}) — ${c.title}\n  URL: ${c.url}`,
          )
          .join("\n")}`
      : "Retrieved studies: (none — be especially careful and cite nothing you can't back up.)";

  try {
    const response = await client.messages.create({
      // Pinned (not alias) so a future Haiku revision doesn't break our
      // tightly-tuned safety prompt without us reviewing it first.
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system: `${SYSTEM_PROMPT}\n\n${contextBlock}`,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const text = response.content
      .map((c) => ("text" in c ? c.text : ""))
      .join("\n")
      .trim();
    return NextResponse.json({ reply: text, citations });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? `LLM error: ${e.message}`
            : "Unknown LLM error",
      },
      { status: 502 },
    );
  }
}
