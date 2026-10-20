"use client";

/**
 * کنترل دوربین — چرخش/زوم دستی با ماوس و لمس + نماهای از پیش تعریف‌شده
 * (روبه‌رو، پهلو، پشت) با انتقال نرم. با شروع چرخش دستی، حالت روی «آزاد»
 * می‌رود تا کنترل کامل در اختیار کاربر باشد.
 */

import { useEffect, useRef, type ComponentRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useCoach3DStore } from "@/store/coach3d-store";
import { smoothstep } from "@/lib/fitness3d/animation";
import type { CameraView } from "@/lib/fitness3d/types";

type OrbitControlsRef = ComponentRef<typeof OrbitControls>;

const PRESETS: Record<Exclude<CameraView, "free">, [number, number, number]> = {
  front: [0, 1.42, 3.2],
  side: [3.2, 1.42, 0],
  back: [0, 1.42, -3.2],
};

const TRANSITION_SECONDS = 0.8;

interface Transition {
  t: number;
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
}

export function CameraRig() {
  const view = useCoach3DStore((s) => s.view);
  const scene = useCoach3DStore((s) => s.scene);
  const setView = useCoach3DStore((s) => s.setView);
  const controlsRef = useRef<OrbitControlsRef | null>(null);
  const camera = useThree((s) => s.camera);
  const transition = useRef<Transition | null>(null);

  const targetY = scene.def.cameraTargetY ?? 0.95;

  /* شروع انتقال نرم با تغییر نما یا ارتفاع هدف حرکت */
  useEffect(() => {
    if (view === "free") return;
    const preset = PRESETS[view];
    const controls = controlsRef.current;
    transition.current = {
      t: 0,
      fromPos: camera.position.clone(),
      toPos: new THREE.Vector3(...preset),
      fromTarget: controls ? controls.target.clone() : new THREE.Vector3(0, 0.95, 0),
      toTarget: new THREE.Vector3(0, targetY, 0),
    };
    if (controls) controls.enabled = false;
  }, [view, targetY, camera]);

  useFrame((_, delta) => {
    const tr = transition.current;
    if (!tr) return;
    tr.t = Math.min(1, tr.t + delta / TRANSITION_SECONDS);
    const s = smoothstep(tr.t);
    camera.position.lerpVectors(tr.fromPos, tr.toPos, s);
    const controls = controlsRef.current;
    if (controls) {
      controls.target.lerpVectors(tr.fromTarget, tr.toTarget, s);
      controls.update();
    }
    if (tr.t >= 1) {
      transition.current = null;
      if (controls) controls.enabled = true;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      target={[0, 0.95, 0]}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.85}
      zoomSpeed={0.8}
      minDistance={1.3}
      maxDistance={5.5}
      minPolarAngle={0.15}
      maxPolarAngle={Math.PI * 0.58}
      onStart={() => {
        transition.current = null;
        const controls = controlsRef.current;
        if (controls) controls.enabled = true;
        setView("free");
      }}
    />
  );
}
