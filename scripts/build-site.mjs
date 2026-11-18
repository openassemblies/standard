// Stages what https://openassemblies.org/ serves: every version of the record's schema at the path its $id names, its AAS
// submodel template beside it, the aspect model it is generated from at samm/{namespace}/{version}/, an
// index.json listing them, an index.html for people, and nothing else.
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { BASE, NAME, NAMESPACE, RECORD, ROOT, aasFiles, canonical, idOf, load, pathVersion, sammFiles, schemaFiles } from './lib.mjs';
import { publishedVersions } from './versions.mjs';

const SITE = join(ROOT, '_site');
const pkg = load('package.json');
rmSync(SITE, { recursive: true, force: true });
mkdirSync(SITE);

const { conflicts } = publishedVersions();
if (conflicts.length) throw new Error(conflicts.join('\n'));
const stage = (rel) => {
  mkdirSync(dirname(join(SITE, rel)), { recursive: true });
  cpSync(join(ROOT, rel), join(SITE, rel));
};
const semver = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; };

const files = schemaFiles();
const aas = aasFiles();
const samm = sammFiles();
for (const rel of [...files, ...aas, ...samm]) stage(rel);
const entries = files
  .map((rel) => {
    const s = load(rel);
    const v = pathVersion(rel);
    const model = samm.find((t) => t.startsWith(`samm/${NAMESPACE}/${v}/`));
    return {
      $id: idOf(rel),
      title: s.title,
      version: s.version,
      maturity: semver(s.version, '1.0.0') < 0 ? 'draft' : 'stable',
      aasTemplate: idOf(`${RECORD}/${v}/${RECORD}.aas.json`),
      aspectModel: { urn: s['x-samm-aspect-model-urn'].split('#')[0], url: idOf(model) },
    };
  })
  .sort((a, b) => semver(b.version, a.version));
const repository = pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, '');
const shared = load('references.json').documents.filter((d) => d.id === d.url).map((d) => d.url);

writeFileSync(join(SITE, 'index.json'), canonical({ name: `${NAME} standard`, base: BASE, license: pkg.license, repository, schemas: entries, sharedDefinitions: shared }));
writeFileSync(join(SITE, '.nojekyll'), '');
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rows = entries.map((e) => `<tr><td><a href="${esc(e.$id)}">${esc(e.$id.slice(BASE.length))}</a></td><td>${esc(e.title)}</td><td>${esc(e.version)}</td><td>${esc(e.maturity)}</td><td><a href="${esc(e.aasTemplate)}">AAS template</a> · <a href="${esc(e.aspectModel.url)}">aspect model</a></td></tr>`).join('\n');
const sharedRows = shared.map((u) => `<li><a href="${esc(u)}">${esc(u)}</a></li>`).join('\n');
writeFileSync(
  join(SITE, 'index.html'),
  `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(NAME)} standard</title>
<style>
:root{--canvas:#FAFAF8;--ink:#111418;--muted:#5A6270;--rule:#DADDE2;--link:#1F5FBF}
body{font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;margin:0;padding:2.5rem 1rem;color:var(--ink);background:var(--canvas)}
main{max-width:60rem;margin:0 auto}
h1{font-weight:650;font-size:2rem;letter-spacing:-.02em;margin:0 0 .5rem}
.eyebrow{font-family:ui-monospace,monospace;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
table{border-collapse:collapse;width:100%;margin:0 0 2rem}td,th{text-align:left;padding:.4rem .5rem;border-bottom:1px solid var(--rule);vertical-align:top}th{border-bottom:1.5px solid var(--ink);font-size:12px}
a{color:var(--link)}code{font-size:.9em}
@media (prefers-color-scheme:dark){:root{--canvas:#12161D;--ink:#EEF0F3;--muted:#A9B1BF;--rule:#2B323E;--link:#8DB4F2}}
</style>
</head><body><main>
<div class="eyebrow">An open standard for the assembly record</div>
<h1>${esc(NAME)}</h1>
<p>The assembly record: one assembly type or assembly instance: how it is identified, its classes in published systems, the parts it is made of with their quantities and each placed occurrence of them -- with a bent part's bends -- its occurrence property values with their basis, the job that produced it, and the files it is made from. It is defined as a SAMM aspect model, from which its JSON Schema (draft-07) and its Asset Administration Shell submodel template are generated. Each version is served at its own path and never changes; <a href="index.json">index.json</a> lists them. Use a schema by its <code>$id</code>, or vendor <a href="${esc(repository)}">the repository</a> at a commit. ${esc(pkg.license)}.</p>
<h2>Schemas</h2>
<table><thead><tr><th>Schema</th><th>Title</th><th>Version</th><th>Maturity</th><th>Also</th></tr></thead><tbody>
${rows}
</tbody></table>
<h2>Shared definitions</h2>
<p>The record refers to these shared definitions at their pinned, immutable versions.</p>
<ul>
${sharedRows}
</ul>
</main></body></html>
`,
);
console.log(`staged ${files.length} schema(s), ${aas.length} AAS template(s) and ${samm.length} aspect model(s) into _site/`);
