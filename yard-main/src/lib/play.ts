import { getAlbumTracks } from "@/lib/audiomack/fn";
import type { Track } from "@/lib/audiomack/types";
import { inRoom, transportPlay, transportPlayList, transportToggle } from "@/lib/transport";
import { usePlayer } from "@/lib/player-store";

export async function playCatalogItem(track: Track, context: Track[]) {
  const state = usePlayer.getState();
  const current = state.queue[state.index];
  if (current?.id === track.id && track.type === "song") {
    if (inRoom()) {
      transportToggle();
      return;
    }
    state.toggle();
    return;
  }
  if (track.type === "album" || track.type === "playlist") {
    const tracks = await getAlbumTracks({ data: { id: track.id } });
    if (tracks.length) {
      transportPlayList(tracks, 0);
      return;
    }
  }
  transportPlay(track, context);
}
