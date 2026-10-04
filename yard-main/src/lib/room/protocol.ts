import type { Track } from "@/lib/audiomack/types";
import type { Pt } from "./spatial";

export type RepeatMode = "off" | "one" | "all";
export type Controls = "everyone" | "host";
export type SkedOp = "play" | "pause" | "seek";
export type WantOp = SkedOp | "next" | "prev" | "spatial" | "filter" | "rotate" | "click";

export type HelloMsg = { t: "hello"; name: string; x: number; y: number };
export type NtpQMsg = {
  t: "ntp-q";
  t0: number;
  n: number;
  g: number;
  i: 0 | 1;
  compensationMs?: number;
};
export type NtpAMsg = {
  t: "ntp-a";
  t0: number;
  t1: number;
  t2: number;
  n: number;
  g: number;
  i: 0 | 1;
};
export type WantMsg = {
  t: "want";
  op: WantOp;
  pos?: number;
  q?: Track[];
  i?: number;
  spatial?: boolean;
  src?: Pt;
  lowpass?: number;
  rotating?: boolean;
  click?: boolean;
};
export type SkedMsg = {
  t: "sked";
  op: SkedOp;
  at: number;
  pos: number;
  q?: Track[];
  i?: number;
  playing?: boolean;
  epoch: number;
  shuffle?: boolean;
  repeat?: RepeatMode;
};
export type FxMsg = {
  t: "fx";
  at: number;
  epoch: number;
  spatial?: boolean;
  src?: Pt;
  lowpass?: number;
  rotating?: boolean;
  click?: boolean;
};
export type SpinMsg = { t: "spin"; at: number; x: number; y: number };
export type LoadMsg = { t: "load"; q: Track[]; i: number };
export type BufMsg = { t: "buf"; id: number; ok: boolean };
export type ChatWire = { t: "chat"; id: string; name: string; text: string; at: number };
export type ModeMsg = { t: "mode"; shuffle: boolean; repeat: RepeatMode };
export type PersonWire = { name: string; x: number; y: number };
export type ChatLine = { id: string; name: string; text: string; at: number };
export type SnapMsg = {
  t: "snap";
  hostId: string;
  q: Track[];
  i: number;
  playing: boolean;
  pos: number;
  posAt: number;
  spatial: boolean;
  src: Pt;
  people: Record<string, PersonWire>;
  controls: Controls;
  epoch: number;
  shuffle: boolean;
  repeat: RepeatMode;
  lowpass: number;
  rotating: boolean;
  click: boolean;
  chat: ChatLine[];
};
export type PoseMsg = { t: "pose"; x: number; y: number };
export type SrcMsg = { t: "src"; x: number; y: number };
export type HostMsg = { t: "host"; id: string };
export type CtlMsg = { t: "ctl"; mode: Controls };
export type TickMsg = {
  t: "tick";
  at: number;
  pos: number;
  playing: boolean;
  id: number | null;
};

export type RoomMsg =
  | HelloMsg
  | NtpQMsg
  | NtpAMsg
  | WantMsg
  | SkedMsg
  | FxMsg
  | SpinMsg
  | LoadMsg
  | BufMsg
  | ChatWire
  | ModeMsg
  | SnapMsg
  | PoseMsg
  | SrcMsg
  | HostMsg
  | CtlMsg
  | TickMsg;

export function isRoomMsg(data: unknown): data is RoomMsg {
  return !!data && typeof data === "object" && "t" in data && typeof (data as { t: unknown }).t === "string";
}

/** Keep P2P payloads small — dock only needs a short waveform. */
export function slimTrack(track: Track): Track {
  return {
    ...track,
    waveform: track.waveform.length > 72 ? track.waveform.slice(0, 72) : track.waveform,
  };
}

export function slimQueue(tracks: Track[]): Track[] {
  return tracks.slice(0, 80).map(slimTrack);
}
