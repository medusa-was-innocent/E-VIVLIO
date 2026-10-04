import type { Track } from "@/lib/audiomack/types";
import { getGraph } from "@/lib/audio/graph";
import { peekBuffer } from "@/lib/audio/loader";
import { getStreamPlayer } from "@/lib/audio/stream-player";
import { usePlayer } from "@/lib/player-store";
import { useRoom } from "@/lib/room/store";

export type PlayCommand = {
  epoch: number;
  mode: "play" | "pause" | "seek";
  waitMs: number;
  position: number;
  track: Track | null;
  playing?: boolean;
};

type Handler = (cmd: PlayCommand) => void;

const handlers = new Set<Handler>();
let lastEpoch = -1;

export function onPlayCommand(fn: Handler): () => void {
  handlers.add(fn);
  return () => handlers.delete(fn);
}

export function emitPlayCommand(cmd: PlayCommand) {
  if (cmd.epoch < lastEpoch) return;
  lastEpoch = cmd.epoch;
  for (const fn of handlers) fn(cmd);
}

export function currentAudioTime(): number {
  if (useRoom.getState().active) {
    const graph = getGraph();
    if (graph && graph.trackId != null) return graph.position();
    return 0;
  }
  const stream = getStreamPlayer();
  if (stream?.trackId != null) return stream.position();
  const graph = getGraph();
  if (graph && graph.trackId != null) return graph.position();
  return 0;
}

export function currentAudioDuration(): number {
  if (useRoom.getState().active) {
    return getGraph()?.duration ?? 0;
  }
  const stream = getStreamPlayer();
  if (stream?.duration) return stream.duration;
  return getGraph()?.duration ?? 0;
}

export function correctAudioTime(_seconds: number) {
  // Graph seek is a restart — only the tick handler should request it.
}

export function seekLocal(seconds: number) {
  const player = usePlayer.getState();
  const track = player.queue[player.index];
  if (!track) return;
  const offset = Math.max(0, seconds);
  if (!useRoom.getState().active) {
    const stream = getStreamPlayer();
    if (stream) {
      stream.seek(offset);
      if (player.playing) void stream.play(track.id, offset);
      return;
    }
  }
  const graph = getGraph();
  const buffer = peekBuffer(track.id);
  if (!graph) return;
  if (player.playing && buffer) {
    graph.schedulePlay({
      buffer,
      trackId: track.id,
      offset,
      waitMs: 16,
    });
    return;
  }
  graph.holdPosition(track.id, offset, buffer?.duration ?? track.duration);
}

export function applyElementVolume(volume: number, muted: boolean, spatialGain: number) {
  const graph = getGraph();
  graph?.setMaster(muted ? 0 : volume * spatialGain, false);
  const stream = getStreamPlayer();
  if (useRoom.getState().active) {
    stream?.pause();
    return;
  }
  stream?.setVolume(muted ? 0 : volume, muted);
}

/** Unlock AudioContext + HTMLAudio on the join / first-play click. */
export async function unlockAudio() {
  try {
    await getGraph()?.resume();
  } catch {
    // need a later gesture
  }
  try {
    const stream = getStreamPlayer();
    const el = stream?.ensure();
    if (el && el.paused && !el.src) {
      el.muted = true;
      const p = el.play();
      el.pause();
      el.muted = false;
      await p.catch(() => {});
    }
  } catch {
    // need a later gesture
  }
}
