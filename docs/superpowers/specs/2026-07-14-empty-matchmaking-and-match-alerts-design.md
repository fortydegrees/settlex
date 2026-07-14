# Empty Matchmaking And Match Alerts Design

Date: 2026-07-14
Scope: Public duel matchmaking, opt-in Web Push match alerts, hidden-tab attention, and postgame alert state.
Status: Approved design, pending implementation plan

## Objective

Make an empty public matchmaking queue feel intentional and useful during the
beta without pulling players out of the queue too early.

A player should be able to keep waiting for the fastest possible match, opt in
to persistent alerts for future human seekers, or eventually play Puffer. Match
alerts are an account preference, not a background queue and not a promise that
a seat has been reserved. Tapping an alert always leads to a second join
confirmation.

The system should be honest about beta-sized matchmaking liquidity, conservative
about notification permission, and resistant to duplicate or abandoned-table
alerts.

## Product Principles

- Staying in the live queue is the fastest path and remains the primary action.
- Enabling match alerts never cancels or leaves the current search.
- Puffer is a later escape hatch, not the first response to a quiet queue.
- Browser notification permission is requested only after an explicit player
  action.
- Match alerts persist until the player disables them, except while paused for
  a human game.
- An alert means that another player is seeking a duel; it does not reserve the
  table or join automatically.
- Every alert must refer to a distinct, server-verified open human table.
- Notification delivery must never block or fail matchmaking.
- Hidden-tab title, favicon, and sound cues complement Web Push but do not
  replace it.

## V1 Scope

V1 includes:

- staged rescue content in the existing online-search modal;
- an account-level Match alerts preference;
- browser Push API subscription management and a root-scoped service worker;
- server-verified alerts for newly created, still-open public human duels;
- a confirmation step after an alert is opened;
- stale-table handling when somebody else joins first;
- automatic alert pausing during a fully joined human game;
- a checked-by-default postgame option to resume previously enabled alerts;
- static hidden-tab attention for a found match and the player's turn;
- event deduplication, endpoint cleanup, rate limiting, and focused tests.

V1 does not include:

- a fixed 30-minute availability window;
- a recipient-wide cooldown such as one alert every 30 minutes;
- automatic joining or seat reservations from notifications;
- email, SMS, or native mobile-app notifications;
- a persistent server-side queue for players who have left the live search;
- animated or flashing tab titles;
- a general notification inbox;
- skill-based matchmaking or queue-region selection.

## Empty-search Experience

The existing search begins immediately and continues until it finds a match or
the player cancels. There is no terminal timeout.

### First 12 seconds

Keep the current compact searching treatment:

- elapsed timer;
- searching state;
- Cancel remains visible.

Do not mention Puffer or low liquidity immediately. A normal match should still
feel normal.

### At 12 seconds

Expand the search treatment with honest beta context and rescue actions. The
message should explain that online play is still in beta and another player may
take a little while to arrive.

The action hierarchy is:

1. **Keep waiting** — primary; the player remains in the current table/search.
2. **Enable match alerts** or the state-aware equivalent — secondary; the
   player remains in the current table/search.
3. **Cancel** — always available.

Keep waiting may return the modal to its compact searching presentation, but it
does not restart the timer or create a new table.

### At 30 seconds

Reveal **Play Puffer** as a low-emphasis tertiary action. It should not visually
compete with Keep waiting.

Choosing Puffer cancels or closes the public waiting table before starting the
bot game. If match alerts are enabled, they remain enabled during the Puffer
game so the player is still reachable for a future human duel.

### State-aware match-alert copy

The search modal derives its alert treatment from browser capability,
permission, subscription, account preference, and pause state:

- **Supported, permission not decided:** show **Enable match alerts**. Clicking
  it requests permission and, on success, subscribes and enables the account
  preference without leaving the queue.
- **Permission granted, alerts off:** show **Turn match alerts on** without
  requesting permission again.
