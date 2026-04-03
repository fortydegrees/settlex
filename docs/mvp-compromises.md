# MVP Compromises

This file records deliberate "good enough to ship" decisions that are acceptable for the current MVP but should be revisited if the product area grows.

## 2026-04-03: Idle / AFK detection uses fully auto-resolved turns

- Feature:
  - Server-authoritative idle / AFK grace flow for Catana.
- MVP choice:
  - Detect idleness only when a human player's normal gameplay turn resolves entirely through server timeout moves, and trigger idle grace after `2` consecutive strikes.
- Why:
  - It reuses the current timer / auto-move system and avoids introducing client heartbeat or browser-activity tracking for the first version.
- Known limitation:
  - This is participation-based, not true activity-presence detection.
  - A player who clicks once per turn is never idle, while a player who watches passively without making moves can still be flagged after repeated auto-resolved turns.
- Future hardening:
  - Add richer client activity or heartbeat signals, consider wall-clock inactivity alongside turn-level auto-resolution, and revisit the policy once multiplayer AFK behavior is designed.
- Related spec:
  - `docs/superpowers/specs/2026-04-03-idle-afk-grace-design.md`

## 2026-04-02: Global reconnect banner uses weak validation

- Feature:
  - Global reconnect banner for returning to the user's latest Catana match.
- MVP choice:
  - Use a local `catana:last-active-match` record plus the existing lobby `GET /games/catan/:matchID` endpoint to decide whether to show the banner.
- Why:
  - It reuses the current browser-stored seat credentials and avoids introducing a new browser-session system or server reconnect index.
- Known limitation:
  - The existing lobby endpoint confirms that a match still exists, but it does not authoritatively confirm that the saved seat is unfinished and reconnectable.
  - This means the banner can be stale in edge cases.
- Future hardening:
  - Add a small server endpoint that validates reconnect eligibility for a saved `matchID + playerID`, or later add server-owned session tracking if reconnect recovery becomes a larger product surface.
- Related spec:
  - `docs/superpowers/specs/2026-04-02-global-reconnect-banner-design.md`
