/**
 * Hybrid room wire: WebRTC data channels for millisecond NTP + play commands
 * when NAT allows, HTTP bus as presence + fallback so rooms still work across
 * cities. Incoming messages are de-duplicated so a dual-path send never
 * double-fires play.
 */
import { P2PRoom, type PeerInfo } from "./p2p";
import { RoomBus } from "./bus";

export type MeshPath = "direct" | "relay" | "solo";

export interface RoomMeshOptions {
  room: string;
  selfId: string;
  name?: string;
  onPeersChanged?: (peers: PeerInfo[]) => void;
  onMessage?: (from: string, data: unknown, channel: "state" | "reliable") => void;
  onConnected?: () => void;
  onPath?: (path: MeshPath) => void;
}

type Stampable = { k?: string };

export class RoomMesh {
  private readonly p2p: P2PRoom;
  private readonly bus: RoomBus;
  private p2pPeers: PeerInfo[] = [];
  private busPeers: PeerInfo[] = [];
  private merged: PeerInfo[] = [];
  private seq = 0;
  private readonly seen = new Map<string, number>();
  private path: MeshPath = "solo";
  private closed = false;

  constructor(private readonly opts: RoomMeshOptions) {
    this.p2p = new P2PRoom({
      room: opts.room,
      selfId: opts.selfId,
      name: opts.name,
      onPeersChanged: (peers) => {
        this.p2pPeers = peers;
        this.emitPeers();
      },
      onMessage: (from, data, channel) => this.ingest(from, data, channel),
    });
    this.bus = new RoomBus({
      room: opts.room,
      selfId: opts.selfId,
      name: opts.name,
      onPeersChanged: (peers) => {
        this.busPeers = peers;
        this.emitPeers();
      },
      onMessage: (from, data, channel) => this.ingest(from, data, channel),
      onConnected: () => this.opts.onConnected?.(),
    });
  }

  async join(): Promise<void> {
    await Promise.all([this.bus.join(), this.p2p.join()]);
  }

  close(): void {
    this.closed = true;
    this.p2p.close();
    this.bus.close();
  }

  pathKind(): MeshPath {
    return this.path;
  }

  pathTo(peerId: string): "p2p" | "relay" {
    const p = this.p2pPeers.find((x) => x.id === peerId);
    return p?.connectionState === "connected" ? "p2p" : "relay";
  }

  broadcast(data: unknown): void {
    const stamped = this.stamp(data);
    const connected = this.p2pPeers.filter((p) => p.connectionState === "connected");
    const rest = this.busPeers.filter(
      (p) => !connected.some((c) => c.id === p.id),
    );
    if (connected.length) this.p2p.broadcast(stamped);
    if (rest.length) {
      for (const p of rest) this.bus.send(stamped, p.id);
    } else if (!connected.length) {
      this.bus.broadcast(stamped);
    }
  }

  send(data: unknown, peerId?: string): void {
    const stamped = this.stamp(data);
    if (!peerId) {
      this.broadcast(stamped);
      return;
    }
    if (this.pathTo(peerId) === "p2p") this.p2p.send(stamped, peerId);
    else this.bus.send(stamped, peerId);
  }

  private stamp(data: unknown): unknown {
    if (!data || typeof data !== "object") return data;
    const msg = data as Stampable;
    if (msg.k) return data;
    this.seq += 1;
    return { ...msg, k: `${this.opts.selfId}-${this.seq}` };
  }

  private ingest(from: string, data: unknown, channel: "state" | "reliable") {
    if (this.closed) return;
    const key = this.keyOf(from, data);
    if (key) {
      if (this.seen.has(key)) return;
      this.seen.set(key, Date.now());
      if (this.seen.size > 240) {
        const cutoff = Date.now() - 20_000;
        for (const [k, at] of this.seen) {
          if (at < cutoff) this.seen.delete(k);
        }
      }
    }
    this.opts.onMessage?.(from, data, channel);
  }

  private keyOf(from: string, data: unknown): string | null {
    if (!data || typeof data !== "object") return `${from}:${String(data)}`;
    const msg = data as { k?: unknown; t?: unknown; n?: unknown; epoch?: unknown; t0?: unknown };
    if (typeof msg.k === "string") return msg.k;
    return `${from}:${String(msg.t)}:${String(msg.epoch ?? msg.n ?? msg.t0 ?? "")}`;
  }

  private emitPeers() {
    const byId = new Map<string, PeerInfo>();
    for (const p of this.busPeers) byId.set(p.id, { ...p });
    for (const p of this.p2pPeers) {
      const existing = byId.get(p.id);
      if (!existing || p.connectionState === "connected") {
        byId.set(p.id, {
          ...(existing ?? p),
          ...p,
          name: p.name || existing?.name || "",
        });
      }
    }
    this.merged = [...byId.values()];
    const live = this.merged;
    const direct = live.filter((p) => p.connectionState === "connected").length;
    const next: MeshPath =
      live.length === 0 ? "solo" : direct === live.length && direct > 0 ? "direct" : "relay";
    if (next !== this.path) {
      this.path = next;
      this.opts.onPath?.(next);
    }
    this.opts.onPeersChanged?.(this.merged.map((p) => ({ ...p })));
  }
}
