import { createFileRoute } from "@tanstack/react-router";

function bad(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function handle({ request }: { request: Request }) {
  const id = Number(new URL(request.url).pathname.split("/").pop());
  if (!Number.isInteger(id) || id <= 0) return bad("invalid id");

  const { fetchStreamUrl } = await import("@/lib/audiomack/client.server");
  try {
    const url = await fetchStreamUrl(id);
    const range = request.headers.get("range");
    const upstream = await fetch(url, {
      headers: {
        "User-Agent": "YARD/2.0",
        ...(range ? { Range: range } : {}),
      },
    });
    if (!upstream.ok && upstream.status !== 206) {
      return bad("upstream failed", 502);
    }
    if (!upstream.body) return bad("upstream failed", 502);
    const type = upstream.headers.get("content-type") || "audio/mpeg";
    const headers = new Headers({
      "content-type": type,
      "cache-control": "private, max-age=300",
      "x-content-type-options": "nosniff",
      "accept-ranges": "bytes",
    });
    const length = upstream.headers.get("content-length");
    const contentRange = upstream.headers.get("content-range");
    if (length) headers.set("content-length", length);
    if (contentRange) headers.set("content-range", contentRange);
    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "stream failed";
    return bad(message, 502);
  }
}

export const Route = createFileRoute("/api/stream/$id")({
  server: { handlers: { GET: handle } },
});
