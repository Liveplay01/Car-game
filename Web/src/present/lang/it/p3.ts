import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { Fmt, money } from '../../format';

/** Italiano, Parte 3: Titoli, Pass stagionale, Tempio della gloria, Modalità, Mutatori, Tour. */
export default (S: Strings): Words<Strings> => ({
  titles: {
    name: (id) =>
      ({
        eliteDriver: 'Pilota d’élite',
        roadVeteran: 'Veterano dell’asfalto',
        ringMaster: 'Padrone dell’anello',
        ironNerves: 'Nervi d’acciaio',
        roadRoyalty: 'Nobiltà della strada',
        livingLegend: 'Leggenda vivente',
        precisionDriver: 'Pilota di precisione',
        comboMaster: 'Maestro delle combo',
        closeCallArtist: 'Artista del rasoio',
        syndicateBreaker: 'Distruttore del sindacato',
        nightOwl: 'Gufo notturno',
        stormChaser: 'Cacciatore di tempeste',
        legendHunter: 'Cacciatore di leggende',
        starDriver: 'Pilota stellare',
        marathoner: 'Maratoneta',
        overdriver: 'Sovraccarico',
        endless: 'Infinito',
        scorcher: 'Bruciante',
        inferno: 'Inferno',
        meltdown: 'Fusione',
        sovereign: 'Sovrano',
        timeless: 'Senza tempo',
        apex: 'Apex',
        boundless: 'Senza limiti',
        ascended: 'Asceso',
        eternal: 'Eterno',
        grandmaster: 'Gran maestro',
        centurion: 'Centurione',
        immortal: 'Immortale',
        roadWarden: 'Guardiano stradale',
        gridlord: 'Signore del traffico',
        ringbearer: 'Portatore dell’anello',
        unstoppable: 'Inarrestabile',
        timekeeper: 'Signore del tempo',
        paragon: 'Modello',
        mythic: 'Mitico',
        ringEternal: 'Anello eterno',
        mastermind: 'Mente suprema',
        summit: 'Vetta',
        syndicateEnd: 'Fine del sindacato',
      })[id],
    rule(r) {
      switch (r.k) {
        case 'elite':
          return `Raggiungi Élite ${r.level}`;
        case 'mastery':
          return `Completa la maestria «${S.mastery.name(r.goal)}»`;
        case 'bosses':
          return r.all ? 'Cattura tutti gli otto boss del sindacato' : 'Cattura i primi quattro boss del sindacato';
        case 'trial':
          return `Supera la prova «${S.trials.name(r.id as never)}»`;
        case 'legendary':
          return `Completa ${r.shifts} turni leggendari`;
        case 'prestige':
          return `Raggiungi Prestigio ★${r.rank}`;
        case 'heat':
          return S.heat.rule(r.level);
        case 'item':
          return `Sblocca ${S.shop.item(r.id)} in Senza limiti`;
        case 'masteries':
          return 'Raggiungi il grado V in ogni maestria';
      }
    },
    earned: (ids) => (ids.length === 1 ? `TITOLO · ${S.titles.name(ids[0])}` : `${ids.length} NUOVI TITOLI · ${ids.map((t) => S.titles.name(t)).join(', ')}`),
    none: 'Nessun titolo',
  },

  pass: {
    title: 'Pass stagionale',
    seasonName: (s) => ({ winter: 'Inverno', spring: 'Primavera', summer: 'Estate', autumn: 'Autunno' })[s],
    caption: (s) => `Pass stagionale ${S.pass.seasonName(s)}`,
    tier: (n, total) => `Livello ${n} di ${total}`,
    locked: (level) => `Si sblocca al livello ${level}`,
    buyHint: 'Bauli, denaro e tre skin',
    daysLeft: (n) => (n === 1 ? 'ultimo giorno' : `ancora ${n} giorni`),
    complete: 'Percorso completato · ci vediamo la prossima stagione',
    reached: (step) =>
      `PASS STAGIONALE · LIVELLO ${step.tier} · ${step.duplicate > 0 ? `${S.pass.reward(step.reward)} di nuovo · +${money(Fmt.number(step.duplicate))}` : S.pass.reward(step.reward)}`,
    buy: (price) => `Acquista · ${price}`,
    body: (xpPerTier) => [
      `Un percorso di dodici livelli per questa stagione, acquistabile con denaro di gioco. Ogni turno conferisce XP: 10 per un turno completato, 1 per Inserimento perfetto o stretto, 10 in più per un boss o un Turno leggendario. Il primo livello richiede ${xpPerTier} XP, e ciascuno successivo poco più.`,
      'Tre livelli racchiudono le skin di questa stagione, con effetti unici non reperibili nei bauli. Le quattro stagioni ritornano ogni anno assieme alle loro skin.',
      'Solo estetica, nessun vantaggio sulla strada. Nulla costa denaro reale.',
    ],
    trackHeader: 'Il percorso',
  },

  hall: {
    title: 'Tempio della gloria',
    header: 'Tempio della gloria',
    build: (price) => `Costruisci Tempio della gloria · ${price}`,
    built: 'TEMPIO DELLA GLORIA COSTRUITO · muro d’onore sull’isola · skin Leggenda sbloccata',
    notBuilt: 'Un muro d’oro sull’isola con una stella per ogni grado di prestigio e una skin esclusiva. Tocca per scoprire cosa offre.',
    tapMore: 'Tocca per scoprire cosa offre.',
    open: (level) => `Si apre raggiungendo il livello ${level}`,
    plaqueLine: (e, date) =>
      [date, e.elite > 0 ? `Élite ${e.elite}` : null, `${e.bosses} ${e.bosses === 1 ? 'boss' : 'boss'}`, e.legendary > 0 ? `${e.legendary} leggendari` : null].filter((x) => x).join(' · '),
    empty: 'Il tuo primo prestigio inaugurerà la prima targa.',
    standing: 'Eretto sull’isola',
    about: [
      'Un monumento permanente sulla tua isola: un muro d’onore dorato in cima con una stella per ogni grado di prestigio conseguito.',
      'Custodisce la tua storia. Ogni prestigio aggiunge una targa: la data, il livello Élite, i boss catturati e i turni leggendari superati.',
      'E sblocca la skin Leggenda, oro con alloro scintillante, per le tue vetture.',
    ],
    looks: 'Solo onore ed estetica: nessun vantaggio sulla strada, nulla da perdere con il prestigio.',
    gives: 'Cosa ottieni',
    wall: 'Muro d’oro sull’isola',
    wallValue: (ranks) => (ranks > 0 ? `${ranks} ${ranks === 1 ? 'stella' : 'stelle'} ora` : 'Ancora nessuna stella'),
    plaques: 'Una targa per prestigio',
    plaquesValue: (n) => (n > 0 ? `${n} finora` : 'Nessuna'),
    skin: 'Skin Leggenda',
    skinValue: 'Oro con alloro',
    back: 'Torna a Élite',
  },

  modes: {
    name: (m) => (m === 'shift' ? 'TURNO' : m === 'unlimited' ? 'SENZA LIMITI' : m === 'mayhem' ? 'CAOS' : m === 'chill' ? 'RELAX' : 'MULTIGIOCATORE'),
    line: (m) =>
      m === 'shift'
        ? 'Supera i livelli e sali'
        : m === 'unlimited'
          ? 'Infinito · fino allo schianto'
          : m === 'mayhem'
            ? '12 auto · mira alle cisterne'
            : m === 'chill'
              ? 'Nessuna pressione · gli schianti non fermano la corsa'
              : 'Fino a 4 amici · l’ultimo vince',
    youLabel: 'TU',
    defaultName: 'Giocatore',
    runOver: 'CORSA TERMINATA',
    again: 'Tocca per una nuova corsa',
    carsSent: (n) => (n === 1 ? '1 auto' : `${n} auto`),
    unlocked: { caption: 'NUOVE MODALITÀ', text: 'Scorri lateralmente per Senza limiti, Caos, Relax e Multigiocatore' },
    tryUnlimited: { caption: 'MODALITÀ DI GIOCO', text: 'Scorri per Senza limiti: niente livelli, guida fino allo schianto' },
    tightFit: { caption: 'SUGGERIMENTO', text: 'Più vicino paga di più: infilati subito dietro a un’auto per uno Spazio stretto a punti raddoppiati' },
    swipeCaption: 'MODALITÀ DI GIOCO',
    swipeHint: 'Scorri per vedere altre modalità',
    stage: (stage, overtime) =>
      overtime > 0
        ? `STRAORDINARI ${overtime} · più traffico, ritmo accelerato`
        : (['', 'CISTERNE DI GAS SI UNISCONO AL FLUSSO', 'CALA LA NOTTE', 'SI AVVICINA UNA TEMPESTA', 'CAMION MILITARI SULLA STRADA'][stage] ?? ''),
    tier: (id) => ({ bronze: 'Bronzo', silver: 'Argento', gold: 'Oro', platinum: 'Platino', diamond: 'Diamante', master: 'Maestro' })[id],
    mark: (cars, reward) =>
      reward.tier ? `${cars} auto · ${S.modes.tier(reward.tier).toUpperCase()}` : reward.skin ? `${cars} auto · ${S.shop.item(reward.skin).toUpperCase()}` : `${cars} auto`,
    tierUp: (id) => `NUOVO GRADO · ${S.modes.tier(id).toUpperCase()} in Senza limiti`,
    tierLine: (id, next) => [id ? S.modes.tier(id) : '–', next ? `${next.cars} auto per ${S.modes.tier(next.id)}` : null].filter(Boolean).join(' · '),
    milestone: (id) => `TRAGUARDO SENZA LIMITI · ${S.shop.item(id)} sbloccato`,
  },

  mayhem: {
    caption: 'CAOS',
    flames: 'FIAMME',
    cars: 'AUTO',
    chain: (n) => `CATENA ×${n}`,
    over: 'FINE DEL CAOS',
    again: 'Tocca per altro caos',
    summary: (wrecks, chain) => `${wrecks} ${wrecks === 1 ? 'rottame' : 'rottami'} · catena record ×${chain}`,
  },

  chill: {
    caption: 'RELAX',
    time: 'TEMPO',
    done: 'Fatto',
    doneLabel: 'Fatto: termina questo giro',
    over: 'BUON VIAGGIO',
    again: 'Tocca per un nuovo giro',
    summary: (cars, time) => `${cars === 1 ? '1 auto' : `${cars} auto`} · ${time}`,
    best: (cars) => `Il tuo tragitto più lungo: ${cars === 1 ? '1 auto' : `${cars} auto`}`,
  },

  mutator: {
    caption: 'OGGI',
    name: (id) =>
      ({
        openRoad: 'Strada libera',
        speedway: 'Tracciato veloce',
        fogBank: 'Banco di nebbia',
        nightShift: 'Turno di notte',
        lightsOut: 'Luci spente',
        stormFront: 'Fronte di tempesta',
        rushAllDay: 'Ingorgo continuo',
        dragnet: 'Retata',
        heavyLoad: 'Carico pesante',
        cashConvoy: 'Convoglio portavalori',
      })[id],
    line: (id) =>
      ({
        openRoad: 'Meno auto sulla rotatoria',
        speedway: 'Più rapido, con traffico leggermente diradato',
        fogBank: 'Nebbia per l’intero turno',
        nightShift: 'Dopo il calar del sole',
        lightsOut: 'Notte e lampioni spenti',
        stormFront: 'Tempesta per tutta la durata del turno',
        rushAllDay: 'Ora di punta dalla prima auto',
        dragnet: 'Doppio dei criminali',
        heavyLoad: 'Camion e cisterne ovunque',
        cashConvoy: 'Doppio dei furgoni blindati',
      })[id],
    pill: (id) => `OGGI · ${S.mutator.name(id).toUpperCase()}`,
  },

  seasonRule: {
    name: (s) => ({ winter: 'Pieno inverno', spring: 'Acquazzoni primaverili', summer: 'Tempeste estive', autumn: 'Nebbia e penombra' })[s],
    line: (s) =>
      ({
        winter: 'Nebbia e neve compaiono più spesso, e la notte scende presto',
        spring: 'Pioggia più frequente',
        summer: 'Generalmente sereno, ma se cambia volge a tempesta',
        autumn: 'Più nebbia e pomeriggi che sfumano presto nel buio',
      })[s],
  },

  tours: {
    caption: 'TOUR',
    name: (id) => ({ halloween: 'Anello stregato', winter: 'Luci invernali' })[id],
    tagline: (id) =>
      ({
        halloween: 'Sette tappe dopo il tramonto. Tre skin esclusive.',
        winter: 'Sette tappe innevate. Tre skin esclusive.',
      })[id],
    stop: (n, of) => `Tappa ${n}/${of}`,
    stopName: (id) => {
      const m = /^tour\.([a-z]+)\.(\d+)$/.exec(id);
      return m ? `${S.tours.name(m[1] as 'halloween' | 'winter')} · Tappa ${m[2]}` : '';
    },
    left: (n) => (n <= 1 ? 'ultimo giorno' : `ancora ${n} giorni`),
    opensIn: (n) => (n === 1 ? 'domani' : `tra ${n} giorni`),
    startsIn: (inDays) => `Inizia ${S.tours.opensIn(inDays)}`,
    locked: (level) => `I tour si aprono al livello ${level}`,
    progress: (done, total) => `${done}/${total} tappe`,
    play: 'Gioca ›',
    goal(t) {
      const parts = [
        `${t.cars} auto`,
        t.weather !== 'clear' ? S.weather(t.weather) : null,
        t.darkness === 'blackout' ? S.blackout : t.darkness === 'night' ? S.night : null,
        t.legendary ? S.legendary.name(t.legendary) : null,
        t.rule === 'flawless' ? 'nessuno schianto' : null,
        t.goal.k === 'perfects' ? `${t.goal.n} Inserimenti perfetti` : null,
        t.goal.k === 'boss' ? 'catturare il boss' : null,
      ];
      return parts.filter((p): p is string => p !== null).join(' · ');
    },
    reward(r) {
      const parts = [r.item ? S.shop.item(r.item) : null, r.chest ? S.shop.chest(r.chest) : null, r.money ? `${Fmt.number(r.money)} monete` : null];
      return parts.filter((p): p is string => p !== null).join(' + ');
    },
    stopDone: (n, of, reward) => `TAPPA DEL TOUR ${n}/${of} · ${reward}`,
    complete: (id) => `${S.tours.name(id).toUpperCase()} COMPLETATO`,
    passedBefore: 'Già completato in questo tour',
  },
});
