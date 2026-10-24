import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { Fmt, money } from '../../format';

/** Deutsch, Teil 3: Titel, Saisonpass, Ruhmeshalle, Modi, Mutatoren, Touren. */
export default (S: Strings): Words<Strings> => ({
  titles: {
    name: (id) =>
      ({
        eliteDriver: 'Elite-Fahrer',
        roadVeteran: 'Straßenveteran',
        ringMaster: 'Ringmeister',
        ironNerves: 'Nerven aus Stahl',
        roadRoyalty: 'Straßenadel',
        livingLegend: 'Lebende Legende',
        precisionDriver: 'Präzisionsfahrer',
        comboMaster: 'Combo-Meister',
        closeCallArtist: 'Beinahe-Künstler',
        syndicateBreaker: 'Syndikatsbrecher',
        nightOwl: 'Nachteule',
        stormChaser: 'Sturmjäger',
        legendHunter: 'Legendenjäger',
        starDriver: 'Sternfahrer',
        marathoner: 'Marathonläufer',
        overdriver: 'Overdriver',
        endless: 'Endlos',
        scorcher: 'Heizer',
        inferno: 'Inferno',
        meltdown: 'Kernschmelze',
        patron: 'Gönner',
        benefactor: 'Wohltäter',
        philanthropist: 'Philanthrop',
        visionary: 'Visionär',
        sovereign: 'Souverän',
        timeless: 'Zeitlos',
        apex: 'Apex',
        boundless: 'Grenzenlos',
        crewPodium: 'Podest-Crew',
        crewChampion: 'Crew-Meister',
        collector: 'Sammler',
        completionist: 'Vollender',
        ascended: 'Aufgestiegen',
        eternal: 'Ewig',
        grandmaster: 'Großmeister',
        centurion: 'Zenturio',
        immortal: 'Unsterblich',
        roadWarden: 'Straßenwächter',
        gridlord: 'Gridlord',
        ringbearer: 'Ringträger',
        unstoppable: 'Unaufhaltsam',
        timekeeper: 'Zeitwächter',
        paragon: 'Musterbild',
        mythic: 'Mythisch',
        ringEternal: 'Ewiger Ring',
        mastermind: 'Mastermind',
        summit: 'Gipfel',
        syndicateEnd: 'Ende des Syndikats',
      })[id],
    rule(r) {
      switch (r.k) {
        case 'elite':
          return `Erreiche Elite ${r.level}`;
        case 'mastery':
          return `Schließe die Meisterschaft „${S.mastery.name(r.goal)}“ ab`;
        case 'bosses':
          return r.all ? 'Fasse alle acht Syndikatsbosse' : 'Fasse die ersten vier Syndikatsbosse';
        case 'trial':
          return `Bestehe die Prüfung „${S.trials.name(r.id as never)}“`;
        case 'legendary':
          return `Schließe ${r.shifts} Legendäre Schichten ab`;
        case 'prestige':
          return `Erreiche Prestige ★${r.rank}`;
        case 'heat':
          return S.heat.rule(r.level);
        case 'fund':
          return `Spende ${money(Fmt.number(r.amount))} an den Spielfonds`;
        case 'item':
          return `Schalte ${S.shop.item(r.id)} in Unlimited frei`;
        case 'masteries':
          return 'Erreiche Stufe V in jeder Meisterschaft';
        case 'crew':
          return r.place === 1 ? 'Beende eine Crew-Woche auf Platz 1 der Liga' : 'Beende eine Crew-Woche in den Top 3 der Liga';
        case 'collector':
          return 'Sammle jeden Skin, den es noch gibt';
        case 'completionist':
          return 'Verdiene alle anderen Titel';
      }
    },
    earned: (ids) => (ids.length === 1 ? `TITEL · ${S.titles.name(ids[0])}` : `${ids.length} NEUE TITEL · ${ids.map((t) => S.titles.name(t)).join(', ')}`),
    none: 'Kein Titel',
  },

  pass: {
    title: 'Saisonpass',
    seasonName: (s) => ({ winter: 'Winter', spring: 'Frühling', summer: 'Sommer', autumn: 'Herbst' })[s],
    caption: (s) => `Saisonpass ${S.pass.seasonName(s)}`,
    tier: (n, total) => `Stufe ${n} von ${total}`,
    locked: (level) => `Öffnet ab Level ${level}`,
    buyHint: 'Truhen, Geld und drei Skins',
    free: 'gratis',
    waiting: (n) => (n === 1 ? '1 Stufe wartet auf den Pass' : `${n} Stufen warten auf den Pass`),
    daysLeft: (n) => (n === 1 ? 'letzter Tag' : `noch ${n} Tage`),
    complete: 'Strecke geschafft · bis zur nächsten Saison',
    openAtEnd: (n) => (n === 1 ? 'Saison endet bald · 1 Stufe noch offen' : `Saison endet bald · ${n} Stufen noch offen`),
    reached: (step) =>
      `SAISONPASS · STUFE ${step.tier} · ${step.duplicate > 0 ? `${S.pass.reward(step.reward)} erneut · +${money(Fmt.number(step.duplicate))}` : S.pass.reward(step.reward)}`,
    buy: (price) => `Kaufen · ${price}`,
    body: (xpPerTier) => [
      `Eine Strecke aus zwölf Stufen für diese Saison, gekauft mit Spielgeld. Jede Schicht bringt XP dafür: 10 für eine abgeschlossene Schicht, 1 für jeden Perfekten Einsatz und jede Knappe Lücke, 10 mehr für einen Boss oder eine Legendäre Schicht. Die erste Stufe braucht ${xpPerTier} XP, jede weitere etwas mehr.`,
      'Drei der Stufen enthalten die Skins dieser Saison, mit Effekten, die keine Truhe hat. Die vier Jahreszeiten kehren jedes Jahr wieder, und mit ihnen ihre Skins.',
      'Nur Optik, nie ein Vorteil auf der Straße. Hier kostet nichts echtes Geld.',
    ],
    freeBody: (xpPerTier) => [
      `Eine Strecke aus zwölf Stufen für diese Saison. Jede Schicht bringt XP dafür, mit oder ohne Pass: 10 für eine abgeschlossene Schicht, 1 für jeden Perfekten Einsatz und jede Knappe Lücke, 10 mehr für einen Boss oder eine Legendäre Schicht. Die erste Stufe braucht ${xpPerTier} XP, jede weitere etwas mehr.`,
      'Drei Stufen sind für alle gratis. Kaufst du den Pass mit Spielgeld, zahlt jede andere Stufe, die schon erreichten sofort.',
      'Drei der Stufen enthalten die Skins dieser Saison, mit Effekten, die keine Truhe hat. Die vier Jahreszeiten kehren jedes Jahr wieder, und mit ihnen ihre Skins. Nur Optik, nie ein Vorteil auf der Straße.',
    ],
    trackHeader: 'Die Strecke',
  },

  hall: {
    header: 'Prestige-Chronik',
    plaqueLine: (e, date) =>
      [date, e.elite > 0 ? `Elite ${e.elite}` : null, `${e.bosses} ${e.bosses === 1 ? 'Boss' : 'Bosse'}`, e.legendary > 0 ? `${e.legendary} legendär` : null].filter((x) => x).join(' · '),
    empty: 'Dein erstes Prestige bekommt die erste Plakette.',
  },

  modes: {
    name: (m) => (m === 'shift' ? 'SCHICHT' : m === 'unlimited' ? 'UNLIMITED' : m === 'mayhem' ? 'MAYHEM' : 'MULTIPLAYER'),
    line: (m) =>
      m === 'shift'
        ? 'Level schaffen, aufsteigen'
        : m === 'unlimited'
          ? 'Endlos · bis zum Crash'
          : m === 'mayhem'
            ? '12 Autos · ziele auf die Tanker'
              : 'Bis zu 4 Freunde · der Letzte gewinnt',
    youLabel: 'DU',
    defaultName: 'Spieler',
    runOver: 'LAUF VORBEI',
    again: 'Tippe für einen neuen Lauf',
    carsSent: (n) => (n === 1 ? '1 Auto' : `${n} Autos`),
    tryUnlimited: { caption: 'SPIELMODI', text: 'Wische seitwärts für Unlimited: keine Level, fahre einfach bis zum Crash' },
    tightFit: { caption: 'TIPP', text: 'Näher zahlt mehr: Fädle dicht hinter einem Auto ein für eine Knappe Lücke, doppelte Punkte' },
    swipeCaption: 'SPIELMODI',
    swipeHint: 'Wische für mehr Modi',
    tryUnlimitedKeys: { caption: 'SPIELMODI', text: 'Drücke → für Unlimited: keine Level, fahre einfach bis zum Crash' },
    swipeHintKeys: '← → für mehr Modi',
    stage: (stage, overtime) =>
      overtime > 0
        ? `ÜBERSTUNDEN ${overtime} · mehr Verkehr, etwas schneller`
        : (['', 'GASTANKER MISCHEN SICH UNTERS VOLK', 'DIE NACHT BRICHT AN', 'EIN STURM ZIEHT AUF', 'MILITÄR-LKW AUF DER STRASSE'][stage] ?? ''),
    tier: (id) => ({ bronze: 'Bronze', silver: 'Silber', gold: 'Gold', platinum: 'Platin', diamond: 'Diamant', master: 'Meister' })[id],
    mark: (cars, reward) =>
      reward.tier ? `${cars} Autos · ${S.modes.tier(reward.tier).toUpperCase()}` : reward.skin ? `${cars} Autos · ${S.shop.item(reward.skin).toUpperCase()}` : `${cars} Autos`,
    tierUp: (id) => `NEUE STUFE · ${S.modes.tier(id).toUpperCase()} in Unlimited`,
    tierLine: (id, next) => [id ? S.modes.tier(id) : '–', next ? `${next.cars} Autos für ${S.modes.tier(next.id)}` : null].filter(Boolean).join(' · '),
    milestone: (id) => `UNLIMITED-MEILENSTEIN · ${S.shop.item(id)} freigeschaltet`,
  },

  mayhem: {
    caption: 'MAYHEM',
    flames: 'FLAMMEN',
    cars: 'AUTOS',
    chain: (n) => `KETTE ×${n}`,
    over: 'MAYHEM VORBEI',
    again: 'Tippe für mehr Mayhem',
    summary: (wrecks, chain) => `${wrecks} ${wrecks === 1 ? 'Wrack' : 'Wracks'} · größte Kette ×${chain}`,
  },

  seasonRule: {
    name: (s) => ({ winter: 'Tiefer Winter', spring: 'Aprilschauer', summer: 'Sommerstürme', autumn: 'Nebel & Dämmerung' })[s],
    line: (s) =>
      ({
        winter: 'Nebel und Schnee kommen öfter, und die Nacht bricht früh herein',
        spring: 'Mehr Regen, öfter',
        summer: 'Meist klar, aber wenn es kippt, wird es ein Sturm',
        autumn: 'Mehr Nebel, und die Abende kommen früh',
      })[s],
  },

  tours: {
    caption: 'TOUR',
    name: (id) => ({ halloween: 'Spukring', winter: 'Winterlichter' })[id],
    tagline: (id) =>
      ({
        halloween: 'Sieben Stopps nach Einbruch der Dunkelheit. Drei Skins, nur hier.',
        winter: 'Sieben verschneite Stopps. Drei Skins, nur hier.',
      })[id],
    stop: (n, of) => `Stopp ${n}/${of}`,
    stopName: (id) => {
      const m = /^tour\.([a-z]+)\.(\d+)$/.exec(id);
      return m ? `${S.tours.name(m[1] as 'halloween' | 'winter')} · Stopp ${m[2]}` : '';
    },
    left: (n) => (n <= 1 ? 'letzter Tag' : `noch ${n} Tage`),
    opensIn: (n) => (n === 1 ? 'morgen' : `in ${n} Tagen`),
    startsIn: (inDays) => `Startet ${S.tours.opensIn(inDays)}`,
    locked: (level) => `Touren öffnen ab Level ${level}`,
    progress: (done, total) => `${done}/${total} Stopps`,
    play: 'Spielen ›',
    goal(t) {
      const parts = [
        `${t.cars} Autos`,
        t.weather !== 'clear' ? S.weather(t.weather) : null,
        t.darkness === 'blackout' ? S.blackout : t.darkness === 'night' ? S.night : null,
        t.legendary ? S.legendary.name(t.legendary) : null,
        t.rule === 'flawless' ? 'kein Crash' : null,
        t.goal.k === 'perfects' ? `${t.goal.n} Perfekte Einsätze` : null,
        t.goal.k === 'boss' ? 'den Boss fassen' : null,
      ];
      return parts.filter((p): p is string => p !== null).join(' · ');
    },
    reward(r) {
      const parts = [r.item ? S.shop.item(r.item) : null, r.chest ? S.shop.chest(r.chest) : null, r.money ? `${Fmt.number(r.money)} Münzen` : null];
      return parts.filter((p): p is string => p !== null).join(' + ');
    },
    stopDone: (n, of, reward) => `TOUR-STOPP ${n}/${of} · ${reward}`,
    complete: (id) => `${S.tours.name(id).toUpperCase()} GESCHAFFT`,
    passedBefore: 'Auf dieser Tour schon geschafft',
  },
});
