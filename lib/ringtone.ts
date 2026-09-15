'use client';

let audioCtx: AudioContext | null = null;
let ringInterval: ReturnType<typeof setInterval> | null = null;
let outgoingInterval: ReturnType<typeof setInterval> | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playBeep(ctx: AudioContext, freq: number, duration: number, volume: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + duration - 0.05);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function playIncomingRing(ctx: AudioContext) {
  playBeep(ctx, 800, 0.4, 0.3);
  setTimeout(() => playBeep(ctx, 800, 0.4, 0.3), 500);
}

function playOutgoingBeep(ctx: AudioContext) {
  playBeep(ctx, 480, 0.3, 0.25);
}

export function startIncomingRing() {
  stopAllRings();
  const ctx = getCtx();
  if (!ctx) return;
  playIncomingRing(ctx);
  ringInterval = setInterval(() => playIncomingRing(ctx), 2000);
}

export function startOutgoingRing() {
  stopAllRings();
  const ctx = getCtx();
  if (!ctx) return;
  playOutgoingBeep(ctx);
  outgoingInterval = setInterval(() => playOutgoingBeep(ctx), 1500);
}

export function stopAllRings() {
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
  if (outgoingInterval) {
    clearInterval(outgoingInterval);
    outgoingInterval = null;
  }
}
