import { Pause, Play } from "lucide-react";
import { Cover } from "@/components/player/cover";
import { prefetchTrack } from "@/lib/audio/loader";
import type { Track } from "@/lib/audiomack/types";
import { playCatalogItem } from "@/lib/play";
import { useCurrentTrack, usePlayer } from "@/lib/player-store";
import { cn } from "@/lib/utils";

export function AlbumCard({
  track,
  context,
  className,
}: {
  track: Track;
  context: Track[];
  className?: string;
}) {
  const current = useCurrentTrack();
  const playing = usePlayer((s) => s.playing);
  const active = current?.id === track.id;
  const isCurrent = active && playing;

  return (
    <button
      type="button"
      className={cn("group w-full min-w-0 text-left", className)}
      onMouseEnter={() => prefetchTrack(track.id)}
      onClick={() => void playCatalogItem(track, context)}
    >
      <div className="relative">
        <Cover src={track.image} alt={track.title} size="tile" />
        <span
          className={cn(
            "absolute right-2 bottom-2 grid size-11 place-items-center rounded-full bg-accent text-accent-fg shadow-border transition-[opacity,transform] duration-150 ease-[var(--ease-smooth-out)]",
            isCurrent
              ? "opacity-100"
              : "translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100",
          )}
        >
          {isCurrent ? (
            <Pause className="size-4 fill-current" />
          ) : (
            <Play className="ml-0.5 size-4 fill-current" />
          )}
        </span>
      </div>
      <p
        className={cn(
          "mt-2 truncate text-sm font-medium",
          active && "text-now",
        )}
      >
        {track.title}
      </p>
      <p className="truncate text-xs text-muted">{track.artist}</p>
    </button>
  );
}
