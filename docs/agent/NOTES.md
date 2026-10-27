# Current implementation notes

Shared motion follows DESIGN_SYSTEM.md and the production stories listed in
UI_CATALOG.md. ResizeRegion retains dimensions only; Disclosure/Dialog callers
must remove private contents immediately. LazyDialog keeps the lifecycle owner
mounted through exit and cancelled imports; popup-owned form state resets on a
completed close.

Quiet replay/history feeds disable tail-following. Read-only chat has no composer.
Replay score history stays complete while the cursor/legend tracks selection.
Turn headings stay separate from selectable events and copying text does not seek.

Opponent inventory motion uses the intrinsic hidden-stack resize owner. Revealed
replay hands keep a fixed scroll viewport; card removal changes live contents
immediately without requiring the enclosing player box to grow.

Development tool configuration: SETTLEHEX_LOCAL_REPLAY_DIR,
SETTLEHEX_LOCAL_REPLAY_ADAPTER and SETTLEHEX_DECISION_REVIEW_DIR. Only absent canonical
settings fall back to SETTLEX names. Inputs and adapter implementations remain
external; no recordings or review packages are bundled. The decision-review
settlex-decision-review-v1 storage namespace and existing schema names are stable.

2026-10-26: revealed opponent resource counters use the existing compact artwork
inside a 288px viewport on desktop and tablet. Below 640px, the phone viewport
remains 160px with intentional horizontal overflow for keyboard or touch
scrolling. Replay's compact HUD, cockpit and bottom tray apply below 1024px;
the desktop panel and its reserved opponent lane start together at 1024px.
Live-game layout keeps its existing 640px breakpoint. Private hand contents still
unmount immediately when reveal is disabled.

Compact replay opponent rows use intrinsic width with an available-width cap.
Keep centring for content that fits and start-accessible scrolling for overflow;
a full-width row with default flex alignment left-aligns even a single opponent.


2026-10-27 resource-rail correction supersedes the 26 October scrolling-resource
contract above: all five revealed counters must be visible without horizontal
scrolling. Desktop local/revealed opponent counters share CardIcon (count beside
icon); phone counters share StackedResourceCount (count below icon).
OpponentPlayerBox owns the available-width container; its scoped
layout adapts avatar/awards/resource sizes without scaling the entire HUD.
Only the additional-card bay scrolls. Preserve immediate identity removal when
reveal is disabled, and verify both the full HUD and the dense-hand story when
changing these widths. The extra-card bay is kept beside resources because a
second row obscured the board on short phones during verification.

2026-10-27 alignment follow-up: replay opponent and local HUDs use the same screen
centre. Revealed desktop panels keep the local 80px height. At desktop widths
below 1440px, replay controls start below the top HUD to avoid hiding counters
and scroll within the remaining viewport height when the chart is expanded;
the compact replay breakpoint remains 1024px. Additional cards can change panel
width, but must not move its centre or scroll resource counters out of view.

## 27 October — full replay transcript and consolidation audit

Restored the full recorded transcript independently of the selected board frame;
kept perspective masking, active event keys and incomplete-record result gating.
Tests now protect the desired full-log contract rather than the integrated prefix
implementation. Red/green: three failing cases then nine passing props tests;
19 focused props/notation/log-row tests pass, and the complete app runner passes.
Rendered desktop and 390x844 phone: future-row seeking and rewind work; desktop
rewind to Event3 retains247 rows including final win, and current settlement row
is highlighted. Board perspective with reveal off hides stolen resource identity.
Known separate existing issue: final win may map to a hidden trailing turn marker
and have no highlighted row. Local Next dev indicator can cover the phone log
button; this is not production qualification.

The broader source inventory and behavioural coverage ledger are private at
.superpowers/sdd/consolidation-behaviour-audit-20261027/. They explicitly distinguish
reviewed retirements, exact source matches, behavioural differences and unverified
flows. This is ongoing consolidation assurance, not a repository-wide all-clear.
