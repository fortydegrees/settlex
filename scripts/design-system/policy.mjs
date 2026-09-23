import ts from 'typescript';
import postcss from 'postcss';
import theme from '../../app/ui/theme.cjs';

const styleProperties = /^(font(Size|Weight|Family)?|lineHeight|letterSpacing|color|backgroundColor|borderRadius|padding(?:Top|Right|Bottom|Left|Inline|Block)?|margin(?:Top|Right|Bottom|Left|Inline|Block)?|gap|rowGap|columnGap)$/;
const cssProperties = /^(font(?:-size|-weight|-family)?|line-height|letter-spacing|color|background-color|border-radius|padding(?:-.+)?|margin(?:-.+)?|gap|row-gap|column-gap)$/;
const safeValue = value => /^(0|auto|inherit|initial|unset|normal|currentColor|transparent)$/.test(value) || /^var\(--settlex-/.test(value) || value.split(/\s+/).every(part => part === '0' || /^var\(--settlex-[\w-]+\)$/.test(part));
const semanticColours = new Set(Object.entries(theme.colourUtilities).flatMap(([family, entries]) =>
  Object.keys(entries).map(name => name === 'DEFAULT' ? family : `${family}-${name}`)));

function utilityBase(token) {
  let depth = 0, start = 0;
  for (let i = 0; i < token.length; i += 1) {
    if (token[i] === '[' || token[i] === '(') depth += 1;
    if (token[i] === ']' || token[i] === ')') depth -= 1;
    if (token[i] === ':' && depth === 0) start = i + 1;
  }
  return token.slice(start).replace(/^!/, '');
}

function category(token) {
  const base = utilityBase(token);
  if (/^type-/.test(base) && !Object.hasOwn(theme.typography, base.slice(5))) return 'unknown-token';
  const spacing = base.match(/^-?(?:p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy])-ui-(.+)$/);
  if (spacing && !Object.hasOwn(theme.spaces, spacing[1])) return 'unknown-token';
  const colour = base.match(/^(?:text|bg|border|ring|fill|stroke|accent)-((?:ui-)?(?:ink|surface|decoration|edge)(?:-[\w-]+)?)(\/.*)?$/);
  // These palette values are full CSS colours, not channel tuples with an
  // alpha placeholder. Tailwind emits no slash-opacity utility for them.
  if (colour && (!semanticColours.has(colour[1]) || colour[2])) return 'unknown-token';
  if (/^(text-(?:xs|sm|base|lg|[2-9]?xl)(?:\/.*)?|font-(?:sans|serif|mono|thin|extralight|light|normal|medium|semibold|bold|extrabold|black)|leading-.+|tracking-.+)$/.test(base)) return 'type';
  if (/^(text|bg|border|ring|fill|stroke|accent)-(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+)(?:\/.*)?$/.test(base)) return 'palette';
  if (/^rounded(?:-.+)?$/.test(base) && !/^rounded-(?:(?:[trblse]|tl|tr|bl|br|ss|se|es|ee)-)?(?:small|control|panel|pill|none|\[inherit\])$/.test(base) && !base.includes('var(--settlex-')) return 'radius';
  if (/^-?(?:p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy])-(?:\d[^\s]*|\[.+\])$/.test(base) && !/-(?:0|\[var\(--settlex-.+)$/.test(base)) return 'spacing';
  if (/^(?:text|font|leading|tracking|bg|border|ring|fill|stroke|accent)-\[/.test(base) && !base.includes('var(--settlex-')) return 'arbitrary-style';
  return null;
}

// Inspect real parsed source (including recipe maps/conditional classes), not
// source-grep tests of production markup. Fixture tests exercise this contract.
export function scanSource(file, source) {
  const issues = [];
  const add = (kind, value, line) => issues.push({ file, kind, value, line });
  if (file.endsWith('.css')) {
    const ast = postcss.parse(source, { from: file });
    ast.walkAtRules('apply', rule => {
      for (const token of rule.params.split(/\s+/)) {
        const kind = category(token);
        if (kind) add(kind, token, rule.source.start.line);
      }
    });
    ast.walkDecls(decl => {
      if (/^--settlex-ui-(?:type|font|space|radius)-/.test(decl.prop)) add('foundation-override', decl.prop, decl.source.start.line);
      const splitType = /^(font.*|line-height|letter-spacing)$/.test(decl.prop) && !['inherit', '0'].includes(decl.value);
      if (cssProperties.test(decl.prop) && (splitType || !safeValue(decl.value))) add('css', `${decl.prop}:${decl.value}`, decl.source.start.line);
    });
    return issues;
  }
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  if (ast.parseDiagnostics.length) throw new Error(`${file}: ${ts.flattenDiagnosticMessageText(ast.parseDiagnostics[0].messageText, '\n')}`);
  function visit(node) {
    const line = ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
    if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      for (const token of node.text.split(/\s+/)) {
        const kind = category(token);
        if (kind) add(kind, token, line);
      }
    }
    if (ts.isPropertyAssignment(node)) {
      const name = ts.isComputedPropertyName(node.name) && ts.isStringLiteralLike(node.name.expression)
        ? node.name.expression.text : node.name.text;
      if (/^--settlex-ui-(?:type|font|space|radius)-/.test(name)) add('foundation-override', name, line);
      const value = ts.isStringLiteralLike(node.initializer) ? node.initializer.text : node.initializer.getText(ast);
      const splitType = /^(font.*|lineHeight|letterSpacing)$/.test(name) && !['inherit', '0'].includes(value);
      let ancestor = node.parent;
      while (ancestor && !ts.isJsxAttribute(ancestor) && !ts.isStatement(ancestor)) ancestor = ancestor.parent;
      const inStyleAttribute = ancestor && ts.isJsxAttribute(ancestor) && ancestor.name.text === 'style';
      // A dynamic `color` in a domain payload is not CSS. Literal palette
      // choices and actual inline styles remain checked.
      const isDomainColour = /^(color|backgroundColor)$/.test(name) && !ts.isStringLiteralLike(node.initializer) && !inStyleAttribute;
      if (!isDomainColour && styleProperties.test(name) && (splitType || !safeValue(value))) add('inline-style', `${name}:${value}`, line);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return issues;
}

const keyFor = issue => `${issue.file} | ${issue.kind} | ${issue.value}`;
export function createLedger(issues) {
  const ledger = {};
  for (const issue of issues) ledger[keyFor(issue)] = (ledger[keyFor(issue)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(ledger).sort(([a], [b]) => a.localeCompare(b)));
}

export function compareLedger(issues, ledger) {
  const current = createLedger(issues);
  return {
    added: Object.entries(current).filter(([key, count]) => count > (ledger[key] ?? 0)).map(([key, count]) => ({ key, count: count - (ledger[key] ?? 0) })),
    stale: Object.entries(ledger).filter(([key, count]) => count > (current[key] ?? 0)).map(([key, count]) => ({ key, count: count - (current[key] ?? 0) })),
  };
}

export function ledgerGrowth(current, previous) {
  return Object.keys(current).filter(key => current[key] > (previous[key] ?? 0));
}
