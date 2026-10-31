"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

const COLORS = ["#6c4cf1", "#ff9f1c", "#12c2b4", "#ffc93c", "#ff5a5f", "#3cc85a"];

type Piece = {
  x: number;
  delay: number;
  duration: number;
  rotate: number;
  color: string;
  size: number;
};

function makePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, i) => ({
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1.8 + Math.random() * 1.4,
    rotate: (Math.random() - 0.5) * 720,
    color: COLORS[i % COLORS.length],
    size: 6 + Math.random() * 6,
  }));
}

/** Pluie de confettis plein écran (ignorée si l'utilisateur réduit les animations). */
export function Confetti({ count = 60 }: { count?: number }) {
  const reduce = useReducedMotion();
  const [pieces] = useState(() => makePieces(count));
  if (reduce) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute top-0 block rounded-[2px]"
          style={{ left: `${p.x}%`, width: p.size, height: p.size * 0.6, backgroundColor: p.color }}
          initial={{ y: -20, rotate: 0, opacity: 1 }}
          animate={{ y: "105vh", rotate: p.rotate, opacity: [1, 1, 0] }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}
