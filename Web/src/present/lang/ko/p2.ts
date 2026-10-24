import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { INVITE_LEVEL } from '../../../core/config';
import { rematchKind, ascensionRank, levelTrialLevel, levelKind, LANDMARK_PRESTIGE, type TrialId } from '../../../core/trials';
import { Fmt, money } from '../../format';

/** 한국어 파트 2: 트라이얼, 보스, 레전더리, 주간 시프트, 프레스티지, 엘리트. */
export default (S: Strings): Words<Strings> => ({
  rush: {
    name: '보스 러시',
    caption: '보스 러시',
    clock: '시간',
    best: '최고',
    step: (n, total) => `보스 ${n} / ${total}`,
    shiftLine: (kind, first) => `${S.boss.name(kind)} · ${first ? '한 번이라도 지면 처음부터 다시' : '시간은 계속 흘러요'}`,
    caught: (n, total) => `보스 ${n} / ${total} 체포`,
    nextLine: (kind) => `다음은 ${S.boss.name(kind)} · 탭해서 계속`,
    over: '러시 종료',
    overLine: (caught, total) => `보스 ${total}명 중 ${caught}명 체포 · 탭해서 다시 시작`,
    cleared: '러시 클리어',
    firstLine: (m) => `보스 여덟 명을 모두 잡았어요 · ${m} 지급`,
    recordLine: '새 최고 기록',
    bestLine: (time) => `최고 기록 ${time} · 탭해서 다시 도전`,
    rowTitle: '보스 여덟 명 전부',
    line: '연달아, 시계는 하나',
    furthest: (n, total) => `최대 ${n}/${total}`,
    locked: (beaten, total) => `보스 여덟 명을 모두 잡으면 열려요 · ${beaten}/${total}`,
  },

  trials: {
    name(id) {
      const boss = rematchKind(id);
      if (boss) return S.boss.rematch(boss);
      if (id === 'landmark.etoile') return '에투알 개선문';
      if (id === 'weekly') return S.weekly.title;
      if (id.startsWith('tour.')) return S.tours.stopName(id);
      const rank = ascensionRank(id);
      if (rank !== null) return `승천 ★${rank}`;
      const level = levelTrialLevel(id);
      if (level !== null) return `${S.trials.kindName[levelKind(level)]} · Lv ${level}`;
      return {
        tightSqueeze: '아슬아슬 통과',
        deadCentre: '정중앙',
        cleanSheet: '무사고',
        blackout: '블랙아웃',
        stormWatch: '폭풍 경계',
        marathon: '마라톤',
        mostWanted: '최우선 수배',
        noPolice: '경찰 없이',
        noDriving: '맨손으로',
        bareBuild: '맨몸 구성',
      }[id as TrialId];
    },
    kindName: {
      precision: '정밀',
      sharpEyes: '날카로운 눈',
      cleanRun: '깔끔한 주행',
      weatherRun: '험한 날씨',
      nightShift: '야간 근무',
      manhunt: '추적',
      ruleBreaker: '가차 없음',
      handicap: '핸디캡',
      longHaul: '장거리',
    },
    goal(t) {
      if (t.tour) return S.tours.goal(t);
      if (t.elite) return S.weekly.goal(t);
      if (levelTrialLevel(t.id) !== null) {
        const strip = t.strip ?? [];
        const parts = [
          t.goal.k === 'perfects'
            ? `퍼펙트 ${t.goal.n}번`
            : t.goal.k === 'skilled'
              ? `아슬아슬 이상 ${t.goal.n}번`
              : t.goal.k === 'boss'
                ? `${S.boss.name(t.boss ?? 'convoy')} 체포`
                : null,
          `${t.cars}대`,
          t.weather !== 'clear' ? S.weather(t.weather) : null,
          t.darkness === 'blackout' ? S.blackout : t.darkness === 'night' ? S.night : null,
          t.legendary ? S.legendary.name(t.legendary) : null,
          t.rule === 'flawless' ? '충돌 없음' : null,
          strip.length > 0 ? `${strip.map((g) => ['경찰', '돈', '주행'][g]).join('과(와) ')} 없는 구성` : null,
        ];
        return parts.filter((p): p is string => p !== null).join(' · ');
      }
      if (ascensionRank(t.id) !== null) {
        const parts = [
          `${t.cars}대`,
          t.weather !== 'clear' ? S.weather(t.weather) : null,
          t.darkness === 'blackout' ? S.blackout : t.darkness === 'night' ? S.night : null,
          t.legendary ? S.legendary.name(t.legendary) : null,
          t.rule === 'flawless' ? '충돌 없음' : null,
          t.goal.k === 'boss' ? '보스 체포' : null,
        ];
        return parts.filter((p): p is string => p !== null).join(' · ');
      }
      const boss = rematchKind(t.id);
      if (boss) return `${S.boss.name(boss)} 재도전: 호위는 늘고, 시간은 줄어요`;
      if (t.arms) return `한 링에 도로 ${t.arms}개 · ${t.cars}대`;
      switch (t.id) {
        case 'tightSqueeze':
          return `${t.cars}대 중 아슬아슬 이상 ${t.goal.k === 'skilled' ? t.goal.n : 0}번`;
        case 'deadCentre':
          return `${t.cars}대 중 퍼펙트 ${t.goal.k === 'perfects' ? t.goal.n : 0}번`;
        case 'cleanSheet':
          return `${t.cars}대, 충돌 없음`;
        case 'blackout':
          return `밤에 ${t.cars}대, 가로등은 꺼짐`;
        case 'stormWatch':
          return `밤의 폭풍 속에서 ${t.cars}대`;
        case 'marathon':
          return `한 시프트에 ${t.cars}대`;
        case 'mostWanted':
          return '신디케이트 보스를 잡으세요';
        case 'noPolice':
          return `내 구성으로 ${t.cars}대, 단 경찰 업그레이드 없이`;
        case 'noDriving':
          return `내 구성으로 ${t.cars}대, 단 주행 업그레이드 없이(방패 없음)`;
        case 'bareBuild':
          return `내 구성으로 ${t.cars}대, 단 경찰과 주행 업그레이드 없이`;
        default:
          return '';
      }
    },
    level: (l) => `레벨 ${l}`,
    passed: '통과',
    play: '플레이',
    opensAt: (l) => `레벨 ${l}에서 열려요`,
    opens: (t) => {
      const rank = ascensionRank(t.id);
      if (rank !== null) return `프레스티지 ★${rank}에서 열려요`;
      return t.arms ? `프레스티지 ★${LANDMARK_PRESTIGE}에서 열려요` : S.trials.opensAt(t.level);
    },
    howTo(t) {
      if (t.goal.k === 'perfects') {
        return {
          title: '요령 · 퍼펙트',
          text: '차를 간격의 정확히 가운데에 넣으세요. 앞뒤 여유가 비슷하게요. 그냥 길게 빈 구간은 인정되지 않아요. 중간쯤 되는 간격을 고르세요.',
          short: '너무 크지 않은 간격의 한가운데',
        };
      }
      if (t.goal.k === 'skilled') {
        return {
          title: '요령 · 아슬아슬',
          text: '다른 차에 닿지 않게 바로 앞이나 뒤로 바짝 합류하세요. 아슬아슬, 니어 미스, 퍼펙트가 인정돼요. 여유 있게 합류하면 인정되지 않아요.',
          short: '충돌 없이 다른 차 바로 옆으로',
        };
      }
      return null;
    },
    progress: (t, have, need) => `${t.goal.k === 'perfects' ? '퍼펙트' : '아슬아슬 이상'} ${Math.min(have, need)}/${need}${have >= need ? ' ✓' : ''}`,
  },

  boss: {
    incoming: '신디케이트 호송대',
    scoutFirst: '호위를 단 척후예요. 호위 앞 간격으로 경찰차를 들이받으세요',
    name: (k) =>
      ({
        convoy: '호송대',
        getaway: '도주 운전사',
        armoured: '장갑 보스',
        phantom: '팬텀',
        twins: '쌍둥이',
        decoy: '미끼',
        smuggler: '밀수꾼',
        kingpin: '킹핀',
      })[k],
    rematch: (k) => `리벤지 · ${S.boss.name(k)}`,
    beaten: '체포',
    escaped: '보스 도주',
    wanted: (seconds) => `보스 ${Math.ceil(Math.max(0, seconds))}`,
    busted: (amount) => `보스 체포 · ${amount} 회수`,
    label: (role) => (role === 'boss' ? '보스' : role === 'escort' ? '호위' : null),
  },

  legendary: {
    caption: '레전더리 시프트',
    name: (r) => ({ gridlock: '교통 대란', dragnet: '대규모 수색', heavyLoad: '중량 화물', darkStorm: '어두운 폭풍', zeroTolerance: '무관용' })[r],
    line: (r) =>
      ({
        gridlock: '첫 차부터 러시아워',
        dragnet: '범죄자가 두 배로 자주 등장',
        heavyLoad: '온통 트럭, 그중 절반은 가스 탱커',
        darkStorm: '블랙아웃 속의 폭풍',
        zeroTolerance: '충돌 한 번이면 끝',
      })[r],
    reward: '보상',
    chest: '프리미엄',
    done: (item) => `레전더리 시프트 클리어${item ? ` · ${S.shop.item(item)} 해금` : ''}`,
    broken: '규칙 위반',
  },

  weekly: {
    title: '주간 시프트',
    caption: '주간 시프트',
    elite: (e) => ({ flawless: '완벽', precision: '정밀', storm: '폭풍 전선', gridlock: '교통 대란', dragnet: '대규모 수색', boss: '보스 사냥' })[e],
    goal(t) {
      switch (t.elite) {
        case 'flawless':
          return `레벨 ${t.level} · ${t.cars}대, 충돌 없음`;
        case 'precision':
          return `레벨 ${t.level} · ${t.cars}대 중 퍼펙트 ${t.goal.k === 'perfects' ? t.goal.n : 0}번`;
        case 'storm':
          return `레벨 ${t.level} · 밤의 폭풍 속에서 ${t.cars}대`;
        case 'gridlock':
          return `레벨 ${t.level} · 처음부터 러시아워로 ${t.cars}대`;
        case 'dragnet':
          return `레벨 ${t.level} · ${t.cars}대, 범죄자가 두 배로 자주`;
        case 'boss':
          return `레벨 ${t.level} · 신디케이트 보스 체포`;
        default:
          return '';
      }
    },
    daysLeft: (n) => (n === 1 ? '마지막 날' : `${n}일 남음`),
    hint: '이번 주는 모두에게 같은 시프트예요. 몇 번이든 플레이할 수 있지만 보상은 한 번만 나와요.',
    done: (m) => `주간 시프트 클리어 · +${money(m)}`,
    passedThisWeek: '이번 주 통과 · 새 시프트는 월요일',
  },

  invite: {
    shareText: (level) => `나랑 Roundabout Timing 같이 하자! 레벨 ${level}에 도달하면 둘 다 무료 상자를 받아.`,
  },

  rewards: {
    crew: (reason, what) => {
      const [kind, what2, ...rest] = reason.split(':');
      if (kind !== 'crew') return null;
      switch (what2) {
        case 'gift':
          return `크루 선물 · ${what} · ${rest.slice(1).join(':') || '내 크루'}에게서`;
        case 'up':
          return `승급 · ${what} · ${S.crew.league(rest[0] ?? '')}`;
        case 'goal':
          return `주간 목표 달성 · ${what} · 크루 덕분이에요`;
        case 'xp':
          return `주간 목표 ×${rest[0] ?? ''} · ${what} · 크루가 크게 해냈어요`;
        case 'top':
          return `리그 ${rest[0] ?? ''}위 · ${what} · 크루가 상위권으로 마쳤어요`;
        case 'back':
          return `선물이 돌아왔어요 · ${what} · 아무도 받지 않았어요`;
        default:
          return null;
      }
    },
    bugHunter: (id) => `${S.shop.item(id).toUpperCase()} 해금 · 버그를 찾아 줘서 고마워요`,
    chest: (kind) => `팀의 선물 · ${S.shop.chest(kind)} · 고마워요`,
    money: (amount) => `팀의 선물 · 돈 ${Fmt.number(amount)} · 고마워요`,
    item: (id) => `팀의 선물 · ${S.shop.item(id)} 해금`,
    invite: (reason, kind) => {
      const [, what, ...rest] = reason.startsWith('invite:') ? reason.split(':') : [];
      const who = rest.join(':');
      switch (what) {
        case 'welcome':
          return `초대 보상 · ${S.shop.chest(kind)} · ${who}님의 초대로 가입했어요`;
        case 'friend':
          return `초대 보상 · ${S.shop.chest(kind)} · ${who}님이 레벨 ${INVITE_LEVEL}에 도달했어요`;
        case 'milestone':
          return `초대 보너스 · ${S.shop.chest(kind)} · 친구 ${who}명이 가입했어요`;
        default:
          return null;
      }
    },
  },

  prestige: {
    title: '프레스티지',
    ready: (level) => `레벨 ${level} 도달: 더 험한 도로에서 레벨 1부터 다시 시작해요`,
    locked: (level) => `레벨 ${level}에 도달하면 더 험한 도로에서 다시 시작할 수 있어요`,
    keeps: '돈, 업그레이드, 도로, 컬렉션은 그대로예요. 겉모습만 바뀌고, 유리해지지는 않아요.',
    confirm: '다시 탭하면 프레스티지 · 레벨 1로 돌아가요',
    available: (rank) => `프레스티지 ★${rank} 준비 완료 · 진행 → 엘리트에서 다시 시작하면 더 험한 도로와 새 보상이 기다려요`,
    done: (rank, item) => `프레스티지 ★${rank}${item ? ` · ${S.shop.item(item)} 해금` : ''}`,
    headStart: (levels) => `교통이 ${levels}레벨만큼 더 거세져요`,
  },

  elite: {
    title: '엘리트',
    caption: (level) => `엘리트 ${level}`,
    locked: (level) => `레벨 ${level} 도달: 엘리트 도로와 프레스티지가 열려요`,
    prestigeHeader: '프레스티지',
    rank: '랭크',
    traffic: '교통',
    harder: (levels) => `+${levels}레벨`,
    prestigeAction: (rank) => `★${rank}로 프레스티지`,
    prestigeConfirm: '다시 탭 · 레벨 1로 돌아가요',
    next: (step) => `다음 엘리트 ${step.level}: ${S.elite.reward(step)}`,
    reward: (step) => (step.item ? S.shop.item(step.item.id) : step.title ? `칭호 “${S.titles.name(step.title)}”` : S.shop.chest(step.chest)),
    toGo: (b) => {
      const next = `엘리트 ${b.level + 1}까지 ${Fmt.number(b.left)} XP`;
      if (b.climbed > 0) return `엘리트 ${b.level} · ${next}`;
      return b.gained > 0 ? `+${Fmt.number(b.gained)} XP · ${next}` : next;
    },
    opened: '엘리트 드라이버 · 엘리트 도로가 열렸어요',
    reached: (step) => `엘리트 ${step.level}${step.item ? ` · ${S.shop.item(step.item.id)} 해금` : ''}`,
    body: [
      '레벨 50부터는 시프트마다 엘리트 XP가 들어와요. 시프트 완료 10, 퍼펙트와 아슬아슬 하나당 1, 보스 체포나 레전더리 시프트는 10 추가.',
      '엘리트 레벨은 오를수록 필요한 XP가 조금씩 늘어요. 레벨마다 스탠더드 상자, 10레벨마다 프리미엄 상자가 나와요. 길목에는 칭호와 스킨도 있어요. 프레스티지를 해도 도로는 유지돼요.',
      '겉모습만 바뀌고, 도로에서 유리해지는 일은 절대 없어요.',
    ],
    trackHeader: '도로를 따라',
    titlesHeader: '칭호 · 탭해서 착용',
    wearing: '착용 중',
    notYet: '아직',
  },
});
