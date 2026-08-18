# Building with SettleHex

SettleHex ("Catana") is a 1v1 online Catan-style game. The look is **joyful, vibrant, light** — a bright blue tabletop, frosted-glass panels floating on it, bold rounded controls. Flat and modern: no textures, no skeuomorphism, no dark theme.

## Always wrap in `SettleHexRoot`

Every screen sits on the table surface. `SettleHexRoot` carries the tabletop gradient, the Outfit font stack, and the `settlex-ui-root` stacking context — none of which live in the components themselves. Without it, components render correctly but float on a bare white page and read as off-brand.

```jsx
<SettleHexRoot>
  <YourScreen />
</SettleHexRoot>
```

It takes `className` and `style` to extend (merged after the defaults), and nothing else. Layout inside it is yours.

## Styling idiom: Tailwind utilities

Components are styled entirely with Tailwind utility classes — there are no CSS-module maps, no style props, no theme object. Write your own layout with the same utilities.

**Use this palette. Do not introduce new hues.**

| Purpose | Classes |
|---|---|
| Table background | `bg-blue-200`, `bg-blue-200/95` (solid panel), `bg-blue-200/50` |
| Glass layers | `bg-white/70`, `bg-white/60`, `bg-white/40`, `bg-white/25` — always with `backdrop-blur-sm` |
| Text | `text-slate-800` (primary), `text-slate-600` (secondary), `text-slate-500` (muted). Never `text-black` |
| Primary action | `bg-lime-500` |
| Highlight / active | `bg-amber-400` |
| Danger | `bg-rose-500` |
| Rings | `ring-1 ring-white/30`, `ring-1 ring-white/60`, `ring-2 ring-slate-300` |
| Radius | `rounded-lg` minimum — never sharp corners. `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-full` |
| Shadows | `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`, `shadow-inner` |
| Type scale | `text-xs` → `text-4xl`; `font-semibold` for UI labels, `font-bold` for headings |
| Uppercase label | `text-xs font-semibold uppercase tracking-widest text-slate-700` |

The signature container is the **glass card** — copy this:

```
rounded-xl bg-white/25 shadow-lg ring-1 ring-white/30 backdrop-blur-sm p-4
```

Core gameplay elements are more opaque with stronger shadows (`bg-blue-200/95 ring-2 ring-slate-300 shadow-xl`); ambient meta elements are more transparent and lighter (`bg-white/25 ring-1 shadow-lg`).

Design tokens are exposed as CSS custom properties for radii, motion and layering — use them rather than inventing values: `--settlex-ui-radius-panel`, `--settlex-ui-radius-control`, `--settlex-ui-radius-pill`, `--settlex-ui-duration-fast`, `--settlex-ui-duration-dialog`, `--settlex-ui-ease-standard`, `--settlex-ui-ease-bounce`, `--settlex-ui-shadow-panel`, and the `--settlex-ui-z-{dialog,popover,tooltip,status}` layer scale.

**Coverage caveat:** the shipped stylesheet is compiled from SettleHex's own source, so it contains the utilities the product uses today — the table above is the safe vocabulary. An exotic utility the product never uses may not resolve. Prefer the classes named here.

## Pick the component before styling by hand

Reach for a library component first; only hand-style layout glue.

- **Actions** — `Button` (`variant`: primary / secondary / accent / ghost / subtle / danger; `size`: sm–xl; `sheen`), `IconButton` (requires `aria-label`)
- **Containers & feedback** — `Panel`, `Banner`, `StatusBanner` (`variant`: neutral / danger / success / warning)
- **Forms** — `Input`, `Select`, `SwatchPicker`
- **Overlays** — `Dialog`, `AlertDialog`, `Popover`, `Tooltip` (wrap in `TooltipProvider`), `MetaDisclosure`
- **Whole surfaces** — `HomeTitleChrome`, `SystemTopChrome`, `AccountPageView`, `OpenMatchRoom`, `SearchingModal`, `GameOverModal`, `PostgameOverlay`, `ReplayPanel`, and more under `components/`

`MetaDisclosure` is specifically for ambient metadata (release marks, build ids, diagnostics) — quiet text, never a pill or CTA. Don't reach for `Button` just because something is clickable; start from the element's role.

## Where the truth lives

Read before styling: `_ds/<folder>/styles.css` and its `@import` closure (the compiled utilities, the `--settlex-ui-*` tokens, and the Outfit `@font-face` rules). Per-component API and usage are in `components/<group>/<Name>/<Name>.d.ts` and `<Name>.prompt.md`.

## A typical screen

```jsx
<SettleHexRoot>
  <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-10">
    <h1 className="text-3xl font-bold text-slate-800">Open tables</h1>

    <Panel title="Tonight's matches">
      <Banner
        variant="neutral"
        title="Looking for another player"
        body="We'll keep this table ready while you wait."
      />
    </Panel>

    <div className="rounded-xl bg-white/25 p-4 shadow-lg ring-1 ring-white/30 backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-700">
        Next up
      </p>
      <p className="mt-1 text-sm text-slate-600">Winner stays on.</p>
    </div>

    <Button variant="primary" size="lg">Find a table</Button>
  </main>
</SettleHexRoot>
```

## Avoid

Dark backgrounds or `bg-slate-950`-style SaaS defaults · pure black text · sharp corners · grey backgrounds · heavy textures or wood grain · thin/wispy type · new colour hues outside the palette above · other UI libraries (shadcn, MUI) · theatrical animation on ordinary UI — save motion for game moments, keep hover feedback to a slight lift.
