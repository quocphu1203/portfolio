"use client";

import { useSyncExternalStore } from "react";

/** Sound is off unless the user turns it on (persisted). */
const STORAGE_KEY = "portfolio-sound";
let enabled: boolean | null = null;
const listeners = new Set<() => void>();

function readEnabled() {
  if (enabled === null) {
    try {
      enabled = window.localStorage.getItem(STORAGE_KEY) === "on";
    } catch {
      enabled = false;
    }
  }
  return enabled;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function isSoundEnabled() {
  return typeof window !== "undefined" && readEnabled();
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Storage unavailable (private mode): keep the in-memory setting.
  }
  // The toggle click is a user gesture: create / resume the audio context now (autoplay rules).
  if (on) getAudioContext();
  listeners.forEach((listener) => listener());
}

export function useSoundEnabled() {
  return useSyncExternalStore(subscribe, isSoundEnabled, () => false);
}

let audioContext: AudioContext | null = null;
function getAudioContext() {
  if (!audioContext) {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

/** Tiny procedural meow (no audio file): a vibrato saw through a sweeping band-pass, rise-then-fall pitch. */
export function playMeow() {
  if (!isSoundEnabled()) return;
  const ac = getAudioContext();
  if (!ac) return;
  const t0 = ac.currentTime + 0.01;
  const dur = 0.38 + Math.random() * 0.14;
  const base = 520 + Math.random() * 160;

  const osc = ac.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(base * 0.8, t0);
  osc.frequency.linearRampToValueAtTime(base * 1.3, t0 + dur * 0.3);
  osc.frequency.exponentialRampToValueAtTime(base * 0.62, t0 + dur);
  const vibrato = ac.createOscillator();
  vibrato.frequency.value = 7;
  const vibratoDepth = ac.createGain();
  vibratoDepth.gain.value = base * 0.025;
  vibrato.connect(vibratoDepth).connect(osc.frequency);

  // "mi-aw": formant sweeps up then down.
  const formant = ac.createBiquadFilter();
  formant.type = "bandpass";
  formant.Q.value = 2.5;
  formant.frequency.setValueAtTime(1100, t0);
  formant.frequency.linearRampToValueAtTime(2300, t0 + dur * 0.3);
  formant.frequency.linearRampToValueAtTime(800, t0 + dur);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.05);
  gain.gain.setValueAtTime(0.22, t0 + dur * 0.55);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(formant).connect(gain).connect(ac.destination);
  osc.start(t0);
  vibrato.start(t0);
  osc.stop(t0 + dur + 0.02);
  vibrato.stop(t0 + dur + 0.02);
  osc.onended = () => {
    osc.disconnect();
    vibrato.disconnect();
    vibratoDepth.disconnect();
    formant.disconnect();
    gain.disconnect();
  };
}

let noiseBuffer: AudioBuffer | null = null;
function getNoise(ac: AudioContext) {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ac.sampleRate) {
    noiseBuffer = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.6), ac.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

/** Procedural water splash: band-passed noise burst with a falling centre. `size` 0..1 (plop -> big splash). */
export function playSplash(size = 0.5) {
  if (!isSoundEnabled()) return;
  const ac = getAudioContext();
  if (!ac) return;
  const t0 = ac.currentTime + 0.01;
  const dur = 0.18 + size * 0.35;
  const src = ac.createBufferSource();
  src.buffer = getNoise(ac);
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(1800 + size * 600, t0);
  filter.frequency.exponentialRampToValueAtTime(380, t0 + dur);
  const gain = ac.createGain();
  const peak = 0.08 + size * 0.16;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
  src.onended = () => {
    src.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
}
