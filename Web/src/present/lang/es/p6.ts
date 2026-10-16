import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { Fmt, money, percent, multiplier } from '../../format';
import { MONEY_MARK } from '../../icons';
import { baseConfig } from '../../../core/config';
import { MASTERY_THRESHOLDS, masteryNumeral } from '../../../core/career';

/** Español, Parte 6: Mafia, Tienda, Gran pantalla, Turno diario, Álbumes, Maestría, Clima. */
export default (S: Strings): Words<Strings> => ({
  mafia: {
    title: 'La Familia',
    speeds: ['Lento', 'Rápido', 'Frenético'],
    pointer: (speed) => `Aguja · ${speed}`,
    takeCash: 'Tomar dinero',
    tagline: 'Respetan a un conductor que encerró a su jefe. Prestan, pero se cobran todo de vuelta.',
    badge: 'Mafia',
    don: 'El Don',
    pitch: 'Elige un préstamo, siéntate a la mesa y detén la aguja en la zona verde. Cuanto más cerca del centro, mejor será el trato. A mayor préstamo, más rápida la aguja.',
    rules: (rate, cap, garnish) =>
      `Devuélvelo antes del día fijado en la carta. Con retraso, la deuda crece un ${Math.round(rate * 100)} % diario (hasta +${Math.round(cap * 100)} %), el ${Math.round(garnish * 100)} % de cada turno va a la Familia, no aparecen furgones, criminales ni jefes, el casino cierra y tu nombre luce la insignia de la Mafia. Paga todo y desaparecerá. Cada préstamo saldado a tiempo abarata el siguiente y amplía la zona verde.`,
    grade: (g) => ({ perfect: 'PERFECTO', good: 'BUENO', miss: 'FALLADO' })[g],
    gradeText: (g) => ({ perfect: 'En el punto exacto. El Don sonríe.', good: 'Un apretón de manos justo.', miss: 'El Don se encoge de hombros. Solo la oferta básica sigue en pie.' })[g],
    set: 'Tomar asiento',
    stop: 'PARAR',
    tapToStop: 'Toca para detener la aguja',
    setting: 'El Don espera…',
    loanLabel: 'Préstamo',
    perDay: (days) => `${days} ${days === 1 ? 'día' : 'días'}`,
    offer: (interest, days) => `${Math.round(interest * 100)} % interés · ${days} ${days === 1 ? 'día' : 'días'}`,
    zone: (width, clean) => `Zona verde ${Math.round(width * 100)} % de la barra${clean > 0 ? ` · ${clean} ${clean === 1 ? 'préstamo' : 'préstamos'} devueltos a tiempo` : ''}`,
    ledger: 'Libro de cuentas',
    lent: 'Prestado',
    owed: 'Debes',
    due: 'Vencimiento',
    late: 'CON RETRASO',
    paid: 'Pagado hasta ahora',
    countdown: (ms) => {
      const mins = Math.max(0, Math.floor(ms / 60_000));
      const days = Math.floor(mins / 1440);
      const hours = Math.floor((mins % 1440) / 60);
      if (days > 0) return `${days} d ${hours} h restantes`;
      return hours > 0 ? `${hours} h ${mins % 60} min restantes` : `${mins} min restantes`;
    },
    lateFor: (ms) => {
      const days = Math.floor(ms / 86_400_000);
      return days > 0 ? `${days} ${days === 1 ? 'día' : 'días'} de retraso` : 'Recién vencido';
    },
    repayShare: (share) => (share >= 1 ? 'Pagar todo' : `Pagar ${Math.round(share * 100)} %`),
    noMoney: 'Dinero insuficiente para pagar esto.',
    waiting: 'El Don observa',
    atStake: 'Si te retrasas',
    inForce: 'En vigor hasta que pagues',
    consequences: (garnish) => ['Casino cerrado', 'Sin furgones, criminales ni jefes', `${Math.round(garnish * 100)} % de cada turno para la Familia`, 'Insignia de la Mafia en clasificaciones'],
    overdue: 'VENCIDO',
    overdueText: 'La Familia cobra primero. Cada turno les paga a ellos.',
    paidStamp: 'PAGADO',
    assist: 'Mano firme',
    assistText: 'Aguja más lenta, pero sin posibilidad de trato Perfecto',
    banned: (date) => `La Familia no atiende tus llamadas. Hablarán contigo de nuevo el ${date}.`,
    nextStep: (interest, nextInterest, zone, nextZone) =>
      `Devuelve el próximo préstamo a tiempo: interés ${Math.round(interest * 100)} % → ${Math.round(nextInterest * 100)} %, zona verde ${Math.round(zone * 100)} % → ${Math.round(nextZone * 100)} %`,
    shiftsToClear: (n) => `Aproximadamente ${n} ${n === 1 ? 'turno' : 'turnos'} de recaudación para saldarlo`,
    onlyOne: 'Solo un préstamo a la vez. Salda primero este.',
    letters: 'Cartas',
    letter: (kind, owed, date) =>
      ({
        taken: `Ha sido un placer. ${owed} antes del ${date}, ni un día más. No me hagas ir a buscarte.`,
        half: 'Ha pasado la mitad del tiempo. La Familia no olvida deudas ni amigos puntuales.',
        day: 'Queda un día. Sé buen amigo y salda la cuenta antes de que se vuelva personal.',
        late: 'Se acabó el tiempo. Tu nombre está en la lista. La carretera nos paga primero y el casino está cerrado para ti.',
        later: 'La cifra crece cada día. Paga y volveremos a ser amigos.',
      })[kind],
    notices: {
      late: 'LA FAMILIA ESPERA · tu préstamo está vencido · el casino está cerrado',
      grace: 'LA FAMILIA TE DA UN DÍA MÁS · el préstamo venció mientras estabas fuera',
      writtenOff: 'LA FAMILIA DA LA DEUDA POR PERDIDA · la deuda desaparece, pero sus puertas cierran 14 días',
    },
    garnished: (cut, cleared) => (cleared ? `LA FAMILIA COBRÓ ${money(cut)} · deuda saldada, eres libre` : `LA FAMILIA RETUVO ${money(cut)} del pago`),
    casinoShut: 'El casino está cerrado mientras la Familia espera su dinero.',
  },

  shop: {
    open: 'Abrir',
    wear: 'Equipar',
    takeOff: 'Quitar',
    worn: 'Equipado',
    inTraffic: 'En el tráfico',
    vehicleAuto: 'No requiere equiparse: el vehículo se incorpora solo al tráfico.',
    lockedTitle: (kind) => (kind === 'mapSkin' ? 'Mapa misterioso' : kind === 'vehicleType' ? 'Vehículo misterioso' : 'Aspecto misterioso'),
    source(k) {
      switch (k) {
        case 'standard':
          return 'En venta · o viendo anuncios';
        case 'premium':
          return 'En venta · o mediante maestrías difíciles';
        case 'diamond':
          return 'En venta · nunca un Común';
        case 'event':
          return 'Eventos de la ciudad · Turno diario';
        case 'criminalHunt':
          return 'Recompensa por capturar criminales';
      }
    },
    seasonHint: '50 % de probabilidad de contener el objeto de la temporada hasta obtenerlo.',
    pickItem: 'Toca un objeto para examinarlo.',
    lockedHint(item) {
      if (item.source.kind === 'streak') return `Juega el turno diario ${item.source.days} días consecutivos.`;
      if (item.source.kind === 'season') return `Solo en cofres de evento durante ${S.pass.seasonName(item.source.season)}.`;
      if (item.source.kind === 'legendary') return item.source.shifts === 1 ? 'Supera un Turno legendario.' : `Supera ${item.source.shifts} turnos legendarios.`;
      if (item.source.kind === 'prestige') return `Alcanza Prestigio ★${item.source.rank}.`;
      if (item.source.kind === 'elite') return `Alcanza Élite ${item.source.level}.`;
      if (item.source.kind === 'pass') return `Nivel ${item.source.tier} del Pase de ${S.pass.seasonName(item.source.season)}. Vuelve cada año.`;
      if (item.source.kind === 'hall') return 'Construye el Salón de la fama (Récords → Élite).';
      if (item.source.kind === 'unlimited') return `Envía ${Fmt.number(item.source.cars)} coches en Sin límites.`;
      if (item.source.kind === 'tour') return `Parada del tour «${S.tours.name(item.source.tour as 'halloween' | 'winter')}». Vuelve cada año.`;
      if (item.source.kind === 'auction') return 'Solo como lote en la casa de subastas (Social → Club). Nuevos lotes periódicos.';
      if (item.source.kind === 'failures') return 'Encuentra todas las formas de perder un turno (Progreso → Museo → Fracasos). Solo estética.';
      if (item.source.kind === 'casino') return `${S.casino.feat(item.source.feat)}: solo lo da el casino (Tienda → Casino). Solo estética.`;
      if (item.source.kind === 'fund') return 'Agradecimiento del antiguo fondo municipal. Ya no se otorga.';
      if (item.source.kind === 'bugReport')
        return item.source.reports === 1
          ? 'Informa de un error en timing.love con tu código de amigo. Exclusivo para cazadores de errores.'
          : `Informa de ${item.source.reports} errores en timing.love con tu código, uno al día. Exclusivo para cazadores de errores.`;
      if (item.source.kind === 'find') return `Hallazgo insólito: ${S.shop.findOdds(item.source.chance)} ${S.shop.chest(item.source.chest)}. La única distinción por puro azar.`;
      return 'Aún no encontrado: aparece en cofres.';
    },
    tapToClose: 'Toca para cerrar',
    tapToBreak: '¡Toca rápido!',
    tapOdds: (odds) => `Toca rápido para abrir el cofre: cada toque dentro del medio segundo posterior cuenta; a máxima fuerza las probabilidades son ${odds}. Toques más lentos quedan en puntos intermedios.`,
    watchAdShort: 'Ver anuncio',
    adReward: 'Anuncio visto · Cofre estándar añadido',
    noAdsLeft: 'No quedan cofres por anuncios hoy. Vuelve mañana.',
    adPlaceholder: 'Anuncio',
    adCountdown: (reward, s) => `${{ chest: 'Tu cofre', upgrade: 'Tu paso gratis', boost: 'Tu impulso' }[reward]} en ${s} s`,
    watchAd: (left) => `Ver anuncio · ${left} restantes`,
    skinsOn: (n, max) => `${n} de ${max} aspectos de coche activos · se mezclan en la carretera`,
    skinsFull: (max) => `${max} aspectos activos. Quita uno primero.`,
    section: (i) => ['Cofres', 'Colección', 'Casino'][i],
    earnedHeading: 'Ganado, no comprado',
    newBadge: 'NUEVO',
    shelf: (i) => ['Coches', 'Mapas', 'Ganado', 'Pase'][i],
    group: (g, honours = false) => {
      const name = { common: 'Común', rare: 'Raro', epic: 'Épico', legendary: 'Legendario', vehicles: 'Vehículos', seasons: 'Temporadas', maps: 'Mapas' }[g];
      return honours && g !== 'vehicles' && g !== 'seasons' && g !== 'maps' ? `Coches · ${name}` : name;
    },
    waiting: (n) => (n === 1 ? '1 en espera' : `${n} en espera`),
    buy: (price) => `Comprar · ${price}`,
    pity: (n) => `Épico o superior dentro de ${n} cofres. Los duplicados pagan ${MONEY_MARK}.`,
    pityLegendary: (n) => `Un Legendario dentro de ${n} cofres.`,
    duplicate: (m) => `Duplicado · +${money(m)}`,
    ownedHint(item) {
      if (item.kind === 'carSkin') return 'Decora los coches en la carretera. Combina hasta ocho. Solo estética, ninguna ventaja.';
      if (item.id === 'bigScreen') return 'Tu propia imagen o vídeo tras la rotonda: sube una foto o pega un enlace de YouTube o vídeo. Solo estética.';
      if (item.kind === 'mapSkin') return 'Transforma la ciudad en un escenario único. Solo estética.';
      return `Aparece de vez en cuando en tu cola: ${S.shop.trait(item.id)}.`;
    },
    chest(k) {
      switch (k) {
        case 'standard':
          return 'Cofre estándar';
        case 'premium':
          return 'Cofre prémium';
        case 'diamond':
          return 'Cofre diamante';
        case 'event':
          return 'Cofre de evento';
        case 'criminalHunt':
          return 'Cofre de caza criminal';
      }
    },
    rarity: (r) => ({ common: 'Común', rare: 'Raro', epic: 'Épico', legendary: 'Legendario' })[r],
    trait: (id) =>
      id === 'compact'
        ? 'diminuto, ligero, más lento al incorporarse'
        : id === 'van'
          ? 'largo, pesado, se incorpora más rápido'
          : id === 'classic'
            ? 'conduce como un coche clásico, capó largo y parachoques cromados'
            : 'más corto, ligero, se incorpora más rápido',
    findOdds: (chance) => `1 de cada ${Fmt.number(Math.round(1 / chance))} en`,
    oneIn: (chance) => `1 de cada ${Fmt.number(Math.round(1 / chance))}`,
    findRow: (id) => `${S.shop.item(id)} · Distinción`,
    found: 'Encontrado',
    findHint: (id) => `${S.shop.item(id)} es la única distinción que depende de la suerte. Sustituye lo que habrías obtenido hasta conseguirlo.`,
    kind(item) {
      const kind = item.kind === 'carSkin' ? 'Aspecto de coche' : item.kind === 'mapSkin' ? 'Aspecto de mapa' : `Tipo de vehículo · ${S.shop.trait(item.id)}`;
      return `${kind} · ${S.shop.rarity(item.rarity)}`;
    },
    opened(o) {
      const name = S.shop.item(o.item.id);
      if (o.isDuplicate) return `Duplicado: ${name} · +${money(String(o.money))}`;
      return `${S.shop.rarity(o.item.rarity).toUpperCase()} · ${name}`;
    },
  },

  backdrop: {
    choose: 'Elegir imagen o vídeo',
    intro: 'Coloca tu propia imagen o vídeo de fondo en la rotonda. Se mostrará en la pestaña de Juego con Gran pantalla activa.',
    linkLabel: 'Enlace',
    linkPlaceholder: 'Enlace de YouTube, imagen o vídeo',
    show: 'Mostrar',
    or: 'o',
    upload: 'Subir imagen',
    uploadSub: 'Desde tu dispositivo, solo imágenes. Se queda en este dispositivo.',
    pick: 'Elegir',
    now: (what) => ({ youtube: 'Un vídeo de YouTube', video: 'Un vídeo desde enlace', image: 'Una imagen desde enlace', upload: 'Tu propia imagen' })[what],
    nowSub: 'Ahora tras la rotonda.',
    remove: 'Eliminar',
    loading: 'Cargando…',
    notALink: 'No es un enlace web válido. Copia la dirección completa empezando por https://',
    cannotLoad: 'No se pudo cargar este enlace. Usa el enlace directo a la imagen o vídeo (.jpg, .png, .mp4); algunos sitios no permiten incrustar.',
    notAPicture: 'Solo se pueden subir imágenes. Para vídeos, pega un enlace de YouTube.',
    unreadable: 'No se pudo leer esta imagen. Prueba con otra.',
    notKept: 'Demasiado grande para almacenarse: se mostrará hasta que cierres el juego.',
    note: 'El enlace se carga directamente desde su origen (YouTube o servidor web) en este dispositivo. Nada se envía a nuestros servidores.',
    lost: 'Gran pantalla: no se pudo cargar el enlace. La ciudad ha vuelto.',
  },

  daily: {
    title: 'TURNO DIARIO',
    name: 'Turno diario',
    ready: 'Listo',
    perfectRun: 'CARRERA PERFECTA',
    welcomeBack: (m) => `¡Bienvenido de nuevo! Tus peajes han generado +${money(m)}`,
    streakEnded: (days) => `Tu racha de ${days} días ha terminado · una nueva comienza con el turno de hoy`,
    done: 'Completado',
    readyHint: 'Tu primer turno del día. Un solo intento, idéntico para todos.',
    doneHint: (streak) => (streak > 1 ? `Completado · ${streak} días seguidos · vuelve mañana` : 'Completado · vuelve mañana'),
    splashLine: (e) => `La ciudad hoy: ${S.cityEvent(e)} · un intento`,
    streakLine: (streak) => (streak > 0 ? `${streak} ${streak === 1 ? 'día' : 'días'} seguidos · ¡sigue así!` : 'Juega cada día para crear una racha'),
    nextMilestone: (left, item) => `Quedan ${left} ${left === 1 ? 'día' : 'días'} para ${S.shop.item(item)}`,
    rowLine(streak, open, next, freezes = 0, toFreeze = null) {
      if (streak <= 0) return open ? S.daily.readyHint : 'Vuelve mañana · juega a diario para una racha';
      const days = `${streak} ${streak === 1 ? 'día' : 'días'} seguidos`;
      const ahead = next && (toFreeze === null || next.left <= toFreeze) ? S.daily.nextMilestone(next.left, next.item) : toFreeze !== null ? S.daily.freezeLine(toFreeze) : null;
      const parts = [days, freezes > 0 ? S.daily.freezes(freezes) : null, ahead, open ? null : 'vuelve mañana'];
      return parts.filter((p): p is string => p !== null).join(' · ');
    },
    freezeLine: (days) => `Quedan ${days} ${days === 1 ? 'día' : 'días'} para la protección de racha`,
    freezes: (n) => `${n}× protección de racha`,
    sheet: {
      title: 'Racha diaria',
      body: (bonusDays, bonusPay, heatDays) => [
        'Juega el turno diario cada día para mantener la racha. Un día perdido la rompe, salvo que una protección de racha lo cubra.',
        `Desde ${bonusDays} días, cada turno de carrera paga +${Math.round(bonusPay * 100)} % mientras la racha siga viva.`,
        `Calor: cada ${heatDays} días de racha abren un nivel de calor, tráfico más duro con más pago y XP Élite. Si pierdes la racha, el calor desaparece con ella. Los títulos de calor ganados se quedan.`,
      ],
      heatOpen: 'Calor abierto',
      heatValue: (open, max) => `${open} de ${max}`,
      nextHeat: 'Próximo calor en',
      allHeat: 'Todo abierto',
    },
    freezeUsed: (n) => `RACHA PROTEGIDA · se ${n === 1 ? 'ha cubierto un día perdido' : `han cubierto ${n} días perdidos`}`,
    streakReward: (days, got) => `${days} DÍAS SEGUIDOS · ${got.join(' · ')}`,
    gotItem: (item) => `${S.shop.item(item)} desbloqueado`,
    gotFreeze: 'una protección de racha',
    gotCard: 'un rasca gratis',
    giftIn: (hours) => (hours >= 1 ? `Cofre gratis mañana · en ${Math.ceil(hours)} h` : `Cofre gratis mañana · en ${Math.max(1, Math.ceil(hours * 60))} min`),
    perfectRunFirst: (pay) => `CARRERA PERFECTA · sin choques · +${pay} % de ganancias`,
    streakPill(streak, bonus, endsIn, freezes = 0) {
      if (streak <= 0) return S.daily.streakLine(0);
      const days = `${streak} ${streak === 1 ? 'día' : 'días'} seguidos`;
      if (endsIn !== null) return `${days} · termina en ${endsIn < 1 ? 'menos de 1 h' : `${Math.floor(endsIn)} h`}`;
      const freeze = freezes > 0 ? ` · ${S.daily.freezes(freezes)}` : '';
      return bonus !== null ? `${days} · +${Math.round(bonus * 100)} % de pago${freeze || ' en cada turno'}` : `${days}${freeze || ' · ¡sigue así!'}`;
    },
    challenge(c) {
      switch (c) {
        case 'perfectInputs':
          return '3 Entradas perfectas en un turno';
        case 'tightFits':
          return '3 Huecos ajustados en un turno';
        case 'twoTakedowns':
          return '2 Capturas en un turno';
        case 'twoTransporters':
          return '2 Furgones blindados cobrados en un turno';
        case 'longChain':
          return 'Una cadena perfecta de 8';
        case 'bigCombo':
          return 'Un combo de 15';
        case 'perfectRun':
          return 'Una carrera perfecta: sin choques';
        case 'oneTakedown':
          return 'Captura a un criminal';
        case 'cleanMerges':
          return '8 Incorporaciones limpias en un turno';
        case 'sixTightFits':
          return '6 Huecos ajustados en un turno';
        case 'fivePerfects':
          return '5 Entradas perfectas en un turno';
        case 'chainFive':
          return 'Una cadena perfecta de 5';
        case 'hugeCombo':
          return 'Un combo de 25';
        case 'twoNearMisses':
          return '2 Casi choques en un turno';
      }
    },
    challengeDone: (c, reward) => `MISIÓN · ${S.daily.challenge(c)} · +${money(reward)}`,
  },

  albums: {
    name: (a) => ({ maps: 'Mapas', commons: 'Comunes', rares: 'Raros', epics: 'Épicos', legends: 'Leyendas', seasons: 'Temporadas', loyalty: 'Lealtad', honours: 'Distinciones', pass: 'Pase de temporada', tours: 'Tours' })[a],
    complete: (a, reward) => `¡ÁLBUM COMPLETADO! · ${S.albums.name(a)} · +${money(reward)} · nuevo marco`,
    progress: (entries) => 'Álbumes · ' + entries.map((e) => `${S.albums.name(e.album)} ${e.owned}/${e.total}`).join(' · '),
  },

  race: {
    newBest: 'NUEVO RÉCORD',
  },

  feats: {
    goal(g) {
      switch (g.k) {
        case 'prestige':
          return `Alcanza Prestigio ★${g.rank}`;
        case 'elite':
          return `Alcanza Élite ${g.level}`;
        case 'legendary':
          return `Completa ${g.shifts} turnos legendarios`;
      }
    },
    done: 'Completado',
    withTitle: (title) => `+ Título «${title}»`,
    eyebrow: 'Hazaña',
    body: 'Una de las proezas más difíciles del juego. Ningún cofre, casino ni dinero pueden otorgártela: solo la carretera.',
    rowGoal: 'Objetivo',
    rowNow: 'Tú',
    rowTitle: 'Título',
    reward: 'Recompensa',
    earned: 'Obtenido · en tu colección',
  },

  mastery: {
    detail(goal, tier) {
      const t = MASTERY_THRESHOLDS[goal];
      if (tier >= t.length) return 'Todos los niveles alcanzados';
      const n = t[tier];
      switch (goal) {
        case 'perfectTiming':
          return `${n} Entradas perfectas`;
        case 'tightSpots':
          return `${n} Huecos ajustados`;
        case 'closeCalls':
          return `${n} Casi choques`;
        case 'longChain':
          return `Una cadena perfecta de ${n}`;
        case 'crimeFighter':
          return `${n} Capturas`;
        case 'secureRoute':
          return `${n} Furgones blindados cobrados`;
        case 'comboMaster':
          return `Un combo de ${n}`;
        case 'veteran':
          return `${n} Turnos completados`;
        case 'lifesaver':
          return `${n} Vehículos de emergencia cedidos`;
        case 'closeShaves':
          return `${n} Pasos rozando una moto`;
      }
    },
    name: (g) =>
      ({
        perfectTiming: 'Sincronización perfecta',
        tightSpots: 'Lugares estrechos',
        closeCalls: 'Por los pelos',
        longChain: 'Cadena larga',
        crimeFighter: 'Luchador contra el crimen',
        secureRoute: 'Ruta segura',
        comboMaster: 'Maestro del combo',
        veteran: 'Veterano',
        lifesaver: 'Salvavidas',
        closeShaves: 'Afeitadas al límite',
      })[g],
    toast(done) {
      const names = done.map((c) => `${S.mastery.name(c.goal)} ${masteryNumeral(c.tier)}`);
      return `¡MAESTRÍA COMPLETADA! · ${names.join(', ')}`;
    },
  },

  night: 'Noche',
  blackout: 'Apagón',
  weather: (w) =>
    ({ clear: 'Despejado', lightRain: 'Lluvia ligera', heavyRain: 'Lluvia intensa', storm: 'Tormenta', extreme: 'Clima extremo', fog: 'Niebla', snow: 'Nieve y hielo', hail: 'Granizo', sandstorm: 'Tormenta de arena' })[w],
  cityEvent: (e) =>
    ({
      roadworks: 'Obras',
      roadClosure: 'Cierre de calle',
      concert: 'Tráfico de concierto',
      vipConvoy: 'Convoy VIP',
      policeOperation: 'Operación policial',
      schoolRun: 'Ruta escolar',
      marathon: 'Maratón',
    })[e],

  upgrades: {
    group: (g) => ['POLICÍA', 'DINERO', 'CONDUCCIÓN'][g],
    maxed: 'Máx.',
    pickOne: 'Toca una mejora para ver sus efectos.',
    everyStepBought: 'Todas las mejoras compradas.',
    missing: (m) => `Faltan ${m}`,
    name: (u) =>
      ({
        morePatrols: 'Más patrullas',
        longerPursuit: 'Persecución más larga',
        quietStreets: 'Calles tranquilas',
        interceptor: 'Interceptor',
        dispatchRadio: 'Centralita policial',
        backup: 'Refuerzos',
        cashRoute: 'Ruta del dinero',
        overtime: 'Horas extra',
        freight: 'Transporte de carga',
        quickRecovery: 'Recuperación rápida',
        doubleRun: 'Doble viaje',
        insurance: 'Seguro',
        robberyInsurance: 'Seguro antirrobo',
        shield: 'Escudo protector',
        tightFitTip: 'Propina por roce',
        dashcam: 'Cámara de salpicadero',
        chainSaver: 'Salvador de cadena',
        winterTyres: 'Neumáticos de invierno',
        fogLamps: 'Faros antiniebla',
      })[u],
    explanation: (u) =>
      ({
        morePatrols: 'Más coches patrulla esperan en tu cola, listos cuando aparezca un criminal.',
        longerPursuit: 'Los criminales tardan más en huir, dándote más tiempo para interceptarlos.',
        quietStreets: 'Algunos turnos transcurren sin ningún criminal.',
        interceptor: 'Un coche de policía directamente tras un criminal lo alcanza con mayor rapidez.',
        dispatchRadio: 'Cada turno permite 3 avisos para colocar un coche patrulla al frente; cada nivel añade uno y reduce el coste de combo.',
        backup: 'Permite que un coche patrulla choque una vez más por turno sin penalización severa.',
        cashRoute: 'Los furgones blindados aparecen antes y con mayor frecuencia.',
        overtime: 'Cada turno completado reporta mayores ingresos.',
        freight: 'Más camiones en la calle: tráfico más denso, pero cada turno paga más y cada peaje rinde más.',
        quickRecovery: 'Los conductores reanudan la marcha con más fuerza tras un accidente. La calle recupera antes su ritmo.',
        doubleRun: 'En ocasiones, tras un primer furgón blindado aparece inmediatamente un segundo.',
        insurance: 'Cubre parte del dinero que te costaría un choque.',
        robberyInsurance: 'Cubre parte del dinero que te costaría la huida de un criminal.',
        shield: 'Tu propio coche puede chocar una vez adicional por turno sin terminar la partida. No aplica en Sin límites.',
        tightFitTip: 'Cada hueco ajustado otorga una propina instantánea sobre el pago del turno. No aplica en Sin límites.',
        dashcam: 'La cámara registra tus maniobras al límite: cada casi choque otorga una propina instantánea. No aplica en Sin límites.',
        chainSaver: 'Si mantienes el ritmo, una entrada normal por turno no romperá tu cadena. No aplica en Sin límites.',
        winterTyres: 'La lluvia, nieve y granizo reducen menos el agarre y la frenada: los choques deslizan menos y los coches frenan mejor.',
        fogLamps: 'Los conductores pierden menos tiempo por mal tiempo y detectan peligros antes; la niebla se percibe más despejada.',
      })[u],
    total(u, steps, c) {
      const t = steps;
      switch (u) {
        case 'morePatrols':
          return `+${percent(t * c.patrolsPerStep)} coches patrulla`;
        case 'longerPursuit':
          return `+${t * c.pursuitPerStep} s persecución`;
        case 'quietStreets':
          return `${percent(t * c.quietStreetsPerStep)} menos turnos con criminales`;
        case 'interceptor':
          return `+${percent(t * c.interceptorPerStep)} velocidad de caza`;
        case 'dispatchRadio':
          return `+${t * c.dispatchLimitPerStep} avisos · +${percent(t * c.dispatchRadioPerStep)} combo retenido`;
        case 'backup':
          return `+${steps * c.backupPerStep} choques de policía`;
        case 'cashRoute':
          return `${+(t * c.cashRoutePerStep).toFixed(1)} s antes`;
        case 'overtime':
          return `+${percent(t * c.overtimePerStep)} pago`;
        case 'freight':
          return `+${percent(t * c.freightPerStep)} camiones · +${percent(t * c.freightPayPerStep)} pago`;
        case 'quickRecovery':
          return `+${percent(t * c.recoveryPerStep)} aceleración · +${percent(t * c.recoveryPayPerStep)} pago`;
        case 'doubleRun':
          return `${percent(t * c.doubleRunPerStep)} viajes dobles`;
        case 'insurance':
        case 'robberyInsurance':
          return t * c.insurancePerStep >= 1 ? 'COBERTURA TOTAL' : `${percent(t * c.insurancePerStep)} cubierto`;
        case 'shield':
          return t === 1 ? '1 choque perdonado' : `${t} choques perdonados`;
        case 'tightFitTip':
          return `${percent(t * c.tightFitTipPerStep)} del pago del turno por hueco ajustado`;
        case 'dashcam':
          return `${percent(t * c.nearMissTipPerStep)} del pago del turno por casi choque`;
        case 'chainSaver':
          return t === 1 ? '1 cadena salvada por turno' : `${t} cadenas salvadas por turno`;
        case 'winterTyres':
          return `${percent(t * c.winterTyresPerStep)} del agarre recuperado`;
        case 'fogLamps':
          return `${percent(t * c.fogLampsPerStep)} menos tiempo de reacción perdido`;
      }
    },
    stepEffect(u, steps, max, c) {
      const now = S.upgrades.total(u, steps, c);
      if (steps >= max) return `Ahora ${now}`;
      return `Ahora ${now} · siguiente nivel ${S.upgrades.total(u, steps + 1, c)}`;
    },
  },

  heat: {
    button: (heat) => `Calor +${Math.round(heat * baseConfig.heatPay * 100)} %`,
    cleared: (heat) => `¡CALOR ${heat} SUPERADO!`,
    rule: (level) => `Supera un turno con Calor ${level}`,
  },

  mods: {
    label: 'Modificadores del próximo turno',
    tailwind: (pay) => `Viento a favor +${Math.round(pay * 100)} %`,
    streak: (pay) => `Racha +${Math.round(pay * 100)} %`,
    family: (share) => `Familia −${Math.round(share * 100)} %`,
    contract: (goal, times) => `${goal} ×${times}`,
  },

  goals: {
    tierMiss: (m) => `Faltan ${m.short} ${m.short === 1 ? 'coche' : 'coches'} para ${S.modes.tier(m.tier)}`,
    money: (short, upgrade) => `Faltan ${money(short)} para ${S.upgrades.name(upgrade)}`,
    nearMiss(n) {
      switch (n.k) {
        case 'cars':
          return n.left === 1 ? `Solo 1 coche para el nivel ${n.level + 1}` : `Faltan ${n.left} coches para el nivel ${n.level + 1}`;
        case 'best':
          return `A ${Fmt.number(n.short)} puntos de tu récord`;
        case 'combo':
          return `A ${n.short === 1 ? '1 entrada' : `${n.short} entradas`} de ×${+n.multiplier.toFixed(2)}`;
      }
    },
  },

  photo: {
    button: 'Foto',
    buttonLabel: 'Hacer una captura de este resultado',
    dialog: 'Imagen de tu turno',
    share: 'Compartir',
    copy: 'Copiar',
    sendChallenge: 'Enviar como desafío',
    copyChallenge: 'Copiar con enlace',
    challengeCopied: 'Imagen y enlace copiados',
    download: 'Descargar',
    saved: 'Guardado',
    close: 'Cerrar',
    score: 'PUNTOS',
    flames: 'LLAMAS',
    cars: 'COCHES',
    newBest: 'NUEVO RÉCORD',
    hook: (score) => `¿Puedes superar ${score}?`,
    hookFlames: (flames) => `¿Puedes superar ${flames} llamas?`,
    hookChill: 'Acompáñame en una vuelta tranquila.',
    combo: (n) => `Combo ×${n}`,
    tightFits: (n) => (n === 1 ? '1 hueco ajustado' : `${n} huecos ajustados`),
    busted: (n) => `${n} capturados`,
    wrecks: (n) => (n === 1 ? '1 choque' : `${n} choques`),
    chain: (n) => `Cadena de ${n}`,
    city: 'La ciudad',
  },

  result: {
    detonated: '¡BUM!',
    escaped: 'ESCAPÓ',
    levelComplete: (l) => `NIVEL ${l} SUPERADO`,
    newBest: 'NUEVO RÉCORD',
    points: (n) => `${n} puntos`,
    fullCoverage: 'COBERTURA COMPLETA',
    loss: (amount, escaped) => (escaped ? 'PÉRDIDA ' : 'COSTE DEL CHOQUE ') + '−' + money(amount),
    covered: (amount) => `COBERTURA COMPLETA · ${money(amount)} pagados por el seguro`,
    nextLevel: (l) => `Toca para el nivel ${l}`,
    retryLevel: (l) => `Toca para reintentar el nivel ${l}`,
    stats(combo, tightFits, busted, transporters, time) {
      return [
        time,
        combo > 1 ? `mejor combo ${Fmt.number(combo)}` : null,
        tightFits > 0 ? `${Fmt.number(tightFits)} ${tightFits === 1 ? 'Hueco ajustado' : 'Huecos ajustados'}` : null,
        busted > 0 ? `${busted} capturas` : null,
        transporters > 0 ? `${transporters} furgones cobrados` : null,
      ]
        .filter((x): x is string => x !== null)
        .join(' · ');
    },
  },

  hud: {
    moneyLabel: 'DINERO',
    scoreLabel: 'PUNTOS',
    rushHour: 'HORA PUNTA',
    tight: '¡JUSTO!',
    cutOff: 'CORTADO',
    dispatch: 'AVISO',
    danger: 'PELIGRO',
    boom: '¡BUM!',
    covered: 'CUBIERTO',
    combo: (n) => `COMBO ${n}`,
    cars: (n) => (n === 1 ? '1 coche' : `${n} coches`),
    wanted: (seconds) => `BUSCADO ${Math.ceil(Math.max(0, seconds))}`,
    rushFactor: (value) => `HORA PUNTA ${multiplier(value)}`,
    critical: (points) => `CRÍTICO ${points}`,
    shave: (points) => `ROZANDO ${points}`,
    chainHeld: 'CADENA RETENIDA',
    label(t) {
      switch (t) {
        case 'police':
          return 'POLICÍA';
        case 'pickup':
          return 'CRIMINAL';
        case 'transporter':
          return 'ASEGURADO';
        case 'tanker':
          return 'GAS';
        case 'military':
          return 'BOMBA';
        case 'ambulance':
          return 'AMBULANCIA';
        case 'fireTruck':
          return 'BOMBEROS';
        case 'learner':
          return 'EN PRÁCTICAS';
        case 'bus':
          return 'AUTOBÚS';
        case 'motorbike':
          return 'MOTO';
        case 'oversize':
          return 'CARGA ANCHA';
        case 'racer':
          return 'PILOTO';
        case 'wedding':
          return 'BODA';
        default:
          return null;
      }
    },
  },

  detail: {
    now: 'Ahora',
    nextStep: 'Siguiente nivel',
    step: (s, max) => `Nivel ${s} de ${max}`,
    buy: (price) => `Comprar · ${price}`,
    build: (price) => `Construir · ${price}`,
    remove: 'Eliminar',
    close: 'Cerrar',
  },

  notice: {
    more: (n) => `+${n} más · ver Progreso`,
    notEnoughMoney: (price) => `Falta ${MONEY_MARK} · se necesitan ${money(price)}`,
    detourIdle: 'Construido, pero no tiene efecto: no hay salidas entre la señal y tu ramal',
  },
});
