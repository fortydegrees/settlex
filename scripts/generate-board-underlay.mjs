import fs from "node:fs";
import path from "node:path";
import {
  STANDARD_BOARD_UNDERLAY,
} from "../app/catana/utils/boardUnderlayGeometry.mjs";

const OUTPUT_PATH = path.resolve(
  process.cwd(),
  "public/svgs/board_underlay_standard.svg"
);

function buildSvg() {
  const [minX, minY, width, height] = STANDARD_BOARD_UNDERLAY.viewBox;
  const paths = STANDARD_BOARD_UNDERLAY.layers
    .map(
      ({ fill, path: d }) =>
        `  <path d="${d}" fill="${fill}" vector-effect="non-scaling-stroke" />`
    )
    .join("\n");

  return [
    '<svg xmlns="http://www.w3.org/2000/svg"',
    `  viewBox="${minX} ${minY} ${width} ${height}"`,
    '  fill="none"',
    '  role="presentation"',
    '  aria-hidden="true">',
    paths,
    "</svg>",
    "",
  ].join("\n");
}

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, buildSvg(), "utf8");
console.log(`Wrote ${path.relative(process.cwd(), OUTPUT_PATH)}`);
