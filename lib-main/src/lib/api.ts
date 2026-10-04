/* Data layer — open, CORS-enabled catalogs:
   Books  → Open Library (openlibrary.org)  + Internet Archive identifiers
   Papers → CrossRef (api.crossref.org)     + Unpaywall open-access PDFs      */

export type Mode = "books" | "articles";

export type Book = {
  id: string;
  title: string;
  authors: string[];
  year?: number;
  publisher?: string;
  editions: number;
  cover?: number;
  ia: string[];
  langs: string[];
  pages?: number;
  ebook?: string; // no_ebook | unclassified | borrowable | public
  subjects: string[];
};

export type Article = {
  doi: string;
  title: string;
  authors: string[];
  journal?: string;
  year?: number;
  type?: string;
  publisher?: string;
};

export type BookFilters = {
  lang: string; // "" = any
  sort: "relevance" | "editions" | "new" | "old" | "rating";
  ebookOnly: boolean;
};

const OL_FIELDS =
  "key,title,author_name,first_publish_year,language,edition_count,cover_i,ia,publisher,ebook_access,number_of_pages_median,subject";

export async function searchBooks(
  q: string,
  page: number,
  filters: BookFilters,
  signal?: AbortSignal
): Promise<{ items: Book[]; total: number; page: number }> {
  const params = new URLSearchParams({
    q: filters.ebookOnly ? `${q} has_fulltext:true` : q,
    page: String(page),
    limit: "18",
    fields: OL_FIELDS,
  });
  if (filters.lang) params.set("language", filters.lang);
  if (filters.sort !== "relevance") params.set("sort", filters.sort);

  const res = await fetch(`https://openlibrary.org/search.json?${params.toString()}`, { signal });
  if (!res.ok) throw new Error(`Open Library responded ${res.status}`);
  const data = await res.json();

  const items: Book[] = (data.docs ?? []).map((d: any) => ({
    id: d.key as string,
    title: (d.title ?? "Untitled") as string,
    authors: (d.author_name ?? []) as string[],
    year: d.first_publish_year ?? undefined,
    publisher: d.publisher?.[0],
    editions: d.edition_count ?? 0,
    cover: d.cover_i ?? undefined,
    ia: (d.ia ?? []).slice(0, 2),
    langs: (d.language ?? []).slice(0, 3),
    pages: d.number_of_pages_median ?? undefined,
    ebook: d.ebook_access ?? "no_ebook",
    subjects: (d.subject ?? []).slice(0, 4),
  }));

  return { items, total: data.numFound ?? 0, page: data.page ?? page };
}

/** Fetch similar books by mining the subject + author of a seed book. */
export type BookDetail = {
  description?: string;
  subjects: string[];
  pages?: number;
  firstSentence?: string;
};

/** Fetch detailed info (summary, subjects, etc.) for a book by its Open Library key. */
export async function fetchBookDetail(
  key: string,
  signal?: AbortSignal
): Promise<BookDetail | null> {
  try {
    const res = await fetch(`https://openlibrary.org${key}.json`, { signal });
    if (!res.ok) return null;
    const work = await res.json();

    // Description can be a string or { type: "/type/text", value: "..." }
    let description: string | undefined;
    if (typeof work.description === "string") {
      description = work.description;
    } else if (work.description?.value) {
      description = work.description.value;
    }

    // First sentence
    let firstSentence: string | undefined;
    if (typeof work.first_sentence === "string") {
      firstSentence = work.first_sentence;
    } else if (work.first_sentence?.value) {
      firstSentence = work.first_sentence.value;
    }

    const subjects: string[] = Array.isArray(work.subjects)
      ? work.subjects.slice(0, 12)
      : [];

    return {
      description,
      subjects,
      pages: work.number_of_pages ?? undefined,
      firstSentence,
    };
  } catch {
    return null;
  }
}

export async function searchSimilar(
  book: Book,
  signal?: AbortSignal
): Promise<Book[]> {
  // Build a query from subjects and the primary author — both are strong signals.
  const parts: string[] = [];
  if (book.subjects.length > 0) parts.push(`subject:${book.subjects[0]}`);
  if (book.authors[0]) parts.push(`author:${book.authors[0]}`);
  const q = parts.length > 0 ? parts.join(" OR ") : book.title;

  const params = new URLSearchParams({
    q,
    limit: "8",
    fields: OL_FIELDS,
  });

  const res = await fetch(`https://openlibrary.org/search.json?${params.toString()}`, { signal });
  if (!res.ok) return [];
  const data = await res.json();

  const items: Book[] = (data.docs ?? [])
    .filter((d: any) => d.key !== book.id) // exclude the seed
    .slice(0, 6)
    .map((d: any) => ({
      id: d.key as string,
      title: (d.title ?? "Untitled") as string,
      authors: (d.author_name ?? []) as string[],
      year: d.first_publish_year ?? undefined,
      publisher: d.publisher?.[0],
      editions: d.edition_count ?? 0,
      cover: d.cover_i ?? undefined,
      ia: (d.ia ?? []).slice(0, 2),
      langs: (d.language ?? []).slice(0, 3),
      pages: d.number_of_pages_median ?? undefined,
      ebook: d.ebook_access ?? "no_ebook",
      subjects: (d.subject ?? []).slice(0, 4),
    }));

  return items;
}

