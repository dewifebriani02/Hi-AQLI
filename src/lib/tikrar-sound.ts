'use client';

/**
 * Bunyi & getar umpan balik counter Tikrar (Web Audio, tanpa file audio).
 * - tap: "tik" pendek setiap klik
 * - done: "ting" dua nada saat hitungan mencapai target
 * Preferensi on/off disimpan di localStorage.
 */

const STORAGE_KEY = 'aqli_tikrar_sound';
let ctx: AudioContext | null = null;

export function isTikrarSoundEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setTikrarSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {}
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq: number, startOffset: number, duration: number, volume: number, type: OscillatorType = 'sine') {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime + startOffset;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}

export function playTikrarTap() {
  vibrate(12);
  if (!isTikrarSoundEnabled()) return;
  tone(880, 0, 0.07, 0.25, 'triangle');
}

export function playTikrarDone() {
  vibrate([40, 60, 80]);
  if (!isTikrarSoundEnabled()) return;
  tone(784, 0, 0.18, 0.3);
  tone(1175, 0.14, 0.35, 0.3);
}

/** Bunyi sesuai hasil klik: "ting" bila klik ini menuntaskan target, selain itu "tik" */
export function playTikrarCount(nextCount: number, threshold: number) {
  if (nextCount >= threshold) playTikrarDone();
  else playTikrarTap();
}
