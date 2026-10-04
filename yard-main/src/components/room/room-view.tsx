import { Link } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { useCatalog } from "@/components/catalog/use-catalog";
import { RoomChat } from "@/components/room/chat";
import { EffectsPanel } from "@/components/room/effects";
import { SpatialGrid } from "@/components/room/spatial-grid";
import { SyncStrip } from "@/components/room/sync-strip";
import { AppShell } from "@/components/shell/app-shell";
import { Browse } from "@/components/views/browse";
import { Library } from "@/components/views/library";
import { ListenNow } from "@/components/views/listen-now";
import { SearchView } from "@/components/views/search-view";
import type { Track } from "@/lib/audiomack/types";
import { getController } from "@/lib/room/controller";
import { useRoom } from "@/lib/room/store";
import { usePlayer } from "@/lib/player-store";
import { cn } from "@/lib/utils";

export function RoomView({ initialChart }: { initialChart?: Track[] }) {
  const catalog = useCatalog(initialChart);
  const tab = usePlayer((s) => s.tab);
  const code = useRoom((s) => s.code);

  return (
    <AppShell sidebar={<RoomSidebar code={code} />}>
      {tab === "listen" && <ListenNow catalog={catalog} />}
      {tab === "browse" && <Browse catalog={catalog} />}
      {tab === "radio" && <RoomBoard />}
      {tab === "library" && <Library />}
      {tab === "search" && <SearchView catalog={catalog} />}
    </AppShell>
  );
}

function RoomSidebar({ code }: { code: string }) {
  return (
    <div className="flex flex-col gap-4 pb-8">
      <RoomBadge code={code} />
      <SyncStrip />
      <EffectsPanel />
      <PeopleList />
      <RoomChat />
    </div>
  );
}

function RoomBoard() {
  const code = useRoom((s) => s.code);
  const listeners = useRoom((s) => s.listeners);
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header>
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted uppercase">
          Live room
        </p>
        <h1 className="mt-1 font-display text-[2.75rem] leading-[0.9] tracking-tight sm:text-6xl">
          {code}
        </h1>
        <p className="mt-3 max-w-lg text-sm text-muted">
          {listeners.length} listener{listeners.length === 1 ? "" : "s"} on this
          frequency. Tracks buffer on every device, then the host clock drops
          the downbeat.
        </p>
      </header>

      <section className="rounded-3xl bg-surface p-3 sm:p-4">
        <p className="mb-3 px-1 text-[11px] font-medium tracking-[0.16em] text-muted uppercase">
          Listening field
        </p>
        <div className="mx-auto max-w-md">
          <SpatialGrid />
        </div>
        <p className="mt-3 px-1 text-xs leading-relaxed text-subtle">
          Drag yourself. Drag the source. Volume falls with distance, on every
          device at the same instant.
        </p>
      </section>

      <div className="grid gap-4 lg:hidden">
        <RoomBadge code={code} />
        <SyncStrip />
        <EffectsPanel />
        <PeopleList />
        <RoomChat />
      </div>
    </div>
  );
}

function RoomBadge({ code }: { code: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Link copied. Anyone with it joins this room.");
    } catch {
      toast(`Room code ${code}`);
    }
  };

  return (
    <div className="rounded-2xl bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted uppercase">
            Room
          </p>
          <p className="mt-1 font-mono text-lg tracking-widest">{code}</p>
        </div>
        <button
          type="button"
          onClick={() => void copy()}
          className="grid size-11 place-items-center rounded-full bg-surface-2"
          aria-label="Copy room link"
        >
          <Copy className="size-4" />
        </button>
      </div>
      <Link to="/" className="mt-3 inline-block text-xs text-muted hover:text-fg">
        Leave room
      </Link>
    </div>
  );
}

function PeopleList() {
  const listeners = useRoom((s) => s.listeners);
  const controls = useRoom((s) => s.controls);
  const isHost = useRoom((s) => s.hostId === s.selfId);

  return (
    <div className="rounded-2xl bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-medium tracking-[0.16em] text-muted uppercase">
          On this frequency
        </p>
        <span className="text-xs tabular-nums text-subtle">{listeners.length}</span>
      </div>
      <ul className="space-y-2">
        {listeners.map((p) => (
          <li key={p.id} className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                "grid size-8 place-items-center rounded-full text-xs font-medium",
                p.isSelf ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg",
              )}
            >
              {(p.name[0] || "?").toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate">
              {p.name}
              {p.isSelf ? " · you" : ""}
            </span>
            <span className="flex items-center gap-1 text-xs text-subtle">
              {p.isHost ? "host" : p.connected ? "live" : "…"}
            </span>
          </li>
        ))}
      </ul>
      {isHost ? (
        <button
          type="button"
          className="mt-3 h-11 w-full rounded-full bg-surface-2 text-sm"
          onClick={() =>
            getController()?.setControls(controls === "host" ? "everyone" : "host")
          }
        >
          {controls === "host" ? "Controls: host only" : "Controls: everyone"}
        </button>
      ) : (
        <p className="mt-3 text-xs text-subtle">
          {controls === "host"
            ? "Playback is locked to the host."
            : "Anyone here can change the track."}
        </p>
      )}
    </div>
  );
}
