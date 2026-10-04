import { useCallback, useEffect, useRef, useState } from "react";
import { LogoMark, IconX, IconSparkle } from "./icons";
import { playStampSound, startAmbient, stopAmbient, isAmbientPlaying, unlockAudio } from "../lib/sound";
import type { Book } from "../lib/api";
import { annasUrl, googleBooksUrl, zLibraryUrl, searchBooks } from "../lib/api";

type StampType = "SAVED" | "ARCHIVED" | "CHECKED OUT" | null;

type SavedBook = {
  id: string;
  title: string;
  author: string;
  cover?: number;
  savedAt: number;
};

type Position = { x: number; y: number };

const STORAGE_KEY = "bibliotheke-card-pos";

function loadPos(): Position {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { x: -1, y: -1 };
}

function savePos(pos: Position) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch { /* ignore */ }
}

export function LibraryCard({
  count,
  lastAction,
  saved,
  onRemove,
}: {
  count: number;
  lastAction: StampType;
  saved: SavedBook[];
  onRemove: (id: string) => void;
}) {
  const [stamp, setStamp] = useState<StampType>(null);
  const [stampKey, setStampKey] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [docked, setDocked] = useState(false);
  const [dockSide, setDockSide] = useState<"left" | "right">("right");
  const [dockY, setDockY] = useState(0);
  const [surpriseBook, setSurpriseBook] = useState<Book | null>(null);
  const [surpriseLoading, setSurpriseLoading] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    moved: boolean;
  }>({ dragging: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0, moved: false });

  const defaultPos = { x: window.innerWidth - 200, y: window.innerHeight - 180 };
  const initialPos = loadPos();
  const [pos, setPos] = useState<Position>(
    initialPos.x === -1 ? defaultPos : initialPos
  );

  // Stamp animation
  useEffect(() => {
    if (lastAction) {
      setStamp(lastAction);
      setStampKey((k) => k + 1);
      playStampSound();
      const t = setTimeout(() => setStamp(null), 1200);
      return () => clearTimeout(t);
    }
  }, [lastAction]);

  // Save position on change
  useEffect(() => {
    savePos(pos);
  }, [pos]);

  // Drag handlers
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      moved: false,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragRef.current.moved = true;
    }
    const newX = Math.max(0, Math.min(window.innerWidth - 200, e.clientX - dragRef.current.offsetX));
    const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragRef.current.offsetY));
    setPos({ x: newX, y: newY });
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current.dragging = false;
  }, []);

  const handleHeaderClick = () => {
    if (!dragRef.current.moved) {
      setExpanded((e) => !e);
    }
  };

  const surpriseMe = async () => {
    setSurpriseLoading(true);
    try {
      // Get a random book by searching for common terms
      const randomTerms = ["classic", "adventure", "mystery", "philosophy", "poetry", "science", "history"];
      const term = randomTerms[Math.floor(Math.random() * randomTerms.length)];
      const result = await searchBooks(term, 1, { lang: "", sort: "rating", ebookOnly: false });
      if (result.items.length > 0) {
        const randomIndex = Math.floor(Math.random() * Math.min(10, result.items.length));
        setSurpriseBook(result.items[randomIndex]);
      }
    } catch (error) {
      console.error("Failed to fetch surprise book:", error);
    } finally {
      setSurpriseLoading(false);
    }
  };

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    unlockAudio();
    if (audioPlaying) {
      stopAmbient();
      setAudioPlaying(false);
    } else {
      startAmbient();
      setAudioPlaying(true);
    }
  };

  // Sync audio state on mount
  useEffect(() => {
    setAudioPlaying(isAmbientPlaying());
  }, []);

  return (
    <div
      ref={cardRef}
      className="fixed z-40 select-none"
      style={{ left: pos.x, top: pos.y }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Full card state */}
      {!docked && (
        <div
          className="relative w-[200px] cursor-grab rounded-lg border border-ink-700 bg-ink-900 shadow-[0_10px_30px_rgba(12,31,49,0.4)] active:cursor-grabbing"
          onPointerDown={onPointerDown}
        >
          {/* Header (click to expand) */}
          <div
            className="flex items-center gap-2 border-b border-ink-700 px-3 py-2"
            onClick={handleHeaderClick}
            title="Click to expand"
          >
            <LogoMark size={22} />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[8px] uppercase tracking-widest text-acc">Library Card</p>
              <p className="font-display text-[11px] font-semibold text-paper">Bibliothēkē</p>
            </div>
            <span className="font-mono text-[9px] text-moss">{count}</span>
          </div>

          {/* Audio toggle - single line that becomes a moving wave */}
          <button
            type="button"
            onClick={toggleAudio}
            className="flex w-full items-center justify-center border-b border-ink-700/50 px-3 py-1.5 transition-colors hover:bg-ink-800/50"
            title={audioPlaying ? "Pause ambient music" : "Play ambient music"}
            aria-label={audioPlaying ? "Pause ambient music" : "Play ambient music"}
          >
            <svg
              width="100%"
              height="12"
              viewBox="0 0 160 12"
              preserveAspectRatio="none"
              className="overflow-hidden"
            >
              {audioPlaying ? (
                <g className={audioPlaying ? "animate-wave-line" : ""}>
                  <path
                    d="M0,6 Q5,0 10,6 Q15,12 20,6 Q25,0 30,6 Q35,12 40,6 Q45,0 50,6 Q55,12 60,6 Q65,0 70,6 Q75,12 80,6 Q85,0 90,6 Q95,12 100,6 Q105,0 110,6 Q115,12 120,6 Q125,0 130,6 Q135,12 140,6 Q145,0 150,6 Q155,12 160,6 Q165,0 170,6 Q175,12 180,6 Q185,0 190,6 Q195,12 200,6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-acc"
                  />
                </g>
              ) : (
                <line
                  x1="0"
                  y1="6"
                  x2="160"
                  y2="6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-[#7f95ab]"
                />
              )}
            </svg>
          </button>

          {/* Stats */}
          {!expanded && (
            <div className="px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-wide text-[#7f95ab]">Saved</span>
                <span className="font-mono text-sm font-bold text-moss">{count}</span>
              </div>
              {/* Surprise Me button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  surpriseMe();
                }}
                disabled={surpriseLoading}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-acc/30 bg-acc/10 px-2 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-acc transition-all hover:border-acc hover:bg-acc/20 disabled:opacity-50"
              >
                <IconSparkle width={10} height={10} />
                {surpriseLoading ? "Finding..." : "Surprise Me"}
              </button>
            </div>
          )}

          {/* Surprise Book Display */}
          {surpriseBook && !expanded && (
            <div className="border-t border-ink-700/50 px-3 py-2">
              <div className="flex gap-2">
                {surpriseBook.cover ? (
                  <img
                    src={`https://covers.openlibrary.org/b/id/${surpriseBook.cover}-S.jpg`}
                    alt={surpriseBook.title}
                    className="h-12 w-9 shrink-0 rounded object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-12 w-9 shrink-0 items-center justify-center rounded bg-gradient-to-br from-ink-700 to-ink-950">
                    <span className="text-xs font-bold text-acc">{surpriseBook.title.charAt(0)}</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[10px] font-semibold leading-tight text-paper">
                    {surpriseBook.title}
                  </p>
                  {surpriseBook.authors[0] && (
                    <p className="truncate text-[9px] text-[#7f95ab]">{surpriseBook.authors[0]}</p>
                  )}
                  <div className="mt-1 flex gap-1">
                    <a
                      href={zLibraryUrl({ title: surpriseBook.title, authors: surpriseBook.authors } as Book)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded bg-ink-700 px-1.5 py-0.5 font-mono text-[7px] font-semibold text-paper/80 transition-colors hover:bg-acc hover:text-ink-950"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Z-Lib
                    </a>
                    <a
                      href={annasUrl({ title: surpriseBook.title, authors: surpriseBook.authors } as Book)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded bg-ink-700 px-1.5 py-0.5 font-mono text-[7px] font-semibold text-paper/80 transition-colors hover:bg-acc hover:text-ink-950"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Anna's
                    </a>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSurpriseBook(null);
                }}
                className="mt-1 w-full rounded border border-ink-700 px-2 py-1 font-mono text-[8px] text-[#7f95ab] transition-colors hover:border-rust hover:text-rust"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Expanded: saved books list */}
          {expanded && (
            <div className="max-h-[300px] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-ink-700/50 px-3 py-1.5">
                <span className="font-mono text-[9px] uppercase tracking-widest text-acc">
                  My Library ({count})
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
                  className="text-[#7f95ab] hover:text-paper"
                >
                  <IconX width={12} height={12} />
                </button>
              </div>
              {count === 0 ? (
                <p className="px-3 py-4 text-center font-mono text-[10px] text-[#5f7590]">
                  No books saved yet.
                  <br />
                  Click the save icon on any book.
                </p>
              ) : (
                <ul className="divide-y divide-ink-700/30">
                  {saved.map((b) => (
                    <li key={b.id} className="relative group/item px-3 py-2">
                      <div className="flex items-start gap-2">
                        <div className="h-10 w-7 shrink-0 overflow-hidden rounded bg-ink-800">
                          {b.cover ? (
                            <img
                              src={`https://covers.openlibrary.org/b/id/${b.cover}-S.jpg`}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ink-700 to-ink-950">
                              <span className="text-[10px] font-bold text-acc">{b.title.charAt(0)}</span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-[10px] font-semibold leading-tight text-paper">
                            {b.title}
                          </p>
                          <p className="truncate text-[9px] text-[#7f95ab]">{b.author}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <a
                              href={zLibraryUrl({ title: b.title, authors: [b.author] } as Book)}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded bg-ink-700 px-1.5 py-0.5 font-mono text-[7px] font-semibold text-paper/80 transition-colors hover:bg-acc hover:text-ink-950"
                              title="Z-Library"
                            >
                              Z-Lib
                            </a>
                            <a
                              href={annasUrl({ title: b.title, authors: [b.author] } as Book)}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded bg-ink-700 px-1.5 py-0.5 font-mono text-[7px] font-semibold text-paper/80 transition-colors hover:bg-acc hover:text-ink-950"
                              title="Anna's Archive"
                            >
                              Anna's
                            </a>
                            <a
                              href={googleBooksUrl({ title: b.title, authors: [b.author] } as Book)}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded bg-ink-700 px-1.5 py-0.5 font-mono text-[7px] font-semibold text-paper/80 transition-colors hover:bg-acc hover:text-ink-950"
                              title="Google Books"
                            >
                              GBooks
                            </a>
                            <button
                              type="button"
                              onClick={() => onRemove(b.id)}
                              className="rounded bg-ink-700 px-1.5 py-0.5 font-mono text-[7px] font-semibold text-rust transition-colors hover:bg-rust hover:text-white"
                              title="Remove"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Stamp overlay */}
          {stamp && (
            <div
              key={stampKey}
              className="stamp-anim pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <div className="rounded border-2 border-acc bg-ink-900/80 px-3 py-1 font-mono text-sm font-bold uppercase tracking-widest text-acc">
                {stamp}
              </div>
            </div>
          )}

          {/* Minimize button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const cardRect = cardRef.current?.getBoundingClientRect();
              if (cardRect) {
                const centerX = cardRect.left + cardRect.width / 2;
                const side = centerX < window.innerWidth / 2 ? "left" : "right";
                setDockSide(side);
                setDockY(cardRect.top + cardRect.height / 2);
              }
              setDocked(true);
              setExpanded(false);
            }}
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-ink-700 bg-ink-900 text-[#7f95ab] transition-colors hover:border-acc hover:text-acc"
            title="Dock to edge"
          >
            <IconX width={10} height={10} />
          </button>
        </div>
      )}

      {/* Semi-circle dock tab */}
      {docked && (
        <button
          onClick={() => {
            setDocked(false);
            const x = dockSide === "right" ? window.innerWidth - 220 : 20;
            const y = Math.max(20, Math.min(window.innerHeight - 200, dockY - 50));
            setPos({ x, y });
          }}
          className={`fixed z-40 flex h-20 w-10 items-center justify-center border-2 border-ink-700 bg-ink-900 shadow-[0_0_20px_rgba(12,31,49,0.4)] transition-all hover:w-12 hover:border-acc ${
            dockSide === "right"
              ? "right-0 rounded-l-full border-r-0"
              : "left-0 rounded-r-full border-l-0"
          }`}
          style={{ top: dockY - 40 }}
          title="Expand library card"
        >
          <div className="flex flex-col items-center gap-1">
            <LogoMark size={24} />
            {count > 0 && (
              <span className="font-mono text-[9px] font-bold text-moss">{count}</span>
            )}
          </div>
        </button>
      )}
    </div>
  );
}
