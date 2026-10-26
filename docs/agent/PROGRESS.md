# Current integration progress

2026-10-26: curated maintained product motion/feed/replay changes into the cleaned
feature owners, retaining source commit attribution. Shared UI stays in app/ui;
game text and replay/runtime models retain independent library ownership.

Generic replay-import and staged decision-review tools live under /dev with
development/loopback/same-origin API guards and external inputs/adapters. Legacy
URLs redirect only in development. Canonical environment settings use absent-only
legacy fallback; saved response formats/keys remain compatible.

Focused behavioral checks and UI policy are recorded in the task receipt.
Integrated browser/motion/reduced-motion checks and broad verification are pending
at this checkpoint. This is a local candidate; no publication or deployment.

OpponentInventory pilot now verifies the intrinsic hidden-stack resize owner and
the bounded revealed replay viewport separately. Parent rendered checks passed
at desktop1440x900 in normal and reduced motion; production geometry is unchanged.

2026-10-26: corrected revealed replay hands so all five resource counters fit on
desktop and tablet. Replay now uses the existing compact HUD and bottom tray
below 1024px, matching the desktop side lane's breakpoint and preventing the
panel from covering the opponent hand. Rendered checks cover 750px, the
1023/1024px boundary, 1056px and 1440px. The 390px phone hand retains horizontal
scrolling, including keyboard access without seeking the replay; masking still
removes revealed identities immediately. These changes are local verification,
not publication or deployment.
