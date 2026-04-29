import { useState, useEffect } from "react";
import { ReconWidget } from "./tools/ReconWidget";
import { CostPerDoseWidget } from "./tools/CostPerDoseWidget";
import { RecompWidget } from "./tools/RecompWidget";
import { InteractionsWidget } from "./tools/InteractionsWidget";
import { HalfLifeWidget } from "./tools/HalfLifeWidget";

interface OpenAIContext {
  toolResponseMetadata?: Record<string, unknown>;
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
  reconstitution_calculator: ReconWidget,
  cost_per_dose: CostPerDoseWidget,
  body_recomp_calculator: RecompWidget,
  supplement_interactions: InteractionsWidget,
  half_life_database: HalfLifeWidget,
};

function Footer() {
  return (
    <div className="roji-footer">
      Powered by{" "}
      <a
        href="https://tools.rojipeptides.com"
        target="_blank"
        rel="noopener noreferrer"
      >
        Roji Research Tools
      </a>{" "}
      &middot;{" "}
      <a
        href="https://rojipeptides.com/shop"
        target="_blank"
        rel="noopener noreferrer"
      >
        Shop Roji Peptides
      </a>
    </div>
  );
}

export function RojiWidgetApp() {
  const [toolData, setToolData] = useState<ToolData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const meta = window.openai?.toolResponseMetadata;
      const raw = meta?.["openai/data"];
      if (raw && typeof raw === "object" && "toolName" in (raw as object)) {
        setToolData(raw as ToolData);
      } else {
        setError("No tool data found. This widget is meant to be used inside ChatGPT.");
      }
    } catch {
      setError("Failed to read tool data.");
    }
  }, []);

  if (error) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <p style={{ color: "var(--roji-text-secondary)", fontSize: 14 }}>{error}</p>
        <a
          href="https://tools.rojipeptides.com"
          target="_blank"
          rel="noopener noreferrer"
          className="roji-btn"
          style={{ marginTop: 12, display: "inline-flex" }}
        >
          Open Roji Research Tools
        </a>
      </div>
    );
  }

  if (!toolData) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--roji-text-muted)" }}>
        Loading...
      </div>
    );
  }

  const Widget = TOOL_MAP[toolData.toolName];
  if (!Widget) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <p style={{ color: "var(--roji-text-secondary)", fontSize: 14 }}>
          Unknown tool: {toolData.toolName}
        </p>
        <a
          href="https://tools.rojipeptides.com"
          target="_blank"
          rel="noopener noreferrer"
          className="roji-btn"
          style={{ marginTop: 12, display: "inline-flex" }}
        >
          Try our full tools
        </a>
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
