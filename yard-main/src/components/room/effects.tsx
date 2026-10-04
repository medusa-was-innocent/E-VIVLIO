import { AudioLines, Orbit, Timer } from "lucide-react";
import { useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { LOWPASS_OPEN } from "@/lib/audio/graph";
import { getController } from "@/lib/room/controller";
import { useRoom } from "@/lib/room/store";
import { cn } from "@/lib/utils";

const LOG_MIN = Math.log(20);
const LOG_MAX = Math.log(LOWPASS_OPEN);

function sliderToFreq(slider: number) {
  const t = slider / 100;
  return Math.round(Math.exp(LOG_MIN + t * (LOG_MAX - LOG_MIN)));
}

function freqToSlider(freq: number) {
  return ((Math.log(freq) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100;
}

function freqLabel(freq: number) {
  if (freq >= 19_000) return "Off";
  if (freq >= 1000) return `${(freq / 1000).toFixed(1)}k`;
  return `${freq}`;
}

export function EffectsPanel() {
  const spatial = useRoom((s) => s.spatial);
  const rotating = useRoom((s) => s.rotating);
  const click = useRoom((s) => s.click);
  const lowpass = useRoom((s) => s.lowpass);
  const selfGain = useRoom((s) => s.selfGain);
  const controls = useRoom((s) => s.controls);
  const hostId = useRoom((s) => s.hostId);
  const selfId = useRoom((s) => s.selfId);
  const can = controls === "everyone" || hostId === selfId;
  const slider = useMemo(() => freqToSlider(lowpass), [lowpass]);
  const activeFilter = lowpass < 19_000;

  return (
    <div className="rounded-2xl bg-surface p-3">
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-muted uppercase">
            Effects
          </p>
          <p className="text-sm text-muted">
            {spatial
              ? `Gain ${Math.round(selfGain * 100)}% · shared clock`
              : "Everyone hears full volume"}
          </p>
        </div>
        <button
          type="button"
          disabled={!can}
          onClick={() => getController()?.toggleSpatial()}
          className={cn(
            "h-11 rounded-full px-4 text-sm",
            spatial ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg",
            !can && "opacity-40",
          )}
        >
          {spatial ? "Spatial on" : "Spatial off"}
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Orbit className={cn("size-3.5", rotating ? "text-accent" : "text-muted")} />
            Rotation
          </div>
          <button
            type="button"
            disabled={!can}
            onClick={() => getController()?.toggleRotate()}
            className={cn(
              "h-10 rounded-full px-3 text-xs",
              rotating ? "bg-accent text-accent-fg" : "bg-surface text-fg",
              !can && "opacity-40",
            )}
          >
            {rotating ? "Stop" : "Start"}
          </button>
        </div>

        <div className="rounded-xl bg-surface-2 px-3 py-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <AudioLines className={cn("size-3.5", activeFilter ? "text-accent" : "text-muted")} />
              Low-pass
            </span>
            <span className="tabular-nums text-xs text-muted">{freqLabel(lowpass)}</span>
          </div>
          <Slider
            min={0}
            max={100}
            step={0.5}
            value={[slider]}
            disabled={!can}
            onValueChange={([v]) => getController()?.setLowpass(sliderToFreq(v ?? 100))}
          />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Timer className={cn("size-3.5", click ? "text-accent" : "text-muted")} />
            Click track
          </div>
          <button
            type="button"
            disabled={!can}
            onClick={() => getController()?.toggleClick()}
            className={cn(
              "h-10 rounded-full px-3 text-xs",
              click ? "bg-accent text-accent-fg" : "bg-surface text-fg",
              !can && "opacity-40",
            )}
          >
            {click ? "On" : "Off"}
          </button>
        </div>
      </div>

      <p className="mt-3 px-1 text-xs leading-relaxed text-subtle">
        Filter, rotation, and the click fire on every device at the same host
        timestamp — not when the packet arrives.
      </p>
    </div>
  );
}
