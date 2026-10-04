import { useRef, useState, type PointerEvent } from "react";
import { getController } from "@/lib/room/controller";
import { useRoom, type Listener } from "@/lib/room/store";
import { cn } from "@/lib/utils";

function toGrid(el: SVGSVGElement, clientX: number, clientY: number) {
  const rect = el.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * 100,
    y: ((clientY - rect.top) / rect.height) * 100,
  };
}

export function SpatialGrid() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const listeners = useRoom((s) => s.listeners);
  const source = useRoom((s) => s.source);
  const spatial = useRoom((s) => s.spatial);
  const pulse = useRoom((s) => s.pulse);
  const canMoveSource = useRoom(
    (s) => s.controls === "everyone" || s.hostId === s.selfId,
  );
  const [drag, setDrag] = useState<"self" | "source" | null>(null);

  const onPointer = (kind: "self" | "source") => (e: PointerEvent) => {
    if (kind === "source" && !canMoveSource) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag(kind);
  };

  const onMove = (e: PointerEvent) => {
    if (!drag || !svgRef.current) return;
    const pt = toGrid(svgRef.current, e.clientX, e.clientY);
    const ctl = getController();
    if (!ctl) return;
    if (drag === "self") ctl.moveSelf(pt.x, pt.y);
    else ctl.moveSource(pt.x, pt.y);
  };

  const onUp = () => {
    if (drag === "self") getController()?.flushPose();
    setDrag(null);
  };

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 100 100"
      className={cn(
        "aspect-square w-full touch-none rounded-xl bg-surface-2 select-none",
        spatial ? "opacity-100" : "opacity-80",
      )}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      role="application"
      aria-label="Spatial listening grid"
    >
      {[20, 40, 60, 80].map((n) => (
        <g key={n} className="stroke-fg/10" strokeWidth="0.4">
          <line x1={n} y1="0" x2={n} y2="100" />
          <line x1="0" y1={n} x2="100" y2={n} />
        </g>
      ))}
      <circle
        cx="50"
        cy="50"
        r="24"
        fill="none"
        className="stroke-fg/12"
        strokeWidth="0.5"
        strokeDasharray="1.5 1.8"
      />

      {spatial && pulse > 0 ? (
        <circle
          key={pulse}
          cx={source.x}
          cy={source.y}
          r="6"
          className="yard-pulse fill-accent/40"
        />
      ) : null}

      <circle
        cx={source.x}
        cy={source.y}
        r={spatial ? 5.2 : 3.2}
        className={cn(spatial ? "fill-accent" : "fill-fg/35")}
        onPointerDown={onPointer("source")}
        style={{ cursor: canMoveSource ? "grab" : "default" }}
      />
      <circle
        cx={source.x}
        cy={source.y}
        r="1.6"
        className="fill-accent-fg"
        pointerEvents="none"
      />

      {listeners.map((person) => (
        <ListenerDot
          key={person.id}
          person={person}
          onPointerDown={person.isSelf ? onPointer("self") : undefined}
        />
      ))}
    </svg>
  );
}

function ListenerDot({
  person,
  onPointerDown,
}: {
  person: Listener;
  onPointerDown?: (e: PointerEvent) => void;
}) {
  const letter = (person.name.trim()[0] || "?").toUpperCase();
  const r = person.isSelf ? 6.2 : 5.4;
  return (
    <g
      onPointerDown={onPointerDown}
      style={{ cursor: person.isSelf ? "grab" : "default" }}
    >
      <circle
        cx={person.x}
        cy={person.y}
        r={r}
        className={cn(
          person.isSelf ? "fill-accent" : "fill-surface",
          person.connected || person.isSelf ? "stroke-accent" : "stroke-fg/30",
        )}
        strokeWidth="0.8"
      />
      {person.isHost ? (
        <circle
          cx={person.x}
          cy={person.y}
          r={r + 1.6}
          fill="none"
          className="stroke-accent/70"
          strokeWidth="0.5"
        />
      ) : null}
      <text
        x={person.x}
        y={person.y + 0.8}
        textAnchor="middle"
        className={cn(
          "text-[5px] font-medium",
          person.isSelf ? "fill-accent-fg" : "fill-fg",
        )}
        style={{ fontSize: 5 }}
      >
        {letter}
      </text>
    </g>
  );
}
