import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readHome = () =>
  readFileSync(
    resolve(process.cwd(), "app/catana/home/HomeTableClient.js"),
    "utf8"
  );

describe("HomeTableClient matchmaking rescue", () => {
  it("keeps the 0-11 second wait compact and expands honest beta copy at 12 seconds", () => {
    const source = readHome();

    expect(source).toContain("getMatchmakingRescueStage(searchElapsedSeconds)");
    expect(source).toContain('rescueStage !== "waiting"');
    expect(source).toContain(
      "SettleHex is still in beta, so it can take a little while to find another"
    );
    expect(source).toContain(
      "player. You can keep your place here, or turn on Match alerts and come back"
    );
    expect(source).toContain("when someone is looking.");
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
    expect(modalSource).toContain(
      "const canCancel = Boolean(searchState) && !isMatchFound"
    );
  });

  it("renders inline provider-owned Match alerts state without leaving search", () => {
    const source = readHome();
    const modalSource = source.slice(
      source.indexOf("function SearchingModal"),
      source.indexOf("function HomeErrorBanner")
    );
    const controlSource = source.slice(
      source.indexOf("function MatchAlertControl"),
      source.indexOf("function SystemAccountMenu")
    );

    expect(source).toContain('import { useMatchAlerts } from "../matchAlerts/useMatchAlerts.js"');
    expect(modalSource).toContain("Match alerts");
    expect(modalSource).toContain("<MatchAlertControl matchAlerts={matchAlerts}");
    expect(controlSource).toContain("matchAlerts.display");
    expect(source).toContain("matchAlerts.enable()");
    expect(modalSource).not.toContain("cancelSearch");
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

  it("adds the same compact Match alerts control to the account menu", () => {
    const source = readHome();
    const accountMenuSource = source.slice(
      source.indexOf("function SystemAccountMenu"),
      source.indexOf("function SystemTopChrome")
    );

    expect(accountMenuSource).toContain(
      '<MatchAlertControl matchAlerts={matchAlerts} surface="menu" />'
    );
    expect(source).toContain("function MatchAlertControl");
    expect(source).toContain("handleMatchAlertAction(matchAlerts)");
    expect(source).toContain("matchAlerts.error");
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
