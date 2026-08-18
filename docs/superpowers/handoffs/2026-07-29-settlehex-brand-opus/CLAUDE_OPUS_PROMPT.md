# Claude Opus prompt — SettleHex responsive identity exploration

Act as a senior identity designer with strong product-interface judgment. You
are reviewing the early brand system for SettleHex, a free online Catan game
currently focused on quick, balanced 1v1 play.

Read the attached `BRAND_CONTEXT.md` and inspect every attached image before
responding.

Challenge this, not validate it politely. The team has already spent too long
reasoning verbally and accepting plausible-looking AI logo sheets. Identify
what is actually strong, what is generic, what fails at small size, and whether
the favoured negative-space-S idea is sound. If it is flawed, demonstrate why
and propose something better.

## The design problem

The current identity is inconsistent:

- Outfit is the global UI/product font.
- Fredoka is scoped to the rounded homepage `Settlehex` wordmark and the `Sx`
  inside a glossy green board-hex badge.
- The favicon repeats that glossy green `Sx` hex but appears optically small and
  becomes muddy at browser-tab size.
- The social card uses a large Outfit `SettleHex` wordmark with no symbol and
  looks comparatively clean.
- The product name should now be cased consistently as `SettleHex`.

The target personality is "friendly modern strategy game": joyful, warm, and
board-derived, but not childish, toy-like, generic SaaS, or esports-sharp.

## Favoured hypothesis to test

Test a mark created by:

1. Starting with a field or compact arrangement derived from softly rounded
   board hexagons.
2. Cropping it to a compact outer silhouette, especially a soft square/squircle
   suitable for a browser favicon.
3. Subtracting a proper typographic uppercase `S` as negative space.
4. Allowing the result to contain complete hexagons, cropped half-hexagons,
   corners, and other hexagon-derived fragments. They do not all need to appear
   as complete tiles.

The `S` should initially be tested using real Fredoka and Outfit glyph outlines,
not an improvised river curve. The background must show through the `S`; it
should be figure/ground geometry, not a coloured or white letter printed on top.

This should not become a direct imitation of Colonist's "solid regular hex plus
centred white initial" favicon. Rounding that same construction or changing its
colour is not sufficient differentiation.

Also retain the early "soft square with a simple hexagonal aperture" as a
possible alternate direction, while judging honestly whether it is too generic.
You may introduce one additional direction if it is materially stronger and
grounded in SettleHex rather than generic logo-fashion.

## Required visual work

Do not answer only with prose, moodboards, or giant isolated logos.

Create precise vector-like studies—prefer SVG or another deterministic graphic
format over image-generation painting—and show each viable direction in these
contexts:

- homepage lockup: symbol plus the exact wordmark `SettleHex`;
- standalone mark at 64px and 32px;
- favicon at actual 16px and 32px;
- favicon inside a simple browser-tab simulation so optical fill can be judged;
- social-card wordmark treatment.

For the negative-space-S direction, show a small but meaningful matrix:

- soft-square versus rounded-hex outer crop;
- Fredoka-S mask versus Outfit-S mask;
- at least two honeycomb scales or fragment densities.

Do not generate dozens of cosmetic variations. Four to eight carefully chosen
comparisons are enough.

## Typography questions to answer

Compare the current roles of Fredoka and Outfit rather than assuming one font
must win everywhere:

- Should the homepage display wordmark remain Fredoka?
- Can Outfit be softened through weight, spacing, casing, or a customised
  letterform without losing warmth?
- Should the S-shaped mask use the same face as the wordmark?
- Is a separate display face justified, or is that needless brand complexity?

Use the exact casing `SettleHex` in every proposed wordmark.

## Design constraints

- Preserve friendly confidence and connection to the real colourful game board.
- Prefer flat geometry. No gloss, bevels, faux 3D, app-icon shine, or decorative
  gradients.
- Use few enough elements that the mark survives 16px.
- Avoid `Sx` unless you can make an unusually strong evidence-backed case.
- Avoid generic hex-plus-letter, honeycomb-tech, blockchain, aperture,
  snowflake, network-node, and esports-shield tropes.
- Do not copy CATAN, Colonist, Reddit, ChatGPT, Anthropic, or another company's
  mark.
- Do not judge a favicon only by a large upscaled render.
- Distinguish browser-applied padding from transparent padding inside the
  source asset.
- A responsive identity may use a simplified favicon variant; explain any
  differences rather than forcing one composition everywhere.

## Required response

Return:

1. A blunt diagnosis of the current wordmark, badge, favicon, and social-card
   relationship.
2. A visual comparison of the strongest three directions, including actual
   16px tests.
3. A direct assessment of whether the negative-space typographic-S idea works.
4. One recommended identity system—not a noncommittal menu—with reasoning.
5. A compact implementation specification:
   - symbol construction;
   - wordmark font, casing, weight, and spacing;
   - colour roles;
   - clear space and optical padding;
   - responsive favicon/lockup variants;
   - which current treatments should be retired.
6. The smallest next prototype that would genuinely validate the
   recommendation.

If you cannot create accurate visual/vector comparisons in your environment,
say that explicitly. In that case, provide exact SVG construction instructions
or a Figma-ready geometry recipe rather than pretending a prose description is
visual proof.

Do not change production code, install dependencies, commit, deploy, or discard
existing work. This is an exploration and decision brief only.

## Optional repository files

If you have access to `/Users/david/coding/settlex`, inspect:

1. `app/catana/home/HomeTableClient.js`
2. `app/opengraph-image.jsx`
3. `app/favicon.ico`
4. `app/layout.js`
5. `app/manifest.js`
6. `docs/agent/UI_CONTEXT.md`
7. `docs/agent/skills/catana-brand/SKILL.md`
8. `docs/superpowers/specs/2026-07-29-settlehex-beta-copy-strategy-design.md`

Focus on the brand system. Do not widen the task into a homepage redesign.
