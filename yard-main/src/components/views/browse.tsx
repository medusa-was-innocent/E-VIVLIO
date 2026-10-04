import { AlbumCard } from "@/components/catalog/album-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { useCatalog } from "@/components/catalog/use-catalog";
import { GENRES } from "@/lib/audiomack/types";
import { useCurrentTrack, usePlayer } from "@/lib/player-store";
import { cn } from "@/lib/utils";

export function Browse({ catalog }: { catalog: ReturnType<typeof useCatalog> }) {
  const { genre, setGenre, kind, setKind, tracks, loading, error } = catalog;
  const current = useCurrentTrack();
  const playing = usePlayer((s) => s.playing);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7">
      <header>
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted uppercase">
          Catalog
        </p>
        <h1 className="mt-1 font-display text-[2.75rem] leading-[0.9] tracking-tight sm:text-6xl">
          Browse
        </h1>
      </header>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
        {GENRES.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setGenre(g.id)}
            className={cn(
              "h-10 shrink-0 rounded-full px-4 text-sm transition-colors duration-150",
              genre === g.id
                ? "bg-accent text-accent-fg"
                : "bg-surface text-muted hover:text-fg",
            )}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="flex gap-1">
        {(
          [
            ["charts", "Top charts"],
            ["trending", "Trending"],
            ["fresh", "New"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setKind(id)}
            className={cn(
              "h-10 rounded-full px-4 text-sm",
              kind === id ? "bg-surface text-fg" : "text-muted hover:text-fg",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-2xl bg-surface px-4 py-6 text-sm text-muted">
          Couldn’t reach the catalog.
        </p>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-square w-full rounded-xl" />
              <Skeleton className="mt-2 h-3 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {tracks.map((track) => (
            <AlbumCard
              key={track.id}
              track={track}
              context={tracks}
              className={current?.id === track.id && playing ? "text-now" : ""}
            />
          ))}
        </div>
      )}
    </div>
  );
}
