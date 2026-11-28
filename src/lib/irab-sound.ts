'use client';

/**
 * Efek suara Kuis Hi I'rab:
 * - Memutar SFX Mixkit (selaras dengan Hi Mufradat) dengan fallback Web Audio API
 *   agar suara tetap berbunyi meski jaringan lambat atau CDN audio diblokir.
 * - Menyediakan nada detak halus untuk 3 detik terakhir timer.
 */

const STORAGE_KEY = 'aqli_irab_sound';

const MIXKIT_URLS = {
  correct: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  incorrect: 'https://assets.mixkit.co/active_storage/sfx/2182/2182-preview.mp3',
  perfect: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  fail: 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3',
} as const;

export type IrabSfxType = 'correct' | 'incorrect' | 'perfect' | 'fail' | 'tick';

let ctx: AudioContext | null = null;
const audioCache: Partial<Record<keyof typeof MIXKIT_URLS, HTMLAudioElement>> = {};

export function isIrabSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setIrabSoundEnabled(on: boolean) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {}
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

export function unlockIrabAudio() {
  getAudioContext();
  if (typeof window === 'undefined') return;
  (Object.keys(MIXKIT_URLS) as Array<keyof typeof MIXKIT_URLS>).forEach((key) => {
    if (!audioCache[key]) {
      const a = new Audio(MIXKIT_URLS[key]);
      a.preload = 'auto';
      a.volume = 0.45;
      audioCache[key] = a;
    }
  });
}

function playTone(
  freq: number,
  startOffset: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine'
) {
  const ac = getAudioContext();
  if (!ac) return;
  const t0 = ac.currentTime + startOffset;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function playSynthFallback(type: IrabSfxType) {
  if (type === 'tick') {
    playTone(720, 0, 0.05, 0.1, 'triangle');
    return;
  }
  if (type === 'correct') {
    playTone(523.25, 0, 0.12, 0.24, 'sine');
    playTone(659.25, 0.09, 0.22, 0.26, 'sine');
    return;
  }
  if (type === 'incorrect') {
    playTone(300, 0, 0.14, 0.22, 'triangle');
    playTone(210, 0.11, 0.24, 0.22, 'triangle');
    return;
  }
  if (type === 'perfect') {
    playTone(523.25, 0, 0.12, 0.25, 'sine');
    playTone(659.25, 0.1, 0.12, 0.25, 'sine');
    playTone(783.99, 0.2, 0.14, 0.26, 'sine');
    playTone(1046.5, 0.31, 0.36, 0.28, 'sine');
    return;
  }
  if (type === 'fail') {
    playTone(329.63, 0, 0.16, 0.2, 'triangle');
    playTone(246.94, 0.14, 0.32, 0.2, 'triangle');
  }
}

export function playIrabSfx(type: IrabSfxType) {
  if (!isIrabSoundEnabled()) return;

  if (type === 'tick') {
    playSynthFallback('tick');
    return;
  }

  try {
    const url = MIXKIT_URLS[type];
    const cached = audioCache[type];
    const audio = cached ? (cached.cloneNode(true) as HTMLAudioElement) : new Audio(url);
    audio.volume = 0.45;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        playSynthFallback(type);
      });
    }
  } catch {
    playSynthFallback(type);
  }
}
