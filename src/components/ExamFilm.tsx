"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The exam as a stop-motion loop (rendered with Remotion from exam-film/). It plays only while on
 * screen, and not at all for visitors who ask for reduced motion: they get the final frame.
 */
export function ExamFilm() {
  const video = useRef<HTMLVideoElement>(null);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(reduce.matches);
    sync();
    reduce.addEventListener("change", sync);
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !reduce.matches) v.play().catch(() => {});
      else v.pause();
    });
    io.observe(v);
    return () => {
      io.disconnect();
      reduce.removeEventListener("change", sync);
    };
  }, []);

  return (
    <figure className="overflow-hidden rounded-[14px] border-[6px] border-steel bg-[#0d1214] shadow-[0_24px_48px_-24px_rgb(10_20_24/0.55)] sm:border-[10px]">
      <video
        ref={video}
        className="block aspect-[2/1] w-full"
        poster="/film/exam-poster.jpg"
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="Stop-motion film: a prompt is typed on a card, a trial lens sharpens the eye chart, and a prescription prints and is stamped filled."
        style={still ? { display: "none" } : undefined}
      >
        <source src="/film/exam.webm" type="video/webm" />
        <source src="/film/exam.mp4" type="video/mp4" />
      </video>
      {still && (
        // eslint-disable-next-line @next/next/no-img-element -- a fixed poster frame; next/image adds nothing here
        <img src="/film/exam-poster.jpg" alt="A prompt card, the sharpened eye chart, and a stamped prescription for Claude Opus 5.5." className="block aspect-[2/1] w-full" />
      )}
    </figure>
  );
}
