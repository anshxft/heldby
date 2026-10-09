import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Public pages only; individual escrows are personal and noindex.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/app`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/app/new`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/app/wallet`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