- **Alerts enabled and active:** show a quiet `🔔 Match alerts on` status and
  the explanation: `Keep waiting for the fastest match, or cancel and we'll let
  you know when another player starts looking.`
- **Alerts paused by a human game:** show **Turn match alerts back on** only
  after that game is over. Do not resume alerts while the account is in the
  active human match.
- **Permission denied:** do not repeatedly invoke the browser prompt. Show a
  concise explanation that notifications are blocked and can be changed in
  browser settings.
- **Unsupported browser:** omit the enable action or replace it with a quiet
  unavailable note. The live search and Puffer paths remain unaffected.
- **iOS browser without install support:** explain the Home Screen requirement
  only after the player asks to enable alerts; do not surface it as generic
  homepage copy.

The account menu also exposes a persistent **Match alerts** on/off control so a
player can change the preference without entering a search. The search modal is
the primary discovery surface; the account control is the reliable management
surface.

## Match-alert Meaning

Match alerts notify an opted-in player that a distinct public human seeker has
opened a duel and is still waiting. They do not represent an assigned opponent,
a background queue position, or a reserved seat.

The alert copy is:

- title: `⚔️ <display name> is looking for a duel`;
- body: `Tap to see if the table is still open.`;
- fallback title when no safe public name is available:
  `⚔️ Someone is looking for a duel`.

Each notification uses a tag derived from the match/event ID so retries cannot
create two browser notifications for the same table. Distinct verified seekers
may generate distinct alerts. There is deliberately no blanket per-recipient
30-minute cooldown.

The original seeker and any account already seated at the target table are not
recipients. Only accounts with an enabled, unpaused preference and at least one
valid subscription are eligible.

Web Push subscriptions use `userVisibleOnly: true`, so every delivered push
produces an operating-system notification even if SettleHex happens to be
visible. V1 does not add presence heartbeats or a second realtime channel just
to suppress that occasional redundant presentation. A player already in the
live queue will normally be matched directly when the newcomer joins their
existing table, so no new seeker announcement is created for that case.

Clicking a notification focuses an existing SettleHex page when possible and
shows the in-app join prompt there. It opens a new page only when no SettleHex
client exists; the alert path never intentionally creates a second live game
tab.

## Announcement Lifecycle

An alert is eligible only when Play Online genuinely creates a new public duel
because no joinable public duel exists.

The flow is:

1. Play Online asks the server for an existing joinable public duel.
2. If one exists, the player joins it immediately. No seeker alert is created.
3. If none exists, the normal flow creates a public human duel and seats the
   seeker.
4. The client waits two seconds, then requests an announcement for that match.
5. The server re-fetches the authoritative match and verifies all eligibility
   conditions.
6. The server atomically claims the one announcement event for that match and
   fans it out to eligible subscriptions.

At announcement time the server must verify that:

- the requester is authenticated as the original seated seeker;
- the match is a public duel, not a friend challenge or bot game;
- the table is still active and joinable;
- exactly one human participant is seated;
- the opponent seat is still empty;
- the seeker has not cancelled or left;
- the match has not already claimed an announcement event;
- the request passes account-level anti-abuse limits.

The two-second grace period lives in the client rather than a server job. It
prevents the common create-then-immediately-cancel case without delaying the
match-creation response or introducing a worker. If the client disappears
before requesting the announcement, the safe result is no alert.

The announcement endpoint is idempotent. A unique event record keyed by match
ID supplies at-most-once fanout for each table, including client retries and
concurrent requests. A process failure after claiming an event may produce a
missed alert, but must never produce repeated fanout.

Account-level rate limiting prevents a player from repeatedly creating and
cancelling tables to notify everybody. The initial limit should allow one
claimed announcement per seeker per minute and no more than ten per hour. This
limit applies to abusive seeker activity, not to how many legitimate distinct
alerts a recipient may receive.

## Join Confirmation And Races

