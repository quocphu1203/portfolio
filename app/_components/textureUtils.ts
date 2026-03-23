import * as THREE from "three";

export function extractFirstTextureMap(root: THREE.Object3D): THREE.Texture | null {
  const stack: THREE.Object3D[] = [root];

  while (stack.length > 0) {
    const obj = stack.pop();
    if (!obj) continue;

    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of materials) {
        const map = (mat as unknown as { map?: unknown }).map;
        if (map && map instanceof THREE.Texture) return map;
      }
    }

    stack.push(...obj.children);
  }

  return null;
}

