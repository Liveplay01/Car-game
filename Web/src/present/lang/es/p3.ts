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
    free: 'gratis',
    waiting: (n) => (n === 1 ? '1 nivel espera al pase' : `${n} niveles esperan al pase`),
    daysLeft: (n) => (n === 1 ? 'último día' : `${n} días restantes`),
    complete: 'Camino completado · hasta la próxima temporada',
    openAtEnd: (n) => (n === 1 ? 'La temporada acaba pronto · queda 1 nivel' : `La temporada acaba pronto · quedan ${n} niveles`),
    reached: (step) =>
      `PASE DE TEMPORADA · NIVEL ${step.tier} · ${step.duplicate > 0 ? `${S.pass.reward(step.reward)} de nuevo · +${money(Fmt.number(step.duplicate))}` : S.pass.reward(step.reward)}`,
    buy: (price) => `Comprar · ${price}`,
    body: (xpPerTier) => [
      `Un camino de doce niveles para esta temporada, desbloqueado con dinero del juego. Cada turno otorga XP: 10 por completar el turno, 1 por Entrada perfecta y Hueco ajustado, y 10 más por capturar un jefe o superar un Turno legendario. El primer nivel requiere ${xpPerTier} XP, y cada uno un poco más.`,
      'Tres niveles contienen los aspectos de esta temporada, con efectos que ningún cofre incluye. Las cuatro estaciones vuelven cada año junto a sus aspectos.',
      'Solo estética, ninguna ventaja en la carretera. Nada aquí cuesta dinero real.',
    ],
    freeBody: (xpPerTier) => [
      `Un camino de doce niveles para esta temporada. Cada turno da XP para él, con pase o sin él: 10 por un turno completado, 1 por Entrada perfecta y Hueco ajustado, 10 más por capturar un jefe o superar un Turno legendario. El primer nivel necesita ${xpPerTier} XP, cada nivel siguiente un poco más.`,
      'Tres niveles son gratis para todos. Compra el pase con dinero del juego y paga cada otro nivel; los que ya alcanzaste, al momento.',
      'Tres de los niveles guardan los aspectos de esta temporada, con efectos que ningún cofre tiene. Las cuatro estaciones vuelven cada año, y con ellas sus aspectos. Solo estética, nunca una ventaja en la carretera.',
    ],
    trackHeader: 'El camino',
  },

  hall: {
    header: 'Registro de prestigio',
    plaqueLine: (e, date) =>
      [date, e.elite > 0 ? `Élite ${e.elite}` : null, `${e.bosses} ${e.bosses === 1 ? 'jefe' : 'jefes'}`, e.legendary > 0 ? `${e.legendary} legendarios` : null].filter((x) => x).join(' · '),
    empty: 'Tu primer prestigio colocará la primera placa.',
  },

  modes: {
    name: (m) => (m === 'shift' ? 'TURNO' : m === 'unlimited' ? 'SIN LÍMITES' : m === 'mayhem' ? 'CAOS' : 'MULTIJUGADOR'),
    line: (m) =>
      m === 'shift'
        ? 'Supera niveles y avanza'
        : m === 'unlimited'
          ? 'Infinito · hasta el primer choque'
          : m === 'mayhem'
            ? '12 coches · apunta a las cisternas'
              : 'Hasta 4 amigos · el último en pie gana',
    youLabel: 'TÚ',
    defaultName: 'Jugador',
    runOver: 'CARRERA TERMINADA',
    again: 'Toca para otra carrera',
    carsSent: (n) => (n === 1 ? '1 coche' : `${n} coches`),
    tryUnlimited: { caption: 'MODOS DE JUEGO', text: 'Desliza para Sin límites: sin niveles, conduce hasta que choques' },
    tightFit: { caption: 'CONSEJO', text: 'Más cerca paga más: entra justo detrás de otro coche para un Hueco ajustado, puntos dobles' },
    swipeCaption: 'MODOS DE JUEGO',
    swipeHint: 'Desliza para ver más modos',
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
