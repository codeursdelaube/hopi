"use client";

import { useState } from "react";
import { motion, useReducedMotion, type Transition } from "motion/react";
import { fr } from "@/lib/i18n/fr";

export type MascotMood = "neutral" | "happy" | "sad" | "proud";

type MascotProps = {
  mood?: MascotMood;
  /** Largeur en pixels (la hauteur suit le ratio). */
  size?: number;
  className?: string;
  /** Remplace le texte alternatif par défaut. */
  label?: string;
};

const INK = "#2b2240";
const FUR = "#ece6fa";
const BELLY = "#ffffff";
const PINK = "#ff9ebb";
const INNER_EAR = "#ffb8ce";
const MOUTH = "#8a2b45";
const SCARF = "#ff9f1c";
const SCARF_DARK = "#e07f00";
const GOLD = "#ffc93c";
const TEAR = "#7cc7ff";

const outline = { stroke: INK, strokeWidth: 3, strokeLinejoin: "round" as const };

/** Inclinaison des oreilles (degrés) selon l'humeur : [gauche, droite]. */
const EARS: Record<MascotMood, [number, number]> = {
  neutral: [-6, 12],
  happy: [-12, 12],
  sad: [-45, 45],
  proud: [-4, 4],
};

/** Cadre élargi sur les côtés pour que les oreilles tombantes restent visibles. */
const VIEW_W = 240;
const VIEW_H = 232;

const spring: Transition = { type: "spring", stiffness: 260, damping: 14 };

