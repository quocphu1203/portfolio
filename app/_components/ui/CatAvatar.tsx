"use client";

import React from "react";

/** Small inline-SVG cat face for the intro dialog (no image asset). The tail wags unless reduced motion. */
export function CatAvatar({ reducedMotion, className = "" }: { reducedMotion: boolean; className?: string }) {
  return (
    <div
      className={[
        "relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-[#dca869]/70 bg-[#2f1f11]/80 shadow-[0_0_18px_rgba(220,168,105,0.35)]",
        className,
      ].join(" ")}
      aria-hidden
    >
      <svg viewBox="0 0 64 64" className="h-full w-full">
        <g
          className={reducedMotion ? "" : "origin-[46px_52px] animate-[cat-tail_1.1s_ease-in-out_infinite]"}
          style={{ transformBox: "view-box" }}
        >
          <path d="M46 52 C 58 50, 60 38, 54 32" fill="none" stroke="#c98a4b" strokeWidth="5" strokeLinecap="round" />
        </g>
        <ellipse cx="30" cy="52" rx="17" ry="11" fill="#d39552" />
        <path d="M14 22 L18 8 L26 17 Z" fill="#d39552" />
        <path d="M46 22 L42 8 L34 17 Z" fill="#d39552" />
        <path d="M17 19 L19 12 L23 16 Z" fill="#f3c3a0" />
        <path d="M43 19 L41 12 L37 16 Z" fill="#f3c3a0" />
        <ellipse cx="30" cy="30" rx="17" ry="15" fill="#e0a45f" />
        <ellipse cx="23" cy="29" rx="2.6" ry="3.4" fill="#2a1a0e" />
        <ellipse cx="37" cy="29" rx="2.6" ry="3.4" fill="#2a1a0e" />
        <circle cx="24" cy="28" r="0.9" fill="#fff" />
        <circle cx="38" cy="28" r="0.9" fill="#fff" />
        <path d="M28 34 L32 34 L30 36.5 Z" fill="#b8605a" />
        <path d="M30 36.5 Q 27 39 25 37.5 M30 36.5 Q 33 39 35 37.5" fill="none" stroke="#5a3520" strokeWidth="1" strokeLinecap="round" />
        <path d="M18 34 L8 32 M18 36 L8 37 M42 34 L52 32 M42 36 L52 37" stroke="#fbe6cf" strokeWidth="0.8" strokeLinecap="round" />
      </svg>
    </div>
  );
}
