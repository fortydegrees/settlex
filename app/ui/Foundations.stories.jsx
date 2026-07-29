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
    <section className="rounded-[1.6rem] border border-white/34 bg-white/18 p-5 shadow-[0_24px_54px_-34px_rgba(15,23,42,0.44)] backdrop-blur-xl md:p-6">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-700">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
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
  ["Dialog", "--settlex-ui-z-dialog", "settlex-ui-layer-dialog"],
  ["Popover", "--settlex-ui-z-popover", "settlex-ui-layer-popover"],
  ["Tooltip", "--settlex-ui-z-tooltip", "settlex-ui-layer-tooltip"],
  ["Status", "--settlex-ui-z-status", "settlex-ui-layer-status"],
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
                ["Primary action", "border-lime-200/65 bg-lime-500 text-white"],
                ["Secondary glass", "border-white/45 bg-white/90 text-slate-900"],
                ["Accent action", "border-amber-200/75 bg-amber-400 text-slate-900"],
                ["Danger action", "border-rose-200/70 bg-rose-500 text-white"],
                ["Neutral status", "border-white/44 bg-sky-100 text-slate-900"],
                ["Quiet metadata", "border-white/35 bg-white/14 text-slate-700"],
              ].map(([label, className]) => (
                <div key={label} className={`rounded-[1.2rem] border p-4 text-sm font-semibold shadow-[0_16px_32px_-24px_rgba(15,23,42,0.34)] ${className}`}>
                  {label}
                </div>
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
            <div className="flex flex-wrap items-end gap-3">
              {["p-3", "p-4", "p-5", "p-6"].map((token, index) => (
                <div key={token} className="rounded-[1.1rem] border border-white/36 bg-white/70 shadow-[0_14px_26px_-22px_rgba(15,23,42,0.5)]">
                  <div className={["p-3", "p-4", "p-5", "p-6"][index]}>
                    <code className="text-xs text-slate-700">{token}</code>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title={FOUNDATION_SECTIONS[3]}>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.1rem] border border-white/36 bg-white/80 p-4 shadow-[0_14px_26px_-22px_rgba(15,23,42,0.5)]">
                Field control
              </div>
              <div className="rounded-[1.35rem] border border-white/34 bg-white/30 p-4 shadow-[0_24px_52px_-32px_rgba(15,23,42,0.52)] backdrop-blur-xl">
                Popover glass
              </div>
              <div className="rounded-[1.65rem] border border-white/40 bg-white/90 p-4 shadow-[0_34px_90px_-44px_rgba(15,23,42,0.72)]">
                Dialog surface
              </div>
            </div>
          </Section>

          <Section title={FOUNDATION_SECTIONS[4]}>
            <div className="grid gap-3 sm:grid-cols-2">
              {MOTION_TOKENS.map((name) => <MotionToken key={name} name={name} />)}
            </div>
          </Section>

          <Section title={FOUNDATION_SECTIONS[5]}>
            <div className="relative h-48 rounded-[1.35rem] border border-white/34 bg-sky-100/50 p-4">
              {LAYERS.map(([label, token, className], index) => (
                <div
                  key={token}
                  className={`${className} absolute rounded-xl border border-white/60 bg-white/86 px-3 py-2 text-xs font-semibold text-slate-700 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.52)]`}
                  style={{ right: `${1 + index * 1.1}rem`, top: `${1 + index * 1.45}rem`, zIndex: `var(${token})` }}
                >
                  {label}
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </main>
  ),
};
