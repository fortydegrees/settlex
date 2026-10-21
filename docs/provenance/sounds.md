# Older sound provenance — unresolved

Updated 2026-10-19. David recalls these may have been AI-generated, but is not
certain. This is a lead, not a source or redistribution-license finding. The
existing design guide calls the dice recordings; that description also does not
establish how the source audio was created.

The three sampled shipped MP3s have no format tags identifying a creator, source,
license or generator (`ffprobe -show_entries format_tags`). File history records
integration into the game, not permission to redistribute source assets.

| Shipped file | Verified local evidence | Status |
| --- | --- | --- |
| `public/sounds/die-throw-1.mp3` | Byte-identical to `sounds/dice_roll/die-throw-1.mp3`; added to public sounds in `940eb52` | Origin and terms unverified |
| `public/sounds/card_woosh.mp3` | Integration plan references copying `sounds/card_woosh.mp3`; current source copy is not byte-identical | Origin, processing history and terms unverified |
| `public/sounds/settle.mp3` | Byte-identical to `sounds/settle.mp3`; public file history includes `6eeece5`, source file `85dbb61` | Origin and terms unverified |

SHA-256 identities of the sampled shipped files, in table order:

- `7c36ffca521699e516cc90cd5c3159469a0bce99132ccdd29da9a78948976eee`
- `2c0b386d0f1cafada8f7962850cc69d53c0bdde3cdb5ce7a935c9d76f5546c9d`
- `fc74f9a23367f491048a10bfdffa445c7b3b98b4a73819ae2350b7272b26edaf`

Keep the current game behavior while investigating. A generation record or
original download with applicable terms could resolve provenance. If none can
be recovered, prepare auditable replacements for audition before publication;
do not silently replace working sounds or label uncertain files as cleared.
The local synthesis kit establishes recipes for its own cues only.
