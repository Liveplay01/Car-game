import type { ColorToken } from './theme';

/** What each skin looks like (LOOT.md). */
export type Finish = 'shiny' | 'glitter' | 'shinyGlitter';

export const Skins = {
  color(id: string | null | undefined): ColorToken | null {
    const map: Record<string, ColorToken> = {
      racingRed: 'skinRacingRed',
      redStripe: 'skinRacingRed',
      midnight: 'skinMidnight',
      mint: 'skinMint',
      pearl: 'skinPearl',
      royal: 'skinPearl',
      olive: 'skinOlive',
      coral: 'skinCoral',
      sunset: 'skinSunset',
      tiger: 'skinSunset',
      ice: 'skinIce',
      rose: 'skinRose',
      lime: 'skinLime',
      copper: 'skinCopper',
      carbon: 'skinCarbon',
      blackGold: 'skinCarbon',
      nightMint: 'vehicleCarGraphite',
      gold: 'skinGold',
      lagoon: 'skinLagoon',
      pearlShine: 'skinPearl',
      chrome: 'skinChrome',
      starlight: 'skinMidnight',
      diamond: 'skinIce',
      holo: 'skinHolo',
      streakBronze: 'skinBronze',
      streakSilver: 'skinSilver',
      streakGold: 'skinGold',
      laurel: 'skinLaurel',
      crown: 'skinCrown',
      phoenix: 'skinPhoenix',
      starSilver: 'skinSilver',
      starGold: 'skinGold',
      starIris: 'skinHolo',
      eliteSteel: 'skinChrome',
      eliteBlaze: 'skinMidnight',
      eliteJade: 'skinLagoon',
      eliteAurum: 'skinObsidian',
      eliteHalo: 'skinIce',
      frost: 'skinFrost',
      blossom: 'skinBlossom',
      sunburst: 'skinSunburst',
      pumpkin: 'skinPumpkin',
      lemon: 'skinLemon',
      plum: 'skinPlum',
      fern: 'skinFern',
      latte: 'skinLatte',
      cherry: 'skinCherry',
      mocha: 'skinMocha',
      teal: 'skinTeal',
      sky: 'skinSky',
      panda: 'skinPearl',
      koi: 'skinPearl',
      hanami: 'skinHanami',
      volcano: 'skinCarbon',
      ocean: 'skinOcean',
      obsidian: 'skinObsidian',
      ruby: 'skinRuby',
      dusk: 'mapDusk',
      sand: 'mapSand',
      neon: 'mapNeon',
      forest: 'mapForest',
      autumn: 'mapAutumn',
      sakura: 'mapSakura',
      aurora: 'mapAurora',
      ember: 'mapEmber',
      meadow: 'mapMeadow',
      tropic: 'mapTropic',
      snowfall: 'mapSnow',
      cosmos: 'mapCosmos',
      harbour: 'mapHarbour',
      vineyard: 'mapVineyard',
      grove: 'mapGrove',
      abyss: 'mapAbyss',
      canyon: 'mapCanyon',
      highland: 'mapHighland',
      lanterns: 'mapLanterns',
      crystal: 'mapCrystal',
    };
    return id ? (map[id] ?? null) : null;
  },

  stripe(id: string | null): ColorToken | null {
    switch (id) {
      case 'redStripe':
      case 'blossom':
      case 'ocean':
        return 'primary';
      case 'blackGold':
      case 'royal':
      case 'lagoon':
      case 'koi':
      case 'ruby':
        return 'skinGold';
      case 'nightMint':
      case 'holo':
        return 'skinMint';
      case 'tiger':
      case 'pumpkin':
        return 'vehicleTire';
      case 'streakGold':
        return 'mapForest';
      case 'laurel':
      case 'crown':
      case 'starIris':
        return 'skinGold';
      case 'phoenix':
        return 'fireCore';
      case 'eliteSteel':
      case 'eliteAurum':
      case 'eliteHalo':
        return 'skinGold';
      case 'eliteBlaze':
        return 'fireOuter';
      case 'eliteJade':
        return 'skinPearl';
      case 'starSilver':
        return 'primary';
      case 'starGold':
        return 'skinCarbon';
      case 'sunburst':
        return 'fireOuter';
      case 'volcano':
        return 'mapEmber';
      default:
        return null;
    }
  },

  roof(id: string | null): ColorToken | null {
    switch (id) {
      case 'cherry':
      case 'sky':
      case 'hanami':
        return 'skinPearl';
      case 'mocha':
        return 'skinCream';
      case 'panda':
        return 'skinCarbon';
      case 'koi':
        return 'skinKoi';
      default:
        return null;
    }
  },

  finish(id: string | null): Finish | null {
    switch (id) {
      case 'pearlShine':
      case 'chrome':
      case 'holo':
      case 'streakSilver':
      case 'ocean':
      case 'koi':
      case 'laurel':
      case 'starSilver':
      case 'eliteSteel':
      case 'eliteBlaze':
      case 'eliteJade':
        return 'shiny';
      case 'crown':
      case 'phoenix':
      case 'starGold':
      case 'starIris':
      case 'eliteAurum':
      case 'eliteHalo':
        return 'shinyGlitter';
      case 'starlight':
      case 'frost':
      case 'hanami':
      case 'volcano':
      case 'ruby':
        return 'glitter';
      case 'diamond':
      case 'streakGold':
      case 'obsidian':
        return 'shinyGlitter';
      default:
        return null;
    }
  },
};

export const isShiny = (f: Finish | null): boolean => f === 'shiny' || f === 'shinyGlitter';
export const glitters = (f: Finish | null): boolean => f === 'glitter' || f === 'shinyGlitter';

export interface Look {
  paint: ColorToken | null;
  stripe: ColorToken | null;
  roof: ColorToken | null;
  finish: Finish | null;
}

/** Every vehicle on the road wears one of the skins that are on, picked by its id. */
export function lookFor(id: number, skins: string[]): Look | null {
  if (skins.length === 0) return null;
  let h = Math.imul(id ^ 0x6659fd93, 0xd6e8feb8) ^ (id * 2654435761);
  h ^= h >>> 16;
  const skin = skins[(h >>> 0) % skins.length];
  return { paint: Skins.color(skin), stripe: Skins.stripe(skin), roof: Skins.roof(skin), finish: Skins.finish(skin) };
}
