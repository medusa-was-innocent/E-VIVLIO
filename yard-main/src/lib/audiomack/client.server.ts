import crypto from "node:crypto";
import type { GenreId, Track } from "./types";

const BASE = "https://api.audiomack.com/v1";
const CONSUMER_KEY = process.env.AUDIOMACK_CONSUMER_KEY || "audiomack-web";
const CONSUMER_SECRET = process.env.AUDIOMACK_CONSUMER_SECRET || "bd8a07e9f23fbe9d808646b730f89b8e";

function pct(value: string) {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%7E/gi, "~");
}

function sign(
  method: "GET" | "POST",
  urlStr: string,
  body?: Record<string, string>,
) {
  const url = new URL(urlStr);
  const oauth: Record<string, string> = {
    oauth_consumer_key: CONSUMER_KEY,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: "1.0",
  };
  const collected: Record<string, string> = { ...oauth, ...(body ?? {}) };
  url.searchParams.forEach((value, key) => {
    collected[key] = value;
  });
  const baseUrl = `${url.protocol}//${url.host}${url.pathname}`;
  const paramStr = Object.keys(collected)
    .sort()
    .map((key) => `${pct(key)}=${pct(collected[key] ?? "")}`)
    .join("&");
  const base = [method.toUpperCase(), pct(baseUrl), pct(paramStr)].join("&");
  const signature = crypto
    .createHmac("sha1", `${pct(CONSUMER_SECRET)}&`)
    .update(base)
    .digest("base64");
  oauth.oauth_signature = signature;
  return `OAuth ${Object.keys(oauth)
    .sort()
    .map((key) => `${pct(key)}="${pct(oauth[key] ?? "")}"`)
    .join(", ")}`;
}

