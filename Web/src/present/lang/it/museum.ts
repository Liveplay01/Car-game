import type { Translation } from '../../strings';
import { Fmt, money, percent } from '../../format';
import { gripIn } from '../../museumText';

/** Italiano: i testi del museo. */
const museum: Translation['museum'] = {
  boss: {
    convoy: {
      line: 'Scorte subito dietro',
      brief: 'Sperona il boss con un\'auto della polizia nel varco prima delle sue scorte.',
      explain: () => [
        'Il capo del sindacato, in nero con strisce dorate. Le sue scorte blindate lo seguono a ruota entrando nella rotonda.',
        'Infila un\'auto della polizia nel varco tra il boss e le sue scorte. Schiantarsi contro una scorta conta come un normale incidente.',
        'Hai più tempo rispetto a un criminale comune: sfruttalo per attendere il varco perfetto.',
      ],
    },
    getaway: {
      line: 'Fugge in pochi secondi',
      brief: 'Fugge in pochi secondi: tieni pronta un\'auto della polizia e speronalo subito.',
      explain: () => [
        'Nessuna scorta, solo pura velocità: l\'autista della fuga scompare in pochissimi secondi.',
        'Tieni un\'auto della polizia in testa alla tua coda prima che scada l\'avviso e inviala non appena il boss tocca l\'asfalto.',
      ],
    },
    armoured: {
      line: 'Richiede due auto della polizia',
      brief: 'Speronalo due volte: la prima volante distrugge solo la corazza.',
      explain: () => [
        'La sua corazza assorbe il primo impatto, e una scorta non lo perde di vista.',
        'Un\'auto della polizia distrugge la corazza; una seconda lo neutralizza. Tienine due pronte in coda.',
      ],
    },
    phantom: {
      line: 'Guida a fari spenti',
      brief: 'A fari spenti: segui il suo avviso e speronalo con un\'auto della polizia.',
      explain: () => [
        'Appare durante un blackout e a fari spenti: lo vedrai solo sotto la luce dei lampioni.',
        'Segui la curva della rotonda e fidati dell\'avviso. Ha una scorta dietro, quindi calcola bene il varco.',
      ],
    },
    twins: {
      line: 'Cattura uno, spunta l\'altro',
      brief: 'Due boss: il secondo entra non appena catturi il primo.',
      explain: (c) => [
        'I gemelli guidano il sindacato insieme. Sono in due e arrivano in sequenza: catturato il primo, il secondo appare subito da un altro braccio.',
        `Nessuna scorta, circa ${Math.round(c.criminalTime * c.twinsTimeFactor)} secondi ciascuno. Recuperi il bottino solo se li arresti entrambi. Tieni una seconda volante pronta.`,
      ],
    },
    decoy: {
      line: 'Le scorte hanno i suoi stessi colori',
      brief: 'Scorte identiche: sperona il pickup con cassone aperto e anello.',
      explain: () => [
        'Le scorte dell\'esca sono verniciate come il boss, nero con striscia dorata, per confondere le tue volanti.',
        'Il vero boss è il pickup: cassone aperto e anello di conto alla rovescia attorno. Gli altri sono furgoni blindati; colpirli provoca un normale incidente.',
      ],
    },
    smuggler: {
      line: 'Richiede tre auto della polizia',
      brief: 'Doppia corazza: servono tre volanti. Allineale in coda.',
      explain: (c) => [
        'Il contrabbandiere viaggia da solo ma con corazzatura pesante: le prime due volanti lo danneggiano, la terza lo ferma.',
        `Resta per circa ${Math.round(c.criminalTime * c.smugglerTimeFactor)} secondi, sufficienti per tre tentativi se la tua coda conserva le volanti.`,
      ],
    },
    kingpin: {
      line: 'La mente di tutto',
      brief: 'Scorte camuffate, nel buio: sperona due volte il pickup con l\'anello.',
      explain: () => [
        'Il Boss Supremo arriva per ultimo, in pieno blackout, con tre scorte camuffate e una corazza in grado di resistere a un urto.',
        'Individua la sagoma nell\'ombra: il boss è il pickup con l\'anello. Due volanti nello spazio posteriore lo abbatteranno.',
      ],
    },
  },

  special: {
    police: {
      name: 'Auto della polizia',
      line: 'L\'unica auto in grado di arrestare un criminale',
      brief: 'Più resistente delle tue auto. Il pulsante di avviso ne mette una in cima alla coda.',
      explain: (c) => [
        'Le auto della polizia escono dalla tua coda come qualsiasi altro veicolo. Sono le uniche capaci di fermare i criminali.',
        `Inviala nella rotonda mentre c'è un criminale e impattalo: conta come arresto, vale ${Fmt.number(c.takedownPoints)} punti e allunga la tua serie. Tieni pronta una volante quando un braccio lampeggia d'allerta.`,
        `Una volante è più resistente: il tuo turno sopporta ${c.maxPoliceCrashes === 1 ? 'uno scontro di polizia' : `${c.maxPoliceCrashes} scontri di polizia`}. Tienila lontana dal furgone blindato.`,
      ],
    },
    pickup: {
      name: 'Criminale',
      line: 'Speronalo con un\'auto della polizia',
      brief: 'Schianta una volante contro il pickup con anello viola prima che scappi.',
      explain: (c) => [
        'Un allarme illumina il braccio da cui entrerà. Irrompe nella rotonda a tutta velocità, spericolato e pesante.',
        `Hai circa ${Math.round(c.criminalTime)} secondi per speronarlo con una delle tue volanti. Ogni cattura assegna ${Fmt.number(c.takedownPoints)} punti ed estende la tua serie.`,
        'Se fugge, ruba denaro e termina il turno. Le tue auto normali non possono fermarlo: scontrarsi causa solo un incidente.',
      ],
    },
    transporter: {
      name: 'Furgone blindato',
      line: 'Lascialo passare indisturbato e incassa',
      brief: 'Lascia passare il furgone blindato: paga quando lascia la rotonda.',
      explain: (c) => [
        'Un furgone blindato pieno di denaro. Un avviso segnala il suo arrivo; poi compie un giro della rotonda protetto da una zona di sicurezza.',
        `Se esce incolume, guadagni ${money(Fmt.number(c.transporterPay))} e un anello per la tua serie. Ogni tua auto che entra nella sua zona sicura aggiunge ${money(Fmt.number(c.shieldBonus))}.`,
        'Non toccarlo: se una volante lo urta confischerà il denaro senza pagare; se viene distrutto, il bottino va perso.',
      ],
    },
    ambulance: {
      name: 'Ambulanza',
      line: 'Lascia libera la strada davanti a lei',
      brief: 'Sgombra il tratto davanti all\'ambulanza finché non lascia la rotonda.',
      explain: (c) => [
        'In servizio d\'urgenza: entra con preavviso e percorre un lungo tratto della rotonda.',
        'La sezione della rotonda direttamente davanti a lei deve restare sgombra. Mandare un\'auto lì interrompe la corsa e azzera combo e serie.',
        `Mantieni la strada libera finché non esce; ti ricompenserà con ${money(Fmt.number(c.ambulancePay))} e allungherà la tua serie. Non provoca mai incidenti da sola.`,
      ],
    },
    truck: {
      name: 'Camion',
      line: 'Lungo e pesante: lascia più spazio',
      brief: 'I camion sono pesanti: calcola un varco più ampio per la tua auto.',
      explain: (c) => [
        'Fa parte del traffico normale, ma è molto più lungo e pesante di un\'auto comune.',
        'Ha bisogno di più spazio prima di immettersi; in caso di impatto, spinge via le auto leggere invece di inchiodare.',
        `Ogni camion che passa un casello all'inizio del turno frutta ${money(Fmt.number(c.tollPerTruck))}.`,
      ],
    },
    tanker: {
      name: 'Autocisterna',
      line: 'Se distrutta, esplode',
      brief: 'Un\'autocisterna distrutta esplode scagliando via le auto vicine. Dalle spazio.',
      explain: () => [
        'Un camion carico di carburante. Circola come qualsiasi altro camion e si presenta senza preavviso.',
        'Se viene distrutto, esplode: l\'onda d\'urto spazza via dalla strada ogni auto vicina, compresa la tua. Dalle spazio.',
        'Nella modalità Caos è esattamente questo l\'obiettivo: mira alle cisterne per innescare esplosioni a catena.',
      ],
    },
    military: {
      name: 'Camion militare',
      line: 'Stai lontano dal suo raggio',
      brief: 'Tieni tutte le auto fuori dal perimetro del camion militare finché non se ne va.',
      explain: (c) => [
        'Un convoglio militare con esplosivi a bordo. Il braccio d\'ingresso lampeggia e viaggia circondato da una zona di esclusione.',
        'Qualsiasi auto entri nel suo raggio fa detonare il carico, scuotendo l\'intera rotonda.',
        `Trattieni le tue auto mentre passa. Dopo circa ${Math.round(c.militaryTime)} secondi lascerà la rotonda non appena l\'uscita è libera.`,
      ],
    },
    fireTruck: {
      name: 'Camion dei pompieri',
      line: 'Sgombra un lungo tratto',
      brief: 'Mantieni sgombro il tratto davanti ai pompieri finché non escono.',
      explain: (c) => [
        'Servizio di soccorso come l\'ambulanza, ma più pesante, lungo e ingombrante.',
        'Il tratto davanti a lui è più ampio. Immettere un\'auto sulla sua traiettoria interrompe la sirena, azzerando combo e serie.',
        `Tieni la strada sgombra e ti ricompenserà con ${money(Fmt.number(c.fireTruckPay))}, aggiungendo anelli alla tua serie.`,
      ],
    },
    motorbike: {
      name: 'Moto',
      line: 'Si infila in varchi minuscoli',
      brief: 'Le moto entrano in spazi minimi. Sfiorale per ottenere un bonus.',
      explain: (c) => [
        'Agile e stretta: una moto sfrutta spazi che nessuna auto oserebbe prendere, potendo rubare il varco che avevi calcolato.',
        `Sfiorala con un passaggio ravvicinato o un quasi-incidente per ottenere ${Fmt.number(c.motorbikeBonus)} punti extra moltiplicati dalla tua combo.`,
      ],
    },
    learner: {
      name: 'Scuola guida',
      line: 'Dalle spazio, esita alla guida',
      brief: 'Tieni le tue auto fuori dalla zona turchese dell\'auto della scuola guida.',
      explain: (c) => [
        'Un veicolo di prova fa un giro frenando a scatti. Il traffico dietro tende ad accumularsi.',
        'Una fascia turchese indica la sua distanza di sicurezza. Tieni lontane le tue auto mentre circola.',
        `Se lascia la rotonda con spazio sufficiente, pagherà ${money(Fmt.number(c.learnerPay))} e prolungherà la tua serie. Entrare attaccati annulla solo il bonus.`,
      ],
    },
    oversize: {
      name: 'Trasporto eccezionale',
      line: 'Lento e lunghissimo, dagli spazio',
      brief: 'Carico lungo e lento: tieni le tue auto fuori dalla sua fascia ambra.',
      explain: (c) => [
        'Un convoglio speciale molto più lungo di un camion attraversa lentamente la rotonda, rallentando il traffico alle sue spalle.',
        `Una fascia ambra segnala lo spazio necessario davanti e dietro. Lascialo passare e pagherà ${money(Fmt.number(c.oversizePay))} all'uscita.`,
      ],
    },
    racer: {
      name: 'Pilota clandestino',
      line: 'Arrivano in coppia: speronali',
      brief: 'Due piloti irrompono nella rotonda: sperona ciascuno con una volante per il bonus.',
      explain: (c) => [
        'Due bolidi rombano da un altro braccio irrompendo in rosa acceso con strisce bianche in rapida successione.',
        `Speronali con auto della polizia per neutralizzarli: ${money(Fmt.number(c.racerPay))} ciascuno e un anello per la serie. Se scappano non perdi nulla; le auto normali non possono fermarli.`,
      ],
    },
    wedding: {
      name: 'Corteo nuziale',
      line: 'Tre auto: tienile unite',
      brief: 'Un corteo nuziale: tieni le tue auto fuori dalla striscia rosa che le unisce.',
      explain: (c) => [
        'Tre auto ornate di bianco con nastri dorati entrano insieme e compiono il giro al ritmo del traffico.',
        `Una striscia rosa protegge l'intero gruppo. Non interferire e doneranno ${money(Fmt.number(c.weddingPay))} all'uscita senza spezzare la serie.`,
      ],
    },
    bus: {
      name: 'Scuolabus',
      line: 'Si ferma alla fermata',
      brief: 'Gli scuolabus si fermano alla fermata. Inserisciti dietro quando ripartono.',
      explain: (c) => [
        `Esclusivo del percorso scolastico: lunghi bus gialli sostano nella rotonda per circa ${Math.round(c.busDwell * 10) / 10} secondi.`,
        'Il traffico dietro il bus attende pazientemente. L\'occasione migliore per immettersi sorge non appena riparte.',
      ],
    },
  },

  weather: {
    lightRain: {
      line: 'Asfalto scivoloso',
      brief: 'Fondo bagnato: le scivolate durano di più. Lascia più spazio.',
      explain: (c) => [
        `Asfalto umido: le gomme mantengono solo il ${gripIn('lightRain', c)} di aderenza, e i guidatori frenano più dolcemente.`,
        'Le auto impiegano più tempo a fermarsi. Lascia più margine quando ti immetti.',
      ],
    },
    heavyRain: {
      line: 'Meno aderenza, più traffico',
      brief: 'Meno grip e più densità. Attendi varchi completamente liberi.',
      explain: (c) => [
        `Pioggia battente: aderenza al ${gripIn('heavyRain', c)}, reazioni ritardate e traffico più intenso.`,
        'Gli inserimenti a filo terminano facilmente con una collisione. Aspetta varchi ampi e sicuri.',
      ],
    },
    storm: {
      line: 'Guidatori aggressivi',
      brief: 'I guidatori si buttano in ogni varco. Entra con prudenza.',
      explain: (c) => [
        `Tempesta: grip al ${gripIn('storm', c)}, traffico intenso e auto che si infilano in spazi minuscoli.`,
        'La rotonda si intasa in fretta. Calcola bene le tue entrate e fai attenzione a chi cerca di infilarsi.',
      ],
    },
    extreme: {
      line: 'Il peggio del cielo',
      brief: 'Aderenza minima e massimo traffico. La pazienza è fondamentale.',
      explain: (c) => [
        `Temporale estremo: tenuta degli pneumatici al ${gripIn('extreme', c)}, traffico al massimo e automobilisti nervosi.`,
        'Ogni incidente trascina con sé più veicoli. È meglio dare priorità alla cautela rispetto alla fretta.',
      ],
    },
    fog: {
      line: 'L\'altro lato svanisce',
      brief: 'La nebbia nasconde il lato opposto. Occhio alle auto che spuntano.',
      explain: (c) => [
        'Nebbia fitta: il lato opposto scompare dalla vista e i riflessi rallentano.',
        `Osserva il traffico che emerge verso il tuo braccio; gli allarmi restano visibili. Un turno con nebbia paga un extra del ${percent(c.fogPayFactor - 1)}.`,
      ],
    },
    snow: {
      line: 'Ghiaccio sulla carreggiata',
      brief: 'Ghiaccio sull\'asfalto: nessuno frena in tempo. Lascia molto più spazio.',
      explain: (c) => [
        `Neve e ghiaccio: aderenza al ${gripIn('snow', c)}, frenate lunghissime e sbandate marcate.`,
        `Le tue tracce restano impresse nella neve. Lascia molto più spazio del solito. Il turno sulla neve paga un ${percent(c.snowPayFactor - 1)} in più.`,
      ],
    },
    hail: {
      line: 'Freni compromessi',
      brief: 'Grandine: frenate deboli e in ritardo. Lascia spazio dietro a ogni auto.',
      explain: (c) => [
        `Grandine sulle carrozzerie: frenata ridotta al ${percent(c.hailBrake)} e aderenza al ${gripIn('hail', c)}. Traffico leggermente aumentato.`,
        `Un'auto dietro di te impiegherà più tempo a fermarsi. Lascia spazio sia davanti che dietro. Paga un ${percent(c.hailPayFactor - 1)} in più.`,
      ],
    },
    sandstorm: {
      line: 'Polvere sulla rotonda',
      brief: 'Tempesta di sabbia: il lato opposto è coperto dalla polvere. Attento a ciò che ne esce.',
      explain: (c) => [
        `Tempesta di sabbia: la polvere avvolge la rotonda, gli impatti si notano tardi e la sabbia lascia solo il ${gripIn('sandstorm', c)} di grip.`,
        `Fai attenzione al traffico che emerge dalla nube verso il tuo braccio. Paga un bonus del ${percent(c.sandstormPayFactor - 1)}.`,
      ],
    },
  },

  dark: {
    night: {
      line: 'Solo fari e lampioni',
      brief: 'Guarda i fari più che la carrozzeria delle auto.',
      explain: (c) => [
        'Turno notturno: la città si oscura e le auto si distinguono dai fari e dall\'illuminazione pubblica.',
        `Segui i fasci di luce sull'asfalto. Un turno di notte paga un ${percent(c.nightPayFactor - 1)} in più.`,
      ],
    },
    blackout: {
      line: 'Persino i lampioni sono spenti',
      brief: 'Lampioni spenti: solo i fari delle auto svelano la loro posizione.',
      explain: (c) => [
        'Notte con blackout totale: solo i fanali dei veicoli rivelano dove si trovano.',
        `Paga un bonus del ${percent(c.blackoutPayFactor - 1)}. Il Fantasma, quarto boss del sindacato, colpisce solo a luci spente.`,
      ],
    },
  },

  event: {
    roadworks: {
      line: 'Tratto a passo d\'uomo nella rotonda',
      brief: 'Le auto rallentano vicino ai cantieri, scombussolando i varchi usuali.',
      explain: (c) => [
        `Lavori stradali in un settore: la velocità del traffico scende al ${percent(c.roadworksSpeedFactor)}.`,
        'I veicoli si incolonnano dietro ai cantieri, modificando gli spazi al passaggio. Osserva dove si forma l\'ingorgo.',
      ],
    },
    roadClosure: {
      line: 'Un braccio sbarrato',
      brief: 'Un braccio chiuso: meno traffico in ingresso e nessuna auto esce da lì.',
      explain: () => [
        'Uno dei bracci è interrotto: nessun veicolo entra o esce da quell\'accesso.',
        'Il traffico proviene da meno direzioni e sfrutta meno uscite. Succede solo nelle rotonde a quattro o più bracci.',
      ],
    },
    concert: {
      line: 'Tutta la città in movimento',
      brief: 'Molte più auto nella rotonda. Cogli al volo ogni buon varco appena lo noti.',
      explain: (c) => [
        `Fine di un concerto: ${c.concertDensityBonus} auto in più e flusso continuo raddoppiato.`,
        'I varchi scarseggiano e durano poco. Approfitta di ogni spazio decente senza aspettare quello ideale.',
      ],
    },
    vipConvoy: {
      line: 'Varchi ampi, più auto',
      brief: 'Distanza di sicurezza aumentata: spazi larghi e un nuovo ritmo.',
      explain: (c) => [
        `Un dignitario in città: un'auto in più nella rotonda e distanze più ampie del ${percent(c.vipGapFactor - 1)}.`,
        'Gli spazi tra le vetture sono abbondanti ma il ritmo cambia. Adatta le tue partenze al nuovo passo.',
      ],
    },
    policeOperation: {
      line: 'Più polizia nella tua coda',
      brief: 'Più volanti nella tua coda: più occasioni di arresto.',
      explain: (c) => [
        `Operazione di polizia: il ${percent(c.policeOperationShare)} in più delle tue auto saranno volanti.`,
        'I criminali sono più facili da intercettare e ogni volante è una chance di cattura. Sfruttale al massimo.',
      ],
    },
    marathon: {
      line: 'I corridori attraversano un braccio',
      brief: 'I maratoneti bloccano un braccio a intervalli: le auto aspettano e poi entrano in blocco.',
      explain: (c) => [
        `Una maratona attraversa la città. Ogni ${c.marathonPeriod} secondi i corridori attraversano uno dei bracci, fermandone il flusso per ${c.marathonCrossing} secondi.`,
        'Terminato il passaggio, le auto ferme partono tutte insieme. Previeni l\'ondata e sfrutta le pause di calma.',
      ],
    },
    schoolRun: {
      line: 'Autobus che sostano nella rotonda',
      brief: 'Scuolabus nella rotonda. Entra subito dietro a uno appena riparte.',
      explain: (c) => [
        `Uscita dalle scuole: gli scuolabus si uniscono al traffico, sostando ${Math.round(c.busDwell * 10) / 10} secondi alla loro fermata.`,
        'Il traffico alle loro spalle si arresta. La tua finestra migliore si apre nell\'istante in cui il bus riparte.',
      ],
    },
  },

  road: {
    line: 'Calcola i varchi su entrambe le corsie',
    brief: 'La freccia sulla tua linea d\'arresto indica verso quale corsia si dirige l\'auto.',
    explain: (c) => [
      `A partire dal livello ${c.twoLaneLevel}, la rotonda aggiunge una corsia interna. Entrambe ruotano coordinate e le auto le usano entrambe.`,
      'Una freccia davanti alla tua linea mostra la direzione dell\'auto: dritto sulla corsia esterna o attraverso di essa verso l\'interno.',
      'Un\'auto diretta alla corsia interna ha bisogno di un varco all\'esterno per passare e di uno all\'interno per immettersi. Le auto che lasciano la corsia interna attraversano a loro volta quella esterna.',
    ],
  },

  fail: {
    mergeCrash: {
      name: 'Scontro in immissione',
      line: 'Hai urtato l’auto davanti a te',
      brief: 'La tua auto ha urtato quella davanti mentre si immetteva.',
      explain: (c) => [
        'La tua auto si è immessa troppo vicino a un’altra e l’ha tamponata. Conta contro di te solo lo scontro di un’auto che si sta immettendo.',
        `Un turno regge ${c.maxStrikes === 1 ? 'nessuno scontro' : `${c.maxStrikes - 1} ${c.maxStrikes === 2 ? 'scontro' : 'scontri'}`}: il successivo lo chiude.`,
        'Guarda l’auto davanti al tuo punto di immissione, non solo quella dietro. Se il varco davanti è corto, lasciala passare e prendi il prossimo.',
      ],
    },
    cutOffCrash: {
      name: 'Scontro per taglio',
      line: 'C’era un’auto attaccata dietro di te',
      brief: 'Un’auto dietro di te non è riuscita a frenare e ha urtato la tua in immissione.',
      explain: () => [
        'Ti sei immesso proprio davanti a un’auto che non è riuscita a frenare in tempo, e ha tamponato la tua auto in immissione. È uno scontro e conta contro di te.',
        'Guarda anche le auto che arrivano da dietro. Con pioggia, neve e grandine serve loro più spazio, e a un camion ancora di più.',
        'Un Tight Fit va bene, un’auto che deve frenare forte no: aspetta che il varco dietro di te si apra.',
      ],
    },
    ringCrash: {
      name: 'Scontro sull’anello',
      line: 'Un’auto tua si è schiantata sull’anello',
      brief: 'Un’auto che hai mandato si è schiantata sull’anello.',
      explain: () => [
        'Un’auto resta tua finché non ha passato la prima uscita. Uno scontro sull’anello prima di allora, in un tamponamento a catena o contro un relitto, conta comunque.',
        'Non mandare un’auto in un anello con relitti, coda o un’auto che sta per frenare. Aspetta che la strada si liberi.',
      ],
    },
    policeCrash: {
      name: 'Scontro della polizia',
      line: 'Troppe pattuglie distrutte',
      brief: 'Troppe delle tue auto della polizia si sono schiantate.',
      explain: (c) => [
        `Le auto della polizia sono più robuste: un turno regge ${c.maxPoliceCrashes === 1 ? 'uno scontro della polizia' : `${c.maxPoliceCrashes} scontri della polizia`}. Il successivo lo chiude.`,
        'Manda un’auto della polizia solo contro un criminale e tienila lontana dal portavalori e dal resto del traffico.',
      ],
    },
    bomb: {
      name: 'Bomba',
      line: 'Un’auto ha fatto esplodere la bomba',
      brief: 'Un’auto è entrata nella zona del camion militare e ha fatto esplodere la bomba.',
      explain: () => [
        'Una tua auto è entrata nella zona vietata del camion militare e ha fatto esplodere la sua bomba. L’esplosione raggiunge tutta la rotonda e chiude subito il turno.',
        'Trattieni le tue auto mentre il camion passa. La zona è segnata sull’anello e un avviso mostra il braccio da cui arriva.',
      ],
    },
    escape: {
      name: 'Criminale fuggito',
      line: 'Il criminale è fuggito',
      brief: 'Un criminale è fuggito: nessuna auto della polizia l’ha speronato in tempo.',
      explain: (c) => [
        `Un criminale resta circa ${Math.round(c.criminalTime)} secondi sull’anello. Nessuna tua auto della polizia l’ha speronato in quel tempo, quindi è fuggito con i soldi e il turno è finito.`,
        'Quando un avviso illumina un braccio, tieni un’auto della polizia in testa alla coda (il pulsante di invio ne mette una per prima). Le auto normali non possono fermarlo.',
      ],
    },
    bossEscape: {
      name: 'Boss sfuggito',
      line: 'Il boss è sfuggito',
      brief: 'Il boss del sindacato è sfuggito.',
      explain: () => [
        'Il capo del sindacato è sfuggito. Un boss ha più tempo di un criminale comune, ma anche scorte, blindatura o un trucco suo, e il turno è perso appena se ne va.',
        'Ogni boss è esposto nello scaffale «Boss», con il modo di fermarlo. Tieni auto della polizia nella tua coda.',
      ],
    },
    ruleCrash: {
      name: 'Regola infranta: scontro',
      line: 'Uno scontro ha infranto la regola',
      brief: 'Uno scontro ha infranto la regola di questo turno.',
      explain: () => [
        'Le prove e i turni leggendari come Tolleranza zero hanno una regola propria, e uno scontro la infrange subito: non resta nessun errore.',
        'La regola è sulla schermata iniziale. Aspetta varchi chiaramente abbastanza grandi.',
      ],
    },
    ruleCutOff: {
      name: 'Regola infranta: taglio',
      line: 'Un taglio ha infranto la regola',
      brief: 'Hai tagliato la strada a un’auto e questo ha infranto la regola del turno.',
      explain: () => [
        'Una regola di questo turno vieta di tagliare la strada. Immettersi proprio davanti a un’auto che deve frenare forte conta come taglio e chiude il turno.',
        'Prendi varchi che lascino all’auto dietro lo spazio per scorrere. Un Tight Fit è permesso, un taglio no.',
      ],
    },
  },
};

export default museum;
