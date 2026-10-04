import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Track } from "@/lib/audiomack/types";

export type RepeatMode = "off" | "one" | "all";
export type AppTab = "listen" | "browse" | "radio" | "library" | "search";

type RoomPatch = {
  queue?: Track[];
  index?: number;
  playing?: boolean;
  shuffle?: boolean;
  repeat?: RepeatMode;
};

type PlayerState = {
  queue: Track[];
  index: number;
  playing: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  volume: number;
  muted: boolean;
  liked: Track[];
  recents: Track[];
  error: string | null;
  controlled: boolean;
  buffering: boolean;
  bufferProgress: number;
  nowOpen: boolean;
  queueOpen: boolean;
  tab: AppTab;
  playList: (tracks: Track[], start?: number) => void;
  playTrack: (track: Track, context?: Track[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  setPlaying: (playing: boolean) => void;
  setIndex: (index: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleLiked: (track: Track) => void;
  isLiked: (id: number) => boolean;
  remember: (track: Track) => void;
  setError: (error: string | null) => void;
  clearQueue: () => void;
  setControlled: (controlled: boolean) => void;
  applyRoomState: (patch: RoomPatch) => void;
  setBuffering: (buffering: boolean, progress?: number) => void;
  setNowOpen: (open: boolean) => void;
  setQueueOpen: (open: boolean) => void;
  setTab: (tab: AppTab) => void;
};

function currentOf(state: Pick<PlayerState, "queue" | "index">) {
  return state.queue[state.index] ?? null;
}

const memoryStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const usePlayer = create<PlayerState>()(
  persist(
    (set, get) => ({
      queue: [],
      index: 0,
      playing: false,
      shuffle: false,
      repeat: "off",
      volume: 0.86,
      muted: false,
      liked: [],
      recents: [],
      error: null,
      controlled: false,
      buffering: false,
      bufferProgress: 0,
      nowOpen: false,
      queueOpen: false,
      tab: "listen",
      playList: (tracks, start = 0) => {
        if (!tracks.length) return;
        set({
          queue: tracks,
          index: Math.min(Math.max(start, 0), tracks.length - 1),
          playing: true,
          error: null,
          buffering: true,
          bufferProgress: 0,
        });
      },
      playTrack: (track, context) => {
        const list = context?.length ? context : [track];
        const found = list.findIndex((item) => item.id === track.id);
        set({
          queue: list,
          index: found >= 0 ? found : 0,
          playing: true,
          error: null,
          buffering: true,
          bufferProgress: 0,
        });
      },
      toggle: () => {
        const { queue, playing } = get();
        if (!queue.length) return;
        set({ playing: !playing, error: null });
      },
      next: () => {
        const { queue, index, shuffle, repeat } = get();
        if (!queue.length) return;
        if (shuffle && queue.length > 1) {
          let next = index;
          while (next === index) next = Math.floor(Math.random() * queue.length);
          set({ index: next, playing: true, error: null, buffering: true, bufferProgress: 0 });
          return;
        }
        if (index < queue.length - 1) {
          set({ index: index + 1, playing: true, error: null, buffering: true, bufferProgress: 0 });
          return;
        }
        if (repeat === "all") {
          set({ index: 0, playing: true, error: null, buffering: true, bufferProgress: 0 });
          return;
        }
        set({ playing: false });
      },
      prev: () => {
        const { queue, index } = get();
        if (!queue.length) return;
        set({
          index: index <= 0 ? queue.length - 1 : index - 1,
          playing: true,
          error: null,
          buffering: true,
          bufferProgress: 0,
        });
      },
      setPlaying: (playing) => set({ playing }),
      setIndex: (index) =>
        set({ index, playing: true, error: null, buffering: true, bufferProgress: 0 }),
      setVolume: (volume) =>
        set({ volume: Math.min(1, Math.max(0, volume)), muted: false }),
      toggleMute: () => set({ muted: !get().muted }),
      toggleShuffle: () => set({ shuffle: !get().shuffle }),
      cycleRepeat: () => {
        const order: RepeatMode[] = ["off", "all", "one"];
        const i = order.indexOf(get().repeat);
        set({ repeat: order[(i + 1) % order.length] });
      },
      toggleLiked: (track) => {
        const liked = get().liked;
        const exists = liked.some((item) => item.id === track.id);
        set({
          liked: exists
            ? liked.filter((item) => item.id !== track.id)
            : [track, ...liked].slice(0, 200),
        });
      },
      isLiked: (id) => get().liked.some((item) => item.id === id),
      remember: (track) => {
        const recents = get().recents.filter((item) => item.id !== track.id);
        set({ recents: [track, ...recents].slice(0, 40) });
      },
      setError: (error) => set({ error }),
      clearQueue: () => set({ queue: [], index: 0, playing: false, buffering: false }),
      setControlled: (controlled) => set({ controlled }),
      applyRoomState: (patch) =>
        set({
          ...(patch.queue ? { queue: patch.queue } : {}),
          ...(typeof patch.index === "number" ? { index: patch.index } : {}),
          ...(typeof patch.playing === "boolean" ? { playing: patch.playing } : {}),
          ...(patch.shuffle !== undefined ? { shuffle: patch.shuffle } : {}),
          ...(patch.repeat !== undefined ? { repeat: patch.repeat } : {}),
          error: null,
        }),
      setBuffering: (buffering, progress) =>
        set({
          buffering,
          bufferProgress: progress ?? (buffering ? get().bufferProgress : 1),
        }),
      setNowOpen: (open) => set({ nowOpen: open, queueOpen: open ? false : get().queueOpen }),
      setQueueOpen: (open) => set({ queueOpen: open }),
      setTab: (tab) => set({ tab }),
    }),
    {
      name: "yard-player-v2",
      skipHydration: true,
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? (memoryStorage as unknown as Storage)
          : localStorage,
      ),
      partialize: (state) => ({
        volume: state.volume,
        liked: state.liked,
        recents: state.recents,
        shuffle: state.shuffle,
        repeat: state.repeat,
      }),
    },
  ),
);

export function useCurrentTrack() {
  return usePlayer((s) => currentOf(s));
}

// Keep the workspace mini player attached to the existing audio engine and room.
if (typeof window !== "undefined" && window.parent !== window && import.meta.env.BASE_URL !== "/") {
  const report = () => {
    const state = usePlayer.getState();
    const track = currentOf(state);
    window.parent.postMessage({ type: "ecosystem-player", title: track?.title ?? "", artist: track?.artist ?? "", playing: state.playing, controlled: state.controlled }, window.location.origin);
  };
  usePlayer.subscribe(report);
  window.addEventListener("message", event => {
    if (event.source !== window.parent || event.origin !== window.location.origin) return;
    if (event.data?.type === "ecosystem-player-toggle") {
      if (usePlayer.getState().controlled) void import("@/lib/room/controller").then(({getController}) => getController()?.toggle());
      else usePlayer.getState().toggle();
    }
  });
  report();
}
