// A small builder for the 16:9 cuts: shots with their sound cues, titles that sit left or right of the action.
export function wideCut(w = 1920, h = 1080) {
  const shots = [], titles = [], sfx = [], booms = [], flashes = [];
  let side = 0;

  const shot = (t, dur, src, at, o = {}) => {
    const { sfx: cues = [], flash, boom, ...rest } = o;
    shots.push({ t, dur, src, at, speed: 1, ...rest });
    for (const [name, off, gain = 1] of cues) sfx.push({ name, t: +(t + off).toFixed(3), gain });
    if (flash !== undefined) flashes.push({ t, a: flash });
    if (boom !== undefined) booms.push({ t: +(t + boom).toFixed(3), gain: 0.8 });
  };

  // x alternates between the left and the right third; the title is fitted to that third
  const title = (t, dur, spec = {}) => {
    const { x, ...rest } = spec;
    const sideX = side++ % 2 === 0 ? 0.17 : 0.83;
    titles.push({ t, dur, y: 0.5, maxWidth: 0.27, x: x ?? sideX, ...rest });
    if ((spec.anim ?? 'slam') === 'slam') sfx.push({ name: 'swoosh', t: +(t - 0.05).toFixed(3), gain: 0.5 });
  };

  const two = (a, b, size = 2.1, cA = '', cB = 'accent') => [{ text: a, size, c: cA }, { text: b, size, c: cB }];
  const centre = { x: 0.5, y: 0.44, maxWidth: 0.5 };

  return { shots, titles, sfx, booms, flashes, shot, title, two, centre, w, h };
}
