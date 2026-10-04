import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { GenreId, Track } from "./types";

const genreSchema = z.enum([
  "all",
  "rap",
  "afrobeats",
  "rnb",
  "latin",
  "dancehall",
  "electronic",
  "pop",
]);

const genreInput = z.object({ genre: genreSchema.optional() });
const searchInput = z.object({
  q: z.string().min(1).max(120),
  page: z.number().int().min(1).max(20).optional(),
});
const idInput = z.object({ id: z.number().int().positive() });

export const getChart = createServerFn({ method: "GET" })
  .validator((input: unknown) => genreInput.parse(input))
  .handler(async ({ data }) => {
    const { fetchChart } = await import("./client.server");
    return fetchChart((data.genre ?? "all") as GenreId);
  });

export const getTrending = createServerFn({ method: "GET" })
  .validator((input: unknown) => genreInput.parse(input))
  .handler(async ({ data }) => {
    const { fetchTrending } = await import("./client.server");
    return fetchTrending((data.genre ?? "all") as GenreId);
  });

export const getFresh = createServerFn({ method: "GET" })
  .validator((input: unknown) => genreInput.parse(input))
  .handler(async ({ data }) => {
    const { fetchFresh } = await import("./client.server");
    return fetchFresh((data.genre ?? "all") as GenreId);
  });

export const searchTracks = createServerFn({ method: "GET" })
  .validator((input: unknown) => searchInput.parse(input))
  .handler(async ({ data }) => {
    const api = await import("./client.server");
    const parsed = api.parseAudiomackUrl(data.q);
    if (parsed) {
      const track = await api.fetchMusicBySlug(
        parsed.artistSlug,
        parsed.kind,
        parsed.slug,
      );
      return track ? [track] : [];
    }
    return api.searchCatalog(data.q, data.page ?? 1);
  });

export const getStream = createServerFn({ method: "POST" })
  .validator((input: unknown) => idInput.parse(input))
  .handler(async ({ data }) => {
    const { fetchStreamUrl } = await import("./client.server");
    const url = await fetchStreamUrl(data.id);
    return { url };
  });

export const getAlbumTracks = createServerFn({ method: "GET" })
  .validator((input: unknown) => idInput.parse(input))
  .handler(async ({ data }): Promise<Track[]> => {
    const { fetchAlbumTracks } = await import("./client.server");
    return fetchAlbumTracks(data.id);
  });
