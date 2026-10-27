import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { Fmt, money } from '../../format';
import { SPECIAL_TEXT, FAIL_TEXT } from '../../museumText';

const COLORS: Record<string, string> = { purple: 'Lila', gold: 'Gold', blue: 'Blau', red: 'Rot', teal: 'Türkis', orange: 'Orange', pink: 'Pink', rose: 'Rosa' };
const color = (name: string): string => COLORS[name] ?? name;

/** Deutsch, Teil 4: Erfolge, Briefing, Benachrichtigungen, Tabs, Fortschritt, Social, Museum. */
export default (S: Strings): Words<Strings> => ({
  ach: {
    heading: 'Erfolge',
    name: (id) =>
      ({
        scrapyard: 'Schrottplatz',
        fireworks: 'Feuerwerk',
        spotless: 'Makellos',
        jackpot: 'Jackpot-Jäger',
        critical: 'Kritische Treffer',
        wizard: 'Verkehrszauberer',
        earner: 'Großverdiener',
        weatherproof: 'Wetterfest',
        stormRider: 'Sturmreiter',
        whiteout: 'Whiteout',
        moonlighter: 'Nachtarbeiter',
        lightsOut: 'Lichter aus',
        cityLife: 'Stadtleben',
        longHaul: 'Langstrecke',
        clockwork: 'Uhrwerk',
        onARoll: 'Auf Kurs',
        regular: 'Stammgast',
        testDriver: 'Testfahrer',
        hunter: 'Syndikatsjäger',
        roadBuilder: 'Straßenbauer',
        foreman: 'Vorarbeiter',
        tuner: 'Tuner',
        chestOpener: 'Truhenöffner',
        collector: 'Sammler',
        climber: 'Aufsteiger',
        elite: 'Elite-Fahrer',
        reborn: 'Wiedergeboren',
        heatSeeker: 'Hitzesucher',
        gambler: 'High Roller',
        tourist: 'Tourist',
      })[id] ?? id,
    goal: (id, n) => {
      const N = Fmt.number(n);
      return (
        {
          scrapyard: `Verursache ${N} Wracks`,
          fireworks: `Löse ${N} Explosionen aus`,
          spotless: `${N} Perfekte Läufe`,
          jackpot: `Liefere ${N} Jackpot-Transporter`,
          critical: `Lande ${N} Kritische Einfädler`,
          wizard: `Schicke ${N} Autos los`,
          earner: `Verdiene ${N} Münzen auf der Straße`,
          weatherproof: `Schaffe ${N} Schichten bei schlechtem Wetter`,
          stormRider: `Schaffe ${N} Schichten bei Sturm, Hagel oder Sandsturm`,
          whiteout: `Schaffe ${N} Schichten bei Nebel oder Schnee`,
          moonlighter: `Schaffe ${N} Schichten bei Nacht`,
          lightsOut: `Schaffe ${N} Schichten im Blackout`,
          cityLife: `Schaffe ${N} Schichten mit einem Stadtereignis`,
          longHaul: `Halte ${Fmt.seconds(n)} in einem Unlimited-Lauf durch`,
          clockwork: `Schaffe ${N} Tagesschichten`,
          onARoll: `Eine Tagesserie von ${N} Tagen`,
          regular: `Bestehe ${N} ${n === 1 ? 'Wochenschicht' : 'Wochenschichten'}`,
          testDriver: `Bestehe ${N} ${n === 1 ? 'Prüfung' : 'Prüfungen'}`,
          hunter: `Fasse ${N} ${n === 1 ? 'Syndikatsboss' : 'verschiedene Syndikatsbosse'}`,
          roadBuilder: `Baue ${N} ${n === 1 ? 'zusätzliche Straße' : 'zusätzliche Straßen'}`,
          foreman: `Habe ${N} ${n === 1 ? 'Modul' : 'Module'} stehen`,
          tuner: `Besitze ${N} Upgrade-Stufen`,
          chestOpener: `Öffne ${N} Truhen`,
          collector: `Sammle ${N} Gegenstände`,
          climber: `Erreiche Level ${N}`,
          elite: `Erreiche Elite ${N}`,
          reborn: `Mache ${N}× Prestige`,
          heatSeeker: `Schaffe eine Schicht bei Hitze ${N}`,
          gambler: `Spiele ${N} Casino-Runden`,
          tourist: `Bestehe ${N} Tour-${n === 1 ? 'Stopp' : 'Stopps'}`,
        } as Record<string, string>
      )[id] ?? ''
    },
    caption: 'ERFOLG',
    reached: (id, tier, reward) => ({
      title: S.ach.name(id),
      tier: S.ach.tier(tier),
      reward: `+${money(reward)}`,
      text: `Erfolg · ${S.ach.name(id)} ${S.ach.tier(tier)} · +${money(reward)}`,
    }),
    many: (n, reward) => ({
      title: `${n} Erfolge`,
      tier: '★',
      reward: `+${money(reward)}`,
      text: `${n} Erfolge · +${money(reward)} · siehe Fortschritt → Ziele`,
    }),
  },

  brief: {
    caption: (e, again) => `${again ? 'Erinnerung' : 'Neu'} · ${S.museum.name(e)}`.toUpperCase(),
  },

  push: {
    streakTitle: (days) => `Deine ${days}-Tage-Serie`,
    streakBody: 'Spiele die heutige Tagesschicht vor Mitternacht, um sie am Laufen zu halten.',
    giftTitle: 'Deine Gratis-Truhe ist bereit',
    giftBody: 'Eine Standard-Truhe wartet auf dich. Öffne das Spiel, um sie abzuholen.',
    passTitle: (season) => `${S.pass.seasonName(season)} ist da`,
    passBody: 'Ein neuer Saisonpass ist da, mit drei neuen Skins zu verdienen.',
    row: 'Benachrichtigungen',
    rowSub: 'Deine Serie, eine Gratis-Truhe, eine neue Saison oder ein Spieler, der dich in den Top 20 überholt. Höchstens eine am Tag.',
    rowInstall: 'Füge das Spiel zuerst deinem Home-Bildschirm hinzu und schalte sie dann hier ein.',
    choices: {
      streak: { title: 'Tagesserie', sub: 'Ein Anstoß am Abend, bevor deine Serie endet.' },
      chests: { title: 'Gratis-Truhen', sub: 'Deine Gratis-Truhe für morgen und Geschenke von Einladungen.' },
      pass: { title: 'Neue Saison', sub: 'Wenn ein neuer Saisonpass startet.' },
      rank: { title: 'Überholt', sub: 'Wenn dich ein Spieler in den Top 20 überholt.' },
      comeback: { title: 'Komm zurück', sub: 'Eine Erinnerung nach ein paar Tagen Pause.' },
    },
    rowNone: 'Hier nicht verfügbar. Öffne das Spiel in deinem Browser, um Benachrichtigungen einzuschalten.',
    rowLocal: 'An. Erinnerungen bei geschlossenem Spiel brauchen den Online-Dienst, den diese Version des Spiels nicht hat.',
    confirmTitle: 'Benachrichtigungen sind an',
    rowBlocked: 'Für diese Seite blockiert. Erlaube Benachrichtigungen in den Browser-Einstellungen, um sie einzuschalten.',
    offerFirstTitle: 'Morgen Gratis-Truhe',
    offerFirstWhy: 'Erhalte einen Anstoß, wenn die Gratis-Truhe von morgen bereit ist, und noch einen, bevor eine Serie endet. Höchstens eine am Tag, nie nachts. Schalte sie jederzeit in den Einstellungen aus.',
    offerTitle: 'Halte deine Serie',
    offerWhy: 'Erhalte einen Anstoß, bevor deine Serie endet, wenn eine Gratis-Truhe bereit ist oder eine neue Saison startet. Höchstens eine am Tag, nie nachts. Schalte sie jederzeit in den Einstellungen aus.',
    offerOn: 'Benachrichtigungen einschalten',
    offerLater: 'Jetzt nicht',
    on: 'Benachrichtigungen an. Schalte sie jederzeit in den Einstellungen aus.',
    failed: 'Benachrichtigungen konnten nicht eingeschaltet werden. Versuche es später erneut.',
    denied: 'Benachrichtigungen sind für diese Seite in deinen Browser-Einstellungen blockiert.',
  },

  wayBack: {
    chestTitle: 'Gratis-Truhe morgen',
    streakTitle: 'Bis morgen',
    chestWhy: 'Leg das Spiel auf deinen Startbildschirm: Die Gratis-Truhe von morgen ist nur einen Tipp entfernt, und dein Fortschritt bleibt sicher.',
    streakWhy: 'Leg das Spiel auf deinen Startbildschirm: Deine Serie ist morgen nur einen Tipp entfernt, und dein Fortschritt bleibt sicher.',
    install: 'Spiel installieren',
  },

  ready: {
    tapToStart: 'Tippe zum Starten',
    tapForFriends: 'Tippe, um mit Freunden zu spielen',
  },

  tabs: {
    progress: 'Fortschritt',
    social: 'Social',
    game: 'Spiel',
    shop: 'Shop',
    build: 'Bauen',
  },

  progress: {
    section: (i) => ['Heute', 'Ziele', 'Statistik'][i],
    allStats: 'Alle Werte',
    statsMore: (n) => `${n} weitere ›`,
    statsHide: 'Ausblenden',
    odometer: 'Kilometerzähler',
    odometerLine: 'Jedes Auto, das du reingelassen hast, von Tür zu Tür',
    odometerMoon: 'Bis zum Mond. Und es fährt weiter.',
    km: 'km',
    quests: 'Aufträge',
    trials: 'Prüfungen',
    mastery: 'Meisterschaft',
    feats: 'Großtaten',
    trialsLocked: (level) => `Öffnet ab Level ${level} · Sonderschichten mit Belohnung`,
    landmarks: 'Wahrzeichen',
    landmarksHint: 'Berühmte Kreisverkehre, je eine schwere Schicht.',
    ascension: 'Aufstieg',
    ascensionHint: 'Eine Prüfung für jeden Prestige-Rang: die härtesten Schichten im Spiel.',
    levelTrials: 'Level-Prüfungen',
    levelTrialsHint: (waiting, shown) =>
      waiting > shown ? `Mit jedem Level eine mehr. ${waiting - shown} weitere warten: Bestehe eine, und die nächste erscheint.` : 'Mit jedem Level eine mehr, von Level 30 bis 120.',
    bosses: 'Syndikatsbosse',
    legendary: 'Legendäre Schichten',
    weeklies: 'Wochenschichten',
    ambulances: 'Krankenwagen durchgelassen',
    level: 'Erreichtes Level',
    bestCombo: 'Beste Combo',
    bestChain: 'Längste Perfekte Kette',
    streak: 'Tagesserie',
    flameTier: (tier) => ['MOTOR AUS', 'MOTOR IM LEERLAUF', 'MOTOR DREHT HOCH', 'FEHLZÜNDUNGEN', 'NACHBRENNER', 'INFERNO'][tier] ?? '',
    streakDay: 'Tag in Folge',
    streakDays: 'Tage in Folge',
    streakStart: 'Spiele die heutige Tagesschicht, um den Motor zu starten',
    streakKeep: 'Spiele die heutige Tagesschicht, damit er weiterbrennt',
    streakDone: 'Heute erledigt · morgen wieder',
    streakCard: (n) => (n === 1 ? 'Gratis-Rubbellos am nächsten Tag' : `Gratis-Rubbellos in ${n} Tagen`),
    shiftsPlayed: 'Gespielte Schichten',
    shiftsCompleted: 'Abgeschlossene Schichten',
    takedowns: 'Festnahmen',
    transporters: 'Transporter ausgezahlt',
    unlimitedBest: 'Unlimited-Bestwert',
    unlimitedCars: 'Unlimited-Autos',
    unlimitedTier: 'Unlimited-Stufe',
    mayhemBest: 'Mayhem-Flammen',
    mayhemChain: 'Mayhem-Kette',
    minutes: (s) => (s < 3600 ? `${Math.max(1, Math.round(s / 60))} Min.` : `${Math.floor(s / 3600)} Std. ${Math.round((s % 3600) / 60)} Min.`),
    tours: 'Tour-Stopps',
    perfects: 'Perfekte Einsätze',
    chestsOpened: 'Geöffnete Truhen',
    days: (d) => (d === 1 ? '1 Tag' : `${d} Tage`),
    collectionShare: (o, t) => `Sammlung · ${Math.floor((o / t) * 100)} %`,
    questsHint: 'Aufträge zahlen je einmal und wechseln um Mitternacht.',
    timingLabel: (n) => `Dein Timing · letzte ${n} Einfädler`,
    timing: (ms, onBeat) => (ms === null ? '–' : Math.abs(ms) <= onBeat ? 'Auf den Punkt' : ms < 0 ? `${-ms} ms zu früh` : `${ms} ms zu spät`),
  },

  social: {
    section: (i) => ['Ränge', 'Crew', 'Club', 'Mafia'][i],
    clubClosed: 'Der Club öffnet ab Level 50: ein Auktionshaus und der Spielfonds für große Kontostände.',
    mafiaClosed: 'Die Familie hat keine Zeit für Anfänger. Erledige den ersten Boss des Syndikats (Level 15) oder komm an ihm vorbei, und sie melden sich.',
    offline: 'Crews und Ränge brauchen den Online-Dienst, mit dem diese Kopie des Spiels nicht verbunden ist.',
    noCrew: 'Crews sind hier nicht verfügbar. Ränge und der Club schon.',
  },

  museum: {
    shelf: (i) => ['Bosse', 'Spezial', 'Bedingungen', 'Scheitern'][i],
    lockedFailHint: 'Noch nicht passiert. Verlierst du eine Schicht auf diese Weise, wird sie hier ausgestellt, mit dem, was schiefging, und wie du es vermeidest.',
    failuresDone: (skin) => `Jede Art zu verlieren gefunden: Der Skin ${skin} gehört dir`,
    newFinds: (n) => (n === 1 ? '1 neues Exponat im Museum' : `${n} neue Exponate im Museum`),
    shelfDoneTitle: 'Regal vollständig',
    shelfDoneLine: (shelf) => `${shelf} · alles ausgestellt`,
    museumDoneTitle: 'Museum vollständig',
    museumDoneLine: 'Jedes Exponat ist ausgestellt',
    notSeen: 'Noch nicht gesehen',
    newBadge: 'NEU',
    firstTime: 'Neu für dich',
    firstAt: (level, rank = 0) => (rank > 0 ? `Ab ${S.museum.place(level, rank)}` : `Ab Level ${level}`),
    undiscovered: 'Noch nicht entdeckt',
    lockedHint: (level, rank = 0) =>
      rank > 0 || level > 1
        ? rank > 0
          ? `Taucht ab ${S.museum.place(level, rank)} auf. Sobald du es auf der Straße getroffen hast, wird es hier mit allem Wissenswerten ausgestellt.`
          : `Taucht ab Level ${level} auf. Sobald du es auf der Straße getroffen hast, wird es hier mit allem Wissenswerten ausgestellt.`
        : 'Spiele weiter Schichten. Sobald du es auf der Straße getroffen hast, wird es hier mit allem Wissenswerten ausgestellt.',
    lockedBossHint: (level, rank = 0) => (rank > 0 ? `Das Syndikat schickt ihn auf ${S.museum.place(level, rank)}. Sobald du ihm begegnet bist, wird er hier ausgestellt, mit dem Weg, ihn zu fassen.` : `Das Syndikat schickt ihn auf Level ${level}. Sobald du ihm begegnet bist, wird er hier ausgestellt, mit dem Weg, ihn zu fassen.`),
    kind: (e) => ({ boss: 'Syndikatsboss', special: 'Spezialfahrzeug', weather: 'Wetter', dark: 'Dunkelheit', event: 'Stadtereignis', road: 'Straße', fail: 'Scheitern' })[e.k],
    met: 'Getroffen, noch auf freiem Fuß',
    onRing: 'Auf dem Ring',
    signalArrive: (arm, sweep) =>
      arm && sweep
        ? `Der Arm, aus dem es kommt, leuchtet in ${color(arm)}, dann läuft ein Licht in ${color(sweep)} um die Insel.`
        : arm
          ? `Der Arm, aus dem es kommt, leuchtet in ${color(arm)}, bevor es auf den Ring fährt.`
          : `Ein Licht in ${color(sweep ?? '')} läuft um die Insel.`,
    signalPaid: (c) => `Richtig gemacht: Ein Ring in ${color(c)} weitet sich von der Insel aus.`,
    signalMissed: (c) => `Verpasst: Ein Ring in ${color(c)} zieht sich in die Insel zurück.`,
    signalNote: (n) =>
      n === 'escaped' ? 'Entkommt es, blitzt der ganze Ring lila auf.' : 'Ein Auto, das direkt vor ihm einfädelt, lässt den ganzen Ring rot aufblitzen und bricht deine Combo.',
    heist: 'Beute zurückgeholt',
    firstMet: 'Boss-Level',
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
          return 'Zwei Spuren';
        case 'fail':
          return FAIL_TEXT[e.kind].name;
      }
    },
  },
});
