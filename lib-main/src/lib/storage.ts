import { useCallback, useEffect, useState } from "react";
import type { Book } from "./api";
import { playSaveSound, unlockAudio } from "./sound";

/* ---------- Saved books (localStorage) ---------- */

const SAVED_KEY = "bibliotheke-saved-v1";

type SavedBook = {
  id: string;
  title: string;
  author: string;
  cover?: number;
  savedAt: number;
};

function loadSaved(): SavedBook[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useSavedBooks() {
  const [saved, setSaved] = useState<SavedBook[]>(loadSaved);

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
    } catch {
      /* ignore */
    }
  }, [saved]);

  const isSaved = useCallback(
    (id: string) => saved.some((b) => b.id === id),
    [saved]
  );

  const toggleSave = useCallback(
    (book: Book): boolean => {
      unlockAudio();
      const id = book.id;
      const exists = saved.some((b) => b.id === id);
      if (exists) {
        setSaved((s) => s.filter((b) => b.id !== id));
        return false;
      } else {
        const entry: SavedBook = {
          id,
          title: book.title,
          author: book.authors[0] ?? "Unknown",
          cover: book.cover,
          savedAt: Date.now(),
        };
        setSaved((s) => [entry, ...s].slice(0, 100)); // keep last 100
        playSaveSound();
        return true;
      }
    },
    [saved]
  );

  const removeSaved = useCallback((id: string) => {
    setSaved((s) => s.filter((b) => b.id !== id));
  }, []);

  return { saved, isSaved, toggleSave, removeSaved, count: saved.length };
}
