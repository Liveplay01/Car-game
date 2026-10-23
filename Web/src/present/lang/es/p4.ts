import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { Fmt, money } from '../../format';
import { SPECIAL_TEXT, FAIL_TEXT } from '../../museumText';

const COLORS: Record<string, string> = { purple: 'Púrpura', gold: 'Oro', blue: 'Azul', red: 'Rojo', teal: 'Turquesa', orange: 'Naranja', pink: 'Rosa', rose: 'Rosa claro' };
const color = (name: string): string => COLORS[name] ?? name;

/** Español, Parte 4: Logros, Resumen, Notificaciones, Pestañas, Progreso, Social, Museo. */
export default (S: Strings): Words<Strings> => ({
  ach: {
    heading: 'Logros',
    name: (id) =>
      ({
        scrapyard: 'Desguace',
        fireworks: 'Fuegos artificiales',
        spotless: 'Impecable',
        jackpot: 'Cazador de botes',
        critical: 'Golpes críticos',
        wizard: 'Mago del tráfico',
        earner: 'Gran triunfador',
        weatherproof: 'A prueba de clima',
        stormRider: 'Jinete de la tormenta',
        whiteout: 'Ventisca blanca',
        moonlighter: 'Trabajador nocturno',
        lightsOut: 'Luces fuera',
        cityLife: 'Vida urbana',
        longHaul: 'Larga distancia',
        clockwork: 'Como un reloj',
        onARoll: 'En racha',
        regular: 'Asiduo',
        testDriver: 'Piloto de pruebas',
        hunter: 'Cazador del sindicato',
        roadBuilder: 'Constructor de calles',
        foreman: 'Capataz',
        tuner: 'Modificador',
        chestOpener: 'Abridor de cofres',
        collector: 'Coleccionista',
        climber: 'Escalador',
        elite: 'Conductor de élite',
        reborn: 'Renacido',
        heatSeeker: 'Buscador de calor',
        gambler: 'Gran apostador',
        tourist: 'Turista',
      })[id] ?? id,
    goal: (id, n) => {
      const N = Fmt.number(n);
      return (
        {
          scrapyard: `Provoca ${N} accidentes`,
          fireworks: `Desencadena ${N} explosiones`,
          spotless: `${N} Carreras perfectas`,
          jackpot: `Entrega ${N} furgones con bote`,
          critical: `Consigue ${N} Entradas críticas`,
          wizard: `Envía ${N} coches`,
          earner: `Gana ${N} monedas en la carretera`,
          weatherproof: `Supera ${N} turnos con mal tiempo`,
          stormRider: `Supera ${N} turnos con tormenta, granizo o tormenta de arena`,
          whiteout: `Supera ${N} turnos con niebla o nieve`,
          moonlighter: `Supera ${N} turnos de noche`,
          lightsOut: `Supera ${N} turnos durante un apagón`,
          cityLife: `Supera ${N} turnos con un evento de la ciudad`,
          longHaul: `Aguanta ${Fmt.seconds(n)} en una carrera Sin límites`,
          clockwork: `Supera ${N} turnos diarios`,
          onARoll: `Una racha diaria de ${N} días`,
          regular: `Supera ${N} ${n === 1 ? 'turno semanal' : 'turnos semanales'}`,
          testDriver: `Supera ${N} ${n === 1 ? 'prueba' : 'pruebas'}`,
          hunter: `Captura ${N} ${n === 1 ? 'jefe del sindicato' : 'jefes distintos del sindicato'}`,
          roadBuilder: `Construye ${N} ${n === 1 ? 'calle adicional' : 'calles adicionales'}`,
          foreman: `Ten ${N} ${n === 1 ? 'módulo' : 'módulos'} colocados`,
          tuner: `Posee ${N} niveles de mejoras`,
          chestOpener: `Abre ${N} cofres`,
          collector: `Colecciona ${N} objetos`,
          climber: `Alcanza el nivel ${N}`,
          elite: `Alcanza Élite ${N}`,
          reborn: `Haz Prestigio ${N} veces`,
          heatSeeker: `Supera un turno con Nivel de calor ${N}`,
          gambler: `Juega ${N} rondas en el casino`,
          tourist: `Supera ${N} ${n === 1 ? 'parada de tour' : 'paradas de tour'}`,
        } as Record<string, string>
      )[id] ?? ''
    },
    caption: 'LOGRO',
    reached: (id, tier, reward) => ({
      title: S.ach.name(id),
      tier: S.ach.tier(tier),
      reward: `+${money(reward)}`,
      text: `Logro · ${S.ach.name(id)} ${S.ach.tier(tier)} · +${money(reward)}`,
    }),
    many: (n, reward) => ({
      title: `${n} logros`,
      tier: '★',
      reward: `+${money(reward)}`,
      text: `${n} logros · +${money(reward)} · ver Progreso → Objetivos`,
    }),
  },

  brief: {
    caption: (e, again) => `${again ? 'Recordatorio' : 'Nuevo'} · ${S.museum.name(e)}`.toUpperCase(),
  },

  push: {
    streakTitle: (days) => `Tu racha de ${days} días`,
    streakBody: 'Juega el turno diario de hoy antes de medianoche para mantenerla activa.',
    giftTitle: 'Tu cofre gratis está listo',
    giftBody: 'Un cofre estándar te espera. Abre el juego para recogerlo.',
    passTitle: (season) => `${S.pass.seasonName(season)} ha llegado`,
    passBody: 'Llega un nuevo pase de temporada con tres aspectos nuevos por conseguir.',
    row: 'Notificaciones',
    rowSub: 'Tu racha, un cofre gratis, una nueva temporada o si alguien te adelanta en el Top 20. Máximo una al día.',
    rowInstall: 'Añade primero el juego a tu pantalla de inicio y luego actívalas aquí.',
    choices: {
      streak: { title: 'Racha diaria', sub: 'Un aviso por la tarde antes de que termine tu racha.' },
      chests: { title: 'Cofres gratis', sub: 'Tu cofre gratis de mañana y regalos por invitaciones.' },
      pass: { title: 'Nueva temporada', sub: 'Cuando comience un nuevo pase de temporada.' },
      rank: { title: 'Superado', sub: 'Cuando un jugador te adelante en el Top 20.' },
      comeback: { title: 'Regresa', sub: 'Un recordatorio tras unos días sin jugar.' },
    },
    rowNone: 'No disponible aquí. Abre el juego en tu navegador para activar notificaciones.',
    rowLocal: 'Activado. Los avisos con el juego cerrado requieren el servicio online que no está en esta versión.',
    confirmTitle: 'Notificaciones activadas',
    rowBlocked: 'Bloqueado para este sitio. Permite las notificaciones en los ajustes del navegador.',
    offerFirstTitle: 'Cofre gratis mañana',
    offerFirstWhy: 'Recibe un aviso cuando esté listo el cofre gratis de mañana y otro antes de perder tu racha. Máximo una al día, nunca de noche. Desactívalas cuando quieras en Ajustes.',
    offerTitle: 'Mantén tu racha',
    offerWhy: 'Recibe un aviso antes de perder tu racha, cuando haya un cofre gratis o empiece una temporada. Máximo una al día, nunca de noche. Desactívalas cuando quieras en Ajustes.',
    offerOn: 'Activar notificaciones',
    offerLater: 'Ahora no',
    on: 'Notificaciones activadas. Puedes desactivarlas en cualquier momento en Ajustes.',
    failed: 'No se pudieron activar las notificaciones. Inténtalo más tarde.',
    denied: 'Las notificaciones están bloqueadas en los ajustes de tu navegador.',
  },

  wayBack: {
    chestTitle: 'Cofre gratis mañana',
    streakTitle: 'Hasta mañana',
    chestWhy: 'Pon el juego en tu pantalla de inicio: el cofre gratis de mañana estará a un toque, y tu progreso queda a salvo.',
    streakWhy: 'Pon el juego en tu pantalla de inicio: mañana tu racha estará a un toque, y tu progreso queda a salvo.',
    install: 'Instalar el juego',
  },

  ready: {
    tapToStart: 'Toca para empezar',
    tapForFriends: 'Toca para jugar con amigos',
  },

  tabs: {
    progress: 'Progreso',
    social: 'Social',
    game: 'Juego',
    shop: 'Tienda',
    build: 'Construir',
  },

  progress: {
    section: (i) => ['Hoy', 'Metas', 'Estadísticas'][i],
    allStats: 'Todas las estadísticas',
    statsMore: (n) => `${n} más ›`,
    statsHide: 'Ocultar',
    odometer: 'Cuentakilómetros',
    odometerLine: 'Cada coche que dejaste entrar, de puerta a puerta',
    odometerMoon: 'Hasta la Luna. Y sigue rodando.',
    km: 'km',
    quests: 'Misiones',
    trials: 'Pruebas',
    mastery: 'Maestría',
    feats: 'Hazañas',
    trialsLocked: (level) => `Se abre en el nivel ${level} · turnos especiales con recompensa`,
    landmarks: 'Monumentos',
    landmarksHint: 'Rotondas famosas, cada una un turno difícil.',
    ascension: 'Ascensión',
    ascensionHint: 'Una prueba por cada rango de prestigio: los turnos más duros del juego.',
    levelTrials: 'Pruebas de nivel',
    levelTrialsHint: (waiting, shown) =>
      waiting > shown ? `Una más con cada nivel. ${waiting - shown} más en espera: supera una y aparecerá la siguiente.` : 'Una más por nivel, del nivel 30 al 120.',
    bosses: 'Jefes del sindicato',
    legendary: 'Turnos legendarios',
    weeklies: 'Turnos semanales',
    ambulances: 'Ambulancias cedidas',
    level: 'Nivel alcanzado',
    bestCombo: 'Mejor combo',
    bestChain: 'Cadena perfecta más larga',
    streak: 'Racha diaria',
    flameTier: (tier) => ['MOTOR APAGADO', 'MOTOR AL RALENTÍ', 'MOTOR ACELERANDO', 'PETARDEO', 'POSTQUEMADOR', 'INFIERNO'][tier] ?? '',
    streakDay: 'día seguido',
    streakDays: 'días seguidos',
    streakStart: 'Juega el turno diario de hoy para arrancar el motor',
    streakKeep: 'Juega el turno diario de hoy para mantenerlo encendido',
    streakDone: 'Completado hoy · vuelve mañana',
    streakCard: (n) => (n === 1 ? 'Rasca gratis al día siguiente' : `Rasca gratis en ${n} días`),
    shiftsPlayed: 'Turnos jugados',
    shiftsCompleted: 'Turnos completados',
    takedowns: 'Capturas',
    transporters: 'Furgones cobrados',
    unlimitedBest: 'Récord Sin límites',
    unlimitedCars: 'Coches Sin límites',
    unlimitedTier: 'Rango Sin límites',
    mayhemBest: 'Llamas en Caos',
    mayhemChain: 'Cadena en Caos',
    minutes: (s) => (s < 3600 ? `${Math.max(1, Math.round(s / 60))} min` : `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`),
    tours: 'Paradas de tour',
    perfects: 'Entradas perfectas',
    chestsOpened: 'Cofres abiertos',
    days: (d) => (d === 1 ? '1 día' : `${d} días`),
    collectionShare: (o, t) => `Colección · ${Math.floor((o / t) * 100)} %`,
    questsHint: 'Las misiones pagan una vez y se renuevan a medianoche.',
    timingLabel: (n) => `Tu precisión · últimas ${n} entradas`,
    timing: (ms, onBeat) => (ms === null ? '–' : Math.abs(ms) <= onBeat ? 'Exacto' : ms < 0 ? `${-ms} ms antes` : `${ms} ms tarde`),
  },

  social: {
    section: (i) => ['Clasificación', 'Crew', 'Club', 'Mafia'][i],
    clubClosed: 'El Club se abre en el nivel 50: casa de subastas y fondo del juego para grandes cuentas.',
    mafiaClosed: 'La Familia no tiene tiempo para novatos. Derrota al primer jefe del sindicato (nivel 15) o supéralo, y te contactarán.',
    offline: 'Crews y Clasificación necesitan el servicio online al que esta copia no está conectada.',
    noCrew: 'Las crews no están disponibles aquí. Clasificación y Club sí.',
  },

  museum: {
    shelf: (i) => ['Jefes', 'Especiales', 'Condiciones', 'Fracasos'][i],
    lockedFailHint: 'Aún no te ha pasado. Si pierdes un turno así, aparece aquí con lo que salió mal y cómo evitarlo.',
    failuresDone: (skin) => `Todas las formas de perder encontradas: la skin ${skin} es tuya`,
    notSeen: 'Aún no visto',
    newBadge: 'NUEVO',
    firstTime: 'Nuevo para ti',
    firstAt: (level, rank = 0) => (rank > 0 ? `A partir de ${S.museum.place(level, rank)}` : `A partir del nivel ${level}`),
    undiscovered: 'Por descubrir',
    lockedHint: (level, rank = 0) =>
      rank > 0 || level > 1
        ? rank > 0
          ? `Aparece a partir de ${S.museum.place(level, rank)}. En cuanto lo encuentres en la carretera, se mostrará aquí con toda su información.`
          : `Aparece a partir del nivel ${level}. En cuanto lo encuentres en la carretera, se mostrará aquí con toda su información.`
        : 'Sigue jugando turnos. En cuanto lo encuentres en la carretera, se mostrará aquí con toda su información.',
    lockedBossHint: (level, rank = 0) => (rank > 0 ? `El sindicato lo envía en ${S.museum.place(level, rank)}. Tras encontrarte con él, aparecerá aquí con la forma de atraparlo.` : `El sindicato lo envía en el nivel ${level}. Tras encontrarte con él, aparecerá aquí con la forma de atraparlo.`),
    kind: (e) => ({ boss: 'Jefe del sindicato', special: 'Vehículo especial', weather: 'Clima', dark: 'Oscuridad', event: 'Evento urbano', road: 'Carretera', fail: 'Fracaso' })[e.k],
    met: 'Encontrado, aún en libertad',
    onRing: 'En la rotonda',
    signalArrive: (arm, sweep) =>
      arm && sweep
        ? `El ramal del que viene brilla en ${color(arm)}, y luego una luz en ${color(sweep)} rodea la isla.`
        : arm
          ? `El ramal del que viene brilla en ${color(arm)} antes de entrar en la rotonda.`
          : `Una luz en ${color(sweep ?? '')} rodea la isla.`,
    signalPaid: (c) => `¡Bien hecho!: Un anillo en ${color(c)} se expande desde la isla.`,
    signalMissed: (c) => `Perdido: Un anillo en ${color(c)} se contrae hacia la isla.`,
    signalNote: (n) =>
      n === 'escaped' ? 'Si escapa, toda la rotonda parpadea en violeta.' : 'Un coche que entra justo delante de él hace parpadear la rotonda en rojo y rompe tu combo.',
    heist: 'Botín recuperado',
    firstMet: 'Nivel del jefe',
    rematch: 'Revancha',
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
          return 'Dos carriles';
        case 'fail':
          return FAIL_TEXT[e.kind].name;
      }
    },
  },
});
