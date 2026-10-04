import { useState } from "react";
import { Reveal } from "./reveal";
import { IconArrowRight, IconCheck, IconCopy, IconTerminal, LogoMark } from "./icons";

const STEPS = [
  {
    n: "01",
    title: "Type once, search everything",
    body: "One box queries Open Library's 20M+ book records or CrossRef's 150M+ article records — rebuilt to run entirely in your browser with debounced search and session caching.",
  },
  {
    n: "02",
    title: "Records matched to real copies",
    body: "Book rows carry Internet Archive identifiers; article rows resolve through Unpaywall to legal open-access PDFs. No dead links, no fake buttons.",
  },
  {
    n: "03",
    title: "Download from the source",
    body: "Every button opens the actual file page: Archive.org, Google Books, Anna's Archive, Z-Library, and Open Library. Author names are auto-appended to every query.",
  },
];

const SOURCES = [
  { name: "Open Library", stat: "20M+ books · covers & borrowing", url: "https://openlibrary.org" },
  { name: "CrossRef", stat: "150M+ article records · DOIs", url: "https://www.crossref.org" },
  { name: "Internet Archive", stat: "44M+ free texts · PDF / EPUB", url: "https://archive.org" },
  { name: "Unpaywall", stat: "open-access PDF resolver", url: "https://unpaywall.org" },
];

const CMDS = [
  "git clone https://github.com/Devanshu-17/zLibrary.git",
  "cd zLibrary",
  "pip install streamlit requests pandas",
  "streamlit run app.py",
];

export function Info({ onToast }: { onToast: (m: string) => void }) {
  const [copied, setCopied] = useState(false);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(CMDS.join("\n"));
      setCopied(true);
      onToast("Terminal commands copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onToast("Couldn't access clipboard");
    }
  };

  return (
    <>
      <section id="how" className="noise relative overflow-hidden bg-ink-950 py-14 text-paper sm:py-16">
        <div className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-royal/20 blur-[130px]" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-[320px] w-[320px] rounded-full bg-acc/10 blur-[110px]" />

        <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-acc">How it works</p>
            <h2 className="mt-2 max-w-2xl font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              From search box to <span className="italic text-acc">saved file</span> — three moves.
            </h2>
          </Reveal>

          <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-12">
            <div>
              <ol className="space-y-6">
                {STEPS.map((s, i) => (
                  <Reveal key={s.n} delay={i * 100}>
                    <li className="group flex gap-4">
                      <span className="font-display text-3xl font-light italic text-acc/80 transition-colors group-hover:text-acc">
                        {s.n}
                      </span>
                      <div className="border-l border-ink-700 pl-4 transition-colors group-hover:border-acc/60">
                        <h3 className="text-base font-bold text-paper">{s.title}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-[#9db2c7]">{s.body}</p>
                      </div>
                    </li>
                  </Reveal>
                ))}
              </ol>

              <Reveal delay={120}>
                <div className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {SOURCES.map((s) => (
                    <a
                      key={s.name}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-click group flex items-center justify-between gap-2 rounded-xl border border-ink-700 bg-ink-900/70 px-3 py-2.5 transition-all hover:-translate-y-1 hover:border-acc"
                    >
                      <span>
                        <span className="block font-display text-sm font-semibold text-paper group-hover:text-acc">
                          {s.name}
                        </span>
                        <span className="block font-mono text-[9px] uppercase tracking-wider text-[#7f95ab]">
                          {s.stat}
                        </span>
                      </span>
                      <IconArrowRight
                        width={14}
                        height={14}
                        className="shrink-0 text-[#7f95ab] transition-all group-hover:translate-x-0.5 group-hover:text-acc"
                      />
                    </a>
                  ))}
                </div>
              </Reveal>
            </div>

            <Reveal delay={100}>
              <div id="run" className="scroll-mt-24">
                <div className="overflow-hidden rounded-2xl border border-ink-700 bg-ink-900 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center justify-between border-b border-ink-700 bg-ink-950/80 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-rust" />
                      <span className="h-3 w-3 rounded-full bg-acc" />
                      <span className="h-3 w-3 rounded-full bg-moss" />
                    </div>
                    <span className="flex items-center gap-2 font-mono text-[11px] text-[#7f95ab]">
                      <IconTerminal width={14} height={14} />
                      zLibrary — the original
                    </span>
                    <button
                      type="button"
                      onClick={copyAll}
                      className="btn-click flex items-center gap-1.5 rounded-md border border-ink-600 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[#9db2c7] transition-all hover:border-acc hover:text-acc active:scale-95"
                    >
                      {copied ? <IconCheck width={12} height={12} className="text-moss" /> : <IconCopy width={12} height={12} />}
                      {copied ? "copied" : "copy"}
                    </button>
                  </div>
                  <div className="space-y-2.5 px-5 py-6 font-mono text-[13px] leading-relaxed">
                    {CMDS.map((c) => (
                      <p key={c} className="text-[#c6d4e2]">
                        <span className="mr-2 select-none text-acc">➜</span>
                        <span className="mr-2 select-none text-royal">~</span>
                        {c}
                      </p>
                    ))}
                    <p className="text-[#7f95ab]">
                      <span className="mr-2 select-none text-acc">➜</span>
                      <span className="text-moss">Streamlit server started on http://localhost:8501</span>
                      <span className="caret ml-1 inline-block h-4 w-2 translate-y-0.5 bg-acc" />
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-ink-700/80 bg-ink-900/60 px-4 py-3">
                  <h3 className="flex items-center gap-2 text-xs font-bold text-paper">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-acc-soft text-acc-deep">
                      <IconTerminal width={11} height={11} />
                    </span>
                    Why a browser rebuild?
                  </h3>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-[#9db2c7]">
                    The original script calls Z-Library's private API from Python. Browsers refuse those
                    calls (CORS) and endpoints rotate constantly. This edition searches stable public catalogs
                    and keeps direct links to Z-Library, Anna's Archive, and Google Books in every download menu.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-ink-950 py-6 text-paper">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-5 sm:px-8 md:flex-row md:items-center">
          <div className="flex items-center gap-2.5">
            <LogoMark size={26} />
            <div>
              <p className="font-display text-base font-semibold leading-tight">
                <span className="italic text-acc">Bibliothēkē</span> <span className="text-[#7f95ab]">· web edition</span>
              </p>
              <p className="font-mono text-[9px] uppercase tracking-wider text-[#7f95ab]">
                rebuilt in react — after Devanshu-17/zLibrary
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1 md:items-end">
            <a
              href="https://github.com/Devanshu-17/zLibrary"
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[11px] text-[#9db2c7] underline decoration-ink-600 underline-offset-4 transition-colors hover:text-acc"
            >
              github.com/Devanshu-17/zLibrary
            </a>
            <a
              href="https://github.com/medusa-was-innocent"
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[11px] text-[#9db2c7] underline decoration-ink-600 underline-offset-4 transition-colors hover:text-acc"
            >
              built by @medusa-was-innocent
            </a>
            <p className="max-w-md text-right font-mono text-[9px] leading-relaxed text-[#5f7590]">
              catalog data © Open Library · CrossRef · Internet Archive. External links open in new tabs.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
