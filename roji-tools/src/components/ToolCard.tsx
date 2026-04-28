"use client";

import Link from "next/link";
import { useState } from "react";

import { ComingSoonModal } from "@/components/ComingSoonModal";
import { ToolIcon } from "@/components/ToolIcon";
import type { DirectoryTool } from "@/lib/directory";
import { track } from "@/lib/track";

interface ToolCardProps {
  tool: DirectoryTool;
}

/**
 * Tool card.
 *
 * - LIVE tools render as <Link> linking to the in-app tool route.
 * - "Coming soon" tools render as a button that opens an email-capture
 *   modal so we still convert the visit into a notification subscriber.
 *
 * Visual states (per spec):
 *   - 24px padding, 12px border-radius, faint border
 *   - Hover: stronger border + 2px translate-y lift
 *   - Soon variant: opacity-60
 *   - Status badge top-right
 *   - Lucide icon at 20px, indigo, stroke-width 1.5
 */
export function ToolCard({ tool }: ToolCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const isLive = tool.status === "live";

  const onSoonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setModalOpen(true);
    track("directory_card_click", { tool: tool.slug, status: "soon" });
  };

  const onLiveClick = () => {
    track("directory_card_click", { tool: tool.slug, status: "live" });
  };

  const inner = (
    <>
      <div className="flex items-start justify-between mb-4">
        <div className="h-10 w-10 rounded-roji border border-roji-border bg-roji-accent-subtle text-roji-accent flex items-center justify-center group-hover:border-roji-border-hover transition-colors">
          <ToolIcon name={tool.icon} />
        </div>
        <StatusBadge status={tool.status} />
      </div>
      <h3 className="text-base font-semibold text-roji-text leading-snug">
        {tool.name}
      </h3>
      <p className="mt-2 text-sm text-roji-muted leading-relaxed">
        {tool.description}
      </p>
      <div className="mt-5 text-[14px] font-medium text-roji-accent inline-flex items-center gap-1.5 group-hover:translate-x-0.5 transition-transform">
        {isLive ? "Use tool" : "Get notified"}
        <span aria-hidden="true">→</span>
      </div>
    </>
  );

  const baseClasses =
    "group block bg-roji-card border border-roji-border rounded-roji-lg p-6 cursor-pointer text-left " +
    "transition-[transform,border-color,opacity] duration-200 " +
    "hover:border-roji-border-hover hover:-translate-y-0.5";

  if (isLive) {
    return (
      <Link
        href={tool.href}
        onClick={onLiveClick}
        className={baseClasses}
        data-tool-slug={tool.slug}
        data-tool-status="live"
      >
        {inner}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={onSoonClick}
        className={`${baseClasses} opacity-60 hover:opacity-100 w-full`}
        data-tool-slug={tool.slug}
        data-tool-status="soon"
        aria-label={`${tool.name} — get notified when it launches`}
      >
        {inner}
      </button>
      {modalOpen && (
        <ComingSoonModal tool={tool} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}

function StatusBadge({ status }: { status: DirectoryTool["status"] }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-roji-success/10 px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider text-roji-success">
        <span
          className="h-1.5 w-1.5 rounded-full bg-roji-success"
          aria-hidden="true"
        />
        Live
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider text-roji-muted">
      Coming soon
    </span>
  );
}
