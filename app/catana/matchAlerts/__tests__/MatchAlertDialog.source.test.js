import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (relativePath) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("MatchAlertDialog", () => {
  it("uses the shared dialog and button for a secondary join confirmation", () => {
    const source = readSource("app/catana/matchAlerts/MatchAlertDialog.js");

    expect(source).toContain('from "../../ui/Dialog"');
    expect(source).toContain('from "../../ui/Button"');
    expect(source).toContain("is looking for a duel");
    expect(source).toContain("Join duel");
    expect(source).toContain("Not now");
  });

  it("warns before leaving Puffer and disables Join while its POST is pending", () => {
    const source = readSource("app/catana/matchAlerts/MatchAlertDialog.js");

    expect(source).toContain("Leave your Puffer game and join");
    expect(source).toContain('state === "joining"');
    expect(source).toContain("disabled={isJoining}");
  });

  it("re-checks immediately before the confirmed join and uses existing seat storage", () => {
    const dialog = readSource("app/catana/matchAlerts/MatchAlertDialog.js");
    const transaction = readSource("app/catana/matchAlerts/matchAlertJoin.js");
    const recheckIndex = transaction.indexOf("await resolveAlertMatch");
    const joinIndex = transaction.indexOf('fetchImpl("/api/matches/join"');

    expect(recheckIndex).toBeGreaterThan(-1);
    expect(joinIndex).toBeGreaterThan(recheckIndex);
    expect(dialog).toContain("await joinAlertMatch");
    expect(transaction).toContain('participantType: "human"');
    expect(transaction).toContain("getCredentialsStorageKey");
    expect(transaction).toContain("writeLastActiveMatch");
    expect(transaction).toContain('fetchImpl("/api/matches/leave"');
  });

  it("keeps a raced join in a friendly stale state", () => {
    const dialog = readSource("app/catana/matchAlerts/MatchAlertDialog.js");
    const transaction = readSource("app/catana/matchAlerts/matchAlertJoin.js");

    expect(transaction).toContain("response.status === 409");
    expect(dialog).toContain("That table has already filled");
    expect(dialog).toContain("Match alerts are still on");
    expect(dialog).toContain("Keep looking");
    expect(dialog).toContain('window.location.assign("/?playOnline=1")');
  });

  it("does not strand a successful leave or join on local storage failure", () => {
    const source = readSource("app/catana/matchAlerts/matchAlertJoin.js");

    expect(source).toMatch(
      /try \{\s*storage\?\.removeItem\?\.\(credentialKey\)/
    );
    expect(source).toMatch(
      /try \{\s*storage\?\.setItem\?\.\([\s\S]*?writeLastActiveMatch/
    );
  });
});

describe("match-alert click wiring", () => {
  it("opens one prompt from a deep link or worker message without autojoining", () => {
    const source = readSource("app/catana/matchAlerts/MatchAlertProvider.js");

    expect(source).toContain('searchParams.get("matchAlert")');
    expect(source).toContain('searchParams.delete("matchAlert")');
    expect(source).toContain("window.history.replaceState");
    expect(source).toContain('type !== "match-alert-click"');
    expect(source).toContain("openMatchAlert(matchID)");
    expect(source).toContain("<MatchAlertDialog");
    expect(source).not.toContain("/api/matches/join");
  });

  it("raises the static bell cue when an open tab receives a match push", () => {
    const source = readSource("app/catana/matchAlerts/MatchAlertProvider.js");

    expect(source).toContain('type === "match-alert-received"');
    expect(source).toContain('tabAttention.request("player-looking")');
  });

  it("does not replace a prompt while its confirmed join is pending", () => {
    const provider = readSource("app/catana/matchAlerts/MatchAlertProvider.js");
    const dialog = readSource("app/catana/matchAlerts/MatchAlertDialog.js");

    expect(provider).toContain("alertJoinPendingRef");
    expect(provider).toContain("if (alertJoinPendingRef.current) return");
    expect(dialog).toContain("onJoiningChange(true)");
    expect(dialog).toContain("onJoiningChange(false)");
  });

  it("registers current human or bot game context without credentials", () => {
    const source = readSource("app/catana/GameScreen.js");
    const registrationIndex = source.indexOf("return registerCurrentGame");
    const registration = source.slice(registrationIndex - 420, registrationIndex + 220);

    expect(source).toContain("registerCurrentGame");
    expect(source).toContain('opponentType: hasBotOpponent ? "bot" : "human"');
    expect(source).not.toContain("registerCurrentGame({\n      credentials");
    expect(registration).toContain("isGameOver");
    expect(registration).toContain("!bgioProps.credentials");
    expect(registration).toContain("playerID == null");
  });

  it("lets Keep looking enter the homepage's ordinary online play action", () => {
    const source = readSource("app/catana/home/HomeTableClient.js");

    expect(source).toContain('searchParams.get("playOnline") === "1"');
    expect(source).toContain('searchParams.delete("playOnline")');
    expect(source).toContain("lobby.actions.playOnline()");
  });
});
