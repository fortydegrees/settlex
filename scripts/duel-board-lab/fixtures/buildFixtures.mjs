import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateCandidate } from "../generators/generateCandidate.mjs";
import { canonicalBoardHash, hashBoard } from "../analysis/symmetry.mjs";

const descriptors = [
  ["scarce-but-fair", "scarce resource with multiple independent routes", "official-spiral", 1503],
  ["wheat-monopoly", "wheat access concentrated around one pick", "official-spiral", 223],
  ["dominant-settlement", "large quality cliff after the best node", "freeform-random", 6414],
  ["varied-openings", "many competitive opening locations", "official-spiral", 109],
  ["first-pick-sensitive", "early pick removes disproportionate resource access", "freeform-random", 7036],
  ["second-pick-sensitive", "diagnostic snake audit favours consecutive P2 picks", "freeform-random", 4300]
];

const directory = dirname(fileURLToPath(import.meta.url));
await mkdir(directory, { recursive: true });
for (const [label, expectation, family, seed] of descriptors) {
  const candidate = generateCandidate({ family, seed });
  const fixture = {
    label,
    expectation,
    family,
    generatorVersion: candidate.generatorVersion,
    seed,
    boardHash: hashBoard(candidate.tiles),
    canonicalSymmetryHash: canonicalBoardHash(candidate.tiles),
    tiles: candidate.tiles
  };
  await writeFile(join(directory, `${label}.json`), `${JSON.stringify(fixture, null, 2)}\n`);
}
