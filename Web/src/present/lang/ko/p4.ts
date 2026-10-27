import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { Fmt, money } from '../../format';
import { SPECIAL_TEXT, FAIL_TEXT } from '../../museumText';

const COLORS: Record<string, string> = { purple: '보라', gold: '금색', blue: '파랑', red: '빨강', teal: '청록', orange: '주황', pink: '분홍', rose: '장밋빛' };
const color = (name: string): string => COLORS[name] ?? name;

/** 한국어 파트 4: 업적, 브리핑, 알림, 탭, 진행, 소셜, 박물관. */
export default (S: Strings): Words<Strings> => ({
  ach: {
    heading: '업적',
    name: (id) =>
      ({
        scrapyard: '폐차장',
        fireworks: '불꽃놀이',
        spotless: '흠 하나 없이',
        jackpot: '잭팟 헌터',
        critical: '치명타',
        wizard: '교통의 마법사',
        earner: '고소득자',
        weatherproof: '날씨에 강한',
        stormRider: '폭풍 기수',
        whiteout: '화이트아웃',
        moonlighter: '야간 알바',
        lightsOut: '불 꺼짐',
        cityLife: '도시 생활',
        longHaul: '장거리',
        clockwork: '시계태엽',
        onARoll: '승승장구',
        regular: '단골',
        testDriver: '테스트 드라이버',
        hunter: '신디케이트 사냥꾼',
        roadBuilder: '도로 건설자',
        foreman: '현장 감독',
        tuner: '튜너',
        chestOpener: '상자 개봉가',
        collector: '수집가',
        climber: '등반가',
        elite: '엘리트 드라이버',
        reborn: '환생',
        heatSeeker: '히트 시커',
        gambler: '하이롤러',
        tourist: '관광객',
      })[id] ?? id,
    goal: (id, n) => {
      const N = Fmt.number(n);
      return (
        {
          scrapyard: `잔해를 ${N}대 만들기`,
          fireworks: `폭발을 ${N}번 일으키기`,
          spotless: `퍼펙트 런 ${N}번`,
          jackpot: `잭팟 수송차 ${N}대 전달`,
          critical: `치명적인 합류 ${N}번 성공`,
          wizard: `차 ${N}대 보내기`,
          earner: `도로에서 ${N} 코인 벌기`,
          weatherproof: `악천후 시프트 ${N}번 클리어`,
          stormRider: `폭풍, 우박, 모래 폭풍 시프트 ${N}번 클리어`,
          whiteout: `안개나 눈 시프트 ${N}번 클리어`,
          moonlighter: `밤 시프트 ${N}번 클리어`,
          lightsOut: `블랙아웃 시프트 ${N}번 클리어`,
          cityLife: `도시 이벤트가 있는 시프트 ${N}번 클리어`,
          longHaul: `언리미티드에서 ${Fmt.seconds(n)} 버티기`,
          clockwork: `일일 시프트 ${N}번 클리어`,
          onARoll: `일일 연속 ${N}일`,
          regular: `주간 시프트 ${N}번 통과`,
          testDriver: `트라이얼 ${N}번 통과`,
          hunter: `신디케이트 보스 ${N}명 체포`,
          roadBuilder: `추가 도로 ${N}개 건설`,
          foreman: `모듈 ${N}개 설치`,
          tuner: `업그레이드 ${N}단계 보유`,
          chestOpener: `상자 ${N}개 열기`,
          collector: `아이템 ${N}개 모으기`,
          climber: `레벨 ${N} 도달`,
          elite: `엘리트 ${N} 도달`,
          reborn: `프레스티지 ${N}번`,
          heatSeeker: `히트 ${N}에서 시프트 클리어`,
          gambler: `카지노 ${N}라운드 플레이`,
          tourist: `투어 정거장 ${N}개 통과`,
        } as Record<string, string>
      )[id] ?? ''
    },
    caption: '업적',
    reached: (id, tier, reward) => ({
      title: S.ach.name(id),
      tier: S.ach.tier(tier),
      reward: `+${money(reward)}`,
      text: `업적 · ${S.ach.name(id)} ${S.ach.tier(tier)} · +${money(reward)}`,
    }),
    many: (n, reward) => ({
      title: `업적 ${n}개`,
      tier: '★',
      reward: `+${money(reward)}`,
      text: `업적 ${n}개 · +${money(reward)} · 진행 → 목표에서 확인`,
    }),
  },

  brief: {
    caption: (e, again) => `${again ? '복습' : '새로움'} · ${S.museum.name(e)}`.toUpperCase(),
  },

  push: {
    streakTitle: (days) => `${days}일 연속 기록`,
    streakBody: '자정 전에 오늘의 일일 시프트를 플레이해서 기록을 이어 가세요.',
    giftTitle: '무료 상자가 준비됐어요',
    giftBody: '스탠더드 상자가 기다리고 있어요. 게임을 열어서 받아 가세요.',
    passTitle: (season) => `${S.pass.seasonName(season)}이(가) 왔어요`,
    passBody: '새 시즌 패스가 시작됐어요. 새 스킨 세 개를 얻을 수 있어요.',
    row: '알림',
    rowSub: '연속 기록, 무료 상자, 새 시즌, 또는 TOP 20에서 누군가 나를 앞질렀을 때. 하루에 최대 한 번.',
    rowInstall: '먼저 게임을 홈 화면에 추가한 다음 여기서 켜세요.',
    choices: {
      streak: { title: '일일 연속 기록', sub: '기록이 끊기기 전날 저녁에 알려 줘요.' },
      chests: { title: '무료 상자', sub: '내일의 무료 상자와 초대 선물.' },
      pass: { title: '새 시즌', sub: '새 시즌 패스가 시작될 때.' },
      rank: { title: '추월당함', sub: 'TOP 20에서 다른 플레이어에게 추월당했을 때.' },
      comeback: { title: '돌아와요', sub: '며칠 쉬고 나서 보내는 알림.' },
    },
    rowNone: '여기서는 쓸 수 없어요. 알림을 켜려면 브라우저에서 게임을 여세요.',
    rowLocal: '켜짐. 게임을 닫았을 때의 알림에는 온라인 서비스가 필요한데, 이 버전에는 없어요.',
    confirmTitle: '알림이 켜졌어요',
    rowBlocked: '이 사이트에서 차단됐어요. 켜려면 브라우저 설정에서 알림을 허용하세요.',
    offerFirstTitle: '내일은 무료 상자',
    offerFirstWhy: '내일의 무료 상자가 준비되면, 그리고 기록이 끊기기 전에 알려 드려요. 하루에 최대 한 번, 밤에는 보내지 않아요. 설정에서 언제든 끌 수 있어요.',
    offerTitle: '연속 기록을 지켜요',
    offerWhy: '기록이 끊기기 전, 무료 상자가 준비됐을 때, 새 시즌이 시작될 때 알려 드려요. 하루에 최대 한 번, 밤에는 보내지 않아요. 설정에서 언제든 끌 수 있어요.',
    offerOn: '알림 켜기',
    offerLater: '나중에',
    on: '알림이 켜졌어요. 설정에서 언제든 끌 수 있어요.',
    failed: '알림을 켜지 못했어요. 나중에 다시 시도해 주세요.',
    denied: '이 사이트의 알림이 브라우저 설정에서 차단돼 있어요.',
  },

  wayBack: {
    chestTitle: '내일은 무료 상자',
    streakTitle: '내일 또 만나요',
    chestWhy: '게임을 홈 화면에 두면 내일의 무료 상자가 탭 한 번 거리에 있고, 진행 상황도 안전해요.',
    streakWhy: '게임을 홈 화면에 두면 내일의 연속 기록이 탭 한 번 거리에 있고, 진행 상황도 안전해요.',
    install: '게임 설치',
  },

  ready: {
    tapToStart: '탭해서 시작',
    tapForFriends: '탭해서 친구와 플레이',
  },

  tabs: {
    progress: '진행',
    social: '소셜',
    game: '게임',
    shop: '상점',
    build: '건설',
  },

  progress: {
    section: (i) => ['오늘', '목표', '통계'][i],
    allStats: '모든 기록',
    statsMore: (n) => `${n}개 더 ›`,
    statsHide: '숨기기',
    odometer: '총 주행거리',
    odometerLine: '들여보낸 모든 차, 출발부터 도착까지',
    odometerMoon: '달까지 왔어요. 아직 달리는 중이에요.',
    km: 'km',
    quests: '퀘스트',
    trials: '트라이얼',
    mastery: '마스터리',
    feats: '위업',
    trialsLocked: (level) => `레벨 ${level}에서 열려요 · 보상이 걸린 특별 시프트`,
    landmarks: '랜드마크',
    landmarksHint: '유명한 로터리를 하나씩, 어려운 시프트로.',
    ascension: '승천',
    ascensionHint: '프레스티지 랭크마다 트라이얼 하나. 게임에서 가장 어려운 시프트예요.',
    levelTrials: '레벨 트라이얼',
    levelTrialsHint: (waiting, shown) =>
      waiting > shown ? `레벨이 오를 때마다 하나씩 늘어요. ${waiting - shown}개가 더 기다리고 있어요: 하나를 통과하면 다음 것이 나타나요.` : '레벨이 오를 때마다 하나씩 늘어요. 레벨 30부터 120까지.',
    bosses: '신디케이트 보스',
    legendary: '레전더리 시프트',
    weeklies: '주간 시프트',
    ambulances: '통과시킨 구급차',
    level: '도달한 레벨',
    bestCombo: '최고 콤보',
    bestChain: '최장 퍼펙트 연쇄',
    streak: '일일 연속 기록',
    flameTier: (tier) => ['시동 꺼짐', '공회전', '엔진 가속', '실화', '애프터버너', '인페르노'][tier] ?? '',
    streakDay: '일 연속',
    streakDays: '일 연속',
    streakStart: '오늘의 일일 시프트를 플레이해서 시동을 걸어요',
    streakKeep: '오늘의 일일 시프트를 플레이해서 불꽃을 이어 가요',
    streakDone: '오늘은 완료 · 내일 또 만나요',
    streakCard: (n) => (n === 1 ? '다음 날 무료 스크래치 카드' : `${n}일 뒤 무료 스크래치 카드`),
    shiftsPlayed: '플레이한 시프트',
    shiftsCompleted: '완료한 시프트',
    takedowns: '체포한 범인',
    transporters: '전달한 수송차',
    unlimitedBest: '언리미티드 최고 기록',
    unlimitedCars: '언리미티드 차 수',
    unlimitedTier: '언리미티드 등급',
    mayhemBest: '메이헴 불꽃',
    mayhemChain: '메이헴 연쇄',
    minutes: (s) => (s < 3600 ? `${Math.max(1, Math.round(s / 60))}분` : `${Math.floor(s / 3600)}시간 ${Math.round((s % 3600) / 60)}분`),
    tours: '투어 정거장',
    perfects: '퍼펙트',
    chestsOpened: '연 상자',
    days: (d) => `${d}일`,
    collectionShare: (o, t) => `컬렉션 · ${Math.floor((o / t) * 100)}%`,
    questsHint: '퀘스트 보상은 한 번씩이고, 자정에 바뀌어요.',
    timingLabel: (n) => `내 타이밍 · 최근 합류 ${n}번`,
    timing: (ms, onBeat) => (ms === null ? '–' : Math.abs(ms) <= onBeat ? '딱 맞음' : ms < 0 ? `${-ms}ms 빠름` : `${ms}ms 늦음`),
  },

  social: {
    section: (i) => ['랭크', '크루', '클럽', '마피아'][i],
    clubClosed: '클럽은 레벨 50에서 열려요: 경매장과, 큰 자산을 위한 게임 펀드.',
    mafiaClosed: '패밀리는 초보에게 낼 시간이 없어요. 신디케이트의 첫 보스(레벨 15)를 잡거나 지나치면 연락이 올 거예요.',
    offline: '크루와 랭크에는 온라인 서비스가 필요한데, 이 사본은 연결돼 있지 않아요.',
    noCrew: '여기서는 크루를 쓸 수 없어요. 랭크와 클럽은 쓸 수 있어요.',
  },

  museum: {
    shelf: (i) => ['보스', '특수', '조건', '실패'][i],
    lockedFailHint: '아직 일어나지 않았어요. 이런 식으로 시프트에서 지면 무엇이 잘못됐는지, 어떻게 피하는지와 함께 여기에 전시돼요.',
    failuresDone: (skin) => `모든 패배 방식을 찾았어요: ${skin} 스킨이 내 것이 됐어요`,
    newFinds: (n) => (n === 1 ? '박물관에 새 전시품 1점' : `박물관에 새 전시품 ${n}점`),
    shelfDoneTitle: '전시 선반 완성',
    shelfDoneLine: (shelf) => `${shelf} · 모두 전시`,
    museumDoneTitle: '박물관 완성',
    museumDoneLine: '모든 전시품이 모였어요',
    notSeen: '아직 보지 못했어요',
    newBadge: 'NEW',
    firstTime: '처음 만남',
    firstAt: (level, rank = 0) => (rank > 0 ? `${S.museum.place(level, rank)}부터` : `레벨 ${level}부터`),
    undiscovered: '미발견',
    lockedHint: (level, rank = 0) =>
      rank > 0 || level > 1
        ? rank > 0
          ? `${S.museum.place(level, rank)}부터 등장해요. 도로에서 만나면 알아야 할 모든 것과 함께 여기에 전시돼요.`
          : `레벨 ${level}부터 등장해요. 도로에서 만나면 알아야 할 모든 것과 함께 여기에 전시돼요.`
        : '시프트를 계속 플레이하세요. 도로에서 만나면 알아야 할 모든 것과 함께 여기에 전시돼요.',
    lockedBossHint: (level, rank = 0) => (rank > 0 ? `신디케이트가 ${S.museum.place(level, rank)}에서 내보내요. 만나면 잡는 방법과 함께 여기에 전시돼요.` : `신디케이트가 레벨 ${level}에서 내보내요. 만나면 잡는 방법과 함께 여기에 전시돼요.`),
    kind: (e) => ({ boss: '신디케이트 보스', special: '특수 차량', weather: '날씨', dark: '어둠', event: '도시 이벤트', road: '도로', fail: '실패' })[e.k],
    met: '만났지만 아직 도주 중',
    onRing: '링 위에',
    signalArrive: (arm, sweep) =>
      arm && sweep
        ? `들어오는 갈래가 ${color(arm)}으로 빛나고, 이어서 ${color(sweep)} 빛이 섬 둘레를 달려요.`
        : arm
          ? `링에 들어서기 전에 들어오는 갈래가 ${color(arm)}으로 빛나요.`
          : `${color(sweep ?? '')} 빛이 섬 둘레를 달려요.`,
    signalPaid: (c) => `성공: ${color(c)} 고리가 섬에서 퍼져 나가요.`,
    signalMissed: (c) => `실패: ${color(c)} 고리가 섬으로 오므라들어요.`,
    signalNote: (n) =>
      n === 'escaped' ? '놓치면 링 전체가 보라색으로 번쩍여요.' : '바로 앞에 합류한 차가 있으면 링 전체가 빨갛게 번쩍이고 콤보가 끊겨요.',
    heist: '빼앗긴 것을 되찾음',
    firstMet: '보스 레벨',
    rematch: '리벤지',
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
          return '2차선';
        case 'fail':
          return FAIL_TEXT[e.kind].name;
      }
    },
  },
});
