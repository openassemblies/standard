// The shared definitions the records $ref outside their own namespace (references.json): each fetched from
// its immutable versioned URL, refused unless its bytes have the pinned SHA-256, and resolved at its id.
// A fetched document is kept under node_modules/.cache/references/ by its digest, so a second run reads no network.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, load } from './lib.mjs';

const CACHE = join(ROOT, 'node_modules', '.cache', 'references');
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

async function fetchText(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { redirect: 'error' });
      if (res.status !== 200) throw new Error(`answers ${res.status}`);
      return await res.text();
    } catch (err) {
      if (attempt === 3) throw new Error(`${url}: ${err.message}`);
    }
  }
}

/** { base, documents: [{ id, url, schema }] }: each document parsed, its $id set to the id it resolves at. */
export async function references() {
  const { base, documents } = load('references.json');
  const out = [];
  for (const { id, url, sha256: want } of documents) {
    if (!url.startsWith(base)) throw new Error(`references.json: ${url} is not under ${base}`);
    const cached = join(CACHE, `${want}.json`);
    let text = existsSync(cached) ? readFileSync(cached, 'utf8') : await fetchText(url);
    if (sha256(text) !== want) throw new Error(`${url}: SHA-256 ${sha256(text)}, pinned ${want}`);
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(cached, text);
    out.push({ id, url, schema: { ...JSON.parse(text), $id: id } });
  }
  return { base, documents: out };
}
