"use client";

import { useEffect, useState } from "react";

/**
 * Reveals `total` characters over time (typewriter). Returns how many are visible and a `skip` to show all.
 * Instant when `instant` is set (prefers-reduced-motion). Speed adapts so long texts finish in ~maxSeconds.
 */
export function useTypewriter(total: number, instant: boolean, { charsPerSecond = 70, maxSeconds = 6 } = {}) {
  const [state, setState] = useState({ total, shown: instant ? total : 0, instant });

  // Restart when the text length or the motion preference changes (adjusting state during render).
  if (state.total !== total || state.instant !== instant) {
    setState({ total, shown: instant ? total : 0, instant });
  }

  useEffect(() => {
    if (instant || total <= 0) return;
    const rate = Math.max(charsPerSecond, total / maxSeconds);
    const startedAt = performance.now();
    let raf = 0;
    const tick = () => {
      const shown = Math.min(total, Math.floor(((performance.now() - startedAt) / 1000) * rate));
      setState((s) => (s.shown >= shown ? s : { ...s, shown }));
      if (shown < total) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [total, instant, charsPerSecond, maxSeconds]);

  return {
    shown: state.shown,
    done: state.shown >= total,
    skip: () => setState((s) => ({ ...s, shown: s.total })),
  };
}
