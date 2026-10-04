import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RoomSession } from "@/components/room/session";
import { RoomView } from "@/components/room/room-view";
import { Button } from "@/components/ui/button";
import { getChart } from "@/lib/audiomack/fn";
import type { Track } from "@/lib/audiomack/types";
import {
  displayName,
  loadName,
  normalizeCode,
  saveName,
} from "@/lib/room/identity";
import { unlockAudio } from "@/lib/playback";
import { usePlayer } from "@/lib/player-store";

export const Route = createFileRoute("/r/$code")({
  loader: async (): Promise<Track[]> => {
    try {
      return await Promise.race([
        getChart({ data: { genre: "all" } }),
        new Promise<Track[]>((_, reject) =>
          setTimeout(() => reject(new Error("catalog timeout")), 1800),
        ),
      ]);
    } catch {
      return [];
    }
  },
  component: RoomPage,
});

function RoomPage() {
  const { code: raw } = Route.useParams();
  const code = normalizeCode(raw);
  const initialChart = Route.useLoaderData();
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    void usePlayer.persist.rehydrate();
    usePlayer.getState().setTab("radio");
    if (import.meta.env.BASE_URL === "/yard/") void fetch("/api/ecosystem/me").then(r => r.ok ? r.json() : null).then(data => { if (data?.user) setName(data.user.name.slice(0,24)); }).catch(() => {});
    const stored = import.meta.env.BASE_URL === "/yard/" ? "" : loadName();
    if (stored) setName(stored);
    setReady(true);
  }, []);

  if (!code) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted uppercase">
          Dead air
        </p>
        <h1 className="font-display text-5xl tracking-tight">Unknown room</h1>
        <p className="text-sm text-muted">
          Room codes are six characters. Check the link and try again.
        </p>
        <Link
          to="/"
          className="grid h-12 place-items-center rounded-full bg-accent text-sm font-medium text-accent-fg"
        >
          Back to YARD
        </Link>
      </main>
    );
  }

  if (!ready) {
    return <div className="min-h-dvh bg-bg" />;
  }

  if (!entered) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6">
        <div>
          <p className="text-[11px] font-medium tracking-[0.18em] text-muted uppercase">
            Room {code}
          </p>
          <h1 className="mt-2 font-display text-5xl tracking-tight">
            Name on this frequency
          </h1>
          <p className="mt-3 text-sm text-muted">
            Others see this while you listen together. YARD locks every device
            to the host clock before the downbeat.
          </p>
        </div>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const next = displayName(name);
            saveName(next);
            setName(next);
            void unlockAudio();
            setEntered(true);
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 24))}
            placeholder="Your name"
            className="h-12 rounded-full bg-surface px-5 text-sm outline-none ring-ring placeholder:text-subtle focus:ring-2"
            autoFocus
            maxLength={24}
          />
          <Button variant="solid" type="submit">
            Enter room
          </Button>
        </form>
        <Link to="/" className="text-center text-sm text-muted hover:text-fg">
          Leave
        </Link>
      </main>
    );
  }

  const label = displayName(name);
  return (
    <RoomSession key={`${code}:${label}`} code={code} name={label}>
      <RoomView initialChart={initialChart} />
    </RoomSession>
  );
}
