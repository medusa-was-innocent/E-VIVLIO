import { Search, X } from "lucide-react";
import { TrackRow } from "@/components/catalog/track-row";
import { AlbumCard } from "@/components/catalog/album-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { useCatalog } from "@/components/catalog/use-catalog";
import { useCurrentTrack } from "@/lib/player-store";

export function SearchView({
  catalog,
}: {
  catalog: ReturnType<typeof useCatalog>;
}) {
  const { query, setQuery, searching, tracks, loading, error, results, suggestions } = catalog;
  const current = useCurrentTrack();
  const albums = tracks.filter((t) => t.type !== "song");
  const songs = tracks.filter((t) => t.type === "song");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header>
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted uppercase">
          Catalog
        </p>
        <h1 className="mt-1 font-display text-[2.75rem] leading-[0.9] tracking-tight sm:text-6xl">
          Search
        </h1>
      </header>

      <form
        className="flex h-12 items-center gap-3 rounded-full bg-surface px-4 shadow-border"
        onSubmit={(e) => e.preventDefault()}
      >
        <Search className="size-4 shrink-0 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Artists, songs, albums, or an Audiomack link"
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
          autoComplete="off"
          spellCheck={false}
          autoFocus
        />
        {query ? (
          <button
            type="button"
            className="grid size-9 place-items-center rounded-full hover:bg-fg/8"
            onClick={() => setQuery("")}
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </form>

      {!searching && suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((hint) => (
            <button
              key={hint}
              type="button"
              onClick={() => setQuery(hint)}
              className="h-9 rounded-full bg-surface px-3 text-sm text-muted hover:text-fg"
            >
              {hint}
            </button>
          ))}
        </div>
      ) : null}

      {!searching ? (
        <p className="text-sm text-muted">
          Search the live Audiomack catalog, or paste a song URL.
        </p>
      ) : null}

      {searching && (
        <h2 className="font-display text-2xl tracking-tight">
          Results for “{query.trim()}”
        </h2>
      )}

      {error ? (
        <p className="rounded-2xl bg-surface px-4 py-6 text-sm text-muted">
          Search didn’t go through. Try again in a moment.
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-2">
              <Skeleton className="size-12 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-2/5" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {searching && !loading && tracks.length === 0 && !error ? (
        <p className="rounded-2xl bg-surface px-4 py-10 text-center text-sm text-muted">
          No matches. Try another name, or paste a full Audiomack song URL.
        </p>
      ) : null}

      {searching && albums.length > 0 ? (
        <section>
          <h3 className="mb-3 font-display text-xl tracking-tight">Albums</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {albums.slice(0, 8).map((track) => (
              <AlbumCard key={track.id} track={track} context={tracks} />
            ))}
          </div>
        </section>
      ) : null}

      {searching && songs.length > 0 ? (
        <section>
          <h3 className="mb-3 font-display text-xl tracking-tight">Songs</h3>
          <div className="overflow-hidden rounded-2xl bg-surface/50 px-1 py-1">
            {(songs.length ? songs : tracks).map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                context={songs.length ? songs : tracks}
                active={current?.id === track.id}
              />
            ))}
          </div>
        </section>
      ) : null}

      {searching && results.isFetching ? (
        <p className="text-xs text-subtle">Updating…</p>
      ) : null}
    </div>
  );
}
