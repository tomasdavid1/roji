import type { MetadataRoute } from "next";

import { DIRECTORY_TOOLS } from "@/lib/directory";

/**
 * XML sitemap served at /sitemap.xml.
 *
 * Combines:
 *   1. The home / directory page.
 *   2. Every entry in DIRECTORY_TOOLS — the canonical, compliance-
 *      reviewed catalog of tools (live AND soon, since the "soon"
 *      pages are still real routes that should be crawlable for
 *      the email-capture funnel).
 *   3. A short list of static aux routes (privacy, terms, etc.) if
 *      they exist in `app/`.
 *
 * Update strategy: we don't model per-tool changefreq granularly —
 * tools rarely change in shape, so weekly/monthly hints are good
 * enough. Add ad-hoc entries here when launching a new top-level
 * route that isn't in DIRECTORY_TOOLS.
 */

const SITE_URL = "https://tools.rojipeptides.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const homeEntry: MetadataRoute.Sitemap[number] = {
    url: `${SITE_URL}/`,
    lastModified,
    changeFrequency: "weekly",
    priority: 1.0,
  };

  const toolEntries: MetadataRoute.Sitemap = DIRECTORY_TOOLS.map((tool) => ({
    url: `${SITE_URL}${tool.href}`,
    lastModified,
    changeFrequency: tool.status === "live" ? "weekly" : "monthly",
    priority: tool.status === "live" ? 0.8 : 0.4,
  }));

  /**
   * Routes that exist on disk but aren't part of the directory grid.
   * Kept manual + small so this file remains the single source of
   * truth for "what's in the public sitemap".
   */
  const auxEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/ai`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/interactions`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];

  return [homeEntry, ...toolEntries, ...auxEntries];
}
