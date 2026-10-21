# Asset and source-material inventory

Snapshot of committed tree `1c9d7000b0da4d7cae3e6c4837319c7784267bed`, 2026-10-19. [assets.tsv](assets.tsv) enumerates every tracked blob under `public/`, `sounds/` and `design/`, with exact Git object identity, file mode and size. This includes supporting source/readme files, not only binary assets. File identities are from that snapshot; later authorship corrections are noted below.

The inventory contains 409 paths and 27,504,127 bytes. Sizes are logical blob sizes, not clone-size savings. Unresolved was the default at the initial audit; the existing Outfit notice/metadata evidence is recorded explicitly. Recipe source does not establish rights to separately recorded audio. Design/reference material is a candidate for private preservation and exclusion only after consumer/content review.

A bounded static consumer search across app/lib/server found no active literal references to public `next.svg`, `vercel.svg`, `empty copy.svg`, `test_designs` or `/ore.svg`; the two `/ore.svg` matches were commented examples. This is not proof of no dynamic/external consumer and authorizes no deletion. Keep runtime assets separate from reference-source curation.

Remaining concrete decisions: project licensing disposition for attributed GPL-derived utilities; recover or replace uncertain sound/art origins; review custom display-font provenance; curate unneeded reference/design material with verified recovery. Historical exclusion/ref-map decisions are private publication preparation, separate from this asset inventory. This inventory is an input, not publication clearance.

## Current curation disposition

The inventory above is a historical identity record, not a list of files promised
in this checkout. The current tree omits 244 reviewed reference/optional paths;
[the disposition](asset-disposition.md) and [exact archived identities](archived-assets.tsv)
record that scope. The retained 165 paths under public/, sounds/ and design/
include current runtime families and the maintained design guide/synthesis kit.
The old inventory predates metadata/README/guide updates; recover an omitted
file using its exact newer archived-assets entry when the two identities differ.
Private originals are preserved; no source asset was deleted by this curation.

## Board-piece authorship correction — 21 October 2026

David Pratt confirmed that the current settlement, city and road artwork is
entirely his own work, created in Inkscape. The 60 `public/svgs/pieces/` rows now
use `original-artwork-david-pratt-inkscape` instead of `unresolved`. File identities
and artwork bytes are unchanged. This records authorship, not a licence grant;
other inventory rows retain their existing status. See [artwork authorship](art-and-fonts.md).
