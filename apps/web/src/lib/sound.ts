import { useSettingsStore } from "../hooks/useSettings";

export type SoundKind = "success" | "danger" | "info" | "click";

interface Preset {
  freqs: number[];
  noteSeconds: number;
  type: OscillatorType;
}

// Short synthesized chimes (Web Audio oscillators) instead of shipping audio
// assets — keeps the bundle self-contained and the sounds easy to retune.
const PRESETS: Record<SoundKind, Preset> = {
  success: { freqs: [523.25, 659.25, 783.99], noteSeconds: 0.11, type: "sine" },
  danger: { freqs: [220, 174.61], noteSeconds: 0.16, type: "sawtooth" },
  info: { freqs: [440, 554.37], noteSeconds: 0.09, type: "triangle" },
  click: { freqs: [880], noteSeconds: 0.035, type: "square" },
};

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
}

export function playSound(kind: SoundKind) {
  if (!useSettingsStore.getState().soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const preset = PRESETS[kind];
    preset.freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = preset.type;
      osc.frequency.value = freq;

      const start = ctx.currentTime + i * preset.noteSeconds;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + preset.noteSeconds);

      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + preset.noteSeconds + 0.02);
    });
  } catch {
    // Browsers block audio before the first user gesture — non-critical, just skip.
  }
}
