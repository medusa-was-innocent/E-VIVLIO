import { useNavigate } from "@tanstack/react-router";
import { Radio as RadioIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { makeRoomCode, normalizeCode } from "@/lib/room/identity";

export function RadioHome() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState(false);

  const startRoom = () => {
    void navigate({ to: "/r/$code", params: { code: makeRoomCode() } });
  };

  const joinRoom = () => {
    const code = normalizeCode(joinCode);
    if (!code) {
      setJoinError(true);
      return;
    }
    void navigate({ to: "/r/$code", params: { code } });
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <header>
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted uppercase">
          Shared frequency
        </p>
        <h1 className="mt-1 font-display text-[2.75rem] leading-[0.9] tracking-tight sm:text-6xl">
          Radio
        </h1>
        <p className="mt-3 max-w-lg text-sm text-muted">
          A room is a lockstep station. Every device downloads the track first,
          then the host clock fires play at the same millisecond — even across
          cities.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-h-64 flex-col justify-between rounded-3xl bg-surface p-5">
          <div>
            <RadioIcon className="size-5 text-muted" />
            <h2 className="mt-4 font-display text-3xl tracking-tight">
              Start a room
            </h2>
            <p className="mt-2 text-sm text-muted">
              You’ll get a six-character code. Share the link — anyone with it
              hears the same downbeat.
            </p>
          </div>
          <Button variant="solid" className="mt-6" onClick={startRoom}>
            New room
          </Button>
        </div>

        <form
          className="flex min-h-64 flex-col justify-between rounded-3xl bg-surface p-5"
          onSubmit={(e) => {
            e.preventDefault();
            joinRoom();
          }}
        >
          <div>
            <p className="text-[11px] font-medium tracking-[0.16em] text-muted uppercase">
              Join
            </p>
            <h2 className="mt-4 font-display text-3xl tracking-tight">
              Enter a code
            </h2>
            <input
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase());
                setJoinError(false);
              }}
              placeholder="ROOMID"
              className="mt-4 h-12 w-full rounded-full bg-surface-2 px-5 font-mono tracking-widest outline-none ring-ring placeholder:text-subtle focus:ring-2"
              autoComplete="off"
              spellCheck={false}
              maxLength={8}
              aria-invalid={joinError}
            />
            {joinError ? (
              <p className="mt-2 text-xs text-danger">Six-character code.</p>
            ) : (
              <p className="mt-2 text-xs text-subtle">
                Letters and numbers, no I / 1 / 0 confusion.
              </p>
            )}
          </div>
          <Button variant="quiet" className="mt-6" type="submit">
            Enter room
          </Button>
        </form>
      </div>
    </div>
  );
}
