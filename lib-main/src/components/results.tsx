import type { Article, Book, BookFilters, Mode } from "../lib/api";
import {
  citeArticle,
  doiUrl,
  findOaPdf,
  LANGS,
} from "../lib/api";
import {
  IconAlert,
  IconArticle,
  IconCopy,
  IconDownload,
  IconExternal,
  IconFileDown,
  IconQuote,
  IconRefresh,
  IconSearch,
  IconSpinner,
} from "./icons";
import { ModeTabs } from "./masthead";
import { BookCard } from "./BookCard";
import { useState } from "react";

/* ---------- Article row ---------- */

function PdfButton({ article, onToast }: { article: Article; onToast: (m: string) => void }) {
  const [state, setState] = useState<"idle" | "loading" | "found" | "none">("idle");
  const [url, setUrl] = useState<string | null>(null);

  const click = async () => {
    if (state === "loading") return;
    if (state === "found" && url) {
      window.open(url, "_blank", "noopener");
      return;
    }
    if (state === "none") {
      window.open(doiUrl(article.doi), "_blank", "noopener");
      return;
    }
    setState("loading");
    const u = await findOaPdf(article.doi);
    if (u) {
      setUrl(u);
      setState("found");
      onToast("Open-access copy found");
      window.open(u, "_blank", "noopener");
    } else {
      setState("none");
      onToast("No OA copy — opening DOI");
      window.open(doiUrl(article.doi), "_blank", "noopener");
    }
  };

  const style =
    state === "found"
      ? "bg-moss text-white shadow-[0_4px_14px_rgba(47,158,99,0.35)] hover:bg-[#278a55]"
      : state === "none"
        ? "border border-line text-faint hover:border-royal hover:text-royal"
        : "bg-acc text-ink-950 shadow-[0_4px_14px_rgba(240,163,47,0.35)] hover:bg-[#ffbd52]";

  return (
    <button
      type="button"
      onClick={click}
      className={`btn-click flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${style}`}
    >
      {state === "loading" ? (
        <><IconSpinner width={12} height={12} /> Checking…</>
      ) : state === "found" ? (
        <><IconFileDown width={12} height={12} /> Open OA</>
      ) : state === "none" ? (
        <><IconExternal width={12} height={12} /> Open DOI</>
      ) : (
        <><IconDownload width={12} height={12} /> Find PDF</>
      )}
    </button>
  );
}

function ArticleRow({ article, index, onToast }: { article: Article; index: number; onToast: (m: string) => void }) {
  const copyCite = async () => {
    try {
      await navigator.clipboard.writeText(citeArticle(article));
      onToast("Citation copied");
    } catch {
      onToast("Couldn't access clipboard");
    }
  };

  return (
    <li
      className="row-in card-contain group grid grid-cols-1 gap-3 rounded-lg border border-line bg-card p-4 transition-colors hover:bg-royal-soft/40 sm:grid-cols-[1fr_auto] sm:items-center sm:p-4"
      style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-ink-900/5 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-ink-600">
            {article.type ?? "work"}
          </span>
          {article.year && (
            <span className="rounded-md bg-acc-soft px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-acc-deep">
              {article.year}
            </span>
          )}
        </div>
        <h3 className="mt-1 font-display text-[15px] font-semibold leading-snug text-ink-900 transition-colors group-hover:text-royal-deep">
          {article.title}
        </h3>
        {article.authors.length > 0 && (
          <p className="mt-0.5 text-xs font-medium text-body">
            {article.authors.slice(0, 5).join(", ")}
            {article.authors.length > 5 ? " et al." : ""}
          </p>
        )}
        <p className="mt-1 truncate font-mono text-[10px] text-faint">
          {article.journal ? <span className="italic">{article.journal}</span> : "source unknown"}
          <span className="text-line"> · </span>
          doi:{article.doi}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <PdfButton article={article} onToast={onToast} />
        <a
          href={doiUrl(article.doi)}
          target="_blank"
          rel="noreferrer"
          title="Open DOI"
          className="btn-click flex h-7 w-7 items-center justify-center rounded-lg border border-line text-faint transition-all hover:border-royal hover:text-royal active:scale-90"
        >
          <IconExternal width={12} height={12} />
        </a>
        <button
          type="button"
          onClick={copyCite}
          title="Copy citation"
          className="btn-click flex h-7 w-7 items-center justify-center rounded-lg border border-line text-faint transition-all hover:border-royal hover:text-royal active:scale-90"
        >
          <IconQuote width={12} height={12} />
        </button>
      </div>
    </li>
  );
}

