import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { Fmt, money, percent, multiplier } from '../../format';
import { MONEY_MARK } from '../../icons';
import { baseConfig } from '../../../core/config';
import { MASTERY_THRESHOLDS, masteryNumeral } from '../../../core/career';

/** Français, Partie 6 : Mafia, Boutique, Grand écran, Service du jour, Albums, Maîtrise, Météo. */
export default (S: Strings): Words<Strings> => ({
  mafia: {
    title: 'La Famille',
    speeds: ['Lente', 'Vive', 'Frénétique'],
    pointer: (speed) => `Aiguille · ${speed}`,
    takeCash: 'Prendre l’argent',
    tagline: 'Ils respectent un pilote ayant coffré leur boss. Ils prêtent, mais récupèrent tout.',
    badge: 'Mafia',
    don: 'Le Don',
    pitch: 'Choisissez un emprunt, asseyez-vous et stoppez l’aiguille en zone verte. Plus vous visez le centre, meilleur est le deal. Plus l’emprunt est élevé, plus l’aiguille accélère.',
    rules: (rate, cap, garnish) =>
      `Remboursez avant la date fixée. En retard, la dette gonfle de ${Math.round(rate * 100)} % par jour (jusqu’à +${Math.round(cap * 100)} %), ${Math.round(garnish * 100)} % de chaque service va à la Famille, aucun fourgon, criminel ou boss ne paie, le casino ferme et votre nom porte l’insigne de la Mafia. Soldez tout pour effacer la dette. Tout prêt remboursé à temps élargit la zone verte du suivant.`,
    grade: (g) => ({ perfect: 'PARFAIT', good: 'BON', miss: 'MANQUÉ' })[g],
    gradeText: (g) => ({ perfect: 'Pile dans le mille. Le Don sourit.', good: 'Une poignée de main équitable.', miss: 'Le Don hausse les épaules. Seule l’offre de base tient.' })[g],
    set: 'S’asseoir',
    stop: 'STOP',
    tapToStop: 'Touchez pour arrêter l’aiguille',
    setting: 'Le Don attend…',
    loanLabel: 'Prêt',
    perDay: (days) => `${days} ${days === 1 ? 'jour' : 'jours'}`,
    offer: (interest, days) => `${Math.round(interest * 100)} % d’intérêt · ${days} ${days === 1 ? 'jour' : 'jours'}`,
    zone: (width, clean) => `Zone verte : ${Math.round(width * 100)} % de la barre${clean > 0 ? ` · ${clean} ${clean === 1 ? 'prêt remboursé' : 'prêts remboursés'} à temps` : ''}`,
    ledger: 'Grand livre',
    lent: 'Emprunté',
    owed: 'Dû',
    due: 'Échéance',
    late: 'EN RETARD',
    paid: 'Déjà réglé',
    countdown: (ms) => {
      const mins = Math.max(0, Math.floor(ms / 60_000));
      const days = Math.floor(mins / 1440);
      const hours = Math.floor((mins % 1440) / 60);
      if (days > 0) return `encore ${days} j ${hours} h`;
      return hours > 0 ? `encore ${hours} h ${mins % 60} min` : `encore ${mins} min`;
    },
    lateFor: (ms) => {
      const days = Math.floor(ms / 86_400_000);
      return days > 0 ? `en retard de ${days} ${days === 1 ? 'jour' : 'jours'}` : 'Vient d’expirer';
    },
    repayShare: (share) => (share >= 1 ? 'Payer la totalité' : `Payer ${Math.round(share * 100)} %`),
    noMoney: 'Fonds insuffisants pour régler cela.',
    waiting: 'Le Don observe',
    atStake: 'En cas de retard',
    inForce: 'En vigueur jusqu’au solde',
    consequences: (garnish) => ['Casino fermé', 'Ni fourgon, ni criminel, ni boss', `${Math.round(garnish * 100)} % prélevés sur chaque service`, 'Insigne Mafia au classement'],
    overdue: 'EXPIRÉ',
    overdueText: 'La Famille se sert. Chaque service leur revient d’abord.',
    paidStamp: 'ACQUITTÉ',
    assist: 'Main sûre',
    assistText: 'Aiguille ralentie, mais pas d’accord Parfait possible',
    banned: (date) => `La Famille ne prend pas vos appels. Retour possible le ${date}.`,
    nextStep: (interest, nextInterest, zone, nextZone) =>
      `Remboursez le prochain prêt à l’heure : intérêt ${Math.round(interest * 100)} % → ${Math.round(nextInterest * 100)} %, zone verte ${Math.round(zone * 100)} % → ${Math.round(nextZone * 100)} %`,
    shiftsToClear: (n) => `Environ ${n} ${n === 1 ? 'service' : 'services'} de recettes pour solder`,
    onlyOne: 'Un seul prêt à la fois. Réglez celui-ci d’abord.',
    letters: 'Courriers',
    letter: (kind, owed, date) =>
      ({
        taken: `Ce fut un plaisir. ${owed} avant le ${date}, pas un jour de plus. Ne m’obligez pas à venir vous chercher.`,
        half: 'La moitié du délai est passée. La Famille n’oublie ni dette, ni ami ponctuel.',
        day: 'Encore un jour. Soyez sage et réglez la note avant que cela ne devienne personnel.',
        late: 'Le temps est écoulé. Votre nom est sur la liste. La route nous paie en premier et le casino vous est fermé.',
        later: 'Le chiffre grossit chaque jour. Payez et redevenons amis.',
      })[kind],
    notices: {
      late: 'LA FAMILLE ATTEND · votre prêt est expiré · le casino est fermé',
      grace: 'LA FAMILLE VOUS ACCORDE UN JOUR · l’échéance est passée pendant votre absence',
      writtenOff: 'LA FAMILLE FAIT UNE CROIX SUR VOUS · la dette est effacée, mais leurs portes restent closes 14 jours',
    },
    garnished: (cut, cleared) => (cleared ? `LA FAMILLE A PRÉLEVÉ ${money(cut)} · dette soldée, vous êtes quitte` : `LA FAMILLE A PRÉLEVÉ ${money(cut)} sur vos gains`),
    casinoShut: 'Le casino est fermé tant que la Famille attend ses fonds.',
  },

  shop: {
    open: 'Ouvrir',
    wear: 'Équiper',
    takeOff: 'Retirer',
    worn: 'Équipé',
    inTraffic: 'Dans le trafic',
    vehicleAuto: 'Inutile d’équiper : le véhicule s’insère de lui-même dans le trafic.',
    lockedTitle: (kind) => (kind === 'mapSkin' ? 'Carte mystère' : kind === 'vehicleType' ? 'Véhicule mystère' : 'Skin mystère'),
    source(k) {
      switch (k) {
        case 'standard':
          return 'En vente · ou via publicités';
        case 'premium':
          return 'En vente · ou par de rudes maîtrises';
        case 'diamond':
          return 'En vente · jamais de commun';
        case 'event':
          return 'Événements urbains · Service du jour';
        case 'criminalHunt':
          return 'Remporté en capturant des criminels';
      }
    },
    seasonHint: 'Contient à 50 % l’objet de cette saison jusqu’à son obtention.',
    pickItem: 'Touchez un objet pour le découvrir.',
    lockedHint(item) {
      if (item.source.kind === 'streak') return `Jouez le service du jour ${item.source.days} jours consécutifs.`;
      if (item.source.kind === 'season') return `Seulement en coffre d’événement durant la saison ${S.pass.seasonName(item.source.season)}.`;
      if (item.source.kind === 'legendary') return item.source.shifts === 1 ? 'Terminez un Service légendaire.' : `Terminez ${item.source.shifts} services légendaires.`;
      if (item.source.kind === 'prestige') return `Atteignez le Prestige ★${item.source.rank}.`;
      if (item.source.kind === 'elite') return `Atteignez Élite ${item.source.level}.`;
      if (item.source.kind === 'pass') return `Palier ${item.source.tier} du Passe ${S.pass.seasonName(item.source.season)}. Revient chaque année.`;
      if (item.source.kind === 'hall') return 'Construisez le Panthéon (Records → Élite).';
      if (item.source.kind === 'unlimited') return `Lancez ${Fmt.number(item.source.cars)} voitures en mode Sans limites.`;
      if (item.source.kind === 'tour') return `Une étape du tour « ${S.tours.name(item.source.tour as 'halloween' | 'winter')} ». Revient chaque année.`;
      if (item.source.kind === 'auction') return 'En vente exclusive aux enchères (Social → Club).';
      if (item.source.kind === 'failures') return 'Trouvez toutes les façons de perdre un service (Progression → Musée → Échecs). Purement esthétique.';
      if (item.source.kind === 'casino') return `${S.casino.feat(item.source.feat)} : seul le casino le donne (Boutique → Casino). Purement esthétique.`;
      if (item.source.kind === 'fund') return 'Ancien remerciement du fonds municipal. Plus attribué.';
      if (item.source.kind === 'bugReport')
        return item.source.reports === 1
          ? 'Signalez un bug sur timing.love avec votre code ami. Réservé aux chasseurs de bugs.'
          : `Signalez ${item.source.reports} bugs sur timing.love avec votre code ami, un par jour.`;
      if (item.source.kind === 'find') return `Trouvaille rare : ${S.shop.findOdds(item.source.chance)} ${S.shop.chest(item.source.chest)}. La seule distinction purement due à la chance.`;
      return 'Pas encore trouvé : contenu dans les coffres.';
    },
    tapToClose: 'Touchez pour fermer',
    tapToBreak: 'Touchez vite !',
    tapOdds: (odds) => `Touchez rapidement pour forcer le coffre : chaque contact dans la demi-seconde compte ; à pleine puissance, les chances sont de ${odds}.`,
    watchAdShort: 'Voir une pub',
    adReward: 'Publicité vue · Coffre standard ajouté',
    noAdsLeft: 'Plus de coffres publicitaires aujourd’hui. Revenez demain.',
    adPlaceholder: 'Publicité',
    adCountdown: (reward, s) => `${{ chest: 'Votre coffre', upgrade: 'Votre étape gratuite', boost: 'Votre boost' }[reward]} dans ${s} s`,
    watchAd: (left) => `Voir une pub · ${left} restants`,
    skinsOn: (n, max) => `${n} sur ${max} skins de voiture actifs · ils se mélangent sur l’anneau`,
    skinsFull: (max) => `${max} skins actifs. Retirez-en un d’abord.`,
    section: (i) => ['Coffres', 'Collection', 'Casino'][i],
    earnedHeading: 'Mérité, pas acheté',
    newBadge: 'NOUVEAU',
    shelf: (i) => ['Voitures', 'Cartes', 'Mérité', 'Passe'][i],
    group: (g, honours = false) => {
      const name = { common: 'Commun', rare: 'Rare', epic: 'Épique', legendary: 'Légendaire', vehicles: 'Véhicules', seasons: 'Saisons', maps: 'Cartes' }[g];
      return honours && g !== 'vehicles' && g !== 'seasons' && g !== 'maps' ? `Voitures · ${name}` : name;
    },
    waiting: (n) => (n === 1 ? '1 en attente' : `${n} en attente`),
    buy: (price) => `Acheter · ${price}`,
    pity: (n) => `Épique ou supérieur garanti sous ${n} coffres. Les doublons rapportent ${MONEY_MARK}.`,
    pityLegendary: (n) => `Un Légendaire garanti sous ${n} coffres.`,
    duplicate: (m) => `Doublon · +${money(m)}`,
    ownedHint(item) {
      if (item.kind === 'carSkin') return 'Habille les voitures sur la route. Combinez-en jusqu’à huit. Purement esthétique.';
      if (item.id === 'bigScreen') return 'Votre image ou vidéo en arrière-plan du rond-point : téléversez une photo ou collez un lien vidéo. Purement esthétique.';
      if (item.kind === 'mapSkin') return 'Donne un décor unique à la ville. Purement esthétique.';
      return `Apparaît ponctuellement dans votre file : ${S.shop.trait(item.id)}.`;
    },
    chest(k) {
      switch (k) {
        case 'standard':
          return 'Coffre standard';
        case 'premium':
          return 'Coffre premium';
        case 'diamond':
          return 'Coffre diamant';
        case 'event':
          return 'Coffre d’événement';
        case 'criminalHunt':
          return 'Coffre de chasse criminelle';
      }
    },
    rarity: (r) => ({ common: 'Commun', rare: 'Rare', epic: 'Épique', legendary: 'Légendaire' })[r],
    trait: (id) =>
      id === 'compact'
        ? 'minuscule, légère, s’insère plus posément'
        : id === 'van'
          ? 'long, lourd, s’insère plus vite'
          : id === 'classic'
            ? 'conduite classique, long capot chromé'
            : 'plus courte, vive, prompte à l’insertion',
    findOdds: (chance) => `1 sur ${Fmt.number(Math.round(1 / chance))} dans un`,
    oneIn: (chance) => `1 sur ${Fmt.number(Math.round(1 / chance))}`,
    findRow: (id) => `${S.shop.item(id)} · Distinction`,
    found: 'Trouvé',
    findHint: (id) => `${S.shop.item(id)} est la seule distinction régie par la chance. Elle remplace votre tirage habituel jusqu’à obtention.`,
    kind(item) {
      const kind = item.kind === 'carSkin' ? 'Skin de voiture' : item.kind === 'mapSkin' ? 'Skin de carte' : `Type de véhicule · ${S.shop.trait(item.id)}`;
      return `${kind} · ${S.shop.rarity(item.rarity)}`;
    },
    opened(o) {
      const name = S.shop.item(o.item.id);
      if (o.isDuplicate) return `Doublon : ${name} · +${money(String(o.money))}`;
      return `${S.shop.rarity(o.item.rarity).toUpperCase()} · ${name}`;
    },
  },

  backdrop: {
    choose: 'Choisir image ou vidéo',
    intro: 'Installez votre propre image ou vidéo derrière le rond-point. Elle tournera dans l’onglet Jeu avec Grand écran activé.',
    linkLabel: 'Lien',
    linkPlaceholder: 'Lien YouTube, image ou vidéo',
    show: 'Afficher',
    or: 'ou',
    upload: 'Téléverser image',
    uploadSub: 'Depuis votre appareil, images uniquement. Reste local.',
    pick: 'Sélectionner',
    now: (what) => ({ youtube: 'Une vidéo YouTube', video: 'Une vidéo distante', image: 'Une image distante', upload: 'Votre image' })[what],
    nowSub: 'Actuellement derrière le rond-point.',
    remove: 'Retirer',
    loading: 'Chargement…',
    notALink: 'Ce n’est pas une URL valide. Copiez l’adresse complète débutant par https://',
    cannotLoad: 'Lien non chargé. Utilisez le lien direct du média (.jpg, .png, .mp4) ; certains sites bloquent l’intégration.',
    notAPicture: 'Seules les images sont acceptées en envoi direct. Pour une vidéo, collez un lien YouTube.',
    unreadable: 'Image illisible. Essayez un autre fichier.',
    notKept: 'Fichier trop lourd pour être conservé : il restera jusqu’à fermeture du jeu.',
    note: 'Le lien est chargé directement depuis sa source sur cet appareil. Rien ne transite par nos serveurs.',
    lost: 'Grand écran : impossible de charger votre lien. Le décor par défaut est rétabli.',
  },

  daily: {
    title: 'SERVICE DU JOUR',
    name: 'Service du jour',
    ready: 'Prêt',
    perfectRun: 'COURSE PARFAITE',
    welcomeBack: (m) => `Bon retour · vos péages ont rapporté +${money(m)}`,
    streakEnded: (days) => `Votre série de ${days} jours a pris fin · repartez sur une nouvelle avec le service d’aujourd’hui`,
    done: 'Terminé',
    readyHint: 'Votre premier service de la journée. Essai unique, le même pour tous.',
    doneHint: (streak) => (streak > 1 ? `Terminé · ${streak} jours consécutifs · à demain` : 'Terminé · à demain'),
    splashLine: (e) => `La ville aujourd’hui : ${S.cityEvent(e)} · un essai`,
    streakLine: (streak) => (streak > 0 ? `${streak} ${streak === 1 ? 'jour' : 'jours'} d’affilée · continuez ainsi` : 'Jouez chaque jour pour créer une série'),
    nextMilestone: (left, item) => `Plus que ${left} ${left === 1 ? 'jour' : 'jours'} avant ${S.shop.item(item)}`,
    rowLine(streak, open, next, freezes = 0, toFreeze = null) {
      if (streak <= 0) return open ? S.daily.readyHint : 'Revenez demain · jouez chaque jour pour une série';
      const days = `${streak} ${streak === 1 ? 'jour' : 'jours'} d’affilée`;
      const ahead = next && (toFreeze === null || next.left <= toFreeze) ? S.daily.nextMilestone(next.left, next.item) : toFreeze !== null ? S.daily.freezeLine(toFreeze) : null;
      const parts = [days, freezes > 0 ? S.daily.freezes(freezes) : null, ahead, open ? null : 'à demain'];
      return parts.filter((p): p is string => p !== null).join(' · ');
    },
    freezeLine: (days) => `Plus que ${days} ${days === 1 ? 'jour' : 'jours'} avant la protection de série`,
    freezes: (n) => `${n}× gel de série`,
    sheet: {
      title: 'Série quotidienne',
      body: (bonusDays, bonusPay, heatDays) => [
        'Jouez le service du jour chaque jour pour garder la série. Un jour manqué la brise, sauf si un gel de série le couvre.',
        `Dès ${bonusDays} jours, chaque service de carrière paie +${Math.round(bonusPay * 100)} % tant que la série vit.`,
        `Intensité : tous les ${heatDays} jours de série ouvrent un niveau d’intensité, un trafic plus rude pour plus de paie et d’XP Élite. Perdez la série et l’intensité disparaît avec elle. Les titres d’intensité gagnés restent.`,
      ],
      heatOpen: 'Intensité ouverte',
      heatValue: (open, max) => `${open} sur ${max}`,
      nextHeat: 'Prochaine intensité dans',
      allHeat: 'Tout est ouvert',
    },
    freezeUsed: (n) => `SÉRIE SAUVEGARDÉE · ${n === 1 ? 'un jour manqué a été' : `${n} jours manqués ont été`} préservés`,
    streakReward: (days, got) => `${days} JOURS CONSÉCUTIFS · ${got.join(' · ')}`,
    gotItem: (item) => `${S.shop.item(item)} débloqué`,
    gotFreeze: 'un gel de série',
    gotCard: 'un ticket de grattage gratuit',
    giftIn: (hours) => (hours >= 1 ? `Coffre gratuit demain · dans ${Math.ceil(hours)} h` : `Coffre gratuit demain · dans ${Math.max(1, Math.ceil(hours * 60))} min`),
    perfectRunFirst: (pay) => `COURSE PARFAITE · aucun crash · +${pay} % de gains`,
    streakPill(streak, bonus, endsIn, freezes = 0) {
      if (streak <= 0) return S.daily.streakLine(0);
      const days = `${streak} ${streak === 1 ? 'jour' : 'jours'} consécutifs`;
      if (endsIn !== null) return `${days} · expire dans ${endsIn < 1 ? 'moins d’une heure' : `${Math.floor(endsIn)} h`}`;
      const freeze = freezes > 0 ? ` · ${S.daily.freezes(freezes)}` : '';
      return bonus !== null ? `${days} · +${Math.round(bonus * 100)} % de paie${freeze || ' à chaque service'}` : `${days}${freeze || ' · tenez bon'}`;
    },
    challenge(c) {
      switch (c) {
        case 'perfectInputs':
          return '3 Insertions parfaites en un service';
        case 'tightFits':
          return '3 Insertions serrées en un service';
        case 'twoTakedowns':
          return '2 Interpellations en un service';
        case 'twoTransporters':
          return '2 Fourgons blindés encaissés en un service';
        case 'longChain':
          return 'Une chaîne parfaite de 8';
        case 'bigCombo':
          return 'Un combo de 15';
        case 'perfectRun':
          return 'Un tour parfait : aucun crash';
        case 'oneTakedown':
          return 'Arrêtez un criminel';
        case 'cleanMerges':
          return '8 Insertions propres en un service';
        case 'sixTightFits':
          return '6 Insertions serrées en un service';
        case 'fivePerfects':
          return '5 Insertions parfaites en un service';
        case 'chainFive':
          return 'Une chaîne parfaite de 5';
        case 'hugeCombo':
          return 'Un combo de 25';
        case 'twoNearMisses':
          return '2 Frôlements en un service';
      }
    },
    challengeDone: (c, reward) => `MISSION · ${S.daily.challenge(c)} · +${money(reward)}`,
  },

  albums: {
    name: (a) => ({ maps: 'Cartes', commons: 'Communs', rares: 'Rares', epics: 'Épiques', legends: 'Légendes', seasons: 'Saisons', loyalty: 'Fidélité', honours: 'Distinctions', pass: 'Passe de saison', tours: 'Tours' })[a],
    complete: (a, reward) => `ALBUM COMPLET · ${S.albums.name(a)} · +${money(reward)} · nouveau cadre`,
    progress: (entries) => 'Albums · ' + entries.map((e) => `${S.albums.name(e.album)} ${e.owned}/${e.total}`).join(' · '),
  },

  race: {
    newBest: 'NOUVEAU RECORD',
  },

  feats: {
    goal(g) {
      switch (g.k) {
        case 'prestige':
          return `Atteignez le Prestige ★${g.rank}`;
        case 'elite':
          return `Atteignez Élite ${g.level}`;
        case 'legendary':
          return `Accomplissez ${g.shifts} services légendaires`;
      }
    },
    done: 'Accompli',
    withTitle: (title) => `+ Titre « ${title} »`,
    eyebrow: 'Prouesse',
    body: 'L’un des plus grands exploits du jeu. Aucun coffre, aucun casino ni argent ne peut vous l’offrir : seule la route compte.',
    rowGoal: 'Objectif',
    rowNow: 'Vous',
    rowTitle: 'Titre',
    reward: 'Récompense',
    earned: 'Gagné · dans votre collection',
  },

  mastery: {
    detail(goal, tier) {
      const t = MASTERY_THRESHOLDS[goal];
      if (tier >= t.length) return 'Tous les paliers atteints';
      const n = t[tier];
      switch (goal) {
        case 'perfectTiming':
          return `${n} Insertions parfaites`;
        case 'tightSpots':
          return `${n} Créneaux serrés`;
        case 'closeCalls':
          return `${n} Frôlements de près`;
        case 'longChain':
          return `Une chaîne parfaite de ${n}`;
        case 'crimeFighter':
          return `${n} Interpellations`;
        case 'secureRoute':
          return `${n} Fourgons encaissés`;
        case 'comboMaster':
          return `Un combo de ${n}`;
        case 'veteran':
          return `${n} Services terminés`;
        case 'lifesaver':
          return `${n} Véhicules prioritaires cédés`;
        case 'closeShaves':
          return `${n} Motos frôlées au plus près`;
      }
    },
    name: (g) =>
      ({
        perfectTiming: 'Timing parfait',
        tightSpots: 'Passages étroits',
        closeCalls: 'Frôlements extrêmes',
        longChain: 'Longue chaîne',
        crimeFighter: 'Justicier de la route',
        secureRoute: 'Voie sécurisée',
        comboMaster: 'Maître du combo',
        veteran: 'Vétéran',
        lifesaver: 'Secouriste',
        closeShaves: 'Rase-mottes',
      })[g],
    toast(done) {
      const names = done.map((c) => `${S.mastery.name(c.goal)} ${masteryNumeral(c.tier)}`);
      return `MAÎTRISE VALIDÉE · ${names.join(', ')}`;
    },
  },

  night: 'Nuit',
  blackout: 'Blackout',
  weather: (w) =>
    ({ clear: 'Clair', lightRain: 'Pluie fine', heavyRain: 'Forte pluie', storm: 'Orage', extreme: 'Météo extrême', fog: 'Brouillard', snow: 'Neige & Verglas', hail: 'Grêle', sandstorm: 'Tempête de sable' })[w],
  cityEvent: (e) =>
    ({
      roadworks: 'Chantier',
      roadClosure: 'Rue barrée',
      concert: 'Trafic de concert',
      vipConvoy: 'Convoi VIP',
      policeOperation: 'Opération de police',
      schoolRun: 'Sortie des écoles',
      marathon: 'Marathon',
    })[e],

  upgrades: {
    group: (g) => ['POLICE', 'ARGENT', 'CONDUITE'][g],
    maxed: 'Max',
    pickOne: 'Touchez une amélioration pour en voir les effets.',
    everyStepBought: 'Toutes les améliorations achetées.',
    missing: (m) => `${m} manquants`,
    name: (u) =>
      ({
        morePatrols: 'Plus de patrouilles',
        longerPursuit: 'Poursuite allongée',
        quietStreets: 'Rues calmes',
        interceptor: 'Intercepteur',
        dispatchRadio: 'Radio centrale',
        backup: 'Renforts',
        cashRoute: 'Ligne de fonds',
        overtime: 'Heures sup’',
        freight: 'Fret',
        quickRecovery: 'Reprise vive',
        doubleRun: 'Double trajet',
        insurance: 'Assurance',
        robberyInsurance: 'Protection braquage',
        shield: 'Bouclier',
        tightFitTip: 'Pourboire créneau',
        dashcam: 'Dashcam',
        chainSaver: 'Sauveur de chaîne',
        winterTyres: 'Pneus hiver',
        fogLamps: 'Antibrouillards',
      })[u],
    explanation: (u) =>
      ({
        morePatrols: 'Davantage de voitures de police prêtes dans votre file lors d’une alerte criminelle.',
        longerPursuit: 'Les criminels mettent plus de temps à s’enfuir, vous laissant du répit pour les intercepter.',
        quietStreets: 'Certains services se déroulent sans aucun criminel.',
        interceptor: 'Une patrouille placée derrière un criminel le rattrape plus prestement.',
        dispatchRadio: 'Chaque service autorise 3 appels d’urgence pour placer une patrouille en tête ; chaque niveau en ajoute et réduit la perte de combo.',
        backup: 'Votre service tolère un crash de police supplémentaire sans pénalité.',
        cashRoute: 'Les fourgons blindés apparaissent plus vite et plus régulièrement.',
        overtime: 'Chaque service terminé rapporte davantage de pièces.',
        freight: 'Davantage de camions : circulation plus dense, mais gains de service et péages accrus.',
        quickRecovery: 'Les conducteurs repartent plus franchement après un incident. Le flux reprend plus vite.',
        doubleRun: 'Un second fourgon blindé succède parfois immédiatement au premier.',
        insurance: 'Prend en charge une partie des pertes financières dues aux crashs.',
        robberyInsurance: 'Prend en charge une partie des pertes causées par la fuite d’un criminel.',
        shield: 'Votre voiture peut subir un crash supplémentaire par service sans interruption. Hors mode Sans limites.',
        tightFitTip: 'Chaque créneau serré verse un pourboire immédiat prélevé sur la paie du service. Hors Sans limites.',
        dashcam: 'Chaque frôlement extrême vous rapporte un pourboire immédiat. Hors Sans limites.',
        chainSaver: 'Tant que vous êtes dans le rythme, une insertion normale ne brise pas votre chaîne une fois par service. Hors Sans limites.',
        winterTyres: 'La pluie, neige et grêle dégradent moins l’adhérence et le freinage.',
        fogLamps: 'Les conducteurs repèrent les obstacles plus tôt et la brume est moins opaque à l’écran.',
      })[u],
    total(u, steps, c) {
      const t = steps;
      switch (u) {
        case 'morePatrols':
          return `+${percent(t * c.patrolsPerStep)} patrouilles`;
        case 'longerPursuit':
          return `+${t * c.pursuitPerStep} s de poursuite`;
        case 'quietStreets':
          return `${percent(t * c.quietStreetsPerStep)} de services sans criminels`;
        case 'interceptor':
          return `+${percent(t * c.interceptorPerStep)} vitesse de traque`;
        case 'dispatchRadio':
          return `+${t * c.dispatchLimitPerStep} appels · +${percent(t * c.dispatchRadioPerStep)} combo retenu`;
        case 'backup':
          return `+${steps * c.backupPerStep} crashs de police`;
        case 'cashRoute':
          return `${+(t * c.cashRoutePerStep).toFixed(1)} s plus tôt`;
        case 'overtime':
          return `+${percent(t * c.overtimePerStep)} de paie`;
        case 'freight':
          return `+${percent(t * c.freightPerStep)} camions · +${percent(t * c.freightPayPerStep)} de paie`;
        case 'quickRecovery':
          return `+${percent(t * c.recoveryPerStep)} reprise · +${percent(t * c.recoveryPayPerStep)} de paie`;
        case 'doubleRun':
          return `${percent(t * c.doubleRunPerStep)} doubles trajets`;
        case 'insurance':
        case 'robberyInsurance':
          return t * c.insurancePerStep >= 1 ? 'COUVERTURE TOTALE' : `${percent(t * c.insurancePerStep)} couvert`;
        case 'shield':
          return t === 1 ? '1 crash pardonné' : `${t} crashs pardonnés`;
        case 'tightFitTip':
          return `${percent(t * c.tightFitTipPerStep)} de la paie par créneau serré`;
        case 'dashcam':
          return `${percent(t * c.nearMissTipPerStep)} de la paie par frôlement`;
        case 'chainSaver':
          return t === 1 ? '1 chaîne sauvée par service' : `${t} chaînes sauvées par service`;
        case 'winterTyres':
          return `${percent(t * c.winterTyresPerStep)} de l’adhérence préservée`;
        case 'fogLamps':
          return `${percent(t * c.fogLampsPerStep)} de temps de réaction préservé`;
      }
    },
    stepEffect(u, steps, max, c) {
      const now = S.upgrades.total(u, steps, c);
      if (steps >= max) return `Actuel : ${now}`;
      return `Actuel : ${now} · niveau suivant ${S.upgrades.total(u, steps + 1, c)}`;
    },
  },

  heat: {
    button: (heat) => `Intensité +${Math.round(heat * baseConfig.heatPay * 100)} %`,
    cleared: (heat) => `INTENSITÉ ${heat} RÉUSSIE`,
    rule: (level) => `Réussissez un service à l’Intensité ${level}`,
  },

  mods: {
    label: 'Modificateurs du prochain service',
    tailwind: (pay) => `Vent portant +${Math.round(pay * 100)} %`,
    streak: (pay) => `Série +${Math.round(pay * 100)} %`,
    family: (share) => `Famille −${Math.round(share * 100)} %`,
    contract: (goal, times) => `${goal} ×${times}`,
  },

  goals: {
    tierMiss: (m) => `Il manque ${m.short} ${m.short === 1 ? 'voiture' : 'voitures'} pour ${S.modes.tier(m.tier)}`,
    money: (short, upgrade) => `${money(short)} avant ${S.upgrades.name(upgrade)}`,
    nearMiss(n) {
      switch (n.k) {
        case 'cars':
          return n.left === 1 ? `Plus qu’une voiture pour le niveau ${n.level + 1}` : `${n.left} voitures pour le niveau ${n.level + 1}`;
        case 'best':
          return `À ${Fmt.number(n.short)} points de votre record`;
        case 'combo':
          return `À ${n.short === 1 ? 'une insertion' : `${n.short} insertions`} de ×${+n.multiplier.toFixed(2)}`;
      }
    },
  },

  photo: {
    button: 'Photo',
    buttonLabel: 'Capturer une image de ce résultat',
    dialog: 'Image de votre service',
    share: 'Partager',
    copy: 'Copier',
    sendChallenge: 'Défier avec ceci',
    copyChallenge: 'Copier avec lien',
    challengeCopied: 'Image et lien copiés',
    download: 'Télécharger',
    saved: 'Enregistré',
    close: 'Fermer',
    score: 'POINTS',
    flames: 'FLAMMES',
    cars: 'VOITURES',
    newBest: 'NOUVEAU RECORD',
    hook: (score) => `Pouvez-vous battre ${score} ?`,
    hookFlames: (flames) => `Pouvez-vous dépasser ${flames} flammes ?`,
    hookChill: 'Venez rouler un peu.',
    combo: (n) => `Combo ×${n}`,
    tightFits: (n) => (n === 1 ? '1 créneau serré' : `${n} créneaux serrés`),
    busted: (n) => `${n} interpellés`,
    wrecks: (n) => (n === 1 ? '1 épave' : `${n} épaves`),
    chain: (n) => `Chaîne de ${n}`,
    city: 'La ville',
  },

  result: {
    detonated: 'BOUM',
    escaped: 'ÉCHAPPÉ',
    levelComplete: (l) => `NIVEAU ${l} RÉUSSI`,
    newBest: 'NOUVEAU RECORD',
    points: (n) => `${n} points`,
    fullCoverage: 'COUVERTURE TOTALE',
    loss: (amount, escaped) => (escaped ? 'PERTE ' : 'COÛT DU CRASH ') + '−' + money(amount),
    covered: (amount) => `COUVERTURE TOTALE · ${money(amount)} pris en charge par l’assurance`,
    nextLevel: (l) => `Touchez pour le niveau ${l}`,
    retryLevel: (l) => `Touchez pour réessayer le niveau ${l}`,
    stats(combo, tightFits, busted, transporters, time) {
      return [
        time,
        combo > 1 ? `meilleur combo ${Fmt.number(combo)}` : null,
        tightFits > 0 ? `${Fmt.number(tightFits)} ${tightFits === 1 ? 'Insertion serrée' : 'Insertions serrées'}` : null,
        busted > 0 ? `${busted} arrêtés` : null,
        transporters > 0 ? `${transporters} fourgons encaissés` : null,
      ]
        .filter((x): x is string => x !== null)
        .join(' · ');
    },
  },

  hud: {
    moneyLabel: 'ARGENT',
    scoreLabel: 'POINTS',
    rushHour: 'HEURE DE POINTE',
    tight: 'JUSTE !',
    cutOff: 'COUPE !',
    dispatch: 'APPEL',
    danger: 'DANGER',
    boom: 'BOUM !',
    covered: 'COUVERT',
    combo: (n) => `COMBO ${n}`,
    cars: (n) => (n === 1 ? '1 voiture' : `${n} voitures`),
    wanted: (seconds) => `RECHERCHÉ ${Math.ceil(Math.max(0, seconds))}`,
    rushFactor: (value) => `HEURE DE POINTE ${multiplier(value)}`,
    critical: (points) => `CRITIQUE ${points}`,
    shave: (points) => `FRÔLÉ ${points}`,
    chainHeld: 'CHAÎNE MAINTENUE',
    label(t) {
      switch (t) {
        case 'police':
          return 'POLICE';
        case 'pickup':
          return 'CRIMINEL';
        case 'transporter':
          return 'SÉCURISÉ';
        case 'tanker':
          return 'GAZ';
        case 'military':
          return 'BOMBE';
        case 'ambulance':
          return 'AMBULANCE';
        case 'fireTruck':
          return 'POMPIERS';
        case 'learner':
          return 'AUTO-ÉCOLE';
        case 'bus':
          return 'BUS';
        case 'motorbike':
          return 'MOTO';
        case 'oversize':
          return 'CONVOI';
        case 'racer':
          return 'BOLIDE';
        case 'wedding':
          return 'MARIAGE';
        default:
          return null;
      }
    },
  },

  detail: {
    now: 'Actuel',
    nextStep: 'Étape suivante',
    step: (s, max) => `Étape ${s} sur ${max}`,
    buy: (price) => `Acheter · ${price}`,
    build: (price) => `Bâtir · ${price}`,
    remove: 'Retirer',
    close: 'Fermer',
  },

  notice: {
    more: (n) => `+${n} de plus · voir Progression`,
    notEnoughMoney: (price) => `Manque de ${MONEY_MARK} · ${money(price)} requis`,
    detourIdle: 'Construit, mais inactif ici : aucune sortie entre le panneau et votre voie',
  },
});
