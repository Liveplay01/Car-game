import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { Fmt, money } from '../../format';
import { SPECIAL_TEXT, FAIL_TEXT } from '../../museumText';

const COLORS: Record<string, string> = { purple: 'Violet', gold: 'Or', blue: 'Bleu', red: 'Rouge', teal: 'Turquoise', orange: 'Orange', pink: 'Rose', rose: 'Rose pâle' };
const color = (name: string): string => COLORS[name] ?? name;

/** Français, Partie 4 : Succès, Briefing, Notifications, Onglets, Progression, Social, Musée. */
export default (S: Strings): Words<Strings> => ({
  ach: {
    heading: 'Succès',
    name: (id) =>
      ({
        scrapyard: 'Casse auto',
        fireworks: 'Feu d’artifice',
        spotless: 'Impeccable',
        jackpot: 'Chasseur de jackpot',
        critical: 'Coups critiques',
        wizard: 'Magicien du trafic',
        earner: 'Gros gagnant',
        weatherproof: 'Tous temps',
        stormRider: 'Cavalier de la tempête',
        whiteout: 'Tempête blanche',
        moonlighter: 'Travailleur de nuit',
        lightsOut: 'Extinction des feux',
        cityLife: 'Vie citadine',
        longHaul: 'Longue distance',
        clockwork: 'Comme une horloge',
        onARoll: 'Sur une lancée',
        regular: 'Habitué',
        testDriver: 'Pilote d’essai',
        hunter: 'Chasseur du syndicat',
        roadBuilder: 'Bâtisseur de routes',
        foreman: 'Contremaître',
        tuner: 'Préparateur',
        chestOpener: 'Ouvreur de coffres',
        collector: 'Collectionneur',
        climber: 'Grimpeur',
        elite: 'Pilote d’élite',
        reborn: 'Renaissance',
        heatSeeker: 'Traqueur de chaleur',
        gambler: 'Flambeur',
        tourist: 'Touriste',
      })[id] ?? id,
    goal: (id, n) => {
      const N = Fmt.number(n);
      return (
        {
          scrapyard: `Provoquez ${N} crashs`,
          fireworks: `Déclenchez ${N} explosions`,
          spotless: `${N} Manches parfaites`,
          jackpot: `Livrez ${N} fourgons à jackpot`,
          critical: `Réalisez ${N} Insertions critiques`,
          wizard: `Lancez ${N} voitures`,
          earner: `Gagnez ${N} pièces sur la route`,
          weatherproof: `Achevez ${N} services sous mauvaise météo`,
          stormRider: `Achevez ${N} services sous l’orage, la grêle ou la tempête de sable`,
          whiteout: `Achevez ${N} services dans le brouillard ou la neige`,
          moonlighter: `Achevez ${N} services de nuit`,
          lightsOut: `Achevez ${N} services en plein blackout`,
          cityLife: `Achevez ${N} services avec un événement urbain`,
          longHaul: `Tenez ${Fmt.seconds(n)} en mode Sans limites`,
          clockwork: `Achevez ${N} services du jour`,
          onARoll: `Une série quotidienne de ${N} jours`,
          regular: `Réussissez ${N} ${n === 1 ? 'service hebdomadaire' : 'services hebdomadaires'}`,
          testDriver: `Réussissez ${N} ${n === 1 ? 'épreuve' : 'épreuves'}`,
          hunter: `Arrêtez ${N} ${n === 1 ? 'boss du syndicat' : 'boss différents du syndicat'}`,
          roadBuilder: `Construisez ${N} ${n === 1 ? 'voie supplémentaire' : 'voies supplémentaires'}`,
          foreman: `Installez ${N} ${n === 1 ? 'module' : 'modules'}`,
          tuner: `Possédez ${N} niveaux d’amélioration`,
          chestOpener: `Ouvrez ${N} coffres`,
          collector: `Rassemblez ${N} objets`,
          climber: `Atteignez le niveau ${N}`,
          elite: `Atteignez Élite ${N}`,
          reborn: `Passez ${N} fois au Prestige`,
          heatSeeker: `Réussissez un service avec Intensité ${N}`,
          gambler: `Jouez ${N} parties au casino`,
          tourist: `Validez ${N} ${n === 1 ? 'étape de tour' : 'étapes de tour'}`,
        } as Record<string, string>
      )[id] ?? ''
    },
    caption: 'SUCCÈS',
    reached: (id, tier, reward) => ({
      title: S.ach.name(id),
      tier: S.ach.tier(tier),
      reward: `+${money(reward)}`,
      text: `Succès · ${S.ach.name(id)} ${S.ach.tier(tier)} · +${money(reward)}`,
    }),
    many: (n, reward) => ({
      title: `${n} succès`,
      tier: '★',
      reward: `+${money(reward)}`,
      text: `${n} succès · +${money(reward)} · voir Progression → Objectifs`,
    }),
  },

  brief: {
    caption: (e, again) => `${again ? 'Rappel' : 'Nouveau'} · ${S.museum.name(e)}`.toUpperCase(),
  },

  push: {
    streakTitle: (days) => `Votre série de ${days} jours`,
    streakBody: 'Jouez le service d’aujourd’hui avant minuit pour continuer.',
    giftTitle: 'Votre coffre gratuit est disponible',
    giftBody: 'Un coffre standard vous attend. Ouvrez le jeu pour le récupérer.',
    passTitle: (season) => `${S.pass.seasonName(season)} est là`,
    passBody: 'Un nouveau passe de saison est ouvert, avec trois skins à débloquer.',
    row: 'Notifications',
    rowSub: 'Votre série, un coffre gratuit, une nouvelle saison ou un dépassement au Top 20. Une seule par jour maximum.',
    rowInstall: 'Ajoutez d’abord le jeu à l’écran d’accueil pour pouvoir activer les notifications ici.',
    choices: {
      streak: { title: 'Série quotidienne', sub: 'Un rappel en soirée avant la fin de votre série.' },
      chests: { title: 'Coffres gratuits', sub: 'Votre coffre gratuit du lendemain et cadeaux d’invitation.' },
      pass: { title: 'Nouvelle saison', sub: 'Au lancement d’un nouveau passe de saison.' },
      rank: { title: 'Dépassement', sub: 'Lorsqu’un joueur vous dépasse dans le Top 20.' },
      comeback: { title: 'Revenez jouer', sub: 'Un rappel après quelques jours d’absence.' },
    },
    rowNone: 'Indisponible ici. Ouvrez le jeu dans votre navigateur pour activer les notifications.',
    rowLocal: 'Activé. Les alertes jeu fermé requièrent le service en ligne absent de cette version.',
    confirmTitle: 'Notifications activées',
    rowBlocked: 'Bloqué pour ce site. Autorisez les notifications dans les réglages du navigateur.',
    offerFirstTitle: 'Coffre gratuit demain',
    offerFirstWhy: 'Recevez un rappel pour votre coffre gratuit de demain et avant qu’une série ne s’éteigne. Une par jour au maximum, jamais la nuit.',
    offerTitle: 'Maintenez votre série',
    offerWhy: 'Soyez averti avant la perte d’une série, pour un coffre ou une nouvelle saison. Une par jour max, jamais la nuit. Désactivable à tout moment.',
    offerOn: 'Activer les notifications',
    offerLater: 'Pas maintenant',
    on: 'Notifications activées. Désactivables à tout moment dans les Paramètres.',
    failed: 'Impossible d’activer les notifications. Réessayez plus tard.',
    denied: 'Les notifications sont bloquées dans les réglages de votre navigateur.',
  },

  wayBack: {
    chestTitle: 'Coffre gratuit demain',
    streakTitle: 'À demain',
    chestWhy: 'Ajoutez le jeu à votre écran d’accueil : le coffre gratuit de demain sera à portée de doigt, et votre progression reste en sécurité.',
    streakWhy: 'Ajoutez le jeu à votre écran d’accueil : demain, votre série sera à portée de doigt, et votre progression reste en sécurité.',
    install: 'Installer le jeu',
  },

  ready: {
    tapToStart: 'Touchez pour démarrer',
    tapForFriends: 'Touchez pour jouer entre amis',
  },

  tabs: {
    progress: 'Progression',
    social: 'Social',
    game: 'Jeu',
    shop: 'Boutique',
    build: 'Bâtir',
  },

  progress: {
    section: (i) => ['Crew', 'Classement', 'Club', 'Mafia'][i],
    allStats: 'Toutes les stats',
    statsMore: (n) => `${n} de plus ›`,
    statsHide: 'Masquer',
    quests: 'Missions',
    trials: 'Épreuves',
    mastery: 'Maîtrise',
    feats: 'Prouesses',
    trialsLocked: (level) => `Disponible au niveau ${level} · services spéciaux avec récompenses`,
    landmarks: 'Monuments',
    landmarksHint: 'Ronds-points célèbres, chacun représentant un service ardu.',
    ascension: 'Ascension',
    ascensionHint: 'Une épreuve pour chaque palier de prestige : les services les plus rudes.',
    levelTrials: 'Épreuves de niveau',
    levelTrialsHint: (waiting, shown) =>
      waiting > shown ? `Une de plus par niveau. ${waiting - shown} autres en attente : réussissez-en une pour révéler la suivante.` : 'Une nouvelle par niveau, du niveau 30 à 120.',
    bosses: 'Boss du syndicat',
    legendary: 'Services légendaires',
    weeklies: 'Services hebdomadaires',
    ambulances: 'Ambulances dégagées',
    level: 'Niveau atteint',
    bestCombo: 'Meilleur combo',
    bestChain: 'Plus longue chaîne parfaite',
    streak: 'Série quotidienne',
    flameTier: (tier) => ['MOTEUR ÉTEINT', 'MOTEUR AU RALENTI', 'MOTEUR DANS LES TOURS', 'PÉTARADES', 'POSTCOMBUSTION', 'INFERNO'][tier] ?? '',
    streakDay: 'jour consécutif',
    streakDays: 'jours consécutifs',
    streakStart: 'Jouez le service d’aujourd’hui pour lancer le moteur',
    streakKeep: 'Jouez le service d’aujourd’hui pour le garder allumé',
    streakDone: 'Terminé aujourd’hui · revenez demain',
    streakCard: (n) => (n === 1 ? 'Ticket de grattage gratuit demain' : `Ticket de grattage gratuit dans ${n} jours`),
    shiftsPlayed: 'Services joués',
    shiftsCompleted: 'Services achevés',
    takedowns: 'Interpellations',
    transporters: 'Fourgons encaissés',
    unlimitedBest: 'Record Sans limites',
    unlimitedCars: 'Voitures Sans limites',
    unlimitedTier: 'Rang Sans limites',
    mayhemBest: 'Flammes en Paguaille',
    mayhemChain: 'Chaîne en Paguaille',
    minutes: (s) => (s < 3600 ? `${Math.max(1, Math.round(s / 60))} min` : `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`),
    tours: 'Étapes de tour',
    perfects: 'Insertions parfaites',
    chestsOpened: 'Coffres ouverts',
    days: (d) => (d === 1 ? '1 jour' : `${d} jours`),
    collectionShare: (o, t) => `Collection · ${Math.floor((o / t) * 100)} %`,
    questsHint: 'Les missions paient une fois et changent à minuit.',
    timingLabel: (n) => `Votre synchronisation · ${n} dernières entrées`,
    timing: (ms, onBeat) => (ms === null ? '–' : Math.abs(ms) <= onBeat ? 'Parfait' : ms < 0 ? `${-ms} ms trop tôt` : `${ms} ms trop tard`),
  },

  social: {
    section: (i) => ['Amis', 'Classement', 'Club', 'Mafia'][i],
    clubClosed: 'Le Club s’ouvre au niveau 50 : enchères et fonds du jeu pour gros comptes.',
    mafiaClosed: 'La Famille ne s’occupe pas des novices. Neutralisez le premier boss (niveau 15) et elle se manifestera.',
    offline: 'Crews et Classement requièrent le service en ligne absent de cette copie.',
    noCrew: 'Les crews ne sont pas disponibles ici. Classements et Club restent accessibles.',
  },

  museum: {
    shelf: (i) => ['Boss', 'Spéciaux', 'Conditions', 'Échecs'][i],
    lockedFailHint: 'Cela ne vous est pas encore arrivé. Perdez un service ainsi et il apparaît ici, avec ce qui a mal tourné et comment l’éviter.',
    failuresDone: (skin) => `Toutes les façons de perdre trouvées : le skin ${skin} est à vous`,
    notSeen: 'Pas encore croisé',
    newBadge: 'NOUVEAU',
    firstTime: 'Découverte',
    firstAt: (level, rank = 0) => (rank > 0 ? `À partir de ${S.museum.place(level, rank)}` : `À partir du niveau ${level}`),
    undiscovered: 'Non découvert',
    lockedHint: (level, rank = 0) =>
      rank > 0 || level > 1
        ? rank > 0
          ? `Apparaît à partir de ${S.museum.place(level, rank)}. Dès sa première rencontre sur la route, sa fiche complète s’affichera ici.`
          : `Apparaît à partir du niveau ${level}. Dès sa première rencontre sur la route, sa fiche complète s’affichera ici.`
        : 'Continuez vos services. Dès sa rencontre sur la route, sa fiche s’affichera ici.',
    lockedBossHint: (level, rank = 0) => (rank > 0 ? `Le syndicat le dépêche à ${S.museum.place(level, rank)}. Dès votre premier affrontement, il sera répertorié ici avec la marche à suivre.` : `Le syndicat le dépêche au niveau ${level}. Dès votre premier affrontement, il sera répertorié ici avec la marche à suivre.`),
    kind: (e) => ({ boss: 'Boss du syndicat', special: 'Véhicule spécial', weather: 'Météo', dark: 'Obscurité', event: 'Événement urbain', road: 'Chaussée', fail: 'Échec' })[e.k],
    met: 'Rencontré, toujours en fuite',
    onRing: 'Sur l’anneau',
    signalArrive: (arm, sweep) =>
      arm && sweep
        ? `La bretelle d’arrivée s’illumine en ${color(arm)}, puis un halo ${color(sweep)} fait le tour de l’îlot.`
        : arm
          ? `La bretelle d’arrivée s’illumine en ${color(arm)} avant l’entrée sur l’anneau.`
          : `Un halo ${color(sweep ?? '')} fait le tour de l’îlot.`,
    signalPaid: (c) => `Réussi : un anneau ${color(c)} s’élargit depuis l’îlot central.`,
    signalMissed: (c) => `Manqué : un anneau ${color(c)} se rétracte vers l’îlot central.`,
    signalNote: (n) =>
      n === 'escaped' ? 'S’il s’échappe, l’anneau entier clignote en violet.' : 'Une voiture qui s’insère devant lui fait clignoter l’anneau en rouge et coupe votre combo.',
    heist: 'Butin récupéré',
    firstMet: 'Niveau d’apparition',
    rematch: 'Revanche',
    name(e) {
      switch (e.k) {
        case 'boss':
          return S.boss.name(e.kind);
        case 'special':
          return SPECIAL_TEXT[e.kind].name;
        case 'weather':
          return S.weather(e.kind);
        case 'dark':
          return e.kind === 'blackout' ? S.blackout : S.night;
        case 'event':
          return S.cityEvent(e.kind);
        case 'road':
          return 'Deux voies';
        case 'fail':
          return FAIL_TEXT[e.kind].name;
      }
    },
  },
});
