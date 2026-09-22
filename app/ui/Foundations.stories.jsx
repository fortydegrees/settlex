import { Button } from "./Button";
import { Panel } from "./Panel";
import { Input } from "./Input";
import { Banner } from "./Banner";

export const FOUNDATION_SECTIONS = Object.freeze([
  "Color and semantic roles", "Typography hierarchy", "Spacing and density",
  "Radii, borders, glass, and shadows", "Motion tokens", "Layering",
]);

function Section({ title, children }) {
  return <section className="min-w-0"><h2 className="settlex-ui-heading mb-4">{title}</h2>{children}</section>;
}

const meta = {
  title: "Foundations/Visual language",
  excludeStories: ["FOUNDATION_SECTIONS"],
  parameters: { layout: "fullscreen" },
};
export default meta;

export const ProductionVisualLanguage = {
  render: () => (
    <main className="min-h-screen p-5 text-slate-900 md:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="max-w-2xl">
          <p className="settlex-ui-label">SettleHex · Clarity</p>
          <h1 className="mt-2 text-[28px] font-bold">Production visual language</h1>
          <p className="mt-3 text-[15px] leading-6 text-slate-600">Bright glass, clear roles and a small shared rhythm. Every sample uses production tokens and controls.</p>
        </header>
        <Section title={FOUNDATION_SECTIONS[0]}>
          <div className="flex flex-wrap gap-3">
            {["primary", "secondary", "accent", "danger", "subtle", "ghost"].map((variant) => (
              <Button key={variant} variant={variant}>{variant[0].toUpperCase() + variant.slice(1)}</Button>
            ))}
            <Button disabled sheen>Waiting</Button>
          </div>
        </Section>
        <div className="grid gap-8 md:grid-cols-2">
          <Section title={FOUNDATION_SECTIONS[1]}>
            <div className="settlex-ui-pane space-y-3 p-6">
              <div className="text-2xl font-bold">Find a table</div>
              <div className="settlex-ui-heading">Your next match is ready</div>
              <p className="text-[15px] leading-6 text-slate-600">Clear body copy gives the next action room to lead.</p>
              <div className="settlex-ui-label">Supporting labels · 13px / 500</div>
              <div className="text-xs text-slate-500">Quiet metadata · 12px</div>
            </div>
          </Section>
          <Section title={FOUNDATION_SECTIONS[2]}>
            <div className="settlex-ui-inset space-y-3 p-4">
              {[1, 2, 3, 4, 6, 8, 12].map((step) => (
                <div key={step} className="flex items-center gap-4">
                  <code className="w-24 text-xs text-slate-600">space-{step}</code>
                  <div className="h-3 rounded bg-blue-500" style={{ width: `var(--settlex-ui-space-${step})` }} />
                  <span className="text-xs text-slate-600">{step * 4}px</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
        <Section title={FOUNDATION_SECTIONS[3]}>
          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Pane · off-board">
              <p className="text-sm leading-6 text-slate-600">88% white · 24px blur · 22px panel corners</p>
              <div className="settlex-ui-inset mt-4 p-3 text-sm text-slate-600">Inset · 8px corners, no second glass shadow</div>
            </Panel>
            <div className="settlex-ui-hud p-6">
              <h3 className="settlex-ui-heading">HUD · over the table</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">58% white · 18px blur · the same crisp rim</p>
              <div className="mt-4 flex items-center gap-3">
                <Button variant="secondary" size="sm">14px control</Button>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-xs font-medium">Pill</span>
              </div>
            </div>
          </div>
        </Section>
        <div className="grid gap-8 md:grid-cols-2">
          <Section title={FOUNDATION_SECTIONS[4]}>
            <div className="space-y-3">
              {[["fast", "140ms · controls"], ["dialog", "220ms · entrance"], ["exit", "160ms · exit"]].map(([token, label]) => (
                <div key={token} className="settlex-ui-inset group flex items-center justify-between p-4">
                  <span className="text-sm text-slate-600">{label}</span>
                  <span className="h-4 w-12 rounded-full bg-blue-500 transition-transform group-hover:-translate-x-6 motion-reduce:transform-none motion-reduce:transition-none" style={{ transitionDuration: `var(--settlex-ui-duration-${token})`, transitionTimingFunction: "var(--settlex-ui-ease-standard)" }} />
                </div>
              ))}
              <p className="settlex-ui-label">Hover to compare. Reduced motion removes travel.</p>
            </div>
          </Section>
          <Section title={FOUNDATION_SECTIONS[5]}>
            <div className="settlex-ui-inset space-y-3 p-4 text-sm text-slate-600">
              <p>Dialog · 80</p><p>Popover · 90</p><p>Tooltip · 100</p><p>Status · 120</p>
              <p className="settlex-ui-label">Shared portals retain their existing focus and dismissal behavior.</p>
            </div>
          </Section>
        </div>
        <Section title="Real control states">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input aria-label="Player name" placeholder="Player name · tab to focus" />
            <Input aria-label="Unavailable player name" value="Waiting for a seat" disabled readOnly />
          </div>
          <Banner className="mt-4" variant="danger" title="Couldn’t rejoin this match" body="Return to the lobby and try again." />
        </Section>
      </div>
    </main>
  ),
};
