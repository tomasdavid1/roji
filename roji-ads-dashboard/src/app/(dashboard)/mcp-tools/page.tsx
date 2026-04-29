"use client";

import { useCallback, useEffect, useState } from "react";
import { MetricCard } from "@/components/MetricCard";

interface ToolStats {
  calls: number;
  errors: number;
  avgMs: number;
}

interface PlatformStats {
  calls: number;
  sessions: number;
}

interface RecentEvent {
  timestamp: string;
  toolName: string;
  sessionId?: string;
  platform?: string;
  argsSummary: Record<string, unknown>;
  durationMs: number;
  hasWidget: boolean;
  error?: string;
}

interface AnalyticsData {
  server: {
    upSince: string;
    totalCalls: number;
    totalErrors: number;
    uniqueSessions: number;
    multiToolSessions: number;
    avgToolsPerSession: number;
    last24h: number;
    lastHour: number;
    eventsBuffered: number;
  };
  byTool: Record<string, ToolStats>;
  byPlatform?: Record<string, PlatformStats>;
  recentEvents: RecentEvent[];
}

function fmtInt(n: number) {
  return n.toLocaleString();
}

function fmtMs(ms: number) {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}

const TOOL_DISPLAY: Record<string, string> = {
  reconstitution_calculator: "Reconstitution",
  half_life_lookup: "Half-Life",
  coa_analyzer: "COA Analyzer",
  cost_per_dose: "Cost/Dose",
  recomp_calculator: "Body Recomp",
  supplement_interactions: "Interactions",
  pubmed_search: "PubMed",
};

const PLATFORM_DISPLAY: Record<string, { label: string; color: string }> = {
  chatgpt: { label: "ChatGPT", color: "bg-emerald-500" },
  claude: { label: "Claude", color: "bg-orange-400" },
  cursor: { label: "Cursor", color: "bg-blue-400" },
  gemini: { label: "Gemini", color: "bg-purple-400" },
  grok: { label: "Grok", color: "bg-red-400" },
  unknown: { label: "Other", color: "bg-roji-dim" },
};

