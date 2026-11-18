// The gate every change to the standard passes, in CI and before a release:
// canonical form, $id equals the served URL and names the record's version, closure (a $ref stays in
// https://openassemblies.org/ or names a pinned shared definition), every schema compiles under draft-07, every example
// validates and holds together, public text clean, and no published version changes.
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { BASE, DRAFT7, NAMESPACE, RECORD, ROOT, aasFiles, canonical, idOf, load, pathVersion, read, relOf, sammFiles, schemaFiles } from './lib.mjs';
import { references } from './references.mjs';
import { publishedVersions } from './versions.mjs';

const problems = [];
const fail = (where, msg) => problems.push(`${where}: ${msg}`);

const files = schemaFiles();
const schemas = Object.fromEntries(files.map((rel) => [rel, load(rel)]));
const pointer = (doc, frag) => {
  let node = doc;
  for (const raw of frag.replace(/^\//, '').split('/').filter(Boolean)) {
    const key = decodeURIComponent(raw).replace(/~1/g, '/').replace(/~0/g, '~');
    if (node == null || !(key in node)) return undefined;
    node = node[key];
  }
  return node;
};
const walk = (node, visit, path = []) => {
  if (Array.isArray(node)) node.forEach((v, i) => walk(v, visit, [...path, i]));
  else if (node && typeof node === 'object') {
    visit(node, path);
    for (const [k, v] of Object.entries(node)) walk(v, visit, [...path, k]);
  }
};

// 1. Shape of each file: a record schema lives at {record}/{version}/{record}.schema.json, carries that version,
// and sits beside its AAS submodel template and the aspect model it is generated from.
for (const rel of files) {
  const s = schemas[rel];
  if (read(rel) !== canonical(s)) fail(rel, 'not in canonical form (2-space JSON, UTF-8, trailing newline)');
  if (s.$schema !== DRAFT7) fail(rel, `$schema must be ${DRAFT7}`);
  if (s.$id !== idOf(rel)) fail(rel, `$id must be ${idOf(rel)} (got ${s.$id})`);
  if (!/^\d+\.\d+\.\d+$/.test(s.version || '')) fail(rel, 'version must be semver');
  if (!s.title || !s.description) fail(rel, 'title and description are required');
  const v = pathVersion(rel);
  if (rel !== `${RECORD}/${v}/${RECORD}.schema.json`) fail(rel, `a schema of this standard lives at ${RECORD}/{version}/${RECORD}.schema.json`);
  if (v !== s.version) fail(rel, `version ${s.version} differs from the version its path names (${v})`);
  if (!String(s['x-samm-aspect-model-urn'] || '').startsWith(`urn:samm:${NAMESPACE}:${s.version}#`)) fail(rel, `is not generated from urn:samm:${NAMESPACE}:${s.version}`);
  if (!existsSync(join(ROOT, `${RECORD}/${v}/${RECORD}.aas.json`))) fail(rel, 'has no AAS submodel template beside it');
  if (!sammFiles().some((t) => t.startsWith(`samm/${NAMESPACE}/${v}/`))) fail(rel, `has no aspect model at samm/${NAMESPACE}/${v}/`);
}
for (const t of sammFiles()) if (!files.includes(`${RECORD}/${pathVersion(t)}/${RECORD}.schema.json`)) fail(t, 'an aspect model with no generated schema');
for (const a of aasFiles()) {
  try {
    const aas = load(a);
    if (!JSON.stringify(aas).includes(`urn:samm:${NAMESPACE}:${pathVersion(a)}#`)) fail(a, `does not name urn:samm:${NAMESPACE}:${pathVersion(a)}`);
  } catch (e) {
    fail(a, `is not JSON: ${e.message}`);
  }
}

// 2. Closure: every $ref is local, names a schema of this standard, or names a pinned shared definition at its
// versioned URL (references.json); an unversioned URL of another publisher is refused. Each fragment resolves.
let refs = { base: load('references.json').base, documents: [] };
try {
  refs = await references();
} catch (e) {
  fail('references.json', e.message);
}
const external = new Map(refs.documents.map((d) => [d.id, d.schema]));
const closure = (rel, doc, own) =>
  walk(doc, (node) => {
    if (typeof node.$ref !== 'string') return;
    const [base, frag = ''] = node.$ref.split('#');
    let target;
    if (base === '') target = doc;
    else if (own && relOf(base) !== null) target = schemas[relOf(base)];
    else if (!own || base.startsWith(refs.base)) target = external.get(base);
    else return fail(rel, `$ref leaves ${BASE} other than to a pinned shared definition under ${refs.base}: ${node.$ref}`);
    if (!target) return fail(rel, `$ref names no schema ${own && relOf(base) !== null ? 'in this repository' : 'in references.json'}: ${node.$ref}`);
    if (frag && pointer(target, frag) === undefined) fail(rel, `$ref fragment does not resolve: ${node.$ref}`);
  });
for (const rel of files) closure(rel, schemas[rel], true);
for (const d of refs.documents) closure(`references.json ${d.url}`, d.schema, false);

// 3. Every schema compiles, with the standard's schemas and the pinned shared definitions registered.
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
for (const d of refs.documents) ajv.addSchema(d.schema);
for (const rel of files) ajv.addSchema(schemas[rel]);
const uncompiled = new Set();
for (const rel of files) {
  try {
    ajv.getSchema(idOf(rel));
  } catch (e) {
    uncompiled.add(rel);
    fail(rel, `does not compile: ${e.message}`);
  }
}

// 4. Examples: each is listed in examples/manifest.json against the schema it shows, and validates.
const manifest = load('examples/manifest.json').examples;
const exampleFiles = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const full = join(dir, n);
    return statSync(full).isDirectory() ? exampleFiles(full) : n.endsWith('.json') && n !== 'manifest.json' ? [relative(ROOT, full).split(sep).join('/')] : [];
  });
