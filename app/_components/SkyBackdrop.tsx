"use client";

import React, { useMemo } from "react";
import { Sky, Environment } from "@react-three/drei";
import * as THREE from "three";

export function SkyBackdrop() {
    const sunPosition = useMemo(
        () => new THREE.Vector3(-0.55, 0.12, -0.82).normalize(),
        []
    );

    return (
        <>
            <Sky
                distance={450000}
                sunPosition={sunPosition}
                mieCoefficient={0.005}
                mieDirectionalG={0.8}
                rayleigh={2}
                turbidity={10}
            />
            <Environment preset="sunset" background={false} environmentIntensity={0.45} />
        </>
    );
}
