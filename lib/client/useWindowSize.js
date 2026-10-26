import { useEffect, useLayoutEffect, useState } from "react";

const UNMEASURED_VIEWPORT = Object.freeze({ width: 1280, height: 720, isMeasured: false });
const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export default function useWindowSize() {
  // SSR and the first hydration render share geometry; callers hide it until measured.
  const [viewport, setViewport] = useState(null);

  useBrowserLayoutEffect(() => {
    const measure = () => {
      const { innerWidth: width, innerHeight: height } = window;
      setViewport(current => current?.width === width && current?.height === height
        ? current
        : { width, height, isMeasured: true });
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return viewport ?? UNMEASURED_VIEWPORT;
}
