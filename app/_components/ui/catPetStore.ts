"use client";

/** Pets this page session (shared by the 3D cat and the "trust" toast). */
let petCount = 0;
const listeners = new Set<() => void>();

export function notifyCatPetted() {
  petCount += 1;
  listeners.forEach((listener) => listener());
  return petCount;
}

export function getCatPetCount() {
  return petCount;
}

export function subscribeCatPets(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}
