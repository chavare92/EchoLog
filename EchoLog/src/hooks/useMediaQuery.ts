import { useState, useEffect } from "react";

/**
 * Reactive hook that tracks a CSS media query.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    setMatches(mql.matches);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/** True when viewport is ≤ 768px (mobile). */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 768px)");
}

/** True when viewport is 769–1024px (tablet). */
export function useIsTablet(): boolean {
  return useMediaQuery("(min-width: 769px) and (max-width: 1024px)");
}

/** True when viewport is ≥ 1025px (desktop). */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1025px)");
}
