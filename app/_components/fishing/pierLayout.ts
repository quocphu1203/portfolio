import * as THREE from "three";

/* ================================================================================================
 * FISHING PIER - tweak here.
 * The island had no dock, so a small instanced wooden pier is added on the south beach: the open shoreline
 * nearest the boat lane (the boat pauses wherever it is on its r = 20 orbit, so every edge is about as near;
 * this beach is the closest clear, walkable one). Probed headlessly against island2: no rocks / trees under the
 * deck (rocks start at z < -10 east of x = -1.8), the cast point is over clear water, far inside the boat orbit.
 *   PIER_ORIGIN  - land end of the deck (x, deck top y, z)
 *   PIER_YAW     - direction the pier runs out to sea (0 = +z, PI = -z)
 *   PIER_LENGTH  - deck length; the cat sits near the end
 *   FISHING_FACE_OFFSET - where the sitting cat looks, relative to the pier direction
 * Moving the pier far: re-check FISHING_ROUTE (the walk down from the explore spawn ends at PIER_ORIGIN).
 * ============================================================================================== */
export const PIER_ORIGIN = new THREE.Vector3(-2.1, 1.74, -8.85);
export const PIER_YAW = Math.PI;
export const PIER_LENGTH = 1.0;
export const PIER_WIDTH = 0.5;
export const PIER_DECK_THICKNESS = 0.05;
export const PIER_PLANKS = 5;
/** Posts reach this world height (below the water surface). */
export const PIER_POST_BOTTOM = 0.95;
/** Corner posts at the sea end stick up this far above the deck (railing posts; the cat can't step over). */
export const PIER_END_POST_HEIGHT = 0.36;
export const FISHING_FACE_OFFSET = Math.PI / 3;
export const FISHING_CAST_DISTANCE = 1.2;
/** "Go fishing" prompt when the explore cat is this close to the pier entry. */
export const FISHING_PROMPT_RADIUS = 1.4;
/** Sign beside the pier entry, in pier-local (lateral, along) metres; y is snapped onto the beach at runtime. */
export const FISHING_SIGN_LOCAL = new THREE.Vector2(0.4, -0.08);

/** Name of the pier mesh: explore treats it as ground (deck walkable, tall end posts block like a step). */
export const PIER_MESH_NAME = "fishing-pier";

// ---- derived layout (world space) --------------------------------------------------------------
/** Unit vector along the pier, out to sea. */
export const PIER_DIR = new THREE.Vector3(Math.sin(PIER_YAW), 0, Math.cos(PIER_YAW));
/** Pier-local "right" (x) axis. */
export const PIER_SIDE = new THREE.Vector3(Math.cos(PIER_YAW), 0, -Math.sin(PIER_YAW));

export function pierPoint(lateral: number, along: number, y = PIER_ORIGIN.y) {
  return new THREE.Vector3(
    PIER_ORIGIN.x + PIER_SIDE.x * lateral + PIER_DIR.x * along,
    y,
    PIER_ORIGIN.z + PIER_SIDE.z * lateral + PIER_DIR.z * along
  );
}

export const FISHING_SEAT = pierPoint(0, PIER_LENGTH - 0.25);
export const FISHING_HEADING = PIER_YAW + FISHING_FACE_OFFSET;
export const FISHING_FORWARD = new THREE.Vector3(Math.sin(FISHING_HEADING), 0, Math.cos(FISHING_HEADING));
/** The cat's side (same lateral convention as its turn lean). */
export const FISHING_LATERAL = new THREE.Vector3(Math.cos(FISHING_HEADING), 0, -Math.sin(FISHING_HEADING));
export const PIER_ENTRY = pierPoint(0, 0.1);
export const FISHING_SIGN_POS = pierPoint(FISHING_SIGN_LOCAL.x, FISHING_SIGN_LOCAL.y);

/**
 * Obstacle-free walk from the explore spawn (route start) down to the beach by the pier, found by A* over a
 * 0.2 grid of the walkable terrain (cells clear of rocks / trees / props by 0.32, gentle height steps) and
 * string-pulled. The cat follows it with the regular explore movement from the waypoint nearest to it.
 */
export const FISHING_ROUTE: readonly THREE.Vector3[] = [
  ...(
    [
      [-1.6, 4.52, -2.8],
      [-1.2, 4.35, -3.2],
      [-1.0, 4.21, -3.4],
      [-1.0, 4.11, -3.6],
      [-1.0, 4.0, -3.8],
      [-1.1, 3.9, -4.0],
      [-1.0, 3.75, -4.2],
      [-0.9, 3.6, -4.4],
      [-0.9, 3.51, -4.6],
      [-0.9, 3.37, -4.8],
      [-0.9, 3.28, -5.0],
      [-0.8, 3.14, -5.2],
      [-0.7, 3.01, -5.4],
      [-0.8, 2.92, -5.6],
      [-0.8, 2.83, -5.8],
      [-0.8, 2.74, -6.0],
      [-0.8, 2.65, -6.2],
      [-1.0, 2.52, -6.4],
      [-1.0, 2.43, -6.6],
      [-1.2, 2.31, -6.8],
      [-1.6, 1.86, -8.6],
      [-1.8, 1.73, -8.8],
    ] as const
  ).map(([x, y, z]) => new THREE.Vector3(x, y, z)),
  PIER_ENTRY,
  FISHING_SEAT,
];
