import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { Fmt, money } from '../../format';

/** Français, Partie 3 : Titres, Passe de saison, Panthéon, Modes, Mutateurs, Tours. */
export default (S: Strings): Words<Strings> => ({
  titles: {
    name: (id) =>
      ({
        eliteDriver: 'Pilote d’élite',
        roadVeteran: 'Vétéran de l’asphalte',
        ringMaster: 'Maître de l’anneau',
        ironNerves: 'Nerfs d’acier',
        roadRoyalty: 'Noblesse de la route',
        livingLegend: 'Légende vivante',
        precisionDriver: 'Pilote de précision',
        comboMaster: 'Maître du combo',
        closeCallArtist: 'Artiste du frôlement',
        syndicateBreaker: 'Tombeur du syndicat',
        nightOwl: 'Oiseau de nuit',
        stormChaser: 'Chasseur d’orage',
        legendHunter: 'Chasseur de légendes',
        starDriver: 'Pilote stellaire',
        marathoner: 'Marathonien',
        overdriver: 'Survolté',
        endless: 'Infini',
        scorcher: 'Bolide brûlant',
        inferno: 'Inferno',
        meltdown: 'Fusion',
        patron: 'Mécène',
        benefactor: 'Bienfaiteur',
        philanthropist: 'Philanthrope',
        visionary: 'Visionnaire',
        sovereign: 'Souverain',
        timeless: 'Intemporel',
        apex: 'Apex',
        boundless: 'Sans limites',
        crewPodium: 'Crew sur le podium',
        crewChampion: 'Champion de crew',
        collector: 'Collectionneur',
        completionist: 'Perfectionniste',
        ascended: 'Ascendant',
        eternal: 'Éternel',
        grandmaster: 'Grand maître',
        centurion: 'Centurion',
        immortal: 'Immortel',
        roadWarden: 'Gardien de la route',
        gridlord: 'Seigneur du trafic',
        ringbearer: 'Porteur de l’anneau',
        unstoppable: 'Inarrêtable',
        timekeeper: 'Maître du temps',
        paragon: 'Modèle',
        mythic: 'Mythique',
        ringEternal: 'Anneau éternel',
        mastermind: 'Cerveau',
        summit: 'Sommet',
        syndicateEnd: 'Chute du syndicat',
      })[id],
    rule(r) {
      switch (r.k) {
        case 'elite':
          return `Atteignez Élite ${r.level}`;
        case 'mastery':
          return `Terminez la maîtrise « ${S.mastery.name(r.goal)} »`;
        case 'bosses':
          return r.all ? 'Arrêtez les huit boss du syndicat' : 'Arrêtez les quatre premiers boss du syndicat';
        case 'trial':
          return `Réussissez l’épreuve « ${S.trials.name(r.id as never)} »`;
        case 'legendary':
          return `Accomplissez ${r.shifts} services légendaires`;
        case 'prestige':
          return `Atteignez le Prestige ★${r.rank}`;
        case 'heat':
          return S.heat.rule(r.level);
        case 'fund':
          return `Donnez ${money(Fmt.number(r.amount))} au Fonds du jeu`;
        case 'item':
          return `Débloquez ${S.shop.item(r.id)} en mode Sans limites`;
        case 'masteries':
          return 'Atteignez le rang V dans chaque maîtrise';
        case 'crew':
          return r.place === 1 ? 'Termine une semaine de crew à la première place de la ligue' : 'Termine une semaine de crew dans le top 3 de la ligue';
        case 'collector':
          return 'Obtenez tous les skins encore disponibles';
        case 'completionist':
          return 'Obtenez tous les autres titres';
      }
    },
    earned: (ids) => (ids.length === 1 ? `TITRE · ${S.titles.name(ids[0])}` : `${ids.length} NOUVEAUX TITRES · ${ids.map((t) => S.titles.name(t)).join(', ')}`),
    none: 'Aucun titre',
  },

  pass: {
    title: 'Passe de saison',
    seasonName: (s) => ({ winter: 'Hiver', spring: 'Printemps', summer: 'Été', autumn: 'Automne' })[s],
    caption: (s) => `Passe de saison ${S.pass.seasonName(s)}`,
    tier: (n, total) => `Palier ${n} sur ${total}`,
    locked: (level) => `Se débloque au niveau ${level}`,
    buyHint: 'Coffres, pièces et trois skins',
    free: 'gratuit',
    waiting: (n) => (n === 1 ? '1 palier attend le pass' : `${n} paliers attendent le pass`),
    daysLeft: (n) => (n === 1 ? 'dernier jour' : `encore ${n} jours`),
    complete: 'Piste achevée · rendez-vous à la saison suivante',
    openAtEnd: (n) => (n === 1 ? 'Fin de saison proche · encore 1 palier' : `Fin de saison proche · encore ${n} paliers`),
    reached: (step) =>
      `PASSE DE SAISON · PALIER ${step.tier} · ${step.duplicate > 0 ? `${S.pass.reward(step.reward)} à nouveau · +${money(Fmt.number(step.duplicate))}` : S.pass.reward(step.reward)}`,
    buy: (price) => `Acheter · ${price}`,
    body: (xpPerTier) => [
      `Une piste de douze paliers pour cette saison, accessible avec l’argent du jeu. Chaque service confère de l’XP : 10 par service terminé, 1 par Insertion parfaite ou serrée, 10 de plus pour un boss ou un Service légendaire. Le premier palier réclame ${xpPerTier} XP, puis un peu plus à chaque étape.`,
      'Trois des paliers contiennent les skins uniques de la saison, avec des effets introuvables en coffre. Les quatre saisons reviennent chaque année avec leurs récompenses.',
      'Purement cosmétique, aucun avantage sur la route. Rien ne coûte d’argent réel.',
    ],
    freeBody: (xpPerTier) => [
      `Une piste de douze paliers pour cette saison. Chaque service rapporte de l’XP, avec ou sans pass : 10 pour un service terminé, 1 par Insertion parfaite ou serrée, 10 de plus pour un boss ou un Service légendaire. Le premier palier demande ${xpPerTier} XP, chaque palier suivant un peu plus.`,
      'Trois paliers sont gratuits pour tous. Achète le pass avec l’argent du jeu et chaque autre palier paie, ceux déjà atteints tout de suite.',
      'Trois des paliers contiennent les skins de cette saison, avec des effets qu’aucun coffre n’a. Les quatre saisons reviennent chaque année, et leurs skins aussi. Juste du style, jamais un avantage sur la route.',
    ],
    trackHeader: 'La piste',
  },

  hall: {
    header: 'Journal de prestige',
    plaqueLine: (e, date) =>
      [date, e.elite > 0 ? `Élite ${e.elite}` : null, `${e.bosses} ${e.bosses === 1 ? 'boss' : 'boss'}`, e.legendary > 0 ? `${e.legendary} légendaires` : null].filter((x) => x).join(' · '),
    empty: 'Votre premier prestige inaugurera la première plaque.',
  },

  modes: {
    name: (m) => (m === 'shift' ? 'SERVICE' : m === 'unlimited' ? 'SANS LIMITES' : m === 'mayhem' ? 'PAGUAILLE' : 'MULTIJOUEUR'),
    line: (m) =>
      m === 'shift'
        ? 'Passez les niveaux et grimpez'
        : m === 'unlimited'
          ? 'Sans fin · jusqu’au crash'
          : m === 'mayhem'
            ? '12 voitures · visez les citernes'
              : 'Jusqu’à 4 amis · le dernier gagne',
    youLabel: 'VOUS',
    defaultName: 'Joueur',
    runOver: 'COURSE TERMINÉE',
    again: 'Touchez pour recommencer',
    carsSent: (n) => (n === 1 ? '1 voiture' : `${n} voitures`),
    tryUnlimited: { caption: 'MODES DE JEU', text: 'Balayez pour Sans limites : pas de niveaux, roulez jusqu’au crash' },
    tightFit: { caption: 'ASTUCE', text: 'Plus près rapporte plus : serrez la voiture précédente pour une Insertion serrée aux points doublés' },
    swipeCaption: 'MODES DE JEU',
    swipeHint: 'Balayez pour afficher plus de modes',
    tryUnlimitedKeys: { caption: 'MODES DE JEU', text: 'Appuyez sur → pour Sans limites : pas de niveaux, roulez jusqu’au crash' },
    swipeHintKeys: '← → pour afficher plus de modes',
    stage: (stage, overtime) =>
      overtime > 0
        ? `HEURES SUPPLÉMENTAIRES ${overtime} · trafic accru, rythme plus rapide`
        : (['', 'DES CITERNES DE GAZ SE MÊLENT AU FLUX', 'LA NUIT TOMBE', 'UN ORAGE APPROCHE', 'CAMIONS MILITAIRES SUR L’ANNEAU'][stage] ?? ''),
    tier: (id) => ({ bronze: 'Bronze', silver: 'Argent', gold: 'Or', platinum: 'Platine', diamond: 'Diamant', master: 'Maître' })[id],
    mark: (cars, reward) =>
      reward.tier ? `${cars} voitures · ${S.modes.tier(reward.tier).toUpperCase()}` : reward.skin ? `${cars} voitures · ${S.shop.item(reward.skin).toUpperCase()}` : `${cars} voitures`,
    tierUp: (id) => `NOUVEAU RANG · ${S.modes.tier(id).toUpperCase()} en Sans limites`,
    tierLine: (id, next) => [id ? S.modes.tier(id) : '–', next ? `${next.cars} voitures pour ${S.modes.tier(next.id)}` : null].filter(Boolean).join(' · '),
    milestone: (id) => `ÉTAPE SANS LIMITES · ${S.shop.item(id)} débloqué`,
  },

  mayhem: {
    caption: 'PAGUAILLE',
    flames: 'FLAMMES',
    cars: 'VOITURES',
    chain: (n) => `CHAÎNE ×${n}`,
    over: 'FIN DU CARNAGE',
    again: 'Touchez pour plus de dégâts',
    summary: (wrecks, chain) => `${wrecks} ${wrecks === 1 ? 'épave' : 'épaves'} · plus longue chaîne ×${chain}`,
  },

  seasonRule: {
    name: (s) => ({ winter: 'Grand Hiver', spring: 'Giboulées', summer: 'Orages d’été', autumn: 'Brume & Pénombre' })[s],
    line: (s) =>
      ({
        winter: 'La neige et le brouillard se multiplient et la nuit tombe tôt',
        spring: 'Des averses plus fréquentes',
        summer: 'Temps clair en général, mais les changements virent à l’orage',
        autumn: 'Plus de brume, crépuscules précoces',
      })[s],
  },

  tours: {
    caption: 'TOUR',
    name: (id) => ({ halloween: 'Anneau Hanté', winter: 'Lumières d’Hiver' })[id],
    tagline: (id) =>
      ({
        halloween: 'Sept étapes après la tombée du jour. Trois skins exclusifs.',
        winter: 'Sept étapes enneigées. Trois skins exclusifs.',
      })[id],
    stop: (n, of) => `Étape ${n}/${of}`,
    stopName: (id) => {
      const m = /^tour\.([a-z]+)\.(\d+)$/.exec(id);
      return m ? `${S.tours.name(m[1] as 'halloween' | 'winter')} · Étape ${m[2]}` : '';
    },
    left: (n) => (n <= 1 ? 'dernier jour' : `encore ${n} jours`),
    opensIn: (n) => (n === 1 ? 'demain' : `dans ${n} jours`),
    startsIn: (inDays) => `Débute ${S.tours.opensIn(inDays)}`,
    locked: (level) => `Les tours s’ouvrent au niveau ${level}`,
    progress: (done, total) => `${done}/${total} étapes`,
    play: 'Jouer ›',
    goal(t) {
      const parts = [
        `${t.cars} voitures`,
        t.weather !== 'clear' ? S.weather(t.weather) : null,
        t.darkness === 'blackout' ? S.blackout : t.darkness === 'night' ? S.night : null,
        t.legendary ? S.legendary.name(t.legendary) : null,
        t.rule === 'flawless' ? 'aucun crash' : null,
        t.goal.k === 'perfects' ? `${t.goal.n} Insertions parfaites` : null,
        t.goal.k === 'boss' ? 'arrêter le boss' : null,
      ];
      return parts.filter((p): p is string => p !== null).join(' · ');
    },
    reward(r) {
      const parts = [r.item ? S.shop.item(r.item) : null, r.chest ? S.shop.chest(r.chest) : null, r.money ? `${Fmt.number(r.money)} pièces` : null];
      return parts.filter((p): p is string => p !== null).join(' + ');
    },
    stopDone: (n, of, reward) => `ÉTAPE DU TOUR ${n}/${of} · ${reward}`,
    complete: (id) => `${S.tours.name(id).toUpperCase()} VALIDÉ`,
    passedBefore: 'Déjà validé sur ce tour',
  },
});
