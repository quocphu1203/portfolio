import * as THREE from "three";

import { ISLAND_WATER_LEVEL } from "./islandSceneConstants";

const tmp = new THREE.Vector3();

/**
 * World-space height of the ocean surface. IslandWater lives inside the scaled/offset island group, so its
 * world height is not ISLAND_WATER_LEVEL; read it from the Water mesh (identified by its mirror sampler).
 * Not cached here (the island layout may still change after load); callers refresh it occasionally.
 */
export function resolveWaterLevel(scene: THREE.Object3D) {
  let level: number | null = null;
  scene.traverse((child) => {
    if (level !== null) return;
    const mesh = child as THREE.Mesh;
    const material = mesh.material as THREE.ShaderMaterial | undefined;
    if (mesh.isMesh && material?.uniforms?.mirrorSampler) {
      mesh.getWorldPosition(tmp);
      level = tmp.y;
    }
  });
  return level ?? ISLAND_WATER_LEVEL;
}
