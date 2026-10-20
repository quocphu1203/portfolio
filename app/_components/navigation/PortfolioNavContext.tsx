"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { computeSkillsFraming } from "./skillsFraming";

import { getCameraPresets, type NavId } from "./portfolioNavData";

const NO_CAT_MILESTONE = { at: -1, heading: null };

export type NavTransition = {
  mode: "section" | "menu";
  sectionId?: NavId;
  cameraPos: THREE.Vector3;
  target: THREE.Vector3;
  /** Fly around the island (cylindrical path) instead of a straight line that could cut through terrain. */
  arc?: boolean;
};

type PortfolioNavContextValue = {
  orbitTargetY: number;
  setOrbitTargetY: (y: number) => void;
  signpostTransform: { position: [number, number, number]; rotationY: number } | null;
  setSignpostTransform: (t: { position: [number, number, number]; rotationY: number } | null) => void;
  pendingNav: NavTransition | null;
  requestNav: (id: NavId) => void;
  clearPendingNav: () => void;
  activeSection: NavId | null;
  setActiveSection: (id: NavId | null) => void;
  flyToMenu: () => void;
  flyToDefault: () => void;
  boatPose: { position: [number, number, number]; heading: number } | null;
  setBoatPose: (pose: { position: [number, number, number]; heading: number } | null) => void;
  boatPaused: boolean;
  boatThoughtVisible: boolean;
  projectBirdsVisible: boolean;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  focusProjectBird: (id: string, position: [number, number, number], options?: { perch?: boolean }) => void;
  experienceJourneyKey: number;
  experienceUnlockedCount: number;
  setExperienceUnlockedCount: (count: number) => void;
  experienceCatPose: { position: [number, number, number]; heading: number } | null;
  setExperienceCatPose: (pose: { position: [number, number, number]; heading: number } | null) => void;
  /** Experience dialog asks the cat to run to a milestone (seq makes repeated clicks distinct). */
  experienceMilestoneRequest: { index: number; seq: number } | null;
  requestExperienceMilestone: (index: number) => void;
  /** Where the Experience cat is: milestone index it stands at (-1 none) and the one it runs to (null idle). */
  experienceCatMilestone: { at: number; heading: number | null };
  setExperienceCatMilestone: (state: { at: number; heading: number | null }) => void;
  /**
   * Closing a project: "takingOff" (bird takes off, camera follows it) -> "returning" (camera flies back to the
   * island overview) -> "idle". Re-selecting a bird at any point cancels it.
   */
  projectExit: "idle" | "takingOff" | "returning";
  closeProject: () => void;
  returnToOverview: () => void;
  /** Free-roam mode: the player drives the cat (off by default). */
  exploreMode: boolean;
  enterExplore: () => void;
  exitExplore: () => void;
  /**
   * Intro (About): "approach" while the cat runs into view and sits (camera frames it), then "open" with the
   * dialog shown. Every way of opening About goes through it; in explore mode the cat sits + wags where it is.
   */
  introPhase: "idle" | "approach" | "open";
  /** Camera framing for the intro cat (called by the cat once it picked its spot). */
  introFrame: (cameraPos: THREE.Vector3, target: THREE.Vector3) => void;
  /** The cat has arrived and sat down (or timed out): open the About dialog. */
  introReady: () => void;
  /** Skill picked in the Skills dialog: birds whose projects use it fly over to the boat. */
  highlightedSkill: string | null;
  setHighlightedSkill: (id: string | null) => void;
  /** Open a project from the Skills dialog: go to the projects view, then the flock selects that bird. */
  openProjectFromSkill: (projectId: string) => void;
  projectFocusRequest: string | null;
  clearProjectFocusRequest: () => void;
};

const PortfolioNavContext = createContext<PortfolioNavContextValue | null>(null);

