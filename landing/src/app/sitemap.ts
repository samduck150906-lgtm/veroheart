import type { MetadataRoute } from "next";

const SITE_URL = "https://veroro.life";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/terms", "/privacy", "/refund"];
  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
  }));
}
