import type { PeerInfo } from "@/lib/multiplayer";
import { getFilteredOutputLatencyMs, getGraph, LOWPASS_OPEN } from "@/lib/audio/graph";
import { loadTrackBuffer, peekBuffer } from "@/lib/audio/loader";
import type { Track } from "@/lib/audiomack/types";
import {
  correctAudioTime,
  currentAudioTime,
  emitPlayCommand,
} from "@/lib/playback";
import { usePlayer } from "@/lib/player-store";
import { epochNow } from "@/lib/time";
import {
  NTP_INITIAL_INTERVAL_MS,
  NTP_MAX_MEASUREMENTS,
  NTP_PROBE_GAP_MS,
  NTP_RELAY_INTERVAL_MS,
  NTP_STEADY_INTERVAL_MS,
  PeerClock,
  scheduleBuffer,
} from "./clock";
import {
  isRoomMsg,
  slimQueue,
  type ChatLine,
  type Controls,
  type FxMsg,
  type RoomMsg,
  type SkedMsg,
  type SnapMsg,
  type WantMsg,
  type WantOp,
} from "./protocol";
import { clampPt, gainAt, hashSeat, SOURCE_ORIGIN, type Pt } from "./spatial";
import { rebuildListeners, resetRoom, roomCanMutate, useRoom } from "./store";

type Wire = {
  selfId: string;
  name: string;
  send: (data: unknown, peerId?: string) => void;
  broadcast: (data: unknown) => void;
  pathTo?: (peerId: string) => "p2p" | "relay";
};

export class RoomController {
  private readonly wire: Wire;
  private readonly clock = new PeerClock();
  private peers: PeerInfo[] = [];
  private people: Record<string, { name: string; x: number; y: number }> = {};
  private snapped = new Set<string>();
  private ntpN = 0;
  private epoch = 0;
  private lastSked = 0;
  private ntpSlow = false;
  private hostWait: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private poseAt = 0;
  private ntpTimer: ReturnType<typeof setTimeout> | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private rotateTimer: ReturnType<typeof setInterval> | null = null;
  private rotateN = 0;
  private chat: ChatLine[] = [];
  private ready = new Set<string>();
  private readyId: number | null = null;
  private pendingPlay: (() => void) | null = null;
  private readyWait: ReturnType<typeof setTimeout> | null = null;
  private loadGen = 0;
  private filterAt = 0;
  private filterHold: ReturnType<typeof setTimeout> | null = null;
  private compensation = new Map<string, number>();

  constructor(wire: Wire, code: string) {
    this.wire = wire;
    const seat = hashSeat(wire.selfId);
    this.people[wire.selfId] = { name: wire.name, x: seat.x, y: seat.y };
    this.clock.reset();
    usePlayer.getState().setControlled(true);
    useRoom.setState({
      active: true,
      code,
      selfId: wire.selfId,
      name: wire.name,
      hostId: "",
      joined: false,
      synced: false,
      offsetMs: 0,
      rttMs: 0,
      spatial: false,
      source: SOURCE_ORIGIN,
      selfPos: seat,
      listeners: [],
      controls: "everyone",
      selfGain: 1,
      pulse: 0,
      epoch: 0,
      hint: "Tuning the room…",
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
    });
    this.paint();
    this.scheduleNtp();
    this.tickTimer = setInterval(() => this.hostTick(), 1000);
    void getGraph()?.resume();
  }