export async function searchArticles(
  q: string,
  page: number,
  signal?: AbortSignal
): Promise<{ items: Article[]; total: number }> {
  const rows = 12;
  const params = new URLSearchParams({
    "query.bibliographic": q,
    rows: String(rows),
    offset: String((page - 1) * rows),
    select: "DOI,title,author,container-title,published-print,published-online,URL,type,publisher",
    sort: "relevance",
    mailto: "bibliotheke-web@example.org",
  });
  const res = await fetch(`https://api.crossref.org/works?${params.toString()}`, { signal });
  if (!res.ok) throw new Error(`CrossRef responded ${res.status}`);
  const data = await res.json();
  const msg = data.message ?? {};

  const items: Article[] = (msg.items ?? []).map((w: any) => {
    const date = w["published-print"] ?? w["published-online"];
    const year = date?.["date-parts"]?.[0]?.[0];
    return {
      doi: w.DOI as string,
      title: (w.title?.[0] ?? "Untitled work").toString(),
      authors: (w.author ?? [])
        .map((a: any) => [a.given, a.family].filter(Boolean).join(" "))
        .filter(Boolean),
      journal: w["container-title"]?.[0],
      year: typeof year === "number" ? year : undefined,
      type: w.type,
      publisher: w.publisher,
    };
  });

  return { items, total: msg["total-results"] ?? 0 };
}

/** Ask Unpaywall for the best open-access copy of a DOI. Returns a URL or null. */
export async function findOaPdf(doi: string): Promise<string | null> {
  const res = await fetch(
    `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=bibliotheke-web@example.org`
  );
  if (!res.ok) return null;
  const data = await res.json();
  const loc = data.best_oa_location;
  return (loc?.url_for_pdf || loc?.url || data.primary_location?.landing_page_url) ?? null;
}

/* ---------- outbound source links ---------- */

export const archiveUrl = (iaId: string) => `https://archive.org/details/${iaId}`;
export const olUrl = (key: string) => `https://openlibrary.org${key}`;
export const doiUrl = (doi: string) => `https://doi.org/${doi}`;

/** Build a `+`-joined query from a book's title and first author. */
export const bookQuery = (b: Book): string => {
  const author = b.authors[0] ?? "";
  return `${b.title} ${author}`.trim();
};

export const googleSearchUrl = (b: Book) =>
  `https://www.google.com/search?udm=36&q=${encodeURIComponent(bookQuery(b))}`;

export const googleBooksUrl = (b: Book) =>
  `https://books.google.com/books?q=${encodeURIComponent(bookQuery(b))}`;

export const annasUrl = (b: Book) =>
  `https://annas-archive.gl/search?index=&page=1&sort=&display=&q=${encodeURIComponent(
    bookQuery(b)
  )}&check=1`;

export const zLibraryUrl = (b: Book) =>
  `https://z-library.sk/s/${encodeURIComponent(bookQuery(b))}`;

/* ---------- citations ---------- */

export function citeBook(b: Book): string {
  const who = b.authors.slice(0, 3).join(", ") || "Unknown author";
  const yr = b.year ? ` (${b.year})` : "";
  const pub = b.publisher ? ` ${b.publisher}.` : "";
  return `${who}${yr}. ${b.title}.${pub}`;
}

export function citeArticle(a: Article): string {
  const who = a.authors.slice(0, 3).join(", ") || "Unknown authors";
  const yr = a.year ? ` (${a.year})` : "";
  const where = a.journal ? ` ${a.journal}.` : "";
  return `${who}${yr}. ${a.title}.${where} doi:${a.doi}`;
}

/* ---------- language codes (ISO 639-2, Open Library style) ---------- */

export const LANGS: Record<string, string> = {
  eng: "English",
  fre: "French",
  ger: "German",
  spa: "Spanish",
  ita: "Italian",
  por: "Portuguese",
  rus: "Russian",
  chi: "Chinese",
  jpn: "Japanese",
  ara: "Arabic",
  hin: "Hindi",
  dut: "Dutch",
  kor: "Korean",
  pol: "Polish",
};

export const langName = (code: string) => LANGS[code] ?? code.toUpperCase();
