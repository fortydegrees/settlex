import { describe, expect, it } from "vitest";
import { buildResourceDistributionDemo } from "../../dev/effects/resourceDistributionLabUtils";
import { createSeededRandom } from "../../utils/seededRandom";

describe("resourceDistributionLabUtils", () => {
  it("builds deterministic demo cards", () => {
    const random = createSeededRandom(1);
    const cards = buildResourceDistributionDemo({ count: 3, random });
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveProperty("coordinate");
    expect(cards[0]).toHaveProperty("playerID");
    expect(cards[0]).toHaveProperty("resource");
  });
});
