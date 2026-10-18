import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { INVITE_LEVEL } from '../../../core/config';
import { rematchKind, ascensionRank, levelTrialLevel, levelKind, LANDMARK_PRESTIGE, type TrialId } from '../../../core/trials';
import { Fmt, money } from '../../format';

/** Español, Parte 2: Pruebas, Jefes, Turnos legendarios y semanales, Prestigio, Élite. */
export default (S: Strings): Words<Strings> => ({
  rush: {
    name: 'Asalto de jefes',
    caption: 'ASALTO DE JEFES',
    clock: 'TIEMPO',
    best: 'RÉCORD',
    step: (n, total) => `Jefe ${n} de ${total}`,
    shiftLine: (kind, first) => `${S.boss.name(kind)} · ${first ? 'si pierdes una ronda, vuelves a empezar' : 'el reloj sigue corriendo'}`,
    caught: (n, total) => `JEFE ${n} DE ${total} CAPTURADO`,
    nextLine: (kind) => `Siguiente: ${S.boss.name(kind)} · toca para continuar`,
    over: 'ASALTO TERMINADO',
    overLine: (caught, total) => `${caught} de ${total} jefes capturados · toca para reiniciar`,
    cleared: '¡ASALTO SUPERADO!',
    firstLine: (m) => `Los ocho jefes derrotados · ${m} pagados`,
    recordLine: 'Nuevo récord de tiempo',
    bestLine: (time) => `Mejor tiempo: ${time} · toca para otra carrera`,
    rowTitle: 'Los ocho jefes',
    line: 'Uno tras otro, un solo reloj',
    furthest: (n, total) => `máximo alcanzado ${n}/${total}`,
    locked: (beaten, total) => `Derrota a los ocho jefes para desbloquearlo · ${beaten}/${total}`,
  },

  trials: {
    name(id) {
      const boss = rematchKind(id);
      if (boss) return S.boss.rematch(boss);
      if (id === 'landmark.etoile') return 'L’Étoile';
      if (id === 'weekly') return S.weekly.title;
      if (id.startsWith('tour.')) return S.tours.stopName(id);
      const rank = ascensionRank(id);
      if (rank !== null) return `Ascensión ★${rank}`;
      const level = levelTrialLevel(id);
      if (level !== null) return `${S.trials.kindName[levelKind(level)]} · Nv ${level}`;
      return {
        tightSqueeze: 'Paso estrecho',
        deadCentre: 'En el centro',
        cleanSheet: 'Hoja limpia',
        blackout: 'Apagón',
        stormWatch: 'Alerta de tormenta',
        marathon: 'Maratón',
        mostWanted: 'Los más buscados',
        noPolice: 'Sin policía',
        noDriving: 'Solo manos',
        bareBuild: 'Construcción básica',
      }[id as TrialId];
    },
    kindName: {
      precision: 'Precisión',
      sharpEyes: 'Ojo avizor',
      cleanRun: 'Carrera limpia',
      weatherRun: 'Clima adverso',
      nightShift: 'Turno de noche',
      manhunt: 'Caza al hombre',
      ruleBreaker: 'Sin piedad',
      handicap: 'Hándicap',
      longHaul: 'Larga distancia',
    },
    goal(t) {
      if (t.tour) return S.tours.goal(t);
      if (t.elite) return S.weekly.goal(t);
      if (levelTrialLevel(t.id) !== null) {
        const strip = t.strip ?? [];
        const parts = [
          t.goal.k === 'perfects'
            ? `${t.goal.n} Entradas perfectas`
            : t.goal.k === 'skilled'
              ? `${t.goal.n} Huecos ajustados o mejor`
              : t.goal.k === 'boss'
                ? `Capturar a ${S.boss.name(t.boss ?? 'convoy')}`
                : null,
          `${t.cars} coches`,
          t.weather !== 'clear' ? S.weather(t.weather) : null,
          t.darkness === 'blackout' ? S.blackout : t.darkness === 'night' ? S.night : null,
          t.legendary ? S.legendary.name(t.legendary) : null,
          t.rule === 'flawless' ? 'sin choques' : null,
          strip.length > 0 ? `tu rotonda sin mejoras de ${strip.map((g) => ['policía', 'dinero', 'conducción'][g]).join(' ni ')}` : null,
        ];
        return parts.filter((p): p is string => p !== null).join(' · ');
      }
      if (ascensionRank(t.id) !== null) {
        const parts = [
          `${t.cars} coches`,
          t.weather !== 'clear' ? S.weather(t.weather) : null,
          t.darkness === 'blackout' ? S.blackout : t.darkness === 'night' ? S.night : null,
          t.legendary ? S.legendary.name(t.legendary) : null,
          t.rule === 'flawless' ? 'sin choques' : null,
          t.goal.k === 'boss' ? 'capturar al jefe' : null,
        ];
        return parts.filter((p): p is string => p !== null).join(' · ');
      }
      const boss = rematchKind(t.id);
      if (boss) return `Revancha contra ${S.boss.name(boss)}: más escoltas, menos tiempo`;
      if (t.arms) return `${t.arms} calles en una rotonda · ${t.cars} coches`;
      switch (t.id) {
        case 'tightSqueeze':
          return `${t.goal.k === 'skilled' ? t.goal.n : 0} Huecos ajustados o mejor en ${t.cars} coches`;
        case 'deadCentre':
          return `${t.goal.k === 'perfects' ? t.goal.n : 0} Entradas perfectas en ${t.cars} coches`;
        case 'cleanSheet':
          return `${t.cars} coches, sin choques`;
        case 'blackout':
          return `${t.cars} coches de noche, farolas apagadas`;
        case 'stormWatch':
          return `${t.cars} coches bajo una tormenta nocturna`;
        case 'marathon':
          return `${t.cars} coches en un turno`;
        case 'mostWanted':
          return 'Captura al jefe del sindicato';
        case 'noPolice':
          return `${t.cars} coches con tu rotonda, pero sin mejoras de policía`;
        case 'noDriving':
          return `${t.cars} coches con tu rotonda, pero sin mejoras de conducción (sin escudo)`;
        case 'bareBuild':
          return `${t.cars} coches con tu rotonda, sin mejoras de policía ni de conducción`;
        default:
          return '';
      }
    },
    level: (l) => `Nivel ${l}`,
    passed: 'SUPERADO',
    play: 'Jugar',
    opensAt: (l) => `Se abre en el nivel ${l}`,
    opens: (t) => {
      const rank = ascensionRank(t.id);
      if (rank !== null) return `Se abre con Prestigio ★${rank}`;
      return t.arms ? `Se abre con Prestigio ★${LANDMARK_PRESTIGE}` : S.trials.opensAt(t.level);
    },
    howTo(t) {
      if (t.goal.k === 'perfects') {
        return {
          title: 'Cómo hacerlo · Entrada perfecta',
          text: 'Coloca tu coche justo en el centro de un hueco, con similar espacio por delante y por detrás. Un espacio gigantesco no cuenta: busca un hueco de tamaño medio.',
          short: 'El centro de un hueco mediano, no enorme',
        };
      }
      if (t.goal.k === 'skilled') {
        return {
          title: 'Cómo hacerlo · Hueco ajustado',
          text: 'Entra justo delante o detrás de otro coche sin tocarlo: huecos ajustados, casi choques y entradas perfectas cuentan; entrar con mucho margen no.',
          short: 'Muy cerca de otro coche, sin chocar',
        };
      }
      return null;
    },
    progress: (t, have, need) => `${t.goal.k === 'perfects' ? 'Entradas perfectas' : 'Huecos ajustados o mejor'} ${Math.min(have, need)}/${need}${have >= need ? ' ✓' : ''}`,
  },

  boss: {
    incoming: 'CONVOY DEL SINDICATO',
    scoutFirst: 'Un explorador con escolta: embístelo con un coche de policía en el hueco antes de la escolta',
    name: (k) =>
      ({
        convoy: 'El Convoy',
        getaway: 'El Conductor de huida',
        armoured: 'El Jefe blindado',
        phantom: 'El Fantasma',
        twins: 'Los Gemelos',
        decoy: 'El Señuelo',
        smuggler: 'El Contrabandista',
        kingpin: 'El Capo',
      })[k],
    rematch: (k) => `Revancha · ${S.boss.name(k)}`,
    beaten: 'Capturado',
    escaped: 'EL JEFE ESCAPÓ',
    wanted: (seconds) => `JEFE ${Math.ceil(Math.max(0, seconds))}`,
    busted: (amount) => `Jefe capturado · ${amount} recuperados`,
    label: (role) => (role === 'boss' ? 'JEFE' : role === 'escort' ? 'ESCOLTA' : null),
  },

  legendary: {
    caption: 'TURNO LEGENDARIO',
    name: (r) => ({ gridlock: 'Atasco total', dragnet: 'Redada masiva', heavyLoad: 'Carga pesada', darkStorm: 'Tormenta oscura', zeroTolerance: 'Tolerancia cero' })[r],
    line: (r) =>
      ({
        gridlock: 'Hora punta desde el primer coche',
        dragnet: 'El doble de criminales',
        heavyLoad: 'Camiones por todas partes, la mitad cisternas de gas',
        darkStorm: 'Tormenta durante un apagón',
        zeroTolerance: 'Un solo choque lo termina todo',
      })[r],
    reward: 'RECOMPENSA',
    chest: 'Prémium',
    done: (item) => `¡TURNO LEGENDARIO SUPERADO!${item ? ` · ${S.shop.item(item)} desbloqueado` : ''}`,
    broken: 'REGLA INCUMPLIDA',
  },

  weekly: {
    title: 'Turno semanal',
    caption: 'TURNO SEMANAL',
    elite: (e) => ({ flawless: 'Impecable', precision: 'Precisión', storm: 'Frente de tormenta', gridlock: 'Atasco total', dragnet: 'Redada', boss: 'Caza del jefe' })[e],
    goal(t) {
      switch (t.elite) {
        case 'flawless':
          return `Nivel ${t.level} · ${t.cars} coches, sin choques`;
        case 'precision':
          return `Nivel ${t.level} · ${t.goal.k === 'perfects' ? t.goal.n : 0} Entradas perfectas en ${t.cars} coches`;
        case 'storm':
          return `Nivel ${t.level} · ${t.cars} coches bajo tormenta de noche`;
        case 'gridlock':
          return `Nivel ${t.level} · ${t.cars} coches en hora punta desde el principio`;
        case 'dragnet':
          return `Nivel ${t.level} · ${t.cars} coches, el doble de criminales`;
        case 'boss':
          return `Nivel ${t.level} · captura al jefe del sindicato`;
        default:
          return '';
      }
    },
    daysLeft: (n) => (n === 1 ? 'último día' : `${n} días restantes`),
    hint: 'El mismo turno para todos esta semana. Juégalo tantas veces como quieras; la recompensa se cobra una vez.',
    done: (m) => `TURNO SEMANAL SUPERADO · +${money(m)}`,
    passedThisWeek: 'Superado esta semana · nuevo turno el lunes',
  },

  invite: {
    shareText: (level) => `¡Juega conmigo a Roundabout Timing! Llega al nivel ${level} y ambos recibiremos un cofre gratis.`,
  },

  rewards: {
    crew: (reason, what) => {
      const [kind, what2, ...rest] = reason.split(':');
      if (kind !== 'crew') return null;
      switch (what2) {
        case 'gift':
          return `REGALO DE LA CREW · ${what} · de ${rest.slice(1).join(':') || 'tu crew'}`;
        case 'up':
          return `SUBES DE LIGA · ${what} · ${S.crew.league(rest[0] ?? '')}`;
        case 'goal':
          return `OBJETIVO SEMANAL LOGRADO · ${what} · gracias a tu crew`;
        case 'back':
          return `REGALO DEVUELTO · ${what} · nadie lo cogió`;
        default:
          return null;
      }
    },
    bugHunter: (id) => `¡${S.shop.item(id).toUpperCase()} DESBLOQUEADO! · gracias por cazar errores`,
    chest: (kind) => `UN REGALO DEL EQUIPO · ${S.shop.chest(kind)} · gracias`,
    money: (amount) => `UN REGALO DEL EQUIPO · ${Fmt.number(amount)} monedas · gracias`,
    item: (id) => `UN REGALO DEL EQUIPO · ${S.shop.item(id)} desbloqueado`,
    invite: (reason, kind) => {
      const [, what, ...rest] = reason.startsWith('invite:') ? reason.split(':') : [];
      const who = rest.join(':');
      switch (what) {
        case 'welcome':
          return `RECOMPENSA DE INVITACIÓN · ${S.shop.chest(kind)} · te uniste a través de ${who}`;
        case 'friend':
          return `RECOMPENSA DE INVITACIÓN · ${S.shop.chest(kind)} · ${who} alcanzó el nivel ${INVITE_LEVEL}`;
        case 'milestone':
          return `BONUS DE INVITACIÓN · ${S.shop.chest(kind)} · se unieron ${who} amigos`;
        default:
          return null;
      }
    },
  },

  prestige: {
    title: 'Prestigio',
    ready: (level) => `Nivel ${level} alcanzado: vuelve al nivel 1 en una carretera más difícil`,
    locked: (level) => `Alcanza el nivel ${level} para reiniciar en una carretera más difícil`,
    keeps: 'Conservas dinero, mejoras, carreteras y colección. Solo estética, ninguna ventaja.',
    confirm: 'Toca de nuevo para Prestigio · volver al nivel 1',
    available: (rank) => `PRESTIGIO ★${rank} DISPONIBLE · reinicia en Progreso → Élite para una carretera más dura y nuevas recompensas`,
    done: (rank, item) => `PRESTIGIO ★${rank}${item ? ` · ${S.shop.item(item)} desbloqueado` : ''}`,
    headStart: (levels) => `El tráfico empieza ${levels} niveles más difícil`,
  },

  elite: {
    title: 'Élite',
    caption: (level) => `Élite ${level}`,
    locked: (level) => `Alcanza el nivel ${level}: se abrirán el camino Élite y el Prestigio`,
    prestigeHeader: 'Prestigio',
    rank: 'Rango',
    traffic: 'Tráfico',
    harder: (levels) => `+${levels} niveles`,
    prestigeAction: (rank) => `Prestigio a ★${rank}`,
    prestigeConfirm: 'Toca de nuevo · volver al nivel 1',
    next: (step) => `Siguiente en Élite ${step.level}: ${S.elite.reward(step)}`,
    reward: (step) => (step.item ? S.shop.item(step.item.id) : step.title ? `Título «${S.titles.name(step.title)}»` : S.shop.chest(step.chest)),
    toGo: (b) => {
      const next = `${Fmt.number(b.left)} XP hasta Élite ${b.level + 1}`;
      if (b.climbed > 0) return `ÉLITE ${b.level} · ${next}`;
      return b.gained > 0 ? `+${Fmt.number(b.gained)} XP · ${next}` : next;
    },
    opened: 'CONDUCTOR DE ÉLITE · el camino Élite está abierto',
    reached: (step) => `ÉLITE ${step.level}${step.item ? ` · ${S.shop.item(step.item.id)} desbloqueado` : ''}`,
    body: [
      'A partir del nivel 50, cada turno otorga XP de Élite: 10 por completar el turno, 1 por cada Entrada perfecta y Hueco ajustado, y 10 más por capturar a un jefe o superar un Turno legendario.',
      'Cada nivel Élite requiere algo más de XP que el anterior. Cada uno otorga un cofre estándar y cada décimo uno prémium. Te esperan títulos y aspectos. El Prestigio conserva el camino.',
      'Solo estética, ninguna ventaja en la carretera.',
    ],
    trackHeader: 'A lo largo del camino',
    titlesHeader: 'Títulos · toca uno para equiparlo',
    wearing: 'Equipado',
    notYet: 'Aún no',
  },
});