export function PortfolioNavProvider({ children }: { children: React.ReactNode }) {
  const [orbitTargetY, setOrbitTargetY] = useState(12);
  const [signpostTransform, setSignpostTransform] = useState<{
    position: [number, number, number];
    rotationY: number;
  } | null>(null);
  const [pendingNav, setPendingNav] = useState<NavTransition | null>(null);
  const [activeSection, setActiveSection] = useState<NavId | null>(null);
  const [boatPose, setBoatPose] = useState<{
    position: [number, number, number];
    heading: number;
  } | null>(null);
  const [boatPaused, setBoatPaused] = useState(false);
  const [boatThoughtVisible, setBoatThoughtVisible] = useState(false);
  const [projectBirdsVisible, setProjectBirdsVisible] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [experienceJourneyKey, setExperienceJourneyKey] = useState(0);
  const [experienceUnlockedCount, setExperienceUnlockedCount] = useState(0);
  const [experienceCatPose, setExperienceCatPose] = useState<{
    position: [number, number, number];
    heading: number;
  } | null>(null);
  const [experienceMilestoneRequest, setExperienceMilestoneRequest] = useState<{ index: number; seq: number } | null>(
    null
  );
  const [experienceCatMilestone, setExperienceCatMilestone] = useState<{ at: number; heading: number | null }>(
    NO_CAT_MILESTONE
  );
  const requestExperienceMilestone = useCallback((index: number) => {
    setExperienceMilestoneRequest((prev) => ({ index, seq: (prev?.seq ?? 0) + 1 }));
  }, []);
  const [exploreMode, setExploreMode] = useState(false);
  const [projectExit, setProjectExit] = useState<"idle" | "takingOff" | "returning">("idle");
  const [introPhase, setIntroPhase] = useState<"idle" | "approach" | "open">("idle");
  const [highlightedSkill, setHighlightedSkill] = useState<string | null>(null);
  const [projectFocusRequest, setProjectFocusRequest] = useState<string | null>(null);
  const seagullAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio("/seagull.mp3");
    audio.preload = "auto";
    audio.volume = 0.45;
    seagullAudioRef.current = audio;
    return () => {
      audio.pause();
      audio.currentTime = 0;
      seagullAudioRef.current = null;
    };
  }, []);

  const requestNav = useCallback(
    (id: NavId) => {
      setHighlightedSkill(null);
      if (id === "about" && exploreMode) {
        // The player is driving the cat: keep explore mode; the cat stops, sits and wags, then the dialog opens.
        setIntroPhase("approach");
        setActiveSection(null);
        return;
      }
      setExploreMode(false);
      setProjectExit("idle");
      // Always the cat sequence (also when coming from the experience journey: the cat leaves the trail).
      setIntroPhase(id === "about" ? "approach" : "idle");
      if (id === "about") {
        setPendingNav(null);
        setActiveSection(null);
        setBoatPaused(false);
        setBoatThoughtVisible(false);
        setProjectBirdsVisible(false);
        setSelectedProjectId(null);
        return;
      }

      if (id === "projects") {
        setPendingNav(null);
        setActiveSection(id);
        setBoatPaused(false);
        setBoatThoughtVisible(false);
        setProjectBirdsVisible(true);
        setSelectedProjectId(null);
        const audio = seagullAudioRef.current;
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
          void audio.play().catch(() => {
            // Ignore blocked play promise on strict autoplay policies.
          });
        }
        return;
      }

      if (id === "articles" && boatPose) {
        // Boat + open crates centred in the screen area the skills panel leaves free.
        const { cameraPos: camPos, target } = computeSkillsFraming(boatPose.position);
        setPendingNav({
          mode: "section",
          sectionId: id,
          cameraPos: camPos,
          target,
        });
        setActiveSection(null);
        setBoatPaused(true);
        setBoatThoughtVisible(true);
        setProjectBirdsVisible(false);
        setSelectedProjectId(null);
        return;
      }
      if (id === "credits") {
        setExperienceJourneyKey((v) => v + 1);
        setExperienceUnlockedCount(0);
        setExperienceCatPose(null);
        setExperienceMilestoneRequest(null);
        setExperienceCatMilestone(NO_CAT_MILESTONE);
        setPendingNav(null);
        setActiveSection(id);
        setBoatPaused(false);
        setBoatThoughtVisible(false);
        setProjectBirdsVisible(false);
        setSelectedProjectId(null);
        return;
      }

      const p = getCameraPresets(orbitTargetY)[id];
      setPendingNav({
        mode: "section",
        sectionId: id,
        cameraPos: new THREE.Vector3(...p.position),
        target: new THREE.Vector3(...p.target),
      });
      setActiveSection(null);
      setBoatPaused(false);
      setBoatThoughtVisible(false);
      setProjectBirdsVisible(false);
      setSelectedProjectId(null);
    },
    [boatPose, orbitTargetY, exploreMode]
  );

  const flyToMenu = useCallback(() => {
    setExploreMode(false);
    setProjectExit("idle");
    setIntroPhase("idle");
    setHighlightedSkill(null);
    const p = getCameraPresets(orbitTargetY).menu;
    setPendingNav({
      mode: "menu",
      cameraPos: new THREE.Vector3(...p.position),
      target: new THREE.Vector3(...p.target),
    });
    setActiveSection(null);
    setBoatPaused(false);
    setBoatThoughtVisible(false);
    setProjectBirdsVisible(false);
    setSelectedProjectId(null);
    setExperienceUnlockedCount(0);
    setExperienceCatPose(null);
    setExperienceMilestoneRequest(null);
    setExperienceCatMilestone(NO_CAT_MILESTONE);
  }, [orbitTargetY]);

  const flyToDefault = useCallback(() => {
    setExploreMode(false);
    setProjectExit("idle");
    setIntroPhase("idle");
    setHighlightedSkill(null);
    const p = getCameraPresets(orbitTargetY).default;
    setPendingNav({
      mode: "menu",
      cameraPos: new THREE.Vector3(...p.position),
      target: new THREE.Vector3(...p.target),
    });
    setActiveSection(null);
    setBoatPaused(false);
    setBoatThoughtVisible(false);
    setProjectBirdsVisible(false);
    setSelectedProjectId(null);
    setExperienceUnlockedCount(0);
    setExperienceCatPose(null);
    setExperienceMilestoneRequest(null);
    setExperienceCatMilestone(NO_CAT_MILESTONE);
  }, [orbitTargetY]);

  const clearPendingNav = useCallback(() => {
    setPendingNav(null);
    setProjectExit((current) => (current === "returning" ? "idle" : current));
  }, []);

  const closeProject = useCallback(() => {
    setSelectedProjectId(null);
    setProjectExit("takingOff");
  }, []);

  // Called by the flock once the bird has taken off: fly back to the overview, staying in the projects section.
  const returnToOverview = useCallback(() => {
    const p = getCameraPresets(orbitTargetY).default;
    setProjectExit("returning");
    setPendingNav({
      mode: "section",
      sectionId: "projects",
      cameraPos: new THREE.Vector3(...p.position),
      target: new THREE.Vector3(...p.target),
      arc: true,
    });
  }, [orbitTargetY]);

  const enterExplore = useCallback(() => {
    setIntroPhase("idle");
    setHighlightedSkill(null);
    setPendingNav(null);
    setActiveSection(null);
    setBoatPaused(false);
    setBoatThoughtVisible(false);
    setProjectBirdsVisible(false);
    setSelectedProjectId(null);
    setExperienceCatPose(null);
    setExploreMode(true);
  }, []);

  const exitExplore = useCallback(() => {
    setExploreMode(false);
    setActiveSection(null);
    setIntroPhase("idle");
  }, []);

  // Closing the About dialog without a camera move (explore mode) also ends the intro.
  const setActiveSectionAndIntro = useCallback((id: NavId | null) => {
    setActiveSection(id);
    if (id !== "about") setIntroPhase((phase) => (phase === "open" ? "idle" : phase));
  }, []);

  const openProjectFromSkill = useCallback(
    (projectId: string) => {
      requestNav("projects");
      setProjectFocusRequest(projectId);
    },
    [requestNav]
  );

  const clearProjectFocusRequest = useCallback(() => setProjectFocusRequest(null), []);

  const introFrame = useCallback((cameraPos: THREE.Vector3, target: THREE.Vector3) => {
    setPendingNav({ mode: "menu", cameraPos: cameraPos.clone(), target: target.clone() });
  }, []);

  const introPhaseRef = useRef(introPhase);
  useEffect(() => {
    introPhaseRef.current = introPhase;
  }, [introPhase]);

  const introReady = useCallback(() => {
    if (introPhaseRef.current !== "approach") return;
    introPhaseRef.current = "open";
    setIntroPhase("open");
    setActiveSection("about");
  }, []);

  const focusProjectBird = useCallback((id: string, position: [number, number, number], options?: { perch?: boolean }) => {
    const perch = options?.perch ?? false;
    const [bx, by, bz] = position;
    const outward = new THREE.Vector2(bx, bz);
    if (outward.lengthSq() < 0.0001) outward.set(1, 0);
    outward.normalize();
    const tangent = new THREE.Vector2(outward.y, -outward.x);

    const camPos = new THREE.Vector3(
      bx + outward.x * 9.5 + tangent.x * 2.8,
      by + 2.6,
      bz + outward.y * 9.5 + tangent.y * 2.8
    );
    const birdPos = new THREE.Vector3(bx, by, bz);
    const viewDir = birdPos.clone().sub(camPos).normalize();
    const cameraRight = new THREE.Vector3().crossVectors(viewDir, new THREE.Vector3(0, 1, 0));
    if (cameraRight.lengthSq() < 0.0001) cameraRight.set(tangent.x, 0, tangent.y);
    cameraRight.normalize();
    // A perched bird sits low on the island: keep it a bit closer to the frame centre (left of the panel).
    const sideOffset = perch ? 2.8 : 3.6;
    const target = new THREE.Vector3(
      bx + cameraRight.x * sideOffset,
      by - (perch ? 0.2 : 0.6),
      bz + cameraRight.z * sideOffset
    );

    setExploreMode(false);
    setProjectExit("idle");
    setIntroPhase("idle");
    setHighlightedSkill(null);
    setSelectedProjectId(id);
    setPendingNav({
      mode: "section",
      sectionId: "projects",
      cameraPos: camPos,
      target,
      arc: perch,
    });
    setActiveSection(null);
    setBoatPaused(false);
    setBoatThoughtVisible(false);
    setProjectBirdsVisible(true);
    const audio = seagullAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      void audio.play().catch(() => {
        // Ignore blocked play promise on strict autoplay policies.
      });
    }
  }, []);

  const value = useMemo(
    () => ({
      orbitTargetY,
      setOrbitTargetY,
      signpostTransform,
      setSignpostTransform,
      pendingNav,
      requestNav,
      clearPendingNav,
      activeSection,
      setActiveSection: setActiveSectionAndIntro,
      flyToMenu,
      flyToDefault,
      boatPose,
      setBoatPose,
      boatPaused,
      boatThoughtVisible,
      projectBirdsVisible,
      selectedProjectId,
      setSelectedProjectId,
      focusProjectBird,
      experienceJourneyKey,
      experienceUnlockedCount,
      setExperienceUnlockedCount,
      experienceCatPose,
      setExperienceCatPose,
      experienceMilestoneRequest,
      requestExperienceMilestone,
      experienceCatMilestone,
      setExperienceCatMilestone,
      exploreMode,
      enterExplore,
      exitExplore,
      projectExit,
      closeProject,
      returnToOverview,
      introPhase,
      introFrame,
      introReady,
      highlightedSkill,
      setHighlightedSkill,
      openProjectFromSkill,
      projectFocusRequest,
      clearProjectFocusRequest,
    }),
    [
      orbitTargetY,
      signpostTransform,
      pendingNav,
      requestNav,
      clearPendingNav,
      activeSection,
      setActiveSectionAndIntro,
      flyToMenu,
      flyToDefault,
      boatPose,
      boatPaused,
      boatThoughtVisible,
      projectBirdsVisible,
      selectedProjectId,
      focusProjectBird,
      experienceJourneyKey,
      experienceUnlockedCount,
      experienceCatPose,
      experienceMilestoneRequest,
      requestExperienceMilestone,
      experienceCatMilestone,
      exploreMode,
      enterExplore,
      exitExplore,
      projectExit,
      closeProject,
      returnToOverview,
      introPhase,
      introFrame,
      introReady,
      highlightedSkill,
      openProjectFromSkill,
      projectFocusRequest,
      clearProjectFocusRequest,
    ]
  );

  return (
    <PortfolioNavContext.Provider value={value}>{children}</PortfolioNavContext.Provider>
  );
}

export function usePortfolioNav() {
  const ctx = useContext(PortfolioNavContext);
  if (!ctx) throw new Error("usePortfolioNav must be used within PortfolioNavProvider");
  return ctx;
}
