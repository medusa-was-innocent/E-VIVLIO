import {
  ChevronDown,
  Heart,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Cover } from "@/components/player/cover";
import { LoadRing } from "@/components/player/spinner";
import { TrackRow } from "@/components/catalog/track-row";
import { Waveform } from "@/components/player/waveform";
import { Slider } from "@/components/ui/slider";
import { coverUrl } from "@/lib/cover";
import { currentAudioDuration, currentAudioTime } from "@/lib/playback";
import { useCurrentTrack, usePlayer } from "@/lib/player-store";
import {
  transportNext,
  transportPrev,
  transportRepeat,
  transportSeek,
  transportShuffle,
  transportToggle,
} from "@/lib/transport";
import { cn, formatClock } from "@/lib/utils";

export function NowPlaying() {
  const open = usePlayer((s) => s.nowOpen);
  const queueOpen = usePlayer((s) => s.queueOpen);
  const current = useCurrentTrack();
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const playing = usePlayer((s) => s.playing);
  const buffering = usePlayer((s) => s.buffering);
  const bufferProgress = usePlayer((s) => s.bufferProgress);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const liked = usePlayer((s) =>
    current ? s.liked.some((t) => t.id === current.id) : false,
  );
  const [progress, setProgress] = useState({ current: 0, duration: 0 });

  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const tick = () => {
      setProgress({
        current: currentAudioTime() || 0,
        duration: currentAudioDuration() || current?.duration || 0,
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, current?.id, current?.duration]);

  if (!open && !queueOpen) return null;

  const ratio = progress.duration > 0 ? progress.current / progress.duration : 0;

  if (queueOpen && !open) {
    return (
      <div className="fixed inset-0 z-40 flex items-end justify-center bg-bg/70 p-3 sm:items-center">
        <div className="flex max-h-[80dvh] w-full max-w-lg flex-col rounded-2xl bg-surface p-3 shadow-border">
          <div className="flex items-center justify-between px-2 py-2">
            <h2 className="font-display text-2xl tracking-tight">Up Next</h2>
            <button
              type="button"
              className="grid size-11 place-items-center rounded-full hover:bg-fg/8"
              onClick={() => usePlayer.getState().setQueueOpen(false)}
              aria-label="Close queue"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="overflow-y-auto">
            {queue.map((track, i) => (
              <TrackRow
                key={`${track.id}-${i}`}
                track={track}
                context={queue}
                active={i === index}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg">
      {current.image ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-40 blur-3xl"
          style={{
            backgroundImage: `url(${coverUrl(current.image, 400)})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-bg/70" />
      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full hover:bg-fg/8"
            onClick={() => usePlayer.getState().setNowOpen(false)}
            aria-label="Close now playing"
          >
            <ChevronDown className="size-6" />
          </button>
          <p className="text-[11px] font-medium tracking-[0.18em] text-muted uppercase">
            Now Playing
          </p>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full hover:bg-fg/8"
            onClick={() => usePlayer.getState().toggleLiked(current)}
            aria-label={liked ? "Unlike" : "Like"}
          >
            <Heart className={cn("size-5", liked && "fill-now text-now")} />
          </button>
        </div>

        <div className="mx-auto mt-6 w-full max-w-sm">
          <Cover src={current.image} alt={current.title} size="hero" />
        </div>

        <div className="mt-8 min-w-0">
          <h1 className="font-display text-4xl leading-none tracking-tight">
            {current.title}
          </h1>
          <p className="mt-2 truncate text-muted">
            {current.artist}
            {current.album ? ` · ${current.album}` : ""}
          </p>
        </div>

        <div className="mt-6">
          <Waveform
            data={current.waveform}
            progress={ratio}
            onSeek={(value) => {
              if (!progress.duration) return;
              transportSeek(value * progress.duration);
            }}
            className="h-10 max-h-10"
          />
          <div className="mt-2 flex justify-between text-xs tabular-nums text-subtle">
            <span>{formatClock(progress.current)}</span>
            <span>
              {buffering && !playing ? "Loading" : formatClock(progress.duration || current.duration)}
            </span>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 sm:gap-3">
          <button
            type="button"
            className={cn(
              "grid size-12 place-items-center rounded-full text-muted",
              shuffle && "text-fg",
            )}
            aria-label="Shuffle"
            onClick={() => transportShuffle()}
          >
            <Shuffle className="size-5" />
          </button>
          <button
            type="button"
            className="grid size-12 place-items-center rounded-full"
            aria-label="Previous"
            onClick={() => transportPrev()}
          >
            <SkipBack className="size-7 fill-current" />
          </button>
          <button
            type="button"
            className="grid size-16 place-items-center rounded-full bg-accent text-accent-fg transition-transform duration-150 active:scale-[0.96]"
            aria-label={playing ? "Pause" : "Play"}
            onClick={() => transportToggle()}
          >
            {buffering && !playing ? (
              <LoadRing progress={bufferProgress} className="size-6 text-accent-fg" />
            ) : playing ? (
              <Pause className="size-7 fill-current" />
            ) : (
              <Play className="ml-1 size-7 fill-current" />
            )}
          </button>
          <button
            type="button"
            className="grid size-12 place-items-center rounded-full"
            aria-label="Next"
            onClick={() => transportNext()}
          >
            <SkipForward className="size-7 fill-current" />
          </button>
          <button
            type="button"
            className={cn(
              "grid size-12 place-items-center rounded-full text-muted",
              repeat !== "off" && "text-fg",
            )}
            aria-label="Repeat"
            onClick={() => transportRepeat()}
          >
            {repeat === "one" ? (
              <Repeat1 className="size-5" />
            ) : (
              <Repeat className="size-5" />
            )}
          </button>
        </div>

        <div className="mt-8 flex items-center gap-3">
          <span className="text-xs text-subtle">Vol</span>
          <Slider
            className="flex-1"
            max={1}
            step={0.01}
            value={[muted ? 0 : volume]}
            onValueChange={([v]) => usePlayer.getState().setVolume(v ?? 0)}
          />
        </div>
      </div>
    </div>
  );
}
