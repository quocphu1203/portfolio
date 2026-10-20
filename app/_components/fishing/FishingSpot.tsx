"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useTranslations } from "next-intl";
import * as THREE from "three";

import { playSplash } from "../audio/catSound";
import { usePortfolioNav } from "../navigation/PortfolioNavContext";
import { useReducedMotion } from "../performance/useReducedMotion";
import { resolveWaterLevel } from "../scene/waterLevel";
import {
  FISHING_CAST_DISTANCE,
  FISHING_FORWARD,
  FISHING_HEADING,
  FISHING_LATERAL,
  FISHING_SEAT,
  FISHING_SIGN_POS,
  PIER_DECK_THICKNESS,
  PIER_END_POST_HEIGHT,
  PIER_LENGTH,
  PIER_MESH_NAME,
  PIER_ORIGIN,
  PIER_PLANKS,
  PIER_POST_BOTTOM,
  PIER_WIDTH,
  PIER_YAW,
  pierPoint,
} from "./pierLayout";
import {
  fishingCastDone,
  fishingReelDone,
  getFishingState,
  startFishing,
  tickFishing,
  useFishingState,
  type FishingPhase,
} from "./fishingStore";

const CAST_SECONDS = 0.7;
const REEL_SECONDS = 0.95;
const ESCAPE_SECONDS = 0.55;
const RING_SECONDS = 0.8;
const RING_POOL = 2;
const SIGN_HEIGHT = 0.42;
const FISH_COLOR = new THREE.Color("#6f97b5");
const GOLD_COLOR = new THREE.Color("#f0c043");
const GOLD_EMISSIVE = new THREE.Color("#5a3c00");
const NO_EMISSIVE = new THREE.Color("#000000");
const UP = new THREE.Vector3(0, 1, 0);
/** Per-frame scratch vectors (single pier in the scene). */
const tmp = { tip: new THREE.Vector3(), cast: new THREE.Vector3(), p: new THREE.Vector3(), escape: new THREE.Vector3() };

type Box = { pos: THREE.Vector3; size: THREE.Vector3; color: string };

/** Planks + posts (+ the sign post) of the pier as boxes in world space; one instanced draw call. */
function pierBoxes(signGroundY: number): Box[] {
  const boxes: Box[] = [];
  const plankLen = PIER_LENGTH / PIER_PLANKS;
  const plankColors = ["#9b6b40", "#8b5e37", "#a57647"];
  for (let i = 0; i < PIER_PLANKS; i += 1) {
    boxes.push({
      pos: pierPoint(0, plankLen * (i + 0.5), PIER_ORIGIN.y - PIER_DECK_THICKNESS / 2),
      // Planks touch (no gaps): the deck stays continuous ground for the cat's step probe.
      size: new THREE.Vector3(PIER_WIDTH + (i % 2) * 0.03, PIER_DECK_THICKNESS, plankLen),
      color: plankColors[i % plankColors.length],
    });
  }
  const side = PIER_WIDTH / 2 + 0.03;
  const posts: [number, number, boolean][] = [
    [-side, 0.12, false],
    [side, 0.12, false],
    [-side, PIER_LENGTH * 0.55, false],
    [side, PIER_LENGTH * 0.55, false],
    [-side, PIER_LENGTH - 0.04, true],
    [side, PIER_LENGTH - 0.04, true],
  ];
  for (const [lat, along, tall] of posts) {
    const top = PIER_ORIGIN.y + (tall ? PIER_END_POST_HEIGHT : -0.005);
    boxes.push({
      pos: pierPoint(lat, along, (top + PIER_POST_BOTTOM) / 2),
      size: new THREE.Vector3(0.06, top - PIER_POST_BOTTOM, 0.06),
      color: "#6b4528",
    });
  }
  // Lantern block on the sea-end post (light-coloured instance, no extra draw call).
  boxes.push({
    pos: pierPoint(-side, PIER_LENGTH - 0.04, PIER_ORIGIN.y + PIER_END_POST_HEIGHT + 0.035),
    size: new THREE.Vector3(0.07, 0.07, 0.07),
    color: "#ffe2a8",
  });
  boxes.push({
    pos: new THREE.Vector3(FISHING_SIGN_POS.x, signGroundY + SIGN_HEIGHT / 2 - 0.05, FISHING_SIGN_POS.z),
    size: new THREE.Vector3(0.04, SIGN_HEIGHT + 0.1, 0.04),
    color: "#6b4528",
  });
  return boxes;
}

