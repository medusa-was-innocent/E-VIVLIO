import { epochNow } from "@/lib/time";

export type NtpSample = {
  t0: number;
  t1: number;
  t2: number;
  t3: number;
  roundTripDelay: number;
  clockOffset: number;
};

const PROBE_GAP_MS = 25;
const PROBE_GAP_TOLERANCE_MS = 5;
const MAX_SAMPLES = 16;

/** Host clock minus local clock, estimated from min-RTT NTP samples (RFC 5905 §10). */
export class PeerClock {
  samples: NtpSample[] = [];
  offsetMs = 0;
  rttMs = 0;
  synced = false;
  group = 0;
  pure = 0;
  impure = 0;
  nudgeMs = 0;
  private pending: { sample: NtpSample; g: number } | null = null;

  reset() {
    this.samples = [];
    this.offsetMs = 0;
    this.rttMs = 0;
    this.synced = false;
    this.pending = null;
    this.pure = 0;
    this.impure = 0;
  }

  becomeHost() {
    this.samples = [];
    this.offsetMs = 0;
    this.rttMs = 0;
    this.synced = true;
    this.pending = null;
  }

  nextGroup() {
    this.group += 1;
    return this.group;
  }

  /**
   * Huygens coded-probe pair. Two NTP exchanges with a known 25ms gap;
   * discard the pair if server inter-arrival drifted (queuing / GC / HOL).
   */
  noteResponse(t0: number, t1: number, t2: number, g: number, i: 0 | 1, t3 = epochNow()): NtpSample | null {
    const clockOffset = (t1 - t0 + (t2 - t3)) / 2;
    const roundTripDelay = t3 - t0 - (t2 - t1);
    const sample: NtpSample = { t0, t1, t2, t3, roundTripDelay, clockOffset };

    if (i === 0) {
      this.pending = { sample, g };
      return null;
    }

    const first = this.pending;
    this.pending = null;
    if (!first || first.g !== g) return null;

    const clientGap = sample.t0 - first.sample.t0;
    const serverGap = sample.t1 - first.sample.t1;
    const drift = Math.abs(serverGap - clientGap);
    if (drift > PROBE_GAP_TOLERANCE_MS) {
      this.impure += 1;
      return null;
    }
    this.pure += 1;
    const best = first.sample.roundTripDelay <= sample.roundTripDelay ? first.sample : sample;
    this.commit(best);
    return best;
  }

  /** Fallback when the path cannot carry a 25ms probe pair (HTTP relay). */
  noteSimple(t0: number, t1: number, t2: number, t3 = epochNow()): NtpSample | null {
    const roundTripDelay = t3 - t0 - (t2 - t1);
    if (!Number.isFinite(roundTripDelay) || roundTripDelay < 0 || roundTripDelay > 12_000) {
      this.impure += 1;
      return null;
    }
    const clockOffset = (t1 - t0 + (t2 - t3)) / 2;
    const sample: NtpSample = { t0, t1, t2, t3, roundTripDelay, clockOffset };
    this.pure += 1;
    this.commit(sample);
    return sample;
  }

  private commit(sample: NtpSample) {
    this.samples.push(sample);
    if (this.samples.length > MAX_SAMPLES) this.samples.shift();
    let winner = this.samples[0]!;
    for (const s of this.samples) {
      if (s.roundTripDelay < winner.roundTripDelay) winner = s;
    }
    this.offsetMs = winner.clockOffset;
    this.rttMs = Math.max(0, winner.roundTripDelay);
    this.synced = this.samples.length >= 4;
  }

  hostNow(): number {
    return epochNow() + this.offsetMs + this.nudgeMs;
  }

  waitMs(hostTime: number): number {
    return Math.max(0, hostTime - this.hostNow());
  }
}

export const NTP_PROBE_GAP_MS = PROBE_GAP_MS;
export const NTP_INITIAL_INTERVAL_MS = 50;
export const NTP_STEADY_INTERVAL_MS = 2500;
export const NTP_RELAY_INTERVAL_MS = 220;
export const NTP_MAX_MEASUREMENTS = MAX_SAMPLES;

/**
 * BeatSync dynamic schedule: 1.5× max RTT + 200ms, floor 400ms, cap 3000ms.
 * `extra` covers HTTP-poll jitter or reported output-latency compensation.
 */
export function scheduleBuffer(rtts: Array<number | null | undefined>, extra = 0): number {
  let max = 0;
  for (const r of rtts) {
    if (typeof r === "number" && Number.isFinite(r)) max = Math.max(max, r);
  }
  return Math.min(3000, Math.max(400, max * 1.5 + 200 + extra));
}
