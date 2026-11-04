// Renders the generated reels in parallel and copies them to Marketing/videos:
//   node compose/batch.mjs [id ...] [--jobs=4] [--from=9]
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ids } from './cuts/gen.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const arg = (name, d) => Number(process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? d);
const jobs = arg('jobs', 4), first = arg('from', 9);
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const queue = ids.filter((id) => !only.length || only.includes(id));
const failed = [];
let running = 0, done = 0;

const next = () => {
  while (running < jobs && queue.length) {
    const id = queue.shift();
    const n = first + ids.indexOf(id);
    running++;
    const p = spawn('node', ['compose/render.mjs', `gen-${id}`], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
    p.on('exit', (code) => {
      const out = join(ROOT, 'out', `gen-${id}.mp4`);
      if (code === 0 && existsSync(out)) {
        copyFileSync(out, join(ROOT, '..', 'videos', `reel-${n}-${id}.mp4`));
        console.log(`ok   reel-${n}-${id} (${++done})`);
      } else { failed.push(id); console.log(`FAIL ${id}`); }
      running--;
      if (queue.length) next(); else if (!running) console.log(failed.length ? `failed: ${failed.join(', ')}` : 'all done');
    });
  }
};
next();
