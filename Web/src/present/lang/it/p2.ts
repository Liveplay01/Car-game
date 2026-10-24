import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { INVITE_LEVEL } from '../../../core/config';
import { rematchKind, ascensionRank, levelTrialLevel, levelKind, LANDMARK_PRESTIGE, type TrialId } from '../../../core/trials';
import { Fmt, money } from '../../format';

/** Italiano, Parte 2: Prove, Boss, Turni leggendari e settimanali, Prestigio, Élite. */
export default (S: Strings): Words<Strings> => ({
  rush: {
    name: 'Assalto ai boss',
    caption: 'ASSALTO AI BOSS',
    clock: 'TEMPO',
    best: 'RECORD',
    step: (n, total) => `Boss ${n} di ${total}`,
    shiftLine: (kind, first) => `${S.boss.name(kind)} · ${first ? 'se perdi una manche, ricominci da capo' : 'il cronometro continua'}` ,
    caught: (n, total) => `BOSS ${n} DI ${total} CATTURATO`,
    nextLine: (kind) => `Prossimo: ${S.boss.name(kind)} · tocca per continuare`,
    over: 'ASSALTO TERMINATO',
    overLine: (caught, total) => `${caught} di ${total} boss catturati · tocca per riavviare`,
    cleared: 'ASSALTO COMPLETATO',
    firstLine: (m) => `Tutti gli otto boss sconfitti · ${m} erogati`,
    recordLine: 'Nuovo record di tempo',
    bestLine: (time) => `Miglior tempo: ${time} · tocca per una nuova corsa`,
    rowTitle: 'Tutti gli otto boss',
    line: 'Uno dopo l’altro, un solo orologio',
    furthest: (n, total) => `traguardo massimo ${n}/${total}`,
    locked: (beaten, total) => `Sconfiggi tutti gli otto boss per sbloccare · ${beaten}/${total}`,
  },

  trials: {
    name(id) {
      const boss = rematchKind(id);
      if (boss) return S.boss.rematch(boss);
      if (id === 'landmark.etoile') return 'L’Étoile';
      if (id === 'weekly') return S.weekly.title;
      if (id.startsWith('tour.')) return S.tours.stopName(id);
      const rank = ascensionRank(id);
      if (rank !== null) return `Ascensione ★${rank}`;
      const level = levelTrialLevel(id);
      if (level !== null) return `${S.trials.kindName[levelKind(level)]} · Liv ${level}`;
      return {
        tightSqueeze: 'Strettoia',
        deadCentre: 'Centro perfetto',
        cleanSheet: 'Senza macchia',
        blackout: 'Blackout',
        stormWatch: 'Allerta tempesta',
        marathon: 'Maratona',
        mostWanted: 'I più ricercati',
        noPolice: 'Senza polizia',
        noDriving: 'Senza assistenza',
        bareBuild: 'Anello base',
      }[id as TrialId];
    },
    kindName: {
      precision: 'Precisione',
      sharpEyes: 'Occhio di lince',
      cleanRun: 'Corsa pulita',
      weatherRun: 'Meteo avverso',
      nightShift: 'Turno di notte',
      manhunt: 'Caccia all’uomo',
      ruleBreaker: 'Senza pietà',
      handicap: 'Handicap',
      longHaul: 'Lungo tragitto',
    },
    goal(t) {
      if (t.tour) return S.tours.goal(t);
      if (t.elite) return S.weekly.goal(t);
      if (levelTrialLevel(t.id) !== null) {
        const strip = t.strip ?? [];
        const parts = [
          t.goal.k === 'perfects'
            ? `${t.goal.n} Inserimenti perfetti`
            : t.goal.k === 'skilled'
              ? `${t.goal.n} Spazi stretti o meglio`
              : t.goal.k === 'boss'
                ? `Catturare ${S.boss.name(t.boss ?? 'convoy')}`
                : null,
          `${t.cars} auto`,
          t.weather !== 'clear' ? S.weather(t.weather) : null,
          t.darkness === 'blackout' ? S.blackout : t.darkness === 'night' ? S.night : null,
          t.legendary ? S.legendary.name(t.legendary) : null,
          t.rule === 'flawless' ? 'nessuno schianto' : null,
          strip.length > 0 ? `la tua rotatoria senza potenziamenti di ${strip.map((g) => ['polizia', 'denaro', 'guida'][g]).join(' né ')}` : null,
        ];
        return parts.filter((p): p is string => p !== null).join(' · ');
      }
      if (ascensionRank(t.id) !== null) {
        const parts = [
          `${t.cars} auto`,
          t.weather !== 'clear' ? S.weather(t.weather) : null,
          t.darkness === 'blackout' ? S.blackout : t.darkness === 'night' ? S.night : null,
          t.legendary ? S.legendary.name(t.legendary) : null,
          t.rule === 'flawless' ? 'nessuno schianto' : null,
          t.goal.k === 'boss' ? 'catturare il boss' : null,
        ];
        return parts.filter((p): p is string => p !== null).join(' · ');
      }
      const boss = rematchKind(t.id);
      if (boss) return `Rivincita contro ${S.boss.name(boss)}: più scorte, meno tempo`;
      if (t.arms) return `${t.arms} strade in una rotatoria · ${t.cars} auto`;
      switch (t.id) {
        case 'tightSqueeze':
          return `${t.goal.k === 'skilled' ? t.goal.n : 0} Spazi stretti o meglio su ${t.cars} auto`;
        case 'deadCentre':
          return `${t.goal.k === 'perfects' ? t.goal.n : 0} Inserimenti perfetti su ${t.cars} auto`;
        case 'cleanSheet':
          return `${t.cars} auto, nessuno schianto`;
        case 'blackout':
          return `${t.cars} auto di notte, lampioni spenti`;
        case 'stormWatch':
          return `${t.cars} auto sotto la tempesta di notte`;
        case 'marathon':
          return `${t.cars} auto in un solo turno`;
        case 'mostWanted':
          return 'Cattura il capo del sindacato';
        case 'noPolice':
          return `${t.cars} auto con la tua rotatoria, ma senza potenziamenti di polizia`;
        case 'noDriving':
          return `${t.cars} auto con la tua rotatoria, ma senza potenziamenti di guida (niente scudo)`;
        case 'bareBuild':
          return `${t.cars} auto con la tua rotatoria, senza polizia né guida`;
        default:
          return '';
      }
    },
    level: (l) => `Livello ${l}`,
    passed: 'SUPERATO',
    play: 'Gioca',
    opensAt: (l) => `Si sblocca al livello ${l}`,
    opens: (t) => {
      const rank = ascensionRank(t.id);
      if (rank !== null) return `Si sblocca con Prestigio ★${rank}`;
      return t.arms ? `Si sblocca con Prestigio ★${LANDMARK_PRESTIGE}` : S.trials.opensAt(t.level);
    },
    howTo(t) {
      if (t.goal.k === 'perfects') {
        return {
          title: 'Come fare · Inserimento perfetto',
          text: 'Inserisci l’auto esattamente al centro di uno spazio, con circa la stessa distanza davanti e dietro. Uno spazio immenso non conta: mira a un varco medio.',
          short: 'Il centro di uno spazio medio, non enorme',
        };
      }
      if (t.goal.k === 'skilled') {
        return {
          title: 'Come fare · Spazio stretto',
          text: 'Inserisciti vicinissimo all’auto precedente o seguente senza toccarla: spazi stretti, quasi-schianti e inserimenti perfetti sono validi.',
          short: 'Molto vicino a un’altra auto, senza toccarla',
        };
      }
      return null;
    },
    progress: (t, have, need) => `${t.goal.k === 'perfects' ? 'Inserimenti perfetti' : 'Spazi stretti o meglio'} ${Math.min(have, need)}/${need}${have >= need ? ' ✓' : ''}`,
  },

  boss: {
    incoming: 'CONVOGLIO DEL SINDACATO',
    scoutFirst: 'Una vedetta con scorta: speronala con un’auto di pattuglia nello spazio prima della scorta',
    name: (k) =>
      ({
        convoy: 'Il Convoglio',
        getaway: 'L’Autista della fuga',
        armoured: 'Il Boss blindato',
        phantom: 'Il Fantasma',
        twins: 'I Gemelli',
        decoy: 'Il Baro',
        smuggler: 'Il Contrabbandiere',
        kingpin: 'Il Padrino',
      })[k],
    rematch: (k) => `Rivincita · ${S.boss.name(k)}`,
    beaten: 'Catturato',
    escaped: 'IL BOSS È SFUGGITO',
    wanted: (seconds) => `BOSS ${Math.ceil(Math.max(0, seconds))}`,
    busted: (amount) => `Boss catturato · ${amount} recuperati`,
    label: (role) => (role === 'boss' ? 'BOSS' : role === 'escort' ? 'SCORTA' : null),
  },

  legendary: {
    caption: 'TURNO LEGGENDARIO',
    name: (r) => ({ gridlock: 'Ingorgo totale', dragnet: 'Retata', heavyLoad: 'Carico pesante', darkStorm: 'Tempesta oscura', zeroTolerance: 'Tolleranza zero' })[r],
    line: (r) =>
      ({
        gridlock: 'Ora di punta dalla prima auto',
        dragnet: 'Doppio dei criminali',
        heavyLoad: 'Camion ovunque, per metà autocisterne di gas',
        darkStorm: 'Tempesta in pieno blackout',
        zeroTolerance: 'Un solo schianto termina tutto',
      })[r],
    reward: 'RICOMPENSA',
    chest: 'Premium',
    done: (item) => `TURNO LEGGENDARIO SUPERATO${item ? ` · ${S.shop.item(item)} sbloccato` : ''}`,
    broken: 'REGOLA VIOLATA',
  },

  weekly: {
    title: 'Turno settimanale',
    caption: 'TURNO SETTIMANALE',
    elite: (e) => ({ flawless: 'Impeccabile', precision: 'Precisione', storm: 'Fronte di tempesta', gridlock: 'Ingorgo totale', dragnet: 'Retata', boss: 'Caccia al boss' })[e],
    goal(t) {
      switch (t.elite) {
        case 'flawless':
          return `Livello ${t.level} · ${t.cars} auto, nessuno schianto`;
        case 'precision':
          return `Livello ${t.level} · ${t.goal.k === 'perfects' ? t.goal.n : 0} Inserimenti perfetti su ${t.cars} auto`;
        case 'storm':
          return `Livello ${t.level} · ${t.cars} auto sotto la tempesta di notte`;
        case 'gridlock':
          return `Livello ${t.level} · ${t.cars} auto in ora di punta dall’inizio`;
        case 'dragnet':
          return `Livello ${t.level} · ${t.cars} auto, doppio dei criminali`;
        case 'boss':
          return `Livello ${t.level} · cattura il capo del sindacato`;
        default:
          return '';
      }
    },
    daysLeft: (n) => (n === 1 ? 'ultimo giorno' : `ancora ${n} giorni`),
    hint: 'Stesso turno per tutti questa settimana. Giocalo quante volte vuoi; ricompensa riscossa una sola volta.',
    done: (m) => `TURNO SETTIMANALE COMPLETATO · +${money(m)}`,
    passedThisWeek: 'Completato questa settimana · nuovo turno lunedì',
  },

  invite: {
    shareText: (level) => `Gioca con me a Roundabout Timing! Raggiungi il livello ${level} ed entrambi riceveremo un baule gratuito.`,
  },

  rewards: {
    crew: (reason, what) => {
      const [kind, what2, ...rest] = reason.split(':');
      if (kind !== 'crew') return null;
      switch (what2) {
        case 'gift':
          return `REGALO DELLA CREW · ${what} · da ${rest.slice(1).join(':') || 'la tua crew'}`;
        case 'up':
          return `PROMOSSI DI LEGA · ${what} · ${S.crew.league(rest[0] ?? '')}`;
        case 'goal':
          return `OBIETTIVO DELLA SETTIMANA RAGGIUNTO · ${what} · grazie alla tua crew`;
        case 'xp':
          return `OBIETTIVO DELLA SETTIMANA ×${rest[0] ?? ''} · ${what} · la tua crew ha spinto forte`;
        case 'top':
          return `POSTO ${rest[0] ?? ''} IN LEGA · ${what} · la tua crew ha chiuso in alto`;
        case 'back':
          return `REGALO RESTITUITO · ${what} · nessuno l’ha preso`;
        default:
          return null;
      }
    },
    bugHunter: (id) => `${S.shop.item(id).toUpperCase()} SBLOCCATO · grazie per la caccia ai bug`,
    chest: (kind) => `UN REGALO DAL TEAM · ${S.shop.chest(kind)} · grazie`,
    money: (amount) => `UN REGALO DAL TEAM · ${Fmt.number(amount)} monete · grazie`,
    item: (id) => `UN REGALO DAL TEAM · ${S.shop.item(id)} sbloccato`,
    invite: (reason, kind) => {
      const [, what, ...rest] = reason.startsWith('invite:') ? reason.split(':') : [];
      const who = rest.join(':');
      switch (what) {
        case 'welcome':
          return `RICOMPENSA INVITO · ${S.shop.chest(kind)} · ti sei unito tramite ${who}`;
        case 'friend':
          return `RICOMPENSA INVITO · ${S.shop.chest(kind)} · ${who} ha raggiunto il livello ${INVITE_LEVEL}`;
        case 'milestone':
          return `BONUS INVITO · ${S.shop.chest(kind)} · ${who} amici si sono uniti`;
        default:
          return null;
      }
    },
  },

  prestige: {
    title: 'Prestigio',
    ready: (level) => `Livello ${level} raggiunto: riparti dal livello 1 su una strada più difficile`,
    locked: (level) => `Raggiungi il livello ${level} per ricominciare su una strada più dura`,
    keeps: 'Mantieni denaro, potenziamenti, strade e collezione. Solo estetica, nessun vantaggio.',
    confirm: 'Tocca di nuovo per il Prestigio · torna al livello 1',
    available: (rank) => `PRESTIGIO ★${rank} PRONTO · ricomincia in Progressi → Élite per una carreggiata più impegnativa e nuovi premi`,
    done: (rank, item) => `PRESTIGIO ★${rank}${item ? ` · ${S.shop.item(item)} sbloccato` : ''}`,
    headStart: (levels) => `Il traffico parte ${levels} livelli più difficile`,
  },

  elite: {
    title: 'Élite',
    caption: (level) => `Élite ${level}`,
    locked: (level) => `Raggiungi il livello ${level}: il percorso Élite e il Prestigio si apriranno`,
    prestigeHeader: 'Prestigio',
    rank: 'Grado',
    traffic: 'Traffico',
    harder: (levels) => `+${levels} livelli`,
    prestigeAction: (rank) => `Prestigio a ★${rank}`,
    prestigeConfirm: 'Tocca di nuovo · torna al livello 1',
    next: (step) => `Prossimo a Élite ${step.level}: ${S.elite.reward(step)}`,
    reward: (step) => (step.item ? S.shop.item(step.item.id) : step.title ? `Titolo «${S.titles.name(step.title)}»` : S.shop.chest(step.chest)),
    toGo: (b) => {
      const next = `${Fmt.number(b.left)} XP a Élite ${b.level + 1}`;
      if (b.climbed > 0) return `ÉLITE ${b.level} · ${next}`;
      return b.gained > 0 ? `+${Fmt.number(b.gained)} XP · ${next}` : next;
    },
    opened: 'PILOTA D’ÉLITE · il percorso Élite è aperto',
    reached: (step) => `ÉLITE ${step.level}${step.item ? ` · ${S.shop.item(step.item.id)} sbloccato` : ''}`,
    body: [
      'Dal livello 50, ogni turno conferisce XP Élite: 10 per un turno completato, 1 per ogni Inserimento perfetto o stretto, 10 in più per un boss catturato o un Turno leggendario.',
      'Ogni livello Élite richiede un po’ più di XP del precedente. Ciascuno assegna un baule standard e ogni decimo uno premium. Titoli e skin ti attendono lungo il percorso. Il Prestigio conserva la pista.',
      'Solo estetica, nessun vantaggio sulla strada.',
    ],
    trackHeader: 'Lungo il percorso',
    titlesHeader: 'Titoli · toccane uno per equipaggiarlo',
    wearing: 'Equipaggiato',
    notYet: 'Non ancora',
  },
});
