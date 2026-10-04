import { memo, useEffect, useRef, useState } from "react";
import type { Book } from "../lib/api";
import {
  annasUrl,
  archiveUrl,
  citeBook,
  googleBooksUrl,
  googleSearchUrl,
  olUrl,
  searchSimilar,
  zLibraryUrl,
} from "../lib/api";
import {
  IconBook,
  IconChevron,
  IconCopy,
  IconDownload,
  IconExternal,
  IconFileDown,
  IconGlobe,
  IconSave,
  IconSearch,
  IconSparkle,
} from "./icons";
import { BookDetailModal } from "./BookDetailModal";

/* ---------- Cover with lazy loading + fallback ---------- */

function Cover({ book }: { book: Book }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const showImg = !!book.cover && !failed;

  return (
    <div className="book-shake relative aspect-[2/3] h-[140px] shrink-0 overflow-hidden rounded-[4px] bg-ink-800 shadow-[3px_5px_0_rgba(12,31,49,0.16)] ring-1 ring-black/10">
      {showImg ? (
        <img
          src={`https://covers.openlibrary.org/b/id/${book.cover}-M.jpg`}
          alt={`Cover of ${book.title}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-ink-700 to-ink-950">
          <span className="font-display text-3xl font-semibold text-acc">{book.title.charAt(0)}</span>
          <span className="px-1.5 text-center font-mono text-[7px] uppercase leading-tight tracking-wider text-paper/60">
            {book.title.slice(0, 30)}
          </span>
        </div>
      )}
    </div>
  );
}

/* ---------- Download menu ---------- */

type MenuItem = { label: string; sub: string; href: string; icon: React.ReactNode };

function DownloadMenu({ book, open, setOpen }: { book: Book; open: boolean; setOpen: (o: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  const items: MenuItem[] = [];
  if (book.ia.length > 0) {
    items.push({
      label: "Internet Archive",
      sub: `${book.ia[0]} · PDF · EPUB`,
      href: archiveUrl(book.ia[0]),
      icon: <IconFileDown width={14} height={14} />,
    });
  }
  items.push(
    {
      label: "Google Search",
      sub: "web results with author",
      href: googleSearchUrl(book),
      icon: <IconSearch width={14} height={14} />,
    },
    {
      label: "Google Books",
      sub: "preview & publisher links",
      href: googleBooksUrl(book),
      icon: <IconBook width={14} height={14} />,
    },
    {
      label: "Anna's Archive",
      sub: "shadow-library aggregator",
      href: annasUrl(book),
      icon: <IconGlobe width={14} height={14} />,
    },
    {
      label: "Z-Library",
      sub: "z-library.sk portal",
      href: zLibraryUrl(book),
      icon: <IconExternal width={14} height={14} />,
    },
    {
      label: "Open Library",
      sub: "borrow & preview editions",
      href: olUrl(book.id),
      icon: <IconBook width={14} height={14} />,
    }
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="btn-click flex items-center gap-2 rounded-lg bg-moss px-3 py-1.5 text-xs font-bold text-white shadow-[0_4px_14px_rgba(47,158,99,0.35)] transition-all hover:bg-[#278a55] active:scale-95"
      >
        <IconDownload width={13} height={13} />
        {book.ia.length > 0 ? "Download" : "Sources"}
        <IconChevron width={11} height={11} className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="animate-pop-in absolute left-0 top-full z-[500] mt-2 w-[260px] max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-card p-1.5 shadow-[0_18px_50px_rgba(12,31,49,0.22)] sm:left-auto sm:right-0">
          {items.map((it) => (
            <a
              key={it.label}
              href={it.href}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="group/item flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-royal-soft/60"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-royal-soft text-royal">
                {it.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold text-ink-900 group-hover/item:text-royal-deep">
                  {it.label}
                </span>
                <span className="block truncate font-mono text-[9px] text-faint">{it.sub}</span>
              </span>
              <IconExternal width={11} height={11} className="ml-auto mt-1 shrink-0 text-faint opacity-0 transition-opacity group-hover/item:opacity-100" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Similar books section ---------- */

const SimilarBookCard = memo(function SimilarBookCard({ book }: { book: Book }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const items: MenuItem[] = [
    {
      label: "Google Search",
      sub: "web results with author",
      href: googleSearchUrl(book),
      icon: <IconSearch width={12} height={12} />,
    },
    {
      label: "Google Books",
      sub: "preview & publisher links",
      href: googleBooksUrl(book),
      icon: <IconBook width={12} height={12} />,
    },
    {
      label: "Anna's Archive",
      sub: "shadow-library aggregator",
      href: annasUrl(book),
      icon: <IconGlobe width={12} height={12} />,
    },
    {
      label: "Z-Library",
      sub: "z-library.sk portal",
      href: zLibraryUrl(book),
      icon: <IconExternal width={12} height={12} />,
    },
    {
      label: "Open Library",
      sub: "borrow & preview editions",
      href: olUrl(book.id),
      icon: <IconBook width={12} height={12} />,
    },
  ];

  return (
    <>
      <div className={`relative flex flex-col gap-1.5 rounded-lg border border-line bg-card p-2 transition-all hover:border-acc hover:shadow-[0_8px_20px_rgba(240,163,47,0.15)] ${menuOpen ? "z-30" : ""}`}>
        <button
          type="button"
          onClick={() => setShowDetail(true)}
          className="group/simcover relative cursor-pointer focus-ring"
          aria-label={`View details for ${book.title}`}
        >
          <div className="relative aspect-[2/3] w-full overflow-hidden rounded bg-ink-800">
            {book.cover ? (
              <img
                src={`https://covers.openlibrary.org/b/id/${book.cover}-M.jpg`}
                alt={book.title}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ink-700 to-ink-950">
                <span className="font-display text-xl font-semibold text-acc">{book.title.charAt(0)}</span>
              </div>
            )}
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded bg-ink-950/0 transition-colors duration-200 group-hover/simcover:bg-ink-950/40">
              <span className="rounded-full bg-acc px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-ink-950 opacity-0 transition-opacity duration-200 group-hover/simcover:opacity-100">
                View Info
              </span>
            </span>
          </div>
        </button>
        <div className="flex flex-col flex-1">
          <button
            type="button"
            onClick={() => setShowDetail(true)}
            className="text-left cursor-pointer focus-ring"
          >
            <p className="line-clamp-2 text-[10px] font-semibold leading-tight text-ink-900 hover:text-royal-deep">
              {book.title}
            </p>
          </button>
          {book.authors[0] && (
            <p className="truncate text-[9px] text-faint">{book.authors[0]}</p>
          )}
        </div>
      {/* Compact download menu */}
      <div className="relative mt-auto" ref={ref}>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="btn-click flex w-full items-center justify-center gap-1 rounded-md border border-line bg-card px-2 py-1 text-[9px] font-semibold text-faint transition-colors hover:border-acc hover:text-acc"
        >
          <IconDownload width={10} height={10} />
          Download
          <IconChevron width={9} height={9} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
        </button>
        {menuOpen && (
          <div className="animate-pop-in absolute bottom-full left-0 z-[500] mb-1 w-[200px] rounded-lg border border-line bg-card p-1 shadow-[0_8px_20px_rgba(12,31,49,0.15)]">
            {items.map((it) => (
              <a
                key={it.label}
                href={it.href}
                target="_blank"
                rel="noreferrer"
                onClick={() => setMenuOpen(false)}
                className="group/item flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-royal-soft/60"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-royal-soft text-royal">
                  {it.icon}
                </span>
                <span className="text-[10px] font-semibold text-ink-900 group-hover/item:text-royal-deep">
                  {it.label}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
    {showDetail && (
      <BookDetailModal book={book} onClose={() => setShowDetail(false)} />
    )}
    </>
  );
});

function SimilarBooks({ seed, onToast }: { seed: Book; onToast: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const toggle = async () => {
    if (!open) {
      setOpen(true);
      if (books.length === 0) {
        setLoading(true);
        abortRef.current?.abort();
        const ctl = new AbortController();
        abortRef.current = ctl;
        try {
          const similar = await searchSimilar(seed, ctl.signal);
          setBooks(similar);
          if (similar.length === 0) {
            onToast("No similar books found");
          }
        } catch {
          /* ignore abort */
        } finally {
          setLoading(false);
        }
      }
    } else {
      setOpen(false);
    }
  };

  return (
    <div className="mt-3 border-t border-line pt-3">
      <button
        type="button"
        onClick={toggle}
        className="btn-click flex items-center gap-2 rounded-lg border border-line bg-card px-2.5 py-1 text-[11px] font-semibold text-faint transition-all hover:border-acc hover:text-acc-deep focus-ring"
      >
        <IconSparkle width={11} height={11} />
        {open ? "Hide similar" : "More Like This"}
        <IconChevron width={10} height={10} className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="similar-expand mt-3 overflow-visible" style={{ contentVisibility: 'auto' }}>
          <div className="grid grid-cols-3 gap-3 items-stretch sm:grid-cols-4 md:grid-cols-6">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="skeleton aspect-[2/3] w-full rounded" />
                  <div className="skeleton h-2.5 w-3/4 rounded" />
                  <div className="skeleton h-2 w-1/2 rounded" />
                </div>
              ))
            ) : books.length === 0 ? (
              <p className="col-span-full py-3 text-center font-mono text-[10px] text-faint">
                No similar books found for this seed.
              </p>
            ) : (
              books.map((b) => <SimilarBookCard key={b.id} book={b} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Main BookCard ---------- */

export const BookCard = memo(function BookCard({
  book,
  index,
  onToast,
  isSaved,
  onToggleSave,
}: {
  book: Book;
  index: number;
  onToast: (m: string) => void;
  isSaved: boolean;
  onToggleSave: (b: Book) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const copyCite = async () => {
    try {
      await navigator.clipboard.writeText(citeBook(book));
      onToast("Citation copied");
    } catch {
      onToast("Couldn't access clipboard");
    }
  };

  return (
    <>
    <li
      className={`book-lift row-in group relative grid grid-cols-[93px_1fr] gap-4 rounded-lg border border-line bg-card p-4 transition-colors hover:border-royal/40 sm:grid-cols-[93px_1fr_auto] sm:gap-5 sm:p-5 focus-within:border-royal/40 ${
        menuOpen ? "z-20" : ""
      }`}
      style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
    >        <button
          type="button"
          onClick={() => setShowDetail(true)}
          className="group/cover relative cursor-pointer focus-ring"
          aria-label={`View details for ${book.title}`}
        >
          <div className="relative aspect-[2/3] h-[140px] shrink-0 overflow-hidden rounded-[4px] bg-ink-800 shadow-[3px_5px_0_rgba(12,31,49,0.16)] ring-1 ring-black/10">
            {book.cover ? (
              <img
                src={`https://covers.openlibrary.org/b/id/${book.cover}-M.jpg`}
                alt={`Cover of ${book.title}`}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-ink-700 to-ink-950">
                <span className="font-display text-3xl font-semibold text-acc">{book.title.charAt(0)}</span>
                <span className="px-1.5 text-center font-mono text-[7px] uppercase leading-tight tracking-wider text-paper/60">
                  {book.title.slice(0, 30)}
                </span>
              </div>
            )}
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[4px] bg-ink-950/0 transition-colors duration-200 group-hover/cover:bg-ink-950/40">
              <span className="rounded-full bg-acc px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-ink-950 opacity-0 transition-opacity duration-200 group-hover/cover:opacity-100">
                View Info
              </span>
            </span>
          </div>
        </button>
        <div className="min-w-0">
          <h3 className="font-display text-[16px] font-semibold leading-snug text-ink-900 transition-colors group-hover:text-royal-deep">
            <button
              type="button"
              onClick={() => setShowDetail(true)}
              className="text-left cursor-pointer focus-ring"
            >
              {book.title}
            </button>
          </h3>
        {book.authors.length > 0 && (
          <p className="mt-0.5 text-sm font-medium text-body">{book.authors.slice(0, 4).join(", ")}</p>
        )}
        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wide text-faint">
          {book.year ? book.year : "date n.d."}
          {book.publisher ? ` · ${book.publisher}` : ""}
          {book.pages ? ` · ${book.pages} p.` : ""}
          {` · ${book.editions.toLocaleString()} editions`}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {book.ebook === "public" && (
            <span className="rounded-md bg-moss-soft px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-moss">
              public-domain
            </span>
          )}
          {book.ebook === "borrowable" && (
            <span className="rounded-md bg-royal-soft px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-royal">
              borrowable
            </span>
          )}
          {book.ia.length > 0 && (
            <span className="rounded-md bg-ink-900/5 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-ink-600">
              on archive.org
            </span>
          )}
        </div>

        <SimilarBooks seed={book} onToast={onToast} />
      </div>
      <div className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:flex-col sm:items-end sm:justify-between">
        <DownloadMenu book={book} open={menuOpen} setOpen={setMenuOpen} />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggleSave(book)}
            title={isSaved ? "Remove from library" : "Save to library"}
            className={`btn-click flex h-8 w-8 items-center justify-center rounded-lg border transition-all focus-ring ${
              isSaved
                ? "border-acc bg-acc-soft text-acc-deep"
                : "border-line text-faint hover:border-acc hover:text-acc-deep"
            }`}
          >
            <IconSave width={13} height={13} />
          </button>
          <button
            type="button"
            onClick={copyCite}
            title="Copy citation"
            className="btn-click flex h-8 w-8 items-center justify-center rounded-lg border border-line text-faint transition-all hover:border-royal hover:text-royal focus-ring"
          >
            <IconCopy width={13} height={13} />
          </button>
        </div>
      </div>
    </li>
    {showDetail && (
      <BookDetailModal book={book} onClose={() => setShowDetail(false)} />
    )}
    </>
  );
});
