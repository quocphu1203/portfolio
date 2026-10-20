"use client";

import { useSyncExternalStore } from "react";

const FINE_POINTER = "(hover: hover) and (pointer: fine)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(FINE_POINTER);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** Mouse / trackpad (keyboard hints make sense) vs touch. */
export function useFinePointer() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(FINE_POINTER).matches, () => true);
}
