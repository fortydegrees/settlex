# Customize board art and game sounds

Start the local app with `pnpm dev`, then open `/catana/dev/effects` for an
isolated runner or `/catana/dev/sandbox` for the real board. These routes are
for development. No match server, live account or new package is needed for
these examples. Keep your change in its owning map and check the real preview.

## Replace one game cue

The shipped map is `app/catana/effects/soundThemes.js` (`DEFAULT_THEME`).
Place your own licensed clip under `public/sounds/`; reference it as
`/sounds/your-file.mp3`. Consult the
[Sound Design Guide](../agent/skills/catana-brand/SOUND_DESIGN_GUIDE.md)
for the current sound family and audition workflow.

For an application-specific variant, define a stable map outside the component
and pass it to the existing `GameEffects` call in `app/catana/GameScreen.js`:

```js
// At module scope; do not modify DEFAULT_THEME in place.
const mySounds = {
  "build:settlement": { src: "/sounds/my-settlement.mp3", volume: 0.6 },
};
// Add this prop at the existing <GameEffects ... /> call:
// soundOverrides={mySounds}
```

Use `/sounds/road.mp3` instead for a disposable experiment with an existing
clip. Remove the prop to restore defaults. Reload/remount the sandbox after an
edit, unlock audio with a click, and place the corresponding piece. Stable map
identity matters: changing the map recreates and unloads the audio manager.
This is a developer injection point, not a persisted sound-pack setting.
`GameEffects` also accepts `audioSettings={{ muted: true }}` for an embedding;
the normal GameScreen mute control uses Howler's global mute and stores
`catana:audioMuted`.

The same map works with a standalone audio manager used by a preview:

```js
const bus = createEffectBus();
const audio = createAudioManager({ bus, soundOverrides: mySounds });
// A user gesture must unlock playback; dispose the manager when leaving.
audio.unlock();
bus.emit({ type: "cue", payload: { name: "build:settlement" } });
// On teardown: audio.destroy();
```

Import `createAudioManager` from `app/catana/effects/AudioManager.js` and
`createEffectBus` from `app/catana/effects/EffectBus.js` when constructing a
standalone preview. The production board already owns both; reuse its bus.

### Partial-map contract

Overrides replace **whole cue entries**, not individual fields. Omitted cues
retain the selected base map, normally `DEFAULT_THEME`. `null` silences one cue;
unknown cue names do nothing until an emitter uses them. An explicitly present
`undefined` entry also suppresses that cue; omit the key to inherit it.
The older `theme` option on `createAudioManager` remains a **complete** base map;
it does not automatically gain omitted defaults.

To retain a cue's existing policy while changing its file, copy that entry:

```js
import { DEFAULT_THEME } from "./soundThemes"; // adjust to your module
const mySounds = {
  "turn:start": { ...DEFAULT_THEME["turn:start"], src: "/sounds/my-turn.mp3" },
  "timer:low": null,
};
```

Replacing an entry without copying `allowWhenHidden` loses that permission.
Unrecognized/missing entries are silent; a missing or undecodable **file** does
not fall back to the original recording. Verify URLs and codecs in the browser.
Keep different playback settings on distinct source URLs: Howls are cached by
source within a manager, so reusing a URL with conflicting format/base-volume
options is not an independent sound instance.

The existing effects lab has **Effect**, **Custom Sound**, **Audio Delay** and
**Clear Sound** controls. Its file chooser creates a local blob URL, overrides
the selected runner's listed cues, and revokes the URL on replacement/clear or
unmount; it does not save a production mapping. Piece Placement and Resource
Distribution support this audition. Dev Card Reveal does not. The audition's
extra delay is for exploration; put an approved timing change in the runner.

### Find the event and its timing

| Responsibility | Concrete owner |
| --- | --- |
| Authoritative gameplay event and effect payload | `app/catana/Game.js` and `game-core/`; inspect the move and effects-plugin emission |
| Consume bgio-effects events and translate to presentation events | `app/catana/effects/GameEffects.js`, e.g. `placePiece` → `build:place`, `roll` → dice cue + visual plan |
| Route semantic event to a runner | `app/catana/effects/registry.js` |
| Emit the cue at the visual moment | `placePiece.js`, `resourceDistribution.js`, `cardTransfer.js`, `devCardPlay.js` |
| Choose file, variants, volume and background permission | `soundThemes.js` |
| Unlock, mute policy, schedule playback, unload | `AudioManager.js`; global board mute is in `GameScreen.js` |

For settlement placement, follow the real `placePiece` event to `build:place`
and the placement runner's timeline callback emitting `build:settlement`.
For resource distribution, the `pop` label emits `resource:pop:start` and the
travel callback emits `resource:travel:start`. A map selects the sound; moving
that sound relative to the animation belongs in the runner. `cardTransfer.js`
also accepts a per-transfer `cueName` for a semantic variant.

Some cues come from UI state: `LowTimerCue.js` owns local clock warnings;
GameScreen owns the discard prompt; GameEffects owns turn/outcome/award cues.
Fresh-board `game:start` is armed by the successful lobby transition and consumed
once by `gameStartTransition.js`; refresh/reconnect/direct links stay silent.
Its actual playback completion releases the first local-turn cue after the
existing gap. Replacing the audio manager cancels the old playback and releases
that hold through the same gap; leaving the board cancels the pending turn cue.
Do not replace normal playback completion with a guessed timeout.

