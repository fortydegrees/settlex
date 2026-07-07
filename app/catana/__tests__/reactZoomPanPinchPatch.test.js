import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const packageRoot = path.dirname(require.resolve("react-zoom-pan-pinch/package.json"));
const cjsBundlePath = require.resolve("react-zoom-pan-pinch");
const esmBundlePath = path.join(packageRoot, "dist", "index.esm.js");

function createFakeDocument() {
  const head = { appendChild() {} };
  return {
    head,
    getElementsByTagName() {
      return [head];
    },
    createElement() {
      return {
        appendChild() {},
        setAttribute() {},
        style: {},
        styleSheet: null,
      };
    },
    createTextNode(text) {
      return { text };
    },
  };
}

function loadCjsInternals() {
  const bundle = fs.readFileSync(cjsBundlePath, "utf8");
  const code = `${bundle}
module.exports.__settlexInternals = {
  calculateBounds: typeof calculateBounds !== "undefined" && calculateBounds,
  getDoubleClickMode: typeof getDoubleClickMode !== "undefined" && getDoubleClickMode,
};`;

  const sandbox = {
    cancelAnimationFrame: clearTimeout,
    clearTimeout,
    console,
    document: createFakeDocument(),
    module: { exports: {} },
    requestAnimationFrame: (callback) => setTimeout(callback, 0),
    require,
    setTimeout,
    window: {},
  };
  sandbox.exports = sandbox.module.exports;

  vm.runInNewContext(code, sandbox, { filename: cjsBundlePath });
  return sandbox.module.exports.__settlexInternals;
}

function createBoundsContext(props) {
  return {
    wrapperComponent: {
      offsetWidth: 1000,
      offsetHeight: 800,
    },
    contentComponent: {
      offsetWidth: 1000,
      offsetHeight: 800,
    },
    setup: {
      centerZoomedOut: false,
    },
    props,
  };
}

describe("patched react-zoom-pan-pinch behavior", () => {
  it("preserves Settlex pan room bounds for the packaged runtime", () => {
    const { calculateBounds } = loadCjsInternals();

    const props = {
      minPositionX: -500,
      maxPositionX: 500,
      minPositionY: -200,
      maxPositionY: 500,
    };

    expect(calculateBounds(createBoundsContext(props), 2)).toEqual({
      minPositionX: -1500,
      maxPositionX: 500,
      minPositionY: -1000,
      maxPositionY: 500,
    });

    expect(calculateBounds(createBoundsContext(props), 0.5)).toEqual({
      minPositionX: -250,
      maxPositionX: 750,
      minPositionY: 0,
      maxPositionY: 700,
    });
  });

  it("preserves Settlex double-click toggle semantics for the packaged runtime", () => {
    const { getDoubleClickMode } = loadCjsInternals();

    expect(getDoubleClickMode("zoomIn", 2, 1)).toBe("zoomIn");
    expect(getDoubleClickMode("zoomOut", 2, 1)).toBe("zoomOut");
    expect(getDoubleClickMode("reset", 2, 1)).toBe("reset");
    expect(getDoubleClickMode("toggle", 1, 1)).toBe("zoomIn");
    expect(getDoubleClickMode("toggle", 0.8, 1)).toBe("zoomIn");
    expect(getDoubleClickMode("toggle", 1.1, 1)).toBe("reset");
    expect(getDoubleClickMode("toggle", 1.00000000005, 1)).toBe("zoomIn");
  });

  it("keeps the same patch markers in the ESM bundle used by Next", () => {
    const esmBundle = fs.readFileSync(esmBundlePath, "utf8");

    expect(esmBundle).toContain("var SCALE_EPSILON = 1e-10;");
    expect(esmBundle).toContain("var extraMinX = props.minPositionX");
    expect(esmBundle).toContain("var extraMaxX = props.maxPositionX");
    expect(esmBundle).toContain("var extraMinY = props.minPositionY");
    expect(esmBundle).toContain("var extraMaxY = props.maxPositionY");
  });
});
