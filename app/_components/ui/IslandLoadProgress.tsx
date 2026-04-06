"use client";

import { useProgress } from "@react-three/drei";
import { useEffect } from "react";

export type IslandLoadSnapshot = {
  progress: number;
  active: boolean;
  loaded: number;
  total: number;
};

export function IslandLoadProgress({
  onChange,
}: {
  onChange: (s: IslandLoadSnapshot) => void;
}) {
  const { progress, active, loaded, total } = useProgress();

  useEffect(() => {
    onChange({ progress, active, loaded, total });
  }, [progress, active, loaded, total, onChange]);

  return null;
}
