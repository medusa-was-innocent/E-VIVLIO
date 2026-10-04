export type Pt = { x: number; y: number };

export const GRID = 100;
export const SOURCE_ORIGIN: Pt = { x: 50, y: 50 };

const MIN_GAIN = 0.15;
const MAX_GAIN = 1;
const FALLOFF = 0.001;

export function clampPt(p: Pt): Pt {
  return {
    x: Math.min(96, Math.max(4, p.x)),
    y: Math.min(96, Math.max(4, p.y)),
  };
}

export function distance(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** BeatSync quadratic falloff — volume ducks as you leave the listening source. */
export function gainFromDistance(d: number): number {
  return Math.max(MIN_GAIN, Math.min(MAX_GAIN, MAX_GAIN - FALLOFF * d * d));
}

export function gainAt(listener: Pt, source: Pt): number {
  return gainFromDistance(distance(listener, source));
}

export function seatOnCircle(index: number, count: number, radius = 24): Pt {
  const n = Math.max(count, 1);
  const angle = (index / n) * Math.PI * 2 - Math.PI / 2;
  return clampPt({
    x: SOURCE_ORIGIN.x + radius * Math.cos(angle),
    y: SOURCE_ORIGIN.y + radius * Math.sin(angle),
  });
}

export function hashSeat(id: string): Pt {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return seatOnCircle(h % 8, 8);
}