export default function McpToolsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const resp = await fetch("/api/mcp-analytics?limit=50");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-roji-muted text-sm">Loading MCP analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <header className="mb-8">
          <h1 className="text-2xl font-semibold">MCP Tools</h1>
          <p className="text-roji-muted text-sm mt-1">
            ChatGPT &middot; Claude &middot; Cursor
          </p>
        </header>
        <div className="roji-card border-roji-danger/20 bg-roji-danger/[0.03]">
          <strong className="text-roji-danger block mb-1 text-sm font-mono uppercase tracking-widest">
            Connection error
          </strong>
          <p className="text-sm text-roji-muted">{error}</p>
          <p className="text-xs text-roji-dim mt-2">
            Ensure <code>MCP_ANALYTICS_URL</code> is set and the MCP server is
            running at mcp.rojipeptides.com.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { server, byTool, byPlatform, recentEvents } = data;
  const toolEntries = Object.entries(byTool).sort((a, b) => b[1].calls - a[1].calls);
  const platformEntries = Object.entries(byPlatform ?? {}).sort((a, b) => b[1].calls - a[1].calls);
  const errorRate = server.totalCalls > 0
    ? ((server.totalErrors / server.totalCalls) * 100).toFixed(1)
    : "0";
  const engagementRate = server.uniqueSessions > 0
    ? ((server.multiToolSessions / server.uniqueSessions) * 100).toFixed(0)
    : "0";

  return (
    <div>
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">MCP Tools</h1>
            <p className="text-roji-muted text-sm mt-1">
              ChatGPT &middot; Claude &middot; Cursor &middot; Conversion analytics
            </p>
          </div>
          <button
            onClick={fetchData}
            className="text-xs text-roji-muted hover:text-roji-text px-3 py-1.5 rounded-roji border border-roji-border transition-colors"
          >
            Refresh
          </button>
        </div>
      </header>

      {/* Primary metrics */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Total calls" value={fmtInt(server.totalCalls)} />
        <MetricCard label="Sessions" value={fmtInt(server.uniqueSessions)} />
        <MetricCard
          label="Engagement"
          value={`${engagementRate}%`}
          hint={`${server.multiToolSessions} multi-tool sessions`}
        />
        <MetricCard
          label="Avg tools/session"
          value={String(server.avgToolsPerSession)}
        />
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <MetricCard label="Last hour" value={fmtInt(server.lastHour)} />
        <MetricCard label="Last 24h" value={fmtInt(server.last24h)} />
        <MetricCard label="Error rate" value={`${errorRate}%`} hint={`${server.totalErrors} errors`} />
        <MetricCard label="Events buffered" value={fmtInt(server.eventsBuffered)} />
      </section>

      {/* Platform breakdown */}
      {platformEntries.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-mono uppercase tracking-widest text-roji-muted mb-3">
            By platform
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {platformEntries.map(([platform, stats]) => {
              const display = PLATFORM_DISPLAY[platform] ?? PLATFORM_DISPLAY.unknown;
              return (
                <div key={platform} className="roji-card flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${display.color} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-roji-text">{display.label}</div>
                    <div className="text-xs text-roji-muted">
                      {fmtInt(stats.calls)} calls &middot; {fmtInt(stats.sessions)} sessions
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono text-roji-text">
                      {server.totalCalls > 0
                        ? `${((stats.calls / server.totalCalls) * 100).toFixed(0)}%`
                        : "—"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Per-tool breakdown */}
      <section className="mb-10">
        <h2 className="text-sm font-mono uppercase tracking-widest text-roji-muted mb-3">
          Per tool
        </h2>
        <div className="roji-card !p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-mono uppercase tracking-widest text-roji-dim border-b border-roji-border">
                <th className="px-4 py-3">Tool</th>
                <th className="px-4 py-3 text-right">Calls</th>
                <th className="px-4 py-3 text-right">Errors</th>
                <th className="px-4 py-3 text-right">Avg latency</th>
                <th className="px-4 py-3 text-right">Share</th>
              </tr>
            </thead>
            <tbody>
              {toolEntries.map(([name, stats]) => (
                <tr key={name} className="border-b border-roji-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="text-roji-text">{TOOL_DISPLAY[name] ?? name}</div>
                    <div className="text-[10px] font-mono text-roji-dim mt-0.5">{name}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-roji-text">
                    {fmtInt(stats.calls)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-roji-muted">
                    {stats.errors > 0 ? (
                      <span className="text-roji-danger">{stats.errors}</span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-roji-muted">
                    {fmtMs(stats.avgMs)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-roji-muted">
                    {server.totalCalls > 0
                      ? `${((stats.calls / server.totalCalls) * 100).toFixed(0)}%`
                      : "—"}
                  </td>
                </tr>
              ))}
              {toolEntries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-roji-muted text-sm">
                    No tool calls recorded yet. Waiting for first ChatGPT/Claude interaction...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent activity */}
      <section>
        <h2 className="text-sm font-mono uppercase tracking-widest text-roji-muted mb-3">
          Recent activity
        </h2>
        <div className="roji-card !p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-mono uppercase tracking-widest text-roji-dim border-b border-roji-border">
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Platform</th>
                <th className="px-4 py-3">Tool</th>
                <th className="px-4 py-3">Args</th>
                <th className="px-4 py-3 text-right">Time</th>
                <th className="px-4 py-3 text-center">Widget</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((e, i) => {
                const platformInfo = PLATFORM_DISPLAY[e.platform ?? "unknown"] ?? PLATFORM_DISPLAY.unknown;
                return (
                  <tr key={i} className="border-b border-roji-border last:border-0">
                    <td className="px-4 py-2 text-roji-dim text-xs font-mono whitespace-nowrap">
                      {relativeTime(e.timestamp)}
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className={`w-1.5 h-1.5 rounded-full ${platformInfo.color}`} />
                        {platformInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-roji-text">
                      {TOOL_DISPLAY[e.toolName] ?? e.toolName}
                    </td>
                    <td className="px-4 py-2 text-roji-muted text-xs font-mono max-w-[200px] truncate">
                      {Object.entries(e.argsSummary)
                        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
                        .join(", ")}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-roji-muted">
                      {fmtMs(e.durationMs)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {e.hasWidget ? (
                        <span className="inline-block w-2 h-2 rounded-full bg-roji-success" title="Widget rendered" />
                      ) : (
                        <span className="inline-block w-2 h-2 rounded-full bg-roji-dim" title="Text only" />
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {e.error ? (
                        <span className="text-xs text-roji-danger" title={e.error}>Error</span>
                      ) : (
                        <span className="text-xs text-roji-success">OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {recentEvents.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-roji-muted text-sm">
                    No recent activity. Tool calls will appear here in real-time.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="mt-6 text-xs text-roji-dim">
        Server up since {new Date(server.upSince).toLocaleString()} &middot;{" "}
        {server.eventsBuffered} events buffered &middot; Auto-refreshes every 30s
        &middot; UTM attribution: <code className="text-roji-muted">?utm_source=mcp&utm_medium=ai</code>
      </footer>
    </div>
  );
}
