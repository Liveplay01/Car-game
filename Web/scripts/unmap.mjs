// Turns minified error positions into source positions: node scripts/unmap.mjs <index-xxxx.js.map or its URL> 1:425215 26:175074
import { readFileSync } from 'node:fs';
import { SourceMap } from 'node:module';

const [from, ...positions] = process.argv.slice(2);
if (!from || positions.length === 0) throw new Error('Usage: node scripts/unmap.mjs <map file or URL> <line:col>...');
const text = /^https?:/.test(from) ? await (await fetch(from)).text() : readFileSync(from, 'utf8');
const map = new SourceMap(JSON.parse(text));
for (const at of positions) {
  const [line, col] = at.split(':').map(Number);
  const e = map.findEntry(line - 1, col - 1);
  console.log(at, e.originalSource ? `${e.originalSource.replace(/^.*\/src\//, 'src/')}:${e.originalLine + 1}:${e.originalColumn + 1}${e.name ? ` (${e.name})` : ''}` : 'no match');
}