  dispose() {
    this.disposed = true;
    if (this.ntpTimer) clearTimeout(this.ntpTimer);
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.rotateTimer) clearInterval(this.rotateTimer);
    if (this.hostWait) clearTimeout(this.hostWait);
    if (this.readyWait) clearTimeout(this.readyWait);
    if (this.filterHold) clearTimeout(this.filterHold);
    getGraph()?.dispose();
    usePlayer.getState().setControlled(false);
    resetRoom();
  }

  onJoined() {
    useRoom.setState({ joined: true, hint: null });
    this.wire.send({
      t: "hello",
      name: this.wire.name,
      x: this.self().x,
      y: this.self().y,
    });
    this.paint();
  }

  onPeers(peers: PeerInfo[]) {
    if (this.disposed) return;
    const prev = new Set(this.peers.map((p) => p.id));
    this.peers = peers;
    for (const id of prev) {
      if (!peers.some((p) => p.id === id)) this.snapped.delete(id);
    }
    this.reconcileHost();
    if (this.isHost()) {
      for (const p of peers) {
        if (!this.snapped.has(p.id)) {
          this.wire.send(this.snapshot(), p.id);
          this.snapped.add(p.id);
        }
      }
    }
    this.paint();
  }

  onMessage(_from: string, data: unknown, _channel: "state" | "reliable") {
    if (this.disposed || !isRoomMsg(data)) return;
    switch (data.t) {
      case "hello":
        this.people[_from] = { name: data.name, x: data.x, y: data.y };
        if (this.isHost()) {
          this.wire.send(this.snapshot(), _from);
          this.snapped.add(_from);
        }
        this.paint();
        break;
      case "ntp-q":
        if (this.isHost()) {
          const t1 = epochNow();
          if (typeof data.compensationMs === "number") {
            this.compensation.set(_from, data.compensationMs);
          }
          this.wire.send(
            { t: "ntp-a", t0: data.t0, t1, t2: epochNow(), n: data.n, g: data.g, i: data.i },
            _from,
          );
        }
        break;
      case "ntp-a":
        if (data.g > 0) this.clock.noteResponse(data.t0, data.t1, data.t2, data.g, data.i);
        else this.clock.noteSimple(data.t0, data.t1, data.t2);
        useRoom.setState({
          offsetMs: Math.round(this.clock.offsetMs),
          rttMs: Math.round(this.clock.rttMs),
          synced: this.clock.synced,
          ntpPure: this.clock.pure,
          ntpImpure: this.clock.impure,
          hint: this.clock.synced ? null : "Locking clocks…",
        });
        break;
      case "want":
        if (this.isHost()) this.handleWant(data);
        break;
      case "sked":
        this.applySked(data);
        break;
      case "fx":
        this.applyFx(data);
        break;
      case "spin":
        this.applySpin(data.at, data.x, data.y);
        break;
      case "load":
        void this.ingestLoad(data.q, data.i);
        break;
      case "buf":
        if (this.isHost() && data.ok && data.id === this.readyId) {
          this.ready.add(_from);
          this.maybeGo();
        }
        break;
      case "chat":
        this.pushChat({ id: data.id, name: data.name, text: data.text, at: data.at });
        break;
      case "mode":
        usePlayer.getState().applyRoomState({ shuffle: data.shuffle, repeat: data.repeat });
        break;
      case "snap":
        this.applySnap(data);
        break;
      case "pose":
        if (this.people[_from]) {
          this.people[_from] = { ...this.people[_from]!, x: data.x, y: data.y };
        } else {
          this.people[_from] = { name: "Listener", x: data.x, y: data.y };
        }
        this.paint();
        break;
      case "src":
        useRoom.setState({ source: clampPt(data) });
        this.paint();
        break;
      case "host":
        this.takeHost(data.id);
        break;
      case "ctl":
        useRoom.setState({ controls: data.mode });
        break;
      case "tick":
        this.applyTick(data.at, data.pos, data.playing, data.id);
        break;
      default:
        break;
    }
  }

  play(track: Track, context: Track[]) {
    if (!this.guard()) return;
    const list = context.length ? context : [track];
    const index = Math.max(0, list.findIndex((t) => t.id === track.id));
    this.request("play", { q: slimQueue(list), i: index, pos: 0 });
  }

  playList(tracks: Track[], start = 0) {
    if (!this.guard() || !tracks.length) return;
    this.request("play", { q: slimQueue(tracks), i: start, pos: 0 });
  }

  toggle() {
    if (!this.guard()) return;
    const playing = usePlayer.getState().playing;
    this.request(playing ? "pause" : "play", { pos: currentAudioTime() });
  }

  next() {
    if (!this.guard()) return;
    this.request("next");
  }

  prev() {
    if (!this.guard()) return;
    this.request("prev");
  }

  seek(seconds: number) {
    if (!this.guard()) return;
    this.request("seek", { pos: Math.max(0, seconds) });
  }

  setShuffle(shuffle: boolean) {
    if (!this.guard()) return;
    usePlayer.getState().applyRoomState({ shuffle });
    this.wire.send({ t: "mode", shuffle, repeat: usePlayer.getState().repeat });
  }

  setRepeat(repeat: "off" | "one" | "all") {
    if (!this.guard()) return;
    usePlayer.getState().applyRoomState({ repeat });
    this.wire.send({ t: "mode", shuffle: usePlayer.getState().shuffle, repeat });
  }

  moveSelf(x: number, y: number) {
    const pt = clampPt({ x, y });
    this.people[this.wire.selfId] = { name: this.wire.name, ...pt };
    useRoom.setState({ selfPos: pt });
    this.paint();
    const room = useRoom.getState();
    if (room.spatial) getGraph()?.setGainNow(gainAt(pt, room.source));
    const now = performance.now();
    if (now - this.poseAt > 180) {
      this.wire.broadcast({ t: "pose", x: pt.x, y: pt.y });
      this.poseAt = now;
    }
  }

  flushPose() {
    const self = this.self();
    this.wire.send({ t: "pose", x: self.x, y: self.y });
  }

  moveSource(x: number, y: number) {
    if (!this.guard()) return;
    const pt = clampPt({ x, y });
    this.dispatchFx({ src: pt, spatial: true });
  }

  toggleSpatial() {
    if (!this.guard()) return;
    this.request("spatial", { spatial: !useRoom.getState().spatial });
  }

  setLowpass(freq: number) {
    if (!this.guard()) return;
    useRoom.setState({ lowpass: freq });
    const now = performance.now();
    if (now - this.filterAt < 80) {
      if (this.filterHold) clearTimeout(this.filterHold);
      this.filterHold = setTimeout(() => {
        this.filterHold = null;
        this.request("filter", { lowpass: freq });
      }, 80);
      return;
    }
    this.filterAt = now;
    this.request("filter", { lowpass: freq });
  }

  toggleRotate() {
    if (!this.guard()) return;
    this.request("rotate", { rotating: !useRoom.getState().rotating, spatial: true });
  }

  toggleClick() {
    if (!this.guard()) return;
    this.request("click", { click: !useRoom.getState().click });
  }

  sendChat(text: string) {
    const trimmed = text.trim().slice(0, 280);
    if (!trimmed) return;
    const line: ChatLine = {
      id: `${this.wire.selfId}-${Date.now()}`,
      name: this.wire.name,
      text: trimmed,
      at: Date.now(),
    };
    this.pushChat(line);
    this.wire.send({ t: "chat", ...line });
  }

  nudge(deltaMs: number) {
    this.clock.nudgeMs = Math.max(-1000, Math.min(1000, this.clock.nudgeMs + deltaMs));
    useRoom.setState({ nudgeMs: Math.round(this.clock.nudgeMs) });
    const player = usePlayer.getState();
    if (!player.playing) return;
    const pos = Math.max(0, currentAudioTime() - deltaMs / 1000);
    this.request("seek", { pos });
  }

  setControls(mode: Controls) {
    if (!this.isHost()) return;
    useRoom.setState({ controls: mode });
    this.wire.send({ t: "ctl", mode });
  }

  private guard(): boolean {
    if (!roomCanMutate()) {
      useRoom.setState({ hint: "Only the host can change the room right now." });
      return false;
    }
    return true;
  }

  private request(op: WantOp, extra: Partial<WantMsg> = {}) {
    const want: WantMsg = { t: "want", op, ...extra };
    if (this.isHost()) {
      this.handleWant(want);
      return;
    }
    const host = useRoom.getState().hostId;
    if (host && host !== this.wire.selfId) this.wire.send(want, host);
    else this.handleWant(want);
  }

  private handleWant(want: WantMsg) {
    const player = usePlayer.getState();
    let queue = want.q ?? player.queue;
    let index = want.i ?? player.index;
    let pos = want.pos ?? currentAudioTime();
    const playing = player.playing;

    if (want.op === "next") {
      if (!queue.length) return;
      index = player.shuffle
        ? (index + 1 + Math.floor(Math.random() * Math.max(1, queue.length - 1))) % queue.length
        : (index + 1) % queue.length;
      this.beginPlay(queue, index, 0);
      return;
    }
    if (want.op === "prev") {
      if (!queue.length) return;
      index = index <= 0 ? queue.length - 1 : index - 1;
      this.beginPlay(queue, index, 0);
      return;
    }
    if (want.op === "pause") {
      this.dispatch({ op: "pause", pos, playing: false });
      return;
    }
    if (want.op === "seek") {
      this.dispatch({ op: "seek", pos, playing, q: queue, i: index });
      return;
    }
    if (want.op === "spatial") {
      const on = want.spatial ?? !useRoom.getState().spatial;
      if (!on) this.stopRotate();
      this.dispatchFx({ spatial: on, src: want.src ?? useRoom.getState().source, rotating: on ? useRoom.getState().rotating : false });
      return;
    }
    if (want.op === "filter") {
      this.dispatchFx({ lowpass: want.lowpass ?? LOWPASS_OPEN });
      return;
    }
    if (want.op === "rotate") {
      const on = want.rotating ?? !useRoom.getState().rotating;
      if (on) {
        this.dispatchFx({ spatial: true, rotating: true });
        this.startRotate();
      } else {
        this.stopRotate();
        this.dispatchFx({ rotating: false, spatial: true });
      }
      return;
    }
    if (want.op === "click") {
      this.dispatchFx({ click: want.click ?? !useRoom.getState().click });
      return;
    }
    if (!queue.length) return;
    if (want.q) queue = want.q;
    if (typeof want.i === "number") index = want.i;
    const track = queue[index];
    if (
      track &&
      peekBuffer(track.id) &&
      player.queue[player.index]?.id === track.id
    ) {
      this.dispatch({
        op: "play",
        pos: want.pos ?? pos,
        q: queue,
        i: index,
        playing: true,
      });
      return;
    }
    this.beginPlay(queue, index, want.pos ?? 0);
  }

  private beginPlay(queue: Track[], index: number, pos: number) {
    const track = queue[index];
    if (!track) return;
    this.ready = new Set();
    this.readyId = track.id;
    this.pendingPlay = () => {
      this.dispatch({ op: "play", pos, q: queue, i: index, playing: true });
    };
    this.wire.send({ t: "load", q: slimQueue(queue), i: index });
    void this.ingestLoad(queue, index, true);
    if (this.readyWait) clearTimeout(this.readyWait);
    this.readyWait = setTimeout(() => this.maybeGo(true), 20_000);
  }

  private async ingestLoad(queue: Track[], index: number, asHost = false) {
    const track = queue[index];
    if (!track) return;
    const gen = ++this.loadGen;
    usePlayer.getState().applyRoomState({ queue: slimQueue(queue), index, playing: false });
    useRoom.setState({ buffering: true, bufferHint: `Locking “${track.title}”…` });
    try {
      await loadTrackBuffer(track.id);
      if (this.disposed || gen !== this.loadGen) return;
      this.wire.send({ t: "buf", id: track.id, ok: true });
      if (asHost || this.isHost()) {
        this.ready.add(this.wire.selfId);
        this.maybeGo();
      } else {
        useRoom.setState({ buffering: false, bufferHint: null });
      }
    } catch {
      if (this.disposed || gen !== this.loadGen) return;
      this.wire.send({ t: "buf", id: track.id, ok: false });
      useRoom.setState({ buffering: false, bufferHint: "Couldn’t buffer — falling back to stream." });
      if (asHost || this.isHost()) this.maybeGo(true);
    }
    const next = queue[index + 1];
    if (next) void loadTrackBuffer(next.id).catch(() => {});
  }

  private maybeGo(force = false) {
    if (!this.pendingPlay) return;
    const needed = [this.wire.selfId, ...this.peers.filter((p) => p.connectionState === "connected").map((p) => p.id)];
    if (!force && !needed.every((id) => this.ready.has(id))) return;
    const go = this.pendingPlay;
    this.pendingPlay = null;
    if (this.readyWait) {
      clearTimeout(this.readyWait);
      this.readyWait = null;
    }
    useRoom.setState({ buffering: false, bufferHint: null });
    go();
  }

  private dispatch(partial: {
    op: SkedMsg["op"];
    pos: number;
    q?: Track[];
    i?: number;
    playing?: boolean;
  }) {
    const rtts = [this.clock.rttMs, ...this.peers.map((p) => p.rttMs)];
    const at = epochNow() + scheduleBuffer(rtts, this.relayExtra());
    const msg: SkedMsg = {
      t: "sked",
      op: partial.op,
      at,
      pos: partial.pos,
      q: partial.q ? slimQueue(partial.q) : undefined,
      i: partial.i,
      playing: partial.playing,
      epoch: ++this.epoch,
      shuffle: usePlayer.getState().shuffle,
      repeat: usePlayer.getState().repeat,
    };
    this.wire.send(msg);
    this.applySked(msg);
  }

  private dispatchFx(partial: Omit<FxMsg, "t" | "at" | "epoch">) {
    const rtts = [this.clock.rttMs, ...this.peers.map((p) => p.rttMs)];
    const at = epochNow() + scheduleBuffer(rtts, this.relayExtra());
    const msg: FxMsg = {
      t: "fx",
      at,
      epoch: this.epoch,
      spatial: partial.spatial,
      src: partial.src,
      lowpass: partial.lowpass,
      rotating: partial.rotating,
      click: partial.click,
    };
    this.wire.send(msg);
    this.applyFx(msg);
  }

  private applySked(msg: SkedMsg) {
    if (msg.epoch < this.epoch && !this.isHost()) return;
    this.epoch = Math.max(this.epoch, msg.epoch);
    this.lastSked = epochNow();
    let waitMs = this.isHost() ? Math.max(0, msg.at - epochNow()) : this.clock.waitMs(msg.at);
    let pos = msg.pos;
    if (msg.op !== "pause" && waitMs < 50) {
      const rawWait = this.isHost()
        ? msg.at - epochNow()
        : msg.at - (epochNow() + this.clock.offsetMs);
      if (rawWait < 50) {
        const retry = Math.min(50 - rawWait + 200, 2000);
        const elapsed = (this.isHost() ? epochNow() : this.clock.hostNow()) - msg.at;
        pos = msg.pos + (elapsed + retry) / 1000;
        waitMs = retry;
      } else {
        waitMs = 0;
      }
    }
    const player = usePlayer.getState();

    if (msg.q) {
      player.applyRoomState({
        queue: msg.q,
        index: msg.i ?? 0,
        playing: msg.op !== "pause",
        shuffle: msg.shuffle,
        repeat: msg.repeat,
      });
    } else if (typeof msg.i === "number") {
      player.applyRoomState({ index: msg.i, playing: msg.op !== "pause" });
    } else if (typeof msg.playing === "boolean") {
      player.applyRoomState({ playing: msg.playing });
    }

    const queue = usePlayer.getState().queue;
    const index = usePlayer.getState().index;
    const track = queue[index] ?? null;
    useRoom.setState({ pulse: epochNow(), epoch: msg.epoch, hint: null, buffering: false });

    emitPlayCommand({
      epoch: msg.epoch,
      mode: msg.op === "pause" ? "pause" : msg.op === "seek" ? "seek" : "play",
      waitMs,
      position: pos,
      track,
      playing: msg.op === "pause" ? false : true,
    });
  }

  private applyFx(msg: FxMsg) {
    const waitMs = this.isHost() ? Math.max(0, msg.at - epochNow()) : this.clock.waitMs(msg.at);
    const room = useRoom.getState();
    const spatial = msg.spatial ?? room.spatial;
    const source = msg.src ? clampPt(msg.src) : room.source;
    const lowpass = msg.lowpass ?? room.lowpass;
    const rotating = msg.rotating ?? room.rotating;
    const click = msg.click ?? room.click;

    useRoom.setState({
      spatial,
      source,
      lowpass,
      rotating,
      click,
      pulse: Date.now(),
      epoch: this.epoch,
    });
    if (typeof msg.rotating === "boolean") {
      if (msg.rotating && this.isHost()) this.startRotate();
      if (msg.rotating === false) this.stopRotate(false);
    }
    this.paint();

    const graph = getGraph();
    if (graph) {
      const self = this.self();
      const gain = spatial ? gainAt(self, source) : 1;
      graph.scheduleGain(gain, waitMs, 0.22);
      if (typeof msg.lowpass === "number") graph.scheduleLowpass(lowpass, waitMs, 0.2);
      if (typeof msg.click === "boolean") {
        graph.setClick(click, () => this.clock.hostNow());
      }
    }
  }

  private applySpin(at: number, x: number, y: number) {
    const src = clampPt({ x, y });
    const waitMs = this.isHost() ? Math.max(0, at - epochNow()) : this.clock.waitMs(at);
    useRoom.setState({ source: src, spatial: true, pulse: epochNow() });
    this.paint();
    const gain = gainAt(this.self(), src);
    getGraph()?.scheduleGain(gain, waitMs, 0.22);
  }

  private startRotate() {
    if (this.rotateTimer) return;
    this.rotateN = 0;
    this.rotateTimer = setInterval(() => {
      if (!this.isHost() || this.disposed) return;
      const angle = (this.rotateN * Math.PI) / 30;
      const src = clampPt({
        x: SOURCE_ORIGIN.x + 25 * Math.cos(angle),
        y: SOURCE_ORIGIN.y + 25 * Math.sin(angle),
      });
      this.rotateN += 1;
      const at = epochNow() + scheduleBuffer([this.clock.rttMs, ...this.peers.map((p) => p.rttMs)], this.relayExtra());
      this.wire.broadcast({ t: "spin", at, x: src.x, y: src.y });
      this.applySpin(at, src.x, src.y);
    }, 100);
  }

  private stopRotate(updateState = true) {
    if (this.rotateTimer) {
      clearInterval(this.rotateTimer);
      this.rotateTimer = null;
    }
    if (updateState) useRoom.setState({ rotating: false });
  }

  private applySnap(msg: SnapMsg) {
    this.epoch = Math.max(this.epoch, msg.epoch);
    this.takeHost(msg.hostId);
    this.people = { ...msg.people, [this.wire.selfId]: this.people[this.wire.selfId]! };
    this.chat = msg.chat ?? [];
    useRoom.setState({
      spatial: msg.spatial,
      source: clampPt(msg.src),
      controls: msg.controls,
      epoch: msg.epoch,
      lowpass: msg.lowpass,
      rotating: msg.rotating,
      click: msg.click,
      chat: this.chat,
    });
    usePlayer.getState().applyRoomState({
      queue: msg.q,
      index: msg.i,
      playing: msg.playing,
      shuffle: msg.shuffle,
      repeat: msg.repeat,
    });
    this.paint();
    const graph = getGraph();
    if (graph) {
      graph.scheduleLowpass(msg.lowpass, 0, 0.01);
      graph.setClick(msg.click, () => this.clock.hostNow());
      const gain = msg.spatial ? gainAt(this.self(), msg.src) : 1;
      graph.setGainNow(gain);
    }
    if (msg.rotating && this.isHost()) this.startRotate();

    if (!msg.playing || !msg.q.length) {
      emitPlayCommand({
        epoch: msg.epoch,
        mode: "pause",
        waitMs: 0,
        position: msg.pos,
        track: msg.q[msg.i] ?? null,
        playing: false,
      });
      return;
    }

    const track = msg.q[msg.i];
    if (track) {
      void (async () => {
        try {
          await loadTrackBuffer(track.id);
        } catch {
          // engine falls back to stream
        }
        if (this.disposed) return;
        const elapsed = Math.max(0, (this.clock.hostNow() - msg.posAt) / 1000);
        const pos = msg.pos + elapsed;
        const wait = scheduleBuffer([this.clock.rttMs], 200);
        const at = this.clock.hostNow() + wait;
        emitPlayCommand({
          epoch: msg.epoch + 0.5,
          mode: "play",
          waitMs: this.clock.waitMs(at),
          position: pos + wait / 1000,
          track,
          playing: true,
        });
      })();
    }
  }

  private applyTick(at: number, pos: number, playing: boolean, id: number | null) {
    if (this.isHost()) return;
    if (epochNow() - this.lastSked < 1500) return;
    const current = usePlayer.getState().queue[usePlayer.getState().index];
    if (!playing || !current || current.id !== id) return;
    const elapsed = (this.clock.hostNow() - at) / 1000;
    const expected = pos + elapsed;
    const graph = getGraph();
    if (graph?.playing && graph.trackId === id) {
      if (Math.abs(graph.position() - expected) > 0.25) {
        // Hard resync only on real drift — restart would click.
        emitPlayCommand({
          epoch: this.epoch + 0.01,
          mode: "seek",
          waitMs: 40,
          position: expected + 0.04,
          track: current,
          playing: true,
        });
      }
      return;
    }
    correctAudioTime(expected);
  }

  private snapshot(): SnapMsg {
    const player = usePlayer.getState();
    const room = useRoom.getState();
    return {
      t: "snap",
      hostId: room.hostId,
      q: slimQueue(player.queue),
      i: player.index,
      playing: player.playing,
      pos: currentAudioTime(),
      posAt: this.clock.hostNow(),
      spatial: room.spatial,
      src: room.source,
      people: { ...this.people },
      controls: room.controls,
      epoch: this.epoch,
      shuffle: player.shuffle,
      repeat: player.repeat,
      lowpass: room.lowpass,
      rotating: room.rotating,
      click: room.click,
      chat: this.chat.slice(-40),
    };
  }

  private ntpBeat() {
    if (this.disposed || this.isHost()) return;
    const host = useRoom.getState().hostId;
    if (!host || host === this.wire.selfId) return;
    const compensationMs = getFilteredOutputLatencyMs() + this.clock.nudgeMs;
    const direct = this.wire.pathTo?.(host) === "p2p";
    this.ntpN += 1;
    if (direct) {
      const g = this.clock.nextGroup();
      this.wire.send(
        { t: "ntp-q", t0: epochNow(), n: this.ntpN, g, i: 0 as const, compensationMs },
        host,
      );
      window.setTimeout(() => {
        if (this.disposed) return;
        this.wire.send(
          { t: "ntp-q", t0: epochNow(), n: this.ntpN, g, i: 1 as const, compensationMs },
          host,
        );
      }, NTP_PROBE_GAP_MS);
    } else {
      this.wire.send(
        { t: "ntp-q", t0: epochNow(), n: this.ntpN, g: 0, i: 0 as const, compensationMs },
        host,
      );
    }
  }

  private scheduleNtp() {
    if (this.ntpTimer) clearTimeout(this.ntpTimer);
    if (this.disposed) return;
    const host = useRoom.getState().hostId;
    const direct = host ? this.wire.pathTo?.(host) === "p2p" : false;
    const interval =
      this.isHost()
        ? NTP_STEADY_INTERVAL_MS
        : this.clock.samples.length < NTP_MAX_MEASUREMENTS
          ? direct
            ? NTP_INITIAL_INTERVAL_MS
            : NTP_RELAY_INTERVAL_MS
          : NTP_STEADY_INTERVAL_MS;
    this.ntpTimer = setTimeout(() => {
      this.ntpBeat();
      this.scheduleNtp();
    }, interval);
  }

  private relayExtra(): number {
    let extra = 0;
    for (const p of this.peers) {
      if (this.wire.pathTo?.(p.id) !== "p2p") extra = Math.max(extra, 180);
      extra = Math.max(extra, this.compensation.get(p.id) ?? 0);
    }
    extra = Math.max(extra, getFilteredOutputLatencyMs() + Math.abs(this.clock.nudgeMs));
    return extra;
  }

  private hostTick() {
    if (!this.isHost() || this.disposed) return;
    const player = usePlayer.getState();
    const current = player.queue[player.index];
    this.wire.broadcast({
      t: "tick",
      at: epochNow(),
      pos: currentAudioTime(),
      playing: player.playing,
      id: current?.id ?? null,
    });
  }

  private reconcileHost() {
    const room = useRoom.getState();
    const alive = new Set([this.wire.selfId, ...this.peers.map((p) => p.id)]);
    if (room.hostId && alive.has(room.hostId)) {
      if (this.hostWait) {
        clearTimeout(this.hostWait);
        this.hostWait = null;
      }
      return;
    }
    if (!room.hostId && this.peers.length > 0) {
      if (!this.hostWait) {
        this.hostWait = setTimeout(() => {
          this.hostWait = null;
          if (this.disposed) return;
          if (useRoom.getState().hostId) return;
          this.electHost();
        }, 1800);
      }
      return;
    }
    this.electHost();
  }

  private electHost() {
    const alive = [this.wire.selfId, ...this.peers.map((p) => p.id)].sort();
    const next = alive[0]!;
    this.takeHost(next);
    if (next === this.wire.selfId) {
      this.wire.send({ t: "host", id: next });
      this.wire.send(this.snapshot());
      const player = usePlayer.getState();
      const current = player.queue[player.index];
      if (current && player.playing) {
        this.beginPlay(player.queue, player.index, currentAudioTime());
      }
    }
  }

  private takeHost(id: string) {
    if (this.hostWait) {
      clearTimeout(this.hostWait);
      this.hostWait = null;
    }
    const was = this.isHost();
    useRoom.setState({ hostId: id });
    if (id === this.wire.selfId) {
      this.clock.becomeHost();
      this.ntpSlow = true;
      useRoom.setState({ synced: true, offsetMs: 0, hint: null });
    } else if (was || !this.clock.synced) {
      this.clock.reset();
      this.ntpSlow = false;
      this.stopRotate(false);
      useRoom.setState({ synced: false, hint: "Locking clocks…" });
      this.scheduleNtp();
    }
    this.paint();
  }

  private isHost() {
    return useRoom.getState().hostId === this.wire.selfId;
  }

  private self(): Pt {
    return this.people[this.wire.selfId] ?? useRoom.getState().selfPos;
  }

  private pushChat(line: ChatLine) {
    this.chat = [...this.chat, line].slice(-80);
    useRoom.setState({ chat: this.chat });
  }

  private paint() {
    const room = useRoom.getState();
    const self = this.self();
    const listeners = rebuildListeners(
      { id: this.wire.selfId, name: this.wire.name, x: self.x, y: self.y },
      room.hostId,
      this.people,
      this.peers,
      room.source,
      room.spatial,
    );
    const selfGain = room.spatial ? gainAt(self, room.source) : 1;
    const live = this.peers.filter((p) => p.connectionState === "connected");
    const path =
      this.peers.length === 0
        ? "solo"
        : live.length === this.peers.length
          ? "direct"
          : "relay";
    useRoom.setState({
      listeners,
      selfPos: self,
      selfGain,
      path,
    });
  }
}

let bound: RoomController | null = null;

export function bindController(c: RoomController | null) {
  bound = c;
}

export function getController(): RoomController | null {
  return bound;
}

export function peekReadyBuffer(id: number) {
  return peekBuffer(id);
}
