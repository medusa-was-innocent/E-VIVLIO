import type { ReactNode } from "react";
import {
  Library as LibraryIcon,
  Radio,
  Search,
  LayoutGrid,
  PlayCircle,
} from "lucide-react";
import { PlayerDock } from "@/components/player/dock";
import { PlayerEngine } from "@/components/player/engine";
import { NowPlaying } from "@/components/player/now-playing";
import type { AppTab } from "@/lib/player-store";
import { usePlayer } from "@/lib/player-store";
import { useRoom } from "@/lib/room/store";
import { cn } from "@/lib/utils";

const NAV: { id: AppTab; label: string; short: string; icon: typeof PlayCircle }[] = [
  { id: "listen", label: "Listen Now", short: "Listen", icon: PlayCircle },
  { id: "browse", label: "Browse", short: "Browse", icon: LayoutGrid },
  { id: "radio", label: "Radio", short: "Radio", icon: Radio },
  { id: "library", label: "Library", short: "Library", icon: LibraryIcon },
  { id: "search", label: "Search", short: "Search", icon: Search },
];

export function AppShell({
  children,
  sidebar,
}: {
  children: ReactNode;
  sidebar?: ReactNode;
}) {
  const tab = usePlayer((s) => s.tab);
  const setTab = usePlayer((s) => s.setTab);
  const roomOn = useRoom((s) => s.active);
  const current = usePlayer((s) => s.queue[s.index]);

  return (
    <div className="min-h-dvh overflow-x-hidden bg-bg text-fg">
      <PlayerEngine />
      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-border px-3 py-5 lg:flex xl:w-60">
          <button
            type="button"
            className="rounded-xl px-3 py-1 text-left"
            onClick={() => setTab("listen")}
          >
            <p className="text-[11px] font-medium tracking-[0.18em] text-muted uppercase">
              Independent radio
            </p>
            <p className="font-display text-[42px] leading-none tracking-tight">YARD</p>
          </button>
          <nav className="mt-7 flex flex-col gap-0.5">
            {NAV.map((item) => {
              const Icon = item.icon;
              const on = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors duration-150",
                    on ? "bg-surface text-fg" : "text-muted hover:bg-fg/5 hover:text-fg",
                  )}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={on ? 2.4 : 2} />
                  {item.label}
                </button>
              );
            })}
          </nav>
          {roomOn ? (
            <p className="mt-6 px-3 text-xs leading-relaxed text-subtle">
              Room locked. Every device hits the same downbeat.
            </p>
          ) : (
            <p className="mt-auto px-3 text-xs leading-relaxed text-subtle">
              Catalog and streams via Audiomack. Artists keep their plays.
            </p>
          )}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div
            className={cn(
              "flex min-h-0 w-full flex-1",
              sidebar ? "lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]" : "",
            )}
          >
            <main
              className={cn(
                "min-w-0 page-pad pt-5 sm:pt-6",
                current ? "pb-36 md:pb-32" : "pb-28 md:pb-24",
              )}
            >
              {children}
            </main>
            {sidebar ? (
              <aside className="hidden min-w-0 flex-col gap-4 border-l border-border page-pad py-6 lg:flex">
                {sidebar}
              </aside>
            ) : null}
          </div>
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
        <div className="pointer-events-auto bg-gradient-to-t from-bg via-bg/95 to-transparent pt-3">
          <PlayerDock />
          <nav className="flex items-stretch justify-around border-t border-border bg-bg/95 px-1 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] lg:hidden">
            {NAV.map((item) => {
              const Icon = item.icon;
              const on = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium",
                    on ? "text-now" : "text-muted",
                  )}
                >
                  <Icon className="size-5" strokeWidth={on ? 2.4 : 2} />
                  <span className="truncate">{item.short}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
      <NowPlaying />
    </div>
  );
}