Clicking a browser notification focuses an existing SettleHex client when one
is available or opens SettleHex when it is not. The service worker passes the
match-alert payload to the application, which displays a confirmation rather
than joining automatically.

The confirmation re-fetches the table before presenting the join action.
Typical copy is:

> Zak is still looking for a duel. Join the table?

Actions are **Join duel** and **Not now**.

If the player is currently playing Puffer, the confirmation must make the
consequence explicit before changing routes:

> Leave your game with Puffer and join Zak's duel?

The existing join operation remains server-authoritative and atomic. A table
may fill between confirmation and submission. If it does, show:

> That table has already filled. Match alerts are still on.

Offer **Play online** to begin a normal search and a dismiss action. Do not
silently create a replacement table, disable alerts, or treat the race as an
error requiring browser-permission changes.

If the table was cancelled, expired, or otherwise became unjoinable, use the
same friendly stale treatment.

## Alert Preference Lifecycle

Match alerts are persistent consent attached to the current guest or saved game
account.

The preference has three meaningful states:

- **off** — the player manually disabled alerts or has never enabled them;
- **active** — alerts are enabled and eligible for delivery;
- **paused for human game** — alerts were enabled, but delivery is suspended
  for an active or just-finished human game.

### Human games

When a public or private human match becomes fully seated, the server pauses
match alerts for each human account whose preference was active. Pausing is
account-wide and persists if the browser closes. It happens only after the
human match successfully fills; a lone player waiting at a table remains
active.

Bot games do not pause match alerts. This includes a Puffer game started from
the empty-search rescue.

### Postgame resume

For a player whose alerts were enabled and then paused by the human match, the
postgame surface shows a checked-by-default option:

`Turn match alerts back on`

When the player chooses Return to lobby with the option checked, clear the
pause before navigating. If it is unchecked, alerts remain paused until the
player turns them back on manually. A player who never enabled alerts does not
see this option.

Closing the postgame surface, navigating to a replay, or closing the browser
does not implicitly resume alerts. This avoids unexpected notification pings
after a game.

### Manual changes and sign-out

- Turning alerts on explicitly clears a completed-game pause.
- Turning alerts off disables delivery account-wide and clears pause metadata.
- Notification permission remains browser-managed; disabling the SettleHex
  preference does not attempt to reset browser permission.
- Signing out removes the current browser subscription's association with the
  departing account so it cannot continue receiving that account's alerts.
- Other devices belonging to the same account keep their subscription records,
  subject to the account-level preference.

## Hidden-tab Attention

When SettleHex is open but not visible, use one static bell language for both
events that need immediate attention:

- `🔔 Match found · Settlehex`
- `🔔 Your turn · Settlehex`

Both states use the same bell/attention favicon. The title and favicon do not
flash, alternate, or animate. They change only while `document.hidden` is true
and restore the route's previous title and favicon immediately on
`visibilitychange` or equivalent return-to-page handling.

A small shared attention controller should own title/favicon capture,
prioritization, and restoration so matchmaking and turn logic do not manipulate
document metadata independently. Match found takes priority if events overlap.

The existing local game-start and turn sounds remain separate cues. They may
play in a hidden but still-live tab after the player has unlocked audio and if
the browser permits it. They are best-effort only: muted audio, autoplay policy,
page suspension, or a closed page can prevent playback. Web Push is the only v1
mechanism intended to reach a player after SettleHex is no longer an active
page.

## Data Model

Use Settlex-owned tables rather than adding feature state directly to Better
Auth internals.

### Match-alert preferences

One row per game account:

- account ID primary/foreign key;
- enabled boolean;
- nullable pause reason, initially `human_game` only;
- nullable paused match ID so resume can be rejected while that human game is
  still active;
- paused-at timestamp;
- created-at and updated-at timestamps.

Absence of a row is equivalent to off. A pause never changes the player's
underlying enabled consent.

### Push subscriptions

One row per browser Push API subscription:

