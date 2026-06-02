import { useEffect, useRef, useState } from 'react';
import { Ambience, blendAmbience } from './ambience';

export type AmbienceTransitionSpeed = 'slow' | 'fast';

const durationMs: Record<AmbienceTransitionSpeed, number> = {
  slow: 24_000,
  fast: 1_800,
};

export function useTransitionedAmbience(target: Ambience, speed: AmbienceTransitionSpeed) {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);
  const fromRef = useRef(target);
  const targetRef = useRef(target);
  const startedAtRef = useRef(performance.now());
  const speedRef = useRef(speed);

  useEffect(() => {
    // Start each transition from the currently displayed ambience, not the
    // previous target, so rapid button changes still blend smoothly.
    fromRef.current = displayRef.current;
    targetRef.current = target;
    startedAtRef.current = performance.now();
    speedRef.current = speed;
  }, [speed, target]);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const elapsed = performance.now() - startedAtRef.current;
      const t = elapsed / durationMs[speedRef.current];
      const next = blendAmbience(fromRef.current, targetRef.current, t);
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [target]);

  return display;
}
