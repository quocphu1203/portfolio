"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";

import type { ExperienceMilestone } from "../../../mock/experienceData";

/** After the user scrolls or clicks in the list, auto-tracking waits this long before following the cat again. */
const MANUAL_PAUSE_MS = 4000;
/** Gap kept above an entry taller than the visible area (its heading stays in view). */
const TALL_ENTRY_TOP_GAP = 12;
const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);

type Props = {
  milestones: ExperienceMilestone[];
  /** Milestones the cat has reached (index < unlockedCount), same order / index as the 3D trail flags. */
  unlockedCount: number;
  /** Milestone the cat stands at (-1 while running / none yet). */
  catIndex: number;
  /** Milestone the cat is running to after a pick (null when not travelling). */
  headingIndex: number | null;
  /** Picking an entry sends the cat there (guided Experience only, not in explore mode). */
  onPick?: (index: number) => void;
  reducedMotion: boolean;
  lockedLabel: string;
  currentLabel: string;
  headingLabel: string;
};

/**
 * Experience timeline that follows the guided cat: the milestone it just reached becomes the active entry and is
 * scrolled to the centre of the panel's scroll area; earlier ones are marked visited.
 */
export function ExperienceMilestoneList({
  milestones,
  unlockedCount,
  catIndex,
  headingIndex,
  onPick,
  reducedMotion,
  lockedLabel,
  currentLabel,
  headingLabel,
}: Props) {
  const listRef = useRef<HTMLOListElement>(null);
  const pausedUntilRef = useRef(0);
  const scrolledForRef = useRef(-1);
  const reachedIndex = catIndex < milestones.length ? catIndex : -1;
  const initialReachedRef = useRef(reachedIndex);
  // A picked entry is active right away ("heading here"); it is scrolled to once the cat arrives.
  const activeIndex = headingIndex ?? reachedIndex;

  const scrollToIndex = useCallback(
    (index: number, instant: boolean) => {
      const list = listRef.current;
      const viewport = list?.closest<HTMLElement>('[data-slot="scroll-area-viewport"]');
      const item = list?.children[index] as HTMLElement | undefined;
      if (!viewport || !item) return;
      const viewRect = viewport.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      const itemTop = itemRect.top - viewRect.top + viewport.scrollTop;
      const top =
        itemRect.height > viewRect.height
          ? itemTop - TALL_ENTRY_TOP_GAP
          : itemTop - (viewRect.height - itemRect.height) / 2;
      const maxTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
      viewport.scrollTo({
        top: Math.min(maxTop, Math.max(0, top)),
        behavior: instant || reducedMotion ? "auto" : "smooth",
      });
    },
    [reducedMotion]
  );

  // Manual scrolling (wheel, touch, scrollbar drag, keys) pauses auto-tracking for a few seconds.
  useEffect(() => {
    const root = listRef.current?.closest<HTMLElement>('[data-slot="scroll-area"]');
    if (!root) return;
    const pause = () => {
      pausedUntilRef.current = performance.now() + MANUAL_PAUSE_MS;
    };
    const onKey = (e: KeyboardEvent) => {
      if (SCROLL_KEYS.has(e.key)) pause();
    };
    root.addEventListener("wheel", pause, { passive: true });
    root.addEventListener("touchstart", pause, { passive: true });
    root.addEventListener("pointerdown", pause);
    root.addEventListener("keydown", onKey);
    return () => {
      root.removeEventListener("wheel", pause);
      root.removeEventListener("touchstart", pause);
      root.removeEventListener("pointerdown", pause);
      root.removeEventListener("keydown", onKey);
    };
  }, []);

  // Follow the cat: each newly reached milestone is brought into view (deferred while the user is in control).
  useEffect(() => {
    if (reachedIndex < 0) {
      // Running between milestones: arriving back at the previous one scrolls to it again.
      if (scrolledForRef.current !== -1) scrolledForRef.current = -2;
      return;
    }
    if (scrolledForRef.current === reachedIndex) return;
    // Panel opened mid-journey: jump straight to the current milestone.
    const instant = scrolledForRef.current === -1 && reachedIndex === initialReachedRef.current;
    let timer = 0;
    const attempt = () => {
      const wait = pausedUntilRef.current - performance.now();
      if (wait > 0) {
        timer = window.setTimeout(attempt, wait + 30);
        return;
      }
      scrolledForRef.current = reachedIndex;
      scrollToIndex(reachedIndex, instant);
    };
    // One frame later the newly unlocked entry's content is laid out, so its final size is measured.
    const frame = requestAnimationFrame(attempt);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [reachedIndex, scrollToIndex]);

  const pick = (index: number) => {
    if (!onPick) return;
    // A pick is the user asking to follow the cat: no manual-scroll pause for the arrival scroll.
    pausedUntilRef.current = 0;
    onPick(index);
  };

  return (
    <ol ref={listRef} className="mb-6 space-y-4">
      {milestones.map((milestone, index) => {
        const unlocked = index < unlockedCount;
        const active = index === activeIndex;
        const state = active ? "active" : unlocked ? "visited" : "locked";
        return (
          <li
            key={milestone.id}
            data-milestone-id={milestone.id}
            data-milestone-index={index}
            data-state={state}
            aria-current={active ? "step" : undefined}
            className="relative pl-7"
          >
            <span
              className={[
                "absolute top-2 left-0 h-3 w-3 rounded-full border transition-[background-color,border-color,box-shadow] duration-500 motion-reduce:transition-none",
                active
                  ? "border-[#d9f3ff] bg-[#7fd0ec] shadow-[0_0_0_4px_rgba(127,208,236,0.22)]"
                  : unlocked
                    ? "border-[#9ad0e4]/80 bg-[#2b7b96]"
                    : "border-[#6c8794]/70 bg-transparent",
              ].join(" ")}
            />
            {index < milestones.length - 1 && (
              <span
                className={[
                  "absolute top-5 left-[5px] h-[calc(100%+0.75rem)] w-[2px] bg-linear-to-b",
                  index < unlockedCount - 1 ? "from-[#7fb3c6]/80 to-[#7fb3c6]/45" : "from-[#7fb3c6]/45 to-[#2e4f60]/20",
                ].join(" ")}
              />
            )}
            <article
              onClick={() => pick(index)}
              onKeyDown={(e) => {
                if (e.key === "Enter") pick(index);
              }}
              tabIndex={onPick ? 0 : undefined}
              className={[
                "rounded-xl border p-4 outline-none transition-[background-color,border-color,box-shadow,opacity] duration-500 focus-visible:ring-2 focus-visible:ring-[#9ad0e4]/60 motion-reduce:transition-none",
                active
                  ? "border-[#9ad0e4]/90 bg-[#16323f]/70 shadow-[0_0_24px_rgba(127,208,236,0.16)]"
                  : unlocked
                    ? "border-[#5f7d8b]/65 bg-[#11212a]/45"
                    : "border-[#4b6270]/55 bg-[#0e1b22]/40 opacity-80",
                onPick && !active ? "cursor-pointer hover:border-[#8fb8c8]/80" : "",
              ].join(" ")}
            >
              <div className="mb-1 flex items-center justify-between gap-3">
                <p className="text-xs tracking-[0.14em] text-[#9cc4d4] uppercase">{milestone.period}</p>
                {(index === reachedIndex || index === headingIndex) && (
                  <span className="shrink-0 rounded-full border border-[#9ad0e4]/70 bg-[#17313d]/70 px-2 py-0.5 text-[10px] tracking-[0.08em] text-[#d9f3ff]">
                    {index === headingIndex ? headingLabel : currentLabel}
                  </span>
                )}
              </div>
              {unlocked ? (
                <motion.div
                  initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                >
                  <h3 className="text-lg font-medium text-[#e7f4fb]">{milestone.title}</h3>
                  <p className="mb-2 text-sm text-[#b6d3df]">{milestone.company}</p>
                  <p className="mb-3 whitespace-pre-line text-sm leading-relaxed text-[#c4dbe6]">{milestone.summary}</p>
                  <ul className="flex flex-wrap gap-2">
                    {milestone.skills.map((skill) => (
                      <li
                        key={skill}
                        className="rounded-full border border-[#5f8495]/70 bg-[#17313d]/55 px-2.5 py-1 text-xs text-[#d1e7f2]"
                      >
                        {skill}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ) : (
                <p className="text-sm text-[#8fa6b1]">{lockedLabel}</p>
              )}
            </article>
          </li>
        );
      })}
    </ol>
  );
}
