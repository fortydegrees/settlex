import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  createGameOverModalActionHandlers,
  getMatchAlertResumeControlState,
  runGameOverLobbyAction,
  shouldResumeMatchAlertsForAction,
} from "../components/gameOverAlertLifecycle.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const componentPath = path.resolve(
  __dirname,
  "..",
  "components",
  "GameOverModal.js"
);

describe("GameOverModal", () => {
  it("derives the highlighted player from the explicit winner flag instead of score rank", () => {
    const contents = fs.readFileSync(componentPath, "utf8");

    expect(contents).toContain("scoreboard.find((row) => row.isWinner)");
    expect(contents).not.toContain("const winner = scoreboard[0];");
  });

  it("includes core CTA labels", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("Replay");
    expect(contents).toContain("Match summary");
    expect(contents).toContain("Return to Lobby");
    expect(contents).not.toContain("Rematch");
  });

  it("disables replay only while preparing and offers a retry after an error", () => {
    const contents = fs.readFileSync(componentPath, "utf8");

    expect(contents).toContain('replayStatus = "ready"');
    expect(contents).toContain('replayStatus === "loading" || matchAlertResume.pending');
    expect(contents).toContain('replayStatus === "error" ? "Retry replay"');
    expect(contents).toContain('replayStatus === "loading"');
    expect(contents).toContain('"Preparing replay..."');
  });

  it("lets the parent own winner confetti state so remounts do not replay it", () => {
    const contents = fs.readFileSync(componentPath, "utf8");

    expect(contents).toContain("shouldFireConfetti");
    expect(contents).toContain("onConfettiFired");
    expect(contents).not.toContain("const confettiFired = useRef(false);");
  });

  it("resolves canonical player color ids before using them for winner swatches", () => {
    const contents = fs.readFileSync(componentPath, "utf8");

    expect(contents).toContain("getPlayerNameHex");
  });

  it("shows a checked-by-default match alert control only when offered", () => {
    const hidden = getMatchAlertResumeControlState({
      showMatchAlertResume: false,
    });
    const offered = getMatchAlertResumeControlState({
      showMatchAlertResume: true,
    });

    expect(hidden.visible).toBe(false);
    expect(offered).toMatchObject({
      visible: true,
      checked: true,
      label: "Turn match alerts back on",
    });
  });

  it("awaits alert resume before returning to the lobby", async () => {
    const order = [];

    const result = await runGameOverLobbyAction({
      shouldResume: true,
      resumeMatchAlerts: async () => {
        order.push("resume:start");
        await Promise.resolve();
        order.push("resume:end");
        return { updated: true };
      },
      onLobby: () => order.push("lobby"),
    });

    expect(order).toEqual(["resume:start", "resume:end", "lobby"]);
    expect(result).toEqual({ returnedToLobby: true, resumed: true });
  });

  it("returns directly to the lobby without resuming when unchecked", async () => {
    const resumeMatchAlerts = vi.fn();
    const onLobby = vi.fn();

    const result = await runGameOverLobbyAction({
      shouldResume: false,
      resumeMatchAlerts,
      onLobby,
    });

    expect(resumeMatchAlerts).not.toHaveBeenCalled();
    expect(onLobby).toHaveBeenCalledOnce();
    expect(result).toEqual({ returnedToLobby: true, resumed: false });
  });

  it("keeps the postgame surface open when resume fails", async () => {
    const onLobby = vi.fn();

    const result = await runGameOverLobbyAction({
      shouldResume: true,
      resumeMatchAlerts: vi.fn().mockResolvedValue({
        updated: false,
        reason: "request_failed",
      }),
      onLobby,
    });

    expect(onLobby).not.toHaveBeenCalled();
    expect(result.returnedToLobby).toBe(false);
    expect(result.error).toMatch(/match alerts/i);
  });

  it("never resumes implicitly from close, replay, postgame, rematch, or continue", async () => {
    const resumeMatchAlerts = vi.fn().mockResolvedValue({ updated: true });
    const handlers = createGameOverModalActionHandlers({
      onClose: vi.fn(),
      onWatchReplay: vi.fn(),
      onViewPostgame: vi.fn(),
      onRematch: vi.fn(),
      onContinueWithoutMatchAlerts: vi.fn(),
      onLobby: () =>
        runGameOverLobbyAction({
          shouldResume: true,
          resumeMatchAlerts,
          onLobby: vi.fn(),
        }),
    });

    handlers.close();
    handlers.watchReplay();
    handlers.viewPostgame();
    handlers.rematch();
    handlers.continueWithoutMatchAlerts();
    expect(resumeMatchAlerts).not.toHaveBeenCalled();

    await handlers.lobby();
    expect(resumeMatchAlerts).toHaveBeenCalledOnce();
  });

  it("renders explicit retry and continue actions after a resume error", () => {
    const state = getMatchAlertResumeControlState({
      showMatchAlertResume: true,
      matchAlertResumeChecked: true,
      matchAlertResumeError: "Conflict while resuming alerts.",
    });

    expect(state.error).toBe("Conflict while resuming alerts.");
    expect(state.actions).toEqual(["Retry", "Continue without alerts"]);
  });

  it("keeps Retry as an explicit resume attempt even if the checkbox changes", () => {
    expect(
      shouldResumeMatchAlertsForAction({
        action: "retry",
        eligible: true,
        checked: false,
      })
    ).toBe(true);
    expect(
      shouldResumeMatchAlertsForAction({
        action: "return",
        eligible: true,
        checked: false,
      })
    ).toBe(false);
    expect(
      shouldResumeMatchAlertsForAction({
        action: "close",
        eligible: true,
        checked: true,
      })
    ).toBe(false);
  });

  it("blocks every competing modal action while resume is pending", async () => {
    const callbacks = {
      onClose: vi.fn(),
      onWatchReplay: vi.fn(),
      onViewPostgame: vi.fn(),
      onRematch: vi.fn(),
      onLobby: vi.fn(),
      onRetryMatchAlertResume: vi.fn(),
      onContinueWithoutMatchAlerts: vi.fn(),
    };
    const control = getMatchAlertResumeControlState({
      showMatchAlertResume: false,
      matchAlertResumePending: true,
    });
    const handlers = createGameOverModalActionHandlers({
      ...callbacks,
      pending: control.pending,
    });

    await Promise.all([
      handlers.close(),
      handlers.watchReplay(),
      handlers.viewPostgame(),
      handlers.rematch(),
      handlers.lobby(),
      handlers.retryMatchAlertResume(),
      handlers.continueWithoutMatchAlerts(),
    ]);

    Object.values(callbacks).forEach((callback) => {
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
