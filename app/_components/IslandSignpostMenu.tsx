"use client";

import { Text } from "@react-three/drei";
import React from "react";

import { SIGN_LABELS, SIGNPOST_ANCHOR, type NavId } from "./portfolioNavData";
import { usePortfolioNav } from "./PortfolioNavContext";

type SignDef = {
  id: NavId;
  y: number;
  rotY: number;
  arm: number;
  w: number;
  h: number;
  color: string;
  emissive: string;
};

const SIGNS: SignDef[] = [
  { id: "projects", y: 4.1, rotY: -0.35, arm: 1.15, w: 2.4, h: 0.62, color: "#5c4a8f", emissive: "#7c6faf" },
  { id: "articles", y: 3.05, rotY: 0.2, arm: 1.0, w: 2.2, h: 0.55, color: "#3d6b78", emissive: "#5a9daa" },
  { id: "about", y: 2.0, rotY: -0.5, arm: 0.95, w: 2.0, h: 0.52, color: "#8b5a4a", emissive: "#c4956a" },
  { id: "credits", y: 0.95, rotY: 0.45, arm: 0.88, w: 1.85, h: 0.48, color: "#6a5a40", emissive: "#a89868" },
];

function SignBoard({ def, onPick }: { def: SignDef; onPick: (id: NavId) => void }) {
  const { rotY, arm, w, h, y, color, emissive, id } = def;
  const cx = Math.cos(rotY) * arm;
  const cz = Math.sin(rotY) * arm;

  return (
    <group position={[0, y, 0]}>
      <group
        position={[cx, 0, cz]}
        rotation={[0, rotY, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onPick(id);
        }}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[w, h, 0.07]} />
          <meshStandardMaterial
            color={color}
            emissive={emissive}
            emissiveIntensity={0.55}
            roughness={0.45}
            metalness={0.15}
          />
        </mesh>
        <Text
          position={[0, 0, 0.045]}
          fontSize={0.38}
          color="#f5f2eb"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#1a1510"
        >
          {SIGN_LABELS[id]}
        </Text>
      </group>
    </group>
  );
}

export function IslandSignpostMenu({ visible }: { visible: boolean }) {
  const { requestNav } = usePortfolioNav();

  if (!visible) return null;

  const [ax, ay, az] = SIGNPOST_ANCHOR;
  return (
    <group position={[ax, ay, az]} rotation={[0, -0.48, 0]} name="portfolio-signpost" scale={0.34}>
      <mesh castShadow receiveShadow position={[0, 3.2, 0]}>
        <cylinderGeometry args={[0.14, 0.18, 7.2, 10]} />
        <meshStandardMaterial color="#2a2420" roughness={0.85} metalness={0.05} />
      </mesh>
      <mesh castShadow position={[0, 6.75, 0]}>
        <sphereGeometry args={[0.32, 12, 12]} />
        <meshStandardMaterial
          color="#fff6e8"
          emissive="#ffe8cc"
          emissiveIntensity={0.35}
          roughness={0.35}
        />
      </mesh>
      {SIGNS.map((def) => (
        <SignBoard key={def.id} def={def} onPick={requestNav} />
      ))}
      <mesh position={[0.15, 5.95, 0.12]} rotation={[0, 0.2, 0.08]} castShadow>
        <boxGeometry args={[0.55, 0.35, 0.04]} />
        <meshStandardMaterial color="#3a4a38" emissive="#2a3a28" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}
