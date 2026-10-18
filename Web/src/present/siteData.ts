import { baseConfig, BOSS_KINDS, DAILY_EVENTS } from '../core/config';
import { MUSEUM_SHELVES, shelfEntries, museumId, firstLevel, firstPlace } from '../core/museum';
import { COSMETICS, CHEST_KINDS, CHEST_ODDS, RARITIES, ALBUMS, albumItems, chestPrice, type Cosmetic } from '../core/loot';
import { TRIALS, LANDMARKS, LEVEL_TRIALS, rematch, type Trial } from '../core/trials';
import { TITLES, TITLE_RULES } from '../core/elite';
import { S } from './strings';
import { MuseumPage } from './museum';
import { ShopPage } from './shop';
import { IntroArt } from './introArt';
import { INTROS } from './intros';
import { LANGUAGES } from './i18n';
import { Skins } from './skins';
import { PATCH_NOTES } from './patchNotes';
import { COLORS, type ColorToken } from './theme';
import { artSvg } from './svg';
import { featuresFile, signalsFile } from './siteGuide';

/**
 * The website's facts, straight from the game (Leo, 15.10.2026): `vite.config.ts` writes them to
 * `/data/*.json` at every build, beside `/changelog.json`, so timing.love never keeps a copy that
 * goes stale. Pictures are the game's own art as SVG (`svg.ts`). The shapes are public: add
 * fields, never rename them, and raise `version` only when an old reader would break.
 */

export const SITE_DATA_VERSION = 1;

/** The game draws its coin as a private-use glyph; on a web page the number says "coins". */
const COIN = '';
// The number ends at its last digit: "50." at the end of a sentence keeps its full stop after "coins".
const plain = (text: string): string => text.replace(new RegExp(String.raw`${COIN}\s?(\d+(?:[.,]\d+)*)`, 'g'), '$1 coins').replaceAll(COIN, 'coins');

const slug = (id: string): string => id.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
const rgb = (token: ColorToken): string => `rgb(${COLORS[token].slice(0, 3).join(' ')})`;

/** A short fingerprint (djb2), the same the website computes for its built-in copy. */
export function fingerprint(data: unknown): string {
  const text = JSON.stringify(data);
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}

const SHELF_IDS = ['bosses', 'specials', 'conditions', 'failures'];

function museum() {
  return {
    version: SITE_DATA_VERSION,
    shelves: MUSEUM_SHELVES.map((shelf) => ({
      id: SHELF_IDS[shelf],
      title: S.museum.shelf(shelf),
      entries: shelfEntries(shelf).map((e) => ({
        id: slug(museumId(e)),
        kind: S.museum.kind(e),
        name: plain(S.museum.name(e)),
        level: firstLevel(e, baseConfig),
        rank: firstPlace(e, baseConfig).rank,
        line: plain(S.museum.line(e)),
        brief: plain(S.brief.text(e)),
        paragraphs: S.museum.explanation(e, baseConfig).map(plain),
        color: rgb(MuseumPage.color(e)),
        art: artSvg(96, (list, c) => MuseumPage.art(list, e, c, 1, true, 0, 1, 96)),
      })),
    })),
  };
}

const howToGet = (item: Cosmetic): string => (item.source.kind === 'chest' ? 'Comes out of chests.' : S.shop.lockedHint(item));

function collection() {
  return {
    version: SITE_DATA_VERSION,
    rarities: RARITIES.map((r) => ({ id: r, name: S.shop.rarity(r), color: rgb(ShopPage.rarityColor(r)) })),
    chests: CHEST_KINDS.map((k) => ({
      id: k,
      name: S.shop.chest(k),
      price: chestPrice(k, baseConfig),
      odds: CHEST_ODDS[k],
      source: S.shop.source(k),
      color: rgb(ShopPage.chestColor(k)),
    })),
    albums: ALBUMS.map((a) => ({ id: a, name: S.albums.name(a), items: albumItems(a).map((x) => x.id) })),
    items: COSMETICS.map((item) => ({
      id: item.id,
      name: plain(S.shop.item(item.id)),
      kind: item.kind,
      rarity: item.rarity,
      source: item.source.kind,
      how: plain(howToGet(item)),
      use: plain(S.shop.ownedHint(item)),
      finish: item.kind === 'carSkin' ? Skins.finish(item.id) : null,
      effect: item.kind === 'carSkin' ? Skins.effect(item.id) : null,
      model: item.kind === 'carSkin' ? Skins.model(item.id) : null,
      art: artSvg(96, (list, c) => ShopPage.addPreview(list, item, c, 1, 1)),
    })),
  };
}

const trialRow = (t: Trial) => ({
  id: slug(t.id),
  name: plain(S.trials.name(t.id)),
  level: t.level,
  goal: plain(S.trials.goal(t)),
  cars: t.cars,
  reward: t.reward,
});

function progress() {
  return {
    version: SITE_DATA_VERSION,
    trials: [
      { id: 'trials', title: 'Trials', runs: TRIALS.map(trialRow) },
      { id: 'rematches', title: 'Boss rematches', runs: BOSS_KINDS.map((k) => trialRow(rematch(k))) },
      { id: 'landmarks', title: 'Landmarks', runs: LANDMARKS.map(trialRow) },
      { id: 'levels', title: 'Level trials', runs: LEVEL_TRIALS.map(trialRow) },
    ],
    titles: TITLES.map((id) => ({ id, name: S.titles.name(id), rule: plain(S.titles.rule(TITLE_RULES[id])) })),
  };
}

function game(counts: Record<string, number>) {
  return {
    version: SITE_DATA_VERSION,
    name: 'Roundabout Timing',
    updated: PATCH_NOTES[0]?.id ?? '',
    languages: LANGUAGES.map((l) => ({ code: l.code, name: l.name })),
    counts,
    daily: DAILY_EVENTS.map((id) => ({ id, name: plain(S.cityEvent(id)) })),
    places: INTROS.map((id) => ({ id, art: artSvg(96, (list, c) => IntroArt.add(list, id, c, 96)) })),
  };
}

/**
 * Every file under `/data/`, by name, and `index.json` with each one's fingerprint: the website
 * reads the small index first and fetches only what changed since its own build.
 */
export function siteFiles(): Record<string, unknown> {
  const m = museum();
  const c = collection();
  const p = progress();
  const signals = signalsFile();
  const features = featuresFile();
  const counts = {
    bosses: BOSS_KINDS.length,
    languages: LANGUAGES.length,
    museum: m.shelves.reduce((n, s) => n + s.entries.length, 0),
    skins: c.items.filter((x) => x.kind === 'carSkin').length,
    maps: c.items.filter((x) => x.kind === 'mapSkin').length,
    vehicles: c.items.filter((x) => x.kind === 'vehicleType').length,
    trials: p.trials.reduce((n, g) => n + g.runs.length, 0),
    titles: p.titles.length,
    updates: PATCH_NOTES.length,
    signals: signals.groups.reduce((n, g) => n + g.signals.length, 0) + signals.vehicles.length,
    features: features.groups.reduce((n, g) => n + g.items.length, 0),
  };
  const files: Record<string, unknown> = { museum: m, collection: c, progress: p, signals, features, game: game(counts) };
  const index = { version: SITE_DATA_VERSION, updated: PATCH_NOTES[0]?.id ?? '', files: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, fingerprint(v)])) };
  return { ...files, index };
}
