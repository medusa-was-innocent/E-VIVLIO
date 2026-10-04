import { getController } from "@/lib/room/controller";
import { useRoom } from "@/lib/room/store";
import { cn } from "@/lib/utils";

export function SyncStrip() {
  const synced = useRoom((s) => s.synced);
  const rtt = useRoom((s) => s.rttMs);
  const offset = useRoom((s) => s.offsetMs);
  const isHost = useRoom((s) => s.hostId === s.selfId);
  const buffering = useRoom((s) => s.buffering);
  const bufferHint = useRoom((s) => s.bufferHint);
  const hint = useRoom((s) => s.hint);
  const pure = useRoom((s) => s.ntpPure);
  const path = useRoom((s) => s.path);
  const nudge = useRoom((s) => s.nudgeMs);
  const listeners = useRoom((s) => s.listeners);
  const live = listeners.filter((p) => p.connected || p.isSelf).length;

  const pathLabel =
    path === "direct" ? "direct lock" : path === "relay" ? "relayed" : "solo";

  return (
    <div className="rounded-2xl bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums text-muted">
        <span className="flex items-center gap-1.5">
          <span className={cn("size-1.5 rounded-full", synced ? "bg-accent" : "bg-muted")} />
          {synced ? "Locked" : "Syncing"}
        </span>
        <span>{pathLabel}</span>
        <span>{isHost ? "host clock" : `${Math.abs(offset)}ms offset`}</span>
        {rtt > 0 && !isHost ? <span>{rtt}ms rtt</span> : null}
        <span>{live} live</span>
        {pure > 0 ? <span>{pure} probes</span> : null}
      </div>
      <p className="mt-2 text-xs text-subtle">
        {path === "direct"
          ? "Peer-to-peer data channel — Huygens probes, same downbeat."
          : path === "relay"
            ? "Cross-city relay with NTP compensation. Direct lock when NAT allows."
            : "You’re the station. Invite someone to lock a second device."}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-subtle">Nudge</span>
        <button
          type="button"
          className="grid h-11 min-w-11 place-items-center rounded-full bg-surface-2 text-sm"
          onClick={() => getController()?.nudge(-10)}
          aria-label="Nudge earlier"
        >
          −10
        </button>
        <button
          type="button"
          className="grid h-11 min-w-11 place-items-center rounded-full bg-surface-2 text-sm"
          onClick={() => getController()?.nudge(10)}
          aria-label="Nudge later"
        >
          +10
        </button>
        <span className="tabular-nums text-xs text-muted">
          {nudge === 0 ? "0ms" : `${nudge > 0 ? "+" : ""}${nudge}ms`}
        </span>
      </div>
      {buffering || bufferHint || hint ? (
        <p className="mt-1.5 text-xs text-muted">{bufferHint || hint}</p>
      ) : null}
    </div>
  );
}
