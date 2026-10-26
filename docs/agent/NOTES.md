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
