import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { Fmt, money, percent, multiplier } from '../../format';
import { MONEY_MARK } from '../../icons';
import { baseConfig } from '../../../core/config';
import { MASTERY_THRESHOLDS, masteryNumeral } from '../../../core/career';

/** Deutsch, Teil 6: Mafia, Shop, Big Screen, Tagesschicht, Alben, Meisterschaft, Wetter. */
export default (S: Strings): Words<Strings> => ({
  mafia: {
    title: 'Die Familie',
    speeds: ['Langsam', 'Zügig', 'Hektisch'],
    pointer: (speed) => `Zeiger · ${speed}`,
    takeCash: 'Geld nehmen',
    tagline: 'Sie respektieren einen Fahrer, der ihren Boss hinter Gitter gebracht hat. Sie leihen, und sie holen sich alles zurück.',
    badge: 'Mafia',
    don: 'Der Don',
    pitch: 'Wähle einen Kredit, setz dich an den Tisch und stoppe den Zeiger in der grünen Zone. Je näher an der Mitte, desto freundlicher der Deal. Je größer der Kredit, desto schneller der Zeiger.',
    rules: (rate, cap, garnish) =>
      `Zahle bis zu dem Tag auf dem Brief zurück. Zu spät wächst die Schuld um ${Math.round(rate * 100)} % pro Tag (bis zu +${Math.round(cap * 100)} %), ${Math.round(garnish * 100)} % der Bezahlung jeder Schicht gehen an die Familie, kein Transporter, Verbrecher oder Boss zahlt aus, das Casino ist zu und dein Name trägt in den Listen das Mafia-Abzeichen. Zahle alles ab, und das alles ist weg. Jeder rechtzeitig zurückgezahlte Kredit macht den nächsten günstiger und die grüne Zone breiter.`,
    grade: (g) => ({ perfect: 'PERFEKT', good: 'GUT', miss: 'VERPASST' })[g],
    gradeText: (g) => ({ perfect: 'Genau auf den Punkt. Der Don lächelt.', good: 'Ein fairer Handschlag.', miss: 'Der Don zuckt mit den Schultern. Das einfache Angebot steht.' })[g],
    set: 'Hinsetzen',
    stop: 'STOPP',
    tapToStop: 'Tippe, um den Zeiger anzuhalten',
    setting: 'Der Don wartet…',
    loanLabel: 'Kredit',
    perDay: (days) => `${days} ${days === 1 ? 'Tag' : 'Tage'}`,
    offer: (interest, days) => `${Math.round(interest * 100)} % Zinsen · ${days} ${days === 1 ? 'Tag' : 'Tage'}`,
    zone: (width, clean) => `Grüne Zone ${Math.round(width * 100)} % des Balkens${clean > 0 ? ` · ${clean} ${clean === 1 ? 'Kredit' : 'Kredite'} rechtzeitig zurückgezahlt` : ''}`,
    ledger: 'Kassenbuch',
    lent: 'Geliehen',
    owed: 'Du schuldest',
    due: 'Fällig',
    late: 'ZU SPÄT',
    paid: 'Bisher gezahlt',
    countdown: (ms) => {
      const mins = Math.max(0, Math.floor(ms / 60_000));
      const days = Math.floor(mins / 1440);
      const hours = Math.floor((mins % 1440) / 60);
      if (days > 0) return `noch ${days} T ${hours} Std.`;
      return hours > 0 ? `noch ${hours} Std. ${mins % 60} Min.` : `noch ${mins} Min.`;
    },
    lateFor: (ms) => {
      const days = Math.floor(ms / 86_400_000);
      return days > 0 ? `${days} ${days === 1 ? 'Tag' : 'Tage'} zu spät` : 'Gerade zu spät geworden';
    },
    repayShare: (share) => (share >= 1 ? 'Ganz zahlen' : `${Math.round(share * 100)} % zahlen`),
    noMoney: 'Nicht genug Geld, um das zu zahlen.',
    waiting: 'Der Don beobachtet',
    atStake: 'Wenn du zu spät bist',
    inForce: 'In Kraft, bis du zahlst',
    consequences: (garnish) => ['Casino geschlossen', 'Keine Transporter, Verbrecher oder Bosse', `${Math.round(garnish * 100)} % der Bezahlung jeder Schicht`, 'Mafia-Abzeichen in den Listen'],
    overdue: 'ÜBERFÄLLIG',
    overdueText: 'Die Familie kassiert. Jede Schicht zahlt zuerst sie.',
    paidStamp: 'BEZAHLT',
    assist: 'Ruhige Hand',
    assistText: 'Langsamerer Zeiger, aber kein Perfekt-Deal',
    banned: (date) => `Die Familie nimmt deine Anrufe nicht an. Sie reden wieder am ${date} mit dir.`,
    nextStep: (interest, nextInterest, zone, nextZone) =>
      `Zahle den nächsten Kredit rechtzeitig zurück: Zinsen ${Math.round(interest * 100)} % → ${Math.round(nextInterest * 100)} %, grüne Zone ${Math.round(zone * 100)} % → ${Math.round(nextZone * 100)} %`,
    shiftsToClear: (n) => `Etwa ${n} ${n === 1 ? 'Schicht' : 'Schichten'} Bezahlung, um es zu tilgen`,
    onlyOne: 'Immer nur ein Kredit. Begleiche zuerst diesen.',
    letters: 'Briefe',
    letter: (kind, owed, date) =>
      ({
        taken: `War mir ein Vergnügen. ${owed} bis zum ${date}, keinen Tag später. Zwing mich nicht, dich zu suchen.`,
        half: 'Die Hälfte deiner Zeit ist um. Die Familie vergisst keine Schuld, und keinen Freund, der früh gezahlt hat.',
        day: 'Noch ein Tag. Sei ein Freund und begleiche die Rechnung, bevor es persönlich wird.',
        late: 'Die Zeit ist um. Dein Name steht auf der Liste. Die Straße zahlt jetzt zuerst uns, und das Casino ist für dich geschlossen.',
        later: 'Jeden Tag wächst die Zahl. Zahle, und wir sind wieder Freunde.',
      })[kind],
    notices: {
      late: 'DIE FAMILIE WARTET · dein Kredit ist überfällig · das Casino ist zu',
      grace: 'DIE FAMILIE GIBT DIR NOCH EINEN TAG · der Kredit wurde fällig, während du weg warst',
      writtenOff: 'DIE FAMILIE SCHREIBT DICH AB · die Schuld ist weg, ihre Türen bleiben 14 Tage zu',
    },
    garnished: (cut, cleared) => (cleared ? `DIE FAMILIE NAHM ${money(cut)} · Schuld bezahlt, du bist frei` : `DIE FAMILIE NAHM ${money(cut)} der Bezahlung`),
    casinoShut: 'Das Casino ist zu, während die Familie auf ihr Geld wartet.',
  },

  shop: {
    open: 'Öffnen',
    wear: 'Tragen',
    takeOff: 'Ablegen',
    worn: 'An',
    inTraffic: 'Im Verkehr',
    vehicleAuto: 'Nichts zum Tragen: Ein Fahrzeug mischt sich schon jetzt von selbst in den Verkehr.',
    lockedTitle: (kind) => (kind === 'mapSkin' ? 'Geheimnisvolle Karte' : kind === 'vehicleType' ? 'Geheimnisvolles Fahrzeug' : 'Geheimnisvoller Skin'),
    source(k) {
      switch (k) {
        case 'standard':
          return 'Im Verkauf · oder Werbung ansehen';
        case 'premium':
          return 'Im Verkauf · oder durch schwere Meisterschaften';
        case 'diamond':
          return 'Im Verkauf · nie ein Common';
        case 'event':
          return 'Stadtereignisse · Tagesschicht';
        case 'criminalHunt':
          return 'Verdient durch das Fassen von Verbrechern';
      }
    },
    seasonHint: 'Enthält zur Hälfte den Gegenstand dieser Saison, bis du ihn hast.',
    pickItem: 'Tippe einen Gegenstand an, um ihn zu sehen.',
    lockedHint(item) {
      if (item.source.kind === 'streak') return `Spiele die Tagesschicht ${item.source.days} Tage in Folge.`;
      if (item.source.kind === 'season') return `Nur in Event-Truhen im ${S.pass.seasonName(item.source.season)}.`;
      if (item.source.kind === 'legendary') return item.source.shifts === 1 ? 'Schließe eine Legendäre Schicht ab.' : `Schließe ${item.source.shifts} Legendäre Schichten ab.`;
      if (item.source.kind === 'prestige') return `Erreiche Prestige ★${item.source.rank}.`;
      if (item.source.kind === 'elite') return `Erreiche Elite ${item.source.level}.`;
      if (item.source.kind === 'pass') return `Stufe ${item.source.tier} des Saisonpasses ${S.pass.seasonName(item.source.season)}. Er kehrt jedes Jahr wieder.`;
      if (item.source.kind === 'hall') return 'Baue die Ruhmeshalle (Rekorde → Elite).';
      if (item.source.kind === 'unlimited') return `Schicke ${Fmt.number(item.source.cars)} Autos in einem Unlimited-Lauf los.`;
      if (item.source.kind === 'tour') return `Ein Stopp der Tour „${S.tours.name(item.source.tour as 'halloween' | 'winter')}“. Sie kehrt jedes Jahr wieder.`;
      if (item.source.kind === 'auction') return 'Nur als Los im Auktionshaus (Social → Club). Alle paar Tage ein neues Los.';
      if (item.source.kind === 'casino') return `${S.casino.feat(item.source.feat)}: Nur das Casino vergibt ihn (Shop → Casino). Nur Aussehen.`;
      if (item.source.kind === 'fund') return 'Ein Dankeschön vom Stadtfonds, den der Spielfonds ersetzt hat. Er wird nicht mehr vergeben.';
      if (item.source.kind === 'bugReport')
        return item.source.reports === 1
          ? 'Melde einen Fehler auf timing.love mit deinem Freundescode. Nur Bug-Hunter bekommen ihn.'
          : `Melde ${item.source.reports} Fehler auf timing.love mit deinem Freundescode, einen pro Tag. Nur Bug-Hunter bekommen ihn.`;
      if (item.source.kind === 'find') return `Ein seltener Fund: ${S.shop.findOdds(item.source.chance)} ${S.shop.chest(item.source.chest)}. Die einzige Auszeichnung, die Glück ist.`;
      return 'Noch nicht gefunden: Er kommt aus Truhen.';
    },
    tapToClose: 'Zum Schließen tippen',
    tapToBreak: 'Schnell tippen!',
    tapOdds: (odds) => `Tippe schnell, um die Truhe aufzubrechen: Jeder Tipp innerhalb einer halben Sekunde nach dem letzten zählt, und bei voller Kraft sind die Chancen ${odds}. Langsamere Tipps liegen dazwischen.`,
    watchAdShort: 'Werbung ansehen',
    adReward: 'Werbung angesehen · Standard-Truhe hinzugefügt',
    noAdsLeft: 'Heute keine Werbetruhen mehr. Morgen wieder.',
    adPlaceholder: 'Werbung',
    adCountdown: (reward, s) => `${{ chest: 'Deine Truhe', upgrade: 'Dein Gratis-Schritt', boost: 'Dein Boost' }[reward]} in ${s} s`,
    watchAd: (left) => `Werbung ansehen · ${left} übrig`,
    skinsOn: (n, max) => `${n} von ${max} Auto-Skins an · sie mischen sich auf der Straße`,
    skinsFull: (max) => `${max} Auto-Skins sind an. Nimm zuerst einen ab.`,
    section: (i) => ['Truhen', 'Sammlung', 'Casino'][i],
    earnedHeading: 'Verdient, nicht verkauft',
    newBadge: 'NEU',
    shelf: (i) => ['Autos', 'Karten', 'Verdient', 'Pass'][i],
    group: (g, honours = false) => {
      const name = { common: 'Gewöhnlich', rare: 'Selten', epic: 'Episch', legendary: 'Legendär', vehicles: 'Fahrzeuge', seasons: 'Jahreszeiten', maps: 'Karten' }[g];
      return honours && g !== 'vehicles' && g !== 'seasons' && g !== 'maps' ? `Autos · ${name}` : name;
    },
    waiting: (n) => (n === 1 ? '1 wartet' : `${n} warten`),
    buy: (price) => `Kaufen · ${price}`,
    pity: (n) => `Episch oder besser innerhalb von ${n} Truhen. Duplikate zahlen ${MONEY_MARK} aus.`,
    pityLegendary: (n) => `Ein Legendärer innerhalb von ${n} Truhen.`,
    duplicate: (m) => `Duplikat · +${money(m)}`,
    ownedHint(item) {
      if (item.kind === 'carSkin') return 'Lackiert die Autos auf der Straße. Mische bis zu acht. Nur Optik, nie ein Vorteil.';
      if (item.id === 'bigScreen') return 'Dein eigenes Bild oder Video hinter dem Kreisverkehr: Lade ein Bild hoch oder füge einen Link zu einem YouTube-Video, einem Bild oder einer Videodatei ein. Nur Optik, nie ein Vorteil.';
      if (item.kind === 'mapSkin') return 'Macht die Stadt zu einem eigenen Ort. Nur Optik, nie ein Vorteil.';
      return `Taucht ab und zu in deiner Warteschlange auf: ${S.shop.trait(item.id)}.`;
    },
    chest(k) {
      switch (k) {
        case 'standard':
          return 'Standard-Truhe';
        case 'premium':
          return 'Premium-Truhe';
        case 'diamond':
          return 'Diamant-Truhe';
        case 'event':
          return 'Event-Truhe';
        case 'criminalHunt':
          return 'Verbrecherjagd-Truhe';
      }
    },
    rarity: (r) => ({ common: 'Gewöhnlich', rare: 'Selten', epic: 'Episch', legendary: 'Legendär' })[r],
    trait: (id) =>
      id === 'compact'
        ? 'winzig, leicht, langsamer beim Einfädeln'
        : id === 'van'
          ? 'lang, schwer, fädelt schneller ein'
          : id === 'classic'
            ? 'fährt wie ein Auto, lange Motorhaube, Chromstoßstangen'
            : 'kürzer, leichter, fädelt schneller ein',
    findOdds: (chance) => `1 zu ${Fmt.number(Math.round(1 / chance))} aus einer`,
    oneIn: (chance) => `1 zu ${Fmt.number(Math.round(1 / chance))}`,
    findRow: (id) => `${S.shop.item(id)} · Auszeichnung`,
    found: 'Gefunden',
    findHint: (id) => `${S.shop.item(id)} ist die eine Auszeichnung, die Glück ist. Sie ersetzt, was du sonst gezogen hättest, bis du sie hast.`,
    kind(item) {
      const kind = item.kind === 'carSkin' ? 'Auto-Skin' : item.kind === 'mapSkin' ? 'Karten-Skin' : `Fahrzeugtyp · ${S.shop.trait(item.id)}`;
      return `${kind} · ${S.shop.rarity(item.rarity)}`;
    },
    opened(o) {
      const name = S.shop.item(o.item.id);
      if (o.isDuplicate) return `Duplikat: ${name} · +${money(String(o.money))}`;
      return `${S.shop.rarity(o.item.rarity).toUpperCase()} · ${name}`;
    },
  },

  backdrop: {
    choose: 'Bild oder Video wählen',
    intro: 'Setze dein eigenes Bild oder Video hinter den Kreisverkehr. Es läuft im Spiel-Tab, solange Big Screen an ist.',
    linkLabel: 'Link',
    linkPlaceholder: 'YouTube-, Bild- oder Videolink',
    show: 'Zeigen',
    or: 'oder',
    upload: 'Bild hochladen',
    uploadSub: 'Von deinem Gerät, nur Bilder. Es bleibt auf diesem Gerät.',
    pick: 'Wählen',
    now: (what) => ({ youtube: 'Ein YouTube-Video', video: 'Ein Video von einem Link', image: 'Ein Bild von einem Link', upload: 'Dein eigenes Bild' })[what],
    nowSub: 'Jetzt hinter dem Kreisverkehr.',
    remove: 'Entfernen',
    loading: 'Wird geladen…',
    notALink: 'Das ist kein Weblink. Kopiere die ganze Adresse, beginnend mit https://',
    cannotLoad: 'Dieser Link wurde nicht geladen. Nimm die Adresse des Bildes oder Videos selbst (sie endet oft auf .jpg, .png oder .mp4); manche Seiten lassen ihre Bilder nicht woanders anzeigen.',
    notAPicture: 'Es können nur Bilder hochgeladen werden. Für ein Video füge einen YouTube-Link ein.',
    unreadable: 'Dieses Bild konnte nicht gelesen werden. Versuche ein anderes.',
    notKept: 'Zu groß, um auf diesem Gerät zu bleiben: Es wird angezeigt, bis du das Spiel schließt.',
    note: 'Ein Link wird direkt von seiner eigenen Seite geladen (YouTube oder wo das Bild liegt), nur auf diesem Gerät. Uns wird nichts gesendet.',
    lost: 'Big Screen: Dein Link wurde nicht geladen. Die Stadt ist vorerst zurück.',
  },

  daily: {
    title: 'TAGESSCHICHT',
    name: 'Tagesschicht',
    ready: 'Bereit',
    perfectRun: 'PERFEKTER LAUF',
    welcomeBack: (m) => `Willkommen zurück · deine Mautstellen haben +${money(m)} eingebracht`,
    streakEnded: (days) => `Deine ${days}-Tage-Serie ist zu Ende · eine neue beginnt mit der heutigen Tagesschicht`,
    done: 'Erledigt',
    readyHint: 'Deine erste Schicht des Tages. Ein Versuch, für alle dieselbe Schicht.',
    doneHint: (streak) => (streak > 1 ? `Erledigt · ${streak} Tage in Folge · morgen wieder` : 'Erledigt · morgen wieder'),
    splashLine: (e) => `Die Stadt heute: ${S.cityEvent(e)} · ein Versuch`,
    streakLine: (streak) => (streak > 0 ? `${streak} ${streak === 1 ? 'Tag' : 'Tage'} in Folge · weiter so` : 'Spiele sie jeden Tag für eine Serie'),
    nextMilestone: (left, item) => `Noch ${left} ${left === 1 ? 'Tag' : 'Tage'} bis ${S.shop.item(item)}`,
    rowLine(streak, open, next, freezes = 0, toFreeze = null) {
      if (streak <= 0) return open ? S.daily.readyHint : 'Morgen wieder · spiele sie jeden Tag für eine Serie';
      const days = `${streak} ${streak === 1 ? 'Tag' : 'Tage'} in Folge`;
      const ahead = next && (toFreeze === null || next.left <= toFreeze) ? S.daily.nextMilestone(next.left, next.item) : toFreeze !== null ? S.daily.freezeLine(toFreeze) : null;
      const parts = [days, freezes > 0 ? S.daily.freezes(freezes) : null, ahead, open ? null : 'morgen wieder'];
      return parts.filter((p): p is string => p !== null).join(' · ');
    },
    freezeLine: (days) => `Noch ${days} ${days === 1 ? 'Tag' : 'Tage'} bis zum Serienschutz`,
    freezes: (n) => `${n}× Serienschutz`,
    sheet: {
      title: 'Tagesserie',
      body: (bonusDays, bonusPay, heatDays) => [
        'Spiele jeden Tag die Tagesschicht, um die Serie zu halten. Ein verpasster Tag beendet sie, es sei denn, ein Serienschutz deckt ihn ab.',
        `Ab ${bonusDays} Tagen zahlt jede Karriereschicht +${Math.round(bonusPay * 100)} % mehr, solange die Serie lebt.`,
        `Hitze: Alle ${heatDays} Tage Serie öffnen eine Hitzestufe, härterer Verkehr für mehr Bezahlung und Elite-XP. Verlierst du die Serie, ist auch die Hitze weg. Verdiente Hitze-Titel bleiben.`,
      ],
      heatOpen: 'Offene Hitze',
      heatValue: (open, max) => `${open} von ${max}`,
      nextHeat: 'Nächste Hitze in',
      allHeat: 'Alle offen',
    },
    freezeUsed: (n) => `SERIE GESCHÜTZT · ${n === 1 ? 'ein verpasster Tag wurde' : `${n} verpasste Tage wurden`} abgedeckt`,
    streakReward: (days, got) => `${days} TAGE IN FOLGE · ${got.join(' · ')}`,
    gotItem: (item) => `${S.shop.item(item)} freigeschaltet`,
    gotFreeze: 'ein Serienschutz',
    gotCard: 'ein Gratis-Rubbellos',
    giftIn: (hours) => (hours >= 1 ? `Gratis-Truhe morgen · in ${Math.ceil(hours)} Std.` : `Gratis-Truhe morgen · in ${Math.max(1, Math.ceil(hours * 60))} Min.`),
    perfectRunFirst: (pay) => `PERFEKTER LAUF · kein Crash · +${pay} % Bezahlung`,
    streakPill(streak, bonus, endsIn, freezes = 0) {
      if (streak <= 0) return S.daily.streakLine(0);
      const days = `${streak} ${streak === 1 ? 'Tag' : 'Tage'} in Folge`;
      if (endsIn !== null) return `${days} · endet in ${endsIn < 1 ? 'unter 1 Std.' : `${Math.floor(endsIn)} Std.`}`;
      const freeze = freezes > 0 ? ` · ${S.daily.freezes(freezes)}` : '';
      return bonus !== null ? `${days} · +${Math.round(bonus * 100)} % Bezahlung${freeze || ' bei jeder Schicht'}` : `${days}${freeze || ' · weiter so'}`;
    },
    challenge(c) {
      switch (c) {
        case 'perfectInputs':
          return '3 Perfekte Einsätze in einer Schicht';
        case 'tightFits':
          return '3 Knappe Lücken in einer Schicht';
        case 'twoTakedowns':
          return '2 Festnahmen in einer Schicht';
        case 'twoTransporters':
          return '2 Transporter in einer Schicht ausgezahlt';
        case 'longChain':
          return 'Eine Perfekte Kette von 8';
        case 'bigCombo':
          return 'Eine Combo von 15';
        case 'perfectRun':
          return 'Ein Perfekter Lauf: kein Crash';
        case 'oneTakedown':
          return 'Fasse einen Verbrecher';
        case 'cleanMerges':
          return '8 Saubere Einfädler in einer Schicht';
        case 'sixTightFits':
          return '6 Knappe Lücken in einer Schicht';
        case 'fivePerfects':
          return '5 Perfekte Einsätze in einer Schicht';
        case 'chainFive':
          return 'Eine Perfekte Kette von 5';
        case 'hugeCombo':
          return 'Eine Combo von 25';
        case 'twoNearMisses':
          return '2 Beinahe-Crashs in einer Schicht';
      }
    },
    challengeDone: (c, reward) => `AUFTRAG · ${S.daily.challenge(c)} · +${money(reward)}`,
  },

  albums: {
    name: (a) => ({ maps: 'Karten', commons: 'Gewöhnliche', rares: 'Seltene', epics: 'Epische', legends: 'Legenden', seasons: 'Jahreszeiten', loyalty: 'Treue', honours: 'Auszeichnungen', pass: 'Saisonpass', tours: 'Touren' })[a],
    complete: (a, reward) => `ALBUM KOMPLETT · ${S.albums.name(a)} · +${money(reward)} · neuer Rahmen`,
    progress: (entries) => 'Alben · ' + entries.map((e) => `${S.albums.name(e.album)} ${e.owned}/${e.total}`).join(' · '),
  },

  race: {
    newBest: 'NEUE BESTZEIT',
  },

  feats: {
    goal(g) {
      switch (g.k) {
        case 'prestige':
          return `Erreiche Prestige ★${g.rank}`;
        case 'elite':
          return `Erreiche Elite ${g.level}`;
        case 'legendary':
          return `Schließe ${g.shifts} Legendäre Schichten ab`;
      }
    },
    done: 'Erledigt',
    withTitle: (title) => `+ Titel „${title}“`,
    eyebrow: 'Großtat',
    body: 'Eine der schwersten Taten im Spiel. Keine Truhe, kein Casino und kein Geld können dir das geben: nur die Straße.',
    rowGoal: 'Ziel',
    rowNow: 'Du',
    rowTitle: 'Titel',
    reward: 'Belohnung',
    earned: 'Verdient · in deiner Sammlung',
  },

  mastery: {
    detail(goal, tier) {
      const t = MASTERY_THRESHOLDS[goal];
      if (tier >= t.length) return 'Alle Stufen erreicht';
      const n = t[tier];
      switch (goal) {
        case 'perfectTiming':
          return `${n} Perfekte Einsätze`;
        case 'tightSpots':
          return `${n} Knappe Lücken`;
        case 'closeCalls':
          return `${n} Beinahe-Crashs`;
        case 'longChain':
          return `Eine Perfekte Kette von ${n}`;
        case 'crimeFighter':
          return `${n} Festnahmen`;
        case 'secureRoute':
          return `${n} Transporter ausgezahlt`;
        case 'comboMaster':
          return `Eine Combo von ${n}`;
        case 'veteran':
          return `${n} Schichten abgeschlossen`;
        case 'lifesaver':
          return `${n} Einsatzfahrten durchgelassen`;
        case 'closeShaves':
          return `${n} knappe Vorbeifahrten an einem Motorrad`;
      }
    },
    name: (g) =>
      ({
        perfectTiming: 'Perfektes Timing',
        tightSpots: 'Enge Stellen',
        closeCalls: 'Knappe Sachen',
        longChain: 'Lange Kette',
        crimeFighter: 'Verbrechensbekämpfer',
        secureRoute: 'Sichere Route',
        comboMaster: 'Combo-Meister',
        veteran: 'Veteran',
        lifesaver: 'Lebensretter',
        closeShaves: 'Knappe Vorbeifahrten',
      })[g],
    toast(done) {
      const names = done.map((c) => `${S.mastery.name(c.goal)} ${masteryNumeral(c.tier)}`);
      return `MEISTERSCHAFT GESCHAFFT · ${names.join(', ')}`;
    },
  },

  night: 'Nacht',
  blackout: 'Blackout',
  weather: (w) =>
    ({ clear: 'Klar', lightRain: 'Leichter Regen', heavyRain: 'Starkregen', storm: 'Sturm', extreme: 'Extremwetter', fog: 'Nebel', snow: 'Schnee & Eis', hail: 'Hagel', sandstorm: 'Sandsturm' })[w],
  cityEvent: (e) =>
    ({
      roadworks: 'Baustelle',
      roadClosure: 'Straßensperrung',
      concert: 'Konzertverkehr',
      vipConvoy: 'VIP-Konvoi',
      policeOperation: 'Polizeieinsatz',
      schoolRun: 'Schulweg',
      marathon: 'Marathon',
    })[e],

  upgrades: {
    group: (g) => ['POLIZEI', 'GELD', 'FAHREN'][g],
    maxed: 'Max',
    pickOne: 'Tippe ein Upgrade an, um zu sehen, was es tut.',
    buyHint: 'Zum Kaufen doppelt tippen.',
    everyStepBought: 'Jede Stufe gekauft.',
    missing: (m) => `${m} fehlen`,
    name: (u) =>
      ({
        morePatrols: 'Mehr Streifen',
        longerPursuit: 'Längere Jagd',
        quietStreets: 'Ruhige Straßen',
        interceptor: 'Abfangjäger',
        dispatchRadio: 'Funkzentrale',
        backup: 'Verstärkung',
        cashRoute: 'Geldroute',
        overtime: 'Überstunden',
        freight: 'Fracht',
        quickRecovery: 'Rasche Erholung',
        doubleRun: 'Doppelfahrt',
        insurance: 'Versicherung',
        robberyInsurance: 'Raubschutz',
        shield: 'Schild',
        tightFitTip: 'Knapp-Trinkgeld',
        dashcam: 'Dashcam',
        chainSaver: 'Kettenretter',
        winterTyres: 'Winterreifen',
        fogLamps: 'Nebelleuchten',
      })[u],
    explanation: (u) =>
      ({
        morePatrols: 'Mehr Streifenwagen warten in deiner Schlange, sodass einer bereit ist, wenn ein Verbrecher auftaucht.',
        longerPursuit: 'Verbrecher brauchen länger zur Flucht, was dir mehr Zeit lässt, sie zu fassen.',
        quietStreets: 'Manche Schichten kommen ganz ohne Verbrecher.',
        interceptor: 'Ein Streifenwagen direkt hinter einem Verbrecher holt ihn schneller ein.',
        dispatchRadio: 'Jede Schicht erlaubt 3 Einsätze, die einen Streifenwagen an die Spitze der Schlange schicken; jede Stufe fügt einen hinzu und lässt einen Ruf weniger von deiner Combo kosten.',
        backup: 'Deine Schicht übersteht einen Streifenwagen-Crash mehr. Der Ring blinkt blau und rot mit kleinen Pluszeichen, und jedes blaue Plus in der oberen Leiste ist ein Crash, der noch erlassen wird.',
        cashRoute: 'Geldtransporter tauchen früher und öfter auf.',
        overtime: 'Jede beendete Schicht zahlt mehr.',
        freight: 'Mehr Lkw auf der Straße: dichterer Verkehr, aber jede Schicht zahlt mehr und jede Maut ist mehr wert.',
        quickRecovery: 'Fahrer ziehen kräftiger an, sodass der Verkehr nach einem Crash früher wieder auf Tempo ist. Eine vollere Straße zahlt pro Schicht etwas mehr.',
        doubleRun: 'Manchmal folgt direkt auf den ersten Geldtransporter ein zweiter.',
        insurance: 'Zahlt einen Teil dessen, was dich ein Crash kostet.',
        robberyInsurance: 'Zahlt einen Teil dessen, was dich ein entkommener Verbrecher kostet.',
        shield: 'Dein eigenes Auto darf pro Schicht einmal mehr crashen. Der Ring blinkt grün mit kleinen Pluszeichen, die Combo bricht und die Schicht geht weiter; jedes grüne Plus in der oberen Leiste ist ein Crash, der noch erlassen wird. Nicht in Unlimited.',
        tightFitTip: 'Jede Knappe Lücke zahlt sofort Trinkgeld, einen Anteil der Schichtbezahlung. Nicht in Unlimited.',
        dashcam: 'Die Kamera sieht, wie knapp du es machst: Jeder Beinahe-Crash zahlt sofort Trinkgeld, einen Anteil der Schichtbezahlung. Nicht in Unlimited.',
        chainSaver: 'Solange du im Fluss bist, lässt ein einfaches Einfädeln pro Schicht deine Kette in Ruhe, statt sie zu beenden. Nicht in Unlimited.',
        winterTyres: 'Regen, Schnee und Hagel nehmen der Straße weniger Grip und Bremswirkung: Crashs rutschen kürzer, und der Verkehr bremst besser.',
        fogLamps: 'Fahrer verlieren weniger Zeit durch schlechtes Wetter und sehen Gefahren früher, und Nebel und Staub liegen dünner auf dem Bildschirm.',
      })[u],
    total(u, steps, c) {
      const t = steps;
      switch (u) {
        case 'morePatrols':
          return `+${percent(t * c.patrolsPerStep)} Streifenwagen`;
        case 'longerPursuit':
          return `+${t * c.pursuitPerStep} s Verfolgung`;
        case 'quietStreets':
          return `${percent(t * c.quietStreetsPerStep)} weniger Verbrecher-Schichten`;
        case 'interceptor':
          return `+${percent(t * c.interceptorPerStep)} Jagdtempo`;
        case 'dispatchRadio':
          return `+${t * c.dispatchLimitPerStep} Einsätze · +${percent(t * c.dispatchRadioPerStep)} Combo behalten`;
        case 'backup':
          return `+${steps * c.backupPerStep} Polizei-Crashs`;
        case 'cashRoute':
          return `${+(t * c.cashRoutePerStep).toFixed(1)} s früher`;
        case 'overtime':
          return `+${percent(t * c.overtimePerStep)} Bezahlung`;
        case 'freight':
          return `+${percent(t * c.freightPerStep)} Lkw · +${percent(t * c.freightPayPerStep)} Bezahlung`;
        case 'quickRecovery':
          return `+${percent(t * c.recoveryPerStep)} Beschl. · +${percent(t * c.recoveryPayPerStep)} Bezahlung`;
        case 'doubleRun':
          return `${percent(t * c.doubleRunPerStep)} Doppelfahrten`;
        case 'insurance':
        case 'robberyInsurance':
          return t * c.insurancePerStep >= 1 ? 'VOLLE DECKUNG' : `${percent(t * c.insurancePerStep)} gedeckt`;
        case 'shield':
          return t === 1 ? '1 Crash erlassen' : `${t} Crashs erlassen`;
        case 'tightFitTip':
          return `${percent(t * c.tightFitTipPerStep)} der Schichtbezahlung pro Knapper Lücke`;
        case 'dashcam':
          return `${percent(t * c.nearMissTipPerStep)} der Schichtbezahlung pro Beinahe-Crash`;
        case 'chainSaver':
          return t === 1 ? '1 Kette pro Schicht gerettet' : `${t} Ketten pro Schicht gerettet`;
        case 'winterTyres':
          return `${percent(t * c.winterTyresPerStep)} des verlorenen Grips zurück`;
        case 'fogLamps':
          return `${percent(t * c.fogLampsPerStep)} weniger verlorene Reaktionszeit`;
      }
    },
    stepEffect(u, steps, max, c) {
      const now = S.upgrades.total(u, steps, c);
      if (steps >= max) return `Jetzt ${now}`;
      return `Jetzt ${now} · nächste Stufe ${S.upgrades.total(u, steps + 1, c)}`;
    },
  },

  heat: {
    row: (heat) => (heat > 0 ? `Hitze ${heat}` : 'Hitze'),
    button: (heat, max) => (heat === 0 ? 'Hitze aus' : max > 1 ? `Hitze ${heat}` : 'Hitze an'),
    line: (heat, max) =>
      heat > 0
        ? `Härterer Verkehr · +${Math.round(heat * baseConfig.heatPay * 100)} % Bezahlung · +${heat * baseConfig.eliteXpHeat} Elite-XP pro Schicht`
        : max > 0
          ? 'Aus · härterer Verkehr für mehr Bezahlung und Elite-XP'
          : `Halte eine ${baseConfig.heatStreakDays}-Tage-Serie, um Hitze zu öffnen`,
    link: (heat, max) => `${max > 1 ? `${heat}/${max}` : heat > 0 ? 'An' : 'Aus'} · ändern ›`,
    cleared: (heat) => `HITZE ${heat} GESCHAFFT`,
    pill: (heat, tailwind) =>
      [tailwind ? `RÜCKENWIND +${Math.round(tailwind * 100)} %` : null, heat > 0 ? `HITZE ${heat} · +${Math.round(heat * baseConfig.heatPay * 100)} % Bezahlung` : null].filter(Boolean).join(' · ') || null,
    rule: (level) => `Schaffe eine Schicht bei Hitze ${level}`,
  },

  goals: {
    tierMiss: (m) => `${m.short} ${m.short === 1 ? 'Auto' : 'Autos'} bis ${S.modes.tier(m.tier)}`,
    next(g) {
      if (g.k === 'challenge') return `Heute · ${S.daily.challenge(g.challenge)} · +${money(String(g.reward))}`;
      return `${S.mastery.name(g.goal)} · ${g.have}/${g.need}`;
    },
    money: (short, upgrade) => `${money(short)} bis ${S.upgrades.name(upgrade)}`,
    nearMiss(n) {
      switch (n.k) {
        case 'cars':
          return n.left === 1 ? `Nur 1 Auto bis Level ${n.level + 1}` : `${n.left} Autos bis Level ${n.level + 1}`;
        case 'best':
          return `${Fmt.number(n.short)} Punkte bis zu deinem Rekord`;
        case 'combo':
          return `${n.short === 1 ? 'Ein Einfädler' : `${n.short} Einfädler`} bis ×${+n.multiplier.toFixed(2)}`;
      }
    },
  },

  photo: {
    button: 'Bild',
    buttonLabel: 'Ein Bild von diesem Ergebnis machen',
    dialog: 'Bild deiner Schicht',
    share: 'Teilen',
    copy: 'Kopieren',
    sendChallenge: 'Als Herausforderung senden',
    copyChallenge: 'Mit Link kopieren',
    challengeCopied: 'Bild und Link kopiert',
    download: 'Herunterladen',
    saved: 'Gespeichert',
    close: 'Schließen',
    score: 'PUNKTE',
    flames: 'FLAMMEN',
    cars: 'AUTOS',
    newBest: 'NEUER REKORD',
    hook: (score) => `Kannst du ${score} schlagen?`,
    hookFlames: (flames) => `Kannst du ${flames} Flammen übertreffen?`,
    hookChill: 'Komm mit auf eine Fahrt.',
    combo: (n) => `Combo ×${n}`,
    tightFits: (n) => (n === 1 ? '1 knappe Lücke' : `${n} knappe Lücken`),
    busted: (n) => `${n} gefasst`,
    wrecks: (n) => (n === 1 ? '1 Wrack' : `${n} Wracks`),
    chain: (n) => `Kette von ${n}`,
    city: 'Die Stadt',
  },

  result: {
    why: {
      crash: 'Du bist gecrasht. Warte auf eine Lücke.',
      crashes: 'Zu viele Crashs. Warte auf eine Lücke.',
      police: 'Zu viele Streifenwagen sind gecrasht.',
      behind: 'Ein Auto war direkt hinter dir.',
      ahead: 'Du hast das Auto vor dir getroffen.',
      escaped: 'Der Verbrecher ist entkommen.',
      boss: 'Der Boss ist entkommen.',
      zeroTolerance: 'Nulltoleranz: Ein Crash oder Schneiden beendet alles.',
      rule: 'Eine Regel der Schicht wurde gebrochen.',
    },
    detonated: 'KABUMM',
    escaped: 'ENTKOMMEN',
    levelComplete: (l) => `LEVEL ${l} GESCHAFFT`,
    newBest: 'NEUER REKORD',
    fullCoverage: 'VOLL VERSICHERT',
    loss: (amount, escaped) => (escaped ? 'VERLUST ' : 'CRASHKOSTEN ') + '−' + money(amount),
    covered: (amount) => `VOLL VERSICHERT · ${money(amount)} von der Versicherung gezahlt`,
    nextLevel: (l) => `Tippe für Level ${l}`,
    retryLevel: (l) => `Tippe, um Level ${l} erneut zu versuchen`,
    stats(combo, tightFits, busted, transporters, time) {
      return [
        time,
        combo > 1 ? `beste Combo ${Fmt.number(combo)}` : null,
        tightFits > 0 ? `${Fmt.number(tightFits)} ${tightFits === 1 ? 'Knappe Lücke' : 'Knappe Lücken'}` : null,
        busted > 0 ? `${busted} gefasst` : null,
        transporters > 0 ? `${transporters} ausgezahlt` : null,
      ]
        .filter((x): x is string => x !== null)
        .join(' · ');
    },
  },

  hud: {
    moneyLabel: 'GELD',
    rushHour: 'STOSSZEIT',
    tight: 'KNAPP!',
    cutOff: 'GESCHNITTEN',
    dispatch: 'EINSATZ',
    danger: 'GEFAHR',
    boom: 'BUMM!',
    covered: 'GEDECKT',
    combo: (n) => `COMBO ${n}`,
    cars: (n) => (n === 1 ? '1 Auto' : `${n} Autos`),
    wanted: (seconds) => `GESUCHT ${Math.ceil(Math.max(0, seconds))}`,
    rushFactor: (value) => `STOSSZEIT ${multiplier(value)}`,
    critical: (points) => `KRITISCH ${points}`,
    shave: (points) => `KNAPP VORBEI ${points}`,
    chainHeld: 'KETTE GEHALTEN',
    label(t) {
      switch (t) {
        case 'police':
          return 'POLIZEI';
        case 'pickup':
          return 'VERBRECHER';
        case 'transporter':
          return 'GESICHERT';
        case 'tanker':
          return 'GAS';
        case 'military':
          return 'BOMBE';
        case 'ambulance':
          return 'KRANKENWAGEN';
        case 'fireTruck':
          return 'FEUERWEHR';
        case 'learner':
          return 'FAHRSCHÜLER';
        case 'bus':
          return 'BUS';
        case 'motorbike':
          return 'MOTORRAD';
        case 'oversize':
          return 'ÜBERBREIT';
        case 'racer':
          return 'RENNWAGEN';
        case 'wedding':
          return 'HOCHZEIT';
        default:
          return null;
      }
    },
  },

  detail: {
    now: 'Jetzt',
    nextStep: 'Nächste Stufe',
    step: (s, max) => `Stufe ${s} von ${max}`,
    buy: (price) => `Kaufen · ${price}`,
    build: (price) => `Bauen · ${price}`,
    remove: 'Entfernen',
    close: 'Schließen',
  },

  notice: {
    more: (n) => `+${n} weitere · siehe Fortschritt`,
    notEnoughMoney: (price) => `Nicht genug ${MONEY_MARK} · ${money(price)} nötig`,
    detourIdle: 'Gebaut, bewirkt hier aber nichts: keine Ausfahrt zwischen ihm und deinem Arm',
  },
});
