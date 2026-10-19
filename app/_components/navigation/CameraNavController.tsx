"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";

import type { NavId } from "./portfolioNavData";
import type { OrbitControlsInstance } from "../scene/FantasyIslandFitted";
import { usePortfolioNav } from "./PortfolioNavContext";
import { birdFollowRuntime } from "./birdFollowRuntime";
import { exploreRuntime, resetExploreCamera } from "./exploreRuntime";

const EXPLORE_FOCUS_HEIGHT = 0.32;
const EXPLORE_CAMERA_MARGIN = 0.25;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function CameraNavController({
  controlsRef,
  enabled,
}: {
  controlsRef: RefObject<OrbitControlsInstance | null>;
  enabled: boolean;
}) {
  const { camera } = useThree();
  const { pendingNav, clearPendingNav, setActiveSection, activeSection, experienceCatPose, exploreMode } =
    usePortfolioNav();

  const anim = useRef<{
    fromP: THREE.Vector3;
    toP: THREE.Vector3;
    fromT: THREE.Vector3;
    toT: THREE.Vector3;
    t: number;
    mode: "section" | "menu";
    sectionId?: NavId;
    /** Camera restore after leaving explore mode. */
    restore?: boolean;
    arc?: boolean;
  } | null>(null);
  const exploreWasOnRef = useRef(false);
  const pendingNavRef = useRef(pendingNav);
  const exploreToolsRef = useRef({
    ray: new THREE.Raycaster(),
    focus: new THREE.Vector3(),
    dir: new THREE.Vector3(),
    desired: new THREE.Vector3(),
    allowedDist: 4.2,
    pitch: 0.38,
    smoothPitch: 0.38,
    frame: 0,
  });

  useEffect(() => {
    pendingNavRef.current = pendingNav;
  }, [pendingNav]);

  // Explore mode: remember the camera on enter, glide back to it on exit (unless another nav takes over).
  useEffect(() => {
    const ctrl = controlsRef.current;
    if (exploreMode && !exploreWasOnRef.current) {
      exploreWasOnRef.current = true;
      resetExploreCamera();
      exploreRuntime.saved = ctrl
        ? { position: camera.position.clone(), target: ctrl.target.clone() }
        : null;
      anim.current = null;
      exploreToolsRef.current.allowedDist = exploreRuntime.camDist;
      exploreToolsRef.current.pitch = exploreRuntime.camPitch;
      exploreToolsRef.current.smoothPitch = exploreRuntime.camPitch;
      return;
    }
    if (!exploreMode && exploreWasOnRef.current) {
      exploreWasOnRef.current = false;
      const saved = exploreRuntime.saved;
      exploreRuntime.saved = null;
      if (!ctrl) return;
      if (pendingNavRef.current || !saved) {
        ctrl.enabled = true;
        return;
      }
      ctrl.enabled = false;
      anim.current = {
        fromP: camera.position.clone(),
        toP: saved.position,
        fromT: ctrl.target.clone(),
        toT: saved.target,
        t: 0,
        mode: "menu",
        restore: true,
      };
    }
  }, [exploreMode, camera, controlsRef]);

  useEffect(() => {
    if (!enabled || !pendingNav) return;
    const ctrl = controlsRef.current;
    if (!ctrl) return;

    ctrl.enabled = false;
    anim.current = {
      fromP: camera.position.clone(),
      toP: pendingNav.cameraPos.clone(),
      fromT: ctrl.target.clone(),
      toT: pendingNav.target.clone(),
      t: 0,
      mode: pendingNav.mode,
      sectionId: pendingNav.sectionId,
      arc: pendingNav.arc,
    };
  }, [enabled, pendingNav, camera, controlsRef]);

  useFrame((_, dt) => {
    if (!enabled) return;
    const ctrl = controlsRef.current;
    if (exploreMode && ctrl) {
      // Damped third-person follow; yaw/pitch/zoom come from drag/wheel input in explore mode.
      if (!exploreRuntime.catReady) return;
      const tools = exploreToolsRef.current;
      const cat = exploreRuntime.catPos;
      if (!exploreRuntime.camInitialised) {
        exploreRuntime.camYaw = Math.atan2(camera.position.x - cat.x, camera.position.z - cat.z);
        exploreRuntime.camInitialised = true;
      }
      if (exploreRuntime.followHeading && !exploreRuntime.dragging) {
        const behind = exploreRuntime.catHeading + Math.PI;
        const diff = Math.atan2(Math.sin(behind - exploreRuntime.camYaw), Math.cos(behind - exploreRuntime.camYaw));
        exploreRuntime.camYaw += diff * (1 - Math.exp(-0.9 * dt));
      }
      const yaw = exploreRuntime.camYaw;
      const focus = tools.focus.set(cat.x, cat.y + EXPLORE_FOCUS_HEIGHT, cat.z);
      // When terrain hides the cat, first look from higher up, then pull the camera closer (checked every few frames).
      tools.frame += 1;
      if (tools.frame % 3 === 0) {
        const basePitch = exploreRuntime.camPitch;
        let chosenPitch = basePitch;
        let allowed = exploreRuntime.camDist;
        if (exploreRuntime.groundMeshes.length > 0) {
          let bestDist = -1;
          for (const pitchTry of [basePitch, basePitch + 0.3, basePitch + 0.6]) {
            const p = Math.min(pitchTry, 1.3);
            tools.dir.set(Math.sin(yaw) * Math.cos(p), Math.sin(p), Math.cos(yaw) * Math.cos(p));
            tools.ray.set(focus, tools.dir);
            tools.ray.far = exploreRuntime.camDist;
            const hit = tools.ray.intersectObjects(exploreRuntime.groundMeshes, false)[0];
            const free = hit ? Math.max(0.8, hit.distance - EXPLORE_CAMERA_MARGIN) : exploreRuntime.camDist;
            if (free > bestDist + 0.05) {
              bestDist = free;
              chosenPitch = p;
            }
            if (!hit) break;
          }
          allowed = bestDist;
        }
        tools.allowedDist = allowed;
        tools.pitch = chosenPitch;
      }
      tools.smoothPitch += (tools.pitch - tools.smoothPitch) * (1 - Math.exp(-3 * dt));
      const pitch = tools.smoothPitch;
      const dir = tools.dir.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      const desired = tools.desired.copy(focus).addScaledVector(dir, tools.allowedDist);
      camera.position.lerp(desired, 1 - Math.exp(-4.5 * dt));
      ctrl.target.lerp(focus, 1 - Math.exp(-7 * dt));
      ctrl.enabled = false;
      // lookAt instead of ctrl.update(): update() would clamp to minDistance and push the camera into terrain.
      camera.lookAt(ctrl.target);
      return;
    }
    if (birdFollowRuntime.active && ctrl) {
      // Closing a project: keep the camera in place and track the bird while it takes off.
      if (anim.current) anim.current = null;
      ctrl.target.lerp(birdFollowRuntime.position, 1 - Math.exp(-3 * dt));
      ctrl.enabled = false;
      camera.lookAt(ctrl.target);
      return;
    }
    if (activeSection === "credits" && experienceCatPose && ctrl) {
      if (anim.current?.restore) anim.current = null;
      const [cx, cy, cz] = experienceCatPose.position;
      const radial = new THREE.Vector3(cx, 0, cz);
      if (radial.lengthSq() < 0.0001) radial.set(1, 0, 0);
      radial.normalize();
      // Keep camera outside island and look inward to cat.
      const desiredCam = new THREE.Vector3(cx, cy + 3.6, cz).add(radial.multiplyScalar(10.5));
      const catFocus = new THREE.Vector3(cx, cy + 0.55, cz);
      const viewDir = catFocus.clone().sub(desiredCam).normalize();
      const cameraRight = new THREE.Vector3().crossVectors(viewDir, new THREE.Vector3(0, 1, 0));
      if (cameraRight.lengthSq() < 0.0001) cameraRight.set(1, 0, 0);
      cameraRight.normalize();
      const desiredTarget = catFocus.add(cameraRight.multiplyScalar(3.2));
      const followK = 1 - Math.exp(-5.5 * dt);
      camera.position.lerp(desiredCam, followK);
      ctrl.target.lerp(desiredTarget, followK);
      ctrl.enabled = false;
      ctrl.update();
      return;
    }

    const a = anim.current;
    if (!a || !ctrl) return;

    a.t += dt * 0.72;
    const u = Math.min(1, a.t);
    const k = easeInOutCubic(u);

    if (a.arc) {
      // Interpolate angle / radius / height around the island centre so the camera never cuts through it.
      const fromAngle = Math.atan2(a.fromP.z, a.fromP.x);
      const toAngle = Math.atan2(a.toP.z, a.toP.x);
      const dAngle = Math.atan2(Math.sin(toAngle - fromAngle), Math.cos(toAngle - fromAngle));
      const angle = fromAngle + dAngle * k;
      const radius = THREE.MathUtils.lerp(Math.hypot(a.fromP.x, a.fromP.z), Math.hypot(a.toP.x, a.toP.z), k);
      const lift = Math.sin(Math.PI * k) * 2;
      camera.position.set(
        Math.cos(angle) * radius,
        THREE.MathUtils.lerp(a.fromP.y, a.toP.y, k) + lift,
        Math.sin(angle) * radius
      );
    } else {
      camera.position.lerpVectors(a.fromP, a.toP, k);
    }
    ctrl.target.lerpVectors(a.fromT, a.toT, k);
    ctrl.update();

    if (u >= 1) {
      const mode = a.mode;
      const sectionId = a.sectionId;
      anim.current = null;
      ctrl.enabled = true;
      ctrl.minPolarAngle = 0.12;
      ctrl.maxPolarAngle = Math.PI - 0.12;
      ctrl.maxDistance = 40;
      ctrl.update();
      if (mode === "section" && sectionId) {
        setActiveSection(sectionId);
      }
      clearPendingNav();
    }
  });

  return null;
}
