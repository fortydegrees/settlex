import { useState } from "react";
import { expect, within } from "@storybook/test";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { Panel } from "./Panel";
import { Input } from "./Input";
import { Banner } from "./Banner";
import { BrandWordmark, DisplayText } from "./DisplayText";
import { SegmentedControl } from "./SegmentedControl";
import { typography } from "./theme.cjs";

export const FOUNDATION_SECTIONS = Object.freeze([
  "Color and semantic roles", "Typography hierarchy", "Spacing and density",
  "Radii, borders, glass, and shadows", "Motion tokens", "Layering",
]);

function Section({ title, children }) {
  return <section className="min-w-0"><h2 className="settlex-ui-heading mb-ui-4">{title}</h2>{children}</section>;
}

function SelectorExample() {
  const [value, setValue] = useState('signIn');
  return <SegmentedControl label="Email auth mode sample" options={[{value: 'signIn', label: 'Sign in'}, {value: 'signUp', label: 'Create account'}]} value={value} onValueChange={setValue} />;
}

const meta = {
  title: "Foundations/Visual language",
  excludeStories: ["FOUNDATION_SECTIONS"],
  parameters: { layout: "fullscreen" },
};
export default meta;

export const ProductionVisualLanguage = {
  render: () => (
    <main className="min-h-screen p-ui-5 text-ink-primary md:p-ui-8">
      <div className="mx-auto max-w-5xl space-y-ui-8">
        <header className="max-w-2xl">
          <p className="settlex-ui-label">SettleHex · Clarity</p>
          <h1 className="mt-ui-2 type-page">Production visual language</h1>
          <p className="mt-ui-3 type-body text-ink-secondary">One foundation for the app and Storybook. Type roles include family, size, weight, line height and tracking. Product controls, compact gameplay roles and developer tools use these shared foundations. Board artwork keeps its own geometry.</p>
        </header>
        <Section title={FOUNDATION_SECTIONS[0]}>
          <div className="flex flex-wrap gap-ui-3">
            {["primary", "secondary", "accent", "utility", "danger", "subtle", "ghost"].map((variant) => (
              <Button key={variant} variant={variant}>{variant[0].toUpperCase() + variant.slice(1)}</Button>
            ))}
            <Button disabled sheen>Waiting</Button>
          </div>
        </Section>
        <div className="grid gap-ui-8 md:grid-cols-2">
          <Section title={FOUNDATION_SECTIONS[1]}>
            <div className="settlex-ui-pane space-y-ui-3 p-ui-6">
              <div className="type-title">Find a table</div>
              <div className="settlex-ui-heading">Your next match is ready</div>
              <p className="type-body text-ink-secondary">Clear body copy gives the next action room to lead.</p>
              <div className="type-label text-ink-secondary">Field labels · 14px / 500</div>
              <div className="type-caption text-ink-muted">Quiet metadata · 13px / 500</div>
            </div>
          </Section>
          <Section title={FOUNDATION_SECTIONS[2]}>
            <div className="settlex-ui-inset space-y-ui-3 p-ui-4">
              {[1, 2, 3, 4, 6, 8, 12].map((step) => (
                <div key={step} className="flex items-center gap-ui-4">
                  <code className="w-24 type-caption text-ink-secondary">space-{step}</code>
                  <div className="h-3 rounded-small bg-ink-link" style={{ width: `var(--settlex-ui-space-${step})` }} />
                  <span className="type-caption text-ink-secondary">{step * 4}px</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
        <Section title={FOUNDATION_SECTIONS[3]}>
          <div className="grid gap-ui-4 md:grid-cols-2">
            <Panel title="Pane · off-board">
              <p className="type-body-small text-ink-secondary">88% white · 24px blur · 22px panel corners</p>
              <div className="settlex-ui-inset mt-ui-4 p-ui-3 type-body-small text-ink-secondary">Inset · 8px corners, no second glass shadow</div>
            </Panel>
            <div className="settlex-ui-hud p-ui-6">
              <h3 className="settlex-ui-heading">HUD · over the table</h3>
              <p className="mt-ui-3 type-body-small text-ink-secondary">58% white · 18px blur · the same crisp rim</p>
              <div className="mt-ui-4 flex items-center gap-ui-3">
                <Button variant="secondary" size="sm">14px control</Button>
                <Button variant="utility" size="sm">Utility pill</Button>
              </div>
            </div>
          </div>
        </Section>
        <Section title="Shape follows role">
          <p className="max-w-2xl type-body-small text-ink-secondary">8px icon tiles and small insets · 14px form controls and play actions · 22px panels · fully rounded-small floating utilities and segmented selectors. Primary and secondary actions share their role’s shape; colour conveys emphasis.</p>
        </Section>
        <div className="grid gap-ui-8 md:grid-cols-2">
          <Section title={FOUNDATION_SECTIONS[4]}>
            <div className="space-y-ui-3">
              {[["fast", "140ms · controls"], ["dialog", "220ms · entrance"], ["exit", "160ms · exit"]].map(([token, label]) => (
                <div key={token} className="settlex-ui-inset group flex items-center justify-between p-ui-4">
                  <span className="type-body-small text-ink-secondary">{label}</span>
                  <span className="h-4 w-12 rounded-pill bg-ink-link transition-transform group-hover:-translate-x-6 motion-reduce:transform-none motion-reduce:transition-none" style={{ transitionDuration: `var(--settlex-ui-duration-${token})`, transitionTimingFunction: "var(--settlex-ui-ease-standard)" }} />
                </div>
              ))}
              <p className="settlex-ui-label">Hover to compare. Reduced motion removes travel.</p>
            </div>
          </Section>
          <Section title={FOUNDATION_SECTIONS[5]}>
            <div className="settlex-ui-inset space-y-ui-3 p-ui-4 type-body-small text-ink-secondary">
              <p>Dialog · 80</p><p>Popover · 90</p><p>Tooltip · 100</p><p>Status · 120</p>
              <p className="settlex-ui-label">Shared portals retain their existing focus and dismissal behavior.</p>
            </div>
          </Section>
        </div>
        <Section title="Real control states">
          <div className="grid gap-ui-3 sm:grid-cols-2">
            <Input aria-label="Player name" placeholder="Player name · tab to focus" />
            <Input aria-label="Unavailable player name" value="Waiting for a seat" disabled readOnly />
          </div>
          <Banner className="mt-ui-4" variant="danger" title="Couldn’t rejoin this match" body="Return to the lobby and try again." />
          <div className="mt-ui-4 max-w-md"><SelectorExample /></div>
        </Section>
      </div>
    </main>
  ),
};

export const TypographyRoles = {
  render: () => (
    <main className="min-h-screen p-ui-5 text-ink-primary md:p-ui-8">
      <div className="mx-auto max-w-4xl space-y-ui-6">
        <header><h1 className="type-page">Typography roles</h1><p className="mt-ui-3 type-body text-ink-secondary">Choose one role, not a new size/weight/line-height combination. Heading level remains a semantic choice.</p></header>
        <div className="settlex-ui-pane divide-y divide-edge px-ui-5">
          {Object.entries(typography).filter(([, value]) => value.family !== 'display').map(([role, value]) => (
            <div key={role} className="grid gap-ui-3 py-ui-4 sm:grid-cols-[13rem_1fr] sm:items-center">
              <div><code className="type-caption text-ink-secondary">type-{role}</code><p className="type-caption text-ink-muted">{value.size} size · {value.weight} weight · {value.line} line</p></div>
              <div className={`type-${role}`}>Your next match is ready</div>
            </div>
          ))}
        </div>
        <Panel title="Display is an exception, not the default">
          <div className="space-y-ui-5">
            <div className="settlex-ui-brand-heading"><BrandWordmark /></div>
            <DisplayText variant="celebration">Victory!</DisplayText>
            <DisplayText variant="celebration">You win!</DisplayText>
            <p className="type-body-small text-ink-secondary">The wordmark has its own fitted letter spacing. Celebrations use normal spacing. This partial Black font does not replace Outfit in buttons, forms or player names.</p>
            <DisplayText>Élodie wins!</DisplayText>
            <p className="type-caption text-ink-muted">Unsupported text above falls back entirely to Outfit, avoiding a mixture of letter styles.</p>
          </div>
        </Panel>
      </div>
    </main>
  ),
};

export const TypographyFontInheritance = {
  render: () => (
    <Dialog open onOpenChange={() => {}} title="One UI typeface">
      <p className="type-body">Portal content uses the same loaded font as the app.</p>
      <Button className="mt-ui-4">Continue</Button>
    </Dialog>
  ),
  play: async ({ canvasElement }) => {
    const document = canvasElement.ownerDocument;
    const view = document.defaultView;
    const page = within(document.body);
    const title = await page.findByRole('heading', { name: 'One UI typeface' });
    const bodyFont = view.getComputedStyle(document.body).fontFamily;
    const fontVariable = view.getComputedStyle(document.documentElement).getPropertyValue('--font-outfit').trim();
    await expect(fontVariable).not.toBe('');
    await expect(view.getComputedStyle(title).fontFamily).toBe(bodyFont);
    await expect(view.getComputedStyle(page.getByRole('button', { name: 'Continue' })).fontFamily).toBe(bodyFont);
  },
};
