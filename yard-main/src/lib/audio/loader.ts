import { getStream } from "@/lib/audiomack/fn";
import { getGraph } from "./graph";
import { getStreamPlayer } from "./stream-player";

type Slot =
  | { status: "loading"; promise: Promise<AudioBuffer>; progress: number }
  | { status: "ready"; buffer: AudioBuffer; progress: 1 }
  | { status: "error"; error: string; progress: 0 };

const cache = new Map<number, Slot>();
const bytesCache = new Map<number, ArrayBuffer>();
const order: number[] = [];
const MAX = 16;
const listeners = new Set<(id: number, slot: Slot) => void>();

export function onBuffer(fn: (id: number, slot: Slot) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(id: number, slot: Slot) {
  for (const fn of listeners) fn(id, slot);
}

function touch(id: number) {
  const i = order.indexOf(id);
  if (i >= 0) order.splice(i, 1);
  order.push(id);
  while (order.length > MAX) {
    const drop = order.shift();
    if (drop != null && drop !== id) {
      const slot = cache.get(drop);
      if (slot && slot.status !== "loading") {
        cache.delete(drop);
        bytesCache.delete(drop);
      }
    }
  }
}

export function peekBuffer(id: number): AudioBuffer | null {
  const slot = cache.get(id);
  return slot?.status === "ready" ? slot.buffer : null;
}

export function bufferStatus(id: number): Slot["status"] | "idle" {
  return cache.get(id)?.status ?? "idle";
}

export function bufferProgress(id: number): number {
  return cache.get(id)?.progress ?? 0;
}

async function readWithProgress(
  res: Response,
  onProgress?: (ratio: number) => void,
): Promise<ArrayBuffer> {
  const length = Number(res.headers.get("content-length") || 0);
  if (!res.body || !length) return res.arrayBuffer();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.byteLength;
      onProgress?.(Math.min(0.92, received / length));
    }
  }
  const out = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out.buffer;
}

async function fetchBytes(
  id: number,
  onProgress?: (ratio: number) => void,
): Promise<ArrayBuffer> {
  const cached = bytesCache.get(id);
  if (cached) {
    onProgress?.(0.7);
    return cached.slice(0);
  }
  onProgress?.(0.08);
  const proxied = await fetch(`${import.meta.env.BASE_URL}api/stream/${id}`);
  if (!proxied.ok) {
    const { url } = await getStream({ data: { id } });
    onProgress?.(0.14);
    try {
      const direct = await fetch(url, { mode: "cors" });
      if (direct.ok) {
        const bytes = await readWithProgress(direct, onProgress);
        bytesCache.set(id, bytes.slice(0));
        return bytes;
      }
    } catch {
      // fall through
    }
    throw new Error(`Stream failed (${proxied.status})`);
  }
  const bytes = await readWithProgress(proxied, onProgress);
  bytesCache.set(id, bytes.slice(0));
  return bytes;
}

export function loadTrackBuffer(
  id: number,
  onProgress?: (ratio: number) => void,
): Promise<AudioBuffer> {
  const existing = cache.get(id);
  if (existing?.status === "ready") {
    touch(id);
    onProgress?.(1);
    return Promise.resolve(existing.buffer);
  }
  if (existing?.status === "loading") return existing.promise;

  const graph = getGraph();
  if (!graph) return Promise.reject(new Error("No audio graph"));

  const promise = (async () => {
    await graph.resume();
    const bytes = await fetchBytes(id, (ratio) => {
      const slot = cache.get(id);
      if (slot?.status === "loading") {
        const next: Slot = { ...slot, progress: ratio };
        cache.set(id, next);
        emit(id, next);
        onProgress?.(ratio);
      }
    });
    onProgress?.(0.94);
    const buffer = await graph.decode(bytes);
    const ready: Slot = { status: "ready", buffer, progress: 1 };
    cache.set(id, ready);
    touch(id);
    emit(id, ready);
    onProgress?.(1);
    return buffer;
  })().catch((err) => {
    const message = err instanceof Error ? err.message : "Decode failed";
    const slot: Slot = { status: "error", error: message, progress: 0 };
    cache.set(id, slot);
    emit(id, slot);
    throw err;
  });

  const loading: Slot = { status: "loading", promise, progress: 0.04 };
  cache.set(id, loading);
  emit(id, loading);
  return promise;
}

export function prefetchTrack(id: number) {
  if (!id) return;
  getStreamPlayer()?.prefetch(id);
  if (cache.has(id)) {
    touch(id);
    return;
  }
}

export function prefetchNeighbors(ids: number[], index: number) {
  const next = ids[index + 1];
  const next2 = ids[index + 2];
  const prev = ids[index - 1];
  if (next) prefetchTrack(next);
  if (next2) prefetchTrack(next2);
  if (prev) prefetchTrack(prev);
}