function drawSign(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#a87a4b";
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = "#946638";
    for (let y = 30; y < 128; y += 32) ctx.fillRect(0, y, 256, 3);
    ctx.strokeStyle = "#5e3d22";
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 248, 120);
    ctx.fillStyle = "#fff4dc";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 40px system-ui, sans-serif";
    ctx.fillText(text, 128, 66, 230);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Bobber: red top / white bottom via vertex colours (one mesh). */
function bobberGeometry() {
  const geo = new THREE.SphereGeometry(0.028, 8, 6);
  const pos = geo.getAttribute("position");
  const colors = new Float32Array(pos.count * 3);
  const red = new THREE.Color("#e2483a");
  const white = new THREE.Color("#f4f1ea");
  for (let i = 0; i < pos.count; i += 1) (pos.getY(i) > 0.004 ? red : white).toArray(colors, i * 3);
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geo;
}

/**
 * The fishing pier (always there: scenery + "Fishing" sign) and, while fishing, the rod, line, bobber,
 * splash rings and the caught fish. Everything is created once and reused (no per-cast allocations).
 */
export function FishingSpot() {
  const scene = useThree((s) => s.scene);
  const t = useTranslations("fishing");
  const reducedMotion = useReducedMotion();
  const { exploreMode, enterExplore, activeSection, introPhase } = usePortfolioNav();
  const { phase, lastGolden } = useFishingState();
  const seated = phase !== "off" && phase !== "walking";

  const pierRef = useRef<THREE.InstancedMesh>(null);
  const signRef = useRef<THREE.Mesh>(null);
  const gearRef = useRef<THREE.Group>(null);
  const bobberRef = useRef<THREE.Mesh>(null);
  const fishRef = useRef<THREE.Group>(null);
  const ringsRef = useRef<THREE.Group>(null);
  const waterRef = useRef(1.21);
  const anim = useRef({ phase: "off" as FishingPhase, t: 0, ringNext: 0, ringAge: new Array(RING_POOL).fill(RING_SECONDS) });

  const res = useMemo(() => {
    const unitBox = new THREE.BoxGeometry(1, 1, 1);
    const wood = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.92, flatShading: true });
    const signWood = new THREE.MeshStandardMaterial({ color: "#a87a4b", roughness: 0.92, flatShading: true });
    const bucketGeo = new THREE.CylinderGeometry(0.075, 0.058, 0.1, 7);
    const bucketMat = new THREE.MeshStandardMaterial({ color: "#6f8796", roughness: 0.7, flatShading: true });
    const rodGeo = new THREE.CylinderGeometry(0.005, 0.01, 1, 5);
    rodGeo.translate(0, 0.5, 0);
    const rodMat = new THREE.MeshStandardMaterial({ color: "#4a2f1c", roughness: 0.8, flatShading: true });
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    const lineMat = new THREE.LineBasicMaterial({ color: "#f2f2f2", transparent: true, opacity: 0.75 });
    const line = new THREE.Line(lineGeo, lineMat);
    line.frustumCulled = false;
    const bobberGeo = bobberGeometry();
    const bobberMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, flatShading: true });
    const ringGeo = new THREE.RingGeometry(0.05, 0.065, 18);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMats = Array.from(
      { length: RING_POOL },
      () => new THREE.MeshBasicMaterial({ color: "#eaf6ff", transparent: true, opacity: 0, depthWrite: false })
    );
    const fishBody = new THREE.SphereGeometry(0.05, 6, 4);
    fishBody.scale(0.55, 0.85, 1.6);
    const fishTail = new THREE.ConeGeometry(0.04, 0.07, 4);
    fishTail.rotateX(Math.PI / 2);
    fishTail.translate(0, 0, -0.105);
    const fishMat = new THREE.MeshStandardMaterial({ color: FISH_COLOR, roughness: 0.45, metalness: 0.2, flatShading: true });
    return { unitBox, wood, signWood, bucketGeo, bucketMat, rodGeo, rodMat, line, lineGeo, lineMat, bobberGeo, bobberMat, ringGeo, ringMats, fishBody, fishTail, fishMat };
  }, []);

  useEffect(
    () => () => {
      for (const value of Object.values(res)) {
        if (Array.isArray(value)) value.forEach((m) => m.dispose());
        else if (value instanceof THREE.BufferGeometry || value instanceof THREE.Material) value.dispose();
      }
    },
    [res]
  );

  const signTexture = useMemo(() => (typeof document === "undefined" ? null : drawSign(t("sign"))), [t]);
  const signMaterials = useMemo(() => {
    if (!signTexture) return [res.signWood];
    const face = new THREE.MeshStandardMaterial({ map: signTexture, roughness: 0.9 });
    // Box faces: +x, -x, +y, -y, +z (front, toward the beach), -z.
    return [res.signWood, res.signWood, res.signWood, res.signWood, face, res.signWood];
  }, [signTexture, res]);
  useEffect(
    () => () => {
      signTexture?.dispose();
      signMaterials[4]?.dispose();
    },
    [signTexture, signMaterials]
  );

  // Layout: snap the sign onto the beach, fill the pier instances, read the ocean height (before first paint).
  useLayoutEffect(() => {
    waterRef.current = resolveWaterLevel(scene);
    const ray = new THREE.Raycaster(new THREE.Vector3(FISHING_SIGN_POS.x, FISHING_SIGN_POS.y + 3, FISHING_SIGN_POS.z), new THREE.Vector3(0, -1, 0), 0, 6);
    const terrain = scene.getObjectByName("Object_232");
    const hit = terrain ? ray.intersectObject(terrain, true)[0] : undefined;
    const groundY = hit ? hit.point.y : FISHING_SIGN_POS.y;
    const mesh = pierRef.current;
    if (mesh) {
      const boxes = pierBoxes(groundY);
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion().setFromAxisAngle(UP, PIER_YAW);
      const c = new THREE.Color();
      boxes.forEach((box, i) => {
        mesh.setMatrixAt(i, m.compose(box.pos, q, box.size));
        mesh.setColorAt(i, c.set(box.color));
      });
      mesh.count = boxes.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.computeBoundingBox();
    }
    signRef.current?.position.set(FISHING_SIGN_POS.x, groundY + SIGN_HEIGHT, FISHING_SIGN_POS.z);
  }, [scene]);

  const canStart = !activeSection && introPhase === "idle" && phase === "off";
  const onSignClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!canStart) return;
    if (!exploreMode) enterExplore();
    startFishing();
  };
  const setCursor = (e: ThreeEvent<PointerEvent>, on: boolean) => {
    const el = e.nativeEvent.target;
    if (el instanceof HTMLElement) el.style.cursor = on && canStart ? "pointer" : "";
  };

  // Rod: from the cat's front paws up and out over the water.
  const rodBase = useMemo(
    () => FISHING_SEAT.clone().addScaledVector(FISHING_FORWARD, 0.13).addScaledVector(FISHING_LATERAL, -0.06).add(new THREE.Vector3(0, 0.12, 0)),
    []
  );
  const rodDir = useMemo(() => FISHING_FORWARD.clone().multiplyScalar(0.8).add(new THREE.Vector3(0, 0.6, 0)).normalize(), []);
  const rodLength = 0.55;
  const rodQuat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(UP, rodDir), [rodDir]);
  const bucketPos = useMemo(() => FISHING_SEAT.clone().addScaledVector(FISHING_LATERAL, 0.25).add(new THREE.Vector3(0, 0.05, 0)), []);


  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const gear = gearRef.current;
    const bobber = bobberRef.current;
    const fish = fishRef.current;
    const rings = ringsRef.current;
    if (!gear || !bobber || !fish || !rings) return;
    const a = anim.current;
    const state = getFishingState();
    const now = performance.now();
    if (state.phase !== "off" && state.phase !== "walking") tickFishing(now, rawDelta * 1000);
    const current = getFishingState().phase;
    const water = waterRef.current;

    const spawnRing = (at: THREE.Vector3) => {
      const ring = rings.children[a.ringNext] as THREE.Mesh | undefined;
      if (!ring) return;
      ring.position.set(at.x, water + 0.004, at.z);
      a.ringAge[a.ringNext] = 0;
      a.ringNext = (a.ringNext + 1) % RING_POOL;
    };

    if (current !== a.phase) {
      const prev = a.phase;
      a.phase = current;
      a.t = 0;
      tmp.cast.copy(FISHING_SEAT).addScaledVector(FISHING_FORWARD, FISHING_CAST_DISTANCE);
      tmp.cast.y = water;
      if (current === "bite") {
        spawnRing(tmp.cast);
        playSplash(0.35);
      } else if (current === "reeling") {
        spawnRing(tmp.cast);
        playSplash(0.75);
      } else if (current === "missed" && prev === "bite") {
        spawnRing(tmp.cast);
        playSplash(0.3);
      }
    }
    a.t += delta;

    // Rings (pooled): expand and fade.
    rings.children.forEach((child, i) => {
      const ring = child as THREE.Mesh;
      a.ringAge[i] += delta;
      const u = a.ringAge[i] / RING_SECONDS;
      ring.visible = u < 1;
      if (u < 1) {
        ring.scale.setScalar(1 + u * (reducedMotion ? 1.2 : 3));
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - u);
      }
    });

    gear.visible = current !== "off" && current !== "walking";
    if (!gear.visible) {
      fish.visible = false;
      return;
    }

    tmp.tip.copy(rodBase).addScaledVector(rodDir, rodLength);
    const time = now / 1000;
    let bob = 0;
    fish.visible = false;
    if (current === "casting") {
      const dur = reducedMotion ? 0.05 : CAST_SECONDS;
      const u = Math.min(1, a.t / dur);
      bobber.position.lerpVectors(tmp.tip, tmp.cast, u);
      bobber.position.y = THREE.MathUtils.lerp(tmp.tip.y, water, u) + Math.sin(u * Math.PI) * 0.35;
      if (u >= 1) {
        bobber.position.copy(tmp.cast);
        spawnRing(tmp.cast);
        playSplash(0.2);
        fishingCastDone(now);
      }
    } else if (current === "waiting" || current === "missed") {
      bob = Math.sin(time * 2.4) * (reducedMotion ? 0.002 : 0.006);
      bobber.position.set(tmp.cast.x, water + 0.008 + bob, tmp.cast.z);
      if (current === "missed" && !reducedMotion && a.t < ESCAPE_SECONDS) {
        // The fish jumps away from the bobber and is gone.
        const u = a.t / ESCAPE_SECONDS;
        tmp.escape.copy(tmp.cast).addScaledVector(FISHING_FORWARD, 0.15 + u * 0.4);
        fish.visible = true;
        fish.position.set(tmp.escape.x, water - 0.03 + Math.sin(u * Math.PI) * 0.16, tmp.escape.z);
        fish.rotation.set(-Math.cos(u * Math.PI) * 0.9, FISHING_HEADING, 0);
      }
    } else if (current === "bite") {
      const jitter = reducedMotion ? 0 : Math.sin(time * 34) * 0.005;
      bobber.position.set(tmp.cast.x, water - 0.022 + jitter, tmp.cast.z);
    } else if (current === "reeling") {
      const dur = reducedMotion ? 0.3 : REEL_SECONDS;
      const u = Math.min(1, a.t / dur);
      // Fish flips in an arc from the bobber into the bucket.
      tmp.p.lerpVectors(tmp.cast, bucketPos, u);
      tmp.p.y = THREE.MathUtils.lerp(water, bucketPos.y + 0.04, u) + (reducedMotion ? 0 : Math.sin(u * Math.PI) * 0.7);
      fish.visible = true;
      fish.position.copy(tmp.p);
      fish.rotation.set(reducedMotion ? 0 : u * Math.PI * 2, FISHING_HEADING + Math.PI, 0);
      bobber.position.lerpVectors(tmp.cast, tmp.tip, Math.min(1, u * 1.4));
      bobber.position.y -= 0.12 * Math.min(1, u * 1.4);
      if (u >= 1) {
        playSplash(0.12);
        fishingReelDone();
      }
    } else {
      // caught: bobber hangs under the tip, fish rests in the bucket for a moment.
      bobber.position.copy(tmp.tip).add(new THREE.Vector3(0, -0.12, 0));
      if (a.t < 1.2) {
        fish.visible = true;
        fish.position.copy(bucketPos).add(new THREE.Vector3(0, 0.05, 0));
        fish.rotation.set(-1.2, FISHING_HEADING, 0);
      }
    }
    const attr = res.lineGeo.getAttribute("position") as THREE.BufferAttribute;
    attr.setXYZ(0, tmp.tip.x, tmp.tip.y, tmp.tip.z);
    attr.setXYZ(1, bobber.position.x, bobber.position.y + 0.02, bobber.position.z);
    attr.needsUpdate = true;
  });

  useEffect(() => {
    res.fishMat.color.copy(lastGolden ? GOLD_COLOR : FISH_COLOR);
    res.fishMat.emissive.copy(lastGolden ? GOLD_EMISSIVE : NO_EMISSIVE);
  }, [lastGolden, res]);

  return (
    <group name="fishing-spot">
      <instancedMesh
        ref={pierRef}
        name={PIER_MESH_NAME}
        args={[res.unitBox, res.wood, PIER_PLANKS + 8]}
      />
      <mesh
        ref={signRef}
        name="fishing-sign"
        geometry={res.unitBox}
        material={signMaterials}
        scale={[0.34, 0.17, 0.025]}
        rotation={[0, PIER_YAW + Math.PI + 0.35, 0]}
        position={[FISHING_SIGN_POS.x, FISHING_SIGN_POS.y + SIGN_HEIGHT, FISHING_SIGN_POS.z]}
        onClick={onSignClick}
        onPointerOver={(e) => setCursor(e, true)}
        onPointerOut={(e) => setCursor(e, false)}
      />
      <mesh geometry={res.bucketGeo} material={res.bucketMat} position={bucketPos} />
      <group ref={gearRef} name="fishing-gear" visible={seated}>
        <mesh geometry={res.rodGeo} material={res.rodMat} position={rodBase} quaternion={rodQuat} scale={[1, rodLength, 1]} />
        <primitive object={res.line} />
        <mesh ref={bobberRef} geometry={res.bobberGeo} material={res.bobberMat} />
      </group>
      <group ref={fishRef} visible={false}>
        <mesh geometry={res.fishBody} material={res.fishMat} />
        <mesh geometry={res.fishTail} material={res.fishMat} />
      </group>
      <group ref={ringsRef}>
        {res.ringMats.map((mat, i) => (
          <mesh key={i} geometry={res.ringGeo} material={mat} visible={false} />
        ))}
      </group>
    </group>
  );
}
