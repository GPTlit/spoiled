import { createFileRoute } from "@tanstack/react-router";

async function run(request: Request) {
  const secret = process.env["CRON_SECRET"];
  const provided =
    request.headers.get("x-cron-secret") ?? new URL(request.url).searchParams.get("secret");
  if (!secret || provided !== secret) return new Response("Unauthorized", { status: 401 });

  const { growLibrary } = await import("@/lib/catalog-sync.server");
  try {
    const result = await growLibrary(4);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/public/cron/grow-library")({
  server: {
    handlers: {
      GET: async ({ request }) => run(request),
      POST: async ({ request }) => run(request),
    },
  },
});
