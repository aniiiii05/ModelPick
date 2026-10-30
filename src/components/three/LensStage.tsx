"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, MeshTransmissionMaterial, PresentationControls } from "@react-three/drei";
import * as THREE from "three";

const STEEL = "#a9b4b8";
const ROWS = ["E", "F P", "T O Z", "L P E D", "P E C F D"];
const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A small duochrome chart drawn to a texture, so the lens has something to bend. */
function useChartTexture() {
  const [texture] = useState(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 640;
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  });

  // A three.js texture is a mutable GPU resource; redrawing it in place is how it updates.
  /* eslint-disable react-hooks/immutability */
  useEffect(() => {
    let cancelled = false;
    const draw = () => {
      if (cancelled) return;
      const canvas = texture.image as HTMLCanvasElement;
      const ctx = canvas.getContext("2d")!;
      const { width: w, height: h } = canvas;
      ctx.fillStyle = "#e04848";
      ctx.fillRect(0, 0, w / 2, h);
      ctx.fillStyle = "#3e9b63";
      ctx.fillRect(w / 2, 0, w / 2, h);
      const family = getComputedStyle(document.body).getPropertyValue("--font-archivo").trim() || "sans-serif";
      ctx.fillStyle = "#0b0b0b";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const sizes = [150, 104, 74, 52, 38];
      let y = 92;
      ROWS.forEach((row, i) => {
        ctx.font = `700 ${sizes[i]}px ${family}`;
        ctx.fillText(row.split(" ").join("  "), w / 2, y);
        y += sizes[i] * 0.95 + 26;
      });
      texture.needsUpdate = true;
    };
    draw();
    document.fonts?.ready.then(draw);
    return () => {
      cancelled = true;
    };
  }, [texture]);
  /* eslint-enable react-hooks/immutability */

  return texture;
}

function Backdrop() {
  const texture = useChartTexture();
  const { viewport, camera } = useThree();
  const { width, height } = viewport.getCurrentViewport(camera, [0, 0, -2]);
  return (
    <mesh position={[0, 0, -2]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

/** Biconvex lens profile, revolved. Centre half-thickness is 1; the mesh is scaled to the model's power. */
function useLensGeometry(radius: number) {
  return useMemo(() => {
    const pts: THREE.Vector2[] = [];
    const n = 32;
    const edge = 0.08;
    for (let i = 0; i <= n; i++) {
      const r = (i / n) * radius;
      pts.push(new THREE.Vector2(r, edge + (1 - edge) * (1 - (r / radius) ** 2)));
    }
    for (let i = n; i >= 0; i--) {
      const r = (i / n) * radius;
      pts.push(new THREE.Vector2(r, -(edge + (1 - edge) * (1 - (r / radius) ** 2))));
    }
    const g = new THREE.LatheGeometry(pts, 96);
    g.computeVertexNormals();
    return g;
  }, [radius]);
}

function Lens({ power, turn }: { power: number | null; turn: number }) {
  const R = 1.25;
  const geometry = useLensGeometry(R);
  const glass = useRef<THREE.Mesh>(null);
  const body = useRef<THREE.Group>(null);
  const still = useMemo(() => reduceMotion(), []);
  // Intelligence 30 → a thin lens; 60 → a thick one. Unrated models get a plain window.
  const half = power === null ? 0.05 : THREE.MathUtils.mapLinear(THREE.MathUtils.clamp(power, 28, 60), 28, 60, 0.12, 0.62);

  useFrame((state, dt) => {
    const k = 1 - Math.exp(-dt * 6);
    if (glass.current) glass.current.scale.y += (half - glass.current.scale.y) * k;
    if (body.current) {
      // Each new lens is set into the frame with a quarter turn.
      body.current.rotation.z += (turn * (Math.PI / 2) - body.current.rotation.z) * k;
      if (!still) body.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.38;
    }
  });

  return (
    <group ref={body} position-y={0.3}>
      <mesh ref={glass} geometry={geometry} rotation-x={Math.PI / 2} scale={[1, 0.3, 1]}>
        <MeshTransmissionMaterial
          samples={6}
          resolution={512}
          thickness={1.2}
          ior={1.5}
          roughness={0.02}
          chromaticAberration={0.04}
          anisotropicBlur={0.05}
          distortion={0}
          backside
          backsideThickness={0.6}
          color="#f4fbfa"
        />
      </mesh>
      <mesh>
        <torusGeometry args={[R, 0.075, 24, 96]} />
        <meshStandardMaterial color={STEEL} metalness={1} roughness={0.3} />
      </mesh>
      <mesh position={[0, -R - 0.42, 0]}>
        <boxGeometry args={[0.36, 0.8, 0.1]} />
        <meshStandardMaterial color={STEEL} metalness={1} roughness={0.34} />
      </mesh>
    </group>
  );
}

/** The selected model as a trial lens in front of a duochrome chart. Thicker glass, stronger model. */
export default function LensStage({ power, turn }: { power: number | null; turn: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={box} className="absolute inset-0">
      <Canvas camera={{ position: [0, 0, 7.6], fov: 32 }} dpr={[1, 2]} frameloop={onScreen ? "always" : "never"}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[-3, 4, 5]} intensity={2} />
        <Environment resolution={256} frames={1}>
          {/* The room in front of the lens: what a face-on rim mostly reflects. */}
          <Lightformer form="ring" intensity={1.6} position={[0, 0, 7]} scale={6} />
          <Lightformer form="rect" intensity={0.8} position={[0, 0, 9]} scale={[14, 14, 1]} color="#cfd8db" />
          <Lightformer form="rect" intensity={3} position={[0, 5, -6]} scale={[12, 3, 1]} />
          <Lightformer form="rect" intensity={2} position={[-6, 1, 2]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} />
          <Lightformer form="rect" intensity={1.5} position={[6, -1, 2]} rotation-y={-Math.PI / 2} scale={[8, 2, 1]} />
        </Environment>
        <Backdrop />
        <PresentationControls global={false} cursor snap polar={[-0.5, 0.5]} azimuth={[-0.7, 0.7]}>
          <Lens power={power} turn={turn} />
        </PresentationControls>
      </Canvas>
    </div>
  );
}
