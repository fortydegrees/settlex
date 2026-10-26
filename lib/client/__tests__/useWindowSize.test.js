import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import useWindowSize from "../useWindowSize";

afterEach(() => vi.unstubAllGlobals());

function Viewport() {
  const { width, height, isMeasured } = useWindowSize();
  return React.createElement("output", { style: { visibility: isMeasured ? "visible" : "hidden" } },
    `${width}x${height}:${isMeasured ? "measured" : "unmeasured"}`);
}

it("renders eager board geometry at the stable unmeasured SSR size", () => {
  vi.stubGlobal("window", undefined);
  expect(renderToStaticMarkup(React.createElement(Viewport)))
    .toBe('<output style="visibility:hidden">1280x720:unmeasured</output>');
});

it("keeps the server markup stable even when a browser global exists", () => {
  vi.stubGlobal("window", { innerWidth: 390, innerHeight: 844 });
  expect(renderToStaticMarkup(React.createElement(Viewport)))
    .toBe('<output style="visibility:hidden">1280x720:unmeasured</output>');
});
