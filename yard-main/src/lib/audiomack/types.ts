export type GenreId =
  | "all"
  | "rap"
  | "afrobeats"
  | "rnb"
  | "latin"
  | "dancehall"
  | "electronic"
  | "pop";

export type CatalogKind = "charts" | "trending" | "fresh";

export type Track = {
  id: number;
  title: string;
  artist: string;
  artistSlug: string;
  slug: string;
  type: "song" | "album" | "playlist";
  image: string;
  duration: number;
  plays: string;
  genre: string;
  featuring: string;
  album: string;
  waveform: number[];
  explicit: boolean;
  verified: boolean;
};

export const GENRES: { id: GenreId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "rap", label: "Rap" },
  { id: "afrobeats", label: "Afrobeats" },
  { id: "rnb", label: "R&B" },
  { id: "latin", label: "Latin" },
  { id: "dancehall", label: "Dancehall" },
  { id: "electronic", label: "Electronic" },
  { id: "pop", label: "Pop" },
];
