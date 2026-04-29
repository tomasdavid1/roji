interface ToolData {
  toolName: string;
  [key: string]: unknown;
}

interface ToolEntry {
  id: string;
  title: string;
  description: string;
  example: string;
}

const DEFAULT_TOOLS: ToolEntry[] = [
  {
    id: "reconstitution_calculator",
    title: "Reconstitution Calculator",
    description:
      "Vial mg + water mL + dose mcg \u2192 units to draw, mL per dose, total doses",
    example: "5 mg vial + 2 mL water + 250 mcg dose",
  },
  {
    id: "half_life_lookup",
    title: "Half-Life Database",
    description:
      "Half-life and dosing cadence for major research peptides",
    example: "BPC-157, CJC-1295, semaglutide",
  },
  {
    id: "cost_per_dose",
    title: "Cost per Dose",
    description: "Compare effective $/dose across vials and protocols",
    example: "10 mg vial $80, 250 mcg/dose",
  },
  {
    id: "recomp_calculator",
    title: "Body Recomp Calculator",
    description: "Caloric and macro targets for cut, recomp, or bulk",
    example: "180 lb male, recomp goal, moderate activity",
  },
  {
    id: "supplement_interactions",
    title: "Supplement Interactions",
    description: "Check for known peptide \u00d7 supplement interactions",
    example: "BPC-157 + creatine + omega-3",
  },
];

const PROMPT_BY_TOOL: Record<string, string> = {
  reconstitution_calculator:
    "Use Roji to calculate reconstitution for a 5 mg vial with 2 mL bacteriostatic water and a 250 mcg dose on a U-100 syringe.",
  half_life_lookup:
    "Use Roji to look up the half-life of BPC-157.",
  cost_per_dose:
    "Use Roji to calculate cost per dose for a 10 mg BPC-157 vial that costs $80 at 250 mcg per dose.",
  recomp_calculator:
    "Use Roji's body recomp calculator: 180 lb male, moderate activity, recomp goal.",
  supplement_interactions:
    "Use Roji to check supplement interactions between BPC-157, creatine, and omega-3.",
};

function pickTool(toolId: string) {
  const w = window as Window & {
    openai?: {
      sendFollowUpMessage?: (opts: { prompt: string; scrollToBottom?: boolean }) => void;
    };
  };
  const prompt = PROMPT_BY_TOOL[toolId];
  if (!prompt) return;
  if (w.openai?.sendFollowUpMessage) {
    w.openai.sendFollowUpMessage({ prompt });
  } else {
    // Fallback: open the standalone tool in a new tab so users on
    // non-Apps-SDK clients still get value.
    const slug = toolId
      .replace("_calculator", "")
      .replace("_lookup", "")
      .replace("_", "-");
    window.open(
      `https://tools.rojipeptides.com/${slug}?utm_source=mcp&utm_medium=ai&utm_campaign=hub_picker`,
      "_blank",
      "noopener",
    );
  }
}

export function HubWidget({ data }: { data: ToolData }) {
  const tools = (Array.isArray(data.tools) ? data.tools : DEFAULT_TOOLS) as ToolEntry[];
  const topic = typeof data.topic === "string" ? data.topic : "";

  return (
    <div className="roji-hub">
      <div className="roji-hub-header">
        <div className="roji-hub-eyebrow">Roji Research Tools</div>
        <h2 className="roji-hub-title">
          {topic
            ? `Pick a tool for ${topic}`
            : "What do you need today?"}
        </h2>
        <p className="roji-hub-sub">
          5 free tools for peptide research. Tap one to use it right here in
          ChatGPT.
        </p>
      </div>

      <div className="roji-hub-grid">
        {tools.map((t) => (
          <button
            key={t.id}
            className="roji-hub-card"
            onClick={() => pickTool(t.id)}
            type="button"
          >
            <div className="roji-hub-card-title">{t.title}</div>
            <div className="roji-hub-card-desc">{t.description}</div>
            <div className="roji-hub-card-example">e.g. {t.example}</div>
          </button>
        ))}
      </div>

      <a
        className="roji-hub-cta"
        href="https://rojipeptides.com/shop?utm_source=mcp&utm_medium=ai&utm_campaign=hub_shop_cta"
        target="_blank"
        rel="noopener noreferrer"
      >
        Shop research-grade peptides &rarr;
      </a>
    </div>
  );
}
