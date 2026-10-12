// Runs the gameplay shoots in parallel worker processes: node capture/batch.mjs
import { spawn } from 'node:child_process';

// name, level, map, mode, bot, seconds[, sky]
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
// Shoots for the social ads (Oct 2026): node capture/batch.mjs h-neon h-sakura ...
SHOTS.push(
  ['h-neon', 25, 'neon', 'shift', 'peak', 30],
  ['h-sakura', 22, 'sakura', 'shift', 'peak', 26],
  ['h-snow', 24, 'snowfall', 'shift', 'peak', 26],
  ['h-aurora', 30, 'aurora', 'shift', 'peak', 26],
  ['h-tropic', 18, 'tropic', 'shift', 'peak', 26],
  ['h-meadow', 12, 'meadow', 'shift', 'peak', 30],
  ['h-crash', 8, 'meadow', 'shift', 'wild', 22],
  ['h-crash2', 8, 'sand', 'shift', 'wild', 22],
  ['h-hunt', 10, 'meadow', 'shift', 'hunter', 40],
  ['h-boss', 15, 'sand', 'shift', 'bold', 36],
);
// Every sky (reel-6) and the second fail compilation (reel-5), Oct 2026: the last field pins the sky (`play.mjs`, pinSky).
SHOTS.push(
  ['w-snow', 24, 'snowfall', 'shift', 'peak', 18, 'snow'],
  ['w-storm', 28, 'neon', 'shift', 'peak', 18, 'storm/night'],
  ['w-fog', 20, 'autumn', 'shift', 'peak', 18, 'fog'],
  ['w-sand', 20, 'sand', 'shift', 'peak', 18, 'sandstorm'],
  ['w-hail', 22, 'meadow', 'shift', 'peak', 18, 'hail'],
  ['w-rain', 22, 'sakura', 'shift', 'peak', 18, 'heavyRain'],
  ['w-extreme', 30, 'tropic', 'shift', 'peak', 18, 'extreme'],
  ['w-night', 26, 'neon', 'shift', 'peak', 18, '-/night'],
  ['w-blackout', 30, 'meadow', 'shift', 'peak', 18, '-/blackout'],
  ['f-ice', 14, 'snowfall', 'shift', 'wild', 22, 'snow'],
  ['f-night', 18, 'neon', 'shift', 'wild', 22, '-/night'],
  ['f-storm', 16, 'tropic', 'shift', 'wild', 22, 'storm'],
  ['f-meadow', 10, 'meadow', 'shift', 'wild', 22],
  ['f-mayhem', 6, 'sakura', 'mayhem', 'wild', 36],
);
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
  while (running < 5 && queue.length) {
    const [name, level, map, mode, bot, seconds, sky] = queue.shift();
    running++;
    const p = spawn('node', ['capture/play.mjs', name, level, map, mode, bot, seconds, name.startsWith('L-') ? 'landscape' : 'portrait', ...(sky ? [sky] : [])], { stdio: 'inherit' });
    p.on('exit', () => { running--; next(); });
  }
};
next();
