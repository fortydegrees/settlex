import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { scanSource, compareLedger, createLedger, ledgerGrowth } from './policy.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// The material/interaction recipe owner is intentionally allowed literal
// palette and effect values. Ordinary consumers are never exempt by directory.
const owners = new Set([
  'app/globals.css',
  // Explicitly approved logo fitting and responsive lockup, not general UI type.
  'app/catana/home/HomeBrand.module.css',
]);
async function scan(directory) {
  const result = [];
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    const file = `${directory}/${entry.name}`;
    if (entry.isDirectory()) result.push(...await scan(file));
    else if (/\.(?:[jt]sx?|css)$/.test(file) && !/\.(?:test|stories)\.[jt]sx?$/.test(file) && !owners.has(file)) {
      result.push(...scanSource(file, await readFile(path.join(root, file), 'utf8')));
    }
  }
  return result;
}

const issues = await scan('app');
// Inspection only: this cannot silently update the accepted ledger.
if (process.argv.includes('--inventory')) {
  console.log(JSON.stringify(createLedger(issues), null, 2));
} else {
  const ledger = JSON.parse(await readFile(path.join(root, 'scripts/design-system/legacy-styles.json'), 'utf8'));
  const base = process.env.UI_POLICY_BASE;
  if (base) {
    if (!/^[a-f0-9]{40}$/.test(base)) throw new Error('UI_POLICY_BASE must be a full commit SHA');
    execFileSync('git', ['cat-file', '-e', `${base}^{commit}`], { cwd: root });
    const exists = spawnSync('git', ['cat-file', '-e', `${base}:scripts/design-system/legacy-styles.json`], { cwd: root });
    if (exists.status === 0) {
      const previous = JSON.parse(execFileSync('git', ['show', `${base}:scripts/design-system/legacy-styles.json`], { cwd: root, encoding: 'utf8' }));
      const growth = ledgerGrowth(ledger, previous);
      if (growth.length) {
        console.error('The migration ledger may only shrink. New exceptions need an explicit policy review, not a regenerated baseline.');
        for (const key of growth) console.error(`LEDGER GROWTH: ${key}`);
        process.exitCode = 1;
      }
    } else {
      console.log('First adoption: base commit has no migration ledger; review the initial inventory in this change.');
    }
  }
  const { added, stale } = compareLedger(issues, ledger);
  for (const issue of added) console.error(`NEW (+${issue.count}): ${issue.key}`);
  for (const issue of stale) console.error(`REMOVE FROM LEDGER (-${issue.count}): ${issue.key}`);
  if (added.length || stale.length) {
    console.error('UI policy failed. Use a complete type role, semantic colour/shape or ui spacing token. Remove resolved ledger entries; do not regenerate it to accept new debt.');
    process.exitCode = 1;
  } else if (!process.exitCode) {
    console.log(`UI policy passed: no new drift; ${issues.length} legacy occurrences across ${new Set(issues.map(issue => issue.file)).size} files remain explicitly tracked.`);
  }
}
