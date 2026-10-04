import { useEffect, useRef } from "react";
import { getGraph } from "@/lib/audio/graph";
import { loadTrackBuffer, peekBuffer, prefetchNeighbors } from "@/lib/audio/loader";
import { getStreamPlayer } from "@/lib/audio/stream-player";
import {
  applyElementVolume,
  onPlayCommand,
} from "@/lib/playback";
import { useCurrentTrack, usePlayer } from "@/lib/player-store";
import { useRoom } from "@/lib/room/store";
import {
  transportEnded,
  transportNext,
  transportPrev,
  transportToggle,
} from "@/lib/transport";

export function PlayerEngine() {
  const current = useCurrentTrack();
  const playing = usePlayer((s) => s.playing);
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const repeat = usePlayer((s) => s.repeat);
  const controlled = usePlayer((s) => s.controlled);
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const setPlaying = usePlayer((s) => s.setPlaying);
  const remember = usePlayer((s) => s.remember);
  const setError = usePlayer((s) => s.setError);
  const setBuffering = usePlayer((s) => s.setBuffering);
  const spatialGain = useRoom((s) => (s.active && s.spatial ? s.selfGain : 1));
  const loadGen = useRef(0);
  const cmdGen = useRef(0);
  const lastPlayed = useRef<number | null>(null);

  useEffect(() => {
    applyElementVolume(volume, muted, spatialGain);
  }, [volume, muted, spatialGain]);

  useEffect(() => {
    if (!current || controlled) return;
    const id = ++loadGen.current;
    let cancelled = false;
    setError(null);
    remember(current);
    setBuffering(true, 0.06);
    getGraph()?.stopSource();

    (async () => {
      try {
        const stream = getStreamPlayer();
        if (!stream) throw new Error("No player");
        await stream.play(current.id, lastPlayed.current === current.id ? stream.position() : 0, {
          onProgress: (ratio) => {
            if (loadGen.current === id) {
              setBuffering(ratio < 0.98 && !stream.playing, ratio);
            }
          },
          onEnded: () => {
            if (usePlayer.getState().repeat === "one") {
              void stream.play(current.id, 0, {
                onEnded: () => transportEnded(),
              });
              return;
            }
            transportEnded();
          },
        });
        if (cancelled || loadGen.current !== id) return;
        setBuffering(false, 1);
        lastPlayed.current = current.id;
        if (!usePlayer.getState().playing) {
          stream.pause();
          return;
        }
        prefetchNeighbors(
          usePlayer.getState().queue.map((t) => t.id),
          usePlayer.getState().index,
        );
        if ("mediaSession" in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: current.title,
            artist: current.artist,
            album: current.album || "YARD",
            artwork: current.image
              ? [{ src: current.image, sizes: "512x512", type: "image/webp" }]
              : [],
          });
        }
      } catch (err) {
        if (cancelled) return;
        setBuffering(false, 0);
        setPlaying(false);
        setError(
          err instanceof Error ? err.message : "This track is unavailable right now.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [current?.id, remember, setError, setPlaying, setBuffering, controlled]);

  useEffect(() => {
    if (controlled) {
      getStreamPlayer()?.pause();
      return;
    }
    const stream = getStreamPlayer();
    if (!stream) return;
    if (!current) {
      stream.stop();
      lastPlayed.current = null;
      return;
    }
    if (!playing) {
      stream.pause();
      return;
    }
    if (stream.trackId === current.id) {
      stream.resume();
      return;
    }
  }, [playing, current, controlled]);

  useEffect(() => {
    if (!current || controlled) return;
    prefetchNeighbors(
      queue.map((t) => t.id),
      index,
    );
  }, [queue, index, current, controlled]);

  useEffect(() => {
    void repeat;
  }, [repeat]);

  useEffect(() => {
    return onPlayCommand(async (cmd) => {
      const gen = ++cmdGen.current;
      const cancelled = () => gen !== cmdGen.current;
      const graph = getGraph();
      const trackId = cmd.track?.id;
      getStreamPlayer()?.pause();

      if (cmd.track && "mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: cmd.track.title,
          artist: cmd.track.artist,
          album: cmd.track.album || "YARD",
          artwork: cmd.track.image
            ? [{ src: cmd.track.image, sizes: "512x512", type: "image/webp" }]
            : [],
        });
      }

      if (!graph || trackId == null) return;

      let buffer = peekBuffer(trackId);
      if (!buffer) {
        setBuffering(true, 0.08);
        try {
          buffer = await loadTrackBuffer(trackId, (ratio) => {
            if (!cancelled()) setBuffering(true, ratio);
          });
        } catch {
          buffer = null;
        }
        if (cancelled()) return;
        setBuffering(false, buffer ? 1 : 0);
      }

      if (!buffer) {
        setPlaying(false);
        setError("Couldn’t buffer this track.");
        return;
      }

      if (cmd.mode === "pause") {
        graph.schedulePause(cmd.waitMs);
        setPlaying(false);
        return;
      }

      graph.schedulePlay({
        buffer,
        trackId,
        offset: cmd.position,
        waitMs: cmd.waitMs,
        onEnded: () => {
          if (usePlayer.getState().repeat === "one") return;
          transportEnded();
        },
      });
      lastPlayed.current = trackId;
      setPlaying(true);
    });
  }, [setPlaying, setError, setBuffering]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.setActionHandler("play", () => transportToggle());
    navigator.mediaSession.setActionHandler("pause", () => transportToggle());
    navigator.mediaSession.setActionHandler("previoustrack", () => transportPrev());
    navigator.mediaSession.setActionHandler("nexttrack", () => transportNext());
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        transportToggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return null;
}
