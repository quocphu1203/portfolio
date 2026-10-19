import * as THREE from "three";

/**
 * Per-frame explore-mode data shared between the cat (ExperienceMilestoneTrail) and the camera
 * (CameraNavController) without React state updates every frame.
 */
export const exploreRuntime = {
  catReady: false,
  catPos: new THREE.Vector3(),
  catHeading: 0,
  /** Horizontal angle of the camera around the cat (direction cat -> camera). */
  camYaw: 0,
  camPitch: 0.38,
  camDist: 4.2,
  camInitialised: false,
  /** True while the cat runs to a tapped point: the camera then slowly swings behind it. */
  followHeading: false,
  dragging: false,
  /** Walkable meshes used for camera occlusion checks. */
  groundMeshes: [] as THREE.Mesh[],
  saved: null as { position: THREE.Vector3; target: THREE.Vector3 } | null,
};

export function resetExploreCamera() {
  exploreRuntime.camInitialised = false;
  exploreRuntime.followHeading = false;
  exploreRuntime.dragging = false;
  exploreRuntime.camPitch = 0.38;
  exploreRuntime.camDist = 4.2;
}
