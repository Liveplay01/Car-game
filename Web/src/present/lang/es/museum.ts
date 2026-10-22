import type { Translation } from '../../strings';
import { Fmt, money, percent } from '../../format';
import { gripIn } from '../../museumText';

/** Español: los textos del museo. */
const museum: Translation['museum'] = {
  boss: {
    convoy: {
      line: 'Escoltas inmediatamente detrás',
      brief: 'Embiste al jefe con un coche de policía en el hueco antes de sus escoltas.',
      explain: () => [
        'El líder del sindicato, en negro con rayas doradas. Sus escoltas blindadas le siguen de cerca al entrar en la rotonda.',
        'Introduce un coche de policía en el espacio entre el jefe y sus escoltas. Chocar contra una escolta cuenta como un accidente común.',
        'Tienes más tiempo que con un criminal común: aprovéchalo para esperar el hueco idóneo.',
      ],
    },
    getaway: {
      line: 'Se escapa en segundos',
      brief: 'Se escapa en segundos: ten listo un coche de policía y embístelo de inmediato.',
      explain: () => [
        'Sin escoltas, solo pura velocidad: el conductor de huida desaparece en pocos segundos.',
        'Mantén un coche de policía al frente de tu cola antes de que acabe su aviso y envíalo en cuanto el jefe toque el asfalto.',
      ],
    },
    armoured: {
      line: 'Requiere dos coches de policía',
      brief: 'Embístelo dos veces: el primer coche patrulla solo destruye el blindaje.',
      explain: () => ['Su blindaje absorbe el primer impacto, y una escolta no se separa de él.', 'Un coche de policía destruye el blindaje; un segundo acaba con él. Mantén dos preparados en tu cola.'],
    },
    phantom: {
      line: 'Conduce sin luces',
      brief: 'Sin luces: sigue su aviso y embístelo con un coche de policía.',
      explain: () => [
        'Aparece en pleno apagón y sin luces encendidas: solo lo verás bajo la luz de las farolas.',
        'Sigue la curva de la rotonda y confía en su aviso. Lleva una escolta detrás, así que calcula bien el hueco.',
      ],
    },
    twins: {
      line: 'Atrapa a uno, el otro aparece',
      brief: 'Dos jefes: el segundo entra en cuanto capturas al primero.',
      explain: (c) => [
        'Los gemelos dirigen juntos el sindicato. Son dos y llegan en orden: al capturar al primero, el segundo ya asoma por otro ramal.',
        `Sin escoltas, unos ${Math.round(c.criminalTime * c.twinsTimeFactor)} segundos cada uno. Solo recuperarás el botín si capturas a ambos. Ten un segundo coche patrulla preparado.`,
      ],
    },
    decoy: {
      line: 'Sus escoltas llevan sus mismos colores',
      brief: 'Escoltas idénticas: embiste a la camioneta con plataforma abierta y anillo.',
      explain: () => [
        'Las escoltas del señuelo están pintadas como el propio jefe, negro con franja dorada, para engañar a tus patrullas.',
        'El verdadero jefe es la camioneta: plataforma abierta y anillo de cuenta atrás alrededor. Los demás son furgones blindados; chocar contra ellos es un accidente normal.',
      ],
    },
    smuggler: {
      line: 'Requiere tres coches de policía',
      brief: 'Doble blindaje: necesita tres coches patrulla. Alinéalos.',
      explain: (c) => [
        'El contrabandista viaja solo pero con blindaje pesado: las dos primeras patrullas solo lo dañan, la tercera lo detiene.',
        `Permanece unos ${Math.round(c.criminalTime * c.smugglerTimeFactor)} segundos, suficiente para tres intentos si tu cola conserva las patrullas.`,
      ],
    },
    kingpin: {
      line: 'El cerebro de todo',
      brief: 'Escoltas camufladas, en la oscuridad: embiste a la camioneta con el anillo dos veces.',
      explain: () => [
        'El Capo llega al final, en pleno apagón, con tres escoltas camufladas y un blindaje capaz de resistir un choque.',
        'Identifica su silueta en la sombra: el jefe es la camioneta con el anillo. Dos coches patrulla en el espacio posterior lo derribarán.',
      ],
    },
  },

  special: {
    police: {
      name: 'Coche patrulla',
      line: 'El único coche capaz de detener a un criminal',
      brief: 'Más resistente que tus coches. El botón de aviso coloca uno al frente.',
      explain: (c) => [
        'Los coches de policía salen de tu propia cola como cualquier otro vehículo. Son los únicos capaces de detener a los criminales.',
        `Envíalo a la rotonda mientras haya un criminal e impacta contra él: cuenta como captura, vale ${Fmt.number(c.takedownPoints)} puntos y suma un eslabón a tu cadena. Retén una patrulla cuando un ramal se ilumine con advertencia.`,
        `Una patrulla es más resistente: tu turno soporta ${c.maxPoliceCrashes === 1 ? 'un choque policial' : `${c.maxPoliceCrashes} choques policiales`}. Mantenlo alejado del furgón blindado.`,
      ],
    },
    pickup: {
      name: 'Criminal',
      line: 'Embístelo con un coche de policía',
      brief: 'Estrella una patrulla contra la camioneta de anillo violeta antes de que huya.',
      explain: (c) => [
        'Una advertencia ilumina el ramal por el que entrará. Se cuela en la rotonda a toda velocidad, temerario y pesado.',
        `Tienes unos ${Math.round(c.criminalTime)} segundos para embestirlo con una de tus patrullas. Cada captura otorga ${Fmt.number(c.takedownPoints)} puntos y extiende tu cadena.`,
        'Si escapa, se lleva dinero y termina el turno. Tus coches comunes no pueden detenerlo: chocar con ellos solo causa un accidente.',
      ],
    },
    transporter: {
      name: 'Furgón blindado',
      line: 'Déjalo pasar sin tocarlo y cobra',
      brief: 'Deja pasar al furgón blindado: paga cuando sale de la rotonda.',
      explain: (c) => [
        'Un vehículo blindado repleto de dinero. Un aviso señala su entrada; luego da una vuelta a la rotonda con una zona de seguridad a su alrededor.',
        `Si sale sano y salvo, ganas ${money(Fmt.number(c.transporterPay))} y un eslabón para tu cadena. Cada coche tuyo que entre dentro de su zona segura añade ${money(Fmt.number(c.shieldBonus))}.`,
        'No lo toques: una patrulla que choque contra él confiscará el dinero sin pagar; si el furgón se destruye, el botín se pierde.',
      ],
    },
    ambulance: {
      name: 'Ambulancia',
      line: 'Mantén la vía despejada delante de ella',
      brief: 'Despeja el tramo frente a la ambulancia hasta que abandone la rotonda.',
      explain: (c) => [
        'En servicio de urgencia: entra con advertencia y recorre un tramo amplio de la rotonda.',
        'La sección de la rotonda justo delante de ella debe permanecer vacía. Si envías un coche ahí, interrumpirás su trayecto y perderás el combo y la cadena.',
        `Mantén el paso libre hasta que salga; te pagará ${money(Fmt.number(c.ambulancePay))} y ampliará tu cadena. Jamás provoca accidentes por sí misma.`,
      ],
    },
    truck: {
      name: 'Camión',
      line: 'Largo y pesado: deja un hueco mayor',
      brief: 'Los camiones son pesados: calcula un hueco más amplio para tu coche.',
      explain: (c) => [
        'Parte del tráfico regular, pero mucho más largo y pesado que un coche común.',
        'Necesita más espacio libre ante tu coche; en caso de colisión, empuja a los vehículos ligeros en lugar de frenar en seco.',
        `Cada camión que cruza un peaje al principio del turno aporta ${money(Fmt.number(c.tollPerTruck))}.`,
      ],
    },
    tanker: {
      name: 'Cisterna de gas',
      line: 'Si se destruye, explota',
      brief: 'Una cisterna destruida estalla despidiendo a los coches cercanos. Dale espacio.',
      explain: () => [
        'Un camión cargado de combustible. Circula como cualquier otro camión y aparece sin aviso previo.',
        'Si se destruye, estalla: la onda expansiva saca a cualquier coche cercano de la carretera, incluido el tuyo. Dale espacio.',
        'En el modo Caos ese es precisamente el objetivo: apunta a las cisternas para encadenar explosiones masivas.',
      ],
    },
    military: {
      name: 'Camión militar',
      line: 'Aléjate de su zona',
      brief: 'Mantén a todos los coches fuera del radio del camión militar hasta que se marche.',
      explain: (c) => [
        'Un convoy militar con explosivos a bordo. Su ramal emite una alerta y circula rodeado por una zona de exclusión.',
        'Cualquier coche que ingrese en su perímetro detonará la carga, sacudiendo toda la rotonda.',
        `Retén tus coches mientras pasa. Tras unos ${Math.round(c.militaryTime)} segundos abandonará la rotonda en cuanto la salida esté despejada.`,
      ],
    },
    fireTruck: {
      name: 'Camión de bomberos',
      line: 'Despeja un tramo largo',
      brief: 'Mantén despejado el tramo frente a los bomberos hasta que salgan.',
      explain: (c) => [
        'Servicio de emergencia como la ambulancia, pero más pesado, largo y ocupando más carretera.',
        'El sector frente a él es más amplio. Enviar un coche en su camino interrumpe la urgencia, cortando combo y cadena.',
        `Mantén la calle despejada y te recompensará con ${money(Fmt.number(c.fireTruckPay))}, sumando eslabones a tu cadena.`,
      ],
    },
    motorbike: {
      name: 'Moto',
      line: 'Se cuela en huecos minúsculos',
      brief: 'Las motos caben en huecos muy pequeños. Pasa rozándola para ganar bonus.',
      explain: (c) => [
        'Ágil y estrecha: una moto aprovecha huecos que ningún coche tomaría, pudiendo arrebatarte el espacio que habías calculado.',
        `Pasa cerca de ella con un hueco ajustado o casi choque para sumar ${Fmt.number(c.motorbikeBonus)} puntos extra multiplicados por tu combo.`,
      ],
    },
    learner: {
      name: 'Coche de autoescuela',
      line: 'Dale espacio, duda al volante',
      brief: 'Mantén tus coches fuera de la franja turquesa del coche de autoescuela.',
      explain: (c) => [
        'Un vehículo de prácticas da una vuelta frenando de improviso. El tráfico a su espalda tiende a acumularse.',
        'Una franja turquesa señala su perímetro de seguridad. Mantén tus coches alejados mientras circula.',
        `Si abandona la rotonda con espacio de sobra, pagará ${money(Fmt.number(c.learnerPay))} y prolongará tu cadena. Entrar pegado solo anula el bonus.`,
      ],
    },
    oversize: {
      name: 'Transporte especial',
      line: 'Lento y largo, dale margen',
      brief: 'Carga larga y lenta: mantén tus vehículos fuera de su franja ámbar.',
      explain: (c) => [
        'Un convoy especial mucho más largo que un camión recorre lentamente la rotonda, ralentizando el tráfico tras de sí.',
        `Una franja ámbar indica el margen necesario delante y detrás. Dale espacio y pagará ${money(Fmt.number(c.oversizePay))} al marcharse.`,
      ],
    },
    racer: {
      name: 'Piloto callejero',
      line: 'Vienen de dos en dos: embístelos',
      brief: 'Dos pilotos irrumpen en la rotonda: embiste a cada uno con una patrulla para ganar bonus.',
      explain: (c) => [
        'Dos bólidos rugen desde otro ramal irrumpiendo en rosa chillón con rayas blancas en rápida sucesión.',
        `Embístelos con coches de policía para neutralizarlos: ${money(Fmt.number(c.racerPay))} cada uno y un eslabón para tu cadena. Si escapan no pasa nada; tus coches comunes no pueden detenerlos.`,
      ],
    },
    wedding: {
      name: 'Comitiva de boda',
      line: 'Tres coches: mantenlos agrupados',
      brief: 'Una comitiva de boda: mantén tus vehículos fuera de la franja rosa que los une.',
      explain: (c) => [
        'Tres coches engalanados de blanco con lazos dorados entran juntos y dan la vuelta al compás del tráfico.',
        `Una franja rosa protege al grupo completo. No interfieras y abonarán ${money(Fmt.number(c.weddingPay))} al salir sin romper tu cadena.`,
      ],
    },
    drift: {
      name: 'Coche de drift',
      line: 'Raro: derrapa por una rotonda tranquila',
      brief: 'Un coche de drift derrapa de lado por la rotonda. Cuidado con su cola.',
      explain: () => [
        'Muy de vez en cuando, cuando la rotonda se ha calmado, un cupé preparado entra por otro brazo y la recorre de lado: ruedas humeando, turbo silbando, goma en el asfalto.',
        'Su cola sale por el carril, y esa cola es sólida. Déjale sitio y disfruta del espectáculo: sin bonus, sin banda.',
      ],
    },
    bus: {
      name: 'Autobús escolar',
      line: 'Para en la parada',
      brief: 'Los autobuses escolares paran en la parada. Incorpórate detrás cuando arranque.',
      explain: (c) => [
        `Exclusivo de la ruta escolar: largos autobuses amarillos paran en la rotonda unos ${Math.round(c.busDwell * 10) / 10} segundos.`,
        'El tráfico tras el autobús se detiene pacientemente. La mejor ocasión para incorporarse surge en cuanto reanuda la marcha.',
      ],
    },
  },

  weather: {
    lightRain: {
      line: 'Asfalto resbaladizo',
      brief: 'Suelo mojado: los choques se deslizan más. Deja más distancia.',
      explain: (c) => [
        `Asfalto húmedo: los neumáticos retienen solo el ${gripIn('lightRain', c)} de su agarre, y los conductores frenan con mayor suavidad.`,
        'Los coches tardan más en detenerse. Deja más margen al incorporarte.',
      ],
    },
    heavyRain: {
      line: 'Menos agarre, más tráfico',
      brief: 'Menos agarre y más densidad. Espera a tener huecos totalmente claros.',
      explain: (c) => [
        `Lluvia torrencial: agarre al ${gripIn('heavyRain', c)}, reacciones más tardías y mayor volumen de tráfico.`,
        'Las incorporaciones justas terminan fácilmente en colisión. Espera huecos amplios y seguros.',
      ],
    },
    storm: {
      line: 'Conductores agresivos',
      brief: 'Los conductores se meten en cualquier hueco. Entra con cautela.',
      explain: (c) => [
        `Tormenta: agarre al ${gripIn('storm', c)}, tráfico denso y coches colándose en huecos mínimos.`,
        'La rotonda se satura con rapidez. Calcula bien tus entradas y fíjate en quién intenta meterse.',
      ],
    },
    extreme: {
      line: 'Lo peor del cielo',
      brief: 'Agarre mínimo y máximo tráfico. La paciencia es oro.',
      explain: (c) => [
        `Temporal extremo: agarre de neumáticos al ${gripIn('extreme', c)}, tráfico al máximo y conductores tensos.`,
        'Cualquier choque arrastra a varios vehículos. Conviene priorizar la prudencia sobre la prisa.',
      ],
    },
    fog: {
      line: 'El otro lado se difumina',
      brief: 'La niebla oculta el lado opuesto. Atento a los coches que emergen.',
      explain: (c) => [
        'Niebla densa: el extremo opuesto desaparece de la vista y las reacciones son más lentas.',
        `Vigila el tráfico que emerge hacia tu ramal; los avisos siguen siendo visibles. Un turno con niebla paga un ${percent(c.fogPayFactor - 1)} extra.`,
      ],
    },
    snow: {
      line: 'Hielo en la calzada',
      brief: 'Hielo en el asfalto: nadie frena a tiempo. Deja mucho más espacio.',
      explain: (c) => [
        `Nieve y hielo: agarre al ${gripIn('snow', c)}, frenadas muy largas y derrapes pronunciados.`,
        `Tus huellas quedan marcadas en la nieve. Deja mucho más espacio de lo habitual. Turno con nieve paga un ${percent(c.snowPayFactor - 1)} más.`,
      ],
    },
    hail: {
      line: 'Frenos comprometidos',
      brief: 'Granizo: frenadas deficientes y tardías. Deja espacio tras cada coche.',
      explain: (c) => [
        `Granizo golpeando las carrocerías: frenada reducida al ${percent(c.hailBrake)} y agarre al ${gripIn('hail', c)}. Tráfico ligeramente aumentado.`,
        `Un coche tras de ti tardará más en detenerse. Deja espacio tanto por delante como por detrás. Paga un ${percent(c.hailPayFactor - 1)} más.`,
      ],
    },
    sandstorm: {
      line: 'Polvo sobre la rotonda',
      brief: 'Tormenta de arena: el lado opuesto queda tapado por el polvo. Cuidado con lo que sale de él.',
      explain: (c) => [
        `Tormenta de arena: el polvo cubre la rotonda, los choques se perciben tarde y la arena deja solo el ${gripIn('sandstorm', c)} de agarre.`,
        `Vigila el tráfico que emerge del polvo hacia tu ramal. Paga un ${percent(c.sandstormPayFactor - 1)} extra.`,
      ],
    },
  },

  dark: {
    night: {
      line: 'Solo faros y farolas',
      brief: 'Fíjate en los faros más que en la carrocería de los coches.',
      explain: (c) => [
        'Turno nocturno: la ciudad queda a oscuras y los coches se distinguen por sus luces y las farolas de la calle.',
        `Guíate por los haces de luz en la calzada. Un turno de noche paga un ${percent(c.nightPayFactor - 1)} más.`,
      ],
    },
    blackout: {
      line: 'Incluso las farolas se apagan',
      brief: 'Farolas apagadas: solo los faros de los coches delatan su posición.',
      explain: (c) => [
        'Noche con corte de luz general: únicamente los faros de los vehículos revelan su ubicación.',
        `Paga un ${percent(c.blackoutPayFactor - 1)} extra. El Fantasma, cuarto jefe del sindicato, solo ataca en pleno apagón.`,
      ],
    },
  },

  event: {
    roadworks: {
      line: 'Tramo lento en la rotonda',
      brief: 'Los coches reducen la marcha en las obras, alterando los huecos habituales.',
      explain: (c) => [
        `Obras en un sector: el tráfico reduce su velocidad al ${percent(c.roadworksSpeedFactor)}.`,
        'Los vehículos se acumulan tras las obras, alterando los espacios al cruzarlas. Observa dónde se forma la retención.',
      ],
    },
    roadClosure: {
      line: 'Un ramal cortado',
      brief: 'Un ramal cerrado: entra menos tráfico y ningún coche sale por ahí.',
      explain: () => [
        'Uno de los ramales está cortado: no entra ni sale tráfico por ese acceso.',
        'El tráfico procede de menos direcciones y utiliza menos salidas. Solo ocurre en rotondas de cuatro o más ramales.',
      ],
    },
    concert: {
      line: 'Toda la ciudad en marcha',
      brief: 'Muchos más coches en la rotonda. Aprovecha cualquier buen hueco en cuanto lo veas.',
      explain: (c) => [
        `Fin de un concierto: ${c.concertDensityBonus} coches adicionales y el doble de afluencia constante.`,
        'Los huecos escasean y duran poco. Aprovecha cualquier hueco razonable sin esperar al ideal.',
      ],
    },
    vipConvoy: {
      line: 'Huecos amplios, más coches',
      brief: 'Mayor distancia de seguridad: huecos anchos y un nuevo compás.',
      explain: (c) => [
        `Un mandatario en la ciudad: un coche más en la rotonda y distancias un ${percent(c.vipGapFactor - 1)} más holgadas.`,
        'Los espacios entre coches son amplios pero su ritmo varía. Ajusta tus entradas al nuevo compás.',
      ],
    },
    policeOperation: {
      line: 'Más policía en tu cola',
      brief: 'Más coches patrulla en tu cola: más ocasiones de arresto.',
      explain: (c) => [
        `Despliegue policial: un ${percent(c.policeOperationShare)} más de tus coches serán patrullas.`,
        'Los criminales resultan más fáciles de atrapar y cada patrulla es una oportunidad de arresto. Aprovéchalas.',
      ],
    },
    marathon: {
      line: 'Corredores cruzan un ramal',
      brief: 'Los corredores cortan un ramal periódicamente: sus coches esperan y luego entran en masa.',
      explain: (c) => [
        `Un maratón cruza la ciudad. Cada ${c.marathonPeriod} segundos los corredores cruzan uno de los ramales, deteniendo su tráfico durante ${c.marathonCrossing} segundos.`,
        'Al terminar de cruzar, todos los coches retenidos entran a la vez. Anticípate a la oleada y aprovecha los momentos de calma.',
      ],
    },
    schoolRun: {
      line: 'Autobuses parando en la rotonda',
      brief: 'Autobuses escolares en la rotonda. Entra justo detrás de uno cuando reanude la marcha.',
      explain: (c) => [
        `Salida de colegios: autobuses escolares se incorporan al tráfico, parando ${Math.round(c.busDwell * 10) / 10} segundos en su parada de la rotonda.`,
        'El tráfico tras el autobús se detiene. Tu mejor oportunidad se abre en el instante en que el autobús se pone en movimiento.',
      ],
    },
  },

  road: {
    line: 'Calcula los huecos en ambos carriles',
    brief: 'La flecha en tu línea de detención indica a qué carril se dirige tu coche.',
    explain: (c) => [
      `A partir del nivel ${c.twoLaneLevel}, la rotonda añade un carril interior. Ambos giran coordinados y el tráfico utiliza los dos.`,
      'Una flecha frente a tu línea indica el destino de tu coche: recto al carril exterior o cruzándolo hacia el interior.',
      'Un coche que se dirige al carril interior necesita un hueco en el exterior para cruzar y otro en el interior para incorporarse. Los coches que dejan el carril interior cruzan también el exterior.',
    ],
  },

  fail: {
    mergeCrash: {
      name: 'Choque al incorporarse',
      line: 'Has golpeado al coche que iba delante',
      brief: 'Tu coche golpeó al de delante al incorporarse.',
      explain: (c) => [
        'Tu coche entró en la rotonda demasiado pegado a otro y chocó con él. Solo cuenta el choque de un coche que estás incorporando.',
        `Un turno aguanta ${c.maxStrikes === 1 ? 'ningún choque' : `${c.maxStrikes - 1} ${c.maxStrikes === 2 ? 'choque' : 'choques'}`}: el siguiente lo termina.`,
        'Mira el coche que va delante de tu incorporación, no solo el de detrás. Si el hueco de delante es corto, deja pasar y toma el siguiente.',
      ],
    },
    cutOffCrash: {
      name: 'Choque por cierre',
      line: 'Había un coche pegado detrás de ti',
      brief: 'Un coche de detrás no pudo frenar y golpeó al tuyo al incorporarse.',
      explain: () => [
        'Entraste justo delante de un coche que no pudo frenar a tiempo, y chocó con tu coche al incorporarse. Es un choque y cuenta en tu contra.',
        'Mira también los coches que se acercan por detrás. Necesitan más espacio con lluvia, nieve y granizo, y un camión el que más.',
        'Un Tight Fit está bien; un coche que tiene que frenar a fondo, no: espera a que se abra el hueco de detrás.',
      ],
    },
    ringCrash: {
      name: 'Choque en la rotonda',
      line: 'Un coche tuyo chocó en la rotonda',
      brief: 'Un coche que enviaste chocó en la rotonda.',
      explain: () => [
        'Un coche sigue siendo tuyo hasta que pasa la primera salida. Un choque en la rotonda antes de eso, en un accidente en cadena o contra un siniestro, también cuenta.',
        'No envíes un coche a una rotonda con siniestros, atasco o un coche a punto de frenar. Espera a que la calzada se despeje.',
      ],
    },
    policeCrash: {
      name: 'Choque de policía',
      line: 'Demasiados coches patrulla han chocado',
      brief: 'Demasiados de tus coches patrulla han chocado.',
      explain: (c) => [
        `Los coches patrulla aguantan más que los demás: un turno resiste ${c.maxPoliceCrashes === 1 ? 'un choque de policía' : `${c.maxPoliceCrashes} choques de policía`}. El siguiente lo termina.`,
        'Envía un coche patrulla solo contra un criminal y mantenlo lejos del transporte de dinero y del resto del tráfico.',
      ],
    },
    bomb: {
      name: 'Bomba',
      line: 'Un coche detonó la bomba',
      brief: 'Un coche entró en la zona del camión militar y detonó la bomba.',
      explain: () => [
        'Uno de tus coches entró en la zona prohibida del camión militar y detonó su bomba. La explosión alcanza toda la rotonda y termina el turno al instante.',
        'Frena tus coches mientras pasa el camión. La zona está marcada en el anillo y un aviso muestra el brazo por el que llega.',
      ],
    },
    escape: {
      name: 'Criminal escapado',
      line: 'El criminal ha escapado',
      brief: 'Un criminal escapó: ningún coche patrulla lo embistió a tiempo.',
      explain: (c) => [
        `Un criminal permanece unos ${Math.round(c.criminalTime)} segundos en el anillo. Ningún coche patrulla suyo lo embistió en ese tiempo, así que escapó con el dinero y el turno terminó.`,
        'Cuando un aviso ilumine un brazo, ten un coche patrulla al frente de tu cola (el botón de envío pone uno primero). Tus coches normales no pueden detenerlo.',
      ],
    },
    bossEscape: {
      name: 'Jefe escapado',
      line: 'El jefe ha escapado',
      brief: 'El jefe del sindicato escapó.',
      explain: () => [
        'El jefe del sindicato escapó. Tiene más tiempo que un criminal normal, pero también escoltas, blindaje o un truco propio, y el turno se pierde en cuanto se va.',
        'Todos los jefes están en el estante «Jefes», con cómo detenerlos. Ten coches patrulla en tu cola.',
      ],
    },
    ruleCrash: {
      name: 'Regla rota: choque',
      line: 'Un choque rompió la regla',
      brief: 'Un choque rompió la regla de este turno.',
      explain: () => [
        'Las pruebas y los turnos legendarios como Tolerancia cero tienen una regla propia, y un choque la rompe al instante: no sobra ningún error.',
        'La regla aparece en la pantalla de inicio. Espera huecos claramente suficientes.',
      ],
    },
    ruleCutOff: {
      name: 'Regla rota: cierre',
      line: 'Cerrar el paso rompió la regla',
      brief: 'Cerraste el paso a un coche y eso rompió la regla de este turno.',
      explain: () => [
        'Una regla de este turno prohíbe cerrar el paso. Incorporarse justo delante de un coche que debe frenar a fondo cuenta como cierre y termina el turno.',
        'Toma huecos que dejen al coche de detrás espacio para rodar. Un Tight Fit está permitido; cerrar el paso, no.',
      ],
    },
  },
};

export default museum;
