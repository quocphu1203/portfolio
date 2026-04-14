"use client";

import { Text } from "@react-three/drei";
import React from "react";

import { SIGN_LABELS, SIGNPOST_ANCHOR, SIGNPOST_SCALE, type NavId } from "./portfolioNavData";
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
  { id: "about", y: 1.4, rotY: 0, arm: 1.12, w: 1.95, h: 0.46, color: "#8b5a4a", emissive: "#c4956a" },
  { id: "articles", y: 0.7, rotY: 0, arm: 1.12, w: 1.55, h: 0.45, color: "#3d6b78", emissive: "#5a9daa" },
  { id: "credits", y: 0.02, rotY: 0, arm: 1.12, w: 2.05, h: 0.43, color: "#6a5a40", emissive: "#a89868" },
  { id: "projects", y: -0.62, rotY: 0, arm: 1.12, w: 1.7, h: 0.48, color: "#5c4a8f", emissive: "#7c6faf" },
];

function SignBoard({ def, onPick }: { def: SignDef; onPick: (id: NavId) => void }) {
  const { rotY, arm, w, h, y, color, emissive, id } = def;
  const cx = Math.cos(rotY) * arm;
  const cz = Math.sin(rotY) * arm;
  const textPaddingX = 0.18;
  const textMaxWidth = Math.max(0.6, w - textPaddingX * 2);
  const textFontSize = Math.min(0.34, h * 0.56);
  const borderThickness = 0.005;
  const borderDepth = 0.045;

  return (
    <group position={[0, y, 0]}>
      <group
        position={[cx, 0, cz]}
        rotation={[0, rotY + Math.PI, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onPick(id);
        }}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[w, h, 0.07]} />
          <meshPhysicalMaterial
            color={color}
            emissive={emissive}
            emissiveIntensity={0.18}
            transparent
            opacity={0.34}
            roughness={0.22}
            metalness={0.04}
            transmission={0.58}
            thickness={0.18}
            ior={1.2}
          />
        </mesh>
        <mesh position={[0, 0, 0.007]} castShadow receiveShadow>
          <boxGeometry args={[Math.max(0.3, w - 0.18), Math.max(0.2, h - 0.14), 0.04]} />
          <meshPhysicalMaterial
            color="#dbe7ee"
            transparent
            opacity={0.16}
            roughness={0.05}
            metalness={0}
            transmission={0.9}
            thickness={0.26}
            ior={1.35}
          />
        </mesh>
        <group position={[0, 0, 0.028]}>
          <mesh castShadow receiveShadow position={[0, h / 2 - borderThickness / 2, 0]}>
            <boxGeometry args={[w, borderThickness, borderDepth]} />
            <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.2} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, -h / 2 + borderThickness / 2, 0]}>
            <boxGeometry args={[w, borderThickness, borderDepth]} />
            <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.2} />
          </mesh>
          <mesh castShadow receiveShadow position={[-w / 2 + borderThickness / 2, 0, 0]}>
            <boxGeometry args={[borderThickness, h - borderThickness * 2, borderDepth]} />
            <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.2} />
          </mesh>
          <mesh castShadow receiveShadow position={[w / 2 - borderThickness / 2, 0, 0]}>
            <boxGeometry args={[borderThickness, h - borderThickness * 2, borderDepth]} />
            <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.2} />
          </mesh>
        </group>
        <Text
          position={[0, 0, 0.045]}
          fontSize={textFontSize}
          maxWidth={textMaxWidth}
          color="#f5f2eb"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.015}
          outlineColor="#1a1510"
        >
          {SIGN_LABELS[id]}
        </Text>
      </group>
    </group>
  );
}

export function IslandSignpostMenu({ visible, scaleMultiplier = 1 }: { visible: boolean; scaleMultiplier?: number }) {
  const { requestNav, signpostTransform } = usePortfolioNav();

  if (!visible) return null;

  const [ax, ay, az] = signpostTransform?.position ?? SIGNPOST_ANCHOR;
  const anchorRotY = (signpostTransform?.rotationY ?? -0.48) + 1;
  return (
    <group
      position={[ax, ay + 0.8, az]}
      rotation={[0, anchorRotY, 0]}
      name="portfolio-signpost"
      scale={SIGNPOST_SCALE * scaleMultiplier}
    >
      {SIGNS.map((def) => (
        <SignBoard key={def.id} def={def} onPick={requestNav} />
      ))}
    </group>
  );
}
