/* Lightweight stamp sound using Web Audio API.
   No external files — synthesized on demand.
   Only plays after user interaction (browser autoplay policy). */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  return ctx;
}

/** Resume audio context (must be called from a user gesture). */
export function unlockAudio(): void {
  const c = getCtx();
  if (c && c.state === "suspended") {
    c.resume().catch(() => {});
  }
}

/** Play a short retro stamp sound: a quick low thump + high click. */
export function playStampSound(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") {
    c.resume().catch(() => {});
    return;
  }

  const now = c.currentTime;

  // Low thump
  const osc1 = c.createOscillator();
  const gain1 = c.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(120, now);
  osc1.frequency.exponentialRampToValueAtTime(40, now + 0.12);
  gain1.gain.setValueAtTime(0.35, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc1.connect(gain1).connect(c.destination);
  osc1.start(now);
  osc1.stop(now + 0.16);

  // High click
  const osc2 = c.createOscillator();
  const gain2 = c.createGain();
  osc2.type = "square";
  osc2.frequency.setValueAtTime(1800, now);
  osc2.frequency.exponentialRampToValueAtTime(400, now + 0.04);
  gain2.gain.setValueAtTime(0.08, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  osc2.connect(gain2).connect(c.destination);
  osc2.start(now);
  osc2.stop(now + 0.06);
}

/** Play a subtle save chime. */
export function playSaveSound(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") {
    c.resume().catch(() => {});
    return;
  }

  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.setValueAtTime(1320, now + 0.08);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  osc.connect(gain).connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.26);
}

/* ---------- Melodic library music (Web Audio API) ---------- */

let melodyInterval: number | null = null;
let melodyGain: GainNode | null = null;
let melodyTimeout: ReturnType<typeof setTimeout> | null = null;

// Simple pentatonic melody (C major pentatonic: C, D, E, G, A)
const MELODY_NOTES = [
  261.63, // C4
  293.66, // D4
  329.63, // E4
  392.00, // G4
  440.00, // A4
  523.25, // C5
  587.33, // D5
  659.25, // E5
];

// Melody pattern (indices into MELODY_NOTES)
const MELODY_PATTERN = [0, 2, 4, 5, 4, 2, 3, 5, 7, 5, 4, 2, 0, 2, 4, 3];
let melodyIndex = 0;

/** Play a single note with envelope */
function playNote(freq: number, duration: number, time: number): void {
  const c = getCtx();
  if (!c || !melodyGain) return;

  const osc = c.createOscillator();
  const noteGain = c.createGain();

  osc.type = "sine";
  osc.frequency.value = freq;

  // ADSR envelope
  noteGain.gain.setValueAtTime(0, time);
  noteGain.gain.linearRampToValueAtTime(0.15, time + 0.02); // Attack
  noteGain.gain.linearRampToValueAtTime(0.1, time + 0.1); // Decay
  noteGain.gain.setValueAtTime(0.1, time + duration - 0.05); // Sustain
  noteGain.gain.linearRampToValueAtTime(0, time + duration); // Release

  osc.connect(noteGain).connect(melodyGain);
  osc.start(time);
  osc.stop(time + duration);
}

/** Start melodic library music */
export function startAmbient(): void {
  const c = getCtx();
  if (!c || melodyInterval) return;
  if (c.state === "suspended") {
    c.resume().catch(() => {});
  }

  // Master gain for melody
  melodyGain = c.createGain();
  melodyGain.gain.value = 0;
  melodyGain.connect(c.destination);

  // Fade in
  melodyGain.gain.linearRampToValueAtTime(0.8, c.currentTime + 0.5);

  melodyIndex = 0;

  // Schedule notes
  const playNextNote = () => {
    if (!melodyGain || !c) return;
    
    const noteIndex = MELODY_PATTERN[melodyIndex % MELODY_PATTERN.length];
    const freq = MELODY_NOTES[noteIndex];
    const duration = 0.4;
    
    playNote(freq, duration, c.currentTime);
    
    melodyIndex++;
    
    // Schedule next note
    melodyTimeout = setTimeout(playNextNote, 450);
  };

  playNextNote();
}

/** Stop melodic music with fade out */
export function stopAmbient(): void {
  const c = getCtx();
  if (!c || !melodyGain) return;

  // Clear scheduled notes
  if (melodyTimeout) {
    clearTimeout(melodyTimeout);
    melodyTimeout = null;
  }

  // Fade out
  melodyGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.5);

  setTimeout(() => {
    melodyGain = null;
    melodyIndex = 0;
  }, 600);
}

/** Check if melody is currently playing */
export function isAmbientPlaying(): boolean {
  return melodyGain !== null;
}
