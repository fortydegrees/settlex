# Player Effective Colors Design

Date: 2026-04-02
Scope: Catana 1v1 in-game player colour resolution for pieces and avatar boxes
Status: Approved for implementation

## Goal

Ensure each player has a unique in-game colour so piece colours can never clash.

For the current slice:
- scope is 1v1 behaviour first,
- each player starts with the colour they picked in the "Pick a username" flow,
- duplicate picked colours are resolved deterministically,
- the avatar box background always matches the actual piece colour used in-game.

In scope for this slice:
- piece colours,
- avatar box background colours,
- in-game player colour metadata that should match the active seat colour, such as log/chat/player highlight data built in `GameScreen`.
- scoreboard/postgame colour accents when they are intended to reflect the active in-game seat colour.

Out of scope for this slice:
- lobby picker UI changes,
- server-persisted effective colour assignment,
- asset creation for missing piece SVG colours.

## Context

- The username modal in `app/catana/lobby/LobbyPageClient.js` stores a preferred colour in local storage and submits it as `matchData[].data.color`.
- `app/catana/GameScreen.js` already reads that preferred colour into `colorMap`.
- `app/catana/components/PlayerAvatarStats.js` currently prefers the chosen colour for the avatar background.
- The board in `app/catana/Board.js` still renders roads, settlements, cities, previews, and placement effects from `buildPlayerViewMap`, which currently assigns colours by seat order in `app/catana/utils/playerView.js`.

This means the game already has a split source of truth:
- avatar box can use chosen colour,
- pieces still use seat-order colour,
- duplicate chosen colours are not resolved anywhere.

## Product Rules

Each player has one effective in-game colour.

That effective colour must:
- be unique within the match,
- drive the piece SVG colour,
- drive the avatar box background colour,
- drive any other in-game player colour accent that is meant to reflect the active seat colour.

Resolution rules:
- if a player's chosen colour is valid and not yet used, keep it,
- otherwise assign the first unused colour from the fallback order,
- fallback order matches the lobby picker order: `red`, `blue`, `green`, `orange`, `purple`, `pink`, `cyan`, `amber`.

Seat order for conflict resolution is the exact order of `core.players`.
For this slice, that array is the authoritative source of player ordering, and conflict resolution must always iterate it from index `0` upward.

Examples:
- `blue` + `red` stays `blue` + `red`
- `blue` + `blue` becomes `blue` + `red`
- `red` + `red` becomes `red` + `blue`
- `green` + `green` becomes `green` + `red`

## Recommended Architecture

Introduce a shared "effective colour" resolver in UI code and make it the only source of truth for in-game player colours.

Recommended shape:
- input:
  - ordered player ids from `core.players`,
  - preferred colours from match metadata,
- output:
  - `effectiveColorByPlayerId`,
  - optionally enriched player views that already include the resolved colour.

Recommended helper location:
- `app/catana/utils/playerColorsInGame.js`
  or another nearby UI utility file if naming should stay closer to current patterns.

The helper should be pure and deterministic.

## Data Flow

1. Lobby / join flow keeps sending the player's preferred colour exactly as it does today.
2. Match UI reads `matchData[].data.color`.
3. The new resolver combines:
   - seat order from `core.players`,
   - preferred colours from `matchData`,
   - fallback palette order.
4. `GameScreen` derives one effective colour map per render.
5. That same map is passed through every in-game consumer.

Consumers to switch to effective colour:
- player board pieces in `app/catana/Board.js`,
- placement previews in `app/catana/Board.js`,
- placement effects in `app/catana/GameScreen.js`,
- avatar backgrounds in `app/catana/components/PlayerAvatarStats.js`,
- log/chat/player display colour metadata built in `app/catana/GameScreen.js`,
- scoreboard/postgame winner colour accents if they are meant to reflect the seat colour.

## Component Behavior

### Board Pieces

Roads, settlements, cities, and all placement previews should use the effective in-game colour, not seat-order fallback colour.

This applies to:
- already placed roads and buildings,
- settlement/city preview nodes,
- road preview edges,
- piece placement effects that ask for a player colour by player id.

### Avatar Box

The avatar box background in `PlayerAvatarStats` should use only the effective in-game colour.

After this change there should no longer be a separate "chosen avatar colour vs actual piece colour" split inside the match UI.

### Text / Feed Colour Accents

Any in-game colour accent that currently reflects `player.data.color` should move to the resolved effective colour instead, so chat/log/player highlights stay consistent with the actual pieces on the board.

This keeps the whole match readable when duplicate preferences are resolved.

## Error Handling

If a player has no preferred colour, or the preferred colour is not in the supported palette:
- treat it as missing,
- assign the first unused fallback colour.

The supported palette is the exact set of colour ids from `PLAYER_COLOR_OPTIONS`:
- `red`
- `blue`
- `green`
- `orange`
- `purple`
- `pink`
- `cyan`
- `amber`

Validation should use those exact ids. Any other value is invalid and should be treated as missing.

If more players exist than supported colours:
- keep current behaviour simple by falling back to the ordered palette in sequence and only guarantee uniqueness while unused colours remain.

The current implementation focus is 1v1, so palette exhaustion is not a practical blocker for this slice.

## Testing

Add focused tests around the resolver and the main integration seams.

Resolver tests:
- keeps distinct chosen colours unchanged,
- resolves duplicate chosen colours deterministically by seat order,
- falls back when colour is missing,
- falls back when colour is invalid.

Integration tests:
- board/player view wiring uses resolved effective colours for piece rendering inputs,
- avatar background uses the same resolved colour as the board,
- log/chat player colour metadata uses resolved colours instead of raw preferred colours.

## Constraints

This design assumes piece SVG assets will exist for every lobby picker colour:
- road,
- settlement,
- city.

Runtime expectation before all assets exist:
- do not remap an effective colour to a different visual colour just because an asset is missing,
- keep the resolver logic correct against the full palette,
- rely on the existing asset lookup/fallback behavior only,
- treat missing piece assets for not-yet-created colours as a separate asset dependency, not as a reason to change colour resolution rules.

## Acceptance Criteria

- Two players in the same match never share the same effective in-game colour in 1v1.
- When player preferences do not clash, each player keeps their chosen colour in-game.
- When player preferences clash, the later conflicting seat gets the first unused fallback colour.
- Roads, settlements, cities, and placement previews use the resolved effective colour.
- The avatar box background always matches the resolved effective piece colour.
- In-game player colour accents use the resolved effective colour, not the raw chosen preference.
