/** Web Audio graph for lockstep rooms — BufferSource + scheduled params. */

const LOW_MIN = 20;
const LOW_MAX = 20_000;

export class YardGraph {
  ctx: AudioContext | null = null;
  filter: BiquadFilterNode | null = null;
  spatial: GainNode | null = null;
  master: GainNode | null = null;
  source: AudioBufferSourceNode | null = null;
  playing = false;
  startCtx = 0;
  offset = 0;
  trackId: number | null = null;
  duration = 0;
  private clickOn = false;
  private clickTimer: number | null = null;
  private hostNowFn: () => number = () => Date.now();
  private lastClickAt = 0;

  ensure(): AudioContext {
    if (this.ctx && this.ctx.state !== "closed") return this.ctx;
    const ctx = new AudioContext();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = LOW_MAX;
    filter.Q.value = 0.707;
    const spatial = ctx.createGain();
    spatial.gain.value = 1;
    const master = ctx.createGain();
    master.gain.value = 1;
    filter.connect(spatial);
    spatial.connect(master);
    master.connect(ctx.destination);

    // Keep Bluetooth A2DP from sleeping between pauses (inaudible).
    const keep = ctx.createOscillator();
    keep.frequency.value = 1;
    const keepGain = ctx.createGain();
    keepGain.gain.value = 0.0001;
    keep.connect(keepGain);
    keepGain.connect(filter);
    keep.start();

    this.ctx = ctx;
    this.filter = filter;
    this.spatial = spatial;
    this.master = master;
    return ctx;
  }

  async resume() {
    const ctx = this.ensure();
    if (ctx.state === "suspended") await ctx.resume();
    try {
      if ("wakeLock" in navigator) await navigator.wakeLock.request("screen");
    } catch {
      // best-effort
    }
  }

  async decode(bytes: ArrayBuffer): Promise<AudioBuffer> {
    const ctx = this.ensure();
    return ctx.decodeAudioData(bytes.slice(0));
  }

  currentTime(): number {
    return this.ctx?.currentTime ?? 0;
  }

  waitToAudio(waitMs: number): number {
    const ctx = this.ensure();
    const ol = this.outputLatencyMs();
    return ctx.currentTime + Math.max(0, waitMs - ol) / 1000;
  }

  outputLatencyMs(): number {
    const raw = (this.ctx?.outputLatency ?? 0) * 1000;
    if (raw > 100) return 0;
    return raw;
  }

  position(): number {
    if (!this.playing || !this.ctx) return this.offset;
    return Math.min(this.duration || Infinity, this.offset + (this.ctx.currentTime - this.startCtx));
  }

  has(id: number): boolean {
    return this.trackId === id && this.source != null;
  }

  holdPosition(trackId: number, offset: number, duration = 0) {
    this.stopSource();
    this.trackId = trackId;
    this.offset = Math.max(0, offset);
    this.duration = duration;
    this.playing = false;
  }

  stopSource() {
    if (!this.source) return;
    try {
      this.source.onended = null;
      this.source.stop();
      this.source.disconnect();
    } catch {
      // already stopped
    }
    this.source = null;
    this.playing = false;
  }

  schedulePlay(opts: {
    buffer: AudioBuffer;
    trackId: number;
    offset: number;
    waitMs: number;
    onEnded?: () => void;
  }) {
    const ctx = this.ensure();
    this.stopSource();
    const startAt = this.waitToAudio(opts.waitMs);
    const offset = Math.max(0, Math.min(opts.offset, Math.max(0, opts.buffer.duration - 0.05)));
    const src = ctx.createBufferSource();
    src.buffer = opts.buffer;
    src.connect(this.filter!);
    src.onended = () => {
      if (this.source !== src) return;
      this.playing = false;
      this.offset = this.position();
      opts.onEnded?.();
    };
    src.start(startAt, offset);
    this.source = src;
    this.playing = true;
    this.startCtx = startAt;
    this.offset = offset;
    this.trackId = opts.trackId;
    this.duration = opts.buffer.duration;
  }

  schedulePause(waitMs: number) {
    if (!this.source || !this.ctx) {
      this.playing = false;
      return;
    }
    const stopAt = this.waitToAudio(waitMs);
    const pos = this.offset + Math.max(0, stopAt - this.startCtx);
    try {
      this.source.onended = null;
      this.source.stop(stopAt);
    } catch {
      // already stopped
    }
    this.playing = false;
    this.offset = pos;
    this.source = null;
  }

  scheduleGain(value: number, waitMs: number, ramp = 0.12) {
    if (!this.spatial || !this.ctx) return;
    const t = this.waitToAudio(waitMs);
    const g = Math.min(1, Math.max(0.05, value));
    this.spatial.gain.cancelScheduledValues(t);
    this.spatial.gain.setValueAtTime(this.spatial.gain.value, t);
    this.spatial.gain.linearRampToValueAtTime(g, t + ramp);
  }

  setGainNow(value: number) {
    if (!this.spatial) return;
    this.spatial.gain.cancelScheduledValues(this.ensure().currentTime);
    this.spatial.gain.value = Math.min(1, Math.max(0.05, value));
  }

  scheduleLowpass(freq: number, waitMs: number, ramp = 0.18) {
    if (!this.filter || !this.ctx) return;
    const t = this.waitToAudio(waitMs);
    const f = Math.min(LOW_MAX, Math.max(LOW_MIN, freq));
    this.filter.frequency.cancelScheduledValues(t);
    const current = Math.max(LOW_MIN, this.filter.frequency.value);
    this.filter.frequency.setValueAtTime(current, t);
    this.filter.frequency.exponentialRampToValueAtTime(f, t + ramp);
  }

  setMaster(volume: number, muted: boolean) {
    if (!this.master) return;
    this.master.gain.value = muted ? 0 : Math.min(1, Math.max(0, volume));
  }

  setClick(on: boolean, hostNow: () => number) {
    this.clickOn = on;
    this.hostNowFn = hostNow;
    if (this.clickTimer != null) {
      clearInterval(this.clickTimer);
      this.clickTimer = null;
    }
    if (!on) return;
    this.ensure();
    this.scheduleClicks();
    this.clickTimer = window.setInterval(() => this.scheduleClicks(), 1000);
  }

  private scheduleClicks() {
    if (!this.clickOn || !this.ctx) return;
    const hostNow = this.hostNowFn();
    const period = 500;
    let next = Math.ceil(hostNow / period) * period;
    const horizon = hostNow + 1200;
    while (next < horizon) {
      if (next > this.lastClickAt + 40) {
        const wait = next - hostNow;
        if (wait > 8) this.fireClick(this.waitToAudio(wait));
        this.lastClickAt = next;
      }
      next += period;
    }
  }

  private fireClick(at: number) {
    if (!this.ctx || !this.filter) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.value = 980;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.18, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
    osc.connect(g);
    g.connect(this.filter);
    osc.start(at);
    osc.stop(at + 0.07);
  }

  dispose() {
    this.setClick(false, () => Date.now());
    this.stopSource();
    this.trackId = null;
    this.offset = 0;
    this.duration = 0;
  }
}

let singleton: YardGraph | null = null;

export function getGraph(): YardGraph | null {
  if (typeof window === "undefined") return null;
  singleton ??= new YardGraph();
  return singleton;
}

export function clampLowpass(freq: number) {
  return Math.min(LOW_MAX, Math.max(LOW_MIN, freq));
}

export const LOWPASS_OPEN = LOW_MAX;

export function getFilteredOutputLatencyMs(): number {
  return getGraph()?.outputLatencyMs() ?? 0;
}
