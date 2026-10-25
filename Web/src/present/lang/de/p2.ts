import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { INVITE_LEVEL } from '../../../core/config';
import { rematchKind, ascensionRank, levelTrialLevel, levelKind, LANDMARK_PRESTIGE, type TrialId } from '../../../core/trials';
import { Fmt, money } from '../../format';

/** Deutsch, Teil 2: Prüfungen, Bosse, Legendäre und Wochenschichten, Prestige, Elite. */
export default (S: Strings): Words<Strings> => ({
  rush: {
    name: 'Boss-Rush',
    caption: 'BOSS-RUSH',
    clock: 'ZEIT',
    best: 'BEST',
    step: (n, total) => `Boss ${n} von ${total}`,
    shiftLine: (kind, first) => `${S.boss.name(kind)} · ${first ? 'verlierst du eine Runde, beginnt alles von vorn' : 'die Uhr läuft weiter'}`,
    caught: (n, total) => `BOSS ${n} VON ${total} GEFASST`,
    nextLine: (kind) => `Als Nächstes: ${S.boss.name(kind)} · tippe zum Weitermachen`,
    over: 'RUSH VORBEI',
    overLine: (caught, total) => `${caught} von ${total} Bossen gefasst · tippe für einen Neustart`,
    cleared: 'RUSH GESCHAFFT',
    firstLine: (m) => `Alle acht Bosse erledigt · ${m} ausgezahlt`,
    recordLine: 'Neue Bestzeit',
    bestLine: (time) => `Bestzeit ${time} · tippe für einen neuen Lauf`,
    rowTitle: 'Alle acht Bosse',
    line: 'Hintereinander, eine Uhr',
    furthest: (n, total) => `am weitesten ${n}/${total}`,
    locked: (beaten, total) => `Erledige alle acht Bosse, um es zu öffnen · ${beaten}/${total}`,
  },

  trials: {
    name(id) {
      const boss = rematchKind(id);
      if (boss) return S.boss.rematch(boss);
      if (id === 'landmark.etoile') return 'L’Étoile';
      if (id === 'weekly') return S.weekly.title;
      if (id.startsWith('tour.')) return S.tours.stopName(id);
      const rank = ascensionRank(id);
      if (rank !== null) return `Aufstieg ★${rank}`;
      const level = levelTrialLevel(id);
      if (level !== null) return `${S.trials.kindName[levelKind(level)]} · Lv ${level}`;
      return {
        tightSqueeze: 'Enge Passage',
        deadCentre: 'Volltreffer',
        cleanSheet: 'Weiße Weste',
        blackout: 'Blackout',
        stormWatch: 'Sturmwache',
        marathon: 'Marathon',
        mostWanted: 'Meistgesucht',
        noPolice: 'Ohne Polizei',
        noDriving: 'Nur Hände',
        bareBuild: 'Nackter Ausbau',
      }[id as TrialId];
    },
    kindName: {
      precision: 'Präzision',
      sharpEyes: 'Scharfe Augen',
      cleanRun: 'Saubere Fahrt',
      weatherRun: 'Raues Wetter',
      nightShift: 'Nachtschicht',
      manhunt: 'Menschenjagd',
      ruleBreaker: 'Gnadenlos',
      handicap: 'Handicap',
      longHaul: 'Langstrecke',
    },
    goal(t) {
      if (t.tour) return S.tours.goal(t);
      if (t.elite) return S.weekly.goal(t);
      if (levelTrialLevel(t.id) !== null) {
        const strip = t.strip ?? [];
        const parts = [
          t.goal.k === 'perfects'
            ? `${t.goal.n} Perfekte Einsätze`
            : t.goal.k === 'skilled'
              ? `${t.goal.n} Knappe Lücken oder besser`
              : t.goal.k === 'boss'
                ? `${S.boss.name(t.boss ?? 'convoy')} fassen`
                : null,
          `${t.cars} Autos`,
          t.weather !== 'clear' ? S.weather(t.weather) : null,
          t.darkness === 'blackout' ? S.blackout : t.darkness === 'night' ? S.night : null,
          t.legendary ? S.legendary.name(t.legendary) : null,
          t.rule === 'flawless' ? 'kein Crash' : null,
          strip.length > 0 ? `dein Ausbau ohne ${strip.map((g) => ['Polizei', 'Geld', 'Fahren'][g]).join(' und ')}` : null,
        ];
        return parts.filter((p): p is string => p !== null).join(' · ');
      }
      if (ascensionRank(t.id) !== null) {
        const parts = [
          `${t.cars} Autos`,
          t.weather !== 'clear' ? S.weather(t.weather) : null,
          t.darkness === 'blackout' ? S.blackout : t.darkness === 'night' ? S.night : null,
          t.legendary ? S.legendary.name(t.legendary) : null,
          t.rule === 'flawless' ? 'kein Crash' : null,
          t.goal.k === 'boss' ? 'den Boss fassen' : null,
        ];
        return parts.filter((p): p is string => p !== null).join(' · ');
      }
      const boss = rematchKind(t.id);
      if (boss) return `${S.boss.name(boss)} noch einmal: mehr Eskorten, weniger Zeit`;
      if (t.arms) return `${t.arms} Straßen in einem Ring · ${t.cars} Autos`;
      switch (t.id) {
        case 'tightSqueeze':
          return `${t.goal.k === 'skilled' ? t.goal.n : 0} Knappe Lücken oder besser in ${t.cars} Autos`;
        case 'deadCentre':
          return `${t.goal.k === 'perfects' ? t.goal.n : 0} Perfekte Einsätze in ${t.cars} Autos`;
        case 'cleanSheet':
          return `${t.cars} Autos, kein Crash`;
        case 'blackout':
          return `${t.cars} Autos bei Nacht, die Straßenlaternen aus`;
        case 'stormWatch':
          return `${t.cars} Autos durch einen Sturm bei Nacht`;
        case 'marathon':
          return `${t.cars} Autos in einer Schicht`;
        case 'mostWanted':
          return 'Fasse den Syndikatsboss';
        case 'noPolice':
          return `${t.cars} Autos mit deinem Ausbau, aber ohne Polizei-Upgrades`;
        case 'noDriving':
          return `${t.cars} Autos mit deinem Ausbau, aber ohne Fahr-Upgrades (kein Schild)`;
        case 'bareBuild':
          return `${t.cars} Autos mit deinem Ausbau, aber ohne Polizei- und ohne Fahr-Upgrades`;
        default:
          return '';
      }
    },
    level: (l) => `Level ${l}`,
    passed: 'BESTANDEN',
    play: 'Spielen',
    opensAt: (l) => `Öffnet ab Level ${l}`,
    opens: (t) => {
      const rank = ascensionRank(t.id);
      if (rank !== null) return `Öffnet bei Prestige ★${rank}`;
      return t.arms ? `Öffnet bei Prestige ★${LANDMARK_PRESTIGE}` : S.trials.opensAt(t.level);
    },
    howTo(t) {
      if (t.goal.k === 'perfects') {
        return {
          title: 'So geht’s · Perfekter Einsatz',
          text: 'Setze dein Auto genau in die Mitte einer Lücke, mit etwa so viel Platz davor wie dahinter. Eine riesige leere Strecke zählt nicht: Wähle eine mittlere Lücke.',
          short: 'Die Mitte einer mittleren Lücke, keiner riesigen',
        };
      }
      if (t.goal.k === 'skilled') {
        return {
          title: 'So geht’s · Knappe Lücke',
          text: 'Fädle dicht vor oder hinter dem anderen Auto ein, ohne es zu berühren: Knappe Lücken, Beinahe-Crashs und Perfekte Einsätze zählen, ein Einfädeln mit viel Platz nicht.',
          short: 'Dicht an einem anderen Auto, ohne Crash',
        };
      }
      return null;
    },
    progress: (t, have, need) => `${t.goal.k === 'perfects' ? 'Perfekte Einsätze' : 'Knappe Lücken oder besser'} ${Math.min(have, need)}/${need}${have >= need ? ' ✓' : ''}`,
  },

  boss: {
    incoming: 'SYNDIKAT',
    scoutFirst: 'Ein Späher mit Eskorte: ramme ihn mit einem Streifenwagen, in der Lücke vor der Eskorte',
    name: (k) =>
      ({
        convoy: 'Der Konvoi',
        getaway: 'Der Fluchtfahrer',
        armoured: 'Der Gepanzerte Boss',
        phantom: 'Das Phantom',
        twins: 'Die Zwillinge',
        decoy: 'Der Lockvogel',
        smuggler: 'Der Schmuggler',
        kingpin: 'Der Kingpin',
      })[k],
    rematch: (k) => `Revanche · ${S.boss.name(k)}`,
    beaten: 'Gefasst',
    escaped: (k) => `${S.boss.name(k)} ${k === 'twins' ? 'sind' : 'ist'} weg`.toUpperCase(),
    caught: (k) => `Boss gefasst — ${S.boss.name(k)}`.toUpperCase(),
    wanted: (seconds) => `BOSS ${Math.ceil(Math.max(0, seconds))}`,
    busted: (amount) => `Boss gefasst · ${amount} zurückgeholt`,
    label: (role) => (role === 'boss' ? 'BOSS' : role === 'escort' ? 'ESKORTE' : null),
  },

  legendary: {
    caption: 'LEGENDÄRE SCHICHT',
    name: (r) => ({ gridlock: 'Verkehrsinfarkt', dragnet: 'Großfahndung', heavyLoad: 'Schwerlast', darkStorm: 'Dunkler Sturm', zeroTolerance: 'Nulltoleranz' })[r],
    line: (r) =>
      ({
        gridlock: 'Stoßzeit ab dem ersten Auto',
        dragnet: 'Doppelt so oft Verbrecher',
        heavyLoad: 'Überall Lkw, die Hälfte davon Gastanker',
        darkStorm: 'Ein Sturm im Blackout',
        zeroTolerance: 'Ein Crash beendet alles',
      })[r],
    reward: 'BELOHNUNG',
    chest: 'Premium',
    done: (item) => `LEGENDÄRE SCHICHT GESCHAFFT${item ? ` · ${S.shop.item(item)} freigeschaltet` : ''}`,
    broken: 'REGEL GEBROCHEN',
  },

  weekly: {
    title: 'Wochenschicht',
    caption: 'WOCHENSCHICHT',
    elite: (e) => ({ flawless: 'Makellos', precision: 'Präzision', storm: 'Sturmfront', gridlock: 'Verkehrsinfarkt', dragnet: 'Großfahndung', boss: 'Bossjagd' })[e],
    goal(t) {
      switch (t.elite) {
        case 'flawless':
          return `Level ${t.level} · ${t.cars} Autos, kein Crash`;
        case 'precision':
          return `Level ${t.level} · ${t.goal.k === 'perfects' ? t.goal.n : 0} Perfekte Einsätze in ${t.cars} Autos`;
        case 'storm':
          return `Level ${t.level} · ${t.cars} Autos durch einen Sturm bei Nacht`;
        case 'gridlock':
          return `Level ${t.level} · ${t.cars} Autos in der Stoßzeit von Anfang an`;
        case 'dragnet':
          return `Level ${t.level} · ${t.cars} Autos, doppelt so oft Verbrecher`;
        case 'boss':
          return `Level ${t.level} · fasse den Syndikatsboss`;
        default:
          return '';
      }
    },
    daysLeft: (n) => (n === 1 ? 'letzter Tag' : `noch ${n} Tage`),
    hint: 'Diese Woche für alle dieselbe Schicht. Spiele sie so oft du willst; bezahlt wird einmal.',
    done: (m) => `WOCHENSCHICHT GESCHAFFT · +${money(m)}`,
    passedThisWeek: 'Diese Woche bestanden · neue am Montag',
  },

  invite: {
    shareText: (level) => `Spiel mit mir Roundabout Timing! Erreiche Level ${level}, und wir bekommen beide eine Gratis-Truhe.`,
  },

  rewards: {
    crew: (reason, what) => {
      const [kind, what2, ...rest] = reason.split(':');
      if (kind !== 'crew') return null;
      switch (what2) {
        case 'gift':
          return `CREW-GESCHENK · ${what} · von ${rest.slice(1).join(':') || 'deiner Crew'}`;
        case 'up':
          return `AUFGESTIEGEN · ${what} · ${S.crew.league(rest[0] ?? '')}`;
        case 'goal':
          return `WOCHENZIEL ERREICHT · ${what} · dank deiner Crew`;
        case 'xp':
          return `WOCHENZIEL ×${rest[0] ?? ''} · ${what} · deine Crew hat abgeliefert`;
        case 'top':
          return `LIGA-PLATZ ${rest[0] ?? ''} · ${what} · deine Crew war ganz vorn`;
        case 'back':
          return `GESCHENK ZURÜCK · ${what} · niemand hat es genommen`;
        default:
          return null;
      }
    },
    bugHunter: (id) => `${S.shop.item(id).toUpperCase()} FREIGESCHALTET · danke fürs Fehlerjagen`,
    chest: (kind) => `EIN GESCHENK VOM TEAM · ${S.shop.chest(kind)} · danke`,
    money: (amount) => `EIN GESCHENK VOM TEAM · ${Fmt.number(amount)} Geld · danke`,
    item: (id) => `EIN GESCHENK VOM TEAM · ${S.shop.item(id)} freigeschaltet`,
    invite: (reason, kind) => {
      const [, what, ...rest] = reason.startsWith('invite:') ? reason.split(':') : [];
      const who = rest.join(':');
      switch (what) {
        case 'welcome':
          return `EINLADUNGSBELOHNUNG · ${S.shop.chest(kind)} · du bist über ${who} beigetreten`;
        case 'friend':
          return `EINLADUNGSBELOHNUNG · ${S.shop.chest(kind)} · ${who} hat Level ${INVITE_LEVEL} erreicht`;
        case 'milestone':
          return `EINLADUNGSBONUS · ${S.shop.chest(kind)} · ${who} Freunde sind beigetreten`;
        default:
          return null;
      }
    },
  },

  prestige: {
    title: 'Prestige',
    ready: (level) => `Level ${level} erreicht: Beginne wieder bei Level 1, auf einer härteren Straße`,
    locked: (level) => `Erreiche Level ${level}, um auf einer härteren Straße neu zu beginnen`,
    keeps: 'Geld, Upgrades, Straßen und Sammlung bleiben. Nur Optik, nie ein Vorteil.',
    confirm: 'Tippe erneut für Prestige · zurück zu Level 1',
    available: (rank) => `PRESTIGE ★${rank} BEREIT · beginne unter Fortschritt → Elite neu, für eine härtere Straße und neue Belohnungen`,
    done: (rank, item) => `PRESTIGE ★${rank}${item ? ` · ${S.shop.item(item)} freigeschaltet` : ''}`,
    headStart: (levels) => `Der Verkehr läuft ${levels} Level härter`,
  },

  elite: {
    title: 'Elite',
    caption: (level) => `Elite ${level}`,
    locked: (level) => `Erreiche Level ${level}: Die Elite-Strecke und Prestige öffnen sich`,
    prestigeHeader: 'Prestige',
    rank: 'Rang',
    traffic: 'Verkehr',
    harder: (levels) => `+${levels} Level`,
    prestigeAction: (rank) => `Prestige auf ★${rank}`,
    prestigeConfirm: 'Tippe erneut · zurück zu Level 1',
    next: (step) => `Als Nächstes bei Elite ${step.level}: ${S.elite.reward(step)}`,
    reward: (step) => (step.item ? S.shop.item(step.item.id) : step.title ? `Titel „${S.titles.name(step.title)}“` : S.shop.chest(step.chest)),
    toGo: (b) => {
      const next = `${Fmt.number(b.left)} XP bis Elite ${b.level + 1}`;
      if (b.climbed > 0) return `ELITE ${b.level} · ${next}`;
      return b.gained > 0 ? `+${Fmt.number(b.gained)} XP · ${next}` : next;
    },
    opened: 'ELITE-FAHRER · die Elite-Strecke ist offen',
    reached: (step) => `ELITE ${step.level}${step.item ? ` · ${S.shop.item(step.item.id)} freigeschaltet` : ''}`,
    body: [
      'Ab Level 50 bringt jede Schicht Elite-XP: 10 für eine abgeschlossene Schicht, 1 für jeden Perfekten Einsatz und jede Knappe Lücke, 10 mehr für einen gefassten Boss oder eine Legendäre Schicht.',
      'Jedes Elite-Level verlangt etwas mehr XP als das letzte. Jedes zahlt eine Standard-Truhe, jedes zehnte eine Premium-Truhe. Unterwegs warten Titel und Skins. Prestige behält die Strecke.',
      'Nur Optik, nie ein Vorteil auf der Straße.',
    ],
    trackHeader: 'Entlang der Strecke',
    titlesHeader: 'Titel · tippe einen an, um ihn zu tragen',
    wearing: 'Getragen',
    notYet: 'Noch nicht',
  },
});