async function amRequest<T>(
  method: "GET" | "POST",
  path: string,
  query?: Record<string, string>,
  body?: Record<string, string>,
): Promise<T> {
  const url = new URL(`${BASE}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value) url.searchParams.set(key, value);
    }
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: sign(method, url.toString(), body),
        Accept: "application/json",
        "User-Agent": "YARD/2.0",
        ...(body
          ? { "Content-Type": "application/x-www-form-urlencoded" }
          : {}),
      },
      body: body ? new URLSearchParams(body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Catalog request failed (${res.status}) ${text.slice(0, 160)}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

type RawUploader = {
  url_slug?: string;
  name?: string;
  verified?: string;
  image?: string;
};

type RawMusic = {
  id?: number | string;
  song_id?: number | string;
  title?: string;
  artist?: string;
  url_slug?: string;
  type?: string;
  image?: string;
  image_base?: string;
  duration?: string | number;
  featuring?: string;
  album?: string;
  genre?: string;
  explicit?: string;
  volume_data?: string;
  uploader?: RawUploader;
  stats?: { plays?: string; "plays-raw"?: number };
};

function asId(value: number | string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseWaveform(raw?: string): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n))
      .slice(0, 160);
  } catch {
    return [];
  }
}

export function normalizeTrack(raw: RawMusic | null | undefined): Track | null {
  if (!raw) return null;
  const id = asId(raw.id ?? raw.song_id);
  const slug = raw.url_slug ?? "";
  const artistSlug = raw.uploader?.url_slug ?? "";
  if (!id || !slug) return null;
  const type =
    raw.type === "album" ? "album" : raw.type === "playlist" ? "playlist" : "song";
  const duration = Number(raw.duration);
  return {
    id,
    title: raw.title || "Untitled",
    artist: raw.artist || raw.uploader?.name || "Unknown",
    artistSlug,
    slug,
    type,
    image: raw.image || raw.image_base || "",
    duration: Number.isFinite(duration) ? duration : 0,
    plays: raw.stats?.plays || "",
    genre: raw.genre || "",
    featuring: raw.featuring || "",
    album: typeof raw.album === "string" ? raw.album : "",
    waveform: parseWaveform(raw.volume_data),
    explicit: raw.explicit === "yes",
    verified: raw.uploader?.verified === "yes",
  };
}

function unwrapList(payload: unknown): RawMusic[] {
  if (!payload || typeof payload !== "object") return [];
  const data = payload as { results?: unknown };
  const results = data.results;
  if (Array.isArray(results)) return results as RawMusic[];
  return [];
}

const cache = new Map<string, { at: number; data: Track[] }>();
const CACHE_MS = 90_000;

function cached(key: string, load: () => Promise<Track[]>) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return Promise.resolve(hit.data);
  return load().then((data) => {
    cache.set(key, { at: Date.now(), data });
    return data;
  });
}

function pickSongs(items: Track[], limit = 24) {
  const songs = items.filter((t) => t.type === "song");
  return (songs.length ? songs : items).slice(0, limit);
}

export async function fetchChart(genre: GenreId = "all"): Promise<Track[]> {
  return cached(`chart:${genre}`, async () => {
    const path =
      genre === "all"
        ? "/chart/songs/weekly"
        : `/${genre}/chart/songs/weekly`;
    const payload = await amRequest<unknown>("GET", path, { limit: "32" });
    return pickSongs(
      unwrapList(payload)
        .map(normalizeTrack)
        .filter((t): t is Track => Boolean(t)),
    );
  });
}

export async function fetchTrending(genre: GenreId = "all"): Promise<Track[]> {
  return cached(`trending:${genre}`, async () => {
    const path =
      genre === "all" ? "/music/trending" : `/music/${genre}/trending`;
    const payload = await amRequest<unknown>("GET", path, { limit: "32" });
    return pickSongs(
      unwrapList(payload)
        .map(normalizeTrack)
        .filter((t): t is Track => Boolean(t)),
    );
  });
}

export async function fetchFresh(genre: GenreId = "all"): Promise<Track[]> {
  return cached(`fresh:${genre}`, async () => {
    const path = genre === "all" ? "/music/recent" : `/music/${genre}/recent`;
    const payload = await amRequest<unknown>("GET", path, { limit: "32" });
    return pickSongs(
      unwrapList(payload)
        .map(normalizeTrack)
        .filter((t): t is Track => Boolean(t)),
    );
  });
}

export async function searchCatalog(q: string, page = 1): Promise<Track[]> {
  const query = q.trim().slice(0, 120);
  if (!query) return [];
  const payload = await amRequest<unknown>("GET", "/search", {
    q: query,
    show: "music",
    sort: "popular",
    limit: "32",
    page: String(page),
  });
  return unwrapList(payload)
    .map(normalizeTrack)
    .filter((t): t is Track => Boolean(t))
    .slice(0, 32);
}

export async function fetchMusic(id: number): Promise<Track | null> {
  const payload = await amRequest<{ results?: RawMusic }>("GET", `/music/${id}`);
  return normalizeTrack(payload.results);
}

export async function fetchMusicBySlug(
  artistSlug: string,
  kind: "song" | "album" | "playlist",
  slug: string,
): Promise<Track | null> {
  const payload = await amRequest<{ results?: RawMusic }>(
    "GET",
    `/music/${kind}/${encodeURIComponent(artistSlug)}/${encodeURIComponent(slug)}`,
  );
  return normalizeTrack(payload.results);
}

export async function fetchAlbumTracks(id: number): Promise<Track[]> {
  const payload = await amRequest<{
    results?: RawMusic & { tracks?: RawMusic[] };
  }>("GET", `/music/${id}`);
  const parent = payload.results;
  if (!parent?.tracks?.length) {
    const single = normalizeTrack(parent);
    return single ? [single] : [];
  }
  return parent.tracks
    .map((track) =>
      normalizeTrack({
        ...track,
        id: track.song_id ?? track.id,
        artist: track.artist || parent.artist,
        uploader: track.uploader || parent.uploader,
        image: track.image || parent.image,
        album: parent.title,
      }),
    )
    .filter((t): t is Track => t != null && t.type === "song");
}

const streamCache = new Map<number, { at: number; url: string }>();

export async function fetchStreamUrl(id: number): Promise<string> {
  const hit = streamCache.get(id);
  if (hit && Date.now() - hit.at < 20_000) return hit.url;
  const payload = await amRequest<unknown>(
    "POST",
    `/music/${id}/play`,
    undefined,
    { hq: "1" },
  );
  let url = "";
  if (typeof payload === "string" && payload.startsWith("http")) url = payload;
  else if (payload && typeof payload === "object") {
    url =
      (payload as { url?: string; streaming_url?: string }).url ||
      (payload as { streaming_url?: string }).streaming_url ||
      "";
  }
  if (!url) throw new Error("No stream available for this track");
  streamCache.set(id, { at: Date.now(), url });
  return url;
}

export function parseAudiomackUrl(input: string) {
  try {
    const url = new URL(input.trim());
    if (!/(^|\.)audiomack\.com$/i.test(url.hostname)) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "embed" || parts[0] === "embed4") parts.shift();
    if (parts.length >= 3 && ["song", "album", "playlist"].includes(parts[1])) {
      return {
        artistSlug: parts[0],
        kind: parts[1] as "song" | "album" | "playlist",
        slug: parts[2],
      };
    }
    if (parts.length >= 3 && ["song", "album", "playlist"].includes(parts[0])) {
      return {
        artistSlug: parts[1],
        kind: parts[0] as "song" | "album" | "playlist",
        slug: parts[2],
      };
    }
    return null;
  } catch {
    return null;
  }
}
