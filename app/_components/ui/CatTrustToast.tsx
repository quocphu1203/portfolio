"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { useReducedMotion } from "../performance/useReducedMotion";
import { getCatPetCount, subscribeCatPets } from "./catPetStore";

const TRUST_PETS = 10;
const TOAST_MS = 5000;

/** One-time toast after the cat has been petted 10 times this session. */
export function CatTrustToast() {
  const t = useTranslations("pet");
  const reducedMotion = useReducedMotion();
  const count = useSyncExternalStore(subscribeCatPets, getCatPetCount, () => 0);
  const [dismissed, setDismissed] = useState(false);
  const visible = count >= TRUST_PETS && !dismissed;

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setDismissed(true), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [visible]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4.5rem)] z-600 flex justify-center px-4" aria-live="polite">
      <AnimatePresence>
        {visible && (
          <motion.div
            key="cat-trust"
            role="status"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="max-w-sm rounded-2xl border border-[#f3b8c9]/50 bg-[#1a1016]/80 px-4 py-3 text-center shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
          >
            <p className="text-sm font-medium text-[#ffe6ee]">{t("trustTitle")}</p>
            <p className="mt-1 text-xs leading-relaxed text-[#e9cbd5]">{t("trustLine")}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
