import * as THREE from "three";

/** While a deselected bird takes off, the camera keeps looking at it (written by ProjectBirdFlock per frame). */
export const birdFollowRuntime = {
  active: false,
  position: new THREE.Vector3(),
};
