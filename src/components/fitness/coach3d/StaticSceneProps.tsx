"use client";

/**
 * تجهیزات ثابت صحنه — نیمکت، جعبه، میله بارفیکس، پارالل، دیوار، توپ سوئیسی
 * و صندلی دستگاه. بدون حرکت؛ فقط برای درک فضایی حرکت. نمایش ساده و صادقانه:
 * مکانیزم دستگاه‌ها شبیه‌سازی نمی‌شود (یادداشت شفاف در سطح صحنه نشان داده
 * می‌شود).
 */

import type { ScenePropKind } from "@/lib/fitness3d/profiles/core";

export function StaticSceneProps({ kinds }: { kinds: ScenePropKind[] }) {
  return (
    <>
      {kinds.includes("bench-flat") && (
        <group position={[0, 0, 0]}>
          {/* نشیمن نیمکت */}
          <mesh position={[0, 0.46, -0.28]} castShadow={false}>
            <boxGeometry args={[0.34, 0.07, 1.1]} />
            <meshStandardMaterial color="#2f3542" roughness={0.55} metalness={0.35} />
          </mesh>
          {/* پایه‌ها */}
          <mesh position={[0, 0.23, -0.7]}>
            <boxGeometry args={[0.24, 0.46, 0.07]} />
            <meshStandardMaterial color="#8b93a5" roughness={0.35} metalness={0.7} />
          </mesh>
          <mesh position={[0, 0.23, 0.14]}>
            <boxGeometry args={[0.24, 0.46, 0.07]} />
            <meshStandardMaterial color="#8b93a5" roughness={0.35} metalness={0.7} />
          </mesh>
        </group>
      )}
      {kinds.includes("bench-incline") && (
        <group position={[0, 0, 0]} rotation={[-0.42, 0, 0]}>
          <mesh position={[0, 0.46, -0.18]}>
            <boxGeometry args={[0.34, 0.07, 1.15]} />
            <meshStandardMaterial color="#2f3542" roughness={0.55} metalness={0.35} />
          </mesh>
          <mesh position={[0, 0.2, -0.55]}>
            <boxGeometry args={[0.24, 0.4, 0.07]} />
            <meshStandardMaterial color="#8b93a5" roughness={0.35} metalness={0.7} />
          </mesh>
          <mesh position={[0, 0.32, 0.22]}>
            <boxGeometry args={[0.24, 0.62, 0.07]} />
            <meshStandardMaterial color="#8b93a5" roughness={0.35} metalness={0.7} />
          </mesh>
        </group>
      )}
      {kinds.includes("bench-decline") && (
        <group position={[0, 0, 0]} rotation={[0.3, 0, 0]}>
          <mesh position={[0, 0.42, -0.1]}>
            <boxGeometry args={[0.34, 0.07, 1.1]} />
            <meshStandardMaterial color="#2f3542" roughness={0.55} metalness={0.35} />
          </mesh>
          <mesh position={[0, 0.2, -0.6]}>
            <boxGeometry args={[0.24, 0.4, 0.07]} />
            <meshStandardMaterial color="#8b93a5" roughness={0.35} metalness={0.7} />
          </mesh>
          <mesh position={[0, 0.18, 0.4]}>
            <boxGeometry args={[0.24, 0.36, 0.07]} />
            <meshStandardMaterial color="#8b93a5" roughness={0.35} metalness={0.7} />
          </mesh>
        </group>
      )}
      {kinds.includes("box") && (
        <mesh position={[0, 0.3, 0.28]}>
          <boxGeometry args={[0.8, 0.6, 0.55]} />
          <meshStandardMaterial color="#333a48" roughness={0.6} metalness={0.25} />
        </mesh>
      )}
      {kinds.includes("pullup-bar") && (
        <group position={[0, 2.1, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.022, 0.022, 1.4, 14]} />
            <meshStandardMaterial color="#8b93a5" roughness={0.3} metalness={0.8} />
          </mesh>
          <mesh position={[0.66, -0.16, 0]}>
            <boxGeometry args={[0.06, 0.32, 0.06]} />
            <meshStandardMaterial color="#59616f" roughness={0.4} metalness={0.7} />
          </mesh>
          <mesh position={[-0.66, -0.16, 0]}>
            <boxGeometry args={[0.06, 0.32, 0.06]} />
            <meshStandardMaterial color="#59616f" roughness={0.4} metalness={0.7} />
          </mesh>
        </group>
      )}
      {kinds.includes("dip-bars") && (
        <group>
          <mesh position={[0.34, 1.06, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.024, 0.024, 0.9, 12]} />
            <meshStandardMaterial color="#8b93a5" roughness={0.3} metalness={0.8} />
          </mesh>
          <mesh position={[-0.34, 1.06, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.024, 0.024, 0.9, 12]} />
            <meshStandardMaterial color="#8b93a5" roughness={0.3} metalness={0.8} />
          </mesh>
          <mesh position={[0.34, 0.5, 0]}>
            <boxGeometry args={[0.06, 1.0, 0.06]} />
            <meshStandardMaterial color="#59616f" roughness={0.4} metalness={0.7} />
          </mesh>
          <mesh position={[-0.34, 0.5, 0]}>
            <boxGeometry args={[0.06, 1.0, 0.06]} />
            <meshStandardMaterial color="#59616f" roughness={0.4} metalness={0.7} />
          </mesh>
        </group>
      )}
      {kinds.includes("stability-ball") && (
        <mesh position={[0, 0.33, -0.42]}>
          <sphereGeometry args={[0.33, 28, 20]} />
          <meshStandardMaterial color="#3d5a80" roughness={0.45} metalness={0.1} />
        </mesh>
      )}
      {kinds.includes("wall") && (
        <mesh position={[0, 1.5, -0.85]}>
          <boxGeometry args={[2.6, 3.0, 0.06]} />
          <meshStandardMaterial color="#252b38" roughness={0.85} metalness={0.05} transparent opacity={0.85} />
        </mesh>
      )}
      {kinds.includes("machine-seat") && (
        <group position={[0, 0, -0.62]}>
          <mesh position={[0, 0.42, 0]}>
            <boxGeometry args={[0.4, 0.08, 0.42]} />
            <meshStandardMaterial color="#2f3542" roughness={0.55} metalness={0.35} />
          </mesh>
          <mesh position={[0, 0.75, -0.2]}>
            <boxGeometry args={[0.4, 0.62, 0.08]} />
            <meshStandardMaterial color="#2f3542" roughness={0.55} metalness={0.35} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[0.18, 0.4, 0.18]} />
            <meshStandardMaterial color="#59616f" roughness={0.4} metalness={0.7} />
          </mesh>
        </group>
      )}
    </>
  );
}
