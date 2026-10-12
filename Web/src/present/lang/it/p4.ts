import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { Fmt, money } from '../../format';
import { SPECIAL_TEXT } from '../../museumText';

const COLORS: Record<string, string> = { purple: 'Viola', gold: 'Oro', blue: 'Blu', red: 'Rosso', teal: 'Turchese', orange: 'Arancione', pink: 'Rosa', rose: 'Rosa tenue' };
const color = (name: string): string => COLORS[name] ?? name;

/** Italiano, Parte 4: Obiettivi, Briefing, Notifiche, Schede, Progressi, Social, Museo. */
export default (S: Strings): Words<Strings> => ({
  ach: {
    heading: 'Traguardi',
    name: (id) =>
      ({
        scrapyard: 'Sfasciacarrozze',
        fireworks: 'Fuochi d’artificio',
        spotless: 'Impeccabile',
        jackpot: 'Cacciatore di jackpot',
        critical: 'Colpi critici',
        wizard: 'Mago del traffico',
        earner: 'Magnate della strada',
        weatherproof: 'A prova di meteo',
        stormRider: 'Cavaliere della tempesta',
        whiteout: 'Tempesta bianca',
        moonlighter: 'Lavoratore notturno',
        lightsOut: 'Luci spente',
        cityLife: 'Vita cittadina',
        longHaul: 'Lunga percorrenza',
        clockwork: 'Come un orologio',
        onARoll: 'Inarrestabile',
        regular: 'Cliente fisso',
        testDriver: 'Collaudatore',
        hunter: 'Cacciatore del sindacato',
        roadBuilder: 'Costruttore stradale',
        foreman: 'Capocantiere',
        tuner: 'Preparatore',
        chestOpener: 'Apribauli',
        collector: 'Collezionista',
        climber: 'Scalatore',
        elite: 'Pilota d’élite',
        reborn: 'Rinato',
        heatSeeker: 'Cercatore di calore',
        gambler: 'Scommettitore d’élite',
        zen: 'Pilota zen',
        tourist: 'Turista',
      })[id] ?? id,
    goal: (id, n) => {
      const N = Fmt.number(n);
      return (
        {
          scrapyard: `Provoca ${N} schianti`,
          fireworks: `Innesca ${N} esplosioni`,
          spotless: `${N} Corse perfette`,
          jackpot: `Consegna ${N} furgoni jackpot`,
          critical: `Metti a segno ${N} Inserimenti critici`,
          wizard: `Invia ${N} auto`,
          earner: `Guadagna ${N} monete sulla strada`,
          weatherproof: `Supera ${N} turni con meteo avverso`,
          stormRider: `Supera ${N} turnos con tempesta, grandine o tempesta di sabbia`,
          whiteout: `Supera ${N} turni con nebbia o neve`,
          moonlighter: `Supera ${N} turni di notte`,
          lightsOut: `Supera ${N} turni durante un blackout`,
          cityLife: `Supera ${N} turni con un evento cittadino`,
          longHaul: `Resisti ${Fmt.seconds(n)} in Senza limiti`,
          clockwork: `Supera ${N} turni giornalieri`,
          onARoll: `Una serie di ${N} giorni consecutivi`,
          regular: `Supera ${N} ${n === 1 ? 'turno settimanale' : 'turni settimanali'}`,
          testDriver: `Supera ${N} ${n === 1 ? 'prova' : 'prove'}`,
          hunter: `Cattura ${N} ${n === 1 ? 'boss del sindacato' : 'boss diversi del sindacato'}`,
          roadBuilder: `Costruisci ${N} ${n === 1 ? 'raccordo aggiuntivo' : 'raccordi aggiuntivi'}`,
          foreman: `Installa ${N} ${n === 1 ? 'modulo' : 'moduli'}`,
          tuner: `Possiedi ${N} livelli di potenziamento`,
          chestOpener: `Apri ${N} bauli`,
          collector: `Colleziona ${N} oggetti`,
          climber: `Raggiungi il livello ${N}`,
          elite: `Raggiungi Élite ${N}`,
          reborn: `Fai Prestigio ${N} volte`,
          heatSeeker: `Supera un turno a Intensità ${N}`,
          gambler: `Gioca ${N} round al casinò`,
          zen: `Invia ${N} auto in modalità Relax`,
          tourist: `Supera ${N} ${n === 1 ? 'tappa di tour' : 'tappe di tour'}`,
        } as Record<string, string>
      )[id] ?? ''
    },
    caption: 'TRAGUARDO',
    reached: (id, tier, reward) => ({
      title: S.ach.name(id),
      tier: S.ach.tier(tier),
      reward: `+${money(reward)}`,
      text: `Traguardo · ${S.ach.name(id)} ${S.ach.tier(tier)} · +${money(reward)}`,
    }),
    many: (n, reward) => ({
      title: `${n} traguardi`,
      tier: '★',
      reward: `+${money(reward)}`,
      text: `${n} traguardi · +${money(reward)} · vedi Progressi → Obiettivi`,
    }),
  },

  brief: {
    caption: (e, again) => `${again ? 'Promemoria' : 'Nuovo'} · ${S.museum.name(e)}`.toUpperCase(),
  },

  push: {
    streakTitle: (days) => `La tua serie di ${days} giorni`,
    streakBody: 'Gioca il turno giornaliero di oggi prima di mezzanotte per mantenerla.',
    giftTitle: 'Il tuo baule gratuito è pronto',
    giftBody: 'Un baule standard ti aspetta. Apri il gioco per riscattarlo.',
    passTitle: (season) => `${S.pass.seasonName(season)} è arrivato`,
    passBody: 'Un nuovo pass stagionale è disponibile con tre nuove skin da conquistare.',
    row: 'Notifiche',
    rowSub: 'La tua serie, un baule gratis, una nuova stagione o un sorpasso nella Top 20. Massimo una al giorno.',
    rowInstall: 'Aggiungi prima il gioco alla schermata Home, poi attivale qui.',
    choices: {
      streak: { title: 'Serie giornaliera', sub: 'Un promemoria serale prima che la serie scada.' },
      chests: { title: 'Bauli gratuiti', sub: 'Il baule gratuito di domani e i regali dagli inviti.' },
      pass: { title: 'Nuova stagione', sub: 'Quando inizia un nuovo pass stagionale.' },
      rank: { title: 'Sorpasso', sub: 'Quando un giocatore ti supera nella Top 20.' },
      comeback: { title: 'Torna a giocare', sub: 'Un promemoria dopo qualche giorno di pausa.' },
    },
    rowNone: 'Non disponibile qui. Apri il gioco nel browser per attivare le notifiche.',
    rowLocal: 'Attivo. I promemoria a gioco chiuso richiedono il servizio online non presente in questa versione.',
    confirmTitle: 'Notifiche attive',
    rowBlocked: 'Bloccato per questo sito. Consenti le notifiche nelle impostazioni del browser.',
    offerFirstTitle: 'Baule gratis domani',
    offerFirstWhy: 'Ricevi un avviso quando il baule gratuito di domani è pronto e prima che scada una serie. Max una al giorno, mai di notte.',
    offerTitle: 'Mantieni la serie',
    offerWhy: 'Ricevi un promemoria prima della scadenza della serie, per un baule o una nuova stagione. Max una al giorno, mai di notte. Disattivabile in qualsiasi momento.',
    offerOn: 'Attiva notifiche',
    offerLater: 'Non ora',
    on: 'Notifiche attivate. Puoi disattivarle in qualsiasi momento nelle Impostazioni.',
    failed: 'Impossibile attivare le notifiche. Riprova più tardi.',
    denied: 'Le notifiche sono bloccate nelle impostazioni del tuo browser.',
  },

  ready: {
    tapToStart: 'Tocca per iniziare',
    tapForFriends: 'Tocca per giocare con gli amici',
  },

  tabs: {
    progress: 'Progressi',
    social: 'Social',
    game: 'Gioco',
    shop: 'Negozio',
    build: 'Costruisci',
  },

  progress: {
    section: (i) => ['Oggi', 'Prove', 'Obiettivi', 'Record', 'Museo'][i],
    allStats: 'Tutte le statistiche',
    statsMore: (n) => `${n} altre ›`,
    statsHide: 'Nascondi',
    quests: 'Incarichi',
    trials: 'Prove',
    mastery: 'Maestria',
    feats: 'Imprese',
    trialsLocked: (level) => `Si apre al livello ${level} · turni speciali con ricompensa`,
    landmarks: 'Monumenti',
    landmarksHint: 'Rotatorie famose, ciascuna un turno impegnativo.',
    ascension: 'Ascensione',
    ascensionHint: 'Una prova per ogni grado di prestigio: i turni più tosti del gioco.',
    levelTrials: 'Prove di livello',
    levelTrialsHint: (waiting, shown) =>
      waiting > shown ? `Una in più a ogni livello. Altre ${waiting - shown} in attesa: superane una e comparirà la successiva.` : 'Una nuova per livello, dal livello 30 al 120.',
    bosses: 'Boss del sindacato',
    legendary: 'Turni leggendari',
    weeklies: 'Turni settimanali',
    ambulances: 'Ambulanze agevolate',
    level: 'Livello raggiunto',
    bestCombo: 'Miglior combo',
    bestChain: 'Catena perfetta record',
    streak: 'Serie giornaliera',
    flameTier: (tier) => ['MOTORE SPENTO', 'MOTORE AL MINIMO', 'MOTORE ACCELERATO', 'SCOPPI', 'POSTBRUCIATORE', 'INFERNO'][tier] ?? '',
    streakDay: 'giorno consecutivo',
    streakDays: 'giorni consecutivi',
    streakStart: 'Gioca il turno giornaliero di oggi per avviare il motore',
    streakKeep: 'Gioca il turno giornaliero di oggi per mantenerlo acceso',
    streakDone: 'Completato oggi · torna domani',
    streakCard: (n) => (n === 1 ? 'Gratta e vinci gratis domani' : `Gratta e vinci gratis tra ${n} giorni`),
    shiftsPlayed: 'Turni giocati',
    shiftsCompleted: 'Turni completati',
    takedowns: 'Arresti',
    transporters: 'Furgoni riscossi',
    unlimitedBest: 'Record Senza limiti',
    unlimitedCars: 'Auto in Senza limiti',
    unlimitedTier: 'Grado in Senza limiti',
    mayhemBest: 'Fiamme in Caos',
    mayhemChain: 'Catena in Caos',
    chillBest: 'Giro più lungo in Relax',
    chillCars: 'Auto in Relax',
    chillTime: 'Tempo in Relax',
    minutes: (s) => (s < 3600 ? `${Math.max(1, Math.round(s / 60))} min` : `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`),
    tours: 'Tappe del tour',
    perfects: 'Inserimenti perfetti',
    chestsOpened: 'Bauli aperti',
    days: (d) => (d === 1 ? '1 giorno' : `${d} giorni`),
    collectionShare: (o, t) => `Collezione · ${Math.floor((o / t) * 100)} %`,
    questsHint: 'Gli incarichi pagano una sola volta e si rinnovano a mezzanotte.',
    timingLabel: (n) => `La tua precisione · ultimi ${n} inserimenti`,
    timing: (ms, onBeat) => (ms === null ? '–' : Math.abs(ms) <= onBeat ? 'Perfetto' : ms < 0 ? `${-ms} ms prima` : `${ms} ms dopo`),
  },

  social: {
    section: (i) => ['Amici', 'Classifica', 'Club', 'Mafia'][i],
    clubClosed: 'Il Club si apre al livello 50: casa d’aste, fondo di gioco e contratti per grandi capitali.',
    mafiaClosed: 'La Famiglia non perde tempo con i principianti. Neutralizza il primo boss del sindacato (livello 15) e si faranno vivi.',
    offline: 'Amici e Classifiche richiedono il servizio online non collegato a questa copia.',
    noFriends: 'Amici non disponibile qui. Classifiche e Club restano accessibili.',
  },

  museum: {
    shelf: (i) => ['Boss', 'Speciali', 'Condizioni'][i],
    notSeen: 'Non ancora visto',
    newBadge: 'NUOVO',
    firstTime: 'Nuovo per te',
    firstAt: (level) => `Dal livello ${level}`,
    undiscovered: 'Non scoperto',
    lockedHint: (level) =>
      level > 1
        ? `Appare dal livello ${level}. Non appena lo incontrerai sulla strada, verrà esposto qui con tutte le informazioni.`
        : 'Continua a giocare i turni. Una volta incontrato sulla strada, verrà illustrato qui nei dettagli.',
    lockedBossHint: (level) => `Il sindicato lo invia al livello ${level}. Una volta affrontato, comparirà qui con le strategie per catturarlo.`,
    kind: (e) => ({ boss: 'Boss del sindacato', special: 'Veicolo speciale', weather: 'Meteo', dark: 'Oscurità', event: 'Evento cittadino', road: 'Strada' })[e.k],
    met: 'Incontrato, ancora a piede libero',
    onRing: 'Sull’anello',
    signalArrive: (arm, sweep) =>
      arm && sweep
        ? `Il raccordo di provenienza si illumina in ${color(arm)}, poi una scia ${color(sweep)} compie il giro dell’isolotto.`
        : arm
          ? `Il raccordo di provenienza si illumina in ${color(arm)} prima dell’ingresso sull’anello.`
          : `Una scia ${color(sweep ?? '')} compie il giro dell’isolotto.`,
    signalPaid: (c) => `Ben fatto: un anello ${color(c)} si espande dall’isolotto centrale.`,
    signalMissed: (c) => `Mancato: un anello ${color(c)} si ritrae verso l’isolotto centrale.`,
    signalNote: (n) =>
      n === 'escaped' ? 'Se scappa, l’intera rotatoria lampeggia in viola.' : 'Un’auto che si inserisce subito prima di lui fa lampeggiare la rotatoria in rosso e interrompe la combo.',
    heist: 'Bottino recuperato',
    firstMet: 'Livello del boss',
    rematch: 'Rivincita',
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
          return 'Due corsie';
      }
    },
  },
});
