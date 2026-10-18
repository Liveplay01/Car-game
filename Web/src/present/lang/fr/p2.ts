import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { INVITE_LEVEL } from '../../../core/config';
import { rematchKind, ascensionRank, levelTrialLevel, levelKind, LANDMARK_PRESTIGE, type TrialId } from '../../../core/trials';
import { Fmt, money } from '../../format';

/** Français, Partie 2 : Épreuves, Boss, Services légendaires et hebdomadaires, Prestige, Élite. */
export default (S: Strings): Words<Strings> => ({
  rush: {
    name: 'Ruée des boss',
    caption: 'RUÉE DES BOSS',
    clock: 'TEMPS',
    best: 'RECORD',
    step: (n, total) => `Boss ${n} sur ${total}`,
    shiftLine: (kind, first) => `${S.boss.name(kind)} · ${first ? 'si vous perdez une manche, tout recommence' : 'le chrono continue'}`,
    caught: (n, total) => `BOSS ${n} SUR ${total} ARRÊTÉ`,
    nextLine: (kind) => `Suivant : ${S.boss.name(kind)} · touchez pour continuer`,
    over: 'RUÉE TERMINÉE',
    overLine: (caught, total) => `${caught} sur ${total} boss arrêtés · touchez pour recommencer`,
    cleared: 'RUÉE RÉUSSIE',
    firstLine: (m) => `Les huit boss vaincus · ${m} versés`,
    recordLine: 'Nouveau record de temps',
    bestLine: (time) => `Meilleur temps : ${time} · touchez pour une nouvelle tentative`,
    rowTitle: 'Les huit boss',
    line: 'À la suite, un seul chrono',
    furthest: (n, total) => `record atteint ${n}/${total}`,
    locked: (beaten, total) => `Battez les huit boss pour débloquer · ${beaten}/${total}`,
  },

  trials: {
    name(id) {
      const boss = rematchKind(id);
      if (boss) return S.boss.rematch(boss);
      if (id === 'landmark.etoile') return 'L’Étoile';
      if (id === 'weekly') return S.weekly.title;
      if (id.startsWith('tour.')) return S.tours.stopName(id);
      const rank = ascensionRank(id);
      if (rank !== null) return `Ascension ★${rank}`;
      const level = levelTrialLevel(id);
      if (level !== null) return `${S.trials.kindName[levelKind(level)]} · Niv ${level}`;
      return {
        tightSqueeze: 'Passage étroit',
        deadCentre: 'Plein centre',
        cleanSheet: 'Sans faute',
        blackout: 'Blackout',
        stormWatch: 'Vigilance tempête',
        marathon: 'Marathon',
        mostWanted: 'Les plus recherchés',
        noPolice: 'Sans police',
        noDriving: 'Sans assistance',
        bareBuild: 'Anneau brut',
      }[id as TrialId];
    },
    kindName: {
      precision: 'Précision',
      sharpEyes: 'Œil de lynx',
      cleanRun: 'Course propre',
      weatherRun: 'Météo rude',
      nightShift: 'Garde de nuit',
      manhunt: 'Chasse à l’homme',
      ruleBreaker: 'Impitoyable',
      handicap: 'Handicap',
      longHaul: 'Long trajet',
    },
    goal(t) {
      if (t.tour) return S.tours.goal(t);
      if (t.elite) return S.weekly.goal(t);
      if (levelTrialLevel(t.id) !== null) {
        const strip = t.strip ?? [];
        const parts = [
          t.goal.k === 'perfects'
            ? `${t.goal.n} Insertions parfaites`
            : t.goal.k === 'skilled'
              ? `${t.goal.n} Insertions serrées ou mieux`
              : t.goal.k === 'boss'
                ? `Arrêter ${S.boss.name(t.boss ?? 'convoy')}`
                : null,
          `${t.cars} voitures`,
          t.weather !== 'clear' ? S.weather(t.weather) : null,
          t.darkness === 'blackout' ? S.blackout : t.darkness === 'night' ? S.night : null,
          t.legendary ? S.legendary.name(t.legendary) : null,
          t.rule === 'flawless' ? 'aucun crash' : null,
          strip.length > 0 ? `votre anneau sans amélioration ${strip.map((g) => ['police', 'argent', 'conduite'][g]).join(' ni ')}` : null,
        ];
        return parts.filter((p): p is string => p !== null).join(' · ');
      }
      if (ascensionRank(t.id) !== null) {
        const parts = [
          `${t.cars} voitures`,
          t.weather !== 'clear' ? S.weather(t.weather) : null,
          t.darkness === 'blackout' ? S.blackout : t.darkness === 'night' ? S.night : null,
          t.legendary ? S.legendary.name(t.legendary) : null,
          t.rule === 'flawless' ? 'aucun crash' : null,
          t.goal.k === 'boss' ? 'arrêter le boss' : null,
        ];
        return parts.filter((p): p is string => p !== null).join(' · ');
      }
      const boss = rematchKind(t.id);
      if (boss) return `Revanche contre ${S.boss.name(boss)} : plus d’escortes, moins de temps`;
      if (t.arms) return `${t.arms} rues sur un anneau · ${t.cars} voitures`;
      switch (t.id) {
        case 'tightSqueeze':
          return `${t.goal.k === 'skilled' ? t.goal.n : 0} Insertions serrées ou mieux sur ${t.cars} voitures`;
        case 'deadCentre':
          return `${t.goal.k === 'perfects' ? t.goal.n : 0} Insertions parfaites sur ${t.cars} voitures`;
        case 'cleanSheet':
          return `${t.cars} voitures, aucun crash`;
        case 'blackout':
          return `${t.cars} voitures de nuit, lampadaires éteints`;
        case 'stormWatch':
          return `${t.cars} voitures sous la tempête de nuit`;
        case 'marathon':
          return `${t.cars} voitures en un service`;
        case 'mostWanted':
          return 'Arrêtez le chef du syndicat';
        case 'noPolice':
          return `${t.cars} voitures avec votre aménagement, sans améliorations de police`;
        case 'noDriving':
          return `${t.cars} voitures avec votre aménagement, sans améliorations de conduite (pas de bouclier)`;
        case 'bareBuild':
          return `${t.cars} voitures avec votre aménagement, sans police ni conduite`;
        default:
          return '';
      }
    },
    level: (l) => `Niveau ${l}`,
    passed: 'RÉUSSI',
    play: 'Jouer',
    opensAt: (l) => `Disponible au niveau ${l}`,
    opens: (t) => {
      const rank = ascensionRank(t.id);
      if (rank !== null) return `Disponible au Prestige ★${rank}`;
      return t.arms ? `Disponible au Prestige ★${LANDMARK_PRESTIGE}` : S.trials.opensAt(t.level);
    },
    howTo(t) {
      if (t.goal.k === 'perfects') {
        return {
          title: 'Comment faire · Insertion parfaite',
          text: 'Placez votre voiture pile au milieu d’un créneau, avec autant d’espace devant que derrière. Un énorme espace vide ne compte pas : visez un intervalle moyen.',
          short: 'Le centre d’un créneau moyen, pas démesuré',
        };
      }
      if (t.goal.k === 'skilled') {
        return {
          title: 'Comment faire · Insertion serrée',
          text: 'Insérez-vous au plus près de la voiture précédente ou suivante sans la toucher : les créneaux serrés, frôlements et insertions parfaites comptent.',
          short: 'Tout près d’une autre voiture, sans crash',
        };
      }
      return null;
    },
    progress: (t, have, need) => `${t.goal.k === 'perfects' ? 'Insertions parfaites' : 'Insertions serrées ou mieux'} ${Math.min(have, need)}/${need}${have >= need ? ' ✓' : ''}`,
  },

  boss: {
    incoming: 'CONVOI DU SYNDICAT',
    scoutFirst: 'Un éclaireur avec escorte : percutez-le avec une voiture de police dans l’intervalle avant l’escorte',
    name: (k) =>
      ({
        convoy: 'Le Convoi',
        getaway: 'Le Chauffeur en fuite',
        armoured: 'Le Boss blindé',
        phantom: 'Le Fantôme',
        twins: 'Les Jumeaux',
        decoy: 'Le Leurre',
        smuggler: 'Le Contrebandier',
        kingpin: 'Le Parrain',
      })[k],
    rematch: (k) => `Revanche · ${S.boss.name(k)}`,
    beaten: 'Arrêté',
    escaped: 'LE BOSS S’EST ÉCHAPPÉ',
    wanted: (seconds) => `BOSS ${Math.ceil(Math.max(0, seconds))}`,
    busted: (amount) => `Boss arrêté · ${amount} récupérés`,
    label: (role) => (role === 'boss' ? 'BOSS' : role === 'escort' ? 'ESCORTE' : null),
  },

  legendary: {
    caption: 'SERVICE LÉGENDAIRE',
    name: (r) => ({ gridlock: 'Embouteillage monstre', dragnet: 'Coup de filet', heavyLoad: 'Poids lourd', darkStorm: 'Tempête noire', zeroTolerance: 'Tolérance zéro' })[r],
    line: (r) =>
      ({
        gridlock: 'Heure de pointe dès la première voiture',
        dragnet: 'Deux fois plus de criminels',
        heavyLoad: 'Des camions partout, dont la moitié de citernes',
        darkStorm: 'Tempête en plein blackout',
        zeroTolerance: 'Un seul crash arrête tout',
      })[r],
    reward: 'RÉCOMPENSE',
    chest: 'Premium',
    done: (item) => `SERVICE LÉGENDAIRE RÉUSSI${item ? ` · ${S.shop.item(item)} débloqué` : ''}`,
    broken: 'RÈGLE ENFREINTE',
  },

  weekly: {
    title: 'Service hebdomadaire',
    caption: 'SERVICE HEBDOMADAIRE',
    elite: (e) => ({ flawless: 'Sans faute', precision: 'Précision', storm: 'Front d’orage', gridlock: 'Bouchon monstre', dragnet: 'Rafle', boss: 'Chasse au boss' })[e],
    goal(t) {
      switch (t.elite) {
        case 'flawless':
          return `Niveau ${t.level} · ${t.cars} voitures, aucun crash`;
        case 'precision':
          return `Niveau ${t.level} · ${t.goal.k === 'perfects' ? t.goal.n : 0} Insertions parfaites sur ${t.cars} voitures`;
        case 'storm':
          return `Niveau ${t.level} · ${t.cars} voitures sous l’orage de nuit`;
        case 'gridlock':
          return `Niveau ${t.level} · ${t.cars} voitures en heure de pointe d’entrée`;
        case 'dragnet':
          return `Niveau ${t.level} · ${t.cars} voitures, deux fois plus de criminels`;
        case 'boss':
          return `Niveau ${t.level} · arrêtez le chef du syndicat`;
        default:
          return '';
      }
    },
    daysLeft: (n) => (n === 1 ? 'dernier jour' : `encore ${n} jours`),
    hint: 'Même service pour tous cette semaine. Jouez-le autant que souhaité ; paiement unique.',
    done: (m) => `SERVICE HEBDOMADAIRE VALIDÉ · +${money(m)}`,
    passedThisWeek: 'Réussi cette semaine · renouvellement lundi',
  },

  invite: {
    shareText: (level) => `Rejoignez-moi sur Roundabout Timing ! Atteignez le niveau ${level} et nous recevrons tous deux un coffre gratuit.`,
  },

  rewards: {
    crew: (reason, what) => {
      const [kind, what2, ...rest] = reason.split(':');
      if (kind !== 'crew') return null;
      switch (what2) {
        case 'gift':
          return `CADEAU DE LA CREW · ${what} · de ${rest.slice(1).join(':') || 'ta crew'}`;
        case 'up':
          return `MONTÉE DE LIGUE · ${what} · ${S.crew.league(rest[0] ?? '')}`;
        case 'goal':
          return `OBJECTIF DE LA SEMAINE ATTEINT · ${what} · grâce à ta crew`;
        case 'back':
          return `CADEAU RENDU · ${what} · personne ne l’a pris`;
        default:
          return null;
      }
    },
    bugHunter: (id) => `${S.shop.item(id).toUpperCase()} DÉBLOQUÉ · merci pour la chasse aux bugs`,
    chest: (kind) => `UN CADEAU DE L’ÉQUIPE · ${S.shop.chest(kind)} · merci`,
    money: (amount) => `UN CADEAU DE L’ÉQUIPE · ${Fmt.number(amount)} pièces · merci`,
    item: (id) => `UN CADEAU DE L’ÉQUIPE · ${S.shop.item(id)} débloqué`,
    invite: (reason, kind) => {
      const [, what, ...rest] = reason.startsWith('invite:') ? reason.split(':') : [];
      const who = rest.join(':');
      switch (what) {
        case 'welcome':
          return `CADEAU D’INVITATION · ${S.shop.chest(kind)} · vous avez rejoint via ${who}`;
        case 'friend':
          return `CADEAU D’INVITATION · ${S.shop.chest(kind)} · ${who} a atteint le niveau ${INVITE_LEVEL}`;
        case 'milestone':
          return `BONUS D’INVITATION · ${S.shop.chest(kind)} · ${who} amis ont rejoint`;
        default:
          return null;
      }
    },
  },

  prestige: {
    title: 'Prestige',
    ready: (level) => `Niveau ${level} atteint : repartez au niveau 1 sur une chaussée plus exigeante`,
    locked: (level) => `Atteignez le niveau ${level} pour redémarrer sur une chaussée plus ardue`,
    keeps: 'Conservez argent, améliorations, routes et collection. Purement esthétique.',
    confirm: 'Touchez à nouveau pour le Prestige · retour au niveau 1',
    available: (rank) => `PRESTIGE ★${rank} DISPONIBLE · relancez dans Progression → Élite pour une route plus coriace et de nouveaux défis`,
    done: (rank, item) => `PRESTIGE ★${rank}${item ? ` · ${S.shop.item(item)} débloqué` : ''}`,
    headStart: (levels) => `Le trafic démarre ${levels} niveaux plus difficile`,
  },

  elite: {
    title: 'Élite',
    caption: (level) => `Élite ${level}`,
    locked: (level) => `Atteignez le niveau ${level} : la piste Élite et le Prestige s’ouvrent`,
    prestigeHeader: 'Prestige',
    rank: 'Rang',
    traffic: 'Trafic',
    harder: (levels) => `+${levels} niveaux`,
    prestigeAction: (rank) => `Prestige vers ★${rank}`,
    prestigeConfirm: 'Touchez à nouveau · retour au niveau 1',
    next: (step) => `Prochain palier Élite ${step.level} : ${S.elite.reward(step)}`,
    reward: (step) => (step.item ? S.shop.item(step.item.id) : step.title ? `Titre « ${S.titles.name(step.title)} »` : S.shop.chest(step.chest)),
    toGo: (b) => {
      const next = `${Fmt.number(b.left)} XP jusqu’à Élite ${b.level + 1}`;
      if (b.climbed > 0) return `ÉLITE ${b.level} · ${next}`;
      return b.gained > 0 ? `+${Fmt.number(b.gained)} XP · ${next}` : next;
    },
    opened: 'PILOTE D’ÉLITE · la piste Élite est accessible',
    reached: (step) => `ÉLITE ${step.level}${step.item ? ` · ${S.shop.item(step.item.id)} débloqué` : ''}`,
    body: [
      'Dès le niveau 50, chaque service confère de l’XP d’Élite : 10 pour un service achevé, 1 par Insertion parfaite ou serrée, 10 de plus pour un boss arrêté ou un Service légendaire.',
      'Chaque palier Élite demande un peu plus d’XP que le précédent. Chacun accorde un coffre standard, et chaque dixième un coffre premium. Titres et skins à la clé. Le Prestige conserve la piste.',
      'Purement cosmétique, aucun avantage sur la route.',
    ],
    trackHeader: 'Sur le parcours',
    titlesHeader: 'Titres · touchez-en un pour le porter',
    wearing: 'Équipé',
    notYet: 'Pas encore',
  },
});
