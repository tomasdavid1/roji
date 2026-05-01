"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/funnel", label: "Funnel" },
  { href: "/performance", label: "Performance" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/keywords", label: "Keywords" },
  { href: "/search-terms", label: "Search terms" },
  { href: "/disapprovals", label: "Disapprovals" },
  { href: "/tracking", label: "Tracking" },
  { href: "/subscriptions", label: "Subscriptions" },
  { href: "/affiliates", label: "Affiliates" },
  { href: "/mcp-tools", label: "MCP Tools" },
];

export type NavMode = "mock" | "test" | "live";

export function Nav({ mode }: { mode: NavMode }) {
  const pathname = usePathname();
  return (
    <nav className="border-b border-roji-border bg-roji-darker">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/funnel" className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-roji-accent">
              Roji
            </span>
            <span className="text-roji-dim">·</span>
            <span className="font-mono text-xs uppercase tracking-widest text-roji-muted">
              Ads
            </span>
          </Link>
          <ul className="flex items-center gap-1">
            {LINKS.map((l) => {
              const active = pathname === l.href;
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={[
                      "px-3 py-1.5 rounded-roji text-sm transition-colors",
                      active
                        ? "bg-white/[0.04] text-roji-text"
                        : "text-roji-muted hover:text-roji-text",
                    ].join(" ")}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={
              mode === "live"
                ? "roji-pill-success"
                : mode === "test"
                  ? "roji-pill-warning"
                  : "roji-pill-muted"
            }
            title={
              mode === "test"
                ? "Developer token in TEST mode — apply for Basic Access"
                : mode === "mock"
                  ? "Missing Google Ads credentials — using mock data"
                  : "Connected to Google Ads API"
            }
          >
            {mode === "live"
              ? "Live API"
              : mode === "test"
                ? "Test mode"
                : "Mock data"}
          </span>
        </div>
      </div>
    </nav>
  );
}
