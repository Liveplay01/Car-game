import type { Translation } from '../../strings';
import { Fmt, money, percent } from '../../format';
import { gripIn } from '../../museumText';

/** Français : les textes du musée. */
const museum: Translation['museum'] = {
  boss: {
    convoy: {
      line: 'Escortes immédiatement derrière',
      brief: 'Percutez le boss avec une voiture de police dans l’intervalle avant ses escortes.',
      explain: () => [
        'Le chef du syndicat, vêtu de noir avec des liserés dorés. Ses escortes blindées le suivent de très près sur l’anneau.',
        'Insérez une patrouille de police dans l’espace séparant le boss de ses escortes. Toucher une escorte compte comme un accident classique.',
        'Vous disposez de plus de temps qu’avec un criminel ordinaire : profitez-en pour attendre le bon créneau.',
      ],
    },
    getaway: {
      line: 'Disparaît en quelques secondes',
      brief: 'Il s’enfuit très vite : tenez une voiture de police prête et percutez-le sans attendre.',
      explain: () => [
        'Aucune escorte, uniquement de la vitesse pure : le chauffeur en fuite file en quelques secondes.',
        'Placez une patrouille au premier rang de votre file avant la fin du signal d’alerte et lancez-la dès son entrée sur l’anneau.',
      ],
    },
    armoured: {
      line: 'Nécessite deux voitures de police',
      brief: 'Percutez-le deux fois : la première patrouille ne fait que briser le blindage.',
      explain: () => ['Son blindage encaisse le premier choc, et une escorte ne le lâche pas d’une semelle.', 'Une première patrouille fait sauter le blindage, la seconde l’arrête. Conservez deux patrouilles prêtes en file.'],
    },
    phantom: {
      line: 'Roule sans phares',
      brief: 'Tous feux éteints : fiez-vous au signal d’alerte et percutez-le avec une patrouille.',
      explain: () => [
        'Il surgit en plein blackout et roule sans aucun feu : il n’est visible que sous la lumière des lampadaires.',
        'Suivez la courbure de l’anneau et faites confiance à l’avertissement. Une escorte le suit, visez juste.',
      ],
    },
    twins: {
      line: 'Arrêtez l’un, l’autre arrive',
      brief: 'Deux boss : le second débarque dès que le premier est neutralisé.',
      explain: (c) => [
        'Les jumeaux dirigent le syndicat en duo. Ils arrivent l’un après l’autre : dès que le premier tombe, le second s’engage sur une autre bretelle.',
        `Sans escortes, environ ${Math.round(c.criminalTime * c.twinsTimeFactor)} secondes chacun. Récupérer le butin exige d’arrêter les deux. Prévoyez une seconde patrouille.`,
      ],
    },
    decoy: {
      line: 'Ses escortes portent ses propres couleurs',
      brief: 'Escortes camouflées : percutez le pick-up à plateau ouvert orné d’un anneau.',
      explain: () => [
        'Les escortes du leurre arborent la même livrée que le boss, noire avec liseré d’or, pour détourner vos patrouilles.',
        'Le vrai boss est le pick-up : benne ouverte et cercle de compte à rebours. Les autres sont des fourgons blindés dont l’impact entraîne un crash classique.',
      ],
    },
    smuggler: {
      line: 'Nécessite trois voitures de police',
      brief: 'Double blindage : trois patrouilles requises. Alignez-les.',
      explain: (c) => [
        'Le contrebandier circule seul sous un blindage lourd : les deux premiers chocs l’affaiblissent, le troisième le neutralise.',
        `Il reste environ ${Math.round(c.criminalTime * c.smugglerTimeFactor)} secondes sur l’anneau, suffisant pour trois assauts si votre file est bien garnie.`,
      ],
    },
    kingpin: {
      line: 'La tête pensante du réseau',
      brief: 'Escortes camouflées, dans l’obscurité : percutez le pick-up cerclé à deux reprises.',
      explain: () => [
        'Le Parrain surgit en dernier, en plein blackout, flanqué de trois escortes camouflées et d’un blindage résistant à un premier choc.',
        'Distinguez les silhouettes dans l’ombre : le boss est le pick-up cerclé. Deux patrouilles successives dans l’ouverture viendront à bout de lui.',
      ],
    },
  },

  special: {
    police: {
      name: 'Voiture de police',
      line: 'La seule voiture capable de stopper un criminel',
      brief: 'Plus robuste que vos voitures civiles. Le bouton d’appel en place une en tête.',
      explain: (c) => [
        'Les voitures de police proviennent de votre propre file d’attente. Ce sont les seuls véhicules capables d’interpeller un criminel.',
        `Envoyez-en une sur l’anneau lorsqu’un criminel s’y trouve pour le percuter : c’est une arrestation valant ${Fmt.number(c.takedownPoints)} points qui prolonge votre chaîne.`,
        `Une patrouille est plus solide que vos voitures civiles : votre service tolère ${c.maxPoliceCrashes === 1 ? 'un crash de police' : `${c.maxPoliceCrashes} crashs de police`}. Tenez-la toutefois éloignée des fourgons blindés.`,
      ],
    },
    pickup: {
      name: 'Criminel',
      line: 'Percutez-le avec une voiture de police',
      brief: 'Envoyez une patrouille sur le pick-up au cercle violet avant qu’il ne s’échappe.',
      explain: (c) => [
        'Une alerte éclaire la bretelle d’où il déboule. Il s’engouffre ensuite à vive allure sur l’anneau, agressif et lourd.',
        `Vous avez environ ${Math.round(c.criminalTime)} secondes pour l’emboutir avec une patrouille. L’interpellation rapporte ${Fmt.number(c.takedownPoints)} points et allonge votre chaîne.`,
        'S’il s’enfuit, il emporte votre butin et met fin au service. Vos voitures civiles ne peuvent rien contre lui : un impact avec elles n’est qu’un accident.',
      ],
    },
    transporter: {
      name: 'Fourgon blindé',
      line: 'Laissez-le filer sans encombre et encaissez',
      brief: 'Laissez passer le fourgon blindé sans le toucher : il paie à sa sortie.',
      explain: (c) => [
        'Un transport de fonds blindé. Un signal annonce sa venue ; il effectue un tour d’anneau protégé par un périmètre de sécurité.',
        `S’il quitte les lieux indemne, vous empochez ${money(Fmt.number(c.transporterPay))} et un maillon de chaîne. Chaque voiture insérée dans sa zone rapporte ${money(Fmt.number(c.shieldBonus))} de bonus.`,
        'Ne le percutez sous aucun prétexte : une patrouille confisque les fonds sans rétribution, et un fourgon détruit est perdu pour tout le monde.',
      ],
    },
    ambulance: {
      name: 'Ambulance',
      line: 'Dégagez la voie devant elle',
      brief: 'Laissez la voie libre devant l’ambulance jusqu’à ce qu’elle quitte l’anneau.',
      explain: (c) => [
        'En intervention d’urgence : annoncée par un signal, elle emprunte une large portion de l’anneau.',
        'La portion située juste devant elle doit impérativement rester libre. Y insérer un véhicule entrave sa mission et réinitialise combo et chaîne.',
        `Maintenez la route dégagée jusqu’à sa sortie : elle vous rétribuera de ${money(Fmt.number(c.ambulancePay))} et prolongera votre chaîne. Elle ne provoque jamais d’accident par elle-même.`,
      ],
    },
    truck: {
      name: 'Camion',
      line: 'Long et lourd : prévoyez un espace plus large',
      brief: 'Les camions sont longs et massifs : laissez un plus grand intervalle pour votre voiture.',
      explain: (c) => [
        'Partie intégrante du trafic régulier, mais nettement plus long et lourd qu’un véhicule ordinaire.',
        'Il réclame un créneau plus généreux et, en cas de choc, pousse les voitures légères au lieu de stopper net.',
        `Chaque camion franchissant un péage en début de service rapporte ${money(Fmt.number(c.tollPerTruck))}.`,
      ],
    },
    tanker: {
      name: 'Citerne de gaz',
      line: 'Détruite, elle explose',
      brief: 'Une citerne accidentée explose en soufflant tous les véhicules alentour. Donnez-lui du champ.',
      explain: () => [
        'Un camion transportant des matières hautement inflammables. Circule sans alerte particulière.',
        'En cas d’impact, il explose : le souffle propulse les véhicules à proximité hors de la chaussée, y compris le vôtre. Laissez-lui de l’espace.',
        'En mode Paguaille, c’est exactement le but : visez les citernes pour créer des réactions en chaîne explosives.',
      ],
    },
    military: {
      name: 'Camion militaire',
      line: 'Restez hors de son périmètre',
      brief: 'Éloignez vos voitures de la zone du convoi militaire jusqu’à son départ.',
      explain: (c) => [
        'Un camion de l’armée convoyant des explosifs. Son arrivée est signalée et il circule entouré d’un périmètre de sécurité strict.',
        'Tout véhicule pénétrant dans sa zone déclenche une détonation soufflant l’ensemble de la chaussée.',
        `Retenez vos véhicules à son passage. Au bout d’environ ${Math.round(c.militaryTime)} secondes, il quitte les lieux dès la sortie dégagée.`,
      ],
    },
    fireTruck: {
      name: 'Camion de pompiers',
      line: 'Dégagez un large secteur',
      brief: 'Laissez un large tronçon libre devant les pompiers jusqu’à leur sortie.',
      explain: (c) => [
        'Véhicule d’urgence semblable à l’ambulance, mais plus volumineux, lourd et encombrant.',
        'La zone à préserver devant lui est plus étendue. S’y engager interrompt la sirène et ruine votre combo.',
        `Laissez-lui le champ libre : il vous rapportera ${money(Fmt.number(c.fireTruckPay))} et consolidera votre chaîne.`,
      ],
    },
    motorbike: {
      name: 'Moto',
      line: 'Se faufile dans les trous de souris',
      brief: 'Les motos se glissent partout. Frôlez-les de près pour des points bonus.',
      explain: (c) => [
        'Vive et effilée : une moto plonge dans des créneaux qu’aucune voiture ne prendrait, vous ravissant l’ouverture attendue.',
        `Passez tout près d’elle lors d’une insertion serrée pour récolter ${Fmt.number(c.motorbikeBonus)} points supplémentaires multipliés par votre combo.`,
      ],
    },
    learner: {
      name: 'Voiture auto-école',
      line: 'Laissez-lui de la marge, elle hésite',
      brief: 'Tenez vos voitures à l’écart du bandeau turquoise autour de l’auto-école.',
      explain: (c) => [
        'Un véhicule d’apprentissage fait le tour en freinant sans prévenir. La file derrière lui a tendance à s’accumuler.',
        'Un bandeau turquoise délimite son espace de confort. Ne vous y insérez pas pendant qu’elle roule.',
        `Si elle repart avec de la marge tout autour, elle paiera ${money(Fmt.number(c.learnerPay))} et continuera votre chaîne. S’insérer trop près annule simplement ce bonus.`,
      ],
    },
    oversize: {
      name: 'Convoi exceptionnel',
      line: 'Lent et encombrant, laissez-lui de la place',
      brief: 'Chargement lent et très long : évitez le bandeau ambré qui l’entoure.',
      explain: (c) => [
        'Un convoi bien plus étendu qu’un camion ordinaire progresse au pas sur l’anneau, ralentissant toute la file derrière lui.',
        `Un bandeau ambré matérialise son périmètre de sécurité. Préservez cet espace et il vous rapportera ${money(Fmt.number(c.oversizePay))} au départ.`,
      ],
    },
    racer: {
      name: 'Bolide de course',
      line: 'Par paire : percutez-les',
      brief: 'Deux pilotes sauvages font irruption : percutez chacun avec une patrouille pour un bonus.',
      explain: (c) => [
        'Deux bolides rugissent depuis une bretelle et s’engagent coup sur coup, parés d’une robe rose vif à bandes blanches.',
        `Emboutissez-les avec des patrouilles pour les neutraliser : ${money(Fmt.number(c.racerPay))} chacun et un maillon de chaîne. S’ils s’enfuient, rien n’est perdu.`,
      ],
    },
    wedding: {
      name: 'Cortège de mariage',
      line: 'Trois voitures : gardez-les unies',
      brief: 'Un cortège de mariage : ne coupez pas le bandeau rose qui relie les trois véhicules.',
      explain: (c) => [
        'Trois voitures décorées de blanc et de dorures s’insèrent en convoi et font le tour au rythme de la circulation.',
        `Un bandeau rose englobe l’ensemble du cortège. Laissez-le intact pour empocher ${money(Fmt.number(c.weddingPay))} et faire progresser votre chaîne.`,
      ],
    },
    bus: {
      name: 'Bus scolaire',
      line: 'S’arrête au point de ramassage',
      brief: 'Les bus scolaires marquent l’arrêt. Insérez-vous derrière eux lorsqu’ils redémarrent.',
      explain: (c) => [
        `Typique des sorties d’école : de longs bus jaunes stationnent à l’arrêt de l’anneau durant environ ${Math.round(c.busDwell * 10) / 10} secondes.`,
        'Le trafic patiente sagement derrière. La meilleure ouverture se présente pile au moment où le bus remet les gaz.',
      ],
    },
  },

  weather: {
    lightRain: {
      line: 'Chaussée glissante',
      brief: 'Asphalte mouillé : les chocs glissent davantage. Laissez plus de marge.',
      explain: (c) => [
        `Pluie fine : les gommes ne conservent que ${gripIn('lightRain', c)} d’adhérence, et les conducteurs réagissent plus mollement.`,
        'Les distances d’arrêt s’allongent. Élargissez vos intervalles d’insertion.',
      ],
    },
    heavyRain: {
      line: 'Adhérence précaire, trafic accru',
      brief: 'Moins d’accroche et plus de flux. Attendez des ouvertures nettes.',
      explain: (c) => [
        `Pluie battante : adhérence tombée à ${gripIn('heavyRain', c)}, réflexes ralentis et afflux accru de véhicules.`,
        'Les créneaux limites se transforment vite en accrochages. Patientez pour des espaces incontestables.',
      ],
    },
    storm: {
      line: 'Conduite nerveuse',
      brief: 'Les automobilistes forcent le passage. Insérez-vous avec doigté.',
      explain: (c) => [
        `Orage : adhérence à ${gripIn('storm', c)}, trafic condensé et véhicules plongeant dans des trous minuscules.`,
        'L’anneau s’engorge bien plus vite qu’à l’accoutumée. Calibrez chaque insertion avec précision.',
      ],
    },
    extreme: {
      line: 'Conditions dantesques',
      brief: 'Adhérence minimale et circulation saturée. La patience est payante.',
      explain: (c) => [
        `Météo extrême : les pneus ne retiennent que ${gripIn('extreme', c)} de grip, flux à son comble et automobilistes tendus.`,
        'Chaque collision provoque un carambolage étendu. La prudence prime sur la vitesse.',
      ],
    },
    fog: {
      line: 'L’autre rive s’estompe',
      brief: 'Le côté opposé disparaît dans la brume. Guettez les feux qui émergent.',
      explain: (c) => [
        'Brouillard épais : l’autre côté de l’anneau s’efface et les temps de réaction s’allongent.',
        `Observez le flux qui surgit de la brume vers votre bretelle ; les halos d’alerte restent visibles. Paie majorée de ${percent(c.fogPayFactor - 1)}.`,
      ],
    },
    snow: {
      line: 'Verglas sous les roues',
      brief: 'Neige et glace : personne ne s’arrête court. Multipliez vos marges de sécurité.',
      explain: (c) => [
        `Neige et verglas : les pneus n’offrent que ${gripIn('snow', c)} d’adhérence et les dérapages sont sans fin.`,
        `Vos traces restent imprimées dans la neige. Doublez vos distances de précaution. Paie majorée de ${percent(c.snowPayFactor - 1)}.`,
      ],
    },
    hail: {
      line: 'Freinage dégradé',
      brief: 'Grêle : les distances de freinage explosent. Laissez de la place derrière chaque voiture.',
      explain: (c) => [
        `Grêlons sur le toit : freinage réduit à ${percent(c.hailBrake)} et adhérence limitée à ${gripIn('hail', c)}.`,
        `Un véhicule derrière vous mettra bien plus de temps à piler. Préservez de l’espace devant comme derrière. Paie majorée de ${percent(c.hailPayFactor - 1)}.`,
      ],
    },
    sandstorm: {
      line: 'Poussière sur la piste',
      brief: 'Tempête de sable : visibilité réduite par la poussière. Attention à ce qui en sort.',
      explain: (c) => [
        `Tempête de sable : la poussière masque l’anneau opposé et le sable ne laisse que ${gripIn('sandstorm', c)} d’adhérence.`,
        `Surveillez les véhicules qui jaillissent du nuage. Paie bonifiée de ${percent(c.sandstormPayFactor - 1)}.`,
      ],
    },
  },

  dark: {
    night: {
      line: 'Phares et réverbères uniquement',
      brief: 'Fiez-vous aux faisceaux des phares plutôt qu’aux carrosseries.',
      explain: (c) => [
        'Garde de nuit : la ville plonge dans l’obscurité et les véhicules se détachent par leurs optiques et sous l’éclairage public.',
        `Suivez les lueurs sur la chaussée. Un service nocturne rapporte ${percent(c.nightPayFactor - 1)} de plus.`,
      ],
    },
    blackout: {
      line: 'Les réverbères eux-mêmes s’éteignent',
      brief: 'Éclairage public coupé : seuls les phares trahissent la présence des voitures.',
      explain: (c) => [
        'Panne d’électricité totale : seuls les feux des voitures éclairent leur position.',
        `Rapporte ${percent(c.blackoutPayFactor - 1)} de plus. Le Fantôme, quatrième boss du syndicat, n’intervient que dans le noir absolu.`,
      ],
    },
  },

  event: {
    roadworks: {
      line: 'Zone ralentie sur l’anneau',
      brief: 'Les voitures ralentissent dans les travaux, modifiant les intervalles habituels.',
      explain: (c) => [
        `Chantier sur un tronçon : le trafic y est bridé à ${percent(c.roadworksSpeedFactor)} de sa vitesse ordinaire.`,
        'Les véhicules se tassent en amont, déformant le rythme des ouvertures. Repérez où l’engorgement se forme.',
      ],
    },
    roadClosure: {
      line: 'Une bretelle fermée',
      brief: 'Une bretelle est coupée : moins de trafic entrant et aucune sortie par cet accès.',
      explain: () => [
        'L’une des bretelles est fermée pour le service : aucun trafic n’en émane ni ne s’y engage.',
        'La circulation provient de moins de directions et se disperse par moins de sorties. Se produit sur les ronds-points à 4 voies ou plus.',
      ],
    },
    concert: {
      line: 'Toute la ville est de sortie',
      brief: 'Afflux massif sur l’anneau. Saisissez sans hésiter le moindre intervalle convenable.',
      explain: (c) => [
        `Fin de concert : ${c.concertDensityBonus} véhicules de plus en rotation et flux d’entrée doublé.`,
        'Les ouvertures sont rares et fugaces. Prenez la première opportunité viable sans attendre la perfection.',
      ],
    },
    vipConvoy: {
      line: 'Intervalles larges, flux accru',
      brief: 'Distances de sécurité augmentées : créneaux spacieux mais tempo décalé.',
      explain: (c) => [
        `Personnalité en ville : un véhicule de plus et distances étirées de ${percent(c.vipGapFactor - 1)}.`,
        'Les espaces entre voitures sont plus larges mais leur dynamique diffère. Calez vos départs sur ce nouveau tempo.',
      ],
    },
    policeOperation: {
      line: 'Davantage de patrouilles dans votre file',
      brief: 'Plus de voitures de police dans votre file : occasions d’arrestation accrues.',
      explain: (c) => [
        `Raid policier : ${percent(c.policeOperationShare)} de patrouilles supplémentaires dans votre file.`,
        'Les criminels sont plus faciles à neutraliser et chaque patrouille constitue une chance d’interpellation.',
      ],
    },
    marathon: {
      line: 'Des coureurs coupent une bretelle',
      brief: 'Des coureurs traversent régulièrement un accès : le trafic patiente puis s’engouffre d’un coup.',
      explain: (c) => [
        `Un marathon traverse la zone. Toutes les ${c.marathonPeriod} secondes, les coureurs coupent une bretelle, bloquant son accès pendant ${c.marathonCrossing} secondes.`,
        'Une fois passés, les véhicules retenus déferlent ensemble. Anticipez la vague et profitez des accalmies.',
      ],
    },
    schoolRun: {
      line: 'Des bus marquent l’arrêt sur l’anneau',
      brief: 'Arrêt régulier des bus scolaires. Glissez-vous derrière eux dès qu’ils s’élancent.',
      explain: (c) => [
        `Sortie des classes : de longs bus jaunes s’insèrent dans le trafic et s’arrêtent ${Math.round(c.busDwell * 10) / 10} secondes au point de dépose.`,
        'La file patiente derrière le bus. La meilleure fenêtre de tir s’ouvre précisément au redémarrage de l’autocar.',
      ],
    },
  },

  road: {
    line: 'Lisez les créneaux sur les deux voies',
    brief: 'La flèche à votre ligne d’arrêt indique vers quelle voie s’engage votre véhicule.',
    explain: (c) => [
      `À partir du niveau ${c.twoLaneLevel}, l’anneau s’équipe d’une voie intérieure. Les deux anneaux tournent de concert et le trafic exploite les deux.`,
      'Une flèche devant votre ligne d’arrêt signale la trajectoire : tout droit sur la voie extérieure ou vers la gauche pour piquer vers l’intérieur.',
      'Un véhicule visant l’anneau intérieur doit franchir l’anneau extérieur puis trouver son créneau à l’intérieur. Les sorties coupent également les voies.',
    ],
  },
};

export default museum;
