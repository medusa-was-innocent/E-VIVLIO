import { Play, Shuffle } from "lucide-react";
import { Cover } from "@/components/player/cover";
import { Shelf } from "@/components/catalog/shelf";
import { TrackRow } from "@/components/catalog/track-row";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { useCatalog } from "@/components/catalog/use-catalog";
import { useCurrentTrack, usePlayer } from "@/lib/player-store";
import { transportPlayList } from "@/lib/transport";
import { formatPlays } from "@/lib/utils";
import { useMemo } from "react";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function ListenNow({
  catalog,
}: {
  catalog: ReturnType<typeof useCatalog>;
}) {
  const { chart, trending, tracks, hero, loading, error } = catalog;
  const recents = usePlayer((s) => s.recents);
  const current = useCurrentTrack();
  const playing = usePlayer((s) => s.playing);
  const chartTracks = chart.data ?? tracks;
  const heroOn = hero && current?.id === hero.id && playing;

  const madeForYou = useMemo(() => {
    const pool = [...(trending.data ?? []), ...chartTracks];
    const seen = new Set<number>();
    const out = [];
    for (const track of pool) {
      if (seen.has(track.id) || track.id === hero?.id) continue;
      seen.add(track.id);
      out.push(track);
    }
    return out.slice(0, 14);
  }, [trending.data, chartTracks, hero?.id]);

  return (
    <div className="stagger-in mx-auto w-full max-w-6xl space-y-9">
      <header className="flex flex-col gap-1">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted uppercase">
          {greeting()}
        </p>
        <h1 className="font-display text-[2.75rem] leading-[0.9] tracking-tight sm:text-6xl">
          Listen Now
        </h1>
      </header>

      {error && !hero ? (
        <p className="rounded-2xl bg-surface px-4 py-6 text-sm text-muted">
          Couldn’t reach the catalog. Check your connection and try again.
        </p>
      ) : null}

      {loading && !hero ? (
        <div className="grid gap-5 rounded-3xl bg-surface p-3 sm:grid-cols-[minmax(0,240px)_1fr] sm:p-4 lg:grid-cols-[minmax(0,280px)_1fr]">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="space-y-3 py-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      ) : null}

      {hero ? (
        <section className="grid items-end gap-5 rounded-3xl bg-surface p-3 sm:grid-cols-[minmax(0,220px)_1fr] sm:p-4 lg:grid-cols-[minmax(0,260px)_1fr] lg:p-5">
          <Cover src={hero.image} alt={hero.title} size="hero" />
          <div className="flex min-w-0 flex-col justify-end gap-4 px-1 pb-1 sm:py-1">
            <p className="text-[11px] font-medium tracking-[0.16em] text-muted uppercase">
              Top pick · This week
            </p>
            <div className="min-w-0">
              <h2 className="font-display text-3xl leading-[0.95] tracking-tight sm:text-5xl">
                {hero.title}
              </h2>
              <p className="mt-2 truncate text-muted">
                {hero.artist}
                {hero.plays ? ` · ${formatPlays(hero.plays)} plays` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="solid"
                size="lg"
                onClick={() => transportPlayList(chartTracks, 0)}
              >
                <Play className="ml-0.5 size-4 fill-current" />
                {heroOn ? "Playing" : "Play"}
              </Button>
              <Button
                variant="quiet"
                size="lg"
                onClick={() => {
                  usePlayer.getState().toggleShuffle();
                  transportPlayList(chartTracks, 0);
                }}
              >
                <Shuffle className="size-4" />
                Shuffle
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {recents.length > 0 ? (
        <Shelf title="Recently played" tracks={recents.slice(0, 16)} />
      ) : null}

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
            Top songs
          </h2>
        </div>
        <div className="overflow-hidden rounded-2xl bg-surface/60 px-1 py-1">
          {(hero ? chartTracks.slice(1, 9) : chartTracks.slice(0, 8)).map(
            (track, i) => (
              <TrackRow
                key={track.id}
                track={track}
                context={chartTracks}
                rank={i + (hero ? 2 : 1)}
                active={current?.id === track.id}
              />
            ),
          )}
        </div>
      </section>

      <Shelf title="Made for You" tracks={madeForYou} loading={trending.isLoading && !madeForYou.length} />
      <Shelf title="Trending" tracks={trending.data ?? []} loading={trending.isLoading} />
    </div>
  );
}