- internal ID;
- account ID;
- unique endpoint;
- `p256dh` key;
- `auth` secret;
- created-at and updated-at/last-seen timestamps.

Subscription writes upsert by endpoint. Account deletion cascades to
subscriptions and preferences. Endpoint rotation replaces or upserts the
browser's current subscription instead of accumulating duplicates.

### Match-alert events

One row per claimed seeker announcement:

- match ID as a unique key;
- seeker account ID;
- claimed/announced timestamp;
- aggregate attempted, delivered, expired, and failed counts, each defaulting
  to zero, for operations visibility.

This record is the server-side deduplication boundary. It is not a user-visible
notification inbox.

## Server And Client Boundaries

### Server responsibilities

- persist account preferences and browser subscriptions;
- expose the VAPID public key to authenticated clients;
- validate and claim announcement events;
- derive public notification copy from authoritative participant data;
- select eligible recipients and exclude the seeker;
- send Web Push messages without failing matchmaking;
- remove subscriptions rejected as expired or gone;
- pause accounts when a human game becomes fully seated;
- verify the recorded paused match has ended before accepting a resume;
- atomically validate/join a table after confirmation;
- emit structured delivery and cleanup logs.

### Client responsibilities

- detect Push API, service-worker, and permission capability;
- request permission only from an explicit enable action;
- register the root-scoped service worker and create the Push subscription;
- send subscription/preference changes to the server;
- preserve the live queue while enabling alerts;
- request the delayed announcement only after creating a new waiting table;
- display the join confirmation or stale-table state;
- manage hidden-tab title, favicon, and best-effort audio attention;
- present and apply the postgame resume option.

### Service worker responsibilities

- display validated push payloads;
- deduplicate the same match with a match-derived notification tag;
- focus an existing SettleHex window or open the alert deep link;
- pass the alert payload to a live client so it can show confirmation without
  automatically abandoning a Puffer game;
- avoid containing matchmaking rules or deciding whether a match is joinable.

## HTTP Surface

Keep the public API small and authenticate every account-specific operation.
The implementation may follow existing route-handler injection patterns, with
these logical operations:

- `GET /api/match-alerts` — preference state and VAPID public key;
- `PATCH /api/match-alerts` — enable, disable, or resume the preference;
- `POST /api/match-alerts/subscriptions` — upsert the current browser
  subscription;
- `DELETE /api/match-alerts/subscriptions` — detach the current endpoint, used
  for sign-out or explicit browser unsubscribe;
- `POST /api/match-alerts/announce` — request the delayed, server-verified
  announcement for a newly created table;
- existing match lookup and join operations — re-used for alert confirmation
  and the final atomic join.

Internal game-server code pauses alerts when a human match fills; clients do
not call a public pause endpoint.

## Web Push Configuration

Add the small production `web-push` dependency and configure:

- VAPID public key;
- VAPID private key;
- VAPID subject/contact value.

The public key may be returned to authenticated clients. The private key must
remain server-only and must not enter browser bundles, logs, committed env
files, or API responses.

There is no background queue, cron task, or separate worker in v1. The
announcement request performs bounded fanout after the event is claimed. Push
delivery failures are recorded and swallowed from the matchmaking caller's
perspective.

## Failure Handling

- Permission denied: leave the search untouched and show browser-settings
  guidance only in response to the player's enable attempt.
- Service-worker registration failure: leave alerts off, retain the live
  search, and offer a retryable message.
- Push subscription failure: leave alerts off unless another valid
  subscription already makes the account active; never cancel matchmaking.
- Announcement request failure: the seeker continues waiting normally. Do not
  retry indefinitely or expose a fatal matchmaking error.
- Individual push failure: continue other sends. Remove endpoints reported as
  expired or gone; log transient failures without deleting the subscription.
- Duplicate announcement: return an idempotent success/no-op.
- Invalid or forged match ID: return a non-success response without revealing
  private-match data.
