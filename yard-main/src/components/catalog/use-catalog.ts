import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  getChart,
  getFresh,
  getTrending,
  searchTracks,
} from "@/lib/audiomack/fn";
import type { CatalogKind, GenreId, Track } from "@/lib/audiomack/types";

const SUGGESTIONS = [
  "Burna Boy",
  "Wizkid",
  "SZA",
  "Kendrick Lamar",
  "Tems",
  "Travis Scott",
  "Asake",
  "Drake",
];

export function useCatalog(initialChart?: Track[], tab = "listen") {
  const [genre, setGenre] = useState<GenreId>("all");
  const [kind, setKind] = useState<CatalogKind>("charts");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (import.meta.env.BASE_URL === "/yard/") {
      const q = new URLSearchParams(window.location.search).get("q");
      if (q) setQuery(q.slice(0,120));
    }
  }, []);

  useEffect(() => {
    if (import.meta.env.BASE_URL !== "/yard/" || !debounced) return;
    const timer = setTimeout(() => {
      void fetch("/api/ecosystem/history", {method:"POST", headers:{"Content-Type":"application/json"},body:JSON.stringify({app:"yard",query:debounced})})
        .then(r => { if (!r.ok) throw new Error("History not saved"); })
        .catch(() => toast.error("Your search history could not be saved. Please check your sign-in."));
    }, 700);
    return () => clearTimeout(timer);
  }, [debounced]);

  const searching = debounced.length > 0;

  const chart = useQuery({
    queryKey: ["chart", genre],
    enabled: tab === "listen" || (tab === "browse" && kind === "charts"),
    queryFn: () => getChart({ data: { genre } }),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
    initialData: genre === "all" && initialChart?.length ? initialChart : undefined,
  });
  const trending = useQuery({
    queryKey: ["trending", genre],
    enabled: tab === "listen" || (tab === "browse" && kind === "trending"),
    queryFn: () => getTrending({ data: { genre } }),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });
  const fresh = useQuery({
    queryKey: ["fresh", genre],
    enabled: tab === "browse" && kind === "fresh",
    queryFn: () => getFresh({ data: { genre } }),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });
  const results = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => searchTracks({ data: { q: debounced } }),
    enabled: searching && (tab === "search" || tab === "browse"),
    staleTime: 20_000,
  });

  const catalog = useMemo(() => {
    if (kind === "trending") return trending;
    if (kind === "fresh") return fresh;
    return chart;
  }, [kind, chart, trending, fresh]);

  const tracks = searching ? (results.data ?? []) : (catalog.data ?? []);
  const loading = searching ? results.isLoading : catalog.isLoading;
  const error = searching ? results.error : catalog.error;
  const hero = (!searching && kind === "charts" ? tracks[0] : null) ?? null;
  const list = hero ? tracks.slice(1) : tracks;

  return {
    genre,
    setGenre,
    kind,
    setKind,
    query,
    setQuery,
    searching,
    tracks,
    list,
    hero,
    loading,
    error,
    chart,
    trending,
    fresh,
    results,
    suggestions: SUGGESTIONS,
  };
}
