// Runs the gameplay shoots in parallel worker processes: node capture/batch.mjs
import { spawn } from 'node:child_process';

// name, level, map, mode, bot, seconds
const SHOTS = [
  ['g-hunt', 10, 'meadow', 'shift', 'hunter', 60],
  ['g-boss', 15, 'sand', 'shift', 'bold', 40],
  ['g-mayhem', 6, 'canyon', 'mayhem', 'wild', 36],
  ['g-meadow', 12, 'meadow', 'shift', 'careful', 40],
  ['g-neon', 25, 'neon', 'shift', 'careful', 30],
  ['g-crash', 6, 'meadow', 'shift', 'wild', 18],
  ['g-tropic', 18, 'tropic', 'shift', 'careful', 24],
  ['g-sakura', 22, 'sakura', 'shift', 'careful', 24],
  ['g-snow', 24, 'snowfall', 'shift', 'careful', 24],
  ['g-autumn', 20, 'autumn', 'shift', 'careful', 20],
  ['g-aurora', 30, 'aurora', 'shift', 'careful', 20],
  ['g-unlimited', 20, 'sand', 'unlimited', 'careful', 40],
];
const LAND = [
  ['L-crash2', 8, 'meadow', 'shift', 'wild', 22],
  ['L-crash3', 8, 'sand', 'shift', 'wild', 22],
  ['L-mayhem2', 6, 'meadow', 'mayhem', 'wild', 36],
  ['L-neon2', 25, 'neon', 'shift', 'careful', 26],
  ['L-hunt1', 10, 'meadow', 'shift', 'hunter', 48],
  ['L-hunt2', 10, 'meadow', 'shift', 'hunter', 48],
  ['L-meadow', 12, 'meadow', 'shift', 'careful', 30],
  ['L-sakura', 22, 'sakura', 'shift', 'careful', 26],
  ['L-neon', 25, 'neon', 'shift', 'careful', 26],
  ['L-mayhem', 6, 'canyon', 'mayhem', 'wild', 36],
  ['L-crash', 6, 'meadow', 'shift', 'wild', 14],
  ['L-boss', 15, 'sand', 'shift', 'bold', 30],
  ['L-hunt3', 10, 'meadow', 'shift', 'hunter', 48],
];
if (process.argv.includes('--landscape')) SHOTS.splice(0, SHOTS.length, ...LAND);
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const queue = SHOTS.filter(([n]) => only.length === 0 || only.includes(n));
let running = 0;
const next = () => {
  while (running < 3 && queue.length) {
    const [name, level, map, mode, bot, seconds] = queue.shift();
    running++;
    const p = spawn('node', ['capture/play.mjs', name, level, map, mode, bot, seconds, name.startsWith('L-') ? 'landscape' : 'portrait'], { stdio: 'inherit' });
    p.on('exit', () => { running--; next(); });
  }
};
next();
