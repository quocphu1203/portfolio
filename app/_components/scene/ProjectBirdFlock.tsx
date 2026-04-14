"use client";

import React, { useMemo, useRef } from "react";
import { Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLocale } from "next-intl";
import * as THREE from "three";

import type { AppLocale } from "../../../mock/locale";
import { getProjectBirdItems } from "../../../mock/projectsData";
import { usePortfolioNav } from "../navigation/PortfolioNavContext";

type BirdConfig = {
  radius: number;
  baseHeight: number;
  angleOffset: number;
  liftOffset: number;
};

const BIRD_SCALE = 0.3;
const ENTRANCE_DURATION = 1.05;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function cloneBird(scene: THREE.Object3D) {
  const clone = scene.clone(true);
  clone.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = false;
  });
  return clone;
}

export function ProjectBirdFlock() {
  const locale = useLocale() as AppLocale;
  const { scene } = useGLTF("/wingull.glb") as { scene: THREE.Object3D };
  const { projectBirdsVisible, selectedProjectId, focusProjectBird } = usePortfolioNav();
  const projectBirdItems = getProjectBirdItems(locale);
  const timeRef = useRef(0);
  const birdRefs = useRef<(THREE.Group | null)[]>([]);
  const frozenAngleRef = useRef<Record<string, number>>({});
  const prevPosRef = useRef<Record<string, THREE.Vector3>>({});

  const flockAngularSpeed = 0.19;

  const configs = useMemo<BirdConfig[]>(
    () =>
      projectBirdItems.map((_, i) => ({
        radius: 14.5 + (i % 2) * 1.6,
        baseHeight: 12.6 + (i % 3) * 0.75,
        angleOffset: (i - (projectBirdItems.length - 1) / 2) * 0.28,
        liftOffset: i * 0.7,
      })),
    [projectBirdItems]
  );

  const birds = useMemo(
    () => projectBirdItems.map(() => cloneBird(scene)),
    [scene, projectBirdItems]
  );

  useFrame((_, delta) => {
    if (!projectBirdsVisible) return;
    timeRef.current += delta;
    const t = timeRef.current;

    birdRefs.current.forEach((bird, i) => {
      if (!bird) return;
      const cfg = configs[i];
      const project = projectBirdItems[i];
      const flockAngle = t * flockAngularSpeed + 0.65;
      const baseAngle = flockAngle + cfg.angleOffset;
      const isSelected = selectedProjectId === project.id;
      if (isSelected && frozenAngleRef.current[project.id] === undefined) {
        frozenAngleRef.current[project.id] = baseAngle;
      }
      if (!isSelected && frozenAngleRef.current[project.id] !== undefined) {
        delete frozenAngleRef.current[project.id];
      }
      const angle = isSelected ? frozenAngleRef.current[project.id] : baseAngle;
      const flyRadius = cfg.radius;
      const x = Math.cos(angle) * flyRadius;
      const z = Math.sin(angle) * flyRadius;
      const flockLift = Math.sin(t * 0.58 + cfg.liftOffset);
      const y = cfg.baseHeight + flockLift * (isSelected ? 0.12 : 0.9);

      const spawn = Math.min(1, Math.max(0, (t - i * 0.18) / ENTRANCE_DURATION));
      const k = easeOutCubic(spawn);

      bird.position.set(x, y, z);
      const prev = prevPosRef.current[project.id] ?? new THREE.Vector3(x, y, z);
      const dx = x - prev.x;
      const dz = z - prev.z;
      const travelYaw = Math.sqrt(dx * dx + dz * dz) > 0.0001 ? Math.atan2(dx, dz) : -angle + Math.PI / 2;
      const liftPitch = -0.06 + Math.sin(t * 0.9 + cfg.liftOffset) * (isSelected ? 0.01 : 0.03);
      const bankRoll = Math.sin(t * 0.9 + cfg.liftOffset + 0.5) * (isSelected ? 0.02 : 0.09);
      bird.rotation.set(
        liftPitch,
        travelYaw,
        bankRoll
      );
      prevPosRef.current[project.id] = new THREE.Vector3(x, y, z);
      bird.scale.setScalar(BIRD_SCALE * Math.max(0.0001, k));
      bird.visible = spawn > 0.01;
    });
  });

  if (!projectBirdsVisible) return null;

  return (
    <group name="project-bird-flock">
      {birds.map((bird, i) => {
        const project = projectBirdItems[i];
        const cfg = configs[i];
        return (
          <group
            key={project.id}
            ref={(node) => {
              birdRefs.current[i] = node;
            }}
            position={[
              Math.cos(0.65 + cfg.angleOffset) * cfg.radius,
              cfg.baseHeight,
              Math.sin(0.65 + cfg.angleOffset) * cfg.radius,
            ]}
            scale={0.0001}
            onClick={(e) => {
              e.stopPropagation();
              const wp = new THREE.Vector3();
              const node = birdRefs.current[i];
              if (node) {
                node.getWorldPosition(wp);
                focusProjectBird(project.id, [wp.x, wp.y, wp.z]);
                return;
              }
              focusProjectBird(project.id, [
                Math.cos(0.65 + cfg.angleOffset) * cfg.radius,
                cfg.baseHeight,
                Math.sin(0.65 + cfg.angleOffset) * cfg.radius,
              ]);
            }}
          >
            <primitive object={bird} dispose={null} />
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                const wp = new THREE.Vector3();
                const node = birdRefs.current[i];
                if (node) {
                  node.getWorldPosition(wp);
                  focusProjectBird(project.id, [wp.x, wp.y, wp.z]);
                  return;
                }
                focusProjectBird(project.id, [
                  Math.cos(0.65 + cfg.angleOffset) * cfg.radius,
                  cfg.baseHeight,
                  Math.sin(0.65 + cfg.angleOffset) * cfg.radius,
                ]);
              }}
            >
              <sphereGeometry args={[1.35, 16, 16]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <Html center position={[0, 1.25, 0]} distanceFactor={10}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const wp = new THREE.Vector3();
                  const node = birdRefs.current[i];
                  if (node) {
                    node.getWorldPosition(wp);
                    focusProjectBird(project.id, [wp.x, wp.y, wp.z]);
                  }
                }}
                className="cursor-pointer rounded-full border border-[#88acc0]/55 bg-[#0c151d]/72 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-[#def0f8] backdrop-blur-sm whitespace-nowrap"
              >
                {project.name}
              </button>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

useGLTF.preload("/wingull.glb");
