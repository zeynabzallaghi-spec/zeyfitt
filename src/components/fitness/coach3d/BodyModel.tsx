"use client";

/**
 * مدل پروسیجرال بدن انسان — ساخته‌شده از هندسه‌های متناسب با سلسله‌مراتب مفصلی.
 *
 * ساختار اسکلتی:
 *   root (لگن)
 *   ├─ spine (ستون فقرات) ── neck (گردن و سر)
 *   │     ├─ shoulderL/R (بازو) ── elbowL/R (ساعد) ── wristL/R (دست + دمبل)
 *   └─ hipL/R (ران) ── kneeL/R (ساق) ── ankleL/R (پا)
 *
 * همه مش‌های عضلانی فرزندِ گروه مفصل مربوطه هستند تا با حرکت بدن همراه
 * بمانند و هیچ‌گاه شناور یا جدا از بدن دیده نشوند. هایلایت عضلات یک
 * نمایش گرافیکی هدف تمرینی است و شبیه‌سازی علمی فعالیت عضله نیست.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { MuscleGroupId } from "@/lib/fitness3d/types";
import { PELVIS_Y, blendKeyframes, cycleDuration, locateInCycle, startPose } from "@/lib/fitness3d/animation";
import { getExercise } from "@/lib/fitness3d/exercises";
import { coachRuntime } from "@/lib/fitness3d/runtime";
import { useCoach3DStore } from "@/store/coach3d-store";

/* ------------------------------- rig و مفاصل ------------------------------- */

export interface BodyRig {
  /** گروه‌های مفصلی با کلید نام مفصل — فقط از طریق Map تغییر می‌کند */
  joints: Map<string, THREE.Group>;
  /** مش‌های عضلانی — کلید: «شناسه عضله-سمت» */
  muscles: Map<string, THREE.Mesh>;
}

export function createRig(): BodyRig {
  return {
    joints: new Map(),
    muscles: new Map(),
  };
}

const DEG = Math.PI / 180;

/**
 * متریال‌های مشترک صحنه — تک‌نمونه در سطح ماژول (همان الگوی coachRuntime).
 * حفظ شدن در طول نشست یعنی بازدید مجدد از صفحه بدون ساخت مجدد متریال‌ها.
 */
const mats = {
  body: new THREE.MeshStandardMaterial({
    color: "#3b4252",
    roughness: 0.58,
    metalness: 0.12,
  }),
  primary: new THREE.MeshStandardMaterial({
    color: "#a3e635",
    emissive: "#5d8f0a",
    emissiveIntensity: 0.9,
    roughness: 0.34,
    metalness: 0.05,
  }),
  secondary: new THREE.MeshStandardMaterial({
    color: "#4d7c0f",
    emissive: "#365314",
    emissiveIntensity: 0.45,
    roughness: 0.5,
    metalness: 0.05,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  }),
  focused: new THREE.MeshStandardMaterial({
    color: "#22d3ee",
    emissive: "#155e75",
    emissiveIntensity: 0.55,
    roughness: 0.4,
    metalness: 0.05,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  }),
  metal: new THREE.MeshStandardMaterial({
    color: "#8b93a5",
    roughness: 0.35,
    metalness: 0.75,
  }),
  plate: new THREE.MeshStandardMaterial({
    color: "#2b303c",
    roughness: 0.4,
    metalness: 0.6,
  }),
  accent: new THREE.MeshStandardMaterial({
    color: "#a3e635",
    emissive: "#4d7c0f",
    emissiveIntensity: 0.6,
    roughness: 0.4,
  }),
};

