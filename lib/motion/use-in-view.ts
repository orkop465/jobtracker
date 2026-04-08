'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

interface UseInViewOptions {
  /** Intersection threshold 0–1. Default 0.2. */
  threshold?: number;
  /** Trigger only once on first intersection. Default true. */
  once?: boolean;
  /** rootMargin. Default '0px 0px -10% 0px' (trigger slightly before fully visible). */
  rootMargin?: string;
}

/**
 * Reveals content when it enters the viewport. Returns a ref to attach to the
 * target element, and a boolean that flips true once the element has been seen.
 *
 * In `prefers-reduced-motion`, still works — the IntersectionObserver is cheap
 * and the consumer decides whether to animate based on the returned flag.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  opts: UseInViewOptions = {},
): { ref: RefObject<T | null>; inView: boolean } {
  const { threshold = 0.2, once = true, rootMargin = '0px 0px -10% 0px' } = opts;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      // SSR-safe fallback: assume visible. Single-shot setState is intentional.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, once, rootMargin]);

  return { ref, inView };
}
