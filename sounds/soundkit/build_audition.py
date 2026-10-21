"""Assemble the audition page. v3: the family, derived from Glasslift."""

import base64
import os

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, "out")

ANCHOR = {
    "id": "glasslift", "file": "settlehex-gamestart-08-glasslift",
    "num": "GS", "name": "Glasslift", "dur": "2.3 s",
    "tag": "game start", "energy": "locked in", "locked": True,
    "thesis": "The anchor.",
    "body": "Shipped as the match-found / game-start cue. Every sound below is "
            "derived from its palette: sine plucks for motion, octave blooms for "
            "arrival, the hanging B as the signature, a soft thump for ground.",
    "listen": "the reference everything below should feel related to.",
}

FAMILY = [
    {
        "id": "yourturn", "file": "settlehex-family-yourturn",
        "num": "F1", "name": "Your Turn", "dur": "0.9 s",
        "tag": "frequent", "energy": "wired", "locked": True,
        "thesis": "Your move.",
        "body": "The pickup-run\u2019s first two notes \u2014 D\u2192A \u2014 with one soft low tap. "
                "Wired: replaces the old turn-start chime, still audible from a "
                "background tab.",
        "listen": "how it quotes the anchor\u2019s opening without restating it.",
    },
    {
        "id": "award_road", "file": "settlehex-family-award-road",
        "num": "F2", "name": "Award \u2014 Longest Road", "dur": "1.7 s",
        "tag": "decided", "energy": "wired", "locked": True,
        "thesis": "The road stretches.",
        "body": "The fanfare, flavored for distance: a stepwise walk up "
                "5\u20136\u20137\u20138 that travels left-to-right across the stereo field "
                "as it climbs \u2014 a road extending \u2014 then holds the octave with "
                "a small punch. Same skeleton as Army: you hear \u201caward\u201d "
                "first, \u201cwhich one\u201d second.",
        "listen": "the notes walking across the stereo field.",
        "pair": "award",
    },
    {
        "id": "award_army", "file": "settlehex-family-award-army",
        "num": "F3", "name": "Award \u2014 Largest Army", "dur": "1.7 s",
        "tag": "decided", "energy": "wired", "locked": True,
        "thesis": "Ta-ta-ta... DAA.",
        "body": "The fanfare, flavored for force: the tight martial repeated-"
                "note pickup \u2014 repetition is the military signal gesture \u2014 "
                "leaping to the held bugle third with a punchier hit. Centered "
                "and solid where Road travels. (v1 and the Herald/Bugle "
                "prototypes retired into these two.)",
        "listen": "repetition and the leap \u2014 a salute, not a walk.",
        "pair": "award",
    },
    {
        "id": "blocked", "file": "settlehex-family-resource-blocked",
        "num": "F4", "name": "Robber Block", "dur": "0.6 s",
        "tag": "decided", "energy": "wired", "locked": True,
        "thesis": "The payout that deflates.",
        "body": "The roll hit your number \u2014 but the robber sits on the tile. "
                "A tiny pop-like onset sagging straight down to F, the "
                "misfortune note, with a damp knock: the discard droop at pop "
                "scale. Fires alongside the board\u2019s blocked-tile flash, so "
                "silence after a roll is no longer ambiguous.",
        "listen": "a resource pop that dies \u2014 promised, then withheld.",
    },
    {
        "id": "discard_d", "file": "settlehex-family-discard-d-sigh",
        "num": "F5", "name": "Discard \u2014 Chromatic Sigh", "dur": "1.5 s",
        "tag": "decided", "energy": "wired", "locked": True,
        "thesis": "Three steps down.",
        "body": "G, F\u266f, F descending chromatically, the last note sagging a "
                "quarter tone flat \u2014 the family\u2019s one deliberately out-of-tune "
                "note. Wired: plays once when the forced-discard prompt opens, "
                "even from a background tab.",
        "listen": "the flat sag on the final note \u2014 \u201cwah, wah, waaah,\u201d sine-pure.",
    },
    {
        "id": "timer_d", "file": "preview-timer4-ticktock-esc",
        "num": "F6", "name": "Low Timer \u2014 Tick & Half-Tick", "dur": "1.0 s \u00d7 n",
        "tag": "decided", "energy": "wired", "locked": True,
        "thesis": "Tick... tock.",
        "body": "Your spec: a full tick on the second, a lighter half-tick on the "
                "half-second \u2014 time audibly subdividing under you. Starts at "
                "\u22645 s left; the final 2 s rise a fourth and brighten. Each "
                "intensity is one 1-second asset with the subdivision baked in, "
                "so the rhythm stays sample-accurate. (Options A/B/C retired.)",
        "listen": "the countdown preview: two soft seconds, then two critical.",
    },
    {
        "id": "win_b", "file": "settlehex-family-win-v2b-tada",
        "num": "F7", "name": "Game Win \u2014 Ta-Da", "dur": "3.4 s",
        "tag": "decided", "energy": "wired", "locked": True,
        "thesis": "Unmistakably an ending.",
        "body": "The winning revision, shipped: the opening states the D\u2013A\u2013B "
                "signature (no longer the intro\u2019s run), lands D5 with a major "
                "bloom, then a second, higher crowning hit \u2014 ta\u2026 DA. Two "
                "arrivals, the second a fourth up on a D6 the family reaches "
                "nowhere else. (v1 and the Crowned variant retired.)",
        "listen": "the double hit \u2014 land, then crown. Nothing about it says \u201cstart.\u201d",
    },
    {
        "id": "lose_d", "file": "settlehex-family-lose-d-tada-mirror",
        "num": "F8", "name": "Game Lose \u2014 Mirror of Ta-Da", "dur": "3.2 s",
        "tag": "decided", "energy": "wired", "locked": True,
        "thesis": "The same ceremony, one floor down.",
        "body": "The exact inversion of the shipped win: Ta-Da states D\u2013A\u2013B "
                "<em>rising</em>; this states D\u2013G\u2013F <em>falling</em>, landing "
                "on F, the misfortune note. Then settle-and-sink where win "
                "lands-and-crowns: D4 with the minor bloom and a soft thump, "
                "then a quieter, lower after-tone. (Mirror v1 retired.)",
        "listen": "play F7 then this \u2014 statement, arrival, and coda all inverted.",
    },
    {
        "id": "turnend_a", "file": "settlehex-family-turnend-v2a-fullstop",
        "num": "P1", "name": "Turn End \u2014 Full Stop", "dur": "0.5 s",
        "tag": "decided", "energy": "wired", "locked": True,
        "thesis": "A dot, not a word.",
        "body": "One muted dot on low D \u2014 the family\u2019s home note, an octave "
                "under the timer ticks, no click, bone dry. Wired: fires when "
                "your turn hands off, however it ended \u2014 button, shortcut, or "
                "timeout \u2014 and never into game over. The quietest sound in "
                "the family, by design. (Two-note v1 and Set Down retired.)",
        "listen": "\u201cdm.\u201d \u2014 the period at the end of your turn.",
    },
    {
        "id": "robberplace", "file": "settlehex-family-robberplace",
        "num": "P2", "name": "Robber \u2014 With a Breath", "dur": "1.1 s",
        "tag": "option a", "energy": "table + accent",
        "thesis": "The shadow lands.",
        "body": "A landing thud and dark air, plus one quiet pitched ingredient: "
                "a low-F breath, the family\u2019s misfortune color. Material first, "
                "with the faintest trace of the game\u2019s voice underneath.",
        "listen": "whether the breath adds dread \u2014 or tips it toward \u201cUI.\u201d",
        "pair": "robber",
    },
    {
        "id": "robberplace_b", "file": "settlehex-family-robberplace-material",
        "num": "P3", "name": "Robber \u2014 Pure Material", "dur": "1.0 s",
        "tag": "option b", "energy": "table layer",
        "thesis": "Just the thud.",
        "body": "The same landing with zero pitched content \u2014 thud, low settle "
                "noise, a whisper of air. Fully a table sound that happens to be "
                "synthesized: nothing musical, nothing \u201cinterface.\u201d",
        "listen": "matter only \u2014 if this reads as a real piece landing, the production method is irrelevant.",
        "pair": "robber",
    },
    {
        "id": "steal_plain", "file": "preview-steal-plain",
        "num": "P4", "name": "Steal \u2014 Today", "dur": "0.3 s",
        "tag": "as shipped", "energy": "woosh only",
        "thesis": "A card moves.",
        "body": "What a steal sounds like right now: the robber-steal animation "
                "runs through the card-transfer pipeline and plays the standard "
                "card woosh \u2014 physically identical to a trade or a "
                "distribution. The event sounds; the meaning doesn\u2019t.",
        "listen": "it\u2019s indistinguishable from any other card movement.",
        "pair": "steal",
    },
    {
        "id": "steal_glyph", "file": "preview-steal-glyph",
        "num": "P5", "name": "Steal \u2014 Woosh + Glyph", "dur": "0.5 s",
        "tag": "proposal", "energy": "layered",
        "thesis": "A card moves \u2014 and it hurt.",
        "body": "The same real woosh with a small glyph underneath: one muted "
                "low F \u2014 the misfortune note \u2014 landing as the card arrives. "
                "The physical layer carries the event, the glyph carries the "
                "meaning. Ships as one premixed asset via the transfer\u2019s "
                "cue-name override, so wiring is a two-line change.",
        "listen": "the shadow under the woosh \u2014 movement plus meaning.",
        "pair": "steal",
    },
]

