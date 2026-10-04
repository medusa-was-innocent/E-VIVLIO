import { type ReactNode, useEffect, useRef } from "react";
import { useRoomMesh } from "@/lib/multiplayer";
import { bindController, RoomController } from "@/lib/room/controller";
import { p2pRoomId } from "@/lib/room/identity";

export function RoomSession({
  code,
  name,
  children,
}: {
  code: string;
  name: string;
  children: ReactNode;
}) {
  const mesh = useRoomMesh({ room: p2pRoomId(code), name });
  const ctl = useRef<RoomController | null>(null);

  useEffect(() => {
    const controller = new RoomController(
      {
        selfId: mesh.selfId,
        name,
        send: mesh.send,
        broadcast: mesh.broadcast,
        pathTo: mesh.pathTo,
      },
      code,
    );
    ctl.current = controller;
    bindController(controller);
    const off = mesh.onMessage((from, data, channel) =>
      controller.onMessage(from, data, channel),
    );
    return () => {
      off();
      controller.dispose();
      bindController(null);
      ctl.current = null;
    };
  }, [mesh.selfId, mesh.send, mesh.broadcast, mesh.pathTo, mesh.onMessage, code, name]);

  useEffect(() => {
    if (mesh.joined) ctl.current?.onJoined();
  }, [mesh.joined]);

  useEffect(() => {
    ctl.current?.onPeers(mesh.peers);
  }, [mesh.peers]);

  return children;
}
