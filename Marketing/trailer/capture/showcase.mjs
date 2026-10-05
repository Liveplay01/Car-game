// A well-played save to film: a high level, plenty of coins, a full Collection and a built-up city.
export const rich = (save, mods, { level = 47, money = 1_250_000 } = {}) => {
  const c = save.career;
  c.level = level;
  c.money = money;
  c.collection = mods.COSMETICS.map((x) => x.id);
  c.unseen = [];
  c.carSkins = ['gold', 'diamond', 'holo', 'royal', 'lagoon', 'chrome', 'starlight', 'carbon'].filter((id) => c.collection.includes(id));
  c.chests = ['standard', 'standard', 'premium', 'premium', 'event', 'standard'];
  c.museumSeen = [...mods.MUSEUM_IDS];
  c.museumNew = [];
  c.bossesBeaten = [...mods.BOSS_KINDS];
  c.bossTrophies = 9;
  c.prestige = 2;
  c.armSlots = [0, 2, 4, 6, 8, 10];
  c.upgrades = { backup: 3 };
  save.highscore = 48250;
};
