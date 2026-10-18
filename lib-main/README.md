
**Lib** is the discovery engine and personal library card component of the E-VIVLIO ecosystem. It allows users to search for books, discover academic articles, manage a local collection of saved items, and instantly generate citations. 

Unlike the collaborative reading rooms (Folio), Lib operates as a personal discovery space heavily integrated with external catalog APIs (Open Library, Crossref, Unpaywall) while using browser-local storage for state management.

---

## ✨ Key Features

### Discovery & Search
* **Book Search:** Query by title, author, ISBN, or subject using the Open Library API.
* **Academic Article Search:** Search for papers and topics using Crossref, with Unpaywall integration to locate open-access PDFs and DOI landing pages.
* **Advanced Filtering:** Sort results by best match, newest/oldest, or rating. Filter by language and e-book availability.
* **"Surprise Me":** A randomized discovery feature that selects highly-rated books from predefined topics (e.g., poetry, science, mystery).

### Personal Library Card
* **Floating UI:** A movable, expandable, and dockable library card that persists across the module.
* **Local Storage:** Save up to 100 books/articles directly to the browser's `localStorage` for quick access without requiring a database round-trip.
* **Citation Generation:** Instantly generate and copy formatted citations to the clipboard using available metadata.

### Performance & Accessibility
* **State & Cache Management:** Implements LRU/FIFO concepts at the application layer to cache search results, manage pagination, and cancel stale/superseded network requests.
* **Performance Mode:** Toggles to reduce UI motion and rendering overhead for lower-end devices.
* **Ambient Audio:** Optional Web Audio API integration for subtle interface sounds and ambient background melodies.

---

## 🛠️ Tech Stack

* **Frontend:** React, TypeScript, Tailwind CSS
* **Build Tool:** Vite
* **External APIs:** 
  * [Open Library API](https://openlibrary.org/developers/api) (Book metadata and covers)
  * [Crossref API](https://api.crossref.org/) (Academic article DOIs)
  * [Unpaywall API](https://unpaywall.org/products/api) (Open-access routing)
* **Storage:** Browser `localStorage` (Personal library card), In-memory caching (Search results)

---

## 📂 Core Architecture

* `src/App.tsx` - Main module entry, router, and cache state manager.
* `src/lib/api.ts` - External API orchestration, query normalization, and data fetching logic.
* `src/lib/storage.ts` - `localStorage` controllers for the personal library card (`useSavedBooks`).
* `src/lib/perf.ts` - Request cancellation, stale-request protection, and performance mode toggles.
* `src/components/LibraryCard.tsx` - Drag-and-drop physics, docking logic, and saved item rendering.
* `src/components/results.tsx` - Pagination, sorting, filtering, and DOI link handling.

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v20 or higher recommended)
* npm or yarn

### Installation

1. Navigate to the lib module directory:
   ```bash
   cd lib-main
