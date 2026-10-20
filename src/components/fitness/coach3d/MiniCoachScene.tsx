"use client";

/**
 * صحنه کوچک مربی سه‌بعدی — برای پیش‌نمایش داخل دیالوگ انتخابگر (مرحله ۱۹).
 * همان موتور و همان store؛ فقط بوم فشرده‌تر با DPR پایین‌تر برای موبایل.
 * با unmount دیالوگ، R3F همه منابع WebGL را dispose می‌کند (بدون نشت).
 */

import { useRef } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Grid } from "@react-three/drei";
import { BodyModel, ExerciseAnimator, createRig } from "./BodyModel";
import { CameraRig } from "./CameraRig";
import { StaticSceneProps } from "./StaticSceneProps";
import { useCoach3DStore } from "@/store/coach3d-store";

export function MiniCoachScene() {
  const rig = useRef(createRig());
  const sceneProps = useCoach3DStore((s) => s.scene.sceneProps);

  return (
    <Canvas
      dpr={[1, 1.5]}
      shadows={false}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      camera={{ fov: 42, position: [0, 1.4, 3.4], near: 0.1, far: 40 }}
      onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), 0)}
      style={{ touchAction: "none" }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4.2, 2.6]} intensity={1.5} color="#ffffff" />
      <directionalLight position={[-3.2, 2.6, -2.4]} intensity={0.55} color="#b7f235" />

      <BodyModel rig={rig} />
      <ExerciseAnimator rig={rig} />
      <CameraRig />
      <StaticSceneProps kinds={sceneProps} />

      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.5}
        scale={7}
        blur={2.6}
        far={2.4}
        resolution={256}
        color="#04060a"
      />
      <Grid
        position={[0, 0.002, 0]}
        cellSize={0.4}
        cellThickness={0.6}
        cellColor="#2a3242"
        sectionSize={1.6}
        sectionThickness={1.1}
        sectionColor="#41502c"
        fadeDistance={10}
        fadeStrength={1.4}
        infiniteGrid
      />
    </Canvas>
  );
}