const listed = new Set(manifest.map((e) => e.example));
for (const ex of exampleFiles(join(ROOT, 'examples'))) if (!listed.has(ex)) fail(ex, 'not listed in examples/manifest.json');
for (const s of files) if (!manifest.some((e) => e.schema === s)) fail(s, 'has no example in examples/manifest.json');
for (const { example, schema } of manifest) {
  if (!existsSync(join(ROOT, example))) { fail(example, 'listed in the manifest but missing'); continue; }
  if (!schemas[schema]) { fail(example, `manifest names no schema ${schema}`); continue; }
  if (uncompiled.has(schema)) continue;
  const instance = load(example);
  if (read(example) !== canonical(instance)) fail(example, 'not in canonical form (2-space JSON, UTF-8, trailing newline)');
  const v = ajv.getSchema(idOf(schema));
  if (v && !v(instance)) fail(example, `fails ${schema}: ${ajv.errorsText(v.errors)}`);
}

// 4b. A record's values hold together: a property value carries one value and its basis, a quantity carries its
// unit, and a bent part's bends are in degrees (DD), each angle over 0 and at most 180, each rotation from 0 up to
// 360, and no more than 360 degrees of bends in one piece (NFPA 70 358.24 and 358.26 for conduit and tubing).
// Each rule is proven on a seeded defect.
const VALUE_KEYS = ['numericValue', 'textValue', 'booleanValue'];
const bendProblems = (bends) => {
  const out = [];
  let total = 0;
  (bends.bendList || []).forEach((b, i) => {
    const a = b.angle || {}, r = b.rotation || {};
    if (a.uom !== 'DD' || r.uom !== 'DD') return out.push(`bend ${i + 1}: angle and rotation are stated in degrees (DD)`);
    if (!(a.value > 0 && a.value <= 180)) out.push(`bend ${i + 1}: angle ${a.value} is not over 0 and at most 180`);
    if (!(r.value >= 0 && r.value < 360)) out.push(`bend ${i + 1}: rotation ${r.value} is not from 0 up to 360`);
    total += a.value;
  });
  if (total > 360) out.push(`bends total ${total} degrees, over 360 in one piece`);
  return out;
};
const recordProblems = (doc) => {
  const out = [];
  walk(doc, (node, path) => {
    const at = `/${path.join('/')}`;
    const present = VALUE_KEYS.filter((k) => k in node);
    if (present.length > 1) out.push(`${at} carries more than one of ${VALUE_KEYS.join(', ')}`);
    if (present.length && !('basis' in node)) out.push(`${at} has a value without its basis`);
    if ('quantity' in node && typeof node.quantity === 'number' && !('uom' in node)) out.push(`${at} has a quantity without its unit`);
    if (node.bends && typeof node.bends === 'object') for (const p of bendProblems(node.bends)) out.push(`${at}/bends ${p}`);
  });
  return out;
};
for (const { example } of manifest) if (existsSync(join(ROOT, example))) for (const p of recordProblems(load(example))) fail(example, p);
{
  const deg = (value, uom = 'DD') => ({ value, uom });
  if (bendProblems({ bendList: [{ rotation: deg(0), angle: deg(90) }, { rotation: deg(180), angle: deg(90) }] }).length) fail('scripts/check.mjs', 'refuses a sound bend sequence');
  const seeded = [
    ['bends over 360 degrees in one piece', bendProblems({ bendList: Array(3).fill({ rotation: deg(0), angle: deg(180) }) })],
    ['a bend of 0 degrees', bendProblems({ bendList: [{ rotation: deg(0), angle: deg(0) }] })],
    ['a bend over 180 degrees', bendProblems({ bendList: [{ rotation: deg(0), angle: deg(190) }] })],
    ['a rotation of 360 degrees', bendProblems({ bendList: [{ rotation: deg(360), angle: deg(30) }] })],
    ['an angle not in degrees', bendProblems({ bendList: [{ rotation: deg(0), angle: deg(1.5, 'C81') }] })],
    ['a value without its basis', recordProblems({ typeProperties: [{ propertyUri: 'https://example.org/p', numericValue: 1, unit: 'MMT' }] })],
    ['a property with two values', recordProblems({ typeProperties: [{ propertyUri: 'https://example.org/p', numericValue: 1, textValue: '1', basis: { kind: 'substituted', source: 'x' } }] })],
    ['a quantity without its unit', recordProblems({ hasPart: [{ materialDefinitionId: 'https://example.org/x', quantity: 2 }] })],
  ];
  for (const [what, found] of seeded) if (!found.length) fail('scripts/check.mjs', `accepts ${what}`);
}

