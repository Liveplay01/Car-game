import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { Fmt, money, percent, multiplier } from '../../format';
import { MONEY_MARK } from '../../icons';
import { baseConfig } from '../../../core/config';
import { MASTERY_THRESHOLDS, masteryNumeral } from '../../../core/career';

/** 한국어 파트 6: 마피아, 상점, 빅 스크린, 일일 시프트, 앨범, 마스터리, 날씨. */
export default (S: Strings): Words<Strings> => ({
  mafia: {
    title: '패밀리',
    speeds: ['느림', '빠름', '다급함'],
    pointer: (speed) => `포인터 · ${speed}`,
    takeCash: '현금 받기',
    tagline: '그들은 자기네 보스를 감옥에 보낸 운전자를 존중해요. 빌려주지만, 전부 받아 가요.',
    badge: '마피아',
    don: '돈',
    pitch: '대출을 고르고 테이블에 앉아 초록 구간에서 포인터를 멈추세요. 한가운데에 가까울수록 조건이 좋아져요. 대출이 클수록 포인터는 빨라져요.',
    rules: (rate, cap, garnish) =>
      `편지에 적힌 날까지 갚으세요. 늦으면 빚이 하루 ${Math.round(rate * 100)}%씩 늘어나고(최대 +${Math.round(cap * 100)}%), 매 시프트 보수의 ${Math.round(garnish * 100)}%가 패밀리에게 가고, 수송차, 범죄자, 보스는 보수가 나오지 않고, 카지노는 닫히고, 랭킹의 이름에 마피아 배지가 붙어요. 전부 갚으면 모두 사라져요. 기한 안에 갚은 대출마다 다음 대출이 유리해지고 초록 구간이 넓어져요.`,
    grade: (g) => ({ perfect: '퍼펙트', good: '굿', miss: '실패' })[g],
    gradeText: (g) => ({ perfect: '딱 맞았어. 돈이 미소 짓는다.', good: '괜찮은 악수야.', miss: '돈이 어깨를 으쓱한다. 기본 제안은 그대로야.' })[g],
    set: '자리에 앉기',
    stop: '멈춰',
    tapToStop: '탭해서 포인터를 멈추세요',
    setting: '돈이 기다리고 있어요…',
    loanLabel: '대출',
    perDay: (days) => `${days}일`,
    offer: (interest, days) => `이자 ${Math.round(interest * 100)}% · ${days}일`,
    zone: (width, clean) => `초록 구간은 바의 ${Math.round(width * 100)}%${clean > 0 ? ` · 기한 안에 갚은 대출 ${clean}번` : ''}`,
    ledger: '장부',
    lent: '빌린 금액',
    owed: '갚을 금액',
    due: '기한',
    late: '기한 초과',
    paid: '지금까지 갚은 금액',
    countdown: (ms) => {
      const mins = Math.max(0, Math.floor(ms / 60_000));
      const days = Math.floor(mins / 1440);
      const hours = Math.floor((mins % 1440) / 60);
      if (days > 0) return `${days}일 ${hours}시간 남음`;
      return hours > 0 ? `${hours}시간 ${mins % 60}분 남음` : `${mins}분 남음`;
    },
    lateFor: (ms) => {
      const days = Math.floor(ms / 86_400_000);
      return days > 0 ? `${days}일 연체` : '방금 기한이 지났어요';
    },
    repayShare: (share) => (share >= 1 ? '전부 갚기' : `${Math.round(share * 100)}% 갚기`),
    noMoney: '갚을 돈이 부족해요.',
    waiting: '돈이 지켜보고 있어요',
    atStake: '늦으면',
    inForce: '갚을 때까지 유지돼요',
    consequences: (garnish) => ['카지노 폐쇄', '수송차, 범죄자, 보스 없음', `매 시프트 보수의 ${Math.round(garnish * 100)}%`, '랭킹에 마피아 배지'],
    overdue: '연체',
    overdueText: '패밀리가 추심해요. 모든 시프트가 그들에게 먼저 지급돼요.',
    paidStamp: '상환 완료',
    assist: '안정된 손',
    assistText: '포인터가 느려지지만 퍼펙트 거래는 안 돼요',
    banned: (date) => `패밀리가 내 전화를 받지 않아요. ${date}에 다시 이야기해 줄 거예요.`,
    nextStep: (interest, nextInterest, zone, nextZone) =>
      `다음 대출을 기한 안에 갚으세요: 이자 ${Math.round(interest * 100)}% → ${Math.round(nextInterest * 100)}%, 초록 구간 ${Math.round(zone * 100)}% → ${Math.round(nextZone * 100)}%`,
    shiftsToClear: (n) => `다 갚으려면 약 ${n}시프트 분량의 보수가 필요해요`,
    onlyOne: '대출은 한 번에 하나만. 먼저 이것부터 갚으세요.',
    letters: '편지',
    letter: (kind, owed, date) =>
      ({
        taken: `즐거웠어. ${owed}을(를) ${date}까지, 하루도 늦지 마. 찾아가게 만들지 마.`,
        half: '기한의 절반이 지났어. 패밀리는 빚을 잊지 않아. 일찍 갚은 친구도 잊지 않고.',
        day: '하루 남았어. 친구답게, 일이 커지기 전에 정리해 줘.',
        late: '시간이 다 됐어. 네 이름이 명단에 올랐어. 이제 도로는 우리에게 먼저 내고, 카지노는 너에게 닫혔어.',
        later: '날마다 숫자가 늘어나. 갚으면 다시 친구야.',
      })[kind],
    notices: {
      late: '패밀리가 기다려요 · 대출이 연체됐어요 · 카지노 폐쇄',
      grace: '패밀리가 하루 더 기다려 줘요 · 자리를 비운 사이에 기한이 됐어요',
      writtenOff: '패밀리가 나를 포기했어요 · 빚은 사라졌지만 14일간 문이 닫혀요',
    },
    garnished: (cut, cleared) => (cleared ? `패밀리가 ${money(cut)} 가져갔어요 · 상환 완료, 자유예요` : `패밀리가 보수에서 ${money(cut)} 가져갔어요`),
    casinoShut: '패밀리가 돈을 기다리는 동안 카지노는 닫혀 있어요.',
  },

  shop: {
    open: '열기',
    wear: '착용',
    takeOff: '해제',
    worn: '착용 중',
    inTraffic: '교통에 등장',
    vehicleAuto: '착용할 것이 없어요: 이 차량은 알아서 교통에 섞여 나와요.',
    lockedTitle: (kind) => (kind === 'mapSkin' ? '수수께끼의 맵' : kind === 'vehicleType' ? '수수께끼의 차량' : '수수께끼의 스킨'),
    source(k) {
      switch (k) {
        case 'standard':
          return '판매 중 · 또는 광고 보기';
        case 'premium':
          return '판매 중 · 또는 어려운 마스터리로';
        case 'diamond':
          return '판매 중 · 커먼은 나오지 않아요';
        case 'event':
          return '도시 이벤트 · 일일 시프트';
        case 'criminalHunt':
          return '범죄자를 체포해서 획득';
      }
    },
    seasonHint: '얻을 때까지 절반의 확률로 이번 시즌 아이템이 들어 있어요.',
    pickItem: '아이템을 탭해서 살펴보세요.',
    lockedHint(item) {
      if (item.source.kind === 'streak') return `일일 시프트를 ${item.source.days}일 연속으로 플레이하세요.`;
      if (item.source.kind === 'season') return `${S.pass.seasonName(item.source.season)} 이벤트 상자에서만.`;
      if (item.source.kind === 'legendary') return item.source.shifts === 1 ? '레전더리 시프트를 한 번 클리어하세요.' : `레전더리 시프트를 ${item.source.shifts}번 클리어하세요.`;
      if (item.source.kind === 'prestige') return `프레스티지 ★${item.source.rank}에 도달하세요.`;
      if (item.source.kind === 'elite') return `엘리트 ${item.source.level}에 도달하세요.`;
      if (item.source.kind === 'pass') return `시즌 패스 ${S.pass.seasonName(item.source.season)}의 ${item.source.tier}단계. 해마다 돌아와요.`;
      if (item.source.kind === 'hall') return '이제 살 수 없는 예전 명예의 전당에 있었어요.';
      if (item.source.kind === 'unlimited') return `언리미티드에서 차 ${Fmt.number(item.source.cars)}대를 보내세요.`;
      if (item.source.kind === 'tour') return `투어 “${S.tours.name(item.source.tour as 'halloween' | 'winter')}”의 정거장 하나. 해마다 돌아와요.`;
      if (item.source.kind === 'auction') return '경매장(소셜 → 클럽)의 로트로만. 며칠마다 새 로트가 나와요.';
      if (item.source.kind === 'failures') return '시프트에서 지는 모든 방식을 찾으세요(진행 → 박물관 → 실패). 겉모습만.';
      if (item.source.kind === 'casino') return `${S.casino.feat(item.source.feat)}: 카지노만 줘요(상점 → 카지노). 겉모습만.`;
      if (item.source.kind === 'fund') return '게임 펀드가 대신하게 된 시티 펀드의 감사 선물이에요. 더는 지급되지 않아요.';
      if (item.source.kind === 'bugReport')
        return item.source.reports === 1
          ? 'timing.love에서 친구 코드와 함께 버그를 신고하세요. 버그 헌터만 받아요.'
          : `timing.love에서 친구 코드와 함께 버그를 ${item.source.reports}번 신고하세요(하루 한 번). 버그 헌터만 받아요.`;
      if (item.source.kind === 'find') return `드문 발견: ${S.shop.chest(item.source.chest)}에서 ${S.shop.findOdds(item.source.chance)}. 운으로만 얻는 유일한 영예예요.`;
      return '아직 발견되지 않았어요: 상자에서 나와요.';
    },
    tapToClose: '탭해서 닫기',
    tapToBreak: '빠르게 탭!',
    tapOdds: (odds) => `빠르게 탭해서 상자를 깨세요. 직전 탭에서 0.5초 안의 탭이 모두 인정되고, 전력일 때의 확률은 ${odds}예요. 더 느린 탭은 그 중간이에요.`,
    watchAdShort: '광고 보기',
    adReward: '광고 시청 · 스탠더드 상자 추가',
    noAdsLeft: '오늘의 광고 상자는 끝났어요. 내일 다시.',
    adPlaceholder: '광고',
    adCountdown: (reward, s) => `${{ chest: '내 상자', upgrade: '무료 1단계', boost: '내 부스트' }[reward]}까지 ${s}초`,
    watchAd: (left) => `광고 보기 · ${left}번 남음`,
    skinsOn: (n, max) => `차 스킨 ${max}개 중 ${n}개 켜짐 · 도로에서 섞여 나와요`,
    skinsFull: (max) => `차 스킨 ${max}개가 켜져 있어요. 먼저 하나를 끄세요.`,
    section: (i) => ['상자', '컬렉션', '카지노'][i],
    earnedHeading: '파는 것이 아니라 얻는 것',
    newBadge: 'NEW',
    shelf: (i) => ['차', '맵', '획득', '패스'][i],
    group: (g, honours = false) => {
      const name = { common: '커먼', rare: '레어', epic: '에픽', legendary: '레전더리', vehicles: '차량', seasons: '계절', maps: '맵' }[g];
      return honours && g !== 'vehicles' && g !== 'seasons' && g !== 'maps' ? `차 · ${name}` : name;
    },
    waiting: (n) => `${n}개 대기 중`,
    buy: (price) => `구매 · ${price}`,
    pity: (n) => `상자 ${n}개 안에 에픽 이상. 중복은 ${MONEY_MARK}로 지급돼요.`,
    pityLegendary: (n) => `상자 ${n}개 안에 레전더리 하나.`,
    buyBundle: (n, price) => `${n}개에 ${price}`,
    legendaryTimes: (n) => `스탠더드 상자의 ${n}배 레전더리 확률.`,
    pitySoon: (n) => `레전더리까지 ${n}`,
    duplicate: (m) => `중복 · +${money(m)}`,
    ownedHint(item) {
      if (item.kind === 'carSkin') return '도로 위의 차를 칠해 줘요. 최대 여덟 개까지 섞을 수 있어요. 겉모습만 바뀌고, 유리해지지는 않아요.';
      if (item.id === 'bigScreen') return '로터리 뒤에 내 이미지나 영상을 깔아요. 이미지를 올리거나 YouTube 영상, 이미지, 영상 파일 링크를 붙여 넣으세요. 겉모습만 바뀌고, 유리해지지는 않아요.';
      if (item.kind === 'mapSkin') return '도시를 나만의 장소로 만들어요. 겉모습만 바뀌고, 유리해지지는 않아요.';
      return `가끔 대기열에 나타나요: ${S.shop.trait(item.id)}.`;
    },
    chest(k) {
      switch (k) {
        case 'standard':
          return '스탠더드 상자';
        case 'premium':
          return '프리미엄 상자';
        case 'diamond':
          return '다이아몬드 상자';
        case 'event':
          return '이벤트 상자';
        case 'criminalHunt':
          return '범죄자 사냥 상자';
      }
    },
    rarity: (r) => ({ common: '커먼', rare: '레어', epic: '에픽', legendary: '레전더리' })[r],
    trait: (id) =>
      id === 'compact'
        ? '작고 가볍고, 합류가 느려요'
        : id === 'van'
          ? '길고 무겁고, 합류가 빨라요'
          : id === 'classic'
            ? '자동차처럼 달려요, 긴 보닛과 크롬 범퍼'
            : '더 짧고 가볍고, 합류가 빨라요',
    findOdds: (chance) => `한 번에 ${Fmt.number(Math.round(1 / chance))}분의 1`,
    oneIn: (chance) => `${Fmt.number(Math.round(1 / chance))}분의 1`,
    findRow: (id) => `${S.shop.item(id)} · 영예`,
    found: '발견함',
    findHint: (id) => `${S.shop.item(id)}은(는) 운으로만 얻는 유일한 영예예요. 얻을 때까지는 원래 나왔을 것을 대신해서 나와요.`,
    kind(item) {
      const kind = item.kind === 'carSkin' ? '차 스킨' : item.kind === 'mapSkin' ? '맵 스킨' : `차량 종류 · ${S.shop.trait(item.id)}`;
      return `${kind} · ${S.shop.rarity(item.rarity)}`;
    },
    opened(o) {
      const name = S.shop.item(o.item.id);
      if (o.isDuplicate) return `중복: ${name} · +${money(String(o.money))}`;
      return `${S.shop.rarity(o.item.rarity).toUpperCase()} · ${name}`;
    },
  },

  backdrop: {
    choose: '이미지나 영상 고르기',
    intro: '내 이미지나 영상을 로터리 뒤에 깔아요. 빅 스크린이 켜져 있는 동안 게임 탭에서 재생돼요.',
    linkLabel: '링크',
    linkPlaceholder: 'YouTube, 이미지, 영상 링크',
    show: '보기',
    or: '또는',
    upload: '이미지 올리기',
    uploadSub: '내 기기에서, 이미지만. 이 기기에만 보관돼요.',
    pick: '고르기',
    now: (what) => ({ youtube: 'YouTube 영상', video: '링크의 영상', image: '링크의 이미지', upload: '내 이미지' })[what],
    nowSub: '지금 로터리 뒤에 표시 중.',
    remove: '삭제',
    loading: '불러오는 중…',
    notALink: '웹 링크가 아니에요. https://로 시작하는 주소 전체를 복사하세요.',
    cannotLoad: '이 링크를 불러오지 못했어요. 이미지나 영상 자체의 주소(보통 .jpg, .png, .mp4로 끝나요)를 쓰세요. 일부 사이트는 다른 곳에서 이미지를 보여 주지 못하게 해요.',
    notAPicture: '이미지만 올릴 수 있어요. 영상은 YouTube 링크를 붙여 넣으세요.',
    unreadable: '이 이미지를 읽을 수 없었어요. 다른 것을 시도해 보세요.',
    notKept: '너무 커서 이 기기에 보관할 수 없어요: 게임을 닫을 때까지 표시돼요.',
    note: '링크는 그 사이트(YouTube나 이미지가 있는 곳)에서 이 기기로만 곧바로 불러와요. 우리에게는 아무것도 전송되지 않아요.',
    lost: '빅 스크린: 링크를 불러오지 못했어요. 도시가 일단 되돌아왔어요.',
  },

  daily: {
    title: '일일 시프트',
    name: '일일 시프트',
    ready: '준비됨',
    perfectRun: '퍼펙트 런',
    welcomeBack: (m) => `돌아오신 걸 환영해요 · 요금소가 +${money(m)} 벌었어요`,
    comebackChest: (chest) => `다시 와 줘서 반가워요 · ${chest}이(가) 상점에서 기다려요`,
    streakEnded: (days) => `${days}일 연속 기록이 끝났어요 · 오늘의 일일 시프트부터 새로 시작해요`,
    done: '완료',
    readyHint: '오늘의 첫 시프트. 기회는 한 번, 모두에게 같은 시프트예요.',
    doneHint: (streak) => (streak > 1 ? `완료 · ${streak}일 연속 · 내일 또 만나요` : '완료 · 내일 또 만나요'),
    splashLine: (e) => `오늘의 도시: ${S.cityEvent(e)} · 기회는 한 번`,
    streakLine: (streak) => (streak > 0 ? `${streak}일 연속 · 계속 가요` : '매일 플레이해서 연속 기록을 이어 가요'),
    nextMilestone: (left, prize) => `${prize}까지 ${left}일`,
    rowLine(streak, open, next, freezes = 0, toFreeze = null, tomorrow = null) {
      if (streak <= 0) return open ? S.daily.readyHint : '내일 또 만나요 · 매일 플레이해서 연속 기록을 이어 가요';
      const days = `${streak}일 연속`;
      const ahead = next && (toFreeze === null || next.left <= toFreeze) ? S.daily.nextMilestone(next.left, S.daily.prize(next.prize)) : toFreeze !== null ? S.daily.freezeLine(toFreeze) : null;
      const parts = [days, freezes > 0 ? S.daily.freezes(freezes) : null, ahead, open ? null : tomorrow ? `내일: ${S.cityEvent(tomorrow)}` : '내일 또 만나요'];
      return parts.filter((p): p is string => p !== null).join(' · ');
    },
    freezeLine: (days) => `스트릭 프리즈까지 ${days}일`,
    freezes: (n) => `스트릭 프리즈 ×${n}`,
    sheet: {
      title: '일일 연속 기록',
      body: (bonusDays, bonusPay, heatDays) => [
        '매일 일일 시프트를 플레이해서 연속 기록을 이어 가세요. 하루를 놓치면 끊겨요. 스트릭 프리즈가 있으면 그날을 덮어 줘요.',
        `${bonusDays}일부터는 연속 기록이 이어지는 동안 커리어 시프트마다 보수가 +${Math.round(bonusPay * 100)}% 늘어요.`,
        `히트: 연속 ${heatDays}일마다 히트 단계가 하나씩 열려요. 더 거센 교통과 맞바꿔 보수와 엘리트 XP가 늘어요. 연속 기록을 잃으면 히트도 사라져요. 얻은 히트 칭호는 남아요.`,
      ],
      heatOpen: '열린 히트',
      heatValue: (open, max) => `${max}단계 중 ${open}`,
      nextHeat: '다음 히트까지',
      allHeat: '모두 열림',
    },
    freezeUsed: (n) => `연속 기록 보호 · 놓친 ${n === 1 ? '하루가' : `${n}일이`} 덮였어요`,
    streakReward: (days, got) => `${days}일 연속 · ${got.join(' · ')}`,
    gotItem: (item) => `${S.shop.item(item)} 해금`,
    gotChest: (kind) => `연속 기록 보상 ${S.shop.chest(kind)}`,
    gotFreeze: '스트릭 프리즈 하나',
    gotCard: '무료 스크래치 카드 한 장',
    giftIn: (hours) => (hours >= 1 ? `내일은 무료 상자 · ${Math.ceil(hours)}시간 뒤` : `내일은 무료 상자 · ${Math.max(1, Math.ceil(hours * 60))}분 뒤`),
    perfectRunFirst: (pay) => `퍼펙트 런 · 충돌 없음 · 보수 +${pay}%`,
    streakPill(streak, bonus, endsIn, freezes = 0) {
      if (streak <= 0) return S.daily.streakLine(0);
      const days = `${streak}일 연속`;
      if (endsIn !== null) return `${days} · ${endsIn < 1 ? '1시간 안에' : `${Math.floor(endsIn)}시간 뒤`} 종료`;
      const freeze = freezes > 0 ? ` · ${S.daily.freezes(freezes)}` : '';
      return bonus !== null ? `${days} · 보수 +${Math.round(bonus * 100)}%${freeze || ' (모든 시프트)'}` : `${days}${freeze || ' · 계속 가요'}`;
    },
    challenge(c) {
      switch (c) {
        case 'perfectInputs':
          return '한 시프트에 퍼펙트 3번';
        case 'tightFits':
          return '한 시프트에 아슬아슬 3번';
        case 'twoTakedowns':
          return '한 시프트에 범인 2명 체포';
        case 'twoTransporters':
          return '한 시프트에 수송차 2대 전달';
        case 'longChain':
          return '퍼펙트 연쇄 8';
        case 'bigCombo':
          return '콤보 15';
        case 'perfectRun':
          return '퍼펙트 런: 충돌 없음';
        case 'oneTakedown':
          return '범죄자 한 명 체포';
        case 'cleanMerges':
          return '한 시프트에 깔끔한 합류 8번';
        case 'sixTightFits':
          return '한 시프트에 아슬아슬 6번';
        case 'fivePerfects':
          return '한 시프트에 퍼펙트 5번';
        case 'chainFive':
          return '퍼펙트 연쇄 5';
        case 'hugeCombo':
          return '콤보 25';
        case 'twoNearMisses':
          return '한 시프트에 니어 미스 2번';
      }
    },
    challengeDone: (c, reward) => `퀘스트 · ${S.daily.challenge(c)} · +${money(reward)}`,
  },

  albums: {
    name: (a) => ({ maps: '맵', commons: '커먼', rares: '레어', epics: '에픽', legends: '레전드', seasons: '계절', loyalty: '충성', honours: '영예', pass: '시즌 패스', tours: '투어' })[a],
    complete: (a, reward) => `앨범 완성 · ${S.albums.name(a)} · +${money(reward)} · 새 프레임`,
    progress: (entries) => '앨범 · ' + entries.map((e) => `${S.albums.name(e.album)} ${e.owned}/${e.total}`).join(' · '),
  },

  race: {
    newBest: '새 최고 기록',
  },

  feats: {
    goal(g) {
      switch (g.k) {
        case 'prestige':
          return `프레스티지 ★${g.rank} 도달`;
        case 'elite':
          return `엘리트 ${g.level} 도달`;
        case 'legendary':
          return `레전더리 시프트 ${g.shifts}번 클리어`;
      }
    },
    done: '완료',
    withTitle: (title) => `+ 칭호 “${title}”`,
    eyebrow: '위업',
    body: '게임에서 가장 어려운 업적 중 하나예요. 상자도, 카지노도, 돈도 이걸 줄 수 없어요. 오직 도로만 줄 수 있어요.',
    rowGoal: '목표',
    rowNow: '나',
    rowTitle: '칭호',
    reward: '보상',
    earned: '획득 · 내 컬렉션에 있어요',
  },

  mastery: {
    detail(goal, tier) {
      const t = MASTERY_THRESHOLDS[goal];
      if (tier >= t.length) return '모든 단계 달성';
      const n = t[tier];
      switch (goal) {
        case 'perfectTiming':
          return `퍼펙트 ${n}번`;
        case 'tightSpots':
          return `아슬아슬 ${n}번`;
        case 'closeCalls':
          return `니어 미스 ${n}번`;
        case 'longChain':
          return `퍼펙트 연쇄 ${n}`;
        case 'crimeFighter':
          return `범인 ${n}명 체포`;
        case 'secureRoute':
          return `수송차 ${n}대 전달`;
        case 'comboMaster':
          return `콤보 ${n}`;
        case 'veteran':
          return `시프트 ${n}번 완료`;
        case 'lifesaver':
          return `긴급 차량 ${n}대 통과시키기`;
        case 'closeShaves':
          return `오토바이 바로 옆을 ${n}번 통과`;
      }
    },
    name: (g) =>
      ({
        perfectTiming: '퍼펙트 타이밍',
        tightSpots: '좁은 틈',
        closeCalls: '아슬아슬한 순간',
        longChain: '긴 연쇄',
        crimeFighter: '범죄 파이터',
        secureRoute: '안전한 경로',
        comboMaster: '콤보 마스터',
        veteran: '베테랑',
        lifesaver: '생명의 은인',
        closeShaves: '스치듯 통과',
      })[g],
    toast(done) {
      const names = done.map((c) => `${S.mastery.name(c.goal)} ${masteryNumeral(c.tier)}`);
      return `마스터리 달성 · ${names.join(', ')}`;
    },
  },

  night: '밤',
  blackout: '블랙아웃',
  weather: (w) =>
    ({ clear: '맑음', lightRain: '가벼운 비', heavyRain: '폭우', storm: '폭풍', extreme: '극한 날씨', fog: '안개', snow: '눈과 얼음', hail: '우박', sandstorm: '모래 폭풍' })[w],
  cityEvent: (e) =>
    ({
      roadworks: '도로 공사',
      roadClosure: '도로 폐쇄',
      concert: '콘서트 교통',
      vipConvoy: 'VIP 호송',
      policeOperation: '경찰 작전',
      schoolRun: '등하교 시간',
      marathon: '마라톤',
    })[e],

  upgrades: {
    group: (g) => ['경찰', '돈', '주행'][g],
    maxed: '최대',
    pickOne: '업그레이드를 탭해서 효과를 확인하세요.',
    everyStepBought: '모든 단계를 구매했어요.',
    missing: (m) => `${m} 부족`,
    name: (u) =>
      ({
        morePatrols: '순찰 증원',
        longerPursuit: '더 긴 추격',
        quietStreets: '조용한 거리',
        interceptor: '인터셉터',
        dispatchRadio: '출동 무전기',
        backup: '지원 요청',
        cashRoute: '현금 경로',
        overtime: '초과 근무',
        freight: '화물',
        quickRecovery: '빠른 회복',
        doubleRun: '더블 런',
        insurance: '보험',
        robberyInsurance: '강도 보험',
        shield: '방패',
        tightFitTip: '아슬아슬 팁',
        dashcam: '블랙박스',
        chainSaver: '연쇄 지킴이',
        winterTyres: '윈터 타이어',
        fogLamps: '안개등',
      })[u],
    explanation: (u) =>
      ({
        morePatrols: '대기열에서 기다리는 경찰차가 늘어, 범죄자가 나타날 때 한 대가 준비돼 있어요.',
        longerPursuit: '범죄자가 도주하는 데 더 오래 걸려서, 체포할 시간이 늘어요.',
        quietStreets: '범죄자가 전혀 없는 시프트가 생겨요.',
        interceptor: '범죄자 바로 뒤의 경찰차가 더 빨리 따라잡아요.',
        dispatchRadio: '시프트마다 경찰차를 대기열 맨 앞으로 보내는 출동이 3번 가능해요. 단계마다 하나씩 늘고, 출동 한 번이 콤보에서 가져가는 몫이 줄어요.',
        backup: '시프트가 경찰차 충돌을 한 번 더 견뎌요. 링이 파랑과 빨강으로 깜빡이며 작은 플러스가 나오고, 상단 바의 파란 플러스 하나가 면제되는 충돌 한 번이에요.',
        cashRoute: '현금 수송차가 더 일찍, 더 자주 나와요.',
        overtime: '시프트를 마칠 때마다 보수가 늘어요.',
        freight: '도로에 트럭이 늘어요: 교통은 더 빽빽해지지만 시프트 보수와 요금의 가치가 올라가요.',
        quickRecovery: '운전자들이 더 힘차게 가속해서 충돌 뒤 교통이 더 빨리 제 속도를 찾아요. 도로가 붐빌수록 시프트 보수가 조금 늘어요.',
        doubleRun: '첫 현금 수송차 바로 뒤에 두 번째가 따라올 때가 있어요.',
        insurance: '충돌로 드는 비용의 일부를 내 줘요.',
        robberyInsurance: '범죄자를 놓쳤을 때 드는 비용의 일부를 내 줘요.',
        shield: '내 차가 시프트마다 한 번 더 충돌해도 돼요. 링이 초록과 작은 플러스로 깜빡이고, 콤보는 끊기지만 시프트는 계속돼요. 상단 바의 초록 플러스 하나가 면제되는 충돌 한 번이에요. 언리미티드에서는 쓸 수 없어요.',
        tightFitTip: '아슬아슬 한 번마다 시프트 보수의 일부가 바로 팁으로 지급돼요. 언리미티드에서는 쓸 수 없어요.',
        dashcam: '카메라가 내가 얼마나 아슬아슬하게 달리는지 봐요: 니어 미스 한 번마다 시프트 보수의 일부가 바로 팁으로 지급돼요. 언리미티드에서는 쓸 수 없어요.',
        chainSaver: '흐름을 타고 있는 동안, 시프트마다 한 번은 평범한 합류도 연쇄를 끊지 않아요. 언리미티드에서는 쓸 수 없어요.',
        winterTyres: '비, 눈, 우박이 와도 도로의 접지력과 제동력이 덜 떨어져요: 충돌 때 덜 미끄러지고, 교통도 더 잘 멈춰요.',
        fogLamps: '악천후로 운전자가 잃는 시간이 줄고 위험을 더 일찍 알아채요. 안개와 먼지도 화면에서 더 옅어져요.',
      })[u],
    total(u, steps, c) {
      const t = steps;
      switch (u) {
        case 'morePatrols':
          return `경찰차 +${percent(t * c.patrolsPerStep)}`;
        case 'longerPursuit':
          return `추격 +${t * c.pursuitPerStep}초`;
        case 'quietStreets':
          return `범죄자 시프트 ${percent(t * c.quietStreetsPerStep)} 감소`;
        case 'interceptor':
          return `추격 속도 +${percent(t * c.interceptorPerStep)}`;
        case 'dispatchRadio':
          return `출동 +${t * c.dispatchLimitPerStep}번 · 콤보 유지 +${percent(t * c.dispatchRadioPerStep)}`;
        case 'backup':
          return `경찰 충돌 +${steps * c.backupPerStep}번`;
        case 'cashRoute':
          return `${+(t * c.cashRoutePerStep).toFixed(1)}초 일찍`;
        case 'overtime':
          return `보수 +${percent(t * c.overtimePerStep)}`;
        case 'freight':
          return `트럭 +${percent(t * c.freightPerStep)} · 보수 +${percent(t * c.freightPayPerStep)}`;
        case 'quickRecovery':
          return `가속 +${percent(t * c.recoveryPerStep)} · 보수 +${percent(t * c.recoveryPayPerStep)}`;
        case 'doubleRun':
          return `더블 런 ${percent(t * c.doubleRunPerStep)}`;
        case 'insurance':
        case 'robberyInsurance':
          return t * c.insurancePerStep >= 1 ? '전액 보장' : `${percent(t * c.insurancePerStep)} 보장`;
        case 'shield':
          return t === 1 ? '충돌 1번 면제' : `충돌 ${t}번 면제`;
        case 'tightFitTip':
          return `아슬아슬 한 번당 시프트 보수의 ${percent(t * c.tightFitTipPerStep)}`;
        case 'dashcam':
          return `니어 미스 한 번당 시프트 보수의 ${percent(t * c.nearMissTipPerStep)}`;
        case 'chainSaver':
          return t === 1 ? '시프트마다 연쇄 1번 지킴' : `시프트마다 연쇄 ${t}번 지킴`;
        case 'winterTyres':
          return `잃은 접지력의 ${percent(t * c.winterTyresPerStep)} 회복`;
        case 'fogLamps':
          return `잃는 반응 시간 ${percent(t * c.fogLampsPerStep)} 감소`;
      }
    },
    stepEffect(u, steps, max, c) {
      const now = S.upgrades.total(u, steps, c);
      if (steps >= max) return `현재 ${now}`;
      return `현재 ${now} · 다음 단계 ${S.upgrades.total(u, steps + 1, c)}`;
    },
  },

  heat: {
    button: (heat) => `히트 +${Math.round(heat * baseConfig.heatPay * 100)}%`,
    cleared: (heat) => `히트 ${heat} 클리어`,
    rule: (level) => `히트 ${level}에서 시프트 클리어`,
  },

  mods: {
    label: '다음 시프트 보정',
    tailwind: (pay) => `순풍 +${Math.round(pay * 100)}%`,
    afterWork: (pay) => `퇴근 후 +${Math.round(pay * 100)}%`,
    streak: (pay) => `연속 +${Math.round(pay * 100)}%`,
    family: (share) => `패밀리 −${Math.round(share * 100)}%`,
  },

  goals: {
    tierMiss: (m) => `${S.modes.tier(m.tier)}까지 ${m.short}대`,
    money: (short, upgrade) => `${S.upgrades.name(upgrade)}까지 ${money(short)}`,
    nearMiss(n) {
      switch (n.k) {
        case 'cars':
          return n.left === 1 ? `레벨 ${n.level + 1}까지 1대뿐` : `레벨 ${n.level + 1}까지 ${n.left}대`;
        case 'best':
          return `최고 기록까지 ${Fmt.number(n.short)}점`;
        case 'combo':
          return `×${+n.multiplier.toFixed(2)}까지 합류 ${n.short}번`;
      }
    },
    dailyWaiting: '일일 시프트가 기다려요',
    dailyStreakWaiting: (s) => `일일 시프트가 기다려요 · 연속 ${s}`,
    pityWaiting: (n) => (n === 1 ? '레전더리까지 상자 1개' : `레전더리까지 상자 ${n}개`),
  },

  photo: {
    button: '사진',
    buttonLabel: '이 결과의 사진 찍기',
    dialog: '내 시프트 사진',
    share: '공유',
    copy: '복사',
    sendChallenge: '챌린지로 보내기',
    copyChallenge: '링크와 함께 복사',
    challengeCopied: '이미지와 링크를 복사했어요',
    download: '다운로드',
    saved: '저장됨',
    close: '닫기',
    score: '점수',
    flames: '불꽃',
    newBest: '새 최고 기록',
    telemetry: '퍼포먼스 텔레메트리',
    perfectBadge: '전부 퍼펙트',
    hook: (score) => `${score}을(를) 넘을 수 있어?`,
    hookFlames: (flames) => `불꽃 ${flames}개를 넘을 수 있어?`,
    combo: (n) => `콤보 ×${n}`,
    tightFits: (n) => `아슬아슬 ${n}번`,
    busted: (n) => `${n}명 체포`,
    wrecks: (n) => `잔해 ${n}대`,
    chain: (n) => `연쇄 ${n}`,
    city: '도시',
  },

  result: {
    detonated: '쾅',
    escaped: '도주',
    levelComplete: (l) => `레벨 ${l} 클리어`,
    newBest: '새 최고 기록',
    points: (n) => `${n}점`,
    fullCoverage: '전액 보장',
    loss: (amount, escaped) => (escaped ? '손실 ' : '충돌 비용 ') + '−' + money(amount),
    covered: (amount) => `전액 보장 · 보험이 ${money(amount)} 지급`,
    nextLevel: (l) => `탭해서 레벨 ${l}로`,
    retryLevel: (l) => `탭해서 레벨 ${l} 다시 도전`,
    stats(combo, tightFits, busted, transporters, time) {
      return [
        time,
        combo > 1 ? `최고 콤보 ${Fmt.number(combo)}` : null,
        tightFits > 0 ? `아슬아슬 ${Fmt.number(tightFits)}번` : null,
        busted > 0 ? `${busted}명 체포` : null,
        transporters > 0 ? `${transporters}대 전달` : null,
      ]
        .filter((x): x is string => x !== null)
        .join(' · ');
    },
  },

  hud: {
    moneyLabel: '돈',
    scoreLabel: '점수',
    toBest: '기록까지',
    newBest: '신기록',
    rushHour: '러시아워',
    tight: '아슬아슬!',
    cutOff: '끼어들기 당함',
    dispatch: '출동',
    danger: '위험',
    boom: '쾅!',
    covered: '보장',
    combo: (n) => `콤보 ${n}`,
    cars: (n) => `${n}대`,
    wanted: (seconds) => `수배 ${Math.ceil(Math.max(0, seconds))}`,
    rushFactor: (value) => `러시아워 ${multiplier(value)}`,
    critical: (points) => `치명타 ${points}`,
    shave: (points) => `스치듯 ${points}`,
    chainHeld: '연쇄 유지',
    label(t) {
      switch (t) {
        case 'police':
          return '경찰';
        case 'pickup':
          return '범인';
        case 'transporter':
          return '수송 중';
        case 'tanker':
          return '가스';
        case 'military':
          return '폭탄';
        case 'ambulance':
          return '구급차';
        case 'fireTruck':
          return '소방차';
        case 'learner':
          return '초보';
        case 'bus':
          return '버스';
        case 'motorbike':
          return '오토바이';
        case 'oversize':
          return '초대형';
        case 'racer':
          return '레이서';
        case 'wedding':
          return '결혼식';
        default:
          return null;
      }
    },
  },

  detail: {
    now: '현재',
    nextStep: '다음 단계',
    step: (s, max) => `${max}단계 중 ${s}단계`,
    buy: (price) => `구매 · ${price}`,
    build: (price) => `건설 · ${price}`,
    remove: '철거',
    close: '닫기',
  },

  notice: {
    more: (n) => `+${n}개 더 · 진행에서 확인`,
    notEnoughMoney: (price) => `${MONEY_MARK} 부족 · ${money(price)} 필요`,
    detourIdle: '건설했지만 여기서는 아무 일도 하지 않아요: 이 자리와 내 갈래 사이에 출구가 없어요',
  },
});
