"use client";

import { useSyncExternalStore } from "react";
import * as THREE from "three";

/** Explore discoveries (milestones the cat neared / opened, the fishing pier), kept for the browser session. */
export type ExploreProgress = { milestones: readonly number[]; pier: boolean };

const STORAGE_KEY = "portfolio-explore-discovered";
const EMPTY: ExploreProgress = { milestones: [], pier: false };
let progress: ExploreProgress | null = null;
const listeners = new Set<() => void>();

function read(): ExploreProgress {
  if (progress) return progress;
  progress = EMPTY;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ExploreProgress>;
      progress = {
        milestones: Array.isArray(parsed.milestones) ? parsed.milestones.filter((n) => Number.isInteger(n)) : [],
        pier: parsed.pier === true,
      };
    }
  } catch {
    // Storage unavailable: session-only in memory.
  }
  return progress;
}

function write(next: ExploreProgress) {
  progress = next;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore (private mode).
  }
  listeners.forEach((listener) => listener());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getExploreProgress() {
  return typeof window === "undefined" ? EMPTY : read();
}

export function useExploreProgress() {
  return useSyncExternalStore(subscribe, getExploreProgress, () => EMPTY);
}

export function markMilestoneDiscovered(idx: number) {
  const current = read();
  if (idx < 0 || current.milestones.includes(idx)) return;
  write({ ...current, milestones: [...current.milestones, idx].sort((a, b) => a - b) });
}

export function markPierDiscovered() {
  const current = read();
  if (!current.pier) write({ ...current, pier: true });
}

/**
 * Nearest undiscovered point of interest, refreshed every explore frame by the cat (no React state):
 * the HUD reads it in its own animation-frame loop. `angle` is the on-screen direction from the cat to the POI
 * (radians, 0 = up, clockwise), `dist` the ground distance in world units.
 */
export const explorePoi = {
  valid: false,
  kind: "milestone" as "milestone" | "pier",
  idx: -1,
  angle: 0,
  dist: 0,
  milestoneTotal: 0,
};

const catNdc = new THREE.Vector3();
const poiNdc = new THREE.Vector3();
const toPoi = new THREE.Vector3();
const camDir = new THREE.Vector3();

export function updateExplorePoi(
  camera: THREE.Camera,
  aspect: number,
  cat: THREE.Vector3,
  milestones: readonly { idx: number; position: THREE.Vector3 }[],
  pier: THREE.Vector3
) {
  const found = read();
  explorePoi.milestoneTotal = milestones.length;
  let best: THREE.Vector3 | null = null;
  let bestDist = Infinity;
  for (const stop of milestones) {
    if (found.milestones.includes(stop.idx)) continue;
    const d = Math.hypot(stop.position.x - cat.x, stop.position.z - cat.z);
    if (d < bestDist) {
      bestDist = d;
      best = stop.position;
      explorePoi.kind = "milestone";
      explorePoi.idx = stop.idx;
    }
  }
  if (!found.pier) {
    const d = Math.hypot(pier.x - cat.x, pier.z - cat.z);
    if (d < bestDist) {
      bestDist = d;
      best = pier;
      explorePoi.kind = "pier";
      explorePoi.idx = -1;
    }
  }
  explorePoi.valid = best !== null;
  if (!best) return;
  explorePoi.dist = bestDist;
  catNdc.set(cat.x, cat.y + 0.15, cat.z).project(camera);
  // Points behind the camera project mirrored: then use a point 1 unit from the cat toward the POI instead.
  camera.getWorldDirection(camDir);
  toPoi.set(best.x - camera.position.x, 0, best.z - camera.position.z);
  if (toPoi.dot(camDir) < 0.05) {
    const step = 1 / Math.max(bestDist, 1e-3);
    poiNdc.set(cat.x + (best.x - cat.x) * step, cat.y + 0.15, cat.z + (best.z - cat.z) * step).project(camera);
  } else {
    poiNdc.set(best.x, best.y + 0.15, best.z).project(camera);
  }
  const dx = (poiNdc.x - catNdc.x) * aspect;
  const dy = poiNdc.y - catNdc.y;
  if (Math.abs(dx) + Math.abs(dy) > 1e-6) explorePoi.angle = Math.atan2(dx, dy);
}
