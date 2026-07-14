import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  path.resolve(process.cwd(), "app/replays/PostgameGameBoard.js"),
  "utf8"
);
const gameScreenSource = fs.readFileSync(
  path.resolve(process.cwd(), "app/catana/GameScreen.js"),
  "utf8"
);
const matchPageSource = fs.readFileSync(
  path.resolve(
    process.cwd(),
    "app/catana/lobby/[matchID]/MatchPageClient.js"
  ),
  "utf8"
);

describe("PostgameGameBoard", () => {
  it("keeps one unkeyed game screen mounted across live and replay state", () => {
    expect(source.match(/h\(GameScreenWithEffects,/g)).toHaveLength(1);
    expect(source).not.toContain("key:");
    expect(source).not.toContain("window.location.assign");
    expect(source).not.toContain("?view=replay");
    expect(gameScreenSource).not.toContain("window.location.assign");
    expect(gameScreenSource).not.toContain("?view=replay");
    expect(gameScreenSource).toContain("bgioProps.onWatchReplay");
    expect(gameScreenSource).toContain("bgioProps.onReplayResultsOpen");
    expect(gameScreenSource).toContain("bgioProps.onReplayResultsClose");
  });

  it("keeps archived and live perspectives explicit", () => {
    expect(source).toContain("initialPerspectivePlayerID");
    expect(source).toContain("bgioProps.playerID");
  });

  it("keeps payload readiness scoped to the identity that produced it", () => {
    expect(source).toContain("identityKey: hookPayloadIdentityKey");
    expect(source).toContain("getReplayPayloadStatusForIdentity");
    expect(source).toContain("isReplayReadyForIdentity");
    expect(source).toContain("payloadIdentityKey,");
  });

  it("owns the boardgame.io live board slot", () => {
    expect(matchPageSource).toContain(
      'import { PostgameGameBoard } from "../../../replays/PostgameGameBoard"'
    );
    expect(matchPageSource).toContain("board: PostgameGameBoard");
    expect(matchPageSource).not.toContain("board: GameScreenWithEffects");
  });
});
