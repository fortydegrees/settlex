# Game Log + UI Panel Design

## Goal
Add a scrollable, left-side game log UI panel that shows a durable, server-authoritative history of game events using human-friendly text (player display names) and resource icons. Log data must be public-safe (no secret info exposed).

## Non-Goals (for v1)
- Private/per-player log entries.
- Full replay/import pipeline.
- Markdown or HTML rendering.

## Core Approach
- Store a public-only log in `G.gameLog` with a monotonic `G.gameLogSeq`.
- Append entries in **server-authoritative moves** (app/catana/Moves.js) **after successful apply**.
- Use structured payloads (type + data), not raw strings.
- Use a single template/formatter file for all UI copy.

## Data Model
Entry shape:
```
{
  id: number,           // G.gameLogSeq++
  type: string,         // e.g. "roll", "build:road", "discard"
  actorId: string,      // player ID or "system"
  data: object,         // public-safe payload
  turn: number,         // ctx.turn
  phase: string,        // ctx.phase
  forced?: boolean      // true when server auto-resolves
}
```

Examples (public-safe):
- Roll: `{type:"roll", actorId:"0", data:{dice:[3,4], total:7}}`
- Build road: `{type:"build:road", actorId:"1", data:{edgeId}}`
- Discard: `{type:"discard", actorId:"2", data:{resources:{ore:2,wheat:2}}, forced:true}`
- Dev buy: `{type:"dev:buy", actorId:"1", data:{}}`
- Robber steal: `{type:"robber:steal", actorId:"0", data:{victimId:"2"}}`
- Forced: `{type:"forced:discardSelection", actorId:"system", data:{playerId:"1"}}`

## Redaction Rules
- Never log secret info.
- Dev card buys never include card type.
- Robber steals never include resource type.
- Resource gains (from rolls / placements) are OK to log in v1 (public info), as requested.

## Logging Locations (Moves.js)
Append entries after success in:
- Placement: placeSettlement, placeRoad, autoPlaceSettlement, autoPlaceRoad
- Main: rollDice, discardResources, moveRobber, maritimeTrade, buyDevCard, placeCity, endTurn
- Dev cards: playDevCardStart, confirmDevCardPlay, cancelDevCardPlay, placeRoadFromDevCard, autoResolveDevCard
- Auto/timeouts: autoRoll, autoEndTurn, autoDiscard, autoMoveRobber

Auto/timeouts:
- Prepend a "system" entry explaining forced action.
- Mark the actual action entry with `forced: true`.

## Text + Token Templates (Single Source)
- `app/catana/utils/gameText.js` holds:
  - `STATUS_TEXT` (for status UI)
  - `formatLogEntry(entry, nameMap)` returning **tokens**

Token model:
```
{ kind: "text", text: "rolled" }
{ kind: "player", id: "0", name: "Bren" }
{ kind: "resource", resource: "Wheat", count: 2 }
{ kind: "divider" }
```

The UI renders tokens to strings/icons. This enables:
- Resource SVG icons instead of words.
- Divider entries instead of "ended turn" text.
- Centralized text updates without touching Moves.js.

## UI Panel
- New component `GameLogPanel` under `app/catana/components/`.
- Fixed left, full height minus margin.
- Scrollable, `data-allow-interaction="true"`, `select-text`.
- Style: semi-transparent white, subtle blur, thin border to match page.

## Display Names
- Use `bgioProps.matchData` to map player ID -> name.
- Fallback `Player {id}` when missing.

## Testing
- Unit test for log append helper (id/turn/phase stamping).
- Add 1–2 move tests:
  - dev buy log is redacted
  - autoDiscard emits forced entry + discard entry

## Future Extension
- Optional per-player private log in secret state.
- Export/replay pipeline using `gameLog` entries.
- Optional localization using token templates.
