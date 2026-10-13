"use client";

/**
 * صحنه سه‌بعدی مربی — Canvas، نورپردازی تم تاریک/سبز نئونی، کف شبکه‌ای،
 * سایه تماسی و ذرات محیطی. هیچ asset خارجی بارگذاری نمی‌شود تا پیش‌نمایش
 * بدون دسترسی به اینترنت هم کار کند.
 *
 * کیفیت: روی موبایل DPR سقف ۱٫۵ و روی دسکتاپ ۲ برای تعادل عملکرد و شفافیت.
 * پاک‌سازی منابع WebGL و listenerها هنگام خروج از صفحه به‌صورت خودکار توسط
 * React Three Fiber انجام می‌شود (dispose خودکار هنگام unmount).
 */

import { useRef } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Grid, Sparkles } from "@react-three/drei";
import { BodyModel, ExerciseAnimator, createRig } from "./BodyModel";
import { CameraRig } from "./CameraRig";

export default function CoachScene() {
  const rig = useRef(createRig());
  const dpr: [number, number] =
    typeof window !== "undefined" && window.innerWidth < 768 ? [1, 1.5] : [1, 2];

  return (
    <Canvas
      dpr={dpr}
      shadows={false}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: 40, position: [0, 1.42, 3.2], near: 0.1, far: 40 }}
      onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), 0)}
      style={{ touchAction: "none" }}
    >
      {/* نورپردازی — کلید روشن + ریم سبز نئونی از پشت + فیل خنثی */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4.2, 2.6]} intensity={1.5} color="#ffffff" />
      <directionalLight position={[-3.2, 2.6, -2.4]} intensity={0.55} color="#b7f235" />
      <directionalLight position={[0, 1.8, -4]} intensity={0.5} color="#93a7cc" />

      <BodyModel rig={rig} />
      <ExerciseAnimator rig={rig} />
      <CameraRig />

      {/* سایه تماسی زیر مدل برای اتصال به کف */}
      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.55}
        scale={7}
        blur={2.6}
        far={2.4}
        resolution={512}
        color="#04060a"
      />

      {/* کف شبکه‌ای محو شونده — هماهنگ با تم نئونی */}
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

      {/* ذرات معلق ملایم برای حس محیط تمرین */}
      <Sparkles
        count={50}
        scale={[4.5, 3.2, 4.5]}
        position={[0, 1.6, 0]}
        size={2.2}
        speed={0.3}
        opacity={0.3}
        color="#a3e635"
      />
    </Canvas>
  );
}
