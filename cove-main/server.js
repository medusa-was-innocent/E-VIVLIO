"use strict";

const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const { isValidRoomId, randomRoomId } = require("./lib/roomId");

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, { path: "/cove/socket.io" });
const router = express.Router();
app.use("/cove", router);

router.get("/ice-config", (_req, res) => {
  const iceServers = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun.cloudflare.com:3478" }];
  if (process.env.TURN_URLS && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
    iceServers.push({ urls: process.env.TURN_URLS.split(",").map(s => s.trim()), username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL });
  }
  res.set("Cache-Control", "private, no-store").json({ iceServers });
});
router.use(express.static(path.join(__dirname, "public")));

// Hand out a fresh room id and send the browser straight into it.
router.get("/new", (req, res) => {
	res.redirect(`/cove/r/${randomRoomId()}`);
});

// The room page is a static file; the room id lives in the URL and is read
// client-side. A malformed id gets the "that room name isn't valid" page
// instead of a broken lobby.
router.get("/r/:roomId", (req, res) => {
	if (!isValidRoomId(req.params.roomId)) {
		return res.status(404).sendFile(path.join(__dirname, "public", "invalid.html"));
	}
	res.sendFile(path.join(__dirname, "public", "room.html"));
});

router.use((req, res) => {
	res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
});

/**
 * In-memory signaling state. Nothing here ever touches audio, video, or
 * chat content - those travel directly between browsers over WebRTC. The
 * server's only job is introducing peers to each other, for as long as the
 * process stays up.
 *
 * rooms: Map<roomId, Map<socketId, { name }>>
 */
const rooms = new Map();

const roomOf = (socket) => socket.data.room;

function leaveCurrentRoom(socket) {
	const roomId = roomOf(socket);
	if (!roomId) return;

	const peers = rooms.get(roomId);
	if (peers) {
		peers.delete(socket.id);
		if (peers.size === 0) rooms.delete(roomId);
	}

	socket.to(roomId).emit("peer-left", { id: socket.id });
	socket.leave(roomId);
	socket.data.room = null;
}

async function verifySession(socket) {
  if (!process.env.ECOSYSTEM_BRIDGE_URL) return !process.env.ECOSYSTEM;
  const response = await fetch(`${process.env.ECOSYSTEM_BRIDGE_URL}/session`, {
    headers: { Authorization: `Bearer ${process.env.ECOSYSTEM_BRIDGE_SECRET}`, Cookie: socket.request.headers.cookie || "" },
  });
  return response.ok;
}
io.use(async (socket, next) => {
  try { if (await verifySession(socket)) return next(); } catch {}
  next(new Error("Please sign in to join Cove."));
});

io.on("connection", (socket) => {
  let packetQueue = Promise.resolve();
  socket.use((_packet, next) => {
    // Session checks are asynchronous. Preserve packet order for SDP and ICE.
    packetQueue = packetQueue.then(async () => {
    try { if (await verifySession(socket)) return next(); } catch {}
    socket.disconnect(true);
    }).catch(() => socket.disconnect(true));
  });
	socket.on("join-room", ({ room, name } = {}) => {
		if (!isValidRoomId(room)) return;
		if (roomOf(socket)) return; // already in a room on this connection

		const displayName = typeof name === "string" ? name.slice(0, 32) : "";

		if (!rooms.has(room)) rooms.set(room, new Map());
		const peers = rooms.get(room);

		// Tell the newcomer who's already here...
		const existingPeers = Array.from(peers.entries()).map(([id, data]) => ({ id, name: data.name }));
		socket.emit("joined", { selfId: socket.id, peers: existingPeers });

		// ...and tell everyone already here that the newcomer arrived.
		socket.to(room).emit("peer-joined", { id: socket.id, name: displayName });

		peers.set(socket.id, { name: displayName });
		socket.join(room);
		socket.data.room = room;
	});

	// Relay for SDP offers/answers and ICE candidates. Only forwarded between
	// sockets confirmed to share a room, so a client can't use this to poke
	// at arbitrary connections elsewhere on the server.
	socket.on("signal", ({ to, data } = {}) => {
		const room = roomOf(socket);
		if (!room || typeof to !== "string") return;

		const peers = rooms.get(room);
		if (!peers || !peers.has(to)) return;

		io.to(to).emit("signal", { from: socket.id, data });
	});

	socket.on("leave-room", () => leaveCurrentRoom(socket));
	socket.on("disconnect", () => leaveCurrentRoom(socket));
});

server.listen(PORT, process.env.HOST || "127.0.0.1", () => {
	console.log(`Cove server listening on http://localhost:${PORT}`);
});
