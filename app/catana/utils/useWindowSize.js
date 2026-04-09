
// https://github.com/bcollazo/catanatron/blob/425ccdef04921d1756a1c9bb1f904fceb1f3c3d3/ui/src/utils/useWindowSize.js

import { useEffect, useState } from "react";

export const DEFAULT_WINDOW_SIZE = Object.freeze({
  width: 1280,
  height: 720,
});

export function getInitialWindowSize() {
  if (typeof window === "undefined") {
    return DEFAULT_WINDOW_SIZE;
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

// Hook
export default function useWindowSize() {
  // Keep the initial render deterministic so the board is present in SSR HTML
  // without introducing a server/client hydration mismatch.
  const [windowSize, setWindowSize] = useState(DEFAULT_WINDOW_SIZE);

  useEffect(() => {
    function handleResize() {
      const nextWindowSize = getInitialWindowSize();
      setWindowSize((currentWindowSize) =>
        currentWindowSize.width === nextWindowSize.width &&
        currentWindowSize.height === nextWindowSize.height
          ? currentWindowSize
          : nextWindowSize
      );
    }

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
}