LANG_ITEMS = [
    ("Derivation, not decoration", "Every cue quotes the anchor: your-turn takes its first two notes, awards borrows the climb, win completes its unresolved B. Relatedness is structural, so the family can grow without a style guide."),
    ("Only win resolves", "Start, turn, awards all end open. The octave cadence is spent exactly once per match — that scarcity is what makes winning sound like winning."),
    ("Frequency sets weight", "The more often a cue plays, the shorter and drier it is. Your-turn and ticks are near-dry; win and lose carry the tails."),
    ("Meaning in scale degrees", "C♯ (leading tone) = act now. Low D = time. Minor third = loss. The octave = victory. The vocabulary is the key of D itself."),
    ("Material vs musical", "Table events sound like matter \u2014 thumps, noise, impacts, no melody \u2014 whether recorded or synthesized; players can\u2019t hear the production method. Interface events speak in pitch and motif. And when a physical event carries hidden meaning \u2014 a steal vs an ordinary card move \u2014 the real sound carries the event and a small glyph layered under it carries the meaning. The dice stay recordings because they\u2019re great, not because they must be."),
]

WIRING_ROWS = [
    ("game start", "game-start.mp3", "Wired \u2014 lobby match-found hook."),
    ("turn:start", "your-turn.mp3", "Wired \u2014 replaces turn-start.mp3, still audible when the tab is hidden."),
    ("game:win", "game-win.mp3", "Wired \u2014 Ta-Da."),
    ("game:lose", "game-lose.mp3", "Wired \u2014 Mirror of Ta-Da."),
    ("award:claim:road / :army", "award-road/army.mp3", "Wired \u2014 the cue splits on awardType; your claims only."),
    ("discard:required", "discard-required.mp3", "Wired \u2014 fires once when the forced-discard prompt opens."),
    ("timer:low / :critical", "timer-low/critical.mp3", "Wired \u2014 tick & half-tick from \u22645 s, rising for the final 2 s."),
    ("resource:blocked", "resource-blocked.mp3", "Wired \u2014 fires with the blocked-tile flash when the robber eats a payout."),
    ("turn:end", "turn-end.mp3", "Wired \u2014 Full Stop, on the local hand-off (button, shortcut, or timeout)."),
    ("robber:place", "(proposal)", "Would ride the existing robber:move effect, timed to the landing."),
    ("resource:steal", "(proposal)", "Premixed woosh+glyph asset via the steal transfer\u2019s cueName override \u2014 the plain woosh keeps serving every other card move."),
]


