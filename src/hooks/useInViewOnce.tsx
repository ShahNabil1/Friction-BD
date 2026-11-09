import { useEffect, useRef, useState } from "react";

export function useInViewOnce<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced motion preference
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setInView(true);
      return;
    }

    // Check if element is already visible on mount (above fold)
    const rect = el.getBoundingClientRect();
    const isAlreadyVisible = rect.top < window.innerHeight && rect.bottom > 0;
    if (isAlreadyVisible) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      {
        root: null,
        threshold: 0, // Trigger as soon as any pixel is visible
        rootMargin: "100px 0px", // Trigger slightly before entering viewport
        ...options,
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []); // Only run once on mount

  return { ref, inView };
}
