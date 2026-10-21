# Notation test fixtures

`settlex-setup-roll.expected.json` freezes the independently implemented prototype's
output for the deterministic `notation-maintained-core` setup-and-roll scenario.
The maintained test compares both the record and every source/action checkpoint.
It does not compute expected output with the maintained exporter under test.

The oracle was captured once during reconciliation, before importing the maintained
exporter. The original implementation and exact source hashes remain in private
preservation; no research runtime is required to run this test.

The complete-game fixture lives in `docs/notation/examples/settlex-complete.han.json`.
It is a locally automated three-player Settlex game, containing only the documented
HAN envelope, public board and resolved game outcomes. It contains no imported
third-party match, account identity, credential, chat, RNG seed or future deck.
The maintained server test driver generates a fresh deterministic game through the
real boardgame.io reducer; it does not replay private captured matches.

HAN action spellings are credited to Hexil in `docs/notation/FORMAT.md`.
