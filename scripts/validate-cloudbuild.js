#!/usr/bin/env node
/* eslint-disable */

// Static validator for cloudbuild.yaml.
//
// Replicates Cloud Build's substitution semantics offline:
//   - Built-in vars: $PROJECT_ID, $COMMIT_SHA, $SHORT_SHA, $LOCATION,
//     $BUILD_ID, $PROJECT_NUMBER, $TRIGGER_NAME, $REVISION_ID,
//     $REPO_NAME, $BRANCH_NAME, $TAG_NAME.
//   - User-defined vars in `substitutions:` (must start with `_`).
//   - Without `options.dynamic_substitutions: true`, built-in vars
//     INSIDE user-defined values are passed through as literals.
//   - With `dynamic_substitutions: true`, they are recursively expanded.
//
// For each step, prints what its `args` and `entrypoint` actually
// resolve to at runtime. Flags any unresolved `$VAR` tokens that
// would cause Cloud Build to reject the config.
//
// Usage:
//   node scripts/validate-cloudbuild.js [path/to/cloudbuild.yaml]

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const CONFIG_PATH = process.argv[2] || 'cloudbuild.yaml';
const ABS = path.resolve(CONFIG_PATH);

if (!fs.existsSync(ABS)) {
  console.error(`✗ File not found: ${ABS}`);
  process.exit(2);
}

const raw = fs.readFileSync(ABS, 'utf8');
let doc;
try {
  doc = yaml.load(raw);
} catch (e) {
  console.error(`✗ YAML parse error: ${e.message}`);
  process.exit(2);
}

// Mock built-in substitutions.
const BUILTINS = {
  PROJECT_ID: 'orkop-job-tracker-485715',
  PROJECT_NUMBER: '544348337713',
  LOCATION: 'us-central1',
  BUILD_ID: 'mock-build-id',
  TRIGGER_NAME: 'jobtracker-main-deploy',
  COMMIT_SHA: 'abc1234567890abc1234567890abc12345678',
  SHORT_SHA: 'abc1234',
  REVISION_ID: 'abc1234567890abc1234567890abc12345678',
  REPO_NAME: 'jobtracker',
  BRANCH_NAME: 'main',
  TAG_NAME: '',
};

const subs = (doc.substitutions || {});
const opts = (doc.options || {});
const dynamic = opts.dynamic_substitutions === true;

// Resolve a substitution map: built-ins → user-defined.
// `dynamic` controls whether built-ins inside user-defined values
// get expanded.
function resolveSubsMap() {
  const all = { ...BUILTINS };
  const subUnresolved = [];
  for (const [k, v] of Object.entries(subs)) {
    if (typeof v !== 'string') {
      console.error(`✗ Substitution \`${k}\` must be a string, got ${typeof v}`);
      process.exit(2);
    }
    if (dynamic) {
      const r = expandTokens(v, BUILTINS);
      all[k] = r.result;
      subUnresolved.push(...r.unresolved);
    } else {
      all[k] = v;
    }
  }
  return { all, subUnresolved };
}

// Expand $X and ${X} tokens given a map of name → value.
// Returns { result, unresolved: [] }.
function expandTokens(input, map) {
  if (typeof input !== 'string') return { result: input, unresolved: [] };
  const unresolved = [];
  // Match either ${X} or $X where X is [A-Z_][A-Z0-9_]*
  const result = input.replace(
    /\$\{([A-Z_][A-Z0-9_]*)\}|\$([A-Z_][A-Z0-9_]*)/g,
    (match, braced, bare) => {
      const name = braced || bare;
      if (Object.prototype.hasOwnProperty.call(map, name)) {
        return map[name];
      }
      unresolved.push(name);
      return match; // leave literal
    }
  );
  return { result, unresolved };
}

// Recursively expand any string in an arbitrary value (string,
// array, or object), collecting unresolved tokens.
function expandDeep(value, map) {
  if (typeof value === 'string') return expandTokens(value, map);
  if (Array.isArray(value)) {
    const out = [];
    const unresolved = [];
    for (const item of value) {
      const r = expandDeep(item, map);
      out.push(r.result);
      unresolved.push(...r.unresolved);
    }
    return { result: out, unresolved };
  }
  if (value && typeof value === 'object') {
    const out = {};
    const unresolved = [];
    for (const [k, v] of Object.entries(value)) {
      const r = expandDeep(v, map);
      out[k] = r.result;
      unresolved.push(...r.unresolved);
    }
    return { result: out, unresolved };
  }
  return { result: value, unresolved: [] };
}

