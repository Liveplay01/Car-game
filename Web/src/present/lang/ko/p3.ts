import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { Fmt, money } from '../../format';

/** 한국어 파트 3: 칭호, 시즌 패스, 명예의 전당, 모드, 시즌 규칙, 투어. */
export default (S: Strings): Words<Strings> => ({
  titles: {
    name: (id) =>
      ({
        eliteDriver: '엘리트 드라이버',
        roadVeteran: '도로의 베테랑',
        ringMaster: '링 마스터',
        ironNerves: '강철 신경',
        roadRoyalty: '도로의 귀족',
        livingLegend: '살아 있는 전설',
        precisionDriver: '정밀 드라이버',
        comboMaster: '콤보 마스터',
        closeCallArtist: '아슬아슬의 달인',
        syndicateBreaker: '신디케이트 파괴자',
        nightOwl: '올빼미',
        stormChaser: '폭풍 추격자',
        legendHunter: '전설 사냥꾼',
        starDriver: '스타 드라이버',
        marathoner: '마라토너',
        overdriver: '오버드라이버',
        endless: '끝없는',
        scorcher: '질주자',
        inferno: '인페르노',
        meltdown: '멜트다운',
        patron: '후원자',
        benefactor: '은인',
        philanthropist: '자선가',
        visionary: '선구자',
        sovereign: '군주',
        timeless: '시간을 넘어선 자',
        apex: '정점',
        boundless: '끝이 없는',
        ascended: '승천한 자',
        eternal: '영원',
        grandmaster: '그랜드마스터',
        centurion: '백인대장',
        immortal: '불멸',
        roadWarden: '도로 감시자',
        gridlord: '그리드로드',
        ringbearer: '링베어러',
        unstoppable: '멈출 수 없는 자',
        timekeeper: '시간의 수호자',
        paragon: '귀감',
        mythic: '신화급',
        ringEternal: '영원한 링',
        mastermind: '배후의 두뇌',
        summit: '정상',
        syndicateEnd: '신디케이트의 종말',
      })[id],
    rule(r) {
      switch (r.k) {
        case 'elite':
          return `엘리트 ${r.level} 도달`;
        case 'mastery':
          return `마스터리 “${S.mastery.name(r.goal)}” 완료`;
        case 'bosses':
          return r.all ? '신디케이트 보스 여덟 명 모두 체포' : '신디케이트 보스 처음 네 명 체포';
        case 'trial':
          return `트라이얼 “${S.trials.name(r.id as never)}” 통과`;
        case 'legendary':
          return `레전더리 시프트 ${r.shifts}번 클리어`;
        case 'prestige':
          return `프레스티지 ★${r.rank} 도달`;
        case 'heat':
          return S.heat.rule(r.level);
        case 'fund':
          return `게임 펀드에 ${money(Fmt.number(r.amount))} 기부`;
        case 'item':
          return `언리미티드에서 ${S.shop.item(r.id)} 해금`;
        case 'masteries':
          return '모든 마스터리에서 V단계 달성';
      }
    },
    earned: (ids) => (ids.length === 1 ? `칭호 · ${S.titles.name(ids[0])}` : `새 칭호 ${ids.length}개 · ${ids.map((t) => S.titles.name(t)).join(', ')}`),
    none: '칭호 없음',
  },

  pass: {
    title: '시즌 패스',
    seasonName: (s) => ({ winter: '겨울', spring: '봄', summer: '여름', autumn: '가을' })[s],
    caption: (s) => `시즌 패스 ${S.pass.seasonName(s)}`,
    tier: (n, total) => `${total}단계 중 ${n}단계`,
    locked: (level) => `레벨 ${level}에서 열려요`,
    buyHint: '상자, 돈, 스킨 세 개',
    free: '무료',
    waiting: (n) => `${n}단계가 패스를 기다리고 있어요`,
    daysLeft: (n) => (n === 1 ? '마지막 날' : `${n}일 남음`),
    complete: '도로 완주 · 다음 시즌까지 기다려요',
    openAtEnd: (n) => `곧 시즌 종료 · ${n}단계가 아직 남았어요`,
    reached: (step) =>
      `시즌 패스 · ${step.tier}단계 · ${step.duplicate > 0 ? `${S.pass.reward(step.reward)} 다시 · +${money(Fmt.number(step.duplicate))}` : S.pass.reward(step.reward)}`,
    buy: (price) => `구매 · ${price}`,
    body: (xpPerTier) => [
      `이번 시즌의 12단계 도로이고, 게임 머니로 구매해요. 시프트를 플레이할 때마다 XP가 쌓여요. 시프트 완료 10, 퍼펙트와 아슬아슬 하나당 1, 보스나 레전더리 시프트는 10 추가. 첫 단계에는 ${xpPerTier} XP가 필요하고, 이후는 조금씩 늘어요.`,
      '세 단계에는 이번 시즌 스킨이 들어 있고, 상자에는 없는 효과가 붙어요. 사계절은 해마다 돌아오고, 스킨도 함께 돌아와요.',
      '겉모습만 바뀌고, 도로에서 유리해지는 일은 절대 없어요. 여기에는 진짜 돈이 들지 않아요.',
    ],
    freeBody: (xpPerTier) => [
      `이번 시즌의 12단계 도로예요. 패스가 있든 없든 시프트를 플레이할 때마다 XP가 쌓여요. 시프트 완료 10, 퍼펙트와 아슬아슬 하나당 1, 보스나 레전더리 시프트는 10 추가. 첫 단계에는 ${xpPerTier} XP가 필요하고, 이후는 조금씩 늘어요.`,
      '세 단계는 누구나 무료예요. 게임 머니로 패스를 사면 나머지 단계도 보상이 나오고, 이미 도달한 단계는 바로 받아요.',
      '세 단계에는 이번 시즌 스킨이 들어 있고, 상자에는 없는 효과가 붙어요. 사계절은 해마다 돌아오고, 스킨도 함께 돌아와요. 겉모습만 바뀌고, 도로에서 유리해지는 일은 절대 없어요.',
    ],
    trackHeader: '도로',
  },

  hall: {
    header: '프레스티지 연대기',
    plaqueLine: (e, date) => [date, e.elite > 0 ? `엘리트 ${e.elite}` : null, `보스 ${e.bosses}명`, e.legendary > 0 ? `레전더리 ${e.legendary}번` : null].filter((x) => x).join(' · '),
    empty: '첫 프레스티지가 첫 명판이 돼요.',
  },

  modes: {
    name: (m) => (m === 'shift' ? '시프트' : m === 'unlimited' ? '언리미티드' : m === 'mayhem' ? '메이헴' : '멀티플레이'),
    line: (m) =>
      m === 'shift'
        ? '레벨을 깨고 올라가요'
        : m === 'unlimited'
          ? '끝없이 · 충돌할 때까지'
          : m === 'mayhem'
            ? '차 12대 · 탱커를 노려요'
            : '친구 최대 4명 · 마지막까지 남으면 승리',
    youLabel: '나',
    defaultName: '플레이어',
    runOver: '플레이 종료',
    again: '탭해서 다시 시작',
    carsSent: (n) => `${n}대`,
    tryUnlimited: { caption: '게임 모드', text: '옆으로 밀면 언리미티드예요. 레벨 없이 충돌할 때까지 달려요' },
    tightFit: { caption: '팁', text: '가까울수록 이득: 차 바로 뒤에 합류하면 아슬아슬, 점수 두 배' },
    swipeCaption: '게임 모드',
    swipeHint: '밀어서 다른 모드 보기',
    tryUnlimitedKeys: { caption: '게임 모드', text: '→ 키로 언리미티드. 레벨 없이 충돌할 때까지 달려요' },
    swipeHintKeys: '← → 로 다른 모드 보기',
    stage: (stage, overtime) =>
      overtime > 0
        ? `초과 근무 ${overtime} · 교통량이 늘고 조금 빨라져요`
        : (['', '가스 탱커가 섞여 들어와요', '밤이 찾아와요', '폭풍이 다가와요', '군용 트럭이 도로에'][stage] ?? ''),
    tier: (id) => ({ bronze: '브론즈', silver: '실버', gold: '골드', platinum: '플래티넘', diamond: '다이아몬드', master: '마스터' })[id],
    mark: (cars, reward) =>
      reward.tier ? `${cars}대 · ${S.modes.tier(reward.tier).toUpperCase()}` : reward.skin ? `${cars}대 · ${S.shop.item(reward.skin).toUpperCase()}` : `${cars}대`,
    tierUp: (id) => `새 등급 · 언리미티드 ${S.modes.tier(id).toUpperCase()}`,
    tierLine: (id, next) => [id ? S.modes.tier(id) : '–', next ? `${S.modes.tier(next.id)}까지 ${next.cars}대` : null].filter(Boolean).join(' · '),
    milestone: (id) => `언리미티드 이정표 · ${S.shop.item(id)} 해금`,
  },

  mayhem: {
    caption: '메이헴',
    flames: '불꽃',
    cars: '차',
    chain: (n) => `연쇄 ×${n}`,
    over: '메이헴 종료',
    again: '탭해서 메이헴 계속',
    summary: (wrecks, chain) => `잔해 ${wrecks}대 · 최대 연쇄 ×${chain}`,
  },

  seasonRule: {
    name: (s) => ({ winter: '한겨울', spring: '봄 소나기', summer: '여름 폭풍', autumn: '안개와 황혼' })[s],
    line: (s) =>
      ({
        winter: '안개와 눈이 잦아지고 밤이 일찍 찾아와요',
        spring: '비가 더 많이, 더 자주 와요',
        summer: '대체로 맑지만, 날씨가 무너지면 폭풍이 돼요',
        autumn: '안개가 늘고 저녁이 일찍 와요',
      })[s],
  },

  tours: {
    caption: '투어',
    name: (id) => ({ halloween: '유령의 링', winter: '윈터 라이트' })[id],
    tagline: (id) =>
      ({
        halloween: '해가 진 뒤의 일곱 정거장. 스킨 세 개는 여기서만.',
        winter: '눈 덮인 일곱 정거장. 스킨 세 개는 여기서만.',
      })[id],
    stop: (n, of) => `정거장 ${n}/${of}`,
    stopName: (id) => {
      const m = /^tour\.([a-z]+)\.(\d+)$/.exec(id);
      return m ? `${S.tours.name(m[1] as 'halloween' | 'winter')} · 정거장 ${m[2]}` : '';
    },
    left: (n) => (n <= 1 ? '마지막 날' : `${n}일 남음`),
    opensIn: (n) => (n === 1 ? '내일' : `${n}일 뒤`),
    startsIn: (inDays) => `${S.tours.opensIn(inDays)} 시작`,
    locked: (level) => `투어는 레벨 ${level}에서 열려요`,
    progress: (done, total) => `정거장 ${done}/${total}`,
    play: '플레이 ›',
    goal(t) {
      const parts = [
        `${t.cars}대`,
        t.weather !== 'clear' ? S.weather(t.weather) : null,
        t.darkness === 'blackout' ? S.blackout : t.darkness === 'night' ? S.night : null,
        t.legendary ? S.legendary.name(t.legendary) : null,
        t.rule === 'flawless' ? '충돌 없음' : null,
        t.goal.k === 'perfects' ? `퍼펙트 ${t.goal.n}번` : null,
        t.goal.k === 'boss' ? '보스 체포' : null,
      ];
      return parts.filter((p): p is string => p !== null).join(' · ');
    },
    reward(r) {
      const parts = [r.item ? S.shop.item(r.item) : null, r.chest ? S.shop.chest(r.chest) : null, r.money ? `${Fmt.number(r.money)} 코인` : null];
      return parts.filter((p): p is string => p !== null).join(' + ');
    },
    stopDone: (n, of, reward) => `투어 정거장 ${n}/${of} · ${reward}`,
    complete: (id) => `${S.tours.name(id).toUpperCase()} 클리어`,
    passedBefore: '이 투어에서 이미 달성했어요',
  },
});
