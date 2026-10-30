"use client";

import { useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";

/** Shared between the DOM wrapper (writes the pointer) and the scene (writes the lens position). */
export type LensPointer = { x: number; y: number; active: boolean };

type Props = {
  pointer: RefObject<LensPointer>;
  /** The element that shows the sharp, magnified chart; the scene keeps its aperture on the lens. */
  view: RefObject<HTMLDivElement | null>;
  /** Size of the chart panel in CSS px. The canvas bleeds `bleed` px past it on every side. */
  bleed: number;
  hunting: boolean;
  running: boolean;
  onReady: () => void;
};

const STEEL = "#a9b4b8";
const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A trial lens: steel rim, a glass disc, and the flat tab opticians hold it by. Units are CSS px. */
function TrialLens({ pointer, view, bleed, hunting }: Omit<Props, "running" | "onReady">) {
  const group = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const { size } = useThree();
  const still = useMemo(() => reduceMotion(), []);
  const pos = useRef({ x: -1, y: -1, vx: 0, vy: 0 });

  // The panel is the canvas minus the bleed; the lens radius follows its width.
  const W = size.width - bleed * 2;
  const H = size.height - bleed * 2;
  const R = Math.min(112, Math.max(54, W * 0.115));

  useFrame((state, dt) => {
    const g = group.current;
    if (!g || W <= 0) return;
    const t = state.clock.elapsedTime;
    const p = pos.current;

    // Idle, the lens drifts across the rows so the chart demonstrates itself; a pointer takes over.
    let tx: number, ty: number;
    if (pointer.current.active) {
      tx = pointer.current.x;
      ty = pointer.current.y;
    } else if (still) {
      tx = W * 0.7;
      ty = H * 0.66;
    } else {
      tx = W * 0.5 + W * 0.3 * Math.sin(t * 0.32);
      ty = H * 0.58 + H * 0.2 * Math.sin(t * 0.64 + 1.2);
    }
    tx = Math.min(W - R * 0.4, Math.max(R * 0.4, tx));
    ty = Math.min(H - R * 0.4, Math.max(R * 0.4, ty));
    if (p.x < 0) {
      p.x = tx;
      p.y = ty;
    }

    const k = 1 - Math.exp(-dt * (pointer.current.active ? 10 : 2.5));
    const nx = p.x + (tx - p.x) * k;
    const ny = p.y + (ty - p.y) * k;
    p.vx += ((nx - p.x) / Math.max(dt, 1e-3) - p.vx) * 0.2;
    p.vy += ((ny - p.y) / Math.max(dt, 1e-3) - p.vy) * 0.2;
    p.x = nx;
    p.y = ny;

    g.position.set(p.x - W / 2, H / 2 - p.y, 0);
    // Lean into the motion, and toward the room's light on the left.
    g.rotation.y = THREE.MathUtils.clamp(p.vx * 0.0011, -0.32, 0.32) + 0.18;
    g.rotation.x = THREE.MathUtils.clamp(p.vy * 0.0011, -0.32, 0.32) - 0.08;

    // While the exam runs, the lens turns in its frame like a refractor hunting for focus.
    if (spin.current) {
      const target = hunting && !still ? spin.current.rotation.z + dt * 4 : Math.round(spin.current.rotation.z / (Math.PI * 2)) * Math.PI * 2;
      spin.current.rotation.z += (target - spin.current.rotation.z) * (hunting ? 1 : 1 - Math.exp(-dt * 4));
    }

    const v = view.current;
    if (v) {
      v.style.setProperty("--lx", `${p.x}px`);
      v.style.setProperty("--ly", `${p.y}px`);
      v.style.setProperty("--lr", `${R * 0.94}px`);
    }
  });

  return (
    <group ref={group}>
      <group ref={spin}>
        {/* Rim */}
        <mesh>
          <torusGeometry args={[R, R * 0.085, 24, 96]} />
          <meshStandardMaterial color={STEEL} metalness={1} roughness={0.28} />
        </mesh>
        {/* Glass: nearly clear, it carries the room's reflections over the sharp view. */}
        <mesh>
          <cylinderGeometry args={[R * 0.99, R * 0.99, R * 0.012, 96]} />
          <meshPhysicalMaterial
            color="#e8f4f2"
            transparent
            opacity={0.1}
            roughness={0}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0}
            envMapIntensity={2.2}
            depthWrite={false}
          />
        </mesh>
        {/* Tab, angled down and to the right. */}
        <group rotation={[0, 0, -0.75]}>
          <mesh position={[0, -R - R * 0.42, 0]}>
            <boxGeometry args={[R * 0.32, R * 0.72, R * 0.1]} />
            <meshStandardMaterial color={STEEL} metalness={1} roughness={0.34} />
          </mesh>
          <mesh position={[0, -R - R * 0.62, R * 0.052]}>
            <circleGeometry args={[R * 0.07, 24]} />
            <meshStandardMaterial color="#1a2023" metalness={0.6} roughness={0.5} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export default function HeroLens({ pointer, view, bleed, hunting, running, onReady }: Props) {
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 600], zoom: 1, near: 1, far: 2000 }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      frameloop={running ? "always" : "never"}
      onCreated={onReady}
      style={{ pointerEvents: "none" }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[-300, 400, 500]} intensity={2.2} />
      {/* A studio of soft panels, so the steel and glass have something to reflect. No downloads. */}
      <Environment resolution={256} frames={1}>
          {/* The room in front of the lens: what a face-on rim mostly reflects. */}
          <Lightformer form="ring" intensity={1.6} position={[0, 0, 7]} scale={6} />
          <Lightformer form="rect" intensity={0.8} position={[0, 0, 9]} scale={[14, 14, 1]} color="#cfd8db" />
        <Lightformer form="rect" intensity={3} position={[0, 5, -6]} scale={[12, 3, 1]} />
        <Lightformer form="rect" intensity={2} position={[-6, 1, 2]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#e04848" position={[5, 0, 3]} rotation-y={-Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#3e9b63" position={[0, -5, 3]} rotation-x={-Math.PI / 2} scale={[10, 3, 1]} />
      </Environment>
      <TrialLens pointer={pointer} view={view} bleed={bleed} hunting={hunting} />
    </Canvas>
  );
}
