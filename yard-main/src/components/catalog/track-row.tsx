import { Heart, Pause, Play } from "lucide-react";
import { Cover } from "@/components/player/cover";
import { prefetchTrack } from "@/lib/audio/loader";
import { cn, formatClock, formatPlays } from "@/lib/utils";
import type { Track } from "@/lib/audiomack/types";
import { playCatalogItem } from "@/lib/play";
import { usePlayer } from "@/lib/player-store";

export function TrackRow({
  track,
  context,
  rank,
  active,
}: {
  track: Track;
  context: Track[];
  rank?: number;
  active?: boolean;
}) {
  const playing = usePlayer((s) => s.playing);
  const buffering = usePlayer((s) => s.buffering);
  const liked = usePlayer((s) => s.liked.some((t) => t.id === track.id));
  const toggleLiked = usePlayer((s) => s.toggleLiked);
  const isCurrent = Boolean(active && playing);
  const isArmed = Boolean(active);

  const onPlay = () => {
    void playCatalogItem(track, context);
  };

  return (
    <div
      className={cn(
        "group grid min-h-14 items-center gap-3 rounded-xl px-2 py-1.5 transition-colors duration-150",
        typeof rank === "number"
          ? "grid-cols-[1.75rem_2.75rem_minmax(0,1fr)_auto]"
          : "grid-cols-[2.75rem_minmax(0,1fr)_auto]",
        "hover:bg-fg/5",
        isArmed && "bg-fg/6",
      )}
      onMouseEnter={() => prefetchTrack(track.id)}
    >
      {typeof rank === "number" ? (
        <span
          className={cn(
            "text-center font-display text-sm tabular-nums",
            isArmed ? "text-now" : "text-subtle",
          )}
        >
          {String(rank).padStart(2, "0")}
        </span>
      ) : null}
      <button
        type="button"
        onClick={onPlay}
        className="relative size-11"
        aria-label={isCurrent ? `Pause ${track.title}` : `Play ${track.title}`}
      >
        <Cover src={track.image} alt="" size="xs" className="size-11" />
        <span className="absolute inset-0 grid place-items-center rounded-md bg-bg/55 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          {isCurrent ? (
            <Pause className="size-4 fill-accent text-accent" />
          ) : (
            <Play className="ml-0.5 size-4 fill-accent text-accent" />
          )}
        </span>
      </button>
      <button type="button" className="min-w-0 text-left" onClick={onPlay}>
        <p
          className={cn(
            "truncate text-sm font-medium",
            isArmed && "text-now",
          )}
        >
          {track.title}
          {track.explicit ? (
            <span
              aria-hidden
              className="ml-1.5 inline-block align-middle text-[10px] font-semibold tracking-wide text-subtle"
            >
              E
            </span>
          ) : null}
          {isArmed && buffering ? (
            <span className="ml-2 text-xs font-normal text-muted">Loading</span>
          ) : null}
        </p>
        <p className="truncate text-xs text-muted">
          {track.type !== "song" ? `${track.type} · ` : ""}
          {track.artist}
          {track.featuring ? ` · ${track.featuring}` : ""}
        </p>
      </button>
      <div className="flex items-center gap-1 text-subtle">
        {track.plays ? (
          <span className="hidden w-12 truncate text-right tabular-nums text-xs md:inline">
            {formatPlays(track.plays)}
          </span>
        ) : null}
        <span className="hidden w-10 text-right tabular-nums text-xs sm:inline">
          {track.duration ? formatClock(track.duration) : ""}
        </span>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-full hover:bg-fg/8"
          aria-label={liked ? "Remove from liked" : "Save to liked"}
          onClick={(e) => {
            e.stopPropagation();
            toggleLiked(track);
          }}
        >
          <Heart
            className={cn(
              "size-4",
              liked ? "fill-now text-now" : "text-muted",
            )}
          />
        </button>
      </div>
    </div>
  );
}