def data_uri(path):
    with open(path, "rb") as f:
        return "data:audio/mpeg;base64," + base64.b64encode(f.read()).decode()


ALL = [ANCHOR] + FAMILY

audio_js = ",\n".join(
    f'  {c["id"]}: "{data_uri(os.path.join(OUT, c["file"] + ".mp3"))}"'
    for c in ALL
)

KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "q", "w", "e", "r"]


def card(c, key):
    return f"""
<article class="card{' half' if c.get('pair') else ''}" id="card-{c['id']}">
  <div class="card-top">
    <button class="hexbtn" data-id="{c['id']}" aria-label="Play {c['name']}">
      <svg viewBox="0 0 24 24" class="icon-play" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>
      <svg viewBox="0 0 24 24" class="icon-stop" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="1.5"/></svg>
    </button>
    <div class="card-head">
      <div class="card-eyebrow"><span class="knum">{c['num']}</span><span class="ktag">{c['tag']}</span><span class="ktag{' locked' if c.get('locked') else ''}">{c['energy']}</span><span class="kdur">{c['dur']}</span></div>
      <h2>{c['name']} <span class="thesis">“{c['thesis']}”</span></h2>
    </div>
    <kbd class="key" aria-hidden="true">{key}</kbd>
  </div>
  <canvas class="wave" data-id="{c['id']}" height="56"></canvas>
  <p class="card-body">{c['body']}</p>
  <p class="card-note"><strong>Listen for:</strong> {c['listen']}</p>
</article>"""


