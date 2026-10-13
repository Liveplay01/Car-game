import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { Fmt, money, percent, multiplier } from '../../format';
import { MONEY_MARK } from '../../icons';
import { baseConfig } from '../../../core/config';
import { MASTERY_THRESHOLDS, masteryNumeral } from '../../../core/career';

/** Italiano, Parte 6: Mafia, Negozio, Maxischermo, Turno giornaliero, Album, Maestria, Meteo. */
export default (S: Strings): Words<Strings> => ({
  mafia: {
    title: 'La Famiglia',
    speeds: ['Lenta', 'Rapida', 'Frenetica'],
    pointer: (speed) => `Lancetta · ${speed}`,
    takeCash: 'Prendi denaro',
    tagline: 'Rispettano un pilota che ha incastrato il loro boss. Prestano, ma pretendono tutto indietro.',
    badge: 'Mafia',
    don: 'Il Don',
    pitch: 'Scegli un prestito, accomodati al tavolo e ferma la lancetta nella zona verde. Più sei vicino al centro, migliore sarà il patto. Maggiore è il prestito, più veloce corre la lancetta.',
    rules: (rate, cap, garnish) =>
      `Restituisci prima del giorno indicato. In ritardo, il debito cresce del ${Math.round(rate * 100)} % al giorno (fino a +${Math.round(cap * 100)} %), il ${Math.round(garnish * 100)} % di ogni turno va alla Famiglia, nessun furgone, criminale o boss paga, il casinò chiude e il tuo nome porta il marchio della Mafia. Salda tutto per cancellare il debito. Ogni prestito restituito puntuale rende il successivo più vantaggioso ed estende la zona verde.`,
    grade: (g) => ({ perfect: 'PERFETTO', good: 'BUONO', miss: 'MANCATO' })[g],
    gradeText: (g) => ({ perfect: 'Dritto al punto. Il Don sorride.', good: 'Una stretta di mano leale.', miss: 'Il Don alza le spalle. Rimane valida solo l’offerta base.' })[g],
    set: 'Prendi posto',
    stop: 'STOP',
    tapToStop: 'Tocca per fermare la lancetta',
    setting: 'Il Don attende…',
    loanLabel: 'Prestito',
    perDay: (days) => `${days} ${days === 1 ? 'giorno' : 'giorni'}`,
    offer: (interest, days) => `${Math.round(interest * 100)} % interesse · ${days} ${days === 1 ? 'giorno' : 'giorni'}`,
    zone: (width, clean) => `Zona verde ${Math.round(width * 100)} % della barra${clean > 0 ? ` · ${clean} ${clean === 1 ? 'prestito restituito' : 'prestiti restituiti'} puntuali` : ''}`,
    ledger: 'Mastro contabile',
    lent: 'Prestato',
    owed: 'Devi',
    due: 'Scadenza',
    late: 'IN RITARDO',
    paid: 'Saldato finora',
    countdown: (ms) => {
      const mins = Math.max(0, Math.floor(ms / 60_000));
      const days = Math.floor(mins / 1440);
      const hours = Math.floor((mins % 1440) / 60);
      if (days > 0) return `ancora ${days} g ${hours} h`;
      return hours > 0 ? `ancora ${hours} h ${mins % 60} min` : `ancora ${mins} min`;
    },
    lateFor: (ms) => {
      const days = Math.floor(ms / 86_400_000);
      return days > 0 ? `${days} ${days === 1 ? 'giorno' : 'giorni'} di ritardo` : 'Appena scaduto';
    },
    repayShare: (share) => (share >= 1 ? 'Paga tutto' : `Paga ${Math.round(share * 100)} %`),
    noMoney: 'Fondi insufficienti per saldare questo importo.',
    waiting: 'Il Don osserva',
    atStake: 'In caso di ritardo',
    inForce: 'In vigore fino al saldo',
    consequences: (garnish) => ['Casinò chiuso', 'Niente furgoni, criminali o boss', `${Math.round(garnish * 100)} % prelevato su ogni turno`, 'Distintivo Mafia in classifica'],
    overdue: 'SCADUTO',
    overdueText: 'La Famiglia riscuote. Ogni turno paga prima loro.',
    paidStamp: 'SALDATO',
    assist: 'Mano ferma',
    assistText: 'Lancetta rallentata, ma accordo Perfetto escluso',
    banned: (date) => `La Famiglia non risponde alle tue chiamate. Riparleranno con te il ${date}.`,
    nextStep: (interest, nextInterest, zone, nextZone) =>
      `Restituisci il prossimo prestito in tempo: interesse ${Math.round(interest * 100)} % → ${Math.round(nextInterest * 100)} %, zona verde ${Math.round(zone * 100)} % → ${Math.round(nextZone * 100)} %`,
    shiftsToClear: (n) => `Circa ${n} ${n === 1 ? 'turno' : 'turni'} di guadagni per estinguerlo`,
    onlyOne: 'Un solo prestito alla volta. Salda prima questo.',
    letters: 'Lettere',
    letter: (kind, owed, date) =>
      ({
        taken: `È stato un piacere. ${owed} entro il ${date}, non un giorno in più. Non costringermi a cercarti.`,
        half: 'Metà del tempo è trascorsa. La Famiglia non dimentica i debiti né gli amici puntuali.',
        day: 'Resta un giorno. Fa’ la cosa giusta prima che diventi una questione personale.',
        late: 'Il tempo è scaduto. Il tuo nome è sulla lista. La strada paga prima noi e il casinò è chiuso per te.',
        later: 'La cifra sale ogni giorno. Paga e torneremo amici.',
      })[kind],
    notices: {
      late: 'LA FAMIGLIA ATTENDE · prestito scaduto · il casinò è chiuso',
      grace: 'LA FAMIGLIA TI CONCEDE UN GIORNO · il debito è scaduto mentre eri assente',
      writtenOff: 'LA FAMIGLIA CHIUDE IL CONTO · debito cancellato, ma le loro porte restano sbarrate 14 giorni',
    },
    garnished: (cut, cleared) => (cleared ? `LA FAMIGLIA HA PRELEVATO ${money(cut)} · debito saldato, sei libero` : `LA FAMILIA HA TRATTENUTO ${money(cut)} dal compenso`),
    casinoShut: 'Il casinò è chiuso finché la Famiglia attende il suo denaro.',
  },

  shop: {
    open: 'Apri',
    wear: 'Equipaggia',
    takeOff: 'Rimuovi',
    worn: 'Equipaggiato',
    inTraffic: 'Nel traffico',
    vehicleAuto: 'Non serve equipaggiarlo: il veicolo si inserisce da solo nel flusso stradale.',
    lockedTitle: (kind) => (kind === 'mapSkin' ? 'Mappa misteriosa' : kind === 'vehicleType' ? 'Veicolo misterioso' : 'Skin misteriosa'),
    source(k) {
      switch (k) {
        case 'standard':
          return 'In vendita · o tramite video';
        case 'premium':
          return 'In vendita · o con maestrie impegnative';
        case 'diamond':
          return 'In vendita · mai comune';
        case 'event':
          return 'Eventi cittadini · Turno giornaliero';
        case 'criminalHunt':
          return 'Ottenuto catturando criminali';
      }
    },
    seasonHint: 'Contiene al 50 % l’oggetto stagionale finché non lo possiedi.',
    pickItem: 'Tocca un oggetto per esaminarlo.',
    lockedHint(item) {
      if (item.source.kind === 'streak') return `Gioca il turno giornaliero per ${item.source.days} giorni consecutivi.`;
      if (item.source.kind === 'season') return `Solo nei bauli evento durante la stagione ${S.pass.seasonName(item.source.season)}.`;
      if (item.source.kind === 'legendary') return item.source.shifts === 1 ? 'Supera un Turno leggendario.' : `Supera ${item.source.shifts} turni leggendari.`;
      if (item.source.kind === 'prestige') return `Raggiungi Prestigio ★${item.source.rank}.`;
      if (item.source.kind === 'elite') return `Raggiungi Élite ${item.source.level}.`;
      if (item.source.kind === 'pass') return `Livello ${item.source.tier} del Pass ${S.pass.seasonName(item.source.season)}. Ritorna ogni anno.`;
      if (item.source.kind === 'hall') return 'Costruisci il Tempio della gloria (Record → Élite).';
      if (item.source.kind === 'unlimited') return `Invia ${Fmt.number(item.source.cars)} auto in Senza limiti.`;
      if (item.source.kind === 'tour') return `Una tappa del tour «${S.tours.name(item.source.tour as 'halloween' | 'winter')}». Ritorna ogni anno.`;
      if (item.source.kind === 'auction') return 'Esclusiva della casa d’aste (Social → Club).';
      if (item.source.kind === 'fund') return 'Ringraziamento del vecchio fondo cittadino. Non più assegnato.';
      if (item.source.kind === 'bugReport')
        return item.source.reports === 1
          ? 'Segnala un bug su timing.love con il tuo codice amico. Esclusivo per cacciatori di bug.'
          : `Segnala ${item.source.reports} bug su timing.love con il tuo codice amico, uno al giorno.`;
      if (item.source.kind === 'find') return `Rara scoperta: ${S.shop.findOdds(item.source.chance)} ${S.shop.chest(item.source.chest)}. L’unica distinzione affidata alla sorte.`;
      return 'Non ancora trovato: compare nei bauli.';
    },
    tapToClose: 'Tocca per chiudere',
    tapToBreak: 'Tocca velocemente!',
    tapOdds: (odds) => `Tocca in rapida successione per forzare il baule: ogni tocco entro mezzo secondo conta; alla massima intensità le probabilità sono ${odds}.`,
    watchAdShort: 'Guarda video',
    adReward: 'Video guardato · Baule standard aggiunto',
    noAdsLeft: 'Nessun baule promozionale rimasto per oggi. Torna domani.',
    adPlaceholder: 'Pubblicità',
    adCountdown: (reward, s) => `${{ chest: 'Il tuo baule', upgrade: 'Il tuo livello gratis', boost: 'Il tuo boost' }[reward]} tra ${s} s`,
    watchAd: (left) => `Guarda video · ${left} rimasti`,
    skinsOn: (n, max) => `${n} su ${max} skin auto attive · circolano insieme sulla strada`,
    skinsFull: (max) => `${max} skin attive. Rimuovine prima una.`,
    section: (i) => ['Bauli', 'Collezione', 'Casinò'][i],
    earnedHeading: 'Guadagnato, non comprato',
    newBadge: 'NUOVO',
    shelf: (i) => ['Auto', 'Mappe', 'Guadagnato', 'Pass'][i],
    group: (g, honours = false) => {
      const name = { common: 'Comune', rare: 'Raro', epic: 'Epico', legendary: 'Leggendario', vehicles: 'Veicoli', seasons: 'Stagioni', maps: 'Mappe' }[g];
      return honours && g !== 'vehicles' && g !== 'seasons' && g !== 'maps' ? `Auto · ${name}` : name;
    },
    waiting: (n) => (n === 1 ? '1 in attesa' : `${n} in attesa`),
    buy: (price) => `Acquista · ${price}`,
    pity: (n) => `Epico o superiore garantito entro ${n} bauli. I duplicati pagano in ${MONEY_MARK}.`,
    pityLegendary: (n) => `Un Leggendario garantito entro ${n} bauli.`,
    duplicate: (m) => `Duplicato · +${money(m)}`,
    ownedHint(item) {
      if (item.kind === 'carSkin') return 'Decora le auto sulla strada. Combina fino a otto skin. Solo estetica.';
      if (item.id === 'bigScreen') return 'La tua immagine o video dietro la rotatoria: carica una foto o inserisci un link video. Solo estetica.';
      if (item.kind === 'mapSkin') return 'Trasforma la città in un’ambientazione unica. Solo estetica.';
      return `Compare saltuariamente nella tua coda: ${S.shop.trait(item.id)}.`;
    },
    chest(k) {
      switch (k) {
        case 'standard':
          return 'Baule standard';
        case 'premium':
          return 'Baule premium';
        case 'diamond':
          return 'Baule diamante';
        case 'event':
          return 'Baule evento';
        case 'criminalHunt':
          return 'Baule caccia criminale';
      }
    },
    rarity: (r) => ({ common: 'Comune', rare: 'Raro', epic: 'Epico', legendary: 'Leggendario' })[r],
    trait: (id) =>
      id === 'compact'
        ? 'minuscola, leggera, più lenta nell’inserirsi'
        : id === 'van'
          ? 'lungo, pesante, si inserisce più prontamente'
          : id === 'classic'
            ? 'guida classica, lungo cofano e paraurti cromati'
            : 'più corta, agile, scattante nell’inserimento',
    findOdds: (chance) => `1 su ${Fmt.number(Math.round(1 / chance))} in un`,
    oneIn: (chance) => `1 su ${Fmt.number(Math.round(1 / chance))}`,
    findRow: (id) => `${S.shop.item(id)} · Distinzione`,
    found: 'Trovato',
    findHint: (id) => `${S.shop.item(id)} è la sola distinzione affidata al fato. Sostituisce l’estrazione ordinaria finché non la trovi.`,
    kind(item) {
      const kind = item.kind === 'carSkin' ? 'Skin auto' : item.kind === 'mapSkin' ? 'Skin mappa' : `Tipo veicolo · ${S.shop.trait(item.id)}`;
      return `${kind} · ${S.shop.rarity(item.rarity)}`;
    },
    opened(o) {
      const name = S.shop.item(o.item.id);
      if (o.isDuplicate) return `Duplicato: ${name} · +${money(String(o.money))}`;
      return `${S.shop.rarity(o.item.rarity).toUpperCase()} · ${name}`;
    },
  },

  backdrop: {
    choose: 'Scegli immagine o video',
    intro: 'Imposta la tua immagine o video dietro la rotatoria. Appare nella scheda Gioco con Maxischermo attivo.',
    linkLabel: 'Link',
    linkPlaceholder: 'Link YouTube, immagine o video',
    show: 'Mostra',
    or: 'oppure',
    upload: 'Carica immagine',
    uploadSub: 'Dal tuo dispositivo, solo immagini. Rimane locale.',
    pick: 'Scegli',
    now: (what) => ({ youtube: 'Un video di YouTube', video: 'Un video da link', image: 'Un’immagine da link', upload: 'La tua immagine' })[what],
    nowSub: 'Ora dietro la rotatoria.',
    remove: 'Rimuovi',
    loading: 'Caricamento…',
    notALink: 'URL non valido. Copia l’indirizzo completo con https://',
    cannotLoad: 'Impossibile caricare il link. Usa il link diretto al file (.jpg, .png, .mp4); alcuni siti vietano l’integrazione esterna.',
    notAPicture: 'Si possono caricare solo immagini. Per i video, incolla un link di YouTube.',
    unreadable: 'Immagine illeggibile. Prova con un altro file.',
    notKept: 'File troppo pesante per essere memorizzato: resterà visibile fino alla chiusura del gioco.',
    note: 'Il contenuto viene scaricato direttamente dalla sorgente su questo dispositivo. Nulla transita dai nostri server.',
    lost: 'Maxischermo: impossibile caricare il link. Sfondo predefinito ripristinato.',
  },

  daily: {
    title: 'TURNO GIORNALIERO',
    name: 'Turno giornaliero',
    ready: 'Pronto',
    perfectRun: 'CORSA PERFETTA',
    welcomeBack: (m) => `Bentornato · i tuoi caselli hanno fruttato +${money(m)}`,
    streakEnded: (days) => `La tua serie di ${days} giorni è terminata · ne inizia una nuova con il turno odierno`,
    done: 'Completato',
    readyHint: 'Il tuo primo turno del giorno. Tentativo singolo, identico per tutti.',
    doneHint: (streak) => (streak > 1 ? `Completato · ${streak} giorni consecutivi · torna domani` : 'Completato · torna domani'),
    splashLine: (e) => `La città oggi: ${S.cityEvent(e)} · un tentativo`,
    streakLine: (streak) => (streak > 0 ? `${streak} ${streak === 1 ? 'giorno' : 'giorni'} consecutivi · continua così` : 'Gioca ogni giorno per creare una serie'),
    nextMilestone: (left, item) => `Mancano ${left} ${left === 1 ? 'giorno' : 'giorni'} a ${S.shop.item(item)}`,
    rowLine(streak, open, next, freezes = 0, toFreeze = null) {
      if (streak <= 0) return open ? S.daily.readyHint : 'Torna domani · gioca ogni giorno per una serie';
      const days = `${streak} ${streak === 1 ? 'giorno' : 'giorni'} consecutivi`;
      const ahead = next && (toFreeze === null || next.left <= toFreeze) ? S.daily.nextMilestone(next.left, next.item) : toFreeze !== null ? S.daily.freezeLine(toFreeze) : null;
      const parts = [days, freezes > 0 ? S.daily.freezes(freezes) : null, ahead, open ? null : 'a domani'];
      return parts.filter((p): p is string => p !== null).join(' · ');
    },
    freezeLine: (days) => `Mancano ${days} ${days === 1 ? 'giorno' : 'giorni'} alla protezione serie`,
    freezes: (n) => `${n}× protezione serie`,
    sheet: {
      title: 'Serie giornaliera',
      body: (bonusDays, bonusPay, heatDays) => [
        'Gioca il turno giornaliero ogni giorno per mantenere la serie. Un giorno saltato la interrompe, a meno che una protezione serie lo copra.',
        `Da ${bonusDays} giorni, ogni turno di carriera paga +${Math.round(bonusPay * 100)} % finché la serie è viva.`,
        `Intensità: ogni ${heatDays} giorni di serie apre un livello di intensità, traffico più tosto per più compenso e XP Élite. Se perdi la serie, l’intensità sparisce con lei. I titoli di intensità guadagnati restano.`,
      ],
      heatOpen: 'Intensità aperta',
      heatValue: (open, max) => `${open} su ${max}`,
      nextHeat: 'Prossima intensità tra',
      allHeat: 'Tutto aperto',
    },
    freezeUsed: (n) => `SERIE PROTETTA · ${n === 1 ? 'un giorno mancato è stato' : `${n} giorni mancati sono stati`} coperti`,
    streakReward: (days, got) => `${days} GIORNI CONSECUTIVI · ${got.join(' · ')}`,
    gotItem: (item) => `${S.shop.item(item)} sbloccato`,
    gotFreeze: 'una protezione serie',
    gotCard: 'un gratta e vinci gratis',
    giftIn: (hours) => (hours >= 1 ? `Baule gratis domani · tra ${Math.ceil(hours)} h` : `Baule gratis domani · tra ${Math.max(1, Math.ceil(hours * 60))} min`),
    perfectRunFirst: (pay) => `CORSA PERFETTA · nessun incidente · +${pay} % di guadagni`,
    streakPill(streak, bonus, endsIn, freezes = 0) {
      if (streak <= 0) return S.daily.streakLine(0);
      const days = `${streak} ${streak === 1 ? 'giorno' : 'giorni'} consecutivi`;
      if (endsIn !== null) return `${days} · scade tra ${endsIn < 1 ? 'meno di un’ora' : `${Math.floor(endsIn)} h`}`;
      const freeze = freezes > 0 ? ` · ${S.daily.freezes(freezes)}` : '';
      return bonus !== null ? `${days} · +${Math.round(bonus * 100)} % compenso${freeze || ' a ogni turno'}` : `${days}${freeze || ' · avanti così'}`;
    },
    challenge(c) {
      switch (c) {
        case 'perfectInputs':
          return '3 Inserimenti perfetti in un turno';
        case 'tightFits':
          return '3 Spazi stretti in un turno';
        case 'twoTakedowns':
          return '2 Arresti in un turno';
        case 'twoTransporters':
          return '2 Furgoni blindati riscossi in un turno';
        case 'longChain':
          return 'Una catena perfetta da 8';
        case 'bigCombo':
          return 'Una combo da 15';
        case 'perfectRun':
          return 'Una corsa perfetta: nessun incidente';
        case 'oneTakedown':
          return 'Cattura un criminale';
        case 'cleanMerges':
          return '8 Inserimenti puliti in un turno';
        case 'sixTightFits':
          return '6 Spazi stretti in un turno';
        case 'fivePerfects':
          return '5 Inserimenti perfetti in un turno';
        case 'chainFive':
          return 'Una catena perfetta da 5';
        case 'hugeCombo':
          return 'Una combo da 25';
        case 'twoNearMisses':
          return '2 Quasi-schianti in un turno';
      }
    },
    challengeDone: (c, reward) => `INCARICO · ${S.daily.challenge(c)} · +${money(reward)}`,
  },

  albums: {
    name: (a) => ({ maps: 'Mappe', commons: 'Comuni', rares: 'Rari', epics: 'Epici', legends: 'Leggende', seasons: 'Stagioni', loyalty: 'Fedeltà', honours: 'Distinzioni', pass: 'Pass stagionale', tours: 'Tour' })[a],
    complete: (a, reward) => `ALBUM COMPLETATO · ${S.albums.name(a)} · +${money(reward)} · nuova cornice`,
    progress: (entries) => 'Album · ' + entries.map((e) => `${S.albums.name(e.album)} ${e.owned}/${e.total}`).join(' · '),
  },

  race: {
    newBest: 'NUOVO RECORD',
  },

  feats: {
    goal(g) {
      switch (g.k) {
        case 'prestige':
          return `Raggiungi Prestigio ★${g.rank}`;
        case 'elite':
          return `Raggiungi Élite ${g.level}`;
        case 'legendary':
          return `Completa ${g.shifts} turni leggendari`;
      }
    },
    done: 'Completato',
    withTitle: (title) => `+ Titolo «${title}»`,
    eyebrow: 'Impresa',
    body: 'Una delle prodezze più ardue del gioco. Nessun baule, casinò o denaro può concedertela: solo la strada.',
    rowGoal: 'Obiettivo',
    rowNow: 'Tu',
    rowTitle: 'Titolo',
    reward: 'Ricompensa',
    earned: 'Conquistato · nella tua collezione',
  },

  mastery: {
    detail(goal, tier) {
      const t = MASTERY_THRESHOLDS[goal];
      if (tier >= t.length) return 'Tutti i gradi raggiunti';
      const n = t[tier];
      switch (goal) {
        case 'perfectTiming':
          return `${n} Inserimenti perfetti`;
        case 'tightSpots':
          return `${n} Spazi stretti`;
        case 'closeCalls':
          return `${n} Quasi-schianti`;
        case 'longChain':
          return `Una catena perfetta da ${n}`;
        case 'crimeFighter':
          return `${n} Arresti`;
        case 'secureRoute':
          return `${n} Furgoni riscossi`;
        case 'comboMaster':
          return `Una combo da ${n}`;
        case 'veteran':
          return `${n} Turni completati`;
        case 'lifesaver':
          return `${n} Veicoli prioritari agevolati`;
        case 'closeShaves':
          return `${n} Moto sfiorate al limite`;
      }
    },
    name: (g) =>
      ({
        perfectTiming: 'Tempismo perfetto',
        tightSpots: 'Punti stretti',
        closeCalls: 'Al millimetro',
        longChain: 'Lunga catena',
        crimeFighter: 'Giustiziere',
        secureRoute: 'Rotte protette',
        comboMaster: 'Re delle combo',
        veteran: 'Veterano',
        lifesaver: 'Soccorritore',
        closeShaves: 'A filo di rasoio',
      })[g],
    toast(done) {
      const names = done.map((c) => `${S.mastery.name(c.goal)} ${masteryNumeral(c.tier)}`);
      return `MAESTRIA COMPLETATA · ${names.join(', ')}`;
    },
  },

  night: 'Notte',
  blackout: 'Blackout',
  weather: (w) =>
    ({ clear: 'Sereno', lightRain: 'Pioggerella', heavyRain: 'Pioggia torrenziale', storm: 'Tempesta', extreme: 'Meteo estremo', fog: 'Nebbia', snow: 'Neve e ghiaccio', hail: 'Grandine', sandstorm: 'Tempesta di sabbia' })[w],
  cityEvent: (e) =>
    ({
      roadworks: 'Lavori in corso',
      roadClosure: 'Chiusura stradale',
      concert: 'Traffico da concerto',
      vipConvoy: 'Convoglio VIP',
      policeOperation: 'Operazione di polizia',
      schoolRun: 'Uscita da scuola',
      marathon: 'Maratona',
    })[e],

  upgrades: {
    group: (g) => ['POLIZIA', 'DENARO', 'GUIDA'][g],
    maxed: 'Max',
    pickOne: 'Tocca un potenziamento per esaminarne gli effetti.',
    buyHint: 'Tocca due volte per acquistare.',
    everyStepBought: 'Tutti i livelli acquistati.',
    missing: (m) => `Mancano ${m}`,
    name: (u) =>
      ({
        morePatrols: 'Più pattuglie',
        longerPursuit: 'Inseguimento prolungato',
        quietStreets: 'Strade quiete',
        interceptor: 'Intercettatore',
        dispatchRadio: 'Centrale radio',
        backup: 'Rinforzi',
        cashRoute: 'Rotte portavalori',
        overtime: 'Straordinari',
        freight: 'Merci pesanti',
        quickRecovery: 'Ripresa rapida',
        doubleRun: 'Doppio viaggio',
        insurance: 'Assicurazione',
        robberyInsurance: 'Copertura rapine',
        shield: 'Scudo',
        tightFitTip: 'Mancia per rasoiata',
        dashcam: 'Dashcam',
        chainSaver: 'Salva-catena',
        winterTyres: 'Gomme invernali',
        fogLamps: 'Fendinebbia',
      })[u],
    explanation: (u) =>
      ({
        morePatrols: 'Più auto di pattuglia attendono nella tua fila, pronte a intervenire quando un criminale entra in scena.',
        longerPursuit: 'I criminali impiegano più tempo a fuggire, concedendoti un margine più ampio per intercettarli.',
        quietStreets: 'Alcuni turni scorrono senza la presenza di alcun criminale.',
        interceptor: 'Una pattuglia collocata subito dietro a un fuggitivo lo raggiunge a velocità raddoppiata.',
        dispatchRadio: 'Ogni turno consente 3 chiamate d’emergenza per spostare una pattuglia in testa; ogni livello ne aggiunge una e riduce la penalità combo.',
        backup: 'Il tuo turno tollera un incidente con auto della polizia in più senza subire la sconfitta.',
        cashRoute: 'I furgoni blindati compaiono con maggiore frequenza e rapidità.',
        overtime: 'Ogni turno completato rende una percentuale di denaro maggiore.',
        freight: 'Più camion in strada: traffico denso, ma ogni turno paga di più e ogni pedaggio vale di più.',
        quickRecovery: 'Gli automobilisti ripartono con più vigore dopo un urto. Il flusso si normalizza prima.',
        doubleRun: 'Talvolta un secondo furgone blindato si accoda subito al primo.',
        insurance: 'Rimborsa una frazione delle perdite economiche dovute a un incidente.',
        robberyInsurance: 'Rimborsa una frazione delle perdite causate dalla fuga di un criminale.',
        shield: 'La tua auto può subire un incidente in più per turno senza interrompere la manche. Escluso da Senza limiti.',
        tightFitTip: 'Ogni inserimento stretto assegna una mancia istantanea sul compenso del turno. Escluso da Senza limiti.',
        dashcam: 'La telecamera premia le manovre al millimetro: ogni quasi-schianto garantisce una mancia immediata. Escluso da Senza limiti.',
        chainSaver: 'Se mantieni il ritmo, un inserimento ordinario per turno non spezzerà la catena. Escluso da Senza limiti.',
        winterTyres: 'Pioggia, neve e grandine degradano meno aderenza e frenata.',
        fogLamps: 'I conducenti scorgono gli ostacoli prima e la nebbia risulta meno opprimente a schermo.',
      })[u],
    total(u, steps, c) {
      const t = steps;
      switch (u) {
        case 'morePatrols':
          return `+${percent(t * c.patrolsPerStep)} pattuglie`;
        case 'longerPursuit':
          return `+${t * c.pursuitPerStep} s inseguimento`;
        case 'quietStreets':
          return `${percent(t * c.quietStreetsPerStep)} turni senza criminali`;
        case 'interceptor':
          return `+${percent(t * c.interceptorPerStep)} velocità di caccia`;
        case 'dispatchRadio':
          return `+${t * c.dispatchLimitPerStep} chiamate · +${percent(t * c.dispatchRadioPerStep)} combo salvaguardata`;
        case 'backup':
          return `+${steps * c.backupPerStep} incidenti di polizia`;
        case 'cashRoute':
          return `${+(t * c.cashRoutePerStep).toFixed(1)} s prima`;
        case 'overtime':
          return `+${percent(t * c.overtimePerStep)} guadagno`;
        case 'freight':
          return `+${percent(t * c.freightPerStep)} camion · +${percent(t * c.freightPayPerStep)} guadagno`;
        case 'quickRecovery':
          return `+${percent(t * c.recoveryPerStep)} accelerazione · +${percent(t * c.recoveryPayPerStep)} guadagno`;
        case 'doubleRun':
          return `${percent(t * c.doubleRunPerStep)} doppi tragitti`;
        case 'insurance':
        case 'robberyInsurance':
          return t * c.insurancePerStep >= 1 ? 'COPERTURA TOTALE' : `${percent(t * c.insurancePerStep)} coperto`;
        case 'shield':
          return t === 1 ? '1 schianto perdonato' : `${t} schianti perdonati`;
        case 'tightFitTip':
          return `${percent(t * c.tightFitTipPerStep)} del compenso per spazio stretto`;
        case 'dashcam':
          return `${percent(t * c.nearMissTipPerStep)} del compenso per quasi-schianto`;
        case 'chainSaver':
          return t === 1 ? '1 catena salvata per turno' : `${t} catene salvate per turno`;
        case 'winterTyres':
          return `${percent(t * c.winterTyresPerStep)} dell’aderenza preservata`;
        case 'fogLamps':
          return `${percent(t * c.fogLampsPerStep)} di tempo di reazione preservato`;
      }
    },
    stepEffect(u, steps, max, c) {
      const now = S.upgrades.total(u, steps, c);
      if (steps >= max) return `Attuale: ${now}`;
      return `Attuale: ${now} · livello successivo ${S.upgrades.total(u, steps + 1, c)}`;
    },
  },

  heat: {
    row: (heat) => (heat > 0 ? `Intensità ${heat}` : 'Intensità'),
    button: (heat, max) => (heat === 0 ? 'Intensità disattiva' : max > 1 ? `Intensità ${heat}` : 'Intensità attiva'),
    line: (heat, max) =>
      heat > 0
        ? `Traffico più tosto · +${Math.round(heat * baseConfig.heatPay * 100)} % compenso · +${heat * baseConfig.eliteXpHeat} XP Élite per turno`
        : max > 0
          ? 'Disattivo · traffico intensificato per maggiori ricompense ed XP Élite'
          : `Mantieni una serie giornaliera di ${baseConfig.heatStreakDays} giorni per aprire l’intensità`,
    link: (heat, max) => `${max > 1 ? `${heat}/${max}` : heat > 0 ? 'Attivo' : 'Disattivo'} · modifica ›`,
    cleared: (heat) => `INTENSITÀ ${heat} COMPLETATA`,
    pill: (heat, tailwind) =>
      [tailwind ? `VENTO A FAVORE +${Math.round(tailwind * 100)} %` : null, heat > 0 ? `INTENSITÀ ${heat} · +${Math.round(heat * baseConfig.heatPay * 100)} % compenso` : null].filter(Boolean).join(' · ') || null,
    rule: (level) => `Supera un turno a Intensità ${level}`,
  },

  goals: {
    tierMiss: (m) => `Mancano ${m.short} ${m.short === 1 ? 'auto' : 'auto'} a ${S.modes.tier(m.tier)}`,
    next(g) {
      if (g.k === 'challenge') return `Oggi · ${S.daily.challenge(g.challenge)} · +${money(String(g.reward))}`;
      return `${S.mastery.name(g.goal)} · ${g.have}/${g.need}`;
    },
    money: (short, upgrade) => `Mancano ${money(short)} a ${S.upgrades.name(upgrade)}`,
    nearMiss(n) {
      switch (n.k) {
        case 'cars':
          return n.left === 1 ? `Solo 1 auto per il livello ${n.level + 1}` : `Mancano ${n.left} auto per il livello ${n.level + 1}`;
        case 'best':
          return `A ${Fmt.number(n.short)} punti dal tuo record`;
        case 'combo':
          return `A ${n.short === 1 ? 'un inserimento' : `${n.short} inserimenti`} da ×${+n.multiplier.toFixed(2)}`;
      }
    },
  },

  photo: {
    button: 'Foto',
    buttonLabel: 'Cattura un’immagine di questo traguardo',
    dialog: 'Immagine del tuo turno',
    share: 'Condividi',
    copy: 'Copia',
    sendChallenge: 'Invia come sfida',
    copyChallenge: 'Copia con link',
    challengeCopied: 'Immagine e link copiati',
    download: 'Scarica',
    saved: 'Salvato',
    close: 'Chiudi',
    score: 'PUNTI',
    flames: 'FIAMME',
    cars: 'AUTO',
    newBest: 'NUOVO RECORD',
    hook: (score) => `Riesci a superare ${score}?`,
    hookFlames: (flames) => `Riesci a superare ${flames} fiamme?`,
    hookChill: 'Fai un giro rilassante.',
    combo: (n) => `Combo ×${n}`,
    tightFits: (n) => (n === 1 ? '1 spazio stretto' : `${n} spazi stretti`),
    busted: (n) => `${n} arrestati`,
    wrecks: (n) => (n === 1 ? '1 rottame' : `${n} rottami`),
    chain: (n) => `Catena da ${n}`,
    city: 'La città',
  },

  result: {
    why: {
      crash: 'Ti sei schiantato. Aspetta un varco.',
      crashes: 'Troppi schianti. Aspetta un varco.',
      police: 'Troppe pattuglie distrutte.',
      behind: 'C’era un’auto attaccata dietro di te.',
      ahead: 'Hai urtato l’auto davanti a te.',
      escaped: 'Il criminale è fuggito.',
      boss: 'Il boss è sfuggito.',
      zeroTolerance: 'Tolleranza zero: un solo contatto chiude la manche.',
      rule: 'Una regola del turno è stata violata.',
    },
    detonated: 'BOOM',
    escaped: 'FUGGITO',
    levelComplete: (l) => `LIVELLO ${l} COMPLETATO`,
    newBest: 'NUOVO RECORD',
    fullCoverage: 'COPERTURA TOTALE',
    loss: (amount, escaped) => (escaped ? 'PERDITA ' : 'COSTO INCIDENTE ') + '−' + money(amount),
    covered: (amount) => `COPERTURA TOTALE · ${money(amount)} saldati dall’assicurazione`,
    nextLevel: (l) => `Tocca per il livello ${l}`,
    retryLevel: (l) => `Tocca per riprovare il livello ${l}`,
    stats(combo, tightFits, busted, transporters, time) {
      return [
        time,
        combo > 1 ? `miglior combo ${Fmt.number(combo)}` : null,
        tightFits > 0 ? `${Fmt.number(tightFits)} ${tightFits === 1 ? 'Spazio stretto' : 'Spazi stretti'}` : null,
        busted > 0 ? `${busted} arrestati` : null,
        transporters > 0 ? `${transporters} blindati riscossi` : null,
      ]
        .filter((x): x is string => x !== null)
        .join(' · ');
    },
  },

  hud: {
    moneyLabel: 'DENARO',
    rushHour: 'ORA DI PUNTA',
    tight: 'STRETTO!',
    cutOff: 'TAGLIATO',
    dispatch: 'CHIAMATA',
    danger: 'PERICOLO',
    boom: 'BOOM!',
    covered: 'COPERTO',
    combo: (n) => `COMBO ${n}`,
    cars: (n) => (n === 1 ? '1 auto' : `${n} auto`),
    wanted: (seconds) => `RICERCATO ${Math.ceil(Math.max(0, seconds))}`,
    rushFactor: (value) => `ORA DI PUNTA ${multiplier(value)}`,
    critical: (points) => `CRITICO ${points}`,
    shave: (points) => `SFIORATO ${points}`,
    chainHeld: 'CATENA CONSERVATA',
    label(t) {
      switch (t) {
        case 'police':
          return 'POLIZIA';
        case 'pickup':
          return 'CRIMINALE';
        case 'transporter':
          return 'BLINDATO';
        case 'tanker':
          return 'GAS';
        case 'military':
          return 'BOMBA';
        case 'ambulance':
          return 'AMBULANZA';
        case 'fireTruck':
          return 'POMPIERI';
        case 'learner':
          return 'SCUOLA GUIDA';
        case 'bus':
          return 'BUS';
        case 'motorbike':
          return 'MOTO';
        case 'oversize':
          return 'CARICO';
        case 'racer':
          return 'PILOTA';
        case 'wedding':
          return 'NOZZE';
        default:
          return null;
      }
    },
  },

  detail: {
    now: 'Attuale',
    nextStep: 'Prossimo livello',
    step: (s, max) => `Livello ${s} di ${max}`,
    buy: (price) => `Acquista · ${price}`,
    build: (price) => `Costruisci · ${price}`,
    remove: 'Rimuovi',
    close: 'Chiudi',
  },

  notice: {
    more: (n) => `+${n} altri · vedi Progressi`,
    notEnoughMoney: (price) => `Fondi insufficienti in ${MONEY_MARK} · servono ${money(price)}`,
    detourIdle: 'Installato, ma inerte qui: nessuna uscita presente tra il segnale e la tua corsia',
  },
});