/* ---------- Skeletons / empty / error ---------- */

function SkeletonRows() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex gap-4 rounded-lg border border-line bg-card p-4">
          <div className="skeleton aspect-[2/3] h-[140px] w-[93px] shrink-0 rounded" />
          <div className="flex-1 space-y-2.5 py-1">
            <div className="skeleton h-3.5 w-2/3 rounded" />
            <div className="skeleton h-2.5 w-1/3 rounded" />
            <div className="skeleton h-2.5 w-1/2 rounded" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ query, onReset }: { query: string; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-line text-faint">
        <IconSearch width={26} height={26} />
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold text-ink-900">
        Nothing found for "{query}"
      </h3>
      <p className="mt-2 max-w-md text-xs leading-relaxed text-faint">
        Try fewer words, an author's surname, or drop the filters.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="btn-click mt-5 flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2 text-xs font-bold text-paper transition-all hover:-translate-y-0.5 hover:bg-ink-800 active:scale-95"
      >
        <IconRefresh width={13} height={13} /> Clear filters
      </button>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rust-soft text-rust">
        <IconAlert width={28} height={28} />
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold text-ink-900">The catalog hiccuped</h3>
      <p className="mt-2 max-w-md font-mono text-[10px] text-faint">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="btn-click mt-5 flex items-center gap-2 rounded-lg bg-rust px-4 py-2 text-xs font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#a94e2b] active:scale-95"
      >
        <IconRefresh width={13} height={13} /> Retry
      </button>
    </div>
  );
}

/* ---------- Pagination ---------- */

function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  const from = Math.max(1, page - 2);
  const to = Math.min(pages, page + 2);
  const nums: number[] = [];
  for (let i = from; i <= to; i++) nums.push(i);

  const btn =
    "btn-click flex h-8 min-w-8 items-center justify-center rounded-lg border border-line bg-card px-2 font-mono text-[11px] font-semibold text-body transition-all hover:-translate-y-0.5 hover:border-royal hover:text-royal disabled:pointer-events-none disabled:opacity-40";

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
      <button type="button" className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)}>
        ←
      </button>
      {from > 1 && (
        <>
          <button type="button" className={btn} onClick={() => onPage(1)}>1</button>
          {from > 2 && <span className="px-1 font-mono text-[10px] text-faint">…</span>}
        </>
      )}
      {nums.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPage(n)}
          className={`btn-click flex h-8 min-w-8 items-center justify-center rounded-lg px-2 font-mono text-[11px] font-bold transition-all ${
            n === page
              ? "bg-ink-900 text-acc shadow-[0_4px_14px_rgba(12,31,49,0.3)]"
              : "border border-line bg-card text-body hover:-translate-y-0.5 hover:border-royal hover:text-royal"
          }`}
        >
          {n}
        </button>
      ))}
      {to < pages && (
        <>
          {to < pages - 1 && <span className="px-1 font-mono text-[10px] text-faint">…</span>}
          <button type="button" className={btn} onClick={() => onPage(pages)}>
            {pages > 999 ? "999+" : pages}
          </button>
        </>
      )}
      <button type="button" className={btn} disabled={page >= pages} onClick={() => onPage(page + 1)}>
        →
      </button>
    </div>
  );
}

/* ---------- Results section ---------- */

