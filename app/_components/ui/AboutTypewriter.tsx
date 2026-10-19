"use client";

import React from "react";

import { useTypewriter } from "./useTypewriter";

/** About paragraphs revealed with a typewriter effect; click to show everything at once. */
export function AboutTypewriter({ paragraphs, reducedMotion }: { paragraphs: string[]; reducedMotion: boolean }) {
  const total = paragraphs.reduce((sum, p) => sum + p.length, 0);
  const { shown, done, skip } = useTypewriter(total, reducedMotion);
  // Character offset where each paragraph starts.
  const starts = paragraphs.map((_, i) => paragraphs.slice(0, i).reduce((sum, p) => sum + p.length, 0));
  return (
    <div className="space-y-5 text-pretty md:space-y-6" onClick={done ? undefined : skip}>
      {paragraphs.map((paragraph, index) => {
        const visible = Math.max(0, Math.min(paragraph.length, shown - starts[index]));
        const typing = !done && visible > 0 && visible < paragraph.length;
        return (
          <p
            key={paragraph}
            className={[
              "relative text-[#e2edf5]/95",
              index === 0 ? "text-[1.06rem] leading-[1.92] text-[#f2f8fc]" : "",
            ].join(" ")}
          >
            {/* Full text keeps the layout stable (and readable for screen readers); the typed part overlays it. */}
            <span className={done ? "" : "invisible"}>{paragraph}</span>
            {!done && (
              <span className="absolute inset-0" aria-hidden>
                {paragraph.slice(0, visible)}
                {typing && <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-[#f3c77a]" />}
              </span>
            )}
          </p>
        );
      })}
    </div>
  );
}
