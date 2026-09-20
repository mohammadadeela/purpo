import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap { const base = process.env.APP_URL ?? "http://localhost:3000"; return [{ url: base, changeFrequency: "weekly", priority: 1 }, { url: `${base}/login`, changeFrequency: "monthly", priority: .2 }, { url: `${base}/signup`, changeFrequency: "monthly", priority: .5 }]; }