**Dice need a coordinated edit.** The `dice:roll` entry includes lead-in sources,
`durationMsBySrc`, playback-rate randomization, layer delays and
`timelineLeadMs`. `AudioManager.planCue()` feeds `buildDiceRollTimeline()` in
`diceRollTimeline.js`, and GameEffects sends the same plan to audio and visuals.
Changing only a filename while keeping old durations can desynchronize them.
Supply complete measured metadata for new recordings, or leave the dice entry
alone. Muting audio does not remove its visual timing plan.

Game sounds are scoped to a mounted board's bus/manager. Site-wide attention is
separate: `tabAttention.js` changes hidden-tab title/favicon; match alerts use
`matchAlerts/` and `public/match-alerts-sw.js` for browser notifications.
A future friend-request sound would need an explicit event owner, lifetime and
user preference; adding a cue key alone does not wire delivery. No new global
notification infrastructure is needed for these customization examples.

## Register a compatible board asset theme

`app/catana/theme/themes.js` owns `CATANA_THEMES` and path resolution. The current
IDs are `emoji` (default), `palette-b` and `classic`. Classic redirects retired
base tile/resource artwork to Emoji; it is not a separate complete historical
asset pack.

Add an entry **inside** the existing `CATANA_THEMES` object. This minimal working
example reuses existing files and changes only the ore tile:

```js
"my-board": {
  id: "my-board",
  label: "My board",
  assetBase: "/svgs",
  assetOverrides: Object.freeze({
    ...RETIRED_CLASSIC_ASSET_REDIRECTS,
    "tile_ore.svg": "/svgs/palette-themes/option-b/tile_ore.svg",
  }),
},
```

`RETIRED_CLASSIC_ASSET_REDIRECTS` is already local to that module; inherit it so
omitted retired base files resolve to existing art. For your own licensed art,
put files in `public/svgs/my-board/` and point overrides there. An alternative
`assetBase: "/svgs/my-board"` requires all filenames used by that theme to be
present or deliberately overridden; it is not an automatic per-file inheritance
mechanism.

Keep each replacement's existing SVG viewBox, orientation, visible bounds and
center. Current tile art uses `viewBox="0 0 346 400"`. Geometry, legal placement,
board/HUD anchors and animations are owned by Board/Node/Edge and the coordinate
helpers, not by SVG decoration. Do not change those for a recolor. Piece names
come from `theme/pieceAssets.js`, e.g. `pieces/settlement_red.svg`, with identity
colors and aliases owned by `theme/playerColors.js`. Preserve viewer/seat color
identity when replacing pieces, including hover/placement previews.

Other owners are intentionally separate: `theme/backgrounds.js` owns the table
background, and `app/ui/theme.cjs` plus `docs/agent/DESIGN_SYSTEM.md` own product
UI tokens. Registering board art does not change HUD typography, material recipes
or player colors. A few direct compatibility piece paths still use `/svgs`;
a new theme is not a universal reskin of every image on the site.

### Select and preview

GameScreen reads `catana:themeId` on mount, resolves unknown IDs to Emoji, and
writes the resolved ID back. Game settings displays the ID; there is currently
no interactive theme selector. `getThemeOptions()` exposes registry entries but
has no current picker consumer.

With the sandbox open on your local development origin, save the old value and
select the registered ID in browser developer tools, then reload:

```js
// Save the old value separately if you need to restore a prior preference.
localStorage.getItem("catana:themeId");
localStorage.setItem("catana:themeId", "my-board");
location.reload();
```

Check ore tiles, the underlay, icons and placed pieces; switch Viewer seat and
use Reset to exercise remount/perspective. Try a placement preset and its hover
preview when changing piece art. Restore the prior storage value (or remove the
key if it was absent), reload, and remove your experimental registry entry when
finished. No `?theme=` parameter or new switcher is needed for this workflow.

Fallback is specific to the consumer:

- Missing override key resolves to `assetBase/filename`, not to the default
  theme's same filename.
- `getBackgroundImageWithFallback()` layers themed and Classic CSS backgrounds,
  unless `disableBackgroundFallback` is true or both paths match. Emoji disables
  that fallback. CSS backgrounds are not a JavaScript load-error retry.
- `<img>` callers using `handleThemeImageError()` retry their supplied fallback
  once. A raw `getThemedSvgPath()` URL has no existence check or retry.
- Dedicated port-icon resolution and the Desert resource overlay currently have
  Emoji-ID-specific branches. A new ID uses the existing non-Emoji port behavior
  (resource icons, Classic Any icon) even if its override map includes port files.
  Extending that behavior would need a focused helper change and test.

## Verify the change you made

For audio, replay the actual runner in the effects lab and then the board
sandbox when anchors/perspective matter. Confirm a user gesture unlocks playback,
mute works, background permission is appropriate, and clear/reset/route change
leaves no delayed cue. The lab's file override is not a general live-board test.
For partial overrides, the Storybook story **Game State / Audio / Customization /
Override Reset And Cleanup** mounts real GameEffects and verifies replacement,
reset to defaults and unmount cleanup with a controlled Howler playback boundary.
**Reset During Opening Jingle** checks reset while playback is pending, later
turn hand-off, relevance checks and cancellation on unmount.

Relevant checks (run only the scope your change needs):

```sh
pnpm exec vitest run app/catana/__tests__/effects app/catana/__tests__/themeAssets.test.js
pnpm exec eslint app/catana/effects/AudioManager.js app/catana/effects/GameEffects.js
```

Existing assets in this repository were used for local technical experiments;
that does not establish redistribution permission. Supply your own licensed
files and retain their attribution. Unresolved repository asset provenance is
tracked separately from whether an override loads or a theme renders.
