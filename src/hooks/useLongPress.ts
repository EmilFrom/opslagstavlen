"use client";

import { useCallback, useRef } from "react";

interface UseLongPressOptions {
  delay?: number;
}

export function useLongPress<T extends HTMLElement>(
  onLongPress: () => void,
  options?: UseLongPressOptions,
) {
  const delay = options?.delay ?? 500;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const onTouchStart = useCallback(() => {
    clear();
    timeoutRef.current = setTimeout(() => {
      onLongPress();
    }, delay);
  }, [clear, delay, onLongPress]);

  const onTouchEnd = useCallback(() => {
    clear();
  }, [clear]);

  const onTouchCancel = useCallback(() => {
    clear();
  }, [clear]);

  return {
    onTouchStart,
    onTouchEnd,
    onTouchCancel,
  } as const;
}
