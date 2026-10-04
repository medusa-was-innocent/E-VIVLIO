/** High-resolution epoch milliseconds (BeatSync). */
export function epochNow(): number {
  if (typeof performance === "undefined") return Date.now();
  return performance.timeOrigin + performance.now();
}
