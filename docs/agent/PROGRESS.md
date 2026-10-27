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

2026-10-26: compact replay opponent rows now take their content width, capped
by the available space, so a single opponent centres instead of anchoring left.
Verified the real replay at 750px, 375px, 390px, 430px and 1056px, including phone
hand scrolling. This is a layout correction, not full integration qualification.


2026-10-27: repaired revealed opponent resource rails in the everyday checkout.
All five counters now use the local cockpit's shared stacked resource component,
with larger desktop artwork/type when the HUD has room. Revealed bars use actual
responsive layout instead of scaling a fixed-width scrolling hand. Extra known or
unavailable cards stay in a separate bounded keyboard-scrollable bay; they do not
push resource counters out of view. Hidden hands retain card-back stacks.
Rendered checks: real imported replay at 375×667, 390×844, 430×932, 750×959,
1056×1408 and 1440×900; empty/full resources, known development card, reveal off/on.
Storybook RevealedOpponentResources passed at phone and desktop viewport widths
(double-digit counts and unknown resources/cards); OpponentInventory passed;
DenseResources and WaitingReadOnly passed at their intended phone viewport.
UI policy and focused lint passed. Local change only; no push/deployment.
