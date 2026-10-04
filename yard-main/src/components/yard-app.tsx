import { useEffect } from "react";
import { useCatalog } from "@/components/catalog/use-catalog";
import { AppShell } from "@/components/shell/app-shell";
import { Browse } from "@/components/views/browse";
import { Library } from "@/components/views/library";
import { ListenNow } from "@/components/views/listen-now";
import { RadioHome } from "@/components/views/radio";
import { SearchView } from "@/components/views/search-view";
import type { Track } from "@/lib/audiomack/types";
import { usePlayer } from "@/lib/player-store";

export function YardApp({ initialChart }: { initialChart?: Track[] }) {
  const tab = usePlayer((s) => s.tab);
  const catalog = useCatalog(initialChart, tab);

  useEffect(() => {
    void Promise.resolve(usePlayer.persist.rehydrate()).then(() => {
      if (new URLSearchParams(window.location.search).has("q")) usePlayer.getState().setTab("search");
    });
  }, []);

  useEffect(() => {
    if (tab === "search" && catalog.query) return;
    if (tab !== "search" && catalog.searching) {
      /* keep query */
    }
  }, [tab, catalog.query, catalog.searching]);

  return (
    <AppShell>
      {tab === "listen" && <ListenNow catalog={catalog} />}
      {tab === "browse" && <Browse catalog={catalog} />}
      {tab === "radio" && <RadioHome />}
      {tab === "library" && <Library />}
      {tab === "search" && <SearchView catalog={catalog} />}
    </AppShell>
  );
}
