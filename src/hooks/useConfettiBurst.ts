"use client";
import { useCallback, useRef } from "react";
import confetti from "canvas-confetti";

export function useConfettiBurst() {
  const cardRef = useRef<HTMLDivElement>(null);

  const fire = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;

    // Get card position relative to the viewport
    const rect = card.getBoundingClientRect();
    // Origin is normalized to viewport (0-1)
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height * 0.3) / window.innerHeight;

    const colors = ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#ff6fc8", "#a855f7"];

    // Left burst — angled rightward
    confetti({
      particleCount: 50,
      angle: 70,
      spread: 55,
      origin: { x: x - 0.02, y },
      colors,
      gravity: 0.8,
      ticks: 120,
      scalar: 0.9,
      zIndex: 100,
    });

    // Right burst — angled leftward
    confetti({
      particleCount: 50,
      angle: 110,
      spread: 55,
      origin: { x: x + 0.02, y },
      colors,
      gravity: 0.8,
      ticks: 120,
      scalar: 0.9,
      zIndex: 100,
    });
  }, []);

  return { cardRef, fire };
}
