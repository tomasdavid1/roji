import { useEffect, useState } from "react";
import { ReconWidget } from "./tools/ReconWidget";
import { CostPerDoseWidget } from "./tools/CostPerDoseWidget";
import { RecompWidget } from "./tools/RecompWidget";
import { InteractionsWidget } from "./tools/InteractionsWidget";
import { HalfLifeWidget } from "./tools/HalfLifeWidget";
import { HubWidget } from "./tools/HubWidget";

interface OpenAIContext {
  toolOutput?: unknown;
  toolResponseMetadata?: Record<string, unknown>;
  toolInput?: unknown;
  callTool?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  sendFollowUpMessage?: (opts: { prompt: string; scrollToBottom?: boolean }) => void;
  setWidgetState?: (state: unknown) => void;
  widgetState?: unknown;
}

declare global {
  interface Window {
    openai?: OpenAIContext;
  }
}

interface ToolData {
  toolName: string;
  [key: string]: unknown;
}

const TOOL_MAP: Record<string, React.FC<{ data: ToolData }>> = {
  roji_tools: HubWidget,
  reconstitution_calculator: ReconWidget,
  cost_per_dose: CostPerDoseWidget,
  recomp_calculator: RecompWidget,
  supplement_interactions: InteractionsWidget,
  half_life_lookup: HalfLifeWidget,
};

function readToolData(): ToolData | null {
  try {
    const w = window as Window;
    // Preferred: structuredContent surfaced as toolOutput
    const toolOutput = w.openai?.toolOutput;
    if (toolOutput && typeof toolOutput === "object" && "toolName" in toolOutput) {
      return toolOutput as ToolData;
    }
    // Legacy/compat: _meta["openai/data"]
    const meta = w.openai?.toolResponseMetadata;
    const raw = meta?.["openai/data"];
    if (raw && typeof raw === "object" && "toolName" in (raw as object)) {
      return raw as ToolData;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function Footer() {
  return (
    <div className="roji-footer">
      Powered by{" "}
      <a
        href="https://tools.rojipeptides.com?utm_source=mcp&utm_medium=ai&utm_campaign=widget_footer"
        target="_blank"
        rel="noopener noreferrer"
      >
        Roji Research Tools
      </a>{" "}
      &middot;{" "}
      <a
        href="https://rojipeptides.com/shop?utm_source=mcp&utm_medium=ai&utm_campaign=widget_footer"
        target="_blank"
        rel="noopener noreferrer"
      >
        Shop research-grade peptides &rarr;
      </a>
    </div>
  );
}

export function RojiWidgetApp() {
  const [toolData, setToolData] = useState<ToolData | null>(() => readToolData());

  // Re-read when ChatGPT pushes new globals (e.g., on tool result arrival)
  useEffect(() => {
    function refresh() {
      const next = readToolData();
      if (next) setToolData(next);
    }
    // ChatGPT dispatches "openai:set_globals" when toolOutput / metadata change
    window.addEventListener("openai:set_globals", refresh);
    // Also poll briefly after mount in case the data lands a tick after render
    const t1 = setTimeout(refresh, 100);
    const t2 = setTimeout(refresh, 500);
    const t3 = setTimeout(refresh, 1500);
    return () => {
      window.removeEventListener("openai:set_globals", refresh);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // No data yet — render the hub picker so the widget is never empty.
  // Bare @Roji prompts and tool-load races both land here.
  if (!toolData) {
    return (
      <div>
        <HubWidget data={{ toolName: "roji_tools", mode: "picker" }} />
        <Footer />
      </div>
    );
  }

  const Widget = TOOL_MAP[toolData.toolName];
  if (!Widget) {
    return (
      <div>
        <HubWidget data={{ toolName: "roji_tools", mode: "picker" }} />
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <Widget data={toolData} />
      <Footer />
    </div>
  );
}
