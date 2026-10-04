import { cn } from "@/lib/utils";

function downsample(data: number[], target: number) {
  if (data.length <= target) return data;
  const bucket = data.length / target;
  return Array.from({ length: target }, (_, i) => {
    const start = Math.floor(i * bucket);
    const end = Math.max(start + 1, Math.floor((i + 1) * bucket));
    let max = 0;
    for (let j = start; j < end; j++) max = Math.max(max, data[j] ?? 0);
    return max;
  });
}

export function Waveform({
  data,
  progress,
  onSeek,
  className,
}: {
  data: number[];
  progress: number;
  onSeek: (ratio: number) => void;
  className?: string;
}) {
  const bars =
    data.length > 8
      ? downsample(data, 72)
      : Array.from({ length: 64 }, (_, i) =>
          28 + Math.round(22 * Math.abs(Math.sin(i * 0.37))),
        );
  const ratio = Math.min(1, Math.max(0, progress));

  return (
    <div
      className={cn("flex h-8 max-h-8 w-full items-end gap-px overflow-hidden", className)}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      aria-label="Seek"
      tabIndex={0}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        onSeek((e.clientX - rect.left) / rect.width);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onSeek(Math.min(1, ratio + 0.05));
        if (e.key === "ArrowLeft") onSeek(Math.max(0, ratio - 0.05));
      }}
    >
      {bars.map((value, i) => {
        const filled = i / bars.length <= ratio;
        const h = 22 + (value / 100) * 78;
        return (
          <span
            key={i}
            className={cn(
              "min-w-px flex-1 rounded-full",
              filled ? "bg-accent" : "bg-fg/18",
            )}
            style={{ height: `${h}%` }}
          />
        );
      })}
    </div>
  );
}