/** اعمال وضعیت محاسبه‌شده موتور انیمیشن روی گروه‌های مفصلی مدل */
export function applyPose(rig: BodyRig, pose: FullPoseLike) {
  const root = rig.joints.get("root");
  root?.position.set(0, PELVIS_Y + pose.root.y, pose.root.z);
  root?.rotation.set(pose.root.rx * DEG, 0, 0);

  const set = (name: string, v: [number, number, number]) => {
    rig.joints.get(name)?.rotation.set(v[0] * DEG, v[1] * DEG, v[2] * DEG);
  };
  set("spine", pose.joints.spine);
  set("neck", pose.joints.neck);
  set("shoulderL", pose.joints.shoulderL);
  set("shoulderR", pose.joints.shoulderR);
  set("elbowL", pose.joints.elbowL);
  set("elbowR", pose.joints.elbowR);
  set("wristL", pose.joints.wristL);
  set("wristR", pose.joints.wristR);
  set("hipL", pose.joints.hipL);
  set("hipR", pose.joints.hipR);
  set("kneeL", pose.joints.kneeL);
  set("kneeR", pose.joints.kneeR);
  set("ankleL", pose.joints.ankleL);
  set("ankleR", pose.joints.ankleR);
}

type FullPoseLike = ReturnType<typeof blendKeyframes>;

/* ------------------------------ موتور انیمیشن ------------------------------ */

/**
 * پیش‌بردن زمان چرخه حرکت، محاسبه وضعیت مفاصل و اعمال آن روی مدل.
 * شمارنده تکرار فقط با تکمیل یک چرخه کامل افزایش می‌یابد.
 */
export function ExerciseAnimator({ rig }: { rig: React.RefObject<BodyRig> }) {
  const localTime = useRef(0);
  const localToken = useRef(-1);

  useFrame((_, delta) => {
    const r = rig.current;
    if (!r || !r.joints.get("root")) return;
    const { exerciseId, playing, speed, runtimeToken } = useCoach3DStore.getState();
    const ex = getExercise(exerciseId);

    // همگام‌سازی با تغییر حرکت یا بازنشانی
    if (localToken.current !== runtimeToken) {
      localToken.current = runtimeToken;
      localTime.current = 0;
      coachRuntime.cycleT = 0;
      applyPose(r, startPose(ex.cycle));
      return;
    }

    const total = cycleDuration(ex.cycle);
    if (!playing || total <= 0) return;

    // محدودکردن گام زمانی: توقف طولانی مرورگر (مثل سوئیچ تب) نباید باعث
    // پرش وضعیت مفاصل یا شمارش نادرست تکرار شود
    const step = Math.min(delta, 0.05) * speed;
    localTime.current += step;
    if (localTime.current >= total) {
      localTime.current -= total;
      // هر چرخه کامل = تعداد تکرار تعریف‌شده حرکت (لانج چپ + راست = ۲)
      useCoach3DStore.getState().bumpReps(ex.repsPerCycle ?? 1);
    }

    const loc = locateInCycle(ex.cycle, localTime.current);
    applyPose(r, blendKeyframes(loc.from, loc.to, loc.phaseT));
    coachRuntime.cycleT = loc.cycleT;
    useCoach3DStore.getState().setPhase(loc.fromIndex);
  });

  return null;
}

/* --------------------------------- مدل بدن --------------------------------- */

