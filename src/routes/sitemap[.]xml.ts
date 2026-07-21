import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries = [
          { path: "/", priority: "1.0", changefreq: "weekly" },
          { path: "/discover", priority: "0.8", changefreq: "daily" },
          { path: "/universes", priority: "0.7", changefreq: "weekly" },
          { path: "/auth", priority: "0.4", changefreq: "monthly" },
        ];
        const urls = entries
          .map(
            (e) =>
              `  <url><loc>${BASE_URL}${e.path}</loc><priority>${e.priority}</priority><changefreq>${e.changefreq}</changefreq></url>`,
          )
          .join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
