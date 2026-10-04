import { Heart, Play } from "lucide-react";
import { TrackRow } from "@/components/catalog/track-row";
import { Shelf } from "@/components/catalog/shelf";
import { Button } from "@/components/ui/button";
import { useCurrentTrack, usePlayer } from "@/lib/player-store";
import { transportPlayList } from "@/lib/transport";

export function Library() {
  const liked = usePlayer((s) => s.liked);
  const recents = usePlayer((s) => s.recents);
  const queue = usePlayer((s) => s.queue);
  const current = useCurrentTrack();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-9">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium tracking-[0.18em] text-muted uppercase">
            Your collection
          </p>
          <h1 className="mt-1 font-display text-[2.75rem] leading-[0.9] tracking-tight sm:text-6xl">
            Library
          </h1>
        </div>
        {liked.length > 0 ? (
          <Button variant="solid" onClick={() => transportPlayList(liked, 0)}>
            <Play className="ml-0.5 size-3.5 fill-current" />
            Play liked
          </Button>
        ) : null}
      </header>

      {recents.length > 0 ? (
        <Shelf title="Recently played" tracks={recents.slice(0, 16)} />
      ) : null}

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Heart className="size-4 text-now" />
          <h2 className="font-display text-2xl tracking-tight">Liked songs</h2>
        </div>
        {liked.length === 0 ? (
          <p className="rounded-2xl bg-surface px-4 py-8 text-sm text-muted">
            Heart a track while it plays. It lands here, on this device.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-surface/50 px-1 py-1">
            {liked.map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                context={liked}
                active={current?.id === track.id}
              />
            ))}
          </div>
        )}
      </section>

      {queue.length > 0 ? (
        <section>
          <h2 className="mb-3 font-display text-2xl tracking-tight">Up Next</h2>
          <div className="overflow-hidden rounded-2xl bg-surface/50 px-1 py-1">
            {queue.map((track, i) => (
              <TrackRow
                key={`${track.id}-${i}`}
                track={track}
                context={queue}
                active={current?.id === track.id}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
