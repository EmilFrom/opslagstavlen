"use client";

import { useCallback, useRef } from "react";

interface UseDoubleTapOptions {
  delay?: number;
}

export function useDoubleTap<T extends HTMLElement>(
  onDoubleTap: () => void,
  options?: UseDoubleTapOptions,
) {
  const delay = options?.delay ?? 300;
  const lastTapRef = useRef<number>(0);

  const onTouchStart = useCallback(
    (event: React.TouchEvent<T>) => {
      // Prevent Safari from interpreting the gesture as zoom.
      event.preventDefault();

      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;

      if (timeSinceLastTap > 0 && timeSinceLastTap < delay) {
        onDoubleTap();
        lastTapRef.current = 0;
        return;
      }

      lastTapRef.current = now;
    },
    [delay, onDoubleTap],
  );

  return { onTouchStart };
}
