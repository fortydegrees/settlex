import { describe, expect, it } from 'vitest';
import { scanSource, compareLedger, createLedger, ledgerGrowth } from './policy.mjs';

describe('design-system policy', () => {
  it('accepts complete roles, semantic colours/shapes and token spacing', () => {
    expect(scanSource('app/example.jsx', '<h2 className="type-title text-ink-primary rounded-control p-ui-6 sm:gap-ui-3 w-full text-center" />')).toEqual([]);
  });
  it('accepts semantic corners on joined edges without allowing arbitrary directional radii', () => {
    expect(scanSource('app/joined.jsx', '<div className="rounded-l-none rounded-r-panel md:rounded-t-control rounded-br-small" />')).toEqual([]);
    expect(scanSource('app/joined.jsx', '<div className="rounded-r-[13px] rounded-t-lg" />').map(issue => issue.kind)).toEqual(['radius', 'radius']);
  });
  it('reports independent type fragments, raw palette, corners and spacing', () => {
    const issues = scanSource('app/example.jsx', '<p className="text-sm font-bold leading-6 tracking-tight text-slate-900 rounded-xl p-5 sm:gap-[13px]" />');
    expect(issues.map(x => x.value)).toEqual(['text-sm', 'font-bold', 'leading-6', 'tracking-tight', 'text-slate-900', 'rounded-xl', 'p-5', 'sm:gap-[13px]']);
  });
  it('checks branches, class maps, template fragments and inline style', () => {
    const issues = scanSource('app/example.jsx', 'const recipe = {active: "text-lg"}; const cls = `px-4 ${active ? "font-bold" : "font-medium"}`; const el = <p style={{fontSize: 18, color: "#fff"}} />;');
    expect(issues.map(x => x.value)).toEqual(expect.arrayContaining(['text-lg', 'px-4', 'font-bold', 'font-medium', 'fontSize:18', 'color:#fff']));
  });
  it('checks CSS declarations, allowing tokens and structural zero/inherit', () => {
    expect(scanSource('app/example.module.css', '.a { padding:0 var(--settlex-ui-space-4); color:inherit; }')).toEqual([]);
    expect(scanSource('app/example.module.css', '.a { font-size:17px; border-radius:12px; color:#123; margin:7px; }')).toHaveLength(4);
  });
  it('rejects unknown tokens and split typography even when values reference tokens', () => {
    expect(scanSource('app/example.jsx', '<p className="type-made-up p-ui-99" />')).toHaveLength(2);
    expect(scanSource('app/example.module.css', '.a { font-size:var(--settlex-ui-type-body-size); }')).toHaveLength(1);
  });
  it('rejects misspelled semantic colours instead of silently emitting no CSS', () => {
    const issues = scanSource('app/example.jsx', '<div className="text-ink-nonsense hover:bg-ui-surface-inset border-edge-missing ring-decoration-missing" />');
    expect(issues.map(issue => [issue.kind, issue.value])).toEqual([
      ['unknown-token', 'text-ink-nonsense'], ['unknown-token', 'hover:bg-ui-surface-inset'],
      ['unknown-token', 'border-edge-missing'], ['unknown-token', 'ring-decoration-missing'],
    ]);
    expect(scanSource('app/example.css', '.a { @apply bg-surface-inset text-ink-primary border-edge ring-decoration-ring; }')).toEqual([]);
  });
  it('rejects opacity modifiers that the variable-backed semantic palette cannot emit', () => {
    const issues = scanSource('app/example.jsx', '<div className="text-ink-primary/garbage bg-surface-inset/50 ring-decoration-ring/[.5] border-edge/" />');
    expect(issues.map(issue => issue.kind)).toEqual(['unknown-token', 'unknown-token', 'unknown-token', 'unknown-token']);
  });
  it('enforces semantic native-control accents', () => {
    expect(scanSource('app/example.jsx', '<input type="range" className="accent-ink-positive" />')).toEqual([]);
    expect(scanSource('app/example.jsx', '<input className="accent-lime-500 accent-ink-typo accent-[#123]" />').map(issue => issue.kind)).toEqual(['palette', 'unknown-token', 'arbitrary-style']);
  });
  it('checks CSS utility composition and blocks redefining foundation roles locally', () => {
    expect(scanSource('app/example.module.css', '.a { @apply type-title text-ink-primary p-ui-4; }')).toEqual([]);
    expect(scanSource('app/example.module.css', '.a { @apply text-xl font-bold; --settlex-ui-type-title-size: 27px; }')).toHaveLength(3);
  });
  it('blocks static inline and object-based foundation overrides', () => {
    const issues = scanSource('app/example.jsx', `const styles = { '--settlex-ui-font-ui': 'serif', ['--settlex-ui-space-4']: '99px' }; const el = <h2 className="type-title" style={{ '--settlex-ui-type-title-size': '90px', '--settlex-ui-radius-panel': '0px' }} />;`);
    expect(issues.map(issue => [issue.kind, issue.value])).toEqual([
      ['foundation-override', '--settlex-ui-font-ui'],
      ['foundation-override', '--settlex-ui-space-4'],
      ['foundation-override', '--settlex-ui-type-title-size'],
      ['foundation-override', '--settlex-ui-radius-panel'],
    ]);
    expect(scanSource('app/example.jsx', '<div style={{ "--piece-x": position }} />')).toEqual([]);
  });
  it('does not allow a changed migration ledger to hide new violations', () => {
    expect(ledgerGrowth({ old: 1 }, { old: 2 })).toEqual([]);
    expect(ledgerGrowth({ old: 3, new: 1 }, { old: 2 })).toEqual(['old', 'new']);
  });
  it('does not mistake alignment, layout, URLs or ordinary prose for styling', () => {
    expect(scanSource('app/example.jsx', 'const title = "Hello, friend."; const url = "https://example.com/text-sm"; const el = <div className="text-center flex grid-cols-2 w-12 h-12 mt-auto p-0" />;')).toEqual([]);
  });
  it('does not mistake an identity payload for an inline CSS colour', () => {
    expect(scanSource('app/example.jsx', 'const payload = { color: normalizeColor(color) };')).toEqual([]);
    expect(scanSource('app/example.jsx', '<p style={{color: getColor(player)}} />')).toHaveLength(1);
  });
  it('reports malformed source rather than silently skipping it', () => {
    expect(() => scanSource('app/example.jsx', '<div')).toThrow();
  });
  it('blocks growth and substitutions while identifying removable debt', () => {
    const original = scanSource('app/old.jsx', '<p className="text-sm"/>');
    const ledger = createLedger(original);
    expect(compareLedger(original, ledger)).toEqual({ added: [], stale: [] });
    expect(compareLedger(scanSource('app/old.jsx', '<p className="text-lg"/>'), ledger).added).toHaveLength(1);
    expect(compareLedger([...original, ...original], ledger).added).toHaveLength(1);
    expect(compareLedger([], ledger).stale).toHaveLength(1);
    expect(compareLedger(scanSource('app/new.jsx', '<p className="text-sm"/>'), ledger).added).toHaveLength(1);
  });
});