# group paired variants into 2-up rows, keep solos full width
family_parts = []
i = 0
key_i = 1
while i < len(FAMILY):
    c = FAMILY[i]
    if c.get("pair") and i + 1 < len(FAMILY) and FAMILY[i + 1].get("pair") == c["pair"]:
        family_parts.append('<div class="pair">'
                            + card(c, KEYS[key_i]) + card(FAMILY[i + 1], KEYS[key_i + 1])
                            + '</div>')
        i += 2
        key_i += 2
    else:
        family_parts.append(card(c, KEYS[key_i]))
        i += 1
        key_i += 1
family_html = "\n".join(family_parts)

wiring_html = "\n".join(
    f'<div class="frow"><div class="fcue">{cue}</div><div class="fmid">{asset}</div><div class="fdesc">{note}</div></div>'
    for cue, asset, note in WIRING_ROWS)

lang_html = "\n".join(
    f'<div class="lang-item"><h3>{t}</h3><p>{d}</p></div>' for t, d in LANG_ITEMS)

page = f"""<meta charset="utf-8">
<title>SettleHex Start Cues</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap">
<style>
:root {{
  --ground-hi: #7dd3fc; --ground-mid: #38bdf8; --ground-lo: #2563eb;
  --glass: rgba(255,255,255,.55); --glass-strong: rgba(255,255,255,.72);
  --edge: rgba(255,255,255,.65);
  --ink: #1e293b; --ink-soft: #475569; --ink-mute: #64748b;
  --lime: #65a30d; --lime-bright: #84cc16; --amber: #f59e0b;
  --wave-idle: rgba(71,85,105,.38);
}}
* {{ box-sizing: border-box; margin: 0; }}
body {{
  font-family: 'Outfit', 'Avenir Next', 'Segoe UI', system-ui, sans-serif;
  color: var(--ink);
  background: radial-gradient(120% 90% at 50% 0%, var(--ground-hi) 0%, var(--ground-mid) 38%, var(--ground-lo) 100%) fixed;
  min-height: 100vh; padding: 3.5rem 1.25rem 4rem;
}}
.page {{ max-width: 880px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.1rem; }}
header.hero {{ padding: 0 .25rem 1.2rem; }}
.eyebrow {{
  font-size: .72rem; font-weight: 600; letter-spacing: .18em; text-transform: uppercase;
  color: rgba(255,255,255,.85);
}}
.group-label {{ padding: .8rem .35rem 0; }}
.group-label p {{ margin-top: .25rem; font-size: .85rem; color: rgba(255,255,255,.78); font-weight: 500; max-width: 62ch; }}
h1 {{ font-size: clamp(2rem, 5vw, 2.9rem); font-weight: 800; color: #fff; text-wrap: balance; line-height: 1.08; margin-top: .4rem; }}
.hero p {{ margin-top: .7rem; max-width: 60ch; color: rgba(255,255,255,.92); font-weight: 500; }}
.hero .hint {{ margin-top: .5rem; font-size: .82rem; color: rgba(255,255,255,.75); font-weight: 500; }}
.pair {{ display: grid; grid-template-columns: 1fr 1fr; gap: 1.1rem; }}
@media (max-width: 720px) {{ .pair {{ grid-template-columns: 1fr; }} }}
.card {{
  background: var(--glass); border: 1px solid var(--edge); border-radius: 18px;
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 10px 30px rgba(30,58,138,.18);
  padding: 1.15rem 1.3rem 1.2rem; transition: box-shadow .15s ease, transform .15s ease;
}}
.card.playing {{ box-shadow: 0 0 0 2px var(--amber), 0 14px 34px rgba(30,58,138,.24); }}
.card-top {{ display: flex; align-items: center; gap: .95rem; }}
.card.half .card-top {{ gap: .75rem; }}
.hexbtn {{
  flex: none; width: 58px; height: 58px; border: 0; cursor: pointer;
  clip-path: polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0% 50%);
  background: linear-gradient(160deg, var(--lime-bright), var(--lime));
  color: #fff; display: grid; place-items: center;
  transition: transform .12s ease, filter .12s ease;
}}
.card.half .hexbtn {{ width: 48px; height: 48px; }}
.hexbtn:hover {{ transform: scale(1.05); filter: brightness(1.06); }}
.hexbtn:focus-visible {{ outline: 3px solid #fff; outline-offset: 2px; }}
.hexbtn svg {{ width: 26px; height: 26px; fill: currentColor; }}
.hexbtn .icon-stop {{ display: none; }}
.card.playing .hexbtn {{ background: linear-gradient(160deg, #fbbf24, var(--amber)); }}
.card.playing .hexbtn .icon-play {{ display: none; }}
.card.playing .hexbtn .icon-stop {{ display: block; }}
.card-head {{ flex: 1; min-width: 0; }}
.card-eyebrow {{ display: flex; align-items: baseline; gap: .55rem; flex-wrap: wrap; }}
.knum {{ font-weight: 800; font-size: .8rem; color: var(--lime); letter-spacing: .06em; }}
.ktag {{
  font-size: .66rem; font-weight: 600; text-transform: uppercase; letter-spacing: .14em;
  color: var(--ink-soft); background: rgba(255,255,255,.55); border: 1px solid var(--edge);
  border-radius: 999px; padding: .14rem .55rem;
}}
.ktag.locked {{ background: var(--lime); border-color: var(--lime); color: #fff; }}
.kdur {{ font-size: .72rem; font-weight: 600; color: var(--ink-mute); font-variant-numeric: tabular-nums; margin-left: auto; }}
h2 {{ font-size: 1.35rem; font-weight: 700; margin-top: .18rem; }}
.card.half h2 {{ font-size: 1.12rem; }}
h2 .thesis {{ font-weight: 500; font-style: italic; color: var(--ink-soft); font-size: 1.02rem; }}
.card.half h2 .thesis {{ display: block; font-size: .92rem; }}
code {{ font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: .85em; background: rgba(255,255,255,.5); padding: .05em .3em; border-radius: 5px; }}
.key {{
  flex: none; font-family: inherit; font-size: .72rem; font-weight: 700; color: var(--ink-mute);
  border: 1.5px solid rgba(100,116,139,.45); border-bottom-width: 3px; border-radius: 7px;
  padding: .18rem .5rem; background: rgba(255,255,255,.5);
}}
.wave {{ width: 100%; height: 56px; display: block; margin-top: .85rem; cursor: pointer; }}
.card-body {{ margin-top: .8rem; font-size: .95rem; line-height: 1.55; color: var(--ink); max-width: 68ch; }}
.card.half .card-body {{ font-size: .88rem; }}
.card-note {{ margin-top: .5rem; font-size: .85rem; line-height: 1.5; color: var(--ink-soft); max-width: 68ch; }}
.card-note strong {{ color: var(--ink); font-weight: 600; }}
section.panel {{
  background: var(--glass-strong); border: 1px solid var(--edge); border-radius: 18px;
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 10px 30px rgba(30,58,138,.16); padding: 1.5rem 1.4rem;
}}
.panel .eyebrow {{ color: var(--lime); }}
.panel h2 {{ margin-top: .3rem; }}
.panel > p.lede {{ margin-top: .6rem; max-width: 66ch; line-height: 1.55; color: var(--ink-soft); }}
.lang-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: .9rem; margin-top: 1.1rem; }}
.lang-item {{ background: rgba(255,255,255,.5); border: 1px solid var(--edge); border-radius: 13px; padding: .85rem .95rem; }}
.lang-item h3 {{ font-size: .93rem; font-weight: 700; }}
.lang-item p {{ margin-top: .35rem; font-size: .82rem; line-height: 1.5; color: var(--ink-soft); }}
.frow {{ display: grid; grid-template-columns: 110px 190px 1fr; gap: .9rem; padding: .65rem .2rem; border-top: 1px solid rgba(255,255,255,.55); }}
.frow:first-of-type {{ border-top: 0; }}
.fcue {{ font-weight: 700; font-size: .85rem; }}
.fmid {{ font-size: .82rem; font-weight: 600; color: var(--ink-soft); font-family: ui-monospace, 'SF Mono', Menlo, monospace; }}
.fdesc {{ font-size: .85rem; line-height: 1.5; color: var(--ink-soft); }}
@media (max-width: 620px) {{ .frow {{ grid-template-columns: 1fr; gap: .15rem; }} .key {{ display:none; }} }}
footer {{ padding: .6rem .35rem 0; font-size: .78rem; line-height: 1.6; color: rgba(255,255,255,.8); font-weight: 500; max-width: 70ch; }}
@media (prefers-reduced-motion: reduce) {{ * {{ transition: none !important; }} }}
</style>

<div class="page">
<header class="hero">
  <div class="eyebrow">SettleHex audio &middot; the family &middot; complete</div>
  <h1>Nine cues, one bloodline</h1>
  <p>The core identity is complete and wired: game start, your turn, awards, discard,
  low timer, win and lose. Below the family sit three <strong>proposed additions</strong>
  from the coverage audit \u2014 turn end, robber placed, and steal \u2014 unwired until you
  approve. The physical table sounds (dice, pieces, cards) stay as they are: world
  sounds and interface sounds are deliberately different layers.</p>
  <p class="hint">Click a hex or press 1&ndash;9, 0, q. Click a waveform to scrub.</p>
</header>

{card(ANCHOR, KEYS[0])}

<div class="group-label">
  <div class="eyebrow">The family &middot; in gameplay order</div>
</div>
{family_html}

<section class="panel">
  <div class="eyebrow">Design rules</div>
  <h2>How the family holds together</h2>
  <div class="lang-grid">{lang_html}</div>
</section>

<section class="panel">
  <div class="eyebrow">Proposed wiring</div>
  <h2>Once approved</h2>
  <p class="lede">Nothing below is wired yet &mdash; <code>soundThemes.js</code> and the
  production sound files stay untouched until you sign off cue by cue. Note that
  <code>turn:start</code> would replace an existing accepted sound.</p>
  <div style="margin-top:.8rem">{wiring_html}</div>
</section>

<footer>Synthesized from code (48&nbsp;kHz masters delivered alongside). The timer cards play
&times;4 previews; shipped tick assets are single pulses the game repeats at its own cadence.
Approve, swap A/B picks, or name tweaks per cue &mdash; each is a few lines in
candidates_family.py.</footer>
</div>

<script>
const AUDIO = {{
{audio_js}
}};

const players = {{}};
let activeId = null;
let ctx = null;
const buffers = {{}};

function b64bytes(uri) {{
  const raw = atob(uri.split(',')[1]);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr.buffer;
}}

function drawWave(id, progress) {{
  const canvas = document.querySelector(`canvas.wave[data-id="${{id}}"]`);
  const buf = buffers[id];
  if (!canvas || !buf) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== w * dpr) {{ canvas.width = w * dpr; canvas.height = h * dpr; }}
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const data = buf.getChannelData(0);
  const bars = Math.floor(w / 4);
  const step = Math.floor(data.length / bars);
  const styles = getComputedStyle(document.documentElement);
  const idle = styles.getPropertyValue('--wave-idle').trim();
  const lit = styles.getPropertyValue('--lime').trim();
  for (let i = 0; i < bars; i++) {{
    let peak = 0;
    for (let j = i * step; j < (i + 1) * step; j += 16) peak = Math.max(peak, Math.abs(data[j]));
    const bh = Math.max(2, peak * (h - 6));
    g.fillStyle = (i / bars) <= progress ? lit : idle;
    g.beginPath();
    g.roundRect(i * 4, (h - bh) / 2, 2.6, bh, 1.3);
    g.fill();
  }}
}}

async function decodeAll() {{
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  for (const id of Object.keys(AUDIO)) {{
    try {{
      buffers[id] = await ctx.decodeAudioData(b64bytes(AUDIO[id]));
      drawWave(id, 0);
    }} catch (e) {{ /* waveform stays blank; playback still works */ }}
  }}
}}

function stop(id) {{
  const p = players[id];
  if (p) {{ p.pause(); p.currentTime = 0; }}
  document.getElementById('card-' + id)?.classList.remove('playing');
  if (activeId === id) activeId = null;
  drawWave(id, 0);
}}

function play(id) {{
  if (activeId && activeId !== id) stop(activeId);
  if (activeId === id) {{ stop(id); return; }}
  const p = players[id] || (players[id] = new Audio(AUDIO[id]));
  activeId = id;
  document.getElementById('card-' + id)?.classList.add('playing');
  p.currentTime = 0;
  p.play();
  const tick = () => {{
    if (activeId !== id) return;
    drawWave(id, p.duration ? p.currentTime / p.duration : 0);
    if (p.ended || p.paused) {{ stop(id); return; }}
    requestAnimationFrame(tick);
  }};
  requestAnimationFrame(tick);
}}

document.querySelectorAll('.hexbtn').forEach(btn =>
  btn.addEventListener('click', () => play(btn.dataset.id)));

document.querySelectorAll('canvas.wave').forEach(cv =>
  cv.addEventListener('click', ev => {{
    const id = cv.dataset.id;
    const p = players[id] || (players[id] = new Audio(AUDIO[id]));
    const frac = ev.offsetX / cv.clientWidth;
    if (activeId !== id) play(id);
    if (p.duration) p.currentTime = frac * p.duration;
  }}));

const ORDER = {list([c["id"] for c in ALL])};
const KEYLIST = {list(KEYS[: len(ALL)])};
document.addEventListener('keydown', ev => {{
  if (ev.metaKey || ev.ctrlKey) return;
  const idx = KEYLIST.indexOf(ev.key);
  if (idx >= 0 && idx < ORDER.length) play(ORDER[idx]);
}});

window.addEventListener('resize', () => Object.keys(buffers).forEach(id =>
  drawWave(id, 0)));

decodeAll();
</script>
"""

out_path = os.path.join(HERE, "audition.html")
with open(out_path, "w") as f:
    f.write(page.encode("ascii", "xmlcharrefreplace").decode())
print(f"wrote {out_path} ({os.path.getsize(out_path)/1024:.0f} KB)")