// 5. Public text names the standard and the published standards it relates to, nothing internal to any steward.
const PINNED_HOST = refs.base ? `(?!${refs.base.replace(/^https:\/\/schemas\./, '').replace(/[./]/g, (c) => `\\${c}`)})` : '';
const FORBIDDEN = [
  [/\bd-\d{4}-\d\d-\d\d-[a-z0-9-]+/, 'an internal deliverable or decision id'],
  [/\b(?:FU|RULE|DEC)-[A-Z0-9]+(?:-[A-Z0-9]+)*/, 'an internal follow-up, rule or decision id'],
  [/\bDISPATCH-/, 'an internal work order'],
  // A schema domain other than this standard's own, except a pinned shared definition's versioned URL.
  [new RegExp(`\\bschemas\\.${PINNED_HOST}[a-z0-9-]+(?:\\.[a-z0-9-]+)+`), 'another publisher\'s schema domain other than a pinned shared definition'],
  [/\b[\w./-]+\.(?:py|tsx?|mjs|msg)\b/, 'a code path'],
];
const FORBIDDEN_KEYS = new Set(['x-authoring', '_metadata']);
const LITERAL_KEYS = new Set(['$id', '$ref', '$schema', 'pattern', 'const', 'enum', 'examples', 'default']);
for (const rel of [...files, ...manifest.map((e) => e.example).filter((ex) => existsSync(join(ROOT, ex)))]) {
  walk(load(rel), (node, path) => {
    for (const [k, v] of Object.entries(node)) {
      if (FORBIDDEN_KEYS.has(k)) fail(rel, `carries ${k} at /${[...path, k].join('/')}`);
      if (typeof v !== 'string' || LITERAL_KEYS.has(k)) continue;
      for (const [re, what] of FORBIDDEN) if (re.test(v)) fail(rel, `/${[...path, k].join('/')} names ${what}: "${v.match(re)[0]}"`);
    }
  });
}
for (const rel of ['README.md', 'CHANGELOG.md', ...aasFiles(), ...sammFiles()]) {
  for (const [re, what] of FORBIDDEN.slice(0, 3)) {
    const m = read(rel).match(re);
    if (m) fail(rel, `names ${what}: "${m[0]}"`);
  }
}
for (const [re, what] of FORBIDDEN.slice(3)) {
  const m = read('README.md').match(re);
  if (m) fail('README.md', `names ${what}: "${m[0]}"`);
}

// 6. A published version never changes: new content needs a new version.
let versionCount = 0;
let history = false;
try {
  const r = publishedVersions();
  versionCount = r.published.size;
  history = r.history;
  for (const c of r.conflicts) fail(c.split(':')[0], c.slice(c.indexOf(':') + 2));
} catch (e) {
  fail('history', e.message);
}

if (problems.length) {
  console.error(problems.map((p) => `FAIL ${p}`).join('\n'));
  console.error(`\n${problems.length} problem(s) in ${files.length} schema(s)`);
  process.exit(1);
}
console.log(`PASS ${files.length} schema(s), ${manifest.length} example(s), ${refs.documents.length} pinned shared definition(s), ${versionCount} published file version(s)${history ? '' : ' (no release tag yet: working tree only)'}: canonical, closed under ${BASE} and ${refs.base}, compiled, examples hold, public text clean, versions immutable`);
