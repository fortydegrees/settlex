import { act } from "react";
import { createRoot } from "react-dom/client";
import { EffectsBoardWrapper } from "bgio-effects/react";
import { Howl } from "howler";
import { expect, waitFor, within } from "@storybook/test";
import { GameEffects } from "../../../_features/game/effects/GameEffects";
import { createEffectBus } from "../../../_features/game/effects/EffectBus";
import { markGameStartTransition } from "../../../_features/game/effects/gameStartTransition";

const Effects = EffectsBoardWrapper(GameEffects);
const meta = {
  title: "Game State/Audio/Customization",
  render: () => <>
    <div data-testid="audio-root" />
    <output data-testid="audio-result">Waiting for audio assertions</output>
  </>,
};
export default meta;

export const OverrideResetAndCleanup = {
  play: async ({ canvasElement }) => {
    const status = within(canvasElement).getByTestId("audio-result");
    const root = createRoot(within(canvasElement).getByTestId("audio-root"));
    const bus = createEffectBus();
    const plays = [];
    const unloaded = [];
    const oldAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
    const originalPlay = Howl.prototype.play;
    const originalUnload = Howl.prototype.unload;
    // Real React, bgio-effects wrapper, GameEffects, bus and AudioManager.
    // Observe only the external Howler playback/unload boundary.
    Howl.prototype.play = function () { plays.push(this._src); return 1; };
    Howl.prototype.unload = function () { unloaded.push(this._src); return originalUnload.call(this); };
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    let mounted = true;
    const render = soundOverrides => act(async () => root.render(
      <Effects plugins={{}} effectsBus={bus} soundOverrides={soundOverrides} />
    ));
    const unlock = () => window.dispatchEvent(new Event("pointerdown"));
    const cue = name => bus.emit({ type: "cue", payload: { name } });
    try {
      status.textContent = "Running audio assertions";
      await render({ "build:settlement": { src: "/sounds/road.mp3" } });
      unlock();
      cue("build:settlement");
      cue("build:city");
      expect(plays).toEqual(["/sounds/road.mp3", "/sounds/settle.mp3"]);
      await render();
      expect(unloaded).toEqual(["/sounds/road.mp3", "/sounds/settle.mp3"]);
      unlock();
      cue("build:settlement");
      expect(plays).toEqual(["/sounds/road.mp3", "/sounds/settle.mp3", "/sounds/settle.mp3"]);
      await act(async () => root.unmount());
      mounted = false;
      cue("build:settlement");
      expect(plays).toHaveLength(3);
      expect(unloaded).toEqual(["/sounds/road.mp3", "/sounds/settle.mp3", "/sounds/settle.mp3"]);
      status.textContent = "All audio assertions passed";
    } catch (error) {
      status.textContent = `Audio assertion failed: ${error.message}`;
      throw error;
    } finally {
      if (mounted) await act(async () => root.unmount());
      Howl.prototype.play = originalPlay;
      Howl.prototype.unload = originalUnload;
      globalThis.IS_REACT_ACT_ENVIRONMENT = oldAct;
    }
  },
};

// Playback deliberately never ends: a manager replacement must cancel the
// opening hold, while leaving the ordinary completion-driven gap unchanged.
export const ResetDuringOpeningJingle = {
  play: async ({ canvasElement }) => {
    const status = within(canvasElement).getByTestId("audio-result");
    const root = createRoot(within(canvasElement).getByTestId("audio-root"));
    const bus = createEffectBus();
    const cues = [];
    const originalPlay = Howl.prototype.play;
    const oldAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
    const storageKey = "catana:game-start-transition";
    const oldMarker = sessionStorage.getItem(storageKey);
    const overrides = { "game:start": { src: "/sounds/road.mp3", allowWhenHidden: true } };
    const stopObserving = bus.on("cue", event => cues.push(event.payload.name));
    Howl.prototype.play = () => 1;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const render = (soundOverrides, currentPlayerId = "0") => act(async () => root.render(
      <Effects plugins={{}} effectsBus={bus} soundOverrides={soundOverrides}
        gameStartMatchID="audio-reset-story" currentPlayerId={currentPlayerId}
        playerID="0" phase="placement" />
    ));
    const start = async () => {
      markGameStartTransition({ matchID: "audio-reset-story" });
      await render(overrides);
      expect(cues.at(-1)).toBe("game:start");
    };
    const clear = () => act(async () => root.render(null));
    try {
      status.textContent = "Running audio assertions";
      await start();
      expect(cues).toEqual(["game:start"]);
      await render();
      window.dispatchEvent(new Event("pointerdown"));
      await waitFor(() => expect(cues).toEqual(["game:start", "turn:start"]));
      // A later hand-off still emits exactly one local-turn notification.
      await render(undefined, "1");
      await render();
      expect(cues).toEqual(["game:start", "turn:start", "turn:end", "turn:start"]);
      await clear();

      cues.length = 0;
      await start();
      await render(undefined, "1");
      await new Promise(resolve => setTimeout(resolve, 600));
      expect(cues).toEqual(["game:start", "turn:end"]);
      await clear();

      cues.length = 0;
      await start();
      await render();
      await clear();
      await new Promise(resolve => setTimeout(resolve, 600));
      expect(cues).toEqual(["game:start"]);
      status.textContent = "All audio assertions passed";
    } catch (error) {
      status.textContent = `Audio assertion failed: ${error.message}`;
      throw error;
    } finally {
      await act(async () => root.unmount());
      stopObserving();
      Howl.prototype.play = originalPlay;
      globalThis.IS_REACT_ACT_ENVIRONMENT = oldAct;
      if (oldMarker == null) sessionStorage.removeItem(storageKey);
      else sessionStorage.setItem(storageKey, oldMarker);
    }
  },
};