export function BodyModel({ rig }: { rig: React.RefObject<BodyRig> }) {
  const exerciseId = useCoach3DStore((s) => s.exerciseId);
  const showMuscles = useCoach3DStore((s) => s.showMuscles);
  const focusedMuscle = useCoach3DStore((s) => s.focusedMuscle);

  /* ثبت مش‌های عضلانی و گروه‌های مفصلی در rig — فقط با متدهای Map */
  const regJoint = (key: string) => (g: THREE.Group | null) => {
    if (!rig.current) return;
    if (g) rig.current.joints.set(key, g);
    else rig.current.joints.delete(key);
  };
  const regMuscle = (key: string) => (mesh: THREE.Mesh | null) => {
    if (!rig.current) return;
    if (mesh) rig.current.muscles.set(key, mesh);
    else rig.current.muscles.delete(key);
  };

  /* به‌روزرسانی حالت هایلایت عضلات با تغییر حرکت یا تنظیمات کاربر */
  useEffect(() => {
    const ex = getExercise(exerciseId);
    const primary = new Set(ex.primaryMuscles);
    const secondary = new Set(ex.secondaryMuscles);
    rig.current?.muscles.forEach((mesh) => {
      const group = mesh.userData.muscle as MuscleGroupId;
      if (focusedMuscle && group === focusedMuscle) {
        mesh.visible = true;
        mesh.material = mats.focused;
      } else if (showMuscles && primary.has(group)) {
        mesh.visible = true;
        mesh.material = mats.primary;
      } else if (showMuscles && secondary.has(group)) {
        mesh.visible = true;
        mesh.material = mats.secondary;
      } else {
        mesh.visible = false;
      }
    });
  }, [exerciseId, showMuscles, focusedMuscle, mats, rig]);

  /* نمایش یا مخفی‌کردن دمبل‌ها — واکنشی و بر اساس تجهیزات حرکت */
  const showDumbbells = getExercise(exerciseId).props3d === "dumbbells";

  /* اعمال وضعیت شروع حرکت پس از تغییر (برای همگام‌سازی سریع اولیه) */
  useEffect(() => {
    const ex = getExercise(exerciseId);
    if (rig.current?.joints.get("root")) applyPose(rig.current, startPose(ex.cycle));
  }, [exerciseId, rig]);

  /* نبض ملایم نور عضلات فعال — صحنه را زنده نگه می‌دارد */
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    mats.primary.emissiveIntensity = 0.85 + Math.sin(t * 3.2) * 0.22;
    mats.secondary.emissiveIntensity = 0.4 + Math.sin(t * 3.2) * 0.1;
    mats.focused.emissiveIntensity = 0.5 + Math.sin(t * 2.2) * 0.12;
  });

  const jointSphere = (r: number) => <sphereGeometry args={[r, 20, 14]} />;

  return (
    <group ref={regJoint("root")} position={[0, PELVIS_Y, 0]}>
      {/* ------------------------------- لگن و سرینی ------------------------------ */}
      <RoundedBox args={[0.3, 0.18, 0.2]} radius={0.06} smoothness={4} position={[0, 0.01, 0]} material={mats.body} />
      <mesh ref={regMuscle("glutes-L")} userData={{ muscle: "glutes" }} visible={false} position={[0.082, -0.03, -0.08]} scale={[0.088, 0.085, 0.075]} material={mats.secondary}>
        <sphereGeometry args={[1, 24, 16]} />
      </mesh>
      <mesh ref={regMuscle("glutes-R")} userData={{ muscle: "glutes" }} visible={false} position={[-0.082, -0.03, -0.08]} scale={[0.088, 0.085, 0.075]} material={mats.secondary}>
        <sphereGeometry args={[1, 24, 16]} />
      </mesh>

      {/* ------------------------------ ستون فقرات ------------------------------ */}
      <group ref={regJoint("spine")} position={[0, 0.1, 0]}>
        {/* کمر */}
        <mesh position={[0, 0.02, 0]} material={mats.body}>
          <capsuleGeometry args={[0.125, 0.1, 6, 16]} />
        </mesh>
        {/* تنه */}
        <RoundedBox args={[0.34, 0.42, 0.21]} radius={0.075} smoothness={4} position={[0, 0.28, 0]} material={mats.body} />
        {/* قفسه سینه */}
        <RoundedBox args={[0.36, 0.22, 0.22]} radius={0.07} smoothness={4} position={[0, 0.4, 0]} material={mats.body} />

        {/* عضلات تنه — سینه، شکم، زیربغل، کول */}
        <mesh ref={regMuscle("chest-L")} userData={{ muscle: "chest" }} visible={false} position={[0.078, 0.44, 0.1]} scale={[0.085, 0.06, 0.042]} material={mats.secondary}>
          <sphereGeometry args={[1, 22, 16]} />
        </mesh>
        <mesh ref={regMuscle("chest-R")} userData={{ muscle: "chest" }} visible={false} position={[-0.078, 0.44, 0.1]} scale={[0.085, 0.06, 0.042]} material={mats.secondary}>
          <sphereGeometry args={[1, 22, 16]} />
        </mesh>
        <RoundedBox
          ref={regMuscle("abs-C")}
          userData={{ muscle: "abs" }}
          visible={false}
          args={[0.17, 0.21, 0.055]}
          radius={0.022}
          smoothness={4}
          position={[0, 0.17, 0.1]}
          material={mats.secondary}
        />
        <mesh ref={regMuscle("back-L")} userData={{ muscle: "back" }} visible={false} position={[0.095, 0.32, -0.1]} scale={[0.095, 0.13, 0.045]} material={mats.secondary}>
          <sphereGeometry args={[1, 22, 16]} />
        </mesh>
        <mesh ref={regMuscle("back-R")} userData={{ muscle: "back" }} visible={false} position={[-0.095, 0.32, -0.1]} scale={[0.095, 0.13, 0.045]} material={mats.secondary}>
          <sphereGeometry args={[1, 22, 16]} />
        </mesh>
        <mesh ref={regMuscle("traps-L")} userData={{ muscle: "traps" }} visible={false} position={[0.085, 0.545, -0.005]} scale={[0.08, 0.042, 0.095]} material={mats.secondary}>
          <sphereGeometry args={[1, 20, 14]} />
        </mesh>
        <mesh ref={regMuscle("traps-R")} userData={{ muscle: "traps" }} visible={false} position={[-0.085, 0.545, -0.005]} scale={[0.08, 0.042, 0.095]} material={mats.secondary}>
          <sphereGeometry args={[1, 20, 14]} />
        </mesh>

        {/* ------------------------------ گردن و سر ------------------------------ */}
        <group ref={regJoint("neck")} position={[0, 0.52, 0]}>
          <mesh position={[0, 0.035, 0.005]} material={mats.body}>
            <capsuleGeometry args={[0.048, 0.05, 6, 14]} />
          </mesh>
          <mesh position={[0, 0.14, 0.005]} scale={[0.88, 1.06, 0.98]} material={mats.body}>
            <sphereGeometry args={[0.092, 28, 20]} />
          </mesh>
        </group>

        {/* ------------------------------ بازوی چپ ------------------------------ */}
        <group ref={regJoint("shoulderL")} position={[0.19, 0.44, 0]}>
          <mesh ref={regMuscle("shoulders-L")} userData={{ muscle: "shoulders" }} visible={false} position={[0.004, 0.006, 0]} material={mats.secondary}>
            {jointSphere(0.063)}
          </mesh>
          <mesh position={[0, -0.15, 0]} material={mats.body}>
            <capsuleGeometry args={[0.05, 0.2, 6, 14]} />
          </mesh>
          <mesh ref={regMuscle("biceps-L")} userData={{ muscle: "biceps" }} visible={false} position={[0, -0.145, 0.022]} material={mats.secondary}>
            <capsuleGeometry args={[0.057, 0.11, 6, 14]} />
          </mesh>
          <mesh ref={regMuscle("triceps-L")} userData={{ muscle: "triceps" }} visible={false} position={[0, -0.15, -0.024]} material={mats.secondary}>
            <capsuleGeometry args={[0.057, 0.12, 6, 14]} />
          </mesh>
          <group ref={regJoint("elbowL")} position={[0, -0.3, 0]}>
            <mesh material={mats.body}>{jointSphere(0.048)}</mesh>
            <mesh position={[0, -0.13, 0]} material={mats.body}>
              <capsuleGeometry args={[0.042, 0.18, 6, 14]} />
            </mesh>
            <mesh ref={regMuscle("forearms-L")} userData={{ muscle: "forearms" }} visible={false} position={[0, -0.125, 0.002]} material={mats.secondary}>
              <capsuleGeometry args={[0.049, 0.12, 6, 14]} />
            </mesh>
            <group ref={regJoint("wristL")} position={[0, -0.26, 0]}>
              <mesh position={[0, -0.06, 0]} material={mats.body}>
                <capsuleGeometry args={[0.03, 0.05, 6, 12]} />
              </mesh>
              {/* دمبل — فقط برای حرکات با تجهیزات قابل مشاهده */}
              <group position={[0, -0.062, 0]} visible={showDumbbells}>
                <mesh rotation={[0, 0, Math.PI / 2]} material={mats.metal}>
                  <cylinderGeometry args={[0.011, 0.011, 0.15, 12]} />
                </mesh>
                <mesh position={[0.062, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.plate}>
                  <cylinderGeometry args={[0.05, 0.05, 0.032, 20]} />
                </mesh>
                <mesh position={[-0.062, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.plate}>
                  <cylinderGeometry args={[0.05, 0.05, 0.032, 20]} />
                </mesh>
                <mesh position={[0.083, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.accent}>
                  <cylinderGeometry args={[0.016, 0.016, 0.008, 14]} />
                </mesh>
                <mesh position={[-0.083, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.accent}>
                  <cylinderGeometry args={[0.016, 0.016, 0.008, 14]} />
                </mesh>
              </group>
            </group>
          </group>
        </group>

        {/* ------------------------------ بازوی راست ------------------------------ */}
        <group ref={regJoint("shoulderR")} position={[-0.19, 0.44, 0]}>
          <mesh ref={regMuscle("shoulders-R")} userData={{ muscle: "shoulders" }} visible={false} position={[-0.004, 0.006, 0]} material={mats.secondary}>
            {jointSphere(0.063)}
          </mesh>
          <mesh position={[0, -0.15, 0]} material={mats.body}>
            <capsuleGeometry args={[0.05, 0.2, 6, 14]} />
          </mesh>
          <mesh ref={regMuscle("biceps-R")} userData={{ muscle: "biceps" }} visible={false} position={[0, -0.145, 0.022]} material={mats.secondary}>
            <capsuleGeometry args={[0.057, 0.11, 6, 14]} />
          </mesh>
          <mesh ref={regMuscle("triceps-R")} userData={{ muscle: "triceps" }} visible={false} position={[0, -0.15, -0.024]} material={mats.secondary}>
            <capsuleGeometry args={[0.057, 0.12, 6, 14]} />
          </mesh>
          <group ref={regJoint("elbowR")} position={[0, -0.3, 0]}>
            <mesh material={mats.body}>{jointSphere(0.048)}</mesh>
            <mesh position={[0, -0.13, 0]} material={mats.body}>
              <capsuleGeometry args={[0.042, 0.18, 6, 14]} />
            </mesh>
            <mesh ref={regMuscle("forearms-R")} userData={{ muscle: "forearms" }} visible={false} position={[0, -0.125, 0.002]} material={mats.secondary}>
              <capsuleGeometry args={[0.049, 0.12, 6, 14]} />
            </mesh>
            <group ref={regJoint("wristR")} position={[0, -0.26, 0]}>
              <mesh position={[0, -0.06, 0]} material={mats.body}>
                <capsuleGeometry args={[0.03, 0.05, 6, 12]} />
              </mesh>
              <group position={[0, -0.062, 0]} visible={showDumbbells}>
                <mesh rotation={[0, 0, Math.PI / 2]} material={mats.metal}>
                  <cylinderGeometry args={[0.011, 0.011, 0.15, 12]} />
                </mesh>
                <mesh position={[0.062, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.plate}>
                  <cylinderGeometry args={[0.05, 0.05, 0.032, 20]} />
                </mesh>
                <mesh position={[-0.062, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.plate}>
                  <cylinderGeometry args={[0.05, 0.05, 0.032, 20]} />
                </mesh>
                <mesh position={[0.083, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.accent}>
                  <cylinderGeometry args={[0.016, 0.016, 0.008, 14]} />
                </mesh>
                <mesh position={[-0.083, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.accent}>
                  <cylinderGeometry args={[0.016, 0.016, 0.008, 14]} />
                </mesh>
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* -------------------------------- پای چپ -------------------------------- */}
      <group ref={regJoint("hipL")} position={[0.1, -0.04, 0]}>
        <mesh position={[0, -0.21, 0]} material={mats.body}>
          <capsuleGeometry args={[0.075, 0.31, 6, 16]} />
        </mesh>
        <mesh ref={regMuscle("quads-L")} userData={{ muscle: "quads" }} visible={false} position={[0, -0.2, 0.03]} material={mats.secondary}>
          <capsuleGeometry args={[0.083, 0.27, 6, 16]} />
        </mesh>
        <mesh ref={regMuscle("hamstrings-L")} userData={{ muscle: "hamstrings" }} visible={false} position={[0, -0.2, -0.031]} material={mats.secondary}>
          <capsuleGeometry args={[0.077, 0.25, 6, 16]} />
        </mesh>
        <group ref={regJoint("kneeL")} position={[0, -0.46, 0]}>
          <mesh material={mats.body}>{jointSphere(0.072)}</mesh>
          <mesh position={[0, -0.17, 0]} material={mats.body}>
            <capsuleGeometry args={[0.055, 0.26, 6, 14]} />
          </mesh>
          <mesh ref={regMuscle("calves-L")} userData={{ muscle: "calves" }} visible={false} position={[0, -0.115, -0.028]} material={mats.secondary}>
            <capsuleGeometry args={[0.061, 0.14, 6, 14]} />
          </mesh>
          <group ref={regJoint("ankleL")} position={[0, -0.4, 0]}>
            <RoundedBox args={[0.09, 0.07, 0.23]} radius={0.028} smoothness={4} position={[0, -0.052, 0.055]} material={mats.body} />
          </group>
        </group>
      </group>

      {/* -------------------------------- پای راست -------------------------------- */}
      <group ref={regJoint("hipR")} position={[-0.1, -0.04, 0]}>
        <mesh position={[0, -0.21, 0]} material={mats.body}>
          <capsuleGeometry args={[0.075, 0.31, 6, 16]} />
        </mesh>
        <mesh ref={regMuscle("quads-R")} userData={{ muscle: "quads" }} visible={false} position={[0, -0.2, 0.03]} material={mats.secondary}>
          <capsuleGeometry args={[0.083, 0.27, 6, 16]} />
        </mesh>
        <mesh ref={regMuscle("hamstrings-R")} userData={{ muscle: "hamstrings" }} visible={false} position={[0, -0.2, -0.031]} material={mats.secondary}>
          <capsuleGeometry args={[0.077, 0.25, 6, 16]} />
        </mesh>
        <group ref={regJoint("kneeR")} position={[0, -0.46, 0]}>
          <mesh material={mats.body}>{jointSphere(0.072)}</mesh>
          <mesh position={[0, -0.17, 0]} material={mats.body}>
            <capsuleGeometry args={[0.055, 0.26, 6, 14]} />
          </mesh>
          <mesh ref={regMuscle("calves-R")} userData={{ muscle: "calves" }} visible={false} position={[0, -0.115, -0.028]} material={mats.secondary}>
            <capsuleGeometry args={[0.061, 0.14, 6, 14]} />
          </mesh>
          <group ref={regJoint("ankleR")} position={[0, -0.4, 0]}>
            <RoundedBox args={[0.09, 0.07, 0.23]} radius={0.028} smoothness={4} position={[0, -0.052, 0.055]} material={mats.body} />
          </group>
        </group>
      </group>
    </group>
  );
}
