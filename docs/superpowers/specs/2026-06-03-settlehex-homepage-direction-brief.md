# Settlehex Homepage Direction Brief

Date: 2026-06-03
Scope: Homepage product purpose and UX hierarchy before visual design
Status: Approved direction brief

## Goal

Redesign the Settlehex homepage as a game-first title screen with beta/community proof-of-life.

The page should make a new visitor think:

- this game already looks polished enough to try,
- starting is quick,
- online 1v1 multiplayer is the main event,
- bot play is a real no-wait mode, not a consolation path,
- the project is alive without pretending it already has a mature community.

This brief is intentionally not a final visual design or implementation spec. It locks the product/UX contract so different visual directions can be explored without changing what the page is for.

## Primary User Journeys

1. New visitor lands on Settlehex.com and chooses `Play Online`.
2. New visitor wants to avoid waiting and chooses `Play vs Bot`.
3. Visitor wants a known opponent and chooses `Play a Friend`.
4. Curious visitor notices light beta/building-in-public material such as devlog, changelog, Discord, or bot-progress notes.
5. Returning visitor sees their current identity/account state without that control competing with the play actions.

## CTA Hierarchy

### Primary: Play Online

`Play Online` is the destination action. It should be visually dominant and communicate that Settlehex is an online 1v1 strategy game.

### Strong Secondary: Play vs Bot

`Play vs Bot` solves the empty-lobby/chicken-and-egg problem. It should feel immediate and appealing: practice, test the AI, start now.

The bot should not be framed as "no one is online, so settle for this." It should be framed as a legitimate mode and a product hook, especially if stronger AI becomes a differentiator.

### Tertiary: Play a Friend

`Play a Friend` remains visible and useful, but it should not compete equally with the two main entry paths unless a future product decision changes that balance.

## Account and Identity

Account and identity controls should live in the homepage shell, not in the main hero/action stack.

For logged-out or lightweight guest visitors, the homepage should show a compact guest identity affordance such as `Guest` or a randomized avatar/name pill. First play should stay low-friction: either create/use a lightweight guest identity automatically or ask for identity only at the moment it becomes necessary.

For logged-in visitors, the homepage should show the current avatar/name in a compact top-right identity control. Account/profile access should be available through that control, but it should not read as a fourth primary destination beside `Play Online`, `Play vs Bot`, and `Play a Friend`.

The identity surface should communicate continuity and polish while preserving the page's main job: starting a game quickly.

## Supporting Layer

The homepage may include a small layer for:

- beta status,
- changelog or release notes,
- Discord,
- devlog/blog posts,
- technical build-in-public topics such as balanced boards or bot training.

This layer must not be load-bearing. The homepage should still work if there are few blog posts, no public community, or no regular build-in-public cadence.

## Visual Direction

The strongest current direction is a table/board hero: use the real game board and existing Catana/Settlehex visual polish as emotional proof instead of explaining everything in copy.

The safer execution target is:

- board/table atmosphere as the hero visual,
- normal readable CTAs over or alongside it,
- compact beta/community proof-of-life,
- no full lobby dashboard on the landing page.

This keeps the "show, don't tell" advantage while reducing the risk that the homepage becomes busy, confusing, or too close to an actual in-game control surface.

## Non-Goals

- Do not make the first redesigned homepage depend on leaderboards.
- Do not depend on a large public community.
- Do not depend on a full blog/devlog library.
- Do not build a conventional long-form marketing page as the first experience.
- Do not make the page feel like an in-game dashboard or match-control surface.
- Do not add mature-product claims that the current beta cannot honestly support.

## Future Visual Exploration

Multiple visual treatments can still be explored. A candidate design should be judged by whether it preserves this brief:

- `Play Online` is the primary path.
- `Play vs Bot` is a strong no-wait path.
- `Play a Friend` is available but tertiary.
- Account/identity appears as a compact shell control, not a hero CTA.
- Real game polish is visible quickly.
- Beta/community/devlog material shows life without pretending maturity.
- The page feels like the entrance to Settlehex, not a generic product page.
