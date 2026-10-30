"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { EyeChart } from "./EyeChart";
import type { LensPointer } from "./three/HeroLens";

// three.js loads after the page is interactive; the chart reads fine without it.
const HeroLens = dynamic(() => import("./three/HeroLens"), { ssr: false });

const BLEED = 64;

/** No WebGL, or the scene failed: keep the plain chart. */
class Quiet extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * The eye chart with a 3D trial lens over it. The chart blurs with distance; through the lens it reads sharp.
 * The lens drifts on its own until a pointer moves over the chart, then follows it.
 */
export function LensChart({ focus, hunting }: { focus: number; hunting: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const view = useRef<HTMLDivElement>(null);
  const pointer = useRef<LensPointer>({ x: 0, y: 0, active: false });
  const [ready, setReady] = useState(false);
  const [onScreen, setOnScreen] = useState(true);

  // Stop rendering frames once the chart scrolls away.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function move(e: React.PointerEvent) {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    pointer.current = { x: e.clientX - r.left, y: e.clientY - r.top, active: true };
  }

  return (
    <div
      ref={box}
      className={`relative ${ready ? "[@media(pointer:fine)]:cursor-none" : ""}`}
      onPointerMove={move}
      onPointerDown={move}
      onPointerLeave={() => (pointer.current.active = false)}
      onPointerCancel={() => (pointer.current.active = false)}
    >
      <EyeChart focus={focus} />

      <div ref={view} aria-hidden="true" className="lens-view pointer-events-none absolute inset-0" style={{ opacity: ready ? 1 : 0 }}>
        <div className="lens-mag">
          <EyeChart focus={1} decorative />
        </div>
      </div>

      <div aria-hidden="true" className="pointer-events-none absolute" style={{ inset: -BLEED }}>
        <Quiet>
          <HeroLens pointer={pointer} view={view} bleed={BLEED} hunting={hunting} running={onScreen} onReady={() => setReady(true)} />
        </Quiet>
      </div>
    </div>
  );
}
