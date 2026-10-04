import { useCallback, useEffect, useRef, useState } from "react";
import { RoomMesh, type MeshPath } from "./mesh";
import type { PeerInfo } from "./p2p";

export function useRoomMesh(options: { room: string; name?: string }) {
  const [selfId] = useState(() => `p-${Math.random().toString(36).slice(2, 10)}`);
  const [room] = useState(() => options.room);
  const [name] = useState(() => options.name ?? selfId);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [joined, setJoined] = useState(false);
  const [path, setPath] = useState<MeshPath>("solo");
  const meshRef = useRef<RoomMesh | null>(null);
  const listeners = useRef(
    new Set<(from: string, data: unknown, channel: "state" | "reliable") => void>(),
  );

  useEffect(() => {
    const mesh = new RoomMesh({
      room,
      selfId,
      name,
      onPeersChanged: setPeers,
      onPath: setPath,
      onMessage: (from, data, channel) => {
        for (const fn of listeners.current) fn(from, data, channel);
      },
      onConnected: () => setJoined(true),
    });
    meshRef.current = mesh;
    void mesh.join();
    return () => {
      meshRef.current = null;
      mesh.close();
    };
  }, [room, selfId, name]);

  const broadcast = useCallback((data: unknown) => meshRef.current?.broadcast(data), []);
  const send = useCallback(
    (data: unknown, peerId?: string) => meshRef.current?.send(data, peerId),
    [],
  );
  const pathTo = useCallback(
    (peerId: string): "p2p" | "relay" => meshRef.current?.pathTo(peerId) ?? "relay",
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

  return { selfId, room, peers, joined, path, broadcast, send, pathTo, onMessage };
}
