import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { Fmt, money } from '../../format';

/** Español, Parte 3: Títulos, Pase de temporada, Salón de la fama, Modos, Mutadores, Tours. */
export default (S: Strings): Words<Strings> => ({
  titles: {
    name: (id) =>
      ({
        eliteDriver: 'Conductor de élite',
        roadVeteran: 'Veterano del asfalto',
        ringMaster: 'Amo del anillo',
        ironNerves: 'Nervios de acero',
        roadRoyalty: 'Realeza vial',
        livingLegend: 'Leyenda viva',
        precisionDriver: 'Conductor de precisión',
        comboMaster: 'Maestro del combo',
        closeCallArtist: 'Artista del roce',
        syndicateBreaker: 'Destructor del sindicato',
        nightOwl: 'Búho nocturno',
        stormChaser: 'Cazatormentas',
        legendHunter: 'Cazador de leyendas',
        starDriver: 'Conductor estelar',
        marathoner: 'Maratoniano',
        overdriver: 'Overdriver',
        endless: 'Sin fin',
        scorcher: 'Fogoso',
        inferno: 'Infierno',
        meltdown: 'Fusión',
        patron: 'Mecenas',
        benefactor: 'Benefactor',
        philanthropist: 'Filántropo',
        visionary: 'Visionario',
        sovereign: 'Soberano',
        timeless: 'Eterno',
        apex: 'Ápex',
        boundless: 'Ilimitado',
        ascended: 'Ascendido',
        eternal: 'Inmortal',
        grandmaster: 'Gran maestro',
        centurion: 'Centurión',
        immortal: 'Imperecedero',
        roadWarden: 'Guardián del camino',
        gridlord: 'Señor del grid',
        ringbearer: 'Portador del anillo',
        unstoppable: 'Imparable',
        timekeeper: 'Guardián del tiempo',
        paragon: 'Modelo a seguir',
        mythic: 'Mítico',
        ringEternal: 'Anillo eterno',
        mastermind: 'Cerebro',
        summit: 'Cima',
        syndicateEnd: 'Fin del sindicato',
      })[id],
    rule(r) {
      switch (r.k) {
        case 'elite':
          return `Alcanza Élite ${r.level}`;
        case 'mastery':
          return `Completa la maestría «${S.mastery.name(r.goal)}»`;
        case 'bosses':
          return r.all ? 'Captura a los ocho jefes del sindicato' : 'Captura a los primeros cuatro jefes del sindicato';
        case 'trial':
          return `Supera la prueba «${S.trials.name(r.id as never)}»`;
        case 'legendary':
          return `Completa ${r.shifts} turnos legendarios`;
        case 'prestige':
          return `Alcanza Prestigio ★${r.rank}`;
        case 'heat':
          return S.heat.rule(r.level);
        case 'fund':
          return `Dona ${money(Fmt.number(r.amount))} al Fondo del juego`;
        case 'item':
          return `Desbloquea ${S.shop.item(r.id)} en Sin límites`;
        case 'masteries':
          return 'Alcanza el nivel V en todas las maestrías';
      }
    },
    earned: (ids) => (ids.length === 1 ? `TÍTULO · ${S.titles.name(ids[0])}` : `${ids.length} NUEVOS TÍTULOS · ${ids.map((t) => S.titles.name(t)).join(', ')}`),
    none: 'Ningún título',
  },

  pass: {
    title: 'Pase de temporada',
    seasonName: (s) => ({ winter: 'Invierno', spring: 'Primavera', summer: 'Verano', autumn: 'Otoño' })[s],
    caption: (s) => `Pase de temporada ${S.pass.seasonName(s)}`,
    tier: (n, total) => `Nivel ${n} de ${total}`,
    locked: (level) => `Se abre en el nivel ${level}`,
    buyHint: 'Cofres, dinero y tres aspectos',
    daysLeft: (n) => (n === 1 ? 'último día' : `${n} días restantes`),
    complete: 'Camino completado · hasta la próxima temporada',
    reached: (step) =>
      `PASE DE TEMPORADA · NIVEL ${step.tier} · ${step.duplicate > 0 ? `${S.pass.reward(step.reward)} de nuevo · +${money(Fmt.number(step.duplicate))}` : S.pass.reward(step.reward)}`,
    buy: (price) => `Comprar · ${price}`,
    body: (xpPerTier) => [
      `Un camino de doce niveles para esta temporada, desbloqueado con dinero del juego. Cada turno otorga XP: 10 por completar el turno, 1 por Entrada perfecta y Hueco ajustado, y 10 más por capturar un jefe o superar un Turno legendario. El primer nivel requiere ${xpPerTier} XP, y cada uno un poco más.`,
      'Tres niveles contienen los aspectos de esta temporada, con efectos que ningún cofre incluye. Las cuatro estaciones vuelven cada año junto a sus aspectos.',
      'Solo estética, ninguna ventaja en la carretera. Nada aquí cuesta dinero real.',
    ],
    trackHeader: 'El camino',
  },

  hall: {
    title: 'Salón de la fama',
    header: 'Salón de la fama',
    build: (price) => `Construir Salón de la fama · ${price}`,
    built: 'SALÓN DE LA FAMA CONSTRUIDO · muro de honor en la isla · aspecto Miembro del Salón desbloqueado',
    notBuilt: 'Un muro dorado en la isla con una estrella por cada rango de prestigio y un aspecto exclusivo. Toca para ver qué ofrece.',
    tapMore: 'Toca para ver qué ofrece.',
    open: (level) => `Se abre al alcanzar el nivel ${level}`,
    plaqueLine: (e, date) =>
      [date, e.elite > 0 ? `Élite ${e.elite}` : null, `${e.bosses} ${e.bosses === 1 ? 'jefe' : 'jefes'}`, e.legendary > 0 ? `${e.legendary} legendarios` : null].filter((x) => x).join(' · '),
    empty: 'Tu primer prestigio colocará la primera placa.',
    standing: 'Ubicado en la isla',
    about: [
      'Un monumento permanente en tu isla: un muro de honor dorado en la parte superior con una estrella por cada rango de prestigio obtenido.',
      'Guarda tu historia. Cada prestigio añade una placa a la lista en la ventana Élite: la fecha, tu nivel de Élite, los jefes capturados y los turnos legendarios completados.',
      'Y desbloquea el aspecto Miembro del Salón, dorado con laureles brillantes, para tus coches.',
    ],
    looks: 'Solo estética y honor: ninguna ventaja en la carretera, nada que perder al reiniciar con prestigio.',
    gives: 'Lo que obtienes',
    wall: 'Muro dorado en la isla',
    wallValue: (ranks) => (ranks > 0 ? `${ranks} ${ranks === 1 ? 'estrella' : 'estrellas'} ahora` : 'Aún sin estrellas'),
    plaques: 'Una placa por prestigio',
    plaquesValue: (n) => (n > 0 ? `${n} hasta ahora` : 'Ninguna'),
    skin: 'Aspecto Miembro del Salón',
    skinValue: 'Oro, con laurel',
    back: 'Volver a Élite',
  },

  modes: {
    name: (m) => (m === 'shift' ? 'TURNO' : m === 'unlimited' ? 'SIN LÍMITES' : m === 'mayhem' ? 'CAOS' : m === 'chill' ? 'RELAX' : 'MULTIJUGADOR'),
    line: (m) =>
      m === 'shift'
        ? 'Supera niveles y avanza'
        : m === 'unlimited'
          ? 'Infinito · hasta el primer choque'
          : m === 'mayhem'
            ? '12 coches · apunta a las cisternas'
            : m === 'chill'
              ? 'Sin presión · los choques no detienen el juego'
              : 'Hasta 4 amigos · el último en pie gana',
    youLabel: 'TÚ',
    defaultName: 'Jugador',
    runOver: 'CARRERA TERMINADA',
    again: 'Toca para otra carrera',
    carsSent: (n) => (n === 1 ? '1 coche' : `${n} coches`),
    unlocked: { caption: 'NUEVOS MODOS', text: 'Desliza hacia los lados para Sin límites, Caos, Relax y Multijugador' },
    tryUnlimited: { caption: 'MODOS DE JUEGO', text: 'Desliza para Sin límites: sin niveles, conduce hasta que choques' },
    tightFit: { caption: 'CONSEJO', text: 'Más cerca paga más: entra justo detrás de otro coche para un Hueco ajustado, puntos dobles' },
    swipeCaption: 'MODOS DE JUEGO',
    swipeHint: 'Desliza para ver más modos',
    unlockedKeys: { caption: 'NUEVOS MODOS', text: 'Pulsa ← o → para Sin límites, Caos, Relax y Multijugador' },
    tryUnlimitedKeys: { caption: 'MODOS DE JUEGO', text: 'Pulsa → para Sin límites: sin niveles, conduce hasta que choques' },
    swipeHintKeys: '← → para ver más modos',
    stage: (stage, overtime) =>
      overtime > 0
        ? `HORAS EXTRA ${overtime} · más tráfico, algo más rápido`
        : (['', 'CISTERNAS DE GAS SE UNEN AL TRÁFICO', 'CAE LA NOCHE', 'SE AVECINA UNA TORMENTA', 'CAMIONES MILITARES EN LA CALLE'][stage] ?? ''),
    tier: (id) => ({ bronze: 'Bronce', silver: 'Plata', gold: 'Oro', platinum: 'Platino', diamond: 'Diamante', master: 'Maestro' })[id],
    mark: (cars, reward) =>
      reward.tier ? `${cars} coches · ${S.modes.tier(reward.tier).toUpperCase()}` : reward.skin ? `${cars} coches · ${S.shop.item(reward.skin).toUpperCase()}` : `${cars} coches`,
    tierUp: (id) => `NUEVO RANGO · ${S.modes.tier(id).toUpperCase()} en Sin límites`,
    tierLine: (id, next) => [id ? S.modes.tier(id) : '–', next ? `${next.cars} coches para ${S.modes.tier(next.id)}` : null].filter(Boolean).join(' · '),
    milestone: (id) => `HITO EN SIN LÍMITES · ${S.shop.item(id)} desbloqueado`,
  },

  mayhem: {
    caption: 'CAOS',
    flames: 'LLAMAS',
    cars: 'COCHES',
    chain: (n) => `CADENA ×${n}`,
    over: 'CAOS TERMINADO',
    again: 'Toca para más caos',
    summary: (wrecks, chain) => `${wrecks} ${wrecks === 1 ? 'accidente' : 'accidentes'} · cadena mayor ×${chain}`,
  },

  chill: {
    caption: 'RELAX',
    time: 'TIEMPO',
    done: 'Listo',
    doneLabel: 'Listo: terminar este paseo',
    over: 'BUEN VIAJE',
    again: 'Toca para otro paseo',
    summary: (cars, time) => `${cars === 1 ? '1 coche' : `${cars} coches`} · ${time}`,
    best: (cars) => `Tu trayecto más largo: ${cars === 1 ? '1 coche' : `${cars} coches`}`,
  },

  mutator: {
    caption: 'HOY',
    name: (id) =>
      ({
        openRoad: 'Carretera libre',
        speedway: 'Autopista veloz',
        fogBank: 'Banco de niebla',
        nightShift: 'Turno de noche',
        lightsOut: 'Luces fuera',
        stormFront: 'Frente tormentoso',
        rushAllDay: 'Hora punta total',
        dragnet: 'Redada',
        heavyLoad: 'Carga pesada',
        cashConvoy: 'Convoy de fondos',
      })[id],
    line: (id) =>
      ({
        openRoad: 'Menos coches en la rotonda',
        speedway: 'Más rápido, con algo menos de tráfico',
        fogBank: 'Niebla durante todo el turno',
        nightShift: 'Al caer la noche',
        lightsOut: 'Noche, y las farolas están apagadas',
        stormFront: 'Tormenta durante todo el turno',
        rushAllDay: 'Hora punta desde el primer coche',
        dragnet: 'El doble de criminales',
        heavyLoad: 'Camiones y cisternas por doquier',
        cashConvoy: 'El doble de furgones blindados',
      })[id],
    pill: (id) => `HOY · ${S.mutator.name(id).toUpperCase()}`,
  },

  seasonRule: {
    name: (s) => ({ winter: 'Invierno profundo', spring: 'Lluvias primaverales', summer: 'Tormentas de verano', autumn: 'Niebla y penumbra' })[s],
    line: (s) =>
      ({
        winter: 'La niebla y la nieve llegan con más frecuencia y la noche cae pronto',
        spring: 'Más lluvia, más a menudo',
        summer: 'Generalmente despejado, pero si cambia, será una tormenta',
        autumn: 'Más niebla y los atardeceres llegan temprano',
      })[s],
  },

  tours: {
    caption: 'TOUR',
    name: (id) => ({ halloween: 'Rotonda embrujada', winter: 'Luces de invierno' })[id],
    tagline: (id) =>
      ({
        halloween: 'Siete paradas tras el anochecer. Tres aspectos exclusivos.',
        winter: 'Siete paradas nevadas. Tres aspectos exclusivos.',
      })[id],
    stop: (n, of) => `Parada ${n}/${of}`,
    stopName: (id) => {
      const m = /^tour\.([a-z]+)\.(\d+)$/.exec(id);
      return m ? `${S.tours.name(m[1] as 'halloween' | 'winter')} · Parada ${m[2]}` : '';
    },
    left: (n) => (n <= 1 ? 'último día' : `${n} días restantes`),
    opensIn: (n) => (n === 1 ? 'mañana' : `en ${n} días`),
    startsIn: (inDays) => `Empieza ${S.tours.opensIn(inDays)}`,
    locked: (level) => `Los tours se abren en el nivel ${level}`,
    progress: (done, total) => `${done}/${total} paradas`,
    play: 'Jugar ›',
    goal(t) {
      const parts = [
        `${t.cars} coches`,
        t.weather !== 'clear' ? S.weather(t.weather) : null,
        t.darkness === 'blackout' ? S.blackout : t.darkness === 'night' ? S.night : null,
        t.legendary ? S.legendary.name(t.legendary) : null,
        t.rule === 'flawless' ? 'sin choques' : null,
        t.goal.k === 'perfects' ? `${t.goal.n} Entradas perfectas` : null,
        t.goal.k === 'boss' ? 'capturar al jefe' : null,
      ];
      return parts.filter((p): p is string => p !== null).join(' · ');
    },
    reward(r) {
      const parts = [r.item ? S.shop.item(r.item) : null, r.chest ? S.shop.chest(r.chest) : null, r.money ? `${Fmt.number(r.money)} monedas` : null];
      return parts.filter((p): p is string => p !== null).join(' + ');
    },
    stopDone: (n, of, reward) => `PARADA DEL TOUR ${n}/${of} · ${reward}`,
    complete: (id) => `¡${S.tours.name(id).toUpperCase()} COMPLETADO!`,
    passedBefore: 'Ya superado en este tour',
  },
});