export function Results({
  mode,
  onMode,
  loading,
  error,
  query,
  page,
  total,
  books,
  articles,
  filters,
  onFilters,
  onPage,
  onRetry,
  onReset,
  onToast,
  isSaved,
  onToggleSave,
}: {
  mode: Mode;
  onMode: (m: Mode) => void;
  loading: boolean;
  error: string | null;
  query: string;
  page: number;
  total: number;
  books: Book[];
  articles: Article[];
  filters: BookFilters;
  onFilters: (f: BookFilters) => void;
  onPage: (p: number) => void;
  onRetry: () => void;
  onReset: () => void;
  onToast: (m: string) => void;
  isSaved: (id: string) => boolean;
  onToggleSave: (b: Book) => void;
}) {
  const per = mode === "books" ? 18 : 12;
  const pages = Math.max(1, Math.min(Math.ceil(total / per), 999));
  const filtersDirty = filters.lang !== "" || filters.sort !== "relevance" || filters.ebookOnly;

  const selectCls =
    "h-8 rounded-lg border border-line bg-card px-2 font-mono text-[10px] font-semibold uppercase tracking-wide text-body outline-none transition-colors hover:border-royal focus:border-royal";

  return (
    <section id="catalog" className="relative scroll-mt-16 bg-paper py-12 sm:py-14">
      <div className="pointer-events-none absolute inset-0 halftone opacity-50" />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        {/* Head */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-royal">Catalog</p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
              {loading ? "Consulting the stacks…" : `Results for "${query}"`}
            </h2>
            <p className="mt-1 font-mono text-[10px] text-faint" aria-live="polite">
              {loading
                ? mode === "books"
                  ? "querying openlibrary.org"
                  : "querying api.crossref.org"
                : error
                  ? "request failed"
                  : `${total.toLocaleString()} records · page ${page} of ${pages}`}
            </p>
          </div>
          <ModeTabs mode={mode} onChange={onMode} />
        </div>

        {/* Filters */}
        {mode === "books" ? (
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-card px-3 py-2.5 shadow-sm">
            <span className="font-mono text-[9px] uppercase tracking-widest text-faint">Refine</span>
            <select
              aria-label="Sort results"
              className={selectCls}
              value={filters.sort}
              onChange={(e) => onFilters({ ...filters, sort: e.target.value as BookFilters["sort"] })}
            >
              <option value="relevance">Best match</option>
              <option value="editions">Most editions</option>
              <option value="new">Newest first</option>
              <option value="old">Oldest first</option>
              <option value="rating">Top rated</option>
            </select>
            <select
              aria-label="Language"
              className={selectCls}
              value={filters.lang}
              onChange={(e) => onFilters({ ...filters, lang: e.target.value })}
            >
              <option value="">Any language</option>
              {Object.entries(LANGS).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
            <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs font-medium text-body">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={filters.ebookOnly}
                onChange={(e) => onFilters({ ...filters, ebookOnly: e.target.checked })}
              />
              <span className="relative h-4 w-7 rounded-full bg-line transition-colors peer-checked:bg-moss after:absolute after:left-0.5 after:top-0.5 after:h-3 after:w-3 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-3" />
              Ebooks only
            </label>
            {filtersDirty && (
              <button
                type="button"
                onClick={onReset}
                className="ml-auto font-mono text-[10px] font-semibold uppercase tracking-wide text-rust transition-colors hover:text-[#a94e2b]"
              >
                reset ×
              </button>
            )}
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-3 py-2.5 font-mono text-[10px] text-faint shadow-sm">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-acc-soft text-acc-deep">
              <IconArticle width={11} height={11} />
            </span>
            metadata via <strong className="text-body">CrossRef</strong>
            <span className="text-line">·</span>
            PDF via <strong className="text-body">Unpaywall</strong>
          </div>
        )}

        {/* List */}
        <div className="mt-5 rounded-2xl border border-line bg-card shadow-[0_10px_40px_rgba(12,31,49,0.07)]">
          {loading ? (
            <SkeletonRows />
          ) : error ? (
            <ErrorState message={error} onRetry={onRetry} />
          ) : total === 0 ? (
            <EmptyState query={query} onReset={onReset} />
          ) : mode === "books" ? (
            <ul className="divide-y divide-line">
              {books.map((b, i) => (
                <BookCard
                  key={`${b.id}-${page}-${i}`}
                  book={b}
                  index={i}
                  onToast={onToast}
                  isSaved={isSaved(b.id)}
                  onToggleSave={onToggleSave}
                />
              ))}
            </ul>
          ) : (
            <ul className="divide-y divide-line">
              {articles.map((a, i) => (
                <ArticleRow key={`${a.doi}-${i}`} article={a} index={i} onToast={onToast} />
              ))}
            </ul>
          )}
        </div>

        {!loading && !error && total > 0 && (
          <p className="mt-3 text-center font-mono text-[9px] uppercase tracking-[0.25em] text-faint">
            {mode === "books" ? "covers & records · open library" : "metadata · crossref / unpaywall"}
          </p>
        )}

        <Pagination page={page} pages={pages} onPage={onPage} />
      </div>
    </section>
  );
}
