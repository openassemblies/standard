// Every file of every version the standard has published, read from git history since the first release
// tag, plus the working tree. A version's files live at paths that name it ({record}/{version}/...,
// samm/{namespace}/{version}/...), and once published they never change and are never removed: new
// content is a new version. Before the first release tag exists, or outside a git clone, only the working
// tree counts as published.
import { execFileSync } from 'node:child_process';
import { NOT_SCHEMAS, ROOT, aasFiles, pathVersion, read, sammFiles, schemaFiles } from './lib.mjs';

export const SINCE = 'v0.3.1';

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 });
const isVersioned = (rel) =>
  pathVersion(rel) !== null && (rel.startsWith('samm/') ? rel.endsWith('.ttl') : !NOT_SCHEMAS.has(rel.split('/')[0]) && /\.(schema|aas)\.json$/.test(rel));

/** { published: Map<path, {rel, version, text, from}>, conflicts: string[], history: boolean } */
export function publishedVersions() {
  let commits = [];
  let history = false;
  try {
    git('rev-parse', '--verify', '--quiet', `${SINCE}^{commit}`);
    commits = [git('rev-parse', `${SINCE}^{commit}`).trim(), ...git('rev-list', '--reverse', '--first-parent', `${SINCE}..HEAD`).split('\n').filter(Boolean)];
    history = true;
  } catch {
    commits = [];
  }
  const states = commits.map((c) => ({
    from: c.slice(0, 12),
    files: git('ls-tree', '-r', '--name-only', c).split('\n').filter(isVersioned).map((rel) => [rel, git('show', `${c}:${rel}`)]),
  }));
  const working = [...schemaFiles(), ...aasFiles(), ...sammFiles()].filter(isVersioned);
  states.push({ from: 'working tree', files: working.map((rel) => [rel, read(rel)]) });

  const published = new Map();
  const conflicts = [];
  for (const { from, files } of states) {
    for (const [rel, text] of files) {
      const seen = published.get(rel);
      if (!seen) published.set(rel, { rel, version: pathVersion(rel), text, from });
      else if (seen.text !== text) conflicts.push(`${rel}: version ${pathVersion(rel)} changed after it was published (published at ${seen.from}, differs at ${from}); new content is a new version`);
    }
  }
  for (const rel of published.keys()) if (!working.includes(rel)) conflicts.push(`${rel}: a published version was removed; every published version stays served`);
  return { published, conflicts: [...new Set(conflicts)], history };
}
