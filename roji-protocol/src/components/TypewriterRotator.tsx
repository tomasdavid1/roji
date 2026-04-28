"use client";

import { useEffect, useState } from "react";

interface Props {
  /** Words to cycle through. Order is preserved; loops forever. */
  words: string[];
  /** ms per character while typing. */
  typeSpeed?: number;
  /** ms per character while deleting. */
  deleteSpeed?: number;
  /** ms to hold the fully-typed word before starting to delete. */
  holdMs?: number;
  /** ms to hold the empty state before starting the next word. */
  emptyHoldMs?: number;
  /** Tailwind class applied to the rotating word (color, font, etc.). */
  className?: string;
  /** Tailwind class for the blinking cursor. */
  cursorClassName?: string;
}

/**
 * Typewriter word rotator for the hero headline.
 *
 * One word at a time types in letter-by-letter, holds for `holdMs`,
 * deletes letter-by-letter, then types the next word. The blinking
 * caret is visible at all phases so the headline never feels static.
 *
 * Respects `prefers-reduced-motion`: when the user has reduced motion
 * enabled, we just show the first word statically (no animation, no
 * caret) — important because typing animations are a known
 * accessibility footgun.
 */
export function TypewriterRotator({
  words,
  typeSpeed = 70,
  deleteSpeed = 40,
  holdMs = 2000,
  emptyHoldMs = 250,
  className = "",
  cursorClassName = "",
}: Props) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [wordIdx, setWordIdx] = useState(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"typing" | "holding" | "deleting" | "empty">(
    "typing",
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (reducedMotion || words.length === 0) return;

    const word = words[wordIdx];
    let timer: ReturnType<typeof setTimeout>;

    if (phase === "typing") {
      if (text.length < word.length) {
        timer = setTimeout(() => setText(word.slice(0, text.length + 1)), typeSpeed);
      } else {
        timer = setTimeout(() => setPhase("holding"), 0);
      }
    } else if (phase === "holding") {
      timer = setTimeout(() => setPhase("deleting"), holdMs);
    } else if (phase === "deleting") {
      if (text.length > 0) {
        timer = setTimeout(() => setText(word.slice(0, text.length - 1)), deleteSpeed);
      } else {
        timer = setTimeout(() => setPhase("empty"), 0);
      }
    } else if (phase === "empty") {
      timer = setTimeout(() => {
        setWordIdx((i) => (i + 1) % words.length);
        setPhase("typing");
      }, emptyHoldMs);
    }

    return () => clearTimeout(timer);
  }, [phase, text, wordIdx, words, typeSpeed, deleteSpeed, holdMs, emptyHoldMs, reducedMotion]);

  if (reducedMotion) {
    return <span className={className}>{words[0]}</span>;
  }

  return (
    <span className="whitespace-nowrap">
      <span className={className}>{text}</span>
      <span
        aria-hidden="true"
        className={
          "inline-block w-[2px] h-[0.9em] align-[-0.05em] ml-0.5 bg-current animate-roji-caret " +
          cursorClassName
        }
      />
    </span>
  );
}
