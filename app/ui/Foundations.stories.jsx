import { Banner } from "./Banner";
import { Button } from "./Button";
import { Panel } from "./Panel";

export const FOUNDATION_SECTIONS = Object.freeze([
  "Color and semantic roles",
  "Typography hierarchy",
  "Spacing and density",
  "Radii, borders, glass, and shadows",
  "Motion tokens",
  "Layering",
]);

const MOTION_TOKENS = Object.freeze([
  "--settlex-ui-duration-fast",
  "--settlex-ui-duration-dialog",
  "--settlex-ui-ease-standard",
  "--settlex-ui-ease-bounce",
]);

function Section({ title, children }) {
  return (
    <Panel className="p-0" bodyClassName="p-5 md:p-6">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-700">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </Panel>
  );
}

function MotionToken({ name }) {
  const isDuration = name.includes("duration");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <code className="text-xs text-slate-700">{name}</code>
      <div
        className="mt-2 h-2 w-20 rounded-full bg-sky-500 transition-transform hover:translate-x-8 motion-reduce:transition-none"
        style={{
          transitionDuration: isDuration
            ? `var(${name})`
            : "var(--settlex-ui-duration-fast)",
          transitionTimingFunction: isDuration
            ? "var(--settlex-ui-ease-standard)"
            : `var(${name})`,
        }}
      />
    </div>
  );
}

const LAYERS = Object.freeze([
  [
    "Dialog",
    "--settlex-ui-z-dialog",
    "rounded-[1.65rem] border border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(239,246,255,0.76))] p-3 shadow-[0_34px_90px_-44px_rgba(15,23,42,0.72)]",
  ],
  [
    "Popover",
    "--settlex-ui-z-popover",
    "rounded-[1.35rem] border border-white/34 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(219,234,254,0.82))] p-3 shadow-[0_24px_52px_-32px_rgba(15,23,42,0.52)] backdrop-blur-xl",
  ],
  [
    "Tooltip",
    "--settlex-ui-z-tooltip",
    "rounded-[0.85rem] border border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(219,234,254,0.86))] px-3 py-1.5 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.52)] backdrop-blur-xl",
  ],
]);

const meta = {
  title: "Foundations/Visual language",
  excludeStories: ["FOUNDATION_SECTIONS"],
  parameters: { layout: "fullscreen" },
};

export default meta;

export const ProductionVisualLanguage = {
  render: () => (
    <main className="min-h-screen p-5 text-slate-900 md:p-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-700">
            SettleHex shared layer
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            Production visual language
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            These samples reuse the colors, proportions, motion, and layer tokens
            that the shared UI components already ship with.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-2">
          <Section title={FOUNDATION_SECTIONS[0]}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ["Primary action", "primary"],
                ["Secondary glass", "secondary"],
                ["Accent action", "accent"],
                ["Danger action", "danger"],
                ["Quiet metadata", "subtle"],
                ["Ghost action", "ghost"],
              ].map(([label, variant]) => (
                <Button key={variant} variant={variant} className="w-full">
                  {label}
                </Button>
              ))}
            </div>
          </Section>

          <Section title={FOUNDATION_SECTIONS[1]}>
            <div className="space-y-3">
              <div className="text-3xl font-bold text-slate-900">Find a table</div>
              <div className="text-base font-semibold text-slate-900">Your next match is ready.</div>
              <p className="text-sm leading-6 text-slate-700">
                Shared UI copy stays direct, readable, and below gameplay actions in visual weight.
              </p>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-700">
                Quiet metadata
              </div>
            </div>
          </Section>

          <Section title={FOUNDATION_SECTIONS[2]}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Panel title="Panel density" bodyClassName="p-5">
                <p className="text-sm text-slate-700">Shared content starts at the Panel’s production `p-5` density.</p>
              </Panel>
              <Banner
                title="Banner density"
                body="Feedback keeps its production `px-4` and `py-3` rhythm."
              />
            </div>
          </Section>

          <Section title={FOUNDATION_SECTIONS[3]}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Panel title="Panel glass">
                <p className="text-sm text-slate-700">Real `Panel` radius, border, glass, and shadow.</p>
              </Panel>
              <Banner
                variant="danger"
                title="Banner surface"
                body="Real `Banner` danger treatment, including its production indicator."
              />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.65rem] border border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(239,246,255,0.76))] p-6 shadow-[0_34px_90px_-44px_rgba(15,23,42,0.72)]">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Dialog popup recipe</div>
                <div className="mt-2 text-sm text-slate-700">Exact `Dialog.js` popup surface.</div>
              </div>
              <div className="rounded-[1.35rem] border border-white/34 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(219,234,254,0.82))] p-3 shadow-[0_24px_52px_-32px_rgba(15,23,42,0.52)] backdrop-blur-xl">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Popover popup recipe</div>
                <div className="mt-2 text-sm text-slate-700">Exact `Popover.js` popup surface.</div>
              </div>
            </div>
          </Section>

          <Section title={FOUNDATION_SECTIONS[4]}>
            <div className="grid gap-3 sm:grid-cols-2">
              {MOTION_TOKENS.map((name) => <MotionToken key={name} name={name} />)}
            </div>
          </Section>

          <Section title={FOUNDATION_SECTIONS[5]}>
            <Panel className="relative h-48">
              {LAYERS.map(([label, token, recipeClassName], index) => (
                <div
                  key={token}
                  className={`absolute text-xs font-semibold text-slate-700 ${recipeClassName}`}
                  style={{ right: `${1 + index * 1.1}rem`, top: `${1 + index * 1.45}rem`, zIndex: `var(${token})` }}
                >
                  {label} layer
                </div>
              ))}
            </Panel>
          </Section>
        </div>
      </div>
    </main>
  ),
};
