# SettleHex Beta Copy Strategy

Date: 2026-07-29

## Goal

Give a new visitor an immediate, honest reason to try the current SettleHex
beta. Prioritize product clarity over a permanent brand slogan.

## Positioning

SettleHex is free online Catan built for quick 1v1 games. Its strongest current
differentiator is that the duel boards are deliberately balanced. Players can
play a friend, find an online opponent, or challenge Puffer.

The copy should sell what exists today. Four-player support can broaden the
positioning after it ships; it should not make the current 1v1 strength vague.

## Message hierarchy

### Primary descriptor

> Free online Catan for quick 1v1 games.

This is the first-read explanation of what SettleHex is and why somebody might
choose it.

### Supporting proof

> Balanced boards. Play a friend, find a match, or challenge Puffer.

This explains the current product difference and the available ways to play.

### Secondary proof

- Free to play
- Open source
- In beta and improving

These points can build trust in About, repository, release, or supporting
metadata contexts. They should not displace the player benefit in the main
homepage descriptor.

## Voice

SettleHex copy should be:

- plain before clever;
- warm, upbeat, and confident without chest-beating;
- concise and action-led;
- specific about real modes and features;
- playful through small touches such as the Puffer name, not through forced
  jokes or conquest language.

Avoid generic trailer slogans, abstract strategy language, unsupported
superlatives, and tidy staccato phrases that could describe almost any game.
In particular, retire `Build. Trade. Conquer.` and do not use `#1`, `best`,
`fastest`, or `fairest` without evidence.

Joy should primarily come from the board, motion, sound, colour, and friendly
interface language. The copy does not need to call the game `joyful`.

## Surface roles

### Homepage

Keep the title-screen composition game-first. Use the primary descriptor as the
short line beneath the SettleHex wordmark. The visible play actions already
demonstrate the friend, matchmaking, and Puffer choices, so the supporting proof
does not need to become a marketing paragraph.

### Search and social metadata

Use literal category language. The title and description should communicate
free online Catan, quick 1v1 play, balanced boards, and the three play paths
within normal metadata length constraints.

### Social card

Replace `Build. Trade. Conquer.` with the primary descriptor or a
layout-preserving close variant. Use the supporting proof only if it remains
legible at preview size. Do not add unsupported rankings or claims.

### Product UI

Keep controls and status messages direct: `Find match`, `Play a friend`, and
`Play Puffer` are stronger than promotional alternatives. This strategy does
not require rewriting clear functional UI copy for personality alone.

### Open-source and beta messaging

Move open-source language to an About/repository link, release disclosure, or
other quiet supporting surface. Beta language should set expectations where it
is operationally useful, such as matchmaking wait states, rather than leading
the product pitch.

## Future four-player update

When four-player play is genuinely available, broaden the primary descriptor
to:

> Free online Catan for quick games with friends.

Keep balanced boards attached specifically to the 1v1 mode rather than implying
that every future mode uses the same board-balancing system.

## Trademark boundary

This document defines product copy, not legal clearance. `Catan` should be used
descriptively and SettleHex should never imply official affiliation,
endorsement, or licensing. Prominent production use of the CATAN mark remains
an explicit brand/legal risk decision separate from this copy design.

## Implementation and verification

The first implementation pass should inventory the current repeated positioning
copy, then update only the homepage descriptor, root metadata, and social card.
Functional game copy is out of scope unless the inventory exposes a direct
contradiction.

Verification should include:

- a source inventory showing the old positioning lines are gone from public
  surfaces;
- desktop and mobile homepage inspection;
- an actual rendered social-card image inspected at preview size;
- focused metadata assertions and lint;
- no exact-copy tests for presentation-only homepage text unless the string is
  itself a metadata contract.

No dependency, game-rule, matchmaking, or layout changes are part of this copy
pass.
