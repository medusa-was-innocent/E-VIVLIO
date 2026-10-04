import type { ReactNode } from "react";
import { Play } from "lucide-react";
import { AlbumCard } from "@/components/catalog/album-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Track } from "@/lib/audiomack/types";
import { transportPlayList } from "@/lib/transport";

export function Shelf({
  title,
  tracks,
  loading,
  action,
}: {
  title: string;
  tracks: Track[];
  loading?: boolean;
  action?: ReactNode;
}) {
  if (!loading && tracks.length === 0) return null;
  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="font-display text-2xl tracking-tight sm:text-3xl">{title}</h2>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          {tracks.length > 1 ? (
            <button
              type="button"
              className="flex h-10 items-center gap-1.5 rounded-full bg-surface px-3 text-sm text-fg transition-colors duration-150 hover:bg-surface-2"
              onClick={() => transportPlayList(tracks, 0)}
            >
              <Play className="ml-0.5 size-3.5 fill-current" />
              Play
            </button>
          ) : null}
        </div>
      </div>
      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 scrollbar-none">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="w-36 shrink-0 sm:w-40">
                <Skeleton className="aspect-square w-full rounded-xl" />
                <Skeleton className="mt-2 h-3 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </div>
            ))
          : tracks.map((track) => (
              <AlbumCard
                key={track.id}
                track={track}
                context={tracks}
                className="w-36 shrink-0 sm:w-40"
              />
            ))}
      </div>
    </section>
  );
}
