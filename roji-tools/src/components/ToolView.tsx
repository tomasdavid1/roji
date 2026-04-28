"use client";

import { useEffect } from "react";

import { track } from "@/lib/track";

/**
 * Drop into any tool page to fire `tool_view` exactly once on mount.
 * Distinct from GA4's automatic `page_view`: this is a tool-funnel-
 * specific event so we can build conversion paths in GA without the
 * directory page noise.
 */
export function ToolView({ slug }: { slug: string }) {
  useEffect(() => {
    track("tool_view", { tool: slug });
  }, [slug]);
  return null;
}
