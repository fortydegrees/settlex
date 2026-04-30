---
name: catana-brand
description: Use when building UI components, pages, or features for Catana. Provides design philosophy, colors, typography, component patterns, and animation principles for a consistent, joyful aesthetic.
---

# Catana Design System

Related specs:
- `docs/agent/skills/catana-brand/RESOURCE_ICON_STYLE_GUIDE.md` (authoritative resource-icon system and handoff contract)
- `docs/agent/skills/catana-brand/ADDING_SHARED_PRIMITIVES.md` (short workflow for adding new shared standard UI primitives)

If you are adding or extending a reusable product-surface primitive in `app/ui/*`, also read `docs/agent/skills/catana-brand/ADDING_SHARED_PRIMITIVES.md` before implementation. That workflow requires checking the existing Settlex primitives first, then reviewing two or three targeted external references before inventing a new shared interaction pattern.

## Philosophy

Catana is joyful and vibrant—a celebration of the board game experience. The design *pops*: bold colors, confident choices, nothing timid. It's flat and modern (no textures, no skeuomorphism) but warm and alive through animation and color.

Think "friendly confidence"—approachable enough for casual players, polished enough to feel like a real product. The glassmorphic aesthetic creates depth without heaviness—everything feels light, airy, floating.

**Core traits:**
- **Joyful** – Bright colors, satisfying feedback, celebratory moments
- **Vibrant** – Colors that pop, not muted or timid
- **Light** – Glassmorphism, airy spacing, no heavy textures
- **Alive** – Smooth motion for rewards, snappy feedback for interactions
- **Confident** – Bold choices, distinctive, not generic

---

## Visual Identity

### Color Palette

**Primary Background**
- `bg-blue-200` – Catana's signature color. Light, cheerful, distinctive.
- Use variants for layering: `bg-blue-200/95` (solid), `bg-blue-200/50` (lighter)
- Full-screen gradient: `bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-400 to-blue-600`

**Glass Layers**
- `bg-white/70`, `bg-white/60`, `bg-white/40` – For floating panels on blue
- Always pair with `backdrop-blur-sm` for the frosted effect

**Text**
- Primary: `text-slate-800` or `text-slate-900`
- Secondary: `text-slate-600`
- Muted: `text-slate-500`
- Never use pure black (`text-black`)

**Accents**
- Active/highlight: `amber-400`, `yellow-400` – Draws attention, celebrations
- Success/CTA: `lime-500`, `lime-600` – Confirmations, primary actions (vibrant, energetic green)
- Danger/warning: `rose-500`, `rose-600` – Errors, destructive actions

### Typography

**Font: Outfit** (Google Fonts)

Primary font for all UI: headings, buttons, body text, game elements. Geometric, confident, readable—fits the "modern but friendly" vibe.

```js
// app/layout.js
import { Outfit } from 'next/font/google'
const outfit = Outfit({ subsets: ['latin'] })
```

**Scale:**
- Headings: `text-2xl` to `text-4xl`, `font-bold`
- UI labels: `text-sm` to `text-base`, `font-semibold`
- Body/logs: `text-sm`, `font-normal`
- Small labels: `text-xs`, `font-medium`
- Uppercase headers: `text-xs font-semibold uppercase tracking-widest text-slate-700`

### Visual Hierarchy

Distinguish between **core game elements** and **meta/UI elements**:

| Layer | Examples | Treatment |
|-------|----------|-----------|
| **Core** | Resource cards, game board, action buttons, player info | More opaque (`/95`), stronger shadows (`shadow-xl`), defined borders (`ring-2`) |
| **Meta** | Game log, chat, status indicators | More transparent (`/50-70`), lighter shadows (`shadow-lg`), subtler borders (`ring-1`) |

Core elements feel grounded and tangible. Meta elements feel like floating overlays.

---

## Component Patterns

### Glass Card (Primary Container)

The signature Catana container. Use for panels, cards, modals, and grouped content.

**Light glass (meta/UI elements):**
```
rounded-xl bg-white/25 shadow-lg ring-1 ring-white/30 backdrop-blur-sm p-4
```

**Blue glass (core elements):**
```
rounded-xl bg-blue-200/50 backdrop-blur-sm ring-1 ring-white/60 shadow-lg p-4
```

**Solid variant (important core elements):**
```
rounded-xl bg-blue-200/95 ring-2 ring-slate-300 shadow-xl p-4
```

### Buttons

**Primary Action (CTA):**
```
rounded-lg bg-lime-500 hover:bg-lime-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:scale-[1.02]
```

