"use client";

import { useSyncExternalStore } from "react";

/**
 * Fishing mini-game state (module store shared by the scene, the cat and the DOM HUD).
 * walking -> casting -> waiting -> bite -> (hook in time) reeling -> caught | (too late) missed -> casting ...
 */
export type FishingPhase = "off" | "walking" | "casting" | "waiting" | "bite" | "reeling" | "caught" | "missed";

export type FishingState = {
  phase: FishingPhase;
  /** Explore cat stands near the pier (shows the "go fishing" prompt). */
  near: boolean;
  caught: number;
  golden: number;
  /** Increments on every bite (keys the timing ring animation). */
  biteId: number;
  /** Last catch: golden or common, and the fact shown on the card. */
  lastGolden: boolean;
  factIndex: number;
  /** The walk to the pier gave up (no way there from where the cat stands). */
  unreachable: boolean;
};

/** Reaction window after the bobber dips. */
export const FISHING_BITE_WINDOW_MS = 800;
const BITE_DELAY_MIN_MS = 2000;
const BITE_DELAY_MAX_MS = 6000;
const MISSED_RECAST_MS = 1700;
const GOLDEN_CHANCE = 0.1;

let state: FishingState = {
  phase: "off",
  near: false,
  caught: 0,
  golden: 0,
  biteId: 0,
  lastGolden: false,
  factIndex: -1,
  unreachable: false,
};
/** performance.now() deadline of the waiting / missed steps. */
let deadline = 0;
/** Bite window left (ms), counted in clamped frame time so a hitch can't eat the reaction window. */
let biteLeft = 0;
const MAX_FRAME_MS = 50;
/** Shuffle bag of fact indices: every fact is shown once before any repeats. */
let bag: number[] = [];
let factCount = 0;
const listeners = new Set<() => void>();

function set(patch: Partial<FishingState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getFishingState() {
  return state;
}

export function useFishingState() {
  return useSyncExternalStore(subscribe, getFishingState, getFishingState);
}

export function setFishingFactCount(count: number) {
  if (count !== factCount) {
    factCount = count;
    bag = [];
  }
}

function nextFact() {
  if (factCount <= 0) return -1;
  if (bag.length === 0) {
    bag = Array.from({ length: factCount }, (_, i) => i);
    for (let i = bag.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    // No back-to-back repeat across bag refills.
    if (bag.length > 1 && bag[bag.length - 1] === state.factIndex) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
  }
  return bag.pop() ?? -1;
}

export function setFishingNear(near: boolean) {
  if (state.near !== near) set({ near });
}

export function startFishing() {
  if (state.phase === "off") set({ phase: "walking", unreachable: false });
}

export function exitFishing() {
  if (state.phase !== "off") set({ phase: "off" });
}

export function fishingUnreachable() {
  set({ phase: "off", unreachable: true });
}

export function clearFishingNotice() {
  if (state.unreachable) set({ unreachable: false });
}

/** The cat sat down at the pier end. */
export function fishingArrived() {
  if (state.phase === "walking") set({ phase: "casting" });
}

/** The bobber landed: wait a random 2-6 s for a bite. */
export function fishingCastDone(now: number) {
  if (state.phase !== "casting") return;
  deadline = now + BITE_DELAY_MIN_MS + Math.random() * (BITE_DELAY_MAX_MS - BITE_DELAY_MIN_MS);
  set({ phase: "waiting" });
}

/** Timed transitions; call every frame while fishing (`deltaMs` = frame time). */
export function tickFishing(now: number, deltaMs: number) {
  if (state.phase === "waiting" && now >= deadline) {
    biteLeft = FISHING_BITE_WINDOW_MS;
    set({ phase: "bite", biteId: state.biteId + 1 });
  } else if (state.phase === "bite" && (biteLeft -= Math.min(deltaMs, MAX_FRAME_MS)) <= 0) {
    deadline = now + MISSED_RECAST_MS;
    set({ phase: "missed" });
  } else if (state.phase === "missed" && now >= deadline) {
    set({ phase: "casting" });
  }
}

/** Click / tap / Space. Only counts during the bite window (early presses are ignored). */
export function hookFish() {
  if (state.phase !== "bite") return false;
  set({ phase: "reeling", lastGolden: Math.random() < GOLDEN_CHANCE });
  return true;
}

/** The fish landed in the bucket: count it and show the fact card. */
export function fishingReelDone() {
  if (state.phase !== "reeling") return;
  set({
    phase: "caught",
    caught: state.caught + 1,
    golden: state.golden + (state.lastGolden ? 1 : 0),
    factIndex: nextFact(),
  });
}

export function castAgain() {
  if (state.phase === "caught" || state.phase === "missed") set({ phase: "casting" });
}

export function isFishingSeated(phase: FishingPhase) {
  return phase !== "off" && phase !== "walking";
}
