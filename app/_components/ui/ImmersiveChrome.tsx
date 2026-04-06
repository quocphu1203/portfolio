"use client";

import React, { useEffect, useRef, useState } from "react";

const NOISE_SVG =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

type ImmersiveChromeProps = {
  active: boolean;
};

export function ImmersiveChrome({ active }: ImmersiveChromeProps) {
  const [hintVisible, setHintVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [finePointer, setFinePointer] = useState(false);

  useEffect(() => {
    const mqR = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mqP = window.matchMedia("(pointer: fine)");
    const sync = () => {
      setReduceMotion(mqR.matches);
      setFinePointer(mqP.matches);
    };
    let raf = 0;
    raf = requestAnimationFrame(() => {
      sync();
    });
    mqR.addEventListener("change", sync);
    mqP.addEventListener("change", sync);
    return () => {
      cancelAnimationFrame(raf);
      mqR.removeEventListener("change", sync);
      mqP.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(() => {
      setHintVisible(false);
    }, 4500);
    return () => window.clearTimeout(t);
  }, [active]);

  if (!active) return null;

  return (
    <>
      {!reduceMotion && (
        <div
          className="pointer-events-none fixed inset-0 z-6 mix-blend-overlay"
          style={{
            opacity: 0.045,
            backgroundImage: NOISE_SVG,
            backgroundSize: "128px 128px",
            animation: "island-grain 0.5s steps(4) infinite",
          }}
          aria-hidden
        />
      )}

      <div
        className="pointer-events-none fixed inset-0 z-5"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, transparent 0%, transparent 45%, rgba(5,8,12,0.55) 100%)",
        }}
        aria-hidden
      />

      {!reduceMotion && finePointer && <ImmersiveCursor />}

      <div
        className={[
          "pointer-events-none fixed bottom-10 left-0 right-0 z-8 text-center text-[11px] tracking-[0.25em] text-[#9fb0bd]/80 uppercase transition-opacity duration-700",
          hintVisible ? "opacity-100" : "opacity-0",
        ].join(" ")}
        aria-live="polite"
      >
        Kéo để xoay · Scroll zoom
      </div>
    </>
  );
}

function ImmersiveCursor() {
  const dot = useRef({ x: 0, y: 0 });
  const ring = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const dotEl = useRef<HTMLDivElement>(null);
  const ringEl = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
      dot.current.x = e.clientX;
      dot.current.y = e.clientY;
    };

    window.addEventListener("mousemove", onMove, { passive: true });

    const tick = () => {
      ring.current.x += (target.current.x - ring.current.x) * 0.12;
      ring.current.y += (target.current.y - ring.current.y) * 0.12;

      const d = dotEl.current;
      const r = ringEl.current;
      if (d) {
        d.style.transform = `translate3d(${dot.current.x}px, ${dot.current.y}px, 0) translate(-50%, -50%)`;
      }
      if (r) {
        r.style.transform = `translate3d(${ring.current.x}px, ${ring.current.y}px, 0) translate(-50%, -50%)`;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <>
      <div
        ref={ringEl}
        className="pointer-events-none fixed left-0 top-0 z-100 h-9 w-9 rounded-full border border-[#8fb8c8]/45"
        style={{ willChange: "transform" }}
        aria-hidden
      />
      <div
        ref={dotEl}
        className="pointer-events-none fixed left-0 top-0 z-101 h-1.5 w-1.5 rounded-full bg-[#e8eef2]"
        style={{ willChange: "transform" }}
        aria-hidden
      />
    </>
  );
}
