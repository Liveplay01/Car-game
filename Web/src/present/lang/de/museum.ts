import type { Translation } from '../../strings';
import { Fmt, money, percent } from '../../format';
import { gripIn } from '../../museumText';

/** Deutsch: die Texte des Museums. */
const museum: Translation['museum'] = {
  boss: {
    convoy: {
      line: 'Eskorten direkt dahinter',
      brief: 'Ramme den Boss mit einem Streifenwagen, in der Lücke vor seinen Eskorten.',
      explain: () => [
        'Der Kopf des Syndikats, in Schwarz mit goldenen Streifen. Seine gepanzerten Eskorten fahren direkt hinter ihm auf den Ring.',
        'Bringe einen Streifenwagen in die Lücke zwischen dem Boss und seinen Eskorten. Eine Eskorte zu treffen ist ein gewöhnlicher Crash.',
        'Du hast mehr Zeit als bei einem normalen Verbrecher: Nutze sie, um auf die Lücke zu warten.',
      ],
    },
    getaway: {
      line: 'In Sekunden weg',
      brief: 'Er ist in Sekunden weg: Halte einen Streifenwagen bereit und ramme ihn sofort.',
      explain: () => [
        'Keine Eskorten, nur Tempo: Der Fluchtfahrer ist in wenigen Sekunden verschwunden.',
        'Habe einen Streifenwagen vorn in deiner Schlange, bevor seine Warnung endet, und schicke ihn los, sobald der Boss auf dem Ring ist.',
      ],
    },
    armoured: {
      line: 'Braucht zwei Streifenwagen',
      brief: 'Ramme ihn zweimal: Der erste Streifenwagen knackt nur die Panzerung.',
      explain: () => ['Seine Panzerung steckt den ersten Rammstoß weg, und eine Eskorte klebt an ihm.', 'Ein Streifenwagen knackt die Panzerung, ein zweiter erledigt ihn. Halte zwei in deiner Schlange bereit.'],
    },
    phantom: {
      line: 'Fährt ohne Licht',
      brief: 'Kein Licht: Folge seiner Warnung und ramme ihn mit einem Streifenwagen.',
      explain: () => [
        'Er kommt im Blackout und fährt ohne Licht: Du siehst ihn nur dort, wo die Straßenlaternen reichen.',
        'Folge dem Ring und vertraue seiner Warnung. Eine Eskorte fährt hinter ihm, also wähle die Lücke sorgfältig.',
      ],
    },
    twins: {
      line: 'Fasse einen, der andere kommt',
      brief: 'Zwei Bosse: Der zweite kommt, sobald der erste gefasst ist.',
      explain: (c) => [
        'Die Zwillinge führen das Syndikat gemeinsam. Es gibt zwei von ihnen, und sie kommen nacheinander: In dem Moment, in dem du den ersten fasst, ist der zweite schon an einem anderen Arm.',
        `Keine Eskorten, je etwa ${Math.round(c.criminalTime * c.twinsTimeFactor)} Sekunden. Erst wenn beide gefasst sind, ist die Beute zurück. Halte einen zweiten Streifenwagen in deiner Schlange bereit.`,
      ],
    },
    decoy: {
      line: 'Seine Eskorten tragen seinen Lack',
      brief: 'Eskorten in seinem Lack: Ramme den Pick-up mit der offenen Ladefläche und dem Ring.',
      explain: () => [
        'Die Eskorten des Lockvogels sind wie der Boss selbst lackiert, schwarz mit goldener Linie, um deine Streifenwagen anzulocken.',
        'Der echte Boss ist der Pick-up: eine offene Ladefläche und der Countdown-Ring darum. Die anderen sind gepanzerte Transporter, und einen zu rammen ist ein gewöhnlicher Crash.',
      ],
    },
    smuggler: {
      line: 'Braucht drei Streifenwagen',
      brief: 'Doppelt gepanzert: Er braucht drei Streifenwagen. Reihe sie auf.',
      explain: (c) => [
        'Der Schmuggler fährt allein, aber unter schwerer Panzerung: Die ersten zwei Streifenwagen knacken sie nur, der dritte stoppt ihn.',
        `Er bleibt etwa ${Math.round(c.criminalTime * c.smugglerTimeFactor)} Sekunden, genug für drei Anläufe, wenn deine Schlange die Streifenwagen hält.`,
      ],
    },
    kingpin: {
      line: 'Der Kopf von allem',
      brief: 'Eskorten in seinem Lack, im Dunkeln: Ramme den Pick-up mit dem Ring zweimal.',
      explain: () => [
        'Der Kingpin kommt zuletzt, im Blackout, mit drei Eskorten in seinem Lack und einer Panzerung, die einen Rammstoß verträgt.',
        'Lies die Formen im Dunkeln: Der Boss ist der Pick-up mit dem Ring. Zwei Streifenwagen in der Lücke dahinter bringen ihn zu Fall.',
      ],
    },
    trio: {
      line: 'Drei hintereinander',
      brief: 'Drei Bosse: Jede Festnahme ruft den nächsten. Halte Streifenwagen bereit.',
      explain: (c) => [
        'Das Trio führt die letzten Jobs des Syndikats aus. Drei Pick-ups kommen nacheinander, ohne Eskorten: Sobald du einen fasst, ist der nächste schon an einem anderen Arm.',
        `Etwa ${Math.round(c.criminalTime * c.trioTimeFactor)} Sekunden je Boss. Erst wenn alle drei gefasst sind, ist die Beute zurück.`,
      ],
    },
    bulwark: {
      line: 'Braucht vier Streifenwagen',
      brief: 'Panzerung für drei Rammstöße und eine Eskorte. Reihe vier Streifenwagen auf.',
      explain: (c) => [
        'Das Bollwerk ist Panzerplatte auf Rädern: Die ersten drei Streifenwagen knacken sie nur, der vierte stoppt es. Eine Eskorte klebt an seinem Heck.',
        `Es bleibt etwa ${Math.round(c.criminalTime * c.bulwarkTimeFactor)} Sekunden, genug für vier Anläufe, wenn deine Schlange die Streifenwagen hält.`,
      ],
    },
    mirage: {
      line: 'Der Lockvogel im Dunkeln',
      brief: 'Eskorten in seinem Lack, im Blackout: Ramme den Pick-up mit dem Ring.',
      explain: () => [
        'Die Fata Morgana ist der Lockvogel bei ausgeschaltetem Licht: ein Blackout und Eskorten, die wie der Boss lackiert sind.',
        'Der Boss ist der Pick-up mit offener Ladefläche und Ring. Ein Transporter im selben Lack ist nur ein Transporter, ihn zu rammen ist ein gewöhnlicher Crash.',
      ],
    },
    wall: {
      line: 'Vier Eskorten, eine Lücke',
      brief: 'Vier Eskorten schließen hinter ihm auf. Warte auf die Lücke, dann ramme.',
      explain: (c) => [
        'Die Mauer schickt vier gepanzerte Transporter direkt hinter dem Boss los, einer nach dem anderen, Stoßstange an Stoßstange.',
        `Sie bleibt etwa ${Math.round(c.criminalTime * c.wallTimeFactor)} Sekunden. Die Transporter lassen beim Kreisen Lücken: Schiebe den Streifenwagen in eine.`,
      ],
    },
  },

  special: {
    police: {
      name: 'Streifenwagen',
      line: 'Das einzige Auto, das einen Verbrecher stoppt',
      brief: 'Robuster als deine Autos. Der Einsatzknopf stellt einen an die Spitze.',
      explain: (c) => [
        'Streifenwagen kommen aus deiner eigenen Schlange wie jedes deiner Autos. Sie sind die einzigen Autos, die einen Verbrecher stoppen können.',
        `Schicke einen auf den Ring, solange ein Verbrecher darauf ist, und fahre in ihn hinein: Das ist eine Festnahme, ${Fmt.number(c.takedownPoints)} Punkte wert und ein Glied in deiner Kette. Halte einen Streifenwagen zurück, wenn eine Warnung einen Arm aufleuchten lässt.`,
        `Ein Streifenwagen ist robuster als deine anderen Autos: Deine Schicht übersteht ${c.maxPoliceCrashes === 1 ? 'einen Polizei-Crash' : `${c.maxPoliceCrashes} Polizei-Crashs`}. Halte ihn aber vom Geldtransporter fern.`,
      ],
    },
    pickup: {
      name: 'Verbrecher',
      line: 'Ramme ihn mit einem Streifenwagen',
      brief: 'Crashe einen Streifenwagen in den Pick-up mit dem lila Ring, bevor er entkommt.',
      explain: (c) => [
        'Eine Warnung lässt den Arm aufleuchten, aus dem er kommt. Dann drängt er sich auf den Ring und rast darum herum, schwer und furchtlos.',
        `Du hast etwa ${Math.round(c.criminalTime)} Sekunden, ihn mit einem deiner Streifenwagen zu rammen. Eine Festnahme zahlt ${Fmt.number(c.takedownPoints)} Punkte und verlängert deine Kette.`,
        'Entkommt er, nimmt er Geld mit, und die Schicht ist vorbei. Deine gewöhnlichen Autos können ihn nicht stoppen: Ein Crash mit ihnen ist nur ein Crash.',
      ],
    },
    transporter: {
      name: 'Geldtransporter',
      line: 'Lass ihn durch, dann kassiere',
      brief: 'Lass den Geldwagen unberührt durch: Er zahlt, wenn er wegfährt.',
      explain: (c) => [
        'Ein gepanzerter Wagen voller Geld. Eine Warnung zeigt seinen Arm, dann fährt er einmal um den Ring, mit einer Sicherheitszone um sich.',
        `Verlässt er ihn sicher, verdienst du ${money(Fmt.number(c.transporterPay))} und ein Glied in deiner Kette. Jedes deiner Autos, das innerhalb seiner Sicherheitszone einfädelt, bringt ${money(Fmt.number(c.shieldBonus))} dazu.`,
        'Triff ihn nicht: Ein Streifenwagen, der ihn rammt, beschlagnahmt das Geld, und niemand wird bezahlt; ein zerstörter Transporter ist verloren.',
      ],
    },
    ambulance: {
      name: 'Krankenwagen',
      line: 'Halte die Straße vor ihm frei',
      brief: 'Halte die Straße vor dem Krankenwagen frei, bis er den Ring verlässt.',
      explain: (c) => [
        'Auf Einsatzfahrt: Er kommt mit einer Warnung und nimmt den langen Weg um den Ring.',
        'Der Abschnitt des Rings direkt vor ihm muss frei bleiben. Schickst du ein Auto dort hinein, ist die Fahrt gestört, und deine Combo und Kette sind weg.',
        `Halte die Straße frei, bis er geht, und er zahlt ${money(Fmt.number(c.ambulancePay))} und verlängert deine Kette. Er verursacht selbst nie einen Crash.`,
      ],
    },
    truck: {
      name: 'Lkw',
      line: 'Lang und schwer: Lass eine größere Lücke',
      brief: 'Lkw sind lang und schwer: Lass eine größere Lücke vor deinem Auto.',
      explain: (c) => [
        'Teil des normalen Verkehrs, aber länger und viel schwerer als ein Auto.',
        'Er braucht eine größere Lücke vor deinem Auto, und bei einem Crash schiebt er leichtere Autos herum, statt anzuhalten.',
        `Jeder Lkw, der früh in einer Schicht eine Mautstelle passiert, zahlt ${money(Fmt.number(c.tollPerTruck))}.`,
      ],
    },
    tanker: {
      name: 'Gastanker',
      line: 'Zerstört, explodiert er',
      brief: 'Ein zerstörter Gastanker explodiert und schleudert jedes Auto in der Nähe weg. Gib ihm Platz.',
      explain: () => [
        'Ein Lkw voller Gas. Er fährt wie jeder andere Lkw und kommt ohne Warnung.',
        'Zerstört, explodiert er: Die Druckwelle schleudert jedes Auto in der Nähe von der Straße, auch deins. Gib ihm Platz.',
        'In Mayhem ist genau das der Sinn: Ziele auf die Tanker, je größer die Kettenreaktion, desto mehr Flammen.',
      ],
    },
    military: {
      name: 'Militär-Lkw',
      line: 'Bleib aus seiner Zone',
      brief: 'Halte jedes Auto aus der Zone des Militär-Lkw, bis er wegfährt.',
      explain: (c) => [
        'Ein Militär-Lkw mit einer Bombe an Bord. Eine Warnung zeigt seinen Arm, dann fährt er um den Ring, mit einer Sperrzone um sich.',
        'Jedes Auto, das in die Zone fährt, löst die Bombe aus, und die Druckwelle reicht über den ganzen Kreisverkehr.',
        `Halte deine Autos zurück, während er vorbeifährt. Nach etwa ${Math.round(c.militaryTime)} Sekunden verlässt er den Ring, sobald der Weg hinaus frei ist.`,
      ],
    },
    fireTruck: {
      name: 'Feuerwehr',
      line: 'Eine lange Strecke freihalten',
      brief: 'Halte die lange Strecke vor der Feuerwehr frei, bis sie wegfährt.',
      explain: (c) => [
        'Eine Einsatzfahrt wie beim Krankenwagen, aber ein Feuerwehrauto: lang, schwer, und es braucht mehr von der Straße.',
        'Der Abschnitt des Rings vor ihm ist länger. Schickst du ein Auto dort hinein, ist die Fahrt gestört, und deine Combo und Kette mit ihr.',
        `Halte die Straße frei, bis es geht, und es zahlt ${money(Fmt.number(c.fireTruckPay))} und verlängert deine Kette.`,
      ],
    },
    motorbike: {
      name: 'Motorrad',
      line: 'Schlüpft in winzige Lücken',
      brief: 'Motorräder schlüpfen in winzige Lücken. Fahre knapp vorbei für Bonuspunkte.',
      explain: (c) => [
        'Schnell und schmal: Ein Motorrad fädelt in Lücken ein, die ein Auto nie nehmen würde, sodass eine Lücke, mit der du gerechnet hast, weg sein kann.',
        `Schiebe eines deiner Autos knapp an ihm vorbei, eine Knappe Lücke oder ein Beinahe-Crash, und die knappe Vorbeifahrt zahlt ${Fmt.number(c.motorbikeBonus)} Punkte obendrauf, mal deine Combo.`,
      ],
    },
    learner: {
      name: 'Fahrschüler',
      line: 'Gib ihm Platz, er zögert',
      brief: 'Halte deine Autos aus dem türkisen Band um den Fahrschüler.',
      explain: (c) => [
        'Ein Fahrschulwagen fährt einmal um den Ring und bremst hin und wieder ohne Grund. Der Verkehr hinter ihm staut sich.',
        'Ein türkises Band zeigt den Raum um ihn, vor und hinter ihm. Halte deine Autos heraus, solange er fährt.',
        `Verlässt er den Ring mit Platz ringsum, zahlt er ${money(Fmt.number(c.learnerPay))} und verlängert deine Kette. Dicht an ihn einzufädeln kostet nur diesen Bonus.`,
      ],
    },
    oversize: {
      name: 'Schwertransport',
      line: 'Langsam, lang, gib ihm Platz',
      brief: 'Eine langsame, lange Ladung: Halte deine Autos aus dem bernsteinfarbenen Band um sie.',
      explain: (c) => [
        'Ein Schwertransport, weit länger als ein Lkw, kriecht einmal um den Ring. Der Verkehr hinter ihm wird mit ihm langsamer, sodass die Lücken, die du kennst, weg sind.',
        `Ein bernsteinfarbenes Band zeigt den Raum, den er braucht, vor und hinter ihm. Halte deine Autos heraus, und er zahlt beim Wegfahren ${money(Fmt.number(c.oversizePay))} und verlängert deine Kette.`,
      ],
    },
    tractor: {
      name: 'Traktor',
      line: 'Langsam, breit, gib ihm Platz',
      brief: 'Ein langsamer Traktor: Halte deine Autos aus dem bernsteinfarbenen Band um ihn.',
      explain: (c) => [
        'Ein Traktor tuckert einmal um den Ring, langsamer als alles andere auf der Straße. Der Verkehr hinter ihm wird mit ihm langsamer.',
        `Ein bernsteinfarbenes Band zeigt den Raum, den er braucht, vor und hinter ihm. Halte deine Autos heraus, und er zahlt beim Wegfahren ${money(Fmt.number(c.tractorPay))} und verlängert deine Kette.`,
      ],
    },
    racer: {
      name: 'Straßenrennfahrer',
      line: 'Zwei davon: Ramme sie',
      brief: 'Zwei Straßenrennfahrer drängen herein: Ramme jeden mit einem Streifenwagen für einen Bonus.',
      explain: (c) => [
        'Zwei Raser heulen an einem der anderen Arme auf und drängen kurz nacheinander auf den Ring, in grellem Pink mit weißen Streifen.',
        `Ramme einen mit einem Streifenwagen, um ihn zu stoppen: je ${money(Fmt.number(c.racerPay))} und ein Glied in deiner Kette. Entkommen sie, geht nichts verloren; deine gewöhnlichen Autos können sie nicht stoppen, ein Crash ist nur ein Crash.`,
      ],
    },
    wedding: {
      name: 'Hochzeitskorso',
      line: 'Drei Autos: Halte sie beisammen',
      brief: 'Ein Hochzeitskorso: Halte deine Autos aus dem rosa Band um alle drei.',
      explain: (c) => [
        'Drei geschmückte Autos, zartweiß mit goldener Schleife, fädeln von einem der anderen Arme ein und fahren gemeinsam einmal um den Ring. Sie fahren im Tempo des Verkehrs, also bremst nichts ab.',
        `Ein rosa Band zeigt ihren Abschnitt des Rings, die Lücken zwischen ihnen und etwas Platz an beiden Enden. Halte deine Autos heraus, und der Korso zahlt beim Wegfahren ${money(Fmt.number(c.weddingPay))} und verlängert deine Kette. Innerhalb einzufädeln kostet nur diesen Bonus.`,
      ],
    },
    drift: {
      name: 'Drift-Auto',
      line: 'Selten: driftet über den leeren Ring',
      brief: 'Ein Drift-Auto rutscht quer um den Ring. Achte auf sein ausschwenkendes Heck.',
      explain: () => [
        'Ganz selten, wenn der Ring ruhig geworden ist, fädelt ein getuntes Coupé von einem der anderen Arme ein und driftet quer um ihn herum: qualmende Reifen, zischender Turbo, Gummi auf der Straße.',
        'Sein Heck schwenkt über die Spur aus, und dieses Heck ist fest. Lass ihm Platz und genieß die Show: kein Bonus, kein Band.',
      ],
    },
    bus: {
      name: 'Schulbus',
      line: 'Hält an der Haltestelle',
      brief: 'Schulbusse halten an der Haltestelle. Fädle hinter einem ein, wenn er anfährt.',
      explain: (c) => [
        `Nur bei einem Schulweg: lange gelbe Busse, die an der Haltestelle am Ring halten, etwa ${Math.round(c.busDwell * 10) / 10} Sekunden lang.`,
        'Der Verkehr hinter einem Bus wartet, und deine Autos warten mit ihm, statt hineinzupflügen. Fädle hinter einem Bus ein, wenn er anfährt.',
      ],
    },
  },

  weather: {
    lightRain: {
      line: 'Glatte Straßen',
      brief: 'Nasse Straße: Crashs rutschen weiter. Lass etwas mehr Platz.',
      explain: (c) => [
        `Eine nasse Straße: Reifen behalten nur ${gripIn('lightRain', c)} ihres Grips, und Fahrer reagieren etwas später und bremsen weicher.`,
        'Crashs rutschen weiter, und Autos brauchen länger zum Anhalten. Lass beim Einfädeln etwas mehr Platz.',
      ],
    },
    heavyRain: {
      line: 'Weniger Grip, mehr Verkehr',
      brief: 'Weniger Grip und mehr Autos. Warte auf Lücken, die eindeutig groß genug sind.',
      explain: (c) => [
        `Strömender Regen: Reifen behalten ${gripIn('heavyRain', c)} ihres Grips, Fahrer reagieren noch später, und mehr Autos sind unterwegs.`,
        'Knappe Lücken werden schnell zu Crashs. Warte auf die Lücken, die eindeutig groß genug sind.',
      ],
    },
    storm: {
      line: 'Fahrer quetschen sich in Lücken',
      brief: 'Fahrer quetschen sich in kleine Lücken. Fädle mit Bedacht ein.',
      explain: (c) => [
        `Ein Sturm: Reifen behalten ${gripIn('storm', c)} ihres Grips, der Verkehr ist dichter, und die anderen Fahrer quetschen sich in kleinere Lücken.`,
        'Der Ring füllt sich schneller, als du es gewohnt bist. Timee deine Autos sorgfältig und achte darauf, wer sich hineindrängt.',
      ],
    },
    extreme: {
      line: 'Das Schlimmste, was der Himmel kann',
      brief: 'Kaum Grip und der dichteste Verkehr. Geduld zahlt sich aus.',
      explain: (c) => [
        `Extremwetter: Reifen behalten nur ${gripIn('extreme', c)} ihres Grips, der Verkehr ist am dichtesten, und jeder Fahrer ist angespannt.`,
        'Jeder Crash rutscht weit und reißt andere mit. Geduld zahlt sich hier mehr aus als Tempo.',
      ],
    },
    fog: {
      line: 'Die andere Seite verschwimmt',
      brief: 'Die andere Seite verschwimmt. Achte auf die Autos, die aus dem Nebel kommen.',
      explain: (c) => [
        'Dichter Nebel: Die andere Seite des Rings verschwimmt, und Fahrer sehen einen Crash einen Moment später.',
        `Achte auf den Verkehr, der aus dem Nebel auf deinen Arm zukommt; die Warnungen scheinen weiter durch. Eine neblige Schicht zahlt ${percent(c.fogPayFactor - 1)} mehr.`,
      ],
    },
    snow: {
      line: 'Eis auf der Straße',
      brief: 'Eis auf der Straße: Niemand hält schnell an. Lass deutlich mehr Platz.',
      explain: (c) => [
        `Schnee und Eis: Reifen behalten nur ${gripIn('snow', c)} ihres Grips, und niemand hält schnell an. Ein Crash rutscht weit.`,
        `Deine Reifenspuren bleiben im Schnee. Lass deutlich mehr Platz als sonst. Eine verschneite Schicht zahlt ${percent(c.snowPayFactor - 1)} mehr.`,
      ],
    },
    hail: {
      line: 'Niemand bremst gut',
      brief: 'Hagel: Fahrer bremsen schlecht und spät. Lass hinter jedem Auto Platz.',
      explain: (c) => [
        `Hagel trommelt auf die Dächer: Fahrer reagieren später, bremsen nur ${percent(c.hailBrake)} so stark, und die Reifen behalten ${gripIn('hail', c)} ihres Grips. Auch etwas mehr Verkehr.`,
        `Ein Auto hinter dir braucht länger zum Anhalten. Lass Platz hinter deinem Einfädeln, nicht nur davor. Eine Hagel-Schicht zahlt ${percent(c.hailPayFactor - 1)} mehr.`,
      ],
    },
    sandstorm: {
      line: 'Staub über dem Ring',
      brief: 'Sandsturm: Die andere Seite ist im Staub verschwunden. Achte darauf, was daraus auftaucht.',
      explain: (c) => [
        `Ein Sandsturm: Staub verbirgt die andere Seite des Rings, Fahrer sehen einen Crash spät, und Sand auf der Straße lässt ${gripIn('sandstorm', c)} des Grips übrig.`,
        `Achte auf den Verkehr, der aus dem Staub auf deinen Arm zukommt; die Warnungen scheinen weiter durch. Ein Sandsturm zahlt ${percent(c.sandstormPayFactor - 1)} mehr.`,
      ],
    },
    blackIce: {
      line: 'Glas unter den Reifen',
      brief: 'Glatteis: Fast kein Grip, fast keine Bremswirkung. Lass riesige Lücken.',
      explain: (c) => [
        `Glatteis: Die Reifen behalten nur ${gripIn('blackIce', c)} ihres Grips, Fahrer bremsen nur ${percent(c.blackIceBrake)} so stark, und ein Crash rutscht sehr weit.`,
        `Lass weit mehr Platz als bei Schnee und fädle früh ein. Eine Glatteis-Schicht zahlt ${percent(c.blackIcePayFactor - 1)} mehr.`,
      ],
    },
    ashfall: {
      line: 'Graue Wolke über dem Ring',
      brief: 'Aschewolke: Die andere Seite verschwindet im Grau. Achte darauf, was daraus auftaucht.',
      explain: (c) => [
        `Asche hängt über dem Ring: Die andere Seite verblasst, Fahrer sehen einen Crash spät, die Straße behält ${gripIn('ashfall', c)} ihres Grips, und etwas mehr Verkehr ist unterwegs.`,
        `Achte auf den Verkehr, der aus der Wolke auf deinen Arm zukommt; die Warnungen scheinen weiter durch. Eine Aschewolken-Schicht zahlt ${percent(c.ashfallPayFactor - 1)} mehr.`,
      ],
    },
  },

  dark: {
    night: {
      line: 'Nur Scheinwerfer und Laternen',
      brief: 'Achte auf die Scheinwerfer, nicht auf die Autos.',
      explain: (c) => [
        'Eine Nachtschicht: Die Stadt ist dunkel, und du siehst die Autos an ihren Scheinwerfern und unter den Straßenlaternen.',
        `Achte auf die Lichter auf dem Ring statt auf die Autos. Eine Nachtschicht zahlt ${percent(c.nightPayFactor - 1)} mehr.`,
      ],
    },
    blackout: {
      line: 'Sogar die Laternen sind aus',
      brief: 'Die Straßenlaternen sind aus: Nur Scheinwerfer zeigen die Autos.',
      explain: (c) => [
        'Eine Nacht mit ausgefallenen Straßenlaternen: Nur die Scheinwerfer zeigen, wo die Autos sind.',
        `Eine Blackout-Schicht zahlt ${percent(c.blackoutPayFactor - 1)} mehr. Das Phantom, der vierte Boss des Syndikats, kommt nur im Blackout.`,
      ],
    },
  },

  event: {
    roadworks: {
      line: 'Ein langsamer Abschnitt am Ring',
      brief: 'Autos fahren langsamer durch die Baustelle, sodass sich dort die Lücken ändern.',
      explain: (c) => [
        `Baustelle auf einem Teil des Rings: Der Verkehr dort wird auf ${percent(c.roadworksSpeedFactor)} seines Tempos langsamer.`,
        'Autos stauen sich hinter der Baustelle, sodass sich die Lücken beim Durchfahren ändern. Sieh, wo sich die Schlange auf dem Ring bildet.',
      ],
    },
    roadClosure: {
      line: 'Ein Arm ist gesperrt',
      brief: 'Ein Arm ist gesperrt: Es kommen weniger Autos herein, und dort fährt keines hinaus.',
      explain: () => [
        'Einer der anderen Arme ist für die Schicht gesperrt: Von dort kommt kein Verkehr herein, und kein Auto kann dort hinaus.',
        'Der Verkehr kommt aus weniger Richtungen und verlässt den Ring über weniger Ausfahrten. Das passiert nur an einem Kreisverkehr mit vier oder mehr Armen.',
      ],
    },
    concert: {
      line: 'Die ganze Stadt ist unterwegs',
      brief: 'Viel mehr Autos auf dem Ring. Nimm eine gute Lücke, wenn sie kommt.',
      explain: (c) => [
        `Ein Konzert ist aus: ${c.concertDensityBonus} Autos mehr auf dem Ring, und neue Autos kommen doppelt so oft.`,
        'Lücken sind selten und kurz. Nimm eine gute, wenn sie kommt, statt auf eine perfekte zu warten.',
      ],
    },
    vipConvoy: {
      line: 'Breite Lücken, mehr Autos',
      brief: 'Jeder Fahrer hält mehr Abstand: breitere Lücken, ein neuer Rhythmus.',
      explain: (c) => [
        `Ein VIP ist in der Stadt: ein Auto mehr auf dem Ring, und jeder Fahrer hält etwa ${percent(c.vipGapFactor - 1)} mehr Abstand.`,
        'Die Lücken zwischen den Autos sind breiter, bewegen sich aber anders. Timee dein Einfädeln auf den neuen Rhythmus.',
      ],
    },
    policeOperation: {
      line: 'Mehr Polizei in deiner Schlange',
      brief: 'Mehr deiner Autos sind Streifenwagen: mehr Chancen für eine Festnahme.',
      explain: (c) => [
        `Ein Polizeieinsatz: ${percent(c.policeOperationShare)} mehr deiner Autos sind Streifenwagen.`,
        'Verbrecher sind leichter zu fassen, und jeder Streifenwagen ist eine Chance mehr für eine Festnahme. Nutze sie.',
      ],
    },
    marathon: {
      line: 'Läufer überqueren einen Arm',
      brief: 'Läufer überqueren immer wieder einen Arm: Seine Autos warten, dann strömen sie herein.',
      explain: (c) => [
        `Ein Marathon führt durch die Stadt. Alle ${c.marathonPeriod} Sekunden überqueren die Läufer einen der anderen Arme, und etwa ${c.marathonCrossing} Sekunden lang wartet sein Verkehr an der Linie.`,
        'Sind sie vorbei, wollen alle wartenden Autos auf einmal herein. Rechne mit einer Welle von diesem Arm und nutze die Ruhe, solange die Läufer auf der Straße sind.',
      ],
    },
    schoolRun: {
      line: 'Busse halten auf dem Ring',
      brief: 'Schulbusse halten auf dem Ring. Fädle hinter einem ein, wenn er anfährt.',
      explain: (c) => [
        `Schulschluss: gelbe Schulbusse mischen sich in den Verkehr, und jeder hält ${Math.round(c.busDwell * 10) / 10} Sekunden an der Haltestelle am Ring.`,
        'Die Autos hinter einem Bus warten auf ihn. Deine Autos bremsen auch hinter einer Schlange, aber die beste Lücke öffnet sich direkt nachdem ein Bus anfährt.',
      ],
    },
  },

  road: {
    twoLane: {
      line: 'Lies die Lücken auf beiden Spuren',
      brief: 'Der Pfeil an deiner Haltelinie zeigt, auf welche Spur dein Auto fährt.',
      explain: (c) => [
        `Ab Level ${c.twoLaneLevel} hat der Ring eine Innenspur. Beide Spuren drehen sich zusammen, und der Verkehr nutzt beide.`,
        'Ein Pfeil vor deiner Haltelinie zeigt, wohin dein vorderes Auto fährt: geradeaus auf die Außenspur oder nach links über sie hinweg auf die Innenspur.',
        'Ein Auto auf dem Weg zur Innenspur braucht eine Lücke auf der Außenspur zum Queren und eine Lücke auf der Innenspur zum Einfädeln. Autos, die die Innenspur verlassen, queren die Außenspur ebenfalls.',
      ],
    },
    contraflow: {
      line: 'Die Innenspur fährt andersherum',
      brief: 'Die Innenspur fährt im Uhrzeigersinn: Ihre Lücken kommen von der anderen Seite.',
      explain: (c) => [
        `Ab Prestige ★${c.contraflowPrestige} fährt in manchen Schichten mit zwei Spuren die Innenspur im Uhrzeigersinn, gegen die Außenspur.`,
        'Ein Auto auf dem Weg zur Innenspur quert weiterhin zuerst die Außenspur und biegt dann links auf die Innenspur ein. Seine Lücke kommt von der anderen Seite als die der Außenspur.',
        'Autos, die die Innenspur verlassen, queren die Außenspur ebenfalls: Schau vor dem Tippen in beide Richtungen. Verbrecher brauchen etwas länger, bis du sie erwischst.',
      ],
    },
  },


  landmark: {
    'landmark.etoile': {
      line: 'Zwölf Alleen, keine Spuren',
      brief: 'Place de l’Étoile: zwölf Alleen treffen sich auf einem Ring.',
      explain: () => ['Der Arc de Triomphe steht in der Mitte von zwölf Alleen. Autos kommen von allen Seiten und fädeln sich in einen Ring ohne markierte Spuren ein.', 'Eine feste Schicht: Das Layout ändert sich nie. Schaffst du sie einmal, ist sie hier ausgestellt.'],
    },
    'landmark.magic': {
      line: 'Fünf kleine Ringe in einem',
      brief: 'Swindons Magic Roundabout: sechs Arme um einen großen Ring.',
      explain: () => ['In Swindon bilden fünf Mini-Kreisverkehre einen großen Ring, und der Verkehr läuft in beide Richtungen. Hier ist es ein Ring aus zehn Plätzen mit sechs gebauten Armen.', 'Eine feste Schicht: Das Layout ändert sich nie. Schaffst du sie einmal, ist sie hier ausgestellt.'],
    },
    'landmark.venezia': {
      line: 'Sieben Arme um ein Denkmal',
      brief: 'Piazza Venezia in Rom: sieben Straßen um das Vittoriano, bei Regen.',
      explain: () => ['Roms Piazza Venezia hat keine klare Vorfahrt und sieben Arme, ungleich um das Denkmal verteilt. Es regnet.', 'Eine feste Schicht: Das Layout ändert sich nie. Schaffst du sie einmal, ist sie hier ausgestellt.'],
    },
  },
  fail: {
    mergeCrash: {
      name: 'Einfädel-Crash',
      line: 'Du hast das Auto vor dir getroffen',
      brief: 'Dein Auto hat beim Einfädeln das Auto vor sich getroffen.',
      explain: (c) => [
        'Dein Auto ist zu dicht hinter einem anderen auf den Ring gefahren und hineingekracht. Zählen tut nur der Crash eines Autos, das du gerade einfädelst.',
        `Eine Schicht übersteht ${c.maxStrikes === 1 ? 'keinen Crash' : `${c.maxStrikes - 1} ${c.maxStrikes === 2 ? 'Crash' : 'Crashs'}`}: der nächste beendet sie.`,
        'Schau auf das Auto vor deiner Einfädelstelle, nicht nur auf das dahinter. Ist die Lücke vorn kurz, lass das Auto vorbei und nimm die nächste.',
      ],
    },
    cutOffCrash: {
      name: 'Schneid-Crash',
      line: 'Ein Auto war direkt hinter dir',
      brief: 'Ein Auto hinter dir konnte nicht mehr bremsen und hat dein einfädelndes Auto getroffen.',
      explain: () => [
        'Du bist direkt vor einem Auto auf den Ring gefahren, das nicht mehr rechtzeitig bremsen konnte, und es ist in dein einfädelndes Auto gekracht. Das ist ein Crash und zählt gegen dich.',
        'Schau auch auf die Autos, die hinter deiner Einfädelstelle herankommen. Auf nasser Straße, bei Schnee und Hagel brauchen sie mehr Platz, ein Laster am meisten.',
        'Ein Tight Fit ist in Ordnung, ein Auto, das hart bremsen muss, nicht: Warte, bis die Lücke hinter dir aufgeht.',
      ],
    },
    ringCrash: {
      name: 'Ring-Crash',
      line: 'Ein Auto von dir ist auf dem Ring gecrasht',
      brief: 'Ein Auto, das du geschickt hast, ist auf dem Ring gecrasht.',
      explain: () => [
        'Ein Auto bleibt deins, bis es die erste Ausfahrt passiert hat. Ein Crash auf dem Ring davor, in einer Karambolage oder an einem Wrack, zählt trotzdem gegen dich.',
        'Schicke kein Auto in einen Ring mit Wracks, Stau oder einem Auto, das gleich bremst. Warte, bis die Straße frei ist.',
      ],
    },
    policeCrash: {
      name: 'Polizei-Crash',
      line: 'Zu viele Streifenwagen sind gecrasht',
      brief: 'Zu viele deiner Streifenwagen sind gecrasht.',
      explain: (c) => [
        `Streifenwagen sind robuster als deine anderen Autos: Eine Schicht übersteht ${c.maxPoliceCrashes === 1 ? 'einen Polizei-Crash' : `${c.maxPoliceCrashes} Polizei-Crashs`}. Der nächste beendet sie.`,
        'Schicke einen Streifenwagen nur hinter einem Verbrecher her und halte ihn vom Geldtransporter und vom übrigen Verkehr fern. Ein Streifenwagen vorn in deiner Schlange ist ein Risiko, bis ein Verbrecher auf dem Ring ist.',
      ],
    },
    bomb: {
      name: 'Bombe',
      line: 'Ein Auto hat die Bombe gezündet',
      brief: 'Ein Auto ist in die Zone des Militärlasters gefahren und hat die Bombe gezündet.',
      explain: () => [
        'Eines deiner Autos ist in die Sperrzone des Militärlasters gefahren und hat seine Bombe gezündet. Die Explosion reicht über den ganzen Kreisverkehr und beendet die Schicht sofort.',
        'Halte deine Autos zurück, solange der Laster vorbeifährt. Die Zone ist auf dem Ring markiert, und eine Warnung zeigt den Arm, aus dem er kommt.',
      ],
    },
    escape: {
      name: 'Verbrecher entkommen',
      line: 'Der Verbrecher ist entkommen',
      brief: 'Ein Verbrecher ist entkommen: Kein Streifenwagen hat ihn rechtzeitig gerammt.',
      explain: (c) => [
        `Ein Verbrecher bleibt etwa ${Math.round(c.criminalTime)} Sekunden auf dem Ring. Kein Streifenwagen von dir hat ihn in dieser Zeit gerammt, also ist er mit dem Geld entkommen und die Schicht war vorbei.`,
        'Leuchtet ein Arm als Warnung auf, halte einen Streifenwagen vorn in deiner Schlange (der Dispatch-Knopf stellt einen nach vorn). Deine normalen Autos können ihn nicht stoppen.',
      ],
    },
    bossEscape: {
      name: 'Boss entkommen',
      line: 'Der Boss ist entkommen',
      brief: 'Der Boss des Syndikats ist entkommen.',
      explain: () => [
        'Der Kopf des Syndikats ist entkommen. Ein Boss hat mehr Zeit als ein gewöhnlicher Verbrecher, aber auch Eskorten, Panzerung oder einen eigenen Trick, und die Schicht ist verloren, sobald er weg ist.',
        'Jeder Boss ist im Regal „Bosse“ ausgestellt, mit dem Weg, ihn zu fassen. Halte Streifenwagen in deiner Schlange bereit.',
      ],
    },
    ruleCrash: {
      name: 'Regel gebrochen: Crash',
      line: 'Ein Crash hat die Regel gebrochen',
      brief: 'Ein Crash hat die Regel dieser Schicht gebrochen.',
      explain: () => [
        'Prüfungen und Legendäre Schichten wie Nulltoleranz haben eine eigene Regel, und ein Crash bricht sie sofort: Es ist kein Fehler übrig.',
        'Die Regel steht auf dem Startbildschirm. Warte auf Lücken, die klar groß genug sind.',
      ],
    },
    ruleCutOff: {
      name: 'Regel gebrochen: Schneiden',
      line: 'Schneiden hat die Regel gebrochen',
      brief: 'Du hast ein Auto geschnitten, und das hat die Regel dieser Schicht gebrochen.',
      explain: () => [
        'Eine Regel dieser Schicht verbietet das Schneiden. Ein Einfädeln direkt vor einem Auto, das hart bremsen muss, zählt als Schneiden und beendet die Schicht.',
        'Nimm Lücken, in denen das Auto hinter dir ausrollen kann. Ein Tight Fit ist erlaubt, Schneiden nicht.',
      ],
    },
  },
};

export default museum;
