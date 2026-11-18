// Shared by check and build-site: what the standard is, read from the tree.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const BASE = 'https://openassemblies.org/';
export const NAME = 'Open Assemblies';
export const RECORD = 'assembly-record';
export const NAMESPACE = 'org.openassemblies.assembly-record';
export const DRAFT7 = 'http://json-schema.org/draft-07/schema#';

// Never part of the served standard: tooling, fixtures, build output. samm/ holds the aspect models the
// record's files are generated from; build-site serves them, but they are not schemas.
export const NOT_SCHEMAS = new Set(['.git', '.github', 'node_modules', 'examples', 'scripts', 'samm', '_site']);

const walkFiles = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walkFiles(full) : [relative(ROOT, full).split(sep).join('/')];
  });

/** Every file of the standard under the given top-level directories, as sorted posix paths. */
const filesUnder = (pred) =>
  readdirSync(ROOT)
    .filter((name) => !NOT_SCHEMAS.has(name) && statSync(join(ROOT, name)).isDirectory())
    .flatMap((name) => walkFiles(join(ROOT, name)))
    .filter(pred)
    .sort();

/** Every *.schema.json in the standard. */
export const schemaFiles = () => filesUnder((rel) => rel.endsWith('.schema.json'));

/** Every AAS submodel template (*.aas.json) in the standard. */
export const aasFiles = () => filesUnder((rel) => rel.endsWith('.aas.json'));

/** Every SAMM aspect model, as samm/{namespace}/{version}/{Aspect}.ttl. */
export const sammFiles = () => (existsSync(join(ROOT, 'samm')) ? walkFiles(join(ROOT, 'samm')) : []).filter((rel) => rel.endsWith('.ttl')).sort();

/** The version a path names: {record}/{version}/... or samm/{namespace}/{version}/...; null for an unversioned path. */
export function pathVersion(rel) {
  const parts = rel.split('/');
  const v = parts[0] === 'samm' ? parts[2] : parts[1];
  return /^\d+\.\d+\.\d+$/.test(v || '') ? v : null;
}

export const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
export const load = (rel) => JSON.parse(read(rel));
export const canonical = (value) => JSON.stringify(value, null, 2) + '\n';
export const idOf = (rel) => BASE + rel;
export const relOf = (id) => (id.startsWith(BASE) ? id.slice(BASE.length) : null);
