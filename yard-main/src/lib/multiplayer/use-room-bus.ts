import { useCallback, useEffect, useRef, useState } from "react";
import { RoomBus } from "./bus";
import type { PeerInfo } from "./p2p";
import type { P2PRoomHandle } from "./use-p2p-room";

export function useRoomBus(options: { room: string; name?: string }): P2PRoomHandle {
  const [selfId] = useState(() => `p-${Math.random().toString(36).slice(2, 10)}`);
  const [room] = useState(() => options.room);
  const [name] = useState(() => options.name ?? selfId);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [joined, setJoined] = useState(false);
  const busRef = useRef<RoomBus | null>(null);
  const listeners = useRef(
    new Set<(from: string, data: unknown, channel: "state" | "reliable") => void>(),
  );

  useEffect(() => {
    const bus = new RoomBus({
      room,
      selfId,
      name,
      onPeersChanged: setPeers,
      onMessage: (from, data, channel) => {
        for (const fn of listeners.current) fn(from, data, channel);
      },
      onConnected: () => setJoined(true),
    });
    busRef.current = bus;
    void bus.join();
    return () => {
      busRef.current = null;
      bus.close();
    };
  }, [room, selfId, name]);

  const broadcast = useCallback((data: unknown) => busRef.current?.broadcast(data), []);
  const send = useCallback(
    (data: unknown, peerId?: string) => busRef.current?.send(data, peerId),
    [],
  );
  const onMessage = useCallback(
    (fn: (from: string, data: unknown, channel: "state" | "reliable") => void) => {
      listeners.current.add(fn);
      return () => {
        listeners.current.delete(fn);
      };
    },
    [],
  );

  return { selfId, room, peers, joined, broadcast, send, onMessage };
}
