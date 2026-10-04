import { useEffect, useRef, useState } from "react";
import { getController } from "@/lib/room/controller";
import { useRoom } from "@/lib/room/store";
import { cn } from "@/lib/utils";

export function RoomChat() {
  const chat = useRoom((s) => s.chat);
  const selfName = useRoom((s) => s.name);
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chat.length]);

  return (
    <div className="flex min-h-52 flex-col rounded-2xl bg-surface p-3">
      <p className="mb-2 px-1 text-xs font-medium tracking-[0.16em] text-muted uppercase">
        Talk
      </p>
      <div ref={scroller} className="min-h-32 flex-1 space-y-2 overflow-y-auto px-1 py-1">
        {chat.length === 0 ? (
          <p className="text-xs text-subtle">Say something on this frequency.</p>
        ) : (
          chat.map((line) => (
            <div key={line.id} className="text-sm">
              <span
                className={cn(
                  "mr-1.5 text-xs font-medium",
                  line.name === selfName ? "text-accent" : "text-muted",
                )}
              >
                {line.name}
              </span>
              <span className="text-fg">{line.text}</span>
            </div>
          ))
        )}
      </div>
      <form
        className="mt-2"
        onSubmit={(e) => {
          e.preventDefault();
          getController()?.sendChat(draft);
          setDraft("");
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 280))}
          placeholder="Message the room"
          className="h-11 w-full rounded-full bg-surface-2 px-4 text-sm outline-none ring-ring placeholder:text-subtle focus:ring-2"
          maxLength={280}
        />
      </form>
    </div>
  );
}
