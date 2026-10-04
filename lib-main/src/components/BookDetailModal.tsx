import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Book, BookDetail } from "../lib/api";
import { fetchBookDetail } from "../lib/api";
import {
  IconBook,
  IconChevron,
  IconDownload,
  IconExternal,
  IconFileDown,
  IconGlobe,
  IconSearch,
  IconX,
} from "./icons";
import {
  annasUrl,
  archiveUrl,
  googleBooksUrl,
  googleSearchUrl,
  olUrl,
  zLibraryUrl,
} from "../lib/api";

type MenuItem = { label: string; sub: string; href: string; icon: React.ReactNode };

// Filter out "Contains" and "Also contained in" sections from descriptions
function filterDescription(description: string): string {
  // Remove "Contains:" section and everything after it until next section or end
  let filtered = description.replace(/Contains:[\s\S]*?(?=\n\n[A-Z]|$)/g, "");
  
  // Remove "Also contained in:" section and everything after it
  filtered = filtered.replace(/Also contained in:[\s\S]*?(?=\n\n[A-Z]|$)/g, "");
  
  // Clean up extra whitespace
  filtered = filtered.replace(/\n{3,}/g, "\n\n").trim();
  
  return filtered;
}

export function BookDetailModal({
  book,
  onClose,
}: {
  book: Book;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Initialize modal position (centered)
  useEffect(() => {
    if (modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      setPosition({
        x: (window.innerWidth - rect.width) / 2,
        y: Math.max(20, (window.innerHeight - rect.height) / 2),
      });
    }
  }, []);

  // Fetch book details
  useEffect(() => {
    const ctl = new AbortController();
    setLoading(true);
    fetchBookDetail(book.id, ctl.signal).then((d) => {
      setDetail(d);
      setLoading(false);
    });
    return () => ctl.abort();
  }, [book.id]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    
    // Calculate scrollbar width to prevent layout shift
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollBarWidth}px`;
    
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, []);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!modalRef.current) return;
    const rect = modalRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Keep modal within viewport bounds
    const maxX = window.innerWidth - 100;
    const maxY = window.innerHeight - 100;
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global mouse up handler to stop dragging even if mouse leaves modal
  useEffect(() => {
    if (!isDragging) return;
    
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  // Download menu items
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

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-ink-950/60"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className={`fixed z-[10000] flex flex-col rounded-2xl border border-line bg-card shadow-[0_20px_60px_rgba(12,31,49,0.4)] ${
          isDragging ? 'cursor-grabbing' : ''
        }`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: 'min(700px, calc(100vw - 40px))',
          maxHeight: 'calc(100vh - 40px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Draggable Header */}
        <div
          ref={headerRef}
          className={`flex items-center justify-between border-b border-line px-6 py-4 ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-royal-soft">
              <IconBook width={16} height={16} className="text-royal" />
            </div>
            <h2 className="font-display text-lg font-semibold text-ink-900">
              Book Details
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-click flex h-8 w-8 items-center justify-center rounded-full border border-line bg-card text-faint transition-all hover:border-rust hover:text-rust"
            aria-label="Close"
          >
            <IconX width={16} height={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Header with cover and title */}
          <div className="flex flex-col gap-5 border-b border-line p-6 sm:flex-row sm:gap-6">
          {/* Large cover */}
          <div className="flex-shrink-0">
            {book.cover ? (
              <img
                src={`https://covers.openlibrary.org/b/id/${book.cover}-L.jpg`}
                alt={`Cover of ${book.title}`}
                className="h-[200px] w-[140px] rounded-lg object-cover shadow-[3px_5px_0_rgba(12,31,49,0.16)] ring-1 ring-black/10 sm:h-[240px] sm:w-[160px]"
              />
            ) : (
              <div className="flex h-[200px] w-[140px] flex-col items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-ink-700 to-ink-950 shadow-[3px_5px_0_rgba(12,31,49,0.16)] sm:h-[240px] sm:w-[160px]">
                <span className="font-display text-5xl font-semibold text-acc">
                  {book.title.charAt(0)}
                </span>
                <span className="px-2 text-center font-mono text-[9px] uppercase leading-tight tracking-wider text-paper/60">
                  {book.title.slice(0, 40)}
                </span>
              </div>
            )}
          </div>

          {/* Title and metadata */}
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-2xl font-semibold leading-tight text-ink-900 sm:text-3xl">
              {book.title}
            </h2>
            {book.authors.length > 0 && (
              <p className="mt-2 text-base font-medium text-body">
                by {book.authors.slice(0, 5).join(", ")}
                {book.authors.length > 5 ? " et al." : ""}
              </p>
            )}

            {/* Metadata grid */}
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              {book.year && (
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-faint">
                    Published
                  </p>
                  <p className="text-sm font-semibold text-ink-900">{book.year}</p>
                </div>
              )}
              {book.publisher && (
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-faint">
                    Publisher
                  </p>
                  <p className="truncate text-sm font-semibold text-ink-900">
                    {book.publisher}
                  </p>
                </div>
              )}
              {book.pages && (
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-faint">
                    Pages
                  </p>
                  <p className="text-sm font-semibold text-ink-900">{book.pages}</p>
                </div>
              )}
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-faint">
                  Editions
                </p>
                <p className="text-sm font-semibold text-ink-900">
                  {book.editions.toLocaleString()}
                </p>
              </div>
              {book.langs.length > 0 && (
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-faint">
                    Languages
                  </p>
                  <p className="text-sm font-semibold text-ink-900">
                    {book.langs.slice(0, 3).join(", ").toUpperCase()}
                  </p>
                </div>
              )}
              {book.ebook && book.ebook !== "no_ebook" && (
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-faint">
                    Format
                  </p>
                  <p className="text-sm font-semibold text-ink-900 capitalize">
                    {book.ebook}
                  </p>
                </div>
              )}
            </div>

            {/* Download button */}
            <div className="mt-5 relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-lg bg-moss px-4 py-2 text-sm font-bold text-white shadow-[0_4px_14px_rgba(47,158,99,0.35)] transition-all hover:bg-[#278a55] active:brightness-90"
              >
                <IconDownload width={14} height={14} />
                {book.ia.length > 0 ? "Download" : "Find Sources"}
                <IconChevron
                  width={12}
                  height={12}
                  className={`transition-transform duration-150 ${menuOpen ? "rotate-180" : ""}`}
                />
              </button>
              {menuOpen && (
                <div className="animate-pop-in absolute left-0 top-full z-[10001] mt-2 w-[260px] rounded-xl border border-line bg-card p-1.5 shadow-[0_18px_50px_rgba(12,31,49,0.22)]">
                  {items.map((it) => (
                    <a
                      key={it.label}
                      href={it.href}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setMenuOpen(false)}
                      className="group/item flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-royal-soft/60"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-royal-soft text-royal">
                        {it.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[12px] font-semibold text-ink-900 group-hover/item:text-royal-deep">
                          {it.label}
                        </span>
                        <span className="block truncate font-mono text-[9px] text-faint">
                          {it.sub}
                        </span>
                      </span>
                      <IconExternal
                        width={11}
                        height={11}
                        className="ml-auto mt-1 shrink-0 text-faint opacity-0 transition-opacity group-hover/item:opacity-100"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description / Summary */}
        <div className="p-6">
          {loading ? (
            <div className="space-y-3">
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-3/4 rounded" />
            </div>
          ) : detail?.description ? (
            <div>
              <h3 className="mb-3 font-display text-lg font-semibold text-ink-900">
                Summary
              </h3>
              <p className="text-sm leading-relaxed text-body whitespace-pre-wrap">
                {filterDescription(detail.description)}
              </p>
            </div>
          ) : detail?.firstSentence ? (
            <div>
              <h3 className="mb-3 font-display text-lg font-semibold text-ink-900">
                First Line
              </h3>
              <p className="text-sm italic leading-relaxed text-body">
                "{detail.firstSentence}"
              </p>
            </div>
          ) : (
            <p className="text-sm italic text-faint">
              No summary available for this book.
            </p>
          )}

          {/* Subjects */}
          {detail?.subjects && detail.subjects.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 font-display text-lg font-semibold text-ink-900">
                Subjects
              </h3>
              <div className="flex flex-wrap gap-2">
                {detail.subjects.map((subject) => (
                  <span
                    key={subject}
                    className="rounded-md border border-line bg-paper px-2.5 py-1 text-xs font-medium text-body"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            </div>
          )}


        </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
