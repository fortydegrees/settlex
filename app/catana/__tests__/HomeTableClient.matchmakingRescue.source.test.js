import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readHome = () =>
  readFileSync(
    resolve(process.cwd(), "app/catana/home/HomeTableClient.js"),
    "utf8"
  );

describe("HomeTableClient matchmaking rescue", () => {
  it("keeps the 0-11 second wait compact and expands rescue controls at 12 seconds", () => {
    const source = readHome();

    expect(source).toContain("getMatchmakingRescueStage(searchElapsedSeconds)");
    expect(source).toContain('rescueStage !== "waiting"');
  });

  it("keeps waiting primary and does not restart or recreate the queue", () => {
    const source = readHome();
    const modalSource = source.slice(
      source.indexOf("function SearchingModal"),
      source.indexOf("function HomeErrorBanner")
    );

    expect(modalSource).toContain("Keep waiting");
    expect(modalSource).toMatch(/variant="primary"[\s\S]*Keep waiting/);
    expect(modalSource).toContain("setRescueExpanded(false)");
    expect(modalSource).not.toContain("playOnline");
    expect(modalSource).not.toContain("/api/matches/create");
    expect(modalSource).toContain("{searchState ? (");
    expect(modalSource).toContain(
      "disabled={isMatchFound || isPufferTransitionPending}"
    );
    expect(modalSource).toContain(
      '{isMatchFound ? "Loading board..." : "Cancel"}'
    );
  });

  it("reveals a quiet Play Puffer action only in the 30-second stage", () => {
    const source = readHome();
    const modalSource = source.slice(
      source.indexOf("function SearchingModal"),
      source.indexOf("function HomeErrorBanner")
    );

    expect(modalSource).toContain('rescueStage === "puffer"');
    expect(modalSource).toContain("Play Puffer");
    expect(modalSource).toContain("onPlayPuffer");
    expect(modalSource).toMatch(/variant="ghost"[\s\S]*Play Puffer/);
  });

  it("consumes playOnline once through router replacement after account readiness", () => {
    const source = readHome();
    const queryEffectSource = source.slice(
      source.indexOf("handledPlayOnlineQueryRef"),
      source.indexOf("const handleSelectMode")
    );

    expect(source).toContain("const router = useRouter()");
    expect(queryEffectSource).toContain("lobby.accountReady");
    expect(queryEffectSource).toContain('searchParams.get("playOnline") === "1"');
    expect(queryEffectSource).toContain('searchParams.delete("playOnline")');
    expect(queryEffectSource).toContain("router.replace(");
    expect(queryEffectSource).toContain("lobby.actions.playOnline()");
  });

  it("locks repeated Puffer clicks while the leave transition is pending", () => {
    const source = readHome();
    const modalSource = source.slice(
      source.indexOf("function SearchingModal"),
      source.indexOf("function HomeErrorBanner")
    );

    expect(modalSource).toContain("isPufferTransitionPending");
    expect(modalSource).toContain("disabled={isPufferTransitionPending}");
  });

  it("keeps a blocking Puffer-start overlay after the public search is left", () => {
    const source = readHome();
    const modalSource = source.slice(
      source.indexOf("function SearchingModal"),
      source.indexOf("function HomeErrorBanner")
    );

    expect(modalSource).toContain(
      "if (!searchState && !isPufferTransitionPending) return null"
    );
    expect(modalSource).toContain('"Starting Puffer"');
    expect(modalSource).toContain('"Setting up a bot duel..."');
  });
});
