import type { MetadataRoute } from "next";

/**
 * robots.txt served at /robots.txt.
 *
 * Mirror of the sitemap policy: index everything, point bots at the
 * sitemap. We keep API routes off-index since they only return JSON
 * and aren't meaningful as search results.
 */

const SITE_URL = "https://tools.rojipeptides.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
