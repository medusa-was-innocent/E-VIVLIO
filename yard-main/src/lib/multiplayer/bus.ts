/**
 * Room control bus. Presence + play/pause/fx/chat ride HTTP + the app database
 * so two listeners on different carrier NATs (different cities) still share a
 * room. Audio itself never goes through here — each device streams the track.
 */
import type { PeerInfo, PeerRow } from "./p2p";

export interface BusRow {
  id: number;
  from: string;
  payload: unknown;
}

export interface BusPollResponse {
  peers: PeerRow[];
  bus?: BusRow[];
}

export interface RoomBusOptions {
  room: string;
  selfId: string;
  name?: string;
  onPeersChanged?: (peers: PeerInfo[]) => void;
  onMessage?: (from: string, data: unknown, channel: "state" | "reliable") => void;
  onConnected?: () => void;
}

const POLL_MS = 110;
const POST_RETRY_MS = [200, 600];

export class RoomBus {
  private readonly opts: RoomBusOptions;
  private peers: PeerInfo[] = [];
  private cursor = 0;
  private catchUp = true;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  private everPolled = false;
  private lastFingerprint = "";
  private postChain: Promise<void> = Promise.resolve();

  constructor(opts: RoomBusOptions) {
    this.opts = opts;
  }

  async join(): Promise<void> {
    try {
      await this.pollOnce();
    } catch {
      // First poll can fail on a cold database; the loop retries.
    }
    if (this.closed) return;
    this.schedule(POLL_MS);
  }

  close(): void {
    this.closed = true;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    void fetch(`${import.meta.env.BASE_URL}api/rtc`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "leave", room: this.opts.room, peer: this.opts.selfId }),
      keepalive: true,
    }).catch(() => {});
  }

  broadcast(data: unknown): void {
    this.enqueue("*", data);
  }

  send(data: unknown, peerId?: string): void {
    this.enqueue(peerId ?? "*", data);
  }

  peerList(): PeerInfo[] {
    return this.peers.map((p) => ({ ...p }));
  }

  private schedule(delay: number): void {
    if (this.closed) return;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = setTimeout(() => void this.poll(), delay);
  }

  private async poll(): Promise<void> {
    if (this.closed) return;
    try {
      await this.pollOnce();
    } catch {
      // Tab sleep / deploy blip — keep heartbeat going.
    }
    this.schedule(POLL_MS);
  }

  private async pollOnce(): Promise<void> {
    const params = new URLSearchParams({
      room: this.opts.room,
      peer: this.opts.selfId,
      name: this.opts.name ?? "",
      since: this.everPolled ? "1" : "0",
      bus: String(this.cursor),
    });
    const res = await fetch(`${import.meta.env.BASE_URL}api/rtc?${params}`);
    if (this.closed) return;
    if (!res.ok) throw new Error(`room bus poll failed: ${res.status}`);
    const body = (await res.json()) as BusPollResponse;
    if (this.closed) return;

    if (!this.everPolled) {
      this.everPolled = true;
      this.opts.onConnected?.();
    }

    this.reconcile(body.peers ?? []);

    const batch = body.bus ?? [];
    if (this.catchUp) {
      for (const row of batch) this.cursor = Math.max(this.cursor, row.id);
      this.catchUp = false;
      return;
    }
    for (const row of batch) {
      this.cursor = Math.max(this.cursor, row.id);
      if (row.from === this.opts.selfId) continue;
      let payload = row.payload;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload) as unknown;
        } catch {
          continue;
        }
      }
      this.opts.onMessage?.(row.from, payload, "reliable");
    }
  }

  private reconcile(rows: PeerRow[]): void {
    this.peers = rows
      .filter((p) => p.id !== this.opts.selfId)
      .map((p) => ({
        id: p.id,
        name: p.name,
        connectionState: "connected" as const,
        candidateType: "relay",
        rttMs: null,
      }));
    const fingerprint = JSON.stringify(this.peers.map((p) => [p.id, p.name]));
    if (fingerprint === this.lastFingerprint) return;
    this.lastFingerprint = fingerprint;
    this.opts.onPeersChanged?.(this.peerList());
  }

  private enqueue(to: string, data: unknown): void {
    this.postChain = this.postChain
      .then(() => this.postMsg(to, data))
      .catch(() => {});
  }

  private async postMsg(to: string, data: unknown): Promise<void> {
    for (let attempt = 0; ; attempt++) {
      if (this.closed) return;
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}api/rtc`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            op: "msg",
            room: this.opts.room,
            from: this.opts.selfId,
            to,
            payload: data,
          }),
        });
        if (res.ok) return;
        throw new Error(`room bus post failed: ${res.status}`);
      } catch (err) {
        if (attempt >= POST_RETRY_MS.length) {
          console.warn("[yard] room message dropped after retries", err);
          return;
        }
        await new Promise((r) => setTimeout(r, POST_RETRY_MS[attempt]));
      }
    }
  }
}
