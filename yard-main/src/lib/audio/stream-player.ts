/** Progressive HTMLAudio playback for solo listening — starts before the file finishes. */

type EndedFn = () => void;

class StreamPlayer {
  el: HTMLAudioElement | null = null;
  trackId: number | null = null;
  playing = false;
  duration = 0;
  onEnded: EndedFn | null = null;
  private onProgress: ((ratio: number) => void) | null = null;
  private onReady: (() => void) | null = null;
  private generation = 0;

  ensure(): HTMLAudioElement {
    if (this.el) return this.el;
    const a = new Audio();
    a.preload = "auto";
    a.crossOrigin = "anonymous";
    a.addEventListener("ended", () => {
      this.playing = false;
      this.onEnded?.();
    });
    a.addEventListener("durationchange", () => {
      if (Number.isFinite(a.duration) && a.duration > 0) this.duration = a.duration;
    });
    a.addEventListener("progress", () => this.reportProgress());
    a.addEventListener("canplay", () => {
      this.onReady?.();
      this.reportProgress(Math.max(0.35, this.bufferRatio()));
    });
    a.addEventListener("canplaythrough", () => {
      this.onReady?.();
      this.reportProgress(1);
    });
    a.addEventListener("waiting", () => this.onProgress?.(this.bufferRatio() || 0.12));
    a.addEventListener("playing", () => this.onProgress?.(1));
    this.el = a;
    return a;
  }

  private bufferRatio(): number {
    const a = this.el;
    if (!a || !a.duration) return 0;
    if (!a.buffered.length) return 0;
    return Math.min(1, a.buffered.end(a.buffered.length - 1) / a.duration);
  }

  private reportProgress(force?: number) {
    this.onProgress?.(force ?? this.bufferRatio());
  }

  async play(id: number, offset = 0, opts?: { onProgress?: (ratio: number) => void; onEnded?: EndedFn }) {
    const a = this.ensure();
    this.onProgress = opts?.onProgress ?? this.onProgress;
    this.onEnded = opts?.onEnded ?? this.onEnded;
    const gen = ++this.generation;

    if (this.trackId === id && a.src) {
      if (Math.abs(a.currentTime - offset) > 0.35 && offset > 0) {
        try {
          a.currentTime = offset;
        } catch {
          // metadata not ready
        }
      }
      this.playing = true;
      await a.play();
      return;
    }

    this.trackId = id;
    a.src = `${import.meta.env.BASE_URL}api/stream/${id}`;
    a.load();
    if (offset > 0) {
      const seek = () => {
        if (this.generation !== gen) return;
        try {
          a.currentTime = offset;
        } catch {
          // ignore
        }
      };
      if (a.readyState >= 1) seek();
      else a.addEventListener("loadedmetadata", seek, { once: true });
    }
    this.playing = true;
    this.onProgress?.(0.08);
    await a.play();
  }

  pause() {
    const a = this.el;
    if (!a) return;
    a.pause();
    this.playing = false;
  }

  resume() {
    const a = this.el;
    if (!a || !this.trackId) return;
    this.playing = true;
    void a.play();
  }

  seek(seconds: number) {
    const a = this.el;
    if (!a) return;
    try {
      a.currentTime = Math.max(0, seconds);
    } catch {
      // ignore
    }
  }

  position(): number {
    return this.el?.currentTime ?? 0;
  }

  setVolume(volume: number, muted: boolean) {
    const a = this.ensure();
    a.muted = muted;
    a.volume = Math.min(1, Math.max(0, volume));
  }

  stop() {
    this.generation += 1;
    const a = this.el;
    if (!a) return;
    a.pause();
    a.removeAttribute("src");
    a.load();
    this.playing = false;
    this.trackId = null;
    this.duration = 0;
  }

  prefetch(id: number) {
    if (!id || id === this.trackId) return;
    const warm = new Audio();
    warm.preload = "auto";
    warm.src = `${import.meta.env.BASE_URL}api/stream/${id}`;
  }
}

let singleton: StreamPlayer | null = null;

export function getStreamPlayer(): StreamPlayer | null {
  if (typeof window === "undefined") return null;
  singleton ??= new StreamPlayer();
  return singleton;
}
