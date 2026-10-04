import type { ReactNode } from "react";
import {
  Heart,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ChevronUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Cover } from "@/components/player/cover";
import { LoadRing } from "@/components/player/spinner";
import { Slider } from "@/components/ui/slider";
import { cn, formatClock } from "@/lib/utils";
import { useCurrentTrack, usePlayer } from "@/lib/player-store";
import { useRoom } from "@/lib/room/store";
import { currentAudioDuration, currentAudioTime } from "@/lib/playback";
import {
  transportNext,
  transportPrev,
  transportRepeat,
  transportSeek,
  transportShuffle,
  transportToggle,
} from "@/lib/transport";

export function PlayerDock() {
  const current = useCurrentTrack();
  const playing = usePlayer((s) => s.playing);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const error = usePlayer((s) => s.error);
  const buffering = usePlayer((s) => s.buffering);
  const bufferProgress = usePlayer((s) => s.bufferProgress);
  const liked = usePlayer((s) =>
    current ? s.liked.some((t) => t.id === current.id) : false,
  );
  const roomOn = useRoom((s) => s.active);
  const roomSynced = useRoom((s) => s.synced);
  const roomCode = useRoom((s) => s.code);
  const roomBuffering = useRoom((s) => s.buffering);
  const queueOpen = usePlayer((s) => s.queueOpen);
  const [progress, setProgress] = useState({ current: 0, duration: 0 });

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const duration = currentAudioDuration() || current?.duration || 0;
      setProgress({
        current: currentAudioTime() || 0,
        duration,
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [current?.id, current?.duration]);

  if (!current) {
    return (
      <div className="page-pad pb-2">
        <div className="rounded-2xl bg-surface px-4 py-3 text-sm text-muted shadow-border">
          {roomOn
            ? "Pick a track. YARD loads the file first, then every device hits play together."
            : "Pick a track to start listening."}
        </div>
      </div>
    );
  }

  const ratio = progress.duration > 0 ? progress.current / progress.duration : 0;
  const loading = buffering || roomBuffering;
  const seek = (value: number) => {
    if (!progress.duration) return;
    transportSeek(value * progress.duration);
  };

  return (
    <div className="page-pad pb-2">
      <div className="rounded-2xl bg-surface px-3 py-2.5 shadow-player sm:px-3.5 sm:py-3">
        <div className="mb-2 hidden items-center gap-3 md:flex">
          <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-subtle">
            {formatClock(progress.current)}
          </span>
          <Slider
            className="flex-1"
            max={1}
            step={0.001}
            value={[ratio]}
            onValueChange={([v]) => seek(v ?? 0)}
          />
          <span className="w-10 shrink-0 text-[11px] tabular-nums text-subtle">
            {formatClock(progress.duration || current.duration)}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            onClick={() => usePlayer.getState().setNowOpen(true)}
          >
            <Cover src={current.image} alt="" size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{current.title}</p>
              <p className="truncate text-xs text-muted">{current.artist}</p>
              {error ? (
                <p className="truncate text-xs text-danger">{error}</p>
              ) : roomOn ? (
                <p className="truncate text-xs text-subtle">
                  {roomCode}
                  {roomSynced ? " · locked" : " · syncing"}
                </p>
              ) : null}
            </div>
          </button>

          <div className="flex shrink-0 items-center gap-0.5">
            <IconBtn
              label="Shuffle"
              className="hidden md:grid"
              on={shuffle}
              onClick={() => transportShuffle()}
            >
              <Shuffle className="size-4" />
            </IconBtn>
            <IconBtn label="Previous" className="hidden sm:grid" onClick={() => transportPrev()}>
              <SkipBack className="size-4 fill-current" />
            </IconBtn>
            <button
              type="button"
              className="grid size-11 place-items-center rounded-full bg-accent text-accent-fg transition-transform duration-150 ease-out active:scale-[0.96] sm:size-12"
              aria-label={playing ? "Pause" : "Play"}
              onClick={() => transportToggle()}
            >
              {loading && !playing ? (
                <LoadRing progress={bufferProgress} className="text-accent-fg" />
              ) : playing ? (
                <Pause className="size-5 fill-current" />
              ) : (
                <Play className="ml-0.5 size-5 fill-current" />
              )}
            </button>
            <IconBtn label="Next" onClick={() => transportNext()}>
              <SkipForward className="size-4 fill-current" />
            </IconBtn>
            <IconBtn
              label="Repeat"
              className="hidden md:grid"
              on={repeat !== "off"}
              onClick={() => transportRepeat()}
            >
              {repeat === "one" ? (
                <Repeat1 className="size-4" />
              ) : (
                <Repeat className="size-4" />
              )}
            </IconBtn>
          </div>

          <div className="hidden min-w-0 items-center gap-2 xl:flex">
            <IconBtn
              label={muted ? "Unmute" : "Mute"}
              onClick={() => usePlayer.getState().toggleMute()}
            >
              {muted || volume === 0 ? (
                <VolumeX className="size-4" />
              ) : (
                <Volume2 className="size-4" />
              )}
            </IconBtn>
            <Slider
              className="w-24"
              max={1}
              step={0.01}
              value={[muted ? 0 : volume]}
              onValueChange={([v]) => usePlayer.getState().setVolume(v ?? 0)}
            />
          </div>

          <IconBtn
            label={liked ? "Unlike" : "Like"}
            on={liked}
            onClick={() => usePlayer.getState().toggleLiked(current)}
          >
            <Heart className={cn("size-4", liked && "fill-now text-now")} />
          </IconBtn>
          <IconBtn
            label="Queue"
            className="hidden sm:grid"
            on={queueOpen}
            onClick={() => usePlayer.getState().setQueueOpen(!queueOpen)}
          >
            <ListMusic className="size-4" />
          </IconBtn>
          <IconBtn
            label="Now playing"
            className="hidden sm:grid"
            onClick={() => usePlayer.getState().setNowOpen(true)}
          >
            <ChevronUp className="size-4" />
          </IconBtn>
        </div>
        <button
          type="button"
          className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-fg/10 md:hidden"
          aria-label="Seek"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seek((e.clientX - rect.left) / rect.width);
          }}
        >
          <span
            className="block h-full rounded-full bg-accent"
            style={{ width: `${Math.min(100, ratio * 100)}%` }}
          />
        </button>
      </div>
    </div>
  );
}

function IconBtn({
  label,
  on,
  onClick,
  children,
  className,
}: {
  label: string;
  on?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid size-11 place-items-center rounded-full text-muted transition-colors duration-150 hover:bg-fg/8 hover:text-fg",
        on && "text-fg",
        className,
      )}
    >
      {children}
    </button>
  );
}