- Stale notification click: show the friendly filled/cancelled state and keep
  alerts enabled.
- Postgame resume failure: do not pretend alerts resumed. Keep the player on
  the current surface long enough to retry or continue with a clear warning.
- Missing display name: use the generic notification title.

## Testing And Verification

### Automated tests

Add focused tests for:

- preference create, enable, disable, pause, and resume transitions;
- subscription upsert, sign-out detachment, and expired-endpoint cleanup;
- recipient selection, including seeker exclusion and paused/off accounts;
- announcement rejection for existing-match joins, bot games, friend/private
  tables, cancelled tables, filled tables, and non-owner requests;
- the two-second client announcement request only after a genuinely new table;
- match-level deduplication and seeker anti-abuse limits;
- delivery failures not changing the matchmaking result;
- automatic pause only when a human match becomes fully seated;
- Puffer games leaving alert state active;
- state-aware 12-second rescue and 30-second Puffer reveal;
- enabling alerts without leaving or recreating the current search;
- notification-click confirmation, atomic join races, and stale handling;
- notification clicks focusing an existing client without opening a second
  live-game tab;
- postgame checkbox visibility/default and resume behavior;
- shared hidden-tab attention priority and exact title/favicon restoration.

Use injected route dependencies and fake push senders so unit/API tests never
contact an external push service.

### Manual verification

Use two browser profiles and, where available, a second device:

1. Enable alerts from an active search and verify the table/search is unchanged.
2. Cancel the search while leaving alerts active.
3. From the other profile, create a public duel and keep it open past two
   seconds.
4. Verify one alert arrives with the seeker's display name.
5. Tap it and verify confirmation appears before any join.
6. Join and verify both players enter the human game and their alerts pause.
7. Finish or force-finish the game and verify the checked postgame resume path.
8. Repeat with a create-then-cancel inside two seconds and verify no alert.
9. Race two recipients for one table and verify the loser sees a friendly stale
   state with alerts still active.
10. Start Puffer with alerts enabled, receive an alert, and verify leaving the
    bot game requires confirmation.
11. Hide the tab and verify static bell titles, shared favicon, sound behavior,
    and exact restoration for both Match found and Your turn.
12. Keep SettleHex visible, trigger another seeker, click the resulting system
    notification, and verify the existing page is focused with an in-app prompt
    rather than opening a second live-game tab.

Before production deployment, verify VAPID configuration in the target
environment and exercise notification permission on at least one Chromium
browser plus the supported Safari/iOS install path.

## Acceptance Criteria

- A search may continue indefinitely and always retains Cancel.
- At 12 seconds, the player sees honest beta context, Keep waiting, and the
  correct match-alert state/action.
- At 30 seconds, Play Puffer appears as a tertiary escape hatch.
- Enabling alerts never leaves, cancels, or recreates the current search.
- Match alerts remain active until manually disabled or paused by a fully
  joined human game; there is no arbitrary 30-minute expiry.
- Joining or playing Puffer does not pause match alerts.
- Joining a fully seated human game pauses previously enabled alerts.
- Eligible recipients receive at most one push for each distinct verified new
  waiting table, and only when no existing table was available to that seeker.
- A table cancelled or filled during the two-second grace period produces no
  seeker alert.
- Clicking an alert never joins automatically and handles filled-table races
  without disabling alerts.
- Every delivered Web Push has a user-visible system notification; clicking it
  reuses an existing SettleHex page when one is available.
- Previously enabled alerts can be restored from postgame through a
  checked-by-default option.
- Hidden tabs use static `🔔 Match found · Settlehex` and
  `🔔 Your turn · Settlehex` titles with the same attention favicon and restore
  normal metadata on return.
- Permission, subscription, or delivery failures do not prevent a player from
  continuing to wait, cancelling, or playing Puffer.
- Rapid create/cancel behavior cannot fan out unbounded notifications.
