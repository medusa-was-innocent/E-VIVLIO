import type { Track } from "@/lib/audiomack/types";
import { getController } from "@/lib/room/controller";
import { useRoom } from "@/lib/room/store";
import { seekLocal } from "@/lib/playback";
import { usePlayer } from "@/lib/player-store";

export function inRoom(): boolean {
  return useRoom.getState().active;
}

export function transportPlay(track: Track, context: Track[]) {
  const room = getController();
  if (room) {
    room.play(track, context);
    return;
  }
  usePlayer.getState().playTrack(track, context);
}

export function transportPlayList(tracks: Track[], start = 0) {
  const room = getController();
  if (room) {
    room.playList(tracks, start);
    return;
  }
  usePlayer.getState().playList(tracks, start);
}

export function transportToggle() {
  const room = getController();
  if (room) {
    room.toggle();
    return;
  }
  usePlayer.getState().toggle();
}

export function transportNext() {
  const room = getController();
  if (room) {
    room.next();
    return;
  }
  usePlayer.getState().next();
}

export function transportPrev() {
  const room = getController();
  if (room) {
    room.prev();
    return;
  }
  usePlayer.getState().prev();
}

export function transportSeek(seconds: number) {
  const room = getController();
  if (room) {
    room.seek(seconds);
    return;
  }
  seekLocal(seconds);
}

export function transportShuffle() {
  const room = getController();
  const next = !usePlayer.getState().shuffle;
  if (room) {
    room.setShuffle(next);
    return;
  }
  usePlayer.getState().toggleShuffle();
}

export function transportRepeat() {
  const order = ["off", "all", "one"] as const;
  const current = usePlayer.getState().repeat;
  const next = order[(order.indexOf(current) + 1) % order.length];
  const room = getController();
  if (room) {
    room.setRepeat(next);
    return;
  }
  usePlayer.getState().cycleRepeat();
}

export function transportEnded() {
  if (usePlayer.getState().repeat === "one") return;
  if (inRoom()) {
    const { hostId, selfId } = useRoom.getState();
    if (hostId === selfId) transportNext();
    return;
  }
  usePlayer.getState().next();
}
