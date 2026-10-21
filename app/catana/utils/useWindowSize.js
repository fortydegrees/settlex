
// https://github.com/bcollazo/catanatron/blob/425ccdef04921d1756a1c9bb1f904fceb1f3c3d3/ui/src/utils/useWindowSize.js

import { useEffect, useLayoutEffect, useState } from "react";

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

export function getUnmeasuredWindowSize() {
  return {
    ...DEFAULT_WINDOW_SIZE,
    isMeasured: false,
  };
}

export function getMeasuredWindowSize() {
  return {
    ...getInitialWindowSize(),
    isMeasured: typeof window !== "undefined",
  };
}

const useBrowserLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

// Hook
export default function useWindowSize() {
  // Keep fallback geometry in SSR HTML for eager image discovery, but let
  // callers hide it until the browser viewport has been measured.
  const [windowSize, setWindowSize] = useState(getUnmeasuredWindowSize);

  useBrowserLayoutEffect(() => {
    function handleResize() {
      const nextWindowSize = getMeasuredWindowSize();
      setWindowSize((currentWindowSize) =>
        currentWindowSize.width === nextWindowSize.width &&
        currentWindowSize.height === nextWindowSize.height &&
        currentWindowSize.isMeasured === nextWindowSize.isMeasured
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
