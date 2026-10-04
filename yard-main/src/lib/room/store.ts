import { create } from "zustand";
import type { MeshPath, PeerInfo } from "@/lib/multiplayer";
import { LOWPASS_OPEN } from "@/lib/audio/graph";
import { gainAt, SOURCE_ORIGIN, type Pt } from "./spatial";
import type { ChatLine, Controls } from "./protocol";

export type Listener = {
  id: string;
  name: string;
  x: number;
  y: number;
  isHost: boolean;
  isSelf: boolean;
  rttMs: number | null;
  connected: boolean;
  gain: number;
};

type RoomView = {
  active: boolean;
  code: string;
  selfId: string;
  name: string;
  hostId: string;
  joined: boolean;
  synced: boolean;
  offsetMs: number;
  rttMs: number;
  spatial: boolean;
  source: Pt;
  selfPos: Pt;
  listeners: Listener[];
  controls: Controls;
  selfGain: number;
  pulse: number;
  epoch: number;
  hint: string | null;
  lowpass: number;
  rotating: boolean;
  click: boolean;
  buffering: boolean;
  bufferHint: string | null;
  chat: ChatLine[];
  ntpPure: number;
  ntpImpure: number;
  path: MeshPath;
  nudgeMs: number;
};

const idle: RoomView = {
  active: false,
  code: "",
  selfId: "",
  name: "",
  hostId: "",
  joined: false,
  synced: false,
  offsetMs: 0,
  rttMs: 0,
  spatial: false,
  source: SOURCE_ORIGIN,
  selfPos: SOURCE_ORIGIN,
  listeners: [],
  controls: "everyone",
  selfGain: 1,
  pulse: 0,
  epoch: 0,
  hint: null,
  lowpass: LOWPASS_OPEN,
  rotating: false,
  click: false,
  buffering: false,
  bufferHint: null,
  chat: [],
  ntpPure: 0,
  ntpImpure: 0,
  path: "solo",
  nudgeMs: 0,
};

export const useRoom = create<RoomView>(() => ({ ...idle }));

export function resetRoom() {
  useRoom.setState({ ...idle });
}

export function roomCanMutate(): boolean {
  const s = useRoom.getState();
  if (!s.active) return true;
  if (s.controls === "everyone") return true;
  return s.hostId === s.selfId;
}

export function isRoomHost(): boolean {
  const s = useRoom.getState();
  return s.active && s.hostId === s.selfId;
}

export function rebuildListeners(
  self: { id: string; name: string; x: number; y: number },
  hostId: string,
  people: Record<string, { name: string; x: number; y: number }>,
  peers: PeerInfo[],
  source: Pt,
  spatial: boolean,
): Listener[] {
  const byId = new Map<string, Listener>();
  const selfGain = spatial ? gainAt(self, source) : 1;
  byId.set(self.id, {
    id: self.id,
    name: self.name,
    x: self.x,
    y: self.y,
    isHost: self.id === hostId,
    isSelf: true,
    rttMs: 0,
    connected: true,
    gain: selfGain,
  });
  for (const p of peers) {
    const pos = people[p.id];
    const pt = { x: pos?.x ?? 50, y: pos?.y ?? 50 };
    byId.set(p.id, {
      id: p.id,
      name: pos?.name || p.name || "Listener",
      x: pt.x,
      y: pt.y,
      isHost: p.id === hostId,
      isSelf: false,
      rttMs: p.rttMs,
      connected: p.connectionState === "connected",
      gain: spatial ? gainAt(pt, source) : 1,
    });
  }
  for (const [id, pos] of Object.entries(people)) {
    if (byId.has(id)) continue;
    const pt = { x: pos.x, y: pos.y };
    byId.set(id, {
      id,
      name: pos.name,
      x: pt.x,
      y: pt.y,
      isHost: id === hostId,
      isSelf: id === self.id,
      rttMs: null,
      connected: false,
      gain: spatial ? gainAt(pt, source) : 1,
    });
  }
  return [...byId.values()];
}
