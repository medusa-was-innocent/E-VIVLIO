import { createFileRoute } from "@tanstack/react-router";
import { YardApp } from "@/components/yard-app";
import { getChart } from "@/lib/audiomack/fn";
import type { Track } from "@/lib/audiomack/types";

async function loadChart(): Promise<Track[] | undefined> {
  if (import.meta.env.BASE_URL === "/yard/") return undefined;
  try {
    return await Promise.race([
      getChart({ data: { genre: "all" } }),
      new Promise<Track[]>((_, reject) =>
        setTimeout(() => reject(new Error("catalog timeout")), 1800),
      ),
    ]);
  } catch {
    return [];
  }
}

export const Route = createFileRoute("/")({
  loader: loadChart,
  component: Home,
});

function Home() {
  const initialChart = Route.useLoaderData();
  return <YardApp initialChart={initialChart} />;
}