console.log(`\nValidating ${path.relative(process.cwd(), ABS)}\n`);
console.log(`dynamic_substitutions: ${dynamic ? 'true' : 'false (default)'}`);
console.log(`logging option:        ${opts.logging || '(default)'}`);
console.log('');

const { all: fullMap, subUnresolved } = resolveSubsMap();

console.log('--- Resolved substitutions ---');
for (const [k, v] of Object.entries(subs)) {
  console.log(`  $${k}  →  ${fullMap[k]}`);
}
console.log('');

const allUnresolved = new Set(subUnresolved);
const issues = [];

if (Array.isArray(doc.steps)) {
  console.log('--- Resolved steps ---');
  doc.steps.forEach((step, idx) => {
    const id = step.id || `step-${idx}`;
    const name = step.name || '(no image)';
    console.log(`\n[${idx + 1}] ${id}`);
    console.log(`    builder: ${name}`);

    if (step.entrypoint) {
      const r = expandTokens(step.entrypoint, fullMap);
      console.log(`    entrypoint: ${r.result}`);
      r.unresolved.forEach((n) => allUnresolved.add(n));
    }
    if (step.args) {
      const r = expandDeep(step.args, fullMap);
      const argStrs = Array.isArray(r.result) ? r.result : [r.result];
      console.log(`    args:`);
      argStrs.forEach((a) => {
        const lines = String(a).split('\n');
        lines.forEach((l, i) => {
          console.log(`      ${i === 0 ? '|' : ' '} ${l}`);
        });
      });
      r.unresolved.forEach((n) => allUnresolved.add(n));
    }
    if (step.waitFor) {
      console.log(`    waitFor: [${step.waitFor.join(', ')}]`);
    }
  });
}

if (Array.isArray(doc.images) && doc.images.length > 0) {
  console.log('\n--- Resolved images: block ---');
  doc.images.forEach((img) => {
    const r = expandTokens(img, fullMap);
    console.log(`  ${r.result}`);
    r.unresolved.forEach((n) => allUnresolved.add(n));
  });
}

// Validate AR image references
console.log('\n--- Image reference syntax check ---');
const AR_REGEX = /^[a-z0-9-]+-docker\.pkg\.dev\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+(:[A-Za-z0-9_.-]+)?$/;
const seenImages = new Set();
const checkImage = (img, source) => {
  if (seenImages.has(img)) return;
  seenImages.add(img);
  const ok = AR_REGEX.test(img);
  console.log(`  ${ok ? '✓' : '✗'} ${img}    [${source}]`);
  if (!ok) issues.push(`Invalid image reference: ${img} (${source})`);
};

if (doc.steps) {
  for (const step of doc.steps) {
    const tag = step.id || '(unnamed)';
    if (!step.args) continue;
    const r = expandDeep(step.args, fullMap);
    const argStrs = Array.isArray(r.result) ? r.result : [r.result];
    for (let i = 0; i < argStrs.length; i++) {
      const a = String(argStrs[i]);
      // Heuristic: anything containing "docker.pkg.dev/" looks like an AR ref
      if (/docker\.pkg\.dev\//.test(a)) checkImage(a, `step "${tag}" arg ${i}`);
    }
  }
}
if (Array.isArray(doc.images)) {
  for (const img of doc.images) {
    const r = expandTokens(img, fullMap);
    if (/docker\.pkg\.dev\//.test(r.result)) checkImage(r.result, 'images:');
  }
}

console.log('\n--- Verdict ---');
if (allUnresolved.size > 0) {
  console.log(`✗ Unresolved tokens (would fail at Cloud Build runtime):`);
  for (const t of allUnresolved) console.log(`    $${t}`);
}
if (issues.length > 0) {
  console.log(`✗ Issues:`);
  for (const i of issues) console.log(`    ${i}`);
}
if (allUnresolved.size === 0 && issues.length === 0) {
  console.log('✓ All substitutions resolved cleanly. All image refs valid.');
  process.exit(0);
} else {
  process.exit(1);
}
