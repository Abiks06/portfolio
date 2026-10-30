import type { MetadataRoute } from "next";
import { TRACKS } from "@/lib/resume";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/cv`, changeFrequency: "monthly", priority: 0.6 },
    ...TRACKS.map((t) => ({ url: `${SITE_URL}/cv/${t.id}`, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
