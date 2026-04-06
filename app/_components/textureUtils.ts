import * as THREE from "three";

export function extractFirstTextureMap(root: THREE.Object3D): THREE.Texture | null {
  const stack: THREE.Object3D[] = [root];

  let bestTexture: THREE.Texture | null = null;
  let bestArea = -1;

  while (stack.length > 0) {
    const obj = stack.pop();
    if (!obj) continue;

    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of materials) {
        const m = mat as unknown as { map?: unknown; emissiveMap?: unknown };
        const candidate = m.map ?? m.emissiveMap;
        if (!candidate || !(candidate instanceof THREE.Texture)) continue;

        // Choose the highest-resolution texture we can find.
        // This tends to pick the sky panorama rather than small detail maps.
        const image = candidate.image as unknown as { width?: number; height?: number } | undefined;
        const w = image?.width;
        const h = image?.height;
        const area = typeof w === "number" && typeof h === "number" ? w * h : 0;

        if (area > bestArea) {
          bestArea = area;
          bestTexture = candidate;
        }
      }
    }

    stack.push(...obj.children);
  }

  return bestTexture;
}

