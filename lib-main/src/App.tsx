import { useCallback, useEffect, useRef, useState } from "react";
import type { Article, Book, BookFilters, Mode } from "./lib/api";
import { searchArticles, searchBooks } from "./lib/api";
import { Masthead, StickyBar } from "./components/masthead";
import { Results } from "./components/results";
import { Info } from "./components/info";
import { LibraryCard } from "./components/LibraryCard";
import { IconCheck } from "./components/icons";
import { useDebouncedValue, usePerfMode, getCached, setCached } from "./lib/perf";
import { useSavedBooks } from "./lib/storage";
import { unlockAudio } from "./lib/sound";

const DEFAULT_FILTERS: BookFilters = { lang: "", sort: "relevance", ebookOnly: false };
const ECOSYSTEM = import.meta.env.BASE_URL === "/lib/";
const PRELOAD = new URLSearchParams(window.location.search).get("q")?.trim().slice(0,300) || "sherlock holmes";
const RECENT_KEY = "bibliotheke-recent";
const DEBOUNCE_MS = 500;

function loadRecent(): string[] {
  if (ECOSYSTEM) return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [mode, setMode] = useState<Mode>("books");
  const [query, setQuery] = useState(PRELOAD);
  const [active, setActive] = useState<{ mode: Mode; q: string }>({ mode: "books", q: PRELOAD });
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<BookFilters>(DEFAULT_FILTERS);

  const [books, setBooks] = useState<Book[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [recent, setRecent] = useState<string[]>(loadRecent);
  const [toast, setToast] = useState<{ id: number; msg: string } | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const [perfMode, setPerfMode] = usePerfMode();
  const { saved, isSaved, toggleSave, removeSaved, count: savedCount } = useSavedBooks();
  const [lastStamp, setLastStamp] = useState<"SAVED" | "ARCHIVED" | "CHECKED OUT" | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const stickyRef = useRef<HTMLInputElement>(null);
  const reqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const scrolledRef = useRef(false);

  // Debounce the query for auto-search (but we still use manual search on submit)
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);

  /* ---------- Fetch orchestration with caching ---------- */

  const run = useCallback(async (m: Mode, q: string, p: number, f: BookFilters) => {
    const id = ++reqRef.current;
    const cacheKey = `${m}|${q}|${p}|${f.lang}|${f.sort}|${f.ebookOnly}`;

    // Check cache first
    const cached = getCached<{ books: Book[]; articles: Article[]; total: number }>(cacheKey);
    if (cached) {
      setBooks(cached.books);
      setArticles(cached.articles);
      setTotal(cached.total);
      setLoading(false);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    setLoading(true);
    setError(null);

    try {
      if (m === "books") {
        const r = await searchBooks(q, p, f, ctl.signal);
        if (id !== reqRef.current) return;
        setBooks(r.items);
        setArticles([]);
        setTotal(r.total);
        setCached(cacheKey, { books: r.items, articles: [], total: r.total });
      } else {
        const r = await searchArticles(q, p, ctl.signal);
        if (id !== reqRef.current) return;
        setArticles(r.items);
        setBooks([]);
        setTotal(r.total);
        setCached(cacheKey, { books: [], articles: r.items, total: r.total });
      }
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (id !== reqRef.current || e?.name === "AbortError") return;
      setBooks([]);
      setArticles([]);
      setTotal(0);
      setError(e?.message ?? "Network error — check your connection and retry.");
    } finally {
      if (id === reqRef.current) setLoading(false);
    }
  }, []);

  // Preload
  useEffect(() => {
    run("books", PRELOAD, 1, DEFAULT_FILTERS);
  }, [run]);

  useEffect(() => {
    if (!ECOSYSTEM) return;
    let active = true;
    fetch("/api/ecosystem/history").then(async response => {
      if (!response.ok) throw new Error("History unavailable");
      const rows = await response.json() as { app: string; query: string }[];
      if (active) setRecent(rows.filter(r => r.app === "lib").map(r => r.query).slice(0,6));
    }).catch(() => { if (active) setToast({id:Date.now(), msg:"Saved searches are unavailable. You can still search."}); });
    return () => { active = false; };
  }, []);

  /* ---------- Actions ---------- */

  const showToast = useCallback((msg: string) => setToast({ id: Date.now(), msg }), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (ECOSYSTEM) return;
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    } catch {
      /* ignore */
    }
  }, [recent]);

  const search = useCallback(
    (raw: string, m: Mode = mode) => {
      const q = raw.trim();
      if (!q) return;
      if (ECOSYSTEM) void fetch("/api/ecosystem/history", {
        method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({app:"lib",query:q})
      }).then(r => { if(!r.ok) throw new Error("save failed"); }).catch(() => showToast("Search worked, but history could not be saved. Please check your sign-in."));
      setQuery(q);
      setActive({ mode: m, q });
      setPage(1);
      setRecent((r) => [q, ...r.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 6));
      run(m, q, 1, filters);
      requestAnimationFrame(() => {
        document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [mode, filters, run, showToast]
  );

  const switchMode = useCallback(
    (m: Mode) => {
      if (m === mode) return;
      setMode(m);
      setActive((a) => ({ mode: m, q: a.q }));
      setPage(1);
      run(m, active.q, 1, filters);
    },
    [mode, active.q, filters, run]
  );

  const gotoPage = useCallback(
    (p: number) => {
      setPage(p);
      run(mode, active.q, p, filters);
      requestAnimationFrame(() => {
        document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [mode, active.q, filters, run]
  );

  const applyFilters = useCallback(
    (f: BookFilters) => {
      setFilters(f);
      setPage(1);
      run(mode, active.q, 1, f);
    },
    [mode, active.q, run]
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
    run(mode, active.q, 1, DEFAULT_FILTERS);
  }, [mode, active.q, run]);

  const handleToggleSave = useCallback(
    (book: Book) => {
      const wasSaved = isSaved(book.id);
      const nowSaved = toggleSave(book);
      if (nowSaved) {
        setLastStamp("SAVED");
      } else if (wasSaved) {
        setLastStamp("ARCHIVED");
      }
      // Clear stamp after animation
      setTimeout(() => setLastStamp(null), 1300);
    },
    [isSaved, toggleSave]
  );

  /* ---------- Chrome: sticky bar + "/" shortcut ---------- */

  useEffect(() => {
    const onScroll = () => {
      const past = window.scrollY > 500;
      scrolledRef.current = past;
      setScrolled(past);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      e.preventDefault();
      (scrolledRef.current ? stickyRef.current : inputRef.current)?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Unlock audio on first user interaction
  useEffect(() => {
    const handler = () => {
      unlockAudio();
      window.removeEventListener("click", handler);
      window.removeEventListener("keydown", handler);
    };
    window.addEventListener("click", handler);
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("keydown", handler);
    };
  }, []);

  /* ---------- Render ---------- */

  return (
    <div id="top" className={`min-h-screen bg-paper font-body text-ink-900 ${perfMode ? "perf-mode" : ""}`}>
      <Masthead
        mode={mode}
        onMode={switchMode}
        query={query}
        onQuery={setQuery}
        onSearch={search}
        recent={recent}
        onClearRecent={() => {
          if (ECOSYSTEM) {
            void fetch("/api/ecosystem/history?app=lib", { method: "DELETE" }).then(r => {
              if (!r.ok) throw new Error("Clear failed");
              setRecent([]); showToast("Recent Lib searches cleared");
            }).catch(() => showToast("Could not clear your saved searches. Please try again."));
          } else { setRecent([]); showToast("Recent searches cleared"); }
        }}
        inputRef={inputRef}
        perfMode={perfMode}
        onPerfMode={setPerfMode}
      />

      <StickyBar
        visible={scrolled}
        mode={mode}
        onMode={switchMode}
        query={query}
        onQuery={setQuery}
        onSearch={search}
        stickyRef={stickyRef}
      />

      <Results
        mode={mode}
        onMode={switchMode}
        loading={loading}
        error={error}
        query={active.q}
        page={page}
        total={total}
        books={books}
        articles={articles}
        filters={filters}
        onFilters={applyFilters}
        onPage={gotoPage}
        onRetry={() => run(mode, active.q, page, filters)}
        onReset={resetFilters}
        onToast={showToast}
        isSaved={isSaved}
        onToggleSave={handleToggleSave}
      />

      <Info onToast={showToast} />

      <LibraryCard count={savedCount} lastAction={lastStamp} saved={saved} onRemove={removeSaved} />

      {toast && (
        <div
          key={toast.id}
          role="status"
          className="animate-toast-in fixed bottom-4 left-4 z-[80] flex items-center gap-2.5 rounded-lg border border-ink-700 bg-ink-900 px-3.5 py-2.5 text-xs font-semibold text-paper shadow-[0_18px_50px_rgba(0,0,0,0.45)] sm:bottom-6 sm:left-6"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-moss/20 text-moss">
            <IconCheck width={11} height={11} />
          </span>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