export function Mascot({ mood = "neutral", size = 160, className, label }: MascotProps) {
  const reduce = useReducedMotion();
  const [leftEar, rightEar] = EARS[mood];
  const excited = mood === "happy" || mood === "proud";
  const eyesOpen = mood !== "proud";
  // Pas d'animation « pop » au premier rendu (sinon le HTML serveur montre un visage estompé).
  const [prevMood, setPrevMood] = useState(mood);
  const [moodChanged, setMoodChanged] = useState(false);
  if (mood !== prevMood) {
    setPrevMood(mood);
    setMoodChanged(true);
  }

  return (
    <motion.svg
      viewBox={`-20 0 ${VIEW_W} ${VIEW_H}`}
      width={size}
      height={Math.round((size * VIEW_H) / VIEW_W)}
      role="img"
      aria-label={label ?? fr.mascot.moods[mood]}
      data-mood={mood}
      className={className}
    >
      {/* Ombre au sol */}
      <ellipse cx="100" cy="224" rx="52" ry="6" fill={INK} opacity="0.12" />

      <motion.g
        animate={reduce ? undefined : { y: excited ? [0, -10, 0] : [0, -4, 0] }}
        transition={{
          duration: excited ? 0.7 : 2.6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Oreilles (derrière la tête), pivot à leur base */}
        <motion.g
          style={{ originX: 0.5, originY: 1 }}
          initial={false}
          animate={{ rotate: leftEar }}
          transition={spring}
        >
          <ellipse cx="74" cy="58" rx="19" ry="50" fill={FUR} {...outline} />
          <ellipse cx="74" cy="62" rx="9" ry="36" fill={INNER_EAR} />
        </motion.g>
        <motion.g
          style={{ originX: 0.5, originY: 1 }}
          initial={false}
          animate={{ rotate: rightEar }}
          transition={spring}
        >
          <ellipse cx="126" cy="58" rx="19" ry="50" fill={FUR} {...outline} />
          <ellipse cx="126" cy="62" rx="9" ry="36" fill={INNER_EAR} />
        </motion.g>

        {/* Corps */}
        <ellipse cx="100" cy="188" rx="50" ry="34" fill={FUR} {...outline} />
        <ellipse cx="100" cy="194" rx="30" ry="22" fill={BELLY} />

        {/* Pattes arrière */}
        <ellipse cx="74" cy="217" rx="19" ry="9" fill={FUR} {...outline} />
        <ellipse cx="126" cy="217" rx="19" ry="9" fill={FUR} {...outline} />

        {/* Pattes avant : elles se lèvent quand Hopi est content */}
        <motion.g
          initial={false}
          animate={{ y: excited ? -18 : 0, rotate: excited ? -25 : 0 }}
          transition={spring}
        >
          <ellipse cx="58" cy="196" rx="11" ry="15" fill={FUR} {...outline} />
        </motion.g>
        <motion.g
          initial={false}
          animate={{ y: excited ? -18 : 0, rotate: excited ? 25 : 0 }}
          transition={spring}
        >
          <ellipse cx="142" cy="196" rx="11" ry="15" fill={FUR} {...outline} />
        </motion.g>

        {/* Tête */}
        <ellipse cx="100" cy="118" rx="64" ry="56" fill={FUR} {...outline} />
        <ellipse cx="100" cy="143" rx="27" ry="19" fill={BELLY} />
        <circle cx="58" cy="138" r="10" fill={PINK} opacity="0.55" />
        <circle cx="142" cy="138" r="10" fill={PINK} opacity="0.55" />

        {/* Écharpe orange (couleur de la marque) */}
        <path d="M56 166 Q100 188 144 166 L146 177 Q100 200 54 177 Z" fill={SCARF} {...outline} />
        <path d="M126 182 L140 204 L127 205 L118 186 Z" fill={SCARF_DARK} {...outline} />

        {/* Visage : réapparaît avec un petit « pop » à chaque changement d'humeur */}
        <motion.g
          key={mood}
          style={{ originX: 0.5, originY: 0.5 }}
          initial={reduce || !moodChanged ? false : { scale: 0.85, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={spring}
        >
          {eyesOpen ? (
            <motion.g
              style={{ originX: 0.5, originY: 0.5 }}
              animate={reduce ? undefined : { scaleY: [1, 1, 0.1, 1] }}
              transition={{
                duration: 4,
                times: [0, 0.92, 0.96, 1],
                repeat: Infinity,
              }}
            >
              <OpenEye cx={78} cy={mood === "sad" ? 115 : 112} small={mood === "sad"} />
              <OpenEye cx={122} cy={mood === "sad" ? 115 : 112} small={mood === "sad"} />
            </motion.g>
          ) : (
            <g fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round">
              <path d="M67 115 Q78 102 89 115" />
              <path d="M111 115 Q122 102 133 115" />
            </g>
          )}

          {mood === "sad" && (
            <>
              <g stroke={INK} strokeWidth="4" strokeLinecap="round">
                <path d="M65 101 L88 93" />
                <path d="M112 93 L135 101" />
              </g>
              <path
                d="M68 124 q-6 9 0 13 q6 -4 0 -13 z"
                fill={TEAR}
                stroke={INK}
                strokeWidth="1.5"
              />
            </>
          )}

          {/* Nez */}
          <path
            d="M93 129 Q100 125 107 129 Q104 136 100 137 Q96 136 93 129 Z"
            fill={PINK}
            stroke={INK}
            strokeWidth="2"
            strokeLinejoin="round"
          />

          <Mouth mood={mood} />
        </motion.g>

        {mood === "proud" && (
          <>
            {/* Médaille */}
            <path d="M92 182 L96 196 M108 182 L104 196" stroke={INK} strokeWidth="3" />
            <circle cx="100" cy="202" r="11" fill={GOLD} {...outline} />
            <path
              d="M100 195 L102.2 199.8 L107.4 200.3 L103.5 203.8 L104.6 209 L100 206.3 L95.4 209 L96.5 203.8 L92.6 200.3 L97.8 199.8 Z"
              fill="#fff6d6"
            />
            <Sparkle x={28} y={62} delay={0} reduce={reduce} />
            <Sparkle x={174} y={48} delay={0.3} reduce={reduce} />
            <Sparkle x={178} y={128} delay={0.6} reduce={reduce} />
          </>
        )}
      </motion.g>
    </motion.svg>
  );
}

function OpenEye({ cx, cy, small }: { cx: number; cy: number; small?: boolean }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={small ? 8 : 9} ry={small ? 10 : 11.5} fill={INK} />
      <circle cx={cx + 3} cy={cy - 4} r="3.2" fill="#fff" />
      <circle cx={cx - 3} cy={cy + 4} r="1.5" fill="#fff" />
    </g>
  );
}

function Teeth({ y }: { y: number }) {
  return (
    <g>
      <rect x="95" y={y} width="10" height="7" rx="2" fill="#fff" stroke={INK} strokeWidth="2" />
      <path d={`M100 ${y} V${y + 7}`} stroke={INK} strokeWidth="1.5" />
    </g>
  );
}

function Mouth({ mood }: { mood: MascotMood }) {
  switch (mood) {
    case "neutral":
      return (
        <g>
          <Teeth y={142.5} />
          <path
            d="M90 141 Q95 146 100 141 Q105 146 110 141"
            fill="none"
            stroke={INK}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      );
    case "happy":
      return (
        <g>
          <path d="M86 140 Q100 166 114 140 Q100 146 86 140 Z" fill={MOUTH} {...outline} />
          <ellipse cx="100" cy="153" rx="7" ry="4" fill={PINK} />
          <Teeth y={141} />
        </g>
      );
    case "sad":
      return (
        <path
          d="M88 153 Q100 142 112 153"
          fill="none"
          stroke={INK}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      );
    case "proud":
      return (
        <g>
          <path d="M82 138 Q100 172 118 138 Q100 145 82 138 Z" fill={MOUTH} {...outline} />
          <ellipse cx="100" cy="156" rx="8" ry="5" fill={PINK} />
          <Teeth y={140} />
        </g>
      );
  }
}

function Sparkle({
  x,
  y,
  delay,
  reduce,
}: {
  x: number;
  y: number;
  delay: number;
  reduce: boolean | null;
}) {
  return (
    <motion.path
      d={`M${x} ${y - 10} Q${x + 2} ${y - 2} ${x + 10} ${y} Q${x + 2} ${y + 2} ${x} ${y + 10} Q${x - 2} ${y + 2} ${x - 10} ${y} Q${x - 2} ${y - 2} ${x} ${y - 10} Z`}
      fill={GOLD}
      stroke={INK}
      strokeWidth="1.5"
      style={{ originX: 0.5, originY: 0.5 }}
      animate={reduce ? undefined : { scale: [0.6, 1.1, 0.6], rotate: [0, 20, 0] }}
      transition={{ duration: 1.4, repeat: Infinity, delay }}
    />
  );
}