**Secondary / Glass Pill:**
```
rounded-full bg-white/70 hover:bg-white/85 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg ring-1 ring-white/60
```

**Neutral (modals, secondary actions):**
```
rounded-lg bg-slate-600 hover:bg-slate-700 px-4 py-2 text-sm font-semibold text-white shadow-sm
```

**Disabled State:**
```
bg-slate-300 text-slate-500 cursor-not-allowed shadow-sm
```

### Modals

**Backdrop:**
```
fixed inset-0 z-40 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center
```

**Modal box:**
```
rounded-xl bg-blue-200/95 ring-2 ring-slate-300 shadow-2xl p-6 max-w-xl
```

### Inputs

**Glass input (forms):**
```
w-full rounded-lg bg-white/60 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-500 shadow-inner ring-1 ring-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/70
```

---

## Animation Guidelines

### Philosophy

Animations should be **delightful but purposeful**. Rich motion for game moments, snappy feedback for UI interactions. Never let animation slow down an experienced player.

### Timing

| Context | Duration | Easing |
|---------|----------|--------|
| Hover feedback | 120-150ms | `ease-out` |
| UI transitions | 150-200ms | `ease-out` |
| Game feedback (card dealt, piece placed) | 200-300ms | `cubic-bezier(0.34, 1.56, 0.64, 1)` (bouncy) |
| Celebrations (win, milestone) | 400-600ms | Spring physics or bouncy |
| Continuous ambient (glows, pulses) | 2-3s | `ease-in-out`, infinite |

### When to Animate

**Do animate:**
- Piece placement, card distribution (reward moments)
- Turn changes, dice rolls (game events)
- Hover/press feedback on interactive elements
- Entry/exit of modals and panels

**Don't animate:**
- Text content, logs, chat messages (let them appear instantly)
- Rapid repeated actions (experienced players clicking fast)
- Anything that blocks user input

### Accessibility

- Always respect `prefers-reduced-motion`
- Provide a "reduced animations" toggle for turbo/pro mode
- Ensure UI is usable with all animations disabled

---

## Anti-Patterns

### Visual

- **No dark themes** – Catana is light and airy. No `bg-slate-950` or dark SaaS defaults.
- **No heavy textures** – No wood grain, paper, realistic materials. Stay flat.
- **No pure black** – Use `slate-800`/`slate-900` for text, never `#000000`.
- **No sharp corners** – Always round containers (min `rounded-lg`).
- **No thin/wispy fonts** – Outfit should feel confident, not delicate.
- **No gray backgrounds** – Blue-200 or white-on-blue, always.

### Motion

- **No theatrical UI animations** – Save the "wow" for game moments.
- **No bouncing/elastic on basic hover** – A slight lift is enough.
- **No animation that blocks interaction** – User should never wait.

### Implementation

- **No new UI libraries** (shadcn, MUI, etc.) – Catana has its own system.
- **No TypeScript conversion** mid-task – Keep Catana UI in JS unless asked.
- **No new Tailwind plugins** without asking.
- **No inventing new colors** – Use the existing slate/blue/amber/lime/rose palette.

---

## Quick Reference

### Color Tokens

| Purpose | Class |
|---------|-------|
| Page background | `bg-blue-200` or sky gradient |
| Glass layer | `bg-white/70`, `bg-white/25` |
| Solid panel | `bg-blue-200/95` |
| Primary text | `text-slate-800` |
| Secondary text | `text-slate-600` |
| Muted text | `text-slate-500` |
| CTA button | `bg-lime-500` |
| Highlight/active | `bg-amber-400` |
| Danger | `bg-rose-500` |

### Copy-Paste Classes

**Glass card:**
```
rounded-xl bg-white/25 shadow-lg ring-1 ring-white/30 backdrop-blur-sm p-4
```

**Solid card:**
```
rounded-xl bg-blue-200/95 ring-2 ring-slate-300 shadow-xl p-4
```

**Primary button:**
```
rounded-lg bg-lime-500 hover:bg-lime-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:scale-[1.02]
```

**Glass pill button:**
```
rounded-full bg-white/70 hover:bg-white/85 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg ring-1 ring-white/60
```

**Modal backdrop:**
```
fixed inset-0 z-40 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center
```

**Uppercase label:**
```
text-xs font-semibold uppercase tracking-widest text-slate-700
```

### Font Setup

```js
// app/layout.js
import { Outfit } from 'next/font/google'
const outfit = Outfit({ subsets: ['latin'] })

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={outfit.className}>{children}</body>
    </html>
  )
}
```
