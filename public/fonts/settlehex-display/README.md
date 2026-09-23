# SettleHex Display — J Black v0.4

Approved custom partial display face from the "Explore SettleX wordmark redesign"
task (01a0c85b-261f-7ac0-9d61-a343f5676776). Copied without modification from
`wordmark-research/app-validation/SettleHexJStudy-Black.woff2`, 22 September 2026.
The original v0.3 e and existing metrics/outlines are retained; v0.4 adds w.

Use live font text for the wordmark, with its separately fitted letter spacing.
Do not apply that spacing to headings. Regular UI remains Outfit. This font only
has Black/900; do not synthesize other weights or italics.

Coverage is recorded in `app/ui/displayFont.js`. `DisplayText` falls back to the
UI face for the whole string if any character is missing. Approved examples:
SettleHex, Victory!, You win!, Your turn, Settings, Rematch. Do not assume support
for arbitrary names, numbers or localization. FontBakery in the source task:
74 pass, 2 fail (incomplete case pairs and OS/2 code-page flags), 48 skip, 3 info.
This is not a complete production alphabet or a claim of cross-browser QA.
