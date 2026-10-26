import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NOT_FOUND"); },
  redirect: destination => { throw new Error(`REDIRECT:${destination}`); },
}));
import ReplayLibrary from "../catana/dev/replay-import/page.js";
import ReplayGame from "../catana/dev/replay-import/[gameId]/page.js";
import DecisionReview from "../catana/dev/decision-review/page.js";
import ReviewBoard from "../catana/dev/decision-review/board/page.js";
afterEach(() => vi.unstubAllEnvs());
const pages = [
  [ReplayLibrary, "/dev/replay-import"],
  [ReplayGame, "/dev/replay-import/game%20one"],
  [DecisionReview, "/dev/decision-review"],
  [ReviewBoard, "/dev/decision-review/board"],
];
describe("generic development URL compatibility", () => {
  it.each(pages)("redirects the legacy adapter with query values in development (%s)", async (page, destination) => {
    vi.stubEnv("NODE_ENV", "development");
    await expect(page({ params: Promise.resolve({ gameId: "game one" }), searchParams: Promise.resolve({ case: "case-03", tag: ["one", "two"] }) }))
      .rejects.toThrow(`REDIRECT:${destination}?case=case-03&tag=one&tag=two`);
  });
  it.each(pages)("hides the legacy adapter before reading route values outside development (%s)", async page => {
    vi.stubEnv("NODE_ENV", "production");
    const forbidden = { then: () => { throw new Error("Route values must not be read"); } };
    await expect(page({ params: forbidden, searchParams: forbidden })).rejects.toThrow("NOT_FOUND");
  });
});
