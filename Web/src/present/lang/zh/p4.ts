import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { Fmt, money } from '../../format';
import { SPECIAL_TEXT, FAIL_TEXT } from '../../museumText';

const COLORS: Record<string, string> = { purple: '紫色', gold: '金色', blue: '蓝色', red: '红色', teal: '青绿色', orange: '橙色', pink: '粉色', rose: '玫红色' };
const color = (name: string): string => COLORS[name] ?? name;

/** 简体中文 第4部分：成就、简报、通知、标签、进度、社交、博物馆。 */
export default (S: Strings): Words<Strings> => ({
  ach: {
    heading: '成就',
    name: (id) =>
      ({
        scrapyard: '废车场',
        fireworks: '烟花',
        spotless: '一尘不染',
        jackpot: '头奖猎手',
        critical: '暴击',
        wizard: '交通魔法师',
        earner: '大赚家',
        weatherproof: '风雨无阻',
        stormRider: '风暴骑士',
        whiteout: '白茫茫',
        moonlighter: '夜间兼职',
        lightsOut: '熄灯',
        cityLife: '城市生活',
        longHaul: '长途',
        clockwork: '精准如钟',
        onARoll: '势头正旺',
        regular: '常客',
        testDriver: '试车员',
        hunter: '辛迪加猎手',
        roadBuilder: '筑路者',
        foreman: '工头',
        tuner: '改装师',
        chestOpener: '开箱人',
        collector: '收藏家',
        climber: '攀登者',
        elite: '精英车手',
        reborn: '重生',
        heatSeeker: '追热者',
        gambler: '豪赌客',
        tourist: '游客',
      })[id] ?? id,
    goal: (id, n) => {
      const N = Fmt.number(n);
      return (
        {
          scrapyard: `造成 ${N} 辆残骸`,
          fireworks: `引发 ${N} 次爆炸`,
          spotless: `${N} 次完美通关`,
          jackpot: `送达 ${N} 辆头奖运钞车`,
          critical: `打出 ${N} 次暴击并入`,
          wizard: `放出 ${N} 辆车`,
          earner: `在路上赚到 ${N} 金币`,
          weatherproof: `完成 ${N} 个恶劣天气班次`,
          stormRider: `完成 ${N} 个暴风、冰雹或沙尘暴班次`,
          whiteout: `完成 ${N} 个雾天或雪天班次`,
          moonlighter: `完成 ${N} 个夜间班次`,
          lightsOut: `完成 ${N} 个全城停电班次`,
          cityLife: `完成 ${N} 个带城市事件的班次`,
          longHaul: `在无限模式中坚持 ${Fmt.seconds(n)}`,
          clockwork: `完成 ${N} 个每日班次`,
          onARoll: `每日连续 ${N} 天`,
          regular: `通过 ${N} 个每周班次`,
          testDriver: `通过 ${N} 个试炼`,
          hunter: `抓获 ${N} 名不同的辛迪加首领`,
          roadBuilder: `建造 ${N} 条额外的路`,
          foreman: `立起 ${N} 个模块`,
          tuner: `拥有 ${N} 级升级`,
          chestOpener: `开启 ${N} 个宝箱`,
          collector: `收集 ${N} 件物品`,
          climber: `达到 ${N} 级`,
          elite: `达到精英 ${N}`,
          reborn: `声望 ${N} 次`,
          heatSeeker: `在热度 ${N} 下完成一个班次`,
          gambler: `玩 ${N} 局赌场`,
          tourist: `通过 ${N} 个巡游站点`,
        } as Record<string, string>
      )[id] ?? ''
    },
    caption: '成就',
    reached: (id, tier, reward) => ({
      title: S.ach.name(id),
      tier: S.ach.tier(tier),
      reward: `+${money(reward)}`,
      text: `成就 · ${S.ach.name(id)} ${S.ach.tier(tier)} · +${money(reward)}`,
    }),
    many: (n, reward) => ({
      title: `${n} 个成就`,
      tier: '★',
      reward: `+${money(reward)}`,
      text: `${n} 个成就 · +${money(reward)} · 见 进度 → 目标`,
    }),
  },

  brief: {
    caption: (e, again) => `${again ? '回顾' : '新'} · ${S.museum.name(e)}`.toUpperCase(),
  },

  push: {
    streakTitle: (days) => `你的 ${days} 天连续记录`,
    streakBody: '午夜之前玩今天的每日班次，让记录继续下去。',
    giftTitle: '你的免费宝箱准备好了',
    giftBody: '一个标准宝箱在等你。打开游戏来领取。',
    passTitle: (season) => `${S.pass.seasonName(season)}来了`,
    passBody: '新赛季通行证上线了，可以赢得三款新皮肤。',
    row: '通知',
    rowSub: '你的连续记录、免费宝箱、新赛季，或有人在前 20 名超过你。每天最多一条。',
    rowInstall: '请先把游戏添加到主屏幕，再在这里开启。',
    choices: {
      streak: { title: '每日连续记录', sub: '在记录中断前的晚上提醒你一下。' },
      chests: { title: '免费宝箱', sub: '明天的免费宝箱，以及邀请带来的礼物。' },
      pass: { title: '新赛季', sub: '新赛季通行证开始时。' },
      rank: { title: '被超越', sub: '有玩家在前 20 名超过你时。' },
      comeback: { title: '回来看看', sub: '休息几天后的一条提醒。' },
    },
    rowNone: '这里不可用。请在浏览器中打开游戏来开启通知。',
    rowLocal: '已开启。游戏关闭时的提醒需要在线服务，而这个版本没有。',
    confirmTitle: '通知已开启',
    rowBlocked: '此网站已被屏蔽。要开启，请在浏览器设置中允许通知。',
    offerFirstTitle: '明天有免费宝箱',
    offerFirstWhy: '明天的免费宝箱准备好时提醒你，记录中断前再提醒一次。每天最多一条，夜里从不打扰。可随时在设置中关闭。',
    offerTitle: '保住你的连续记录',
    offerWhy: '在记录中断前、免费宝箱准备好时、新赛季开始时提醒你。每天最多一条，夜里从不打扰。可随时在设置中关闭。',
    offerOn: '开启通知',
    offerLater: '以后再说',
    on: '通知已开启。可随时在设置中关闭。',
    failed: '无法开启通知，请稍后再试。',
    denied: '此网站的通知在浏览器设置中被屏蔽了。',
  },

  wayBack: {
    chestTitle: '明天有免费宝箱',
    streakTitle: '明天见',
    chestWhy: '把游戏放到主屏幕：明天的免费宝箱只需点一下，你的进度也更安全。',
    streakWhy: '把游戏放到主屏幕：明天的连续记录只需点一下，你的进度也更安全。',
    install: '安装游戏',
  },

  ready: {
    tapToStart: '点按开始',
    tapForFriends: '点按与朋友一起玩',
  },

  tabs: {
    progress: '进度',
    social: '社交',
    game: '游戏',
    shop: '商店',
    build: '建造',
  },

  progress: {
    section: (i) => ['今日', '目标', '统计'][i],
    allStats: '全部数据',
    statsMore: (n) => `再看 ${n} 项 ›`,
    statsHide: '收起',
    odometer: '总里程',
    odometerLine: '你放进来的每一辆车，从出发到抵达',
    odometerMoon: '已经开到月球了。还在继续。',
    km: '公里',
    quests: '任务',
    trials: '试炼',
    mastery: '精通',
    feats: '壮举',
    trialsLocked: (level) => `${level} 级开放 · 带奖励的特别班次`,
    landmarks: '地标',
    landmarksHint: '著名的环岛，每处一个高难度班次。',
    ascension: '飞升',
    ascensionHint: '每个声望段位一个试炼：游戏里最难的班次。',
    levelTrials: '等级试炼',
    levelTrialsHint: (waiting, shown) =>
      waiting > shown ? `每升一级多一个。还有 ${waiting - shown} 个在等着：通过一个，下一个就会出现。` : '每升一级多一个，从 30 级到 120 级。',
    bosses: '辛迪加首领',
    legendary: '传奇班次',
    weeklies: '每周班次',
    ambulances: '放行的救护车',
    level: '达到的等级',
    bestCombo: '最高连击',
    bestChain: '最长完美连锁',
    streak: '每日连续记录',
    flameTier: (tier) => ['熄火', '怠速', '加速中', '缺火', '加力燃烧', '炼狱'][tier] ?? '',
    streakDay: '天连续',
    streakDays: '天连续',
    streakStart: '玩今天的每日班次，发动引擎',
    streakKeep: '玩今天的每日班次，让火焰继续燃烧',
    streakDone: '今天已完成 · 明天再来',
    streakCard: (n) => (n === 1 ? '第二天送一张免费刮刮卡' : `${n} 天后送一张免费刮刮卡`),
    shiftsPlayed: '玩过的班次',
    shiftsCompleted: '完成的班次',
    takedowns: '抓获的罪犯',
    transporters: '送达的运钞车',
    unlimitedBest: '无限模式最佳',
    unlimitedCars: '无限模式车数',
    unlimitedTier: '无限模式段位',
    mayhemBest: '混乱火焰数',
    mayhemChain: '混乱连锁',
    minutes: (s) => (s < 3600 ? `${Math.max(1, Math.round(s / 60))} 分钟` : `${Math.floor(s / 3600)} 小时 ${Math.round((s % 3600) / 60)} 分钟`),
    tours: '巡游站点',
    perfects: '完美时机',
    chestsOpened: '开启的宝箱',
    days: (d) => `${d} 天`,
    collectionShare: (o, t) => `收藏 · ${Math.floor((o / t) * 100)}%`,
    questsHint: '每个任务的奖励只发一次，午夜刷新。',
    timingLabel: (n) => `你的时机 · 最近 ${n} 次并入`,
    timing: (ms, onBeat) => (ms === null ? '–' : Math.abs(ms) <= onBeat ? '恰到好处' : ms < 0 ? `早了 ${-ms} 毫秒` : `晚了 ${ms} 毫秒`),
  },

  social: {
    section: (i) => ['排行', '车队', '俱乐部', '黑手党'][i],
    clubClosed: '俱乐部 50 级开放：拍卖行，以及为庞大资产准备的游戏基金。',
    mafiaClosed: '家族没空理会新手。击败(或经过)辛迪加的第一个首领(15 级),他们就会联系你。',
    offline: '车队和排行需要在线服务，而这份游戏副本没有连接。',
    noCrew: '这里不能使用车队，但排行和俱乐部可以。',
  },

  museum: {
    shelf: (i) => ['首领', '特种', '环境', '失败'][i],
    lockedFailHint: '还没发生过。如果你以这种方式输掉一个班次，它会连同出了什么问题、怎么避免一起展出在这里。',
    failuresDone: (skin) => `找齐了所有失败的方式：${skin}皮肤归你了`,
    notSeen: '尚未见过',
    newBadge: '新',
    firstTime: '第一次见',
    firstAt: (level, rank = 0) => (rank > 0 ? `${S.museum.place(level, rank)}起` : `${level} 级起`),
    undiscovered: '尚未发现',
    lockedHint: (level, rank = 0) =>
      rank > 0 || level > 1
        ? rank > 0
          ? `${S.museum.place(level, rank)}起出现。在路上遇到它之后，它会连同所有该知道的信息一起展出在这里。`
          : `${level} 级起出现。在路上遇到它之后，它会连同所有该知道的信息一起展出在这里。`
        : '继续玩班次吧。在路上遇到它之后，它会连同所有该知道的信息一起展出在这里。',
    lockedBossHint: (level, rank = 0) => (rank > 0 ? `辛迪加会在${S.museum.place(level, rank)}派出他。遇到之后，他会连同抓获他的办法一起展出在这里。` : `辛迪加会在 ${level} 级派出他。遇到之后，他会连同抓获他的办法一起展出在这里。`),
    kind: (e) => ({ boss: '辛迪加首领', special: '特种车辆', weather: '天气', dark: '黑暗', event: '城市事件', road: '道路', fail: '失败' })[e.k],
    met: '已遇到，仍在逃',
    onRing: '在环岛上',
    signalArrive: (arm, sweep) =>
      arm && sweep
        ? `它来的那条岔路亮起${color(arm)},然后一道${color(sweep)}的光绕着中心岛跑一圈。`
        : arm
          ? `它驶入环岛之前，它来的那条岔路会亮起${color(arm)}。`
          : `一道${color(sweep ?? '')}的光绕着中心岛跑一圈。`,
    signalPaid: (c) => `做对了：一圈${color(c)}的光环从中心岛向外扩散。`,
    signalMissed: (c) => `失误了：一圈${color(c)}的光环向中心岛收拢。`,
    signalNote: (n) =>
      n === 'escaped' ? '它如果逃脱，整个环岛会闪紫光。' : '有车正好并入它的前面，整个环岛会闪红光，并打断你的连击。',
    heist: '追回赃物',
    firstMet: '首领等级',
    rematch: '复仇',
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
          return '双车道';
        case 'fail':
          return FAIL_TEXT[e.kind].name;
      }
    },
  },
});
