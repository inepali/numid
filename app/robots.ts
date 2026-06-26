import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard/",
        "/admin/",
        "/auth/",
        "/forgot-password/",
      ],
    },
    sitemap: "https://numid.dev/sitemap.xml",
  };
}
