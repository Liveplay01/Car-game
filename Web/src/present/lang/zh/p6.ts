import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { Fmt, money, percent, multiplier } from '../../format';
import { MONEY_MARK } from '../../icons';
import { baseConfig } from '../../../core/config';
import { MASTERY_THRESHOLDS, masteryNumeral } from '../../../core/career';

/** 简体中文 第6部分：家族、商店、大屏幕、每日班次、图鉴、精通、天气。 */
export default (S: Strings): Words<Strings> => ({
  mafia: {
    title: '家族',
    speeds: ['慢', '快', '急促'],
    pointer: (speed) => `指针 · ${speed}`,
    takeCash: '拿现金',
    tagline: '他们尊重把自己老大送进监狱的车手。他们借钱给你，也会把一切都收回去。',
    badge: '黑手党',
    don: '教父',
    pitch: '选一笔贷款，坐到桌边，让指针停在绿色区域。越靠近正中间，条件越好。贷款越大，指针越快。',
    rules: (rate, cap, garnish) =>
      `请在信上写的日期之前还清。逾期的话，债务每天增长 ${Math.round(rate * 100)}%(最多 +${Math.round(cap * 100)}%),每个班次报酬的 ${Math.round(garnish * 100)}% 归家族，运钞车、罪犯和首领不再发奖励，赌场关闭，你的名字在榜单上会带黑手党徽章。还清之后，这一切都会消失。每一笔按时还清的贷款，都会让下一笔更划算，绿色区域也更宽。`,
    grade: (g) => ({ perfect: '完美', good: '不错', miss: '失手' })[g],
    gradeText: (g) => ({ perfect: '分毫不差。教父笑了。', good: '一次公平的握手。', miss: '教父耸了耸肩。基本条件依然有效。' })[g],
    set: '入座',
    stop: '停',
    tapToStop: '点按让指针停下',
    setting: '教父在等你…',
    loanLabel: '贷款',
    perDay: (days) => `${days} 天`,
    offer: (interest, days) => `利息 ${Math.round(interest * 100)}% · ${days} 天`,
    zone: (width, clean) => `绿色区域占条的 ${Math.round(width * 100)}%${clean > 0 ? ` · 已按时还清 ${clean} 笔贷款` : ''}`,
    ledger: '账簿',
    lent: '借出',
    owed: '你欠',
    due: '到期',
    late: '已逾期',
    paid: '已还',
    countdown: (ms) => {
      const mins = Math.max(0, Math.floor(ms / 60_000));
      const days = Math.floor(mins / 1440);
      const hours = Math.floor((mins % 1440) / 60);
      if (days > 0) return `还剩 ${days} 天 ${hours} 小时`;
      return hours > 0 ? `还剩 ${hours} 小时 ${mins % 60} 分钟` : `还剩 ${mins} 分钟`;
    },
    lateFor: (ms) => {
      const days = Math.floor(ms / 86_400_000);
      return days > 0 ? `已逾期 ${days} 天` : '刚刚逾期';
    },
    repayShare: (share) => (share >= 1 ? '全额还款' : `还 ${Math.round(share * 100)}%`),
    noMoney: '金钱不够还。',
    waiting: '教父在看着',
    atStake: '如果你逾期',
    inForce: '直到还清才会解除',
    consequences: (garnish) => ['赌场关闭', '没有运钞车、罪犯或首领', `每个班次报酬的 ${Math.round(garnish * 100)}%`, '榜单上带黑手党徽章'],
    overdue: '已逾期',
    overdueText: '家族来收账了。每个班次都先付给他们。',
    paidStamp: '已还清',
    assist: '稳住手',
    assistText: '指针更慢，但谈不成完美交易',
    banned: (date) => `家族不接你的电话。他们会在 ${date} 再和你说话。`,
    nextStep: (interest, nextInterest, zone, nextZone) =>
      `按时还清下一笔贷款：利息 ${Math.round(interest * 100)}% → ${Math.round(nextInterest * 100)}%,绿色区域 ${Math.round(zone * 100)}% → ${Math.round(nextZone * 100)}%`,
    shiftsToClear: (n) => `大约需要 ${n} 个班次的报酬才能还清`,
    onlyOne: '一次只能有一笔贷款。先还清这一笔。',
    letters: '信件',
    letter: (kind, owed, date) =>
      ({
        taken: `合作愉快。${owed},${date} 之前，一天都别晚。别逼我去找你。`,
        half: '你的时间已经过半。家族不会忘记债务，也不会忘记早早还钱的朋友。',
        day: '只剩一天了。做个朋友，在事情变得难看之前把账结清。',
        late: '时间到了。你的名字已经上了名单。现在路上的钱先付给我们，赌场对你关门了。',
        later: '每天，数字都在涨。还钱，我们就还是朋友。',
      })[kind],
    notices: {
      late: '家族在等 · 你的贷款已逾期 · 赌场关闭',
      grace: '家族再宽限你一天 · 你不在时贷款到期了',
      writtenOff: '家族把你勾销了 · 债务没了，但他们的大门 14 天不会为你打开',
    },
    garnished: (cut, cleared) => (cleared ? `家族拿走了 ${money(cut)} · 债务还清，你自由了` : `家族从报酬里拿走了 ${money(cut)}`),
    casinoShut: '家族在等钱的时候，赌场不开门。',
  },

  shop: {
    open: '开启',
    wear: '佩戴',
    takeOff: '取下',
    worn: '已佩戴',
    inTraffic: '出现在车流中',
    vehicleAuto: '没有可佩戴的：这种车辆会自己混进车流。',
    lockedTitle: (kind) => (kind === 'mapSkin' ? '神秘地图' : kind === 'vehicleType' ? '神秘车辆' : '神秘皮肤'),
    source(k) {
      switch (k) {
        case 'standard':
          return '在售 · 或看广告获得';
        case 'premium':
          return '在售 · 或通过高难度精通获得';
        case 'diamond':
          return '在售 · 绝不出普通品质';
        case 'event':
          return '城市事件 · 每日班次';
        case 'criminalHunt':
          return '通过抓获罪犯获得';
      }
    },
    seasonHint: '在你拿到之前，有一半几率包含本赛季的物品。',
    pickItem: '点按一件物品来查看。',
    lockedHint(item) {
      if (item.source.kind === 'streak') return `连续 ${item.source.days} 天玩每日班次。`;
      if (item.source.kind === 'season') return `只在${S.pass.seasonName(item.source.season)}的活动宝箱里。`;
      if (item.source.kind === 'legendary') return item.source.shifts === 1 ? '完成一个传奇班次。' : `完成 ${item.source.shifts} 个传奇班次。`;
      if (item.source.kind === 'prestige') return `达到声望 ★${item.source.rank}。`;
      if (item.source.kind === 'elite') return `达到精英 ${item.source.level}。`;
      if (item.source.kind === 'pass') return `赛季通行证${S.pass.seasonName(item.source.season)}的第 ${item.source.tier} 级。每年都会回来。`;
      if (item.source.kind === 'hall') return '来自已经不能再购买的旧名人堂。';
      if (item.source.kind === 'unlimited') return `在无限模式中放出 ${Fmt.number(item.source.cars)} 辆车。`;
      if (item.source.kind === 'tour') return `巡游“${S.tours.name(item.source.tour as 'halloween' | 'winter')}”的一个站点。每年都会回来。`;
      if (item.source.kind === 'auction') return '只作为拍卖行(社交 → 俱乐部)的拍品出现。每隔几天换一件新拍品。';
      if (item.source.kind === 'failures') return '找齐输掉班次的每一种方式(进度 → 博物馆 → 失败)。只改变外观。';
      if (item.source.kind === 'casino') return `${S.casino.feat(item.source.feat)}:只有赌场会授予(商店 → 赌场)。只改变外观。`;
      if (item.source.kind === 'fund') return '来自城市基金的感谢礼，它已被游戏基金取代。不再发放。';
      if (item.source.kind === 'bugReport')
        return item.source.reports === 1
          ? '在 timing.love 附上你的好友码报告一个问题。只有捉虫猎人能得到它。'
          : `在 timing.love 附上你的好友码报告 ${item.source.reports} 个问题，每天一个。只有捉虫猎人能得到它。`;
      if (item.source.kind === 'find') return `罕见发现：从${S.shop.chest(item.source.chest)}中${S.shop.findOdds(item.source.chance)}。唯一纯靠运气的荣誉。`;
      return '尚未发现：它出自宝箱。';
    },
    tapToClose: '点按关闭',
    tapToBreak: '快速点按！',
    tapOdds: (odds) => `快速点按，砸开宝箱：距上一次点按半秒内的每次点按都算数，全力时的概率是 ${odds}。更慢的点按介于两者之间。`,
    watchAdShort: '看广告',
    adReward: '已看完广告 · 标准宝箱已添加',
    noAdsLeft: '今天的广告宝箱用完了。明天再来。',
    adPlaceholder: '广告',
    adCountdown: (reward, s) => `${{ chest: '你的宝箱', upgrade: '你的免费一步', boost: '你的加成' }[reward]}还有 ${s} 秒`,
    watchAd: (left) => `看广告 · 还剩 ${left} 次`,
    skinsOn: (n, max) => `${max} 款车皮肤中开启 ${n} 款 · 它们会在路上混出现`,
    skinsFull: (max) => `已开启 ${max} 款车皮肤。请先关掉一款。`,
    section: (i) => ['宝箱', '收藏', '赌场'][i],
    earnedHeading: '靠挣得，而非出售',
    newBadge: '新',
    shelf: (i) => ['车', '地图', '挣得', '通行证'][i],
    group: (g, honours = false) => {
      const name = { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说', vehicles: '车辆', seasons: '季节', maps: '地图' }[g];
      return honours && g !== 'vehicles' && g !== 'seasons' && g !== 'maps' ? `车 · ${name}` : name;
    },
    waiting: (n) => `${n} 个待开`,
    buy: (price) => `购买 · ${price}`,
    pity: (n) => `${n} 个宝箱内必出史诗或更好。重复品返还 ${MONEY_MARK}。`,
    pityLegendary: (n) => `${n} 个宝箱内必出一件传说。`,
    buyBundle: (n, price) => `${n} 个 ${price}`,
    legendaryTimes: (n) => `传说几率是标准宝箱的 ${n} 倍。`,
    pitySoon: (n) => `${n} 个后出传说`,
    duplicate: (m) => `重复 · +${money(m)}`,
    ownedHint(item) {
      if (item.kind === 'carSkin') return '给路上的车涂装。最多混搭八款。只改变外观，绝无优势。';
      if (item.id === 'bigScreen') return '把你自己的图片或视频放在环岛背后：上传一张图片，或粘贴 YouTube 视频、图片或视频文件的链接。只改变外观，绝无优势。';
      if (item.kind === 'mapSkin') return '让城市成为你自己的地方。只改变外观，绝无优势。';
      return `偶尔会出现在你的队列里：${S.shop.trait(item.id)}。`;
    },
    chest(k) {
      switch (k) {
        case 'standard':
          return '标准宝箱';
        case 'premium':
          return '高级宝箱';
        case 'diamond':
          return '钻石宝箱';
        case 'event':
          return '活动宝箱';
        case 'criminalHunt':
          return '追捕罪犯宝箱';
      }
    },
    rarity: (r) => ({ common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' })[r],
    trait: (id) =>
      id === 'compact'
        ? '小巧轻便，并入较慢'
        : id === 'van'
          ? '又长又重，并入较快'
          : id === 'classic'
            ? '开起来像辆轿车，长引擎盖和镀铬保险杠'
            : '更短更轻，并入较快',
    findOdds: (chance) => `每次 ${Fmt.number(Math.round(1 / chance))} 分之 1`,
    oneIn: (chance) => `${Fmt.number(Math.round(1 / chance))} 分之 1`,
    findRow: (id) => `${S.shop.item(id)} · 荣誉`,
    found: '已发现',
    findHint: (id) => `${S.shop.item(id)}是唯一纯靠运气的荣誉。在你拿到之前，它会顶替本来会开出的东西。`,
    kind(item) {
      const kind = item.kind === 'carSkin' ? '车皮肤' : item.kind === 'mapSkin' ? '地图皮肤' : `车辆类型 · ${S.shop.trait(item.id)}`;
      return `${kind} · ${S.shop.rarity(item.rarity)}`;
    },
    opened(o) {
      const name = S.shop.item(o.item.id);
      if (o.isDuplicate) return `重复：${name} · +${money(String(o.money))}`;
      return `${S.shop.rarity(o.item.rarity).toUpperCase()} · ${name}`;
    },
  },

  backdrop: {
    choose: '选择图片或视频',
    intro: '把你自己的图片或视频放在环岛背后。大屏幕开启期间，它会在游戏标签页里播放。',
    linkLabel: '链接',
    linkPlaceholder: 'YouTube、图片或视频链接',
    show: '显示',
    or: '或',
    upload: '上传图片',
    uploadSub: '来自你的设备，仅限图片。只保存在这台设备上。',
    pick: '选择',
    now: (what) => ({ youtube: 'YouTube 视频', video: '链接里的视频', image: '链接里的图片', upload: '你自己的图片' })[what],
    nowSub: '现在显示在环岛背后。',
    remove: '移除',
    loading: '正在加载…',
    notALink: '这不是网页链接。请复制完整的地址，以 https:// 开头。',
    cannotLoad: '这个链接没能加载。请使用图片或视频本身的地址(通常以 .jpg、.png 或 .mp4 结尾);有些网站不允许在别处显示它们的图片。',
    notAPicture: '只能上传图片。要用视频，请粘贴 YouTube 链接。',
    unreadable: '无法读取这张图片。请换一张试试。',
    notKept: '太大了，无法保存在这台设备上：关闭游戏前都会显示。',
    note: '链接会直接从它自己的站点(YouTube 或图片所在之处)加载，只加载到这台设备上。我们不会收到任何东西。',
    lost: '大屏幕：你的链接没能加载。城市暂时恢复了。',
  },

  daily: {
    title: '每日班次',
    name: '每日班次',
    ready: '就绪',
    perfectRun: '完美通关',
    welcomeBack: (m) => `欢迎回来 · 你的收费站赚了 +${money(m)}`,
    comebackChest: (chest) => `很高兴你回来 · ${chest}在商店里等你`,
    streakEnded: (days) => `你的 ${days} 天连续记录结束了 · 从今天的每日班次开始新的记录`,
    done: '已完成',
    readyHint: '今天的第一个班次。只有一次机会，所有人相同。',
    doneHint: (streak) => (streak > 1 ? `已完成 · 连续 ${streak} 天 · 明天再来` : '已完成 · 明天再来'),
    splashLine: (e) => `今日城市：${S.cityEvent(e)} · 只有一次机会`,
    streakLine: (streak) => (streak > 0 ? `连续 ${streak} 天 · 继续保持` : '每天都玩，保持连续记录'),
    nextMilestone: (left, prize) => `还有 ${left} 天得到${prize}`,
    rowLine(streak, open, next, freezes = 0, toFreeze = null, tomorrow = null) {
      if (streak <= 0) return open ? S.daily.readyHint : '明天再来 · 每天都玩，保持连续记录';
      const days = `连续 ${streak} 天`;
      const ahead = next && (toFreeze === null || next.left <= toFreeze) ? S.daily.nextMilestone(next.left, S.daily.prize(next.prize)) : toFreeze !== null ? S.daily.freezeLine(toFreeze) : null;
      const parts = [days, freezes > 0 ? S.daily.freezes(freezes) : null, ahead, open ? null : tomorrow ? `明天：${S.cityEvent(tomorrow)}` : '明天再来'];
      return parts.filter((p): p is string => p !== null).join(' · ');
    },
    freezeLine: (days) => `还有 ${days} 天得到连续保护卡`,
    freezes: (n) => `连续保护卡 ×${n}`,
    sheet: {
      title: '每日连续记录',
      body: (bonusDays, bonusPay, heatDays) => [
        '每天都玩每日班次，保持连续记录。漏掉一天就会中断，除非有连续保护卡替你顶上。',
        `连续 ${bonusDays} 天起，只要记录还在，每个生涯班次的报酬多 ${Math.round(bonusPay * 100)}%。`,
        `热度：连续每满 ${heatDays} 天，就开启一级热度：更难的车流，换来更多报酬和精英经验。失去连续记录，热度也会消失。已经获得的热度称号会保留。`,
      ],
      heatOpen: '已开启的热度',
      heatValue: (open, max) => `${open} / ${max}`,
      nextHeat: '距下一级热度',
      allHeat: '全部开启',
    },
    freezeUsed: (n) => `连续记录已保护 · ${n === 1 ? '漏掉的一天' : `漏掉的 ${n} 天`}已被抵消`,
    streakReward: (days, got) => `连续 ${days} 天 · ${got.join(' · ')}`,
    gotItem: (item) => `解锁${S.shop.item(item)}`,
    gotChest: (kind) => `连续奖励${S.shop.chest(kind)}`,
    gotFreeze: '一张连续保护卡',
    gotCard: '一张免费刮刮卡',
    giftIn: (hours) => (hours >= 1 ? `明天有免费宝箱 · ${Math.ceil(hours)} 小时后` : `明天有免费宝箱 · ${Math.max(1, Math.ceil(hours * 60))} 分钟后`),
    perfectRunFirst: (pay) => `完美通关 · 零事故 · 报酬 +${pay}%`,
    streakPill(streak, bonus, endsIn, freezes = 0) {
      if (streak <= 0) return S.daily.streakLine(0);
      const days = `连续 ${streak} 天`;
      if (endsIn !== null) return `${days} · ${endsIn < 1 ? '不到 1 小时' : `${Math.floor(endsIn)} 小时后`}结束`;
      const freeze = freezes > 0 ? ` · ${S.daily.freezes(freezes)}` : '';
      return bonus !== null ? `${days} · 报酬 +${Math.round(bonus * 100)}%${freeze || '(每个班次)'}` : `${days}${freeze || ' · 继续保持'}`;
    },
    challenge(c) {
      switch (c) {
        case 'perfectInputs':
          return '一个班次内 3 次完美时机';
        case 'tightFits':
          return '一个班次内 3 次险过';
        case 'twoTakedowns':
          return '一个班次内抓获 2 名罪犯';
        case 'twoTransporters':
          return '一个班次内送达 2 辆运钞车';
        case 'longChain':
          return '一条 8 的完美连锁';
        case 'bigCombo':
          return '一次 15 连击';
        case 'perfectRun':
          return '一次完美通关：不能撞车';
        case 'oneTakedown':
          return '抓获一名罪犯';
        case 'cleanMerges':
          return '一个班次内 8 次干净并入';
        case 'sixTightFits':
          return '一个班次内 6 次险过';
        case 'fivePerfects':
          return '一个班次内 5 次完美时机';
        case 'chainFive':
          return '一条 5 的完美连锁';
        case 'hugeCombo':
          return '一次 25 连击';
        case 'twoNearMisses':
          return '一个班次内 2 次擦肩而过';
      }
    },
    challengeDone: (c, reward) => `任务 · ${S.daily.challenge(c)} · +${money(reward)}`,
  },

  albums: {
    name: (a) => ({ maps: '地图', commons: '普通', rares: '稀有', epics: '史诗', legends: '传说', seasons: '季节', loyalty: '忠诚', honours: '荣誉', pass: '赛季通行证', tours: '巡游' })[a],
    complete: (a, reward) => `图鉴集齐 · ${S.albums.name(a)} · +${money(reward)} · 新边框`,
    progress: (entries) => '图鉴 · ' + entries.map((e) => `${S.albums.name(e.album)} ${e.owned}/${e.total}`).join(' · '),
  },

  race: {
    newBest: '新的最佳用时',
  },

  feats: {
    goal(g) {
      switch (g.k) {
        case 'prestige':
          return `达到声望 ★${g.rank}`;
        case 'elite':
          return `达到精英 ${g.level}`;
        case 'legendary':
          return `完成 ${g.shifts} 个传奇班次`;
      }
    },
    done: '已完成',
    withTitle: (title) => `+ 称号“${title}”`,
    eyebrow: '壮举',
    body: '游戏里最难的壮举之一。宝箱、赌场和金钱都给不了你这个，只有道路可以。',
    rowGoal: '目标',
    rowNow: '你',
    rowTitle: '称号',
    reward: '奖励',
    earned: '已获得 · 在你的收藏里',
  },

  mastery: {
    detail(goal, tier) {
      const t = MASTERY_THRESHOLDS[goal];
      if (tier >= t.length) return '所有级别已达成';
      const n = t[tier];
      switch (goal) {
        case 'perfectTiming':
          return `${n} 次完美时机`;
        case 'tightSpots':
          return `${n} 次险过`;
        case 'closeCalls':
          return `${n} 次擦肩而过`;
        case 'longChain':
          return `一条 ${n} 的完美连锁`;
        case 'crimeFighter':
          return `抓获 ${n} 名罪犯`;
        case 'secureRoute':
          return `送达 ${n} 辆运钞车`;
        case 'comboMaster':
          return `一次 ${n} 连击`;
        case 'veteran':
          return `完成 ${n} 个班次`;
        case 'lifesaver':
          return `让 ${n} 辆应急车辆通过`;
        case 'closeShaves':
          return `险些擦到摩托车通过 ${n} 次`;
      }
    },
    name: (g) =>
      ({
        perfectTiming: '完美时机',
        tightSpots: '狭窄之处',
        closeCalls: '擦肩而过',
        longChain: '长连锁',
        crimeFighter: '打击犯罪',
        secureRoute: '安全路线',
        comboMaster: '连击大师',
        veteran: '老手',
        lifesaver: '救命恩人',
        closeShaves: '险险掠过',
      })[g],
    toast(done) {
      const names = done.map((c) => `${S.mastery.name(c.goal)} ${masteryNumeral(c.tier)}`);
      return `精通达成 · ${names.join('、')}`;
    },
  },

  night: '夜晚',
  blackout: '停电',
  weather: (w) =>
    ({ clear: '晴', lightRain: '小雨', heavyRain: '大雨', storm: '暴风雨', extreme: '极端天气', fog: '大雾', snow: '雪与冰', hail: '冰雹', sandstorm: '沙尘暴' })[w],
  cityEvent: (e) =>
    ({
      roadworks: '道路施工',
      roadClosure: '封路',
      concert: '演唱会车流',
      vipConvoy: '贵宾车队',
      policeOperation: '警方行动',
      schoolRun: '接送上学',
      marathon: '马拉松',
    })[e],

  upgrades: {
    group: (g) => ['警察', '金钱', '驾驶'][g],
    maxed: '满级',
    pickOne: '点按一个升级，看看它有什么用。',
    everyStepBought: '每一级都买齐了。',
    missing: (m) => `还差 ${m}`,
    name: (u) =>
      ({
        morePatrols: '增派巡逻',
        longerPursuit: '延长追捕',
        quietStreets: '安静街道',
        interceptor: '拦截车',
        dispatchRadio: '调度电台',
        backup: '增援',
        cashRoute: '运钞路线',
        overtime: '加班',
        freight: '货运',
        quickRecovery: '快速恢复',
        doubleRun: '双倍运输',
        insurance: '保险',
        robberyInsurance: '抢劫险',
        shield: '护盾',
        tightFitTip: '险过小费',
        dashcam: '行车记录仪',
        chainSaver: '连锁守护',
        winterTyres: '雪地胎',
        fogLamps: '雾灯',
      })[u],
    explanation: (u) =>
      ({
        morePatrols: '更多警车在你的队列里待命，罪犯出现时就有一辆已经准备好。',
        longerPursuit: '罪犯需要更久才能逃脱，让你有更多时间抓获他们。',
        quietStreets: '有些班次根本不会出现罪犯。',
        interceptor: '紧跟在罪犯后面的警车追得更快。',
        dispatchRadio: '每个班次有 3 次出警，可以把一辆警车送到队列最前面；每升一级多一次，而且每次出警从连击里扣得更少。',
        backup: '你的班次能多承受一次警车撞击。环岛会闪蓝红光，带着小加号；顶栏里每个蓝色加号，就是一次还会被免除的撞击。',
        cashRoute: '运钞车出现得更早，也更频繁。',
        overtime: '每完成一个班次，报酬更高。',
        freight: '路上更多卡车：车流更密，但每个班次的报酬和每笔过路费都更值钱。',
        quickRecovery: '司机加速更有力，撞车后车流更早恢复速度。路上越满，每个班次的报酬略多一点。',
        doubleRun: '有时第一辆运钞车后面紧跟着第二辆。',
        insurance: '替你承担撞车花费的一部分。',
        robberyInsurance: '替你承担罪犯逃脱造成损失的一部分。',
        shield: '你自己的车每个班次可以多撞一次。环岛会闪绿光，带着小加号，连击会断但班次继续；顶栏里每个绿色加号，就是一次还会被免除的撞击。无限模式中无效。',
        tightFitTip: '每次险过，都会立刻以小费形式付给你班次报酬的一部分。无限模式中无效。',
        dashcam: '摄像头看得到你有多险：每次擦肩而过，都会立刻以小费形式付给你班次报酬的一部分。无限模式中无效。',
        chainSaver: '只要你保持流畅，每个班次有一次普通并入不会打断你的连锁。无限模式中无效。',
        winterTyres: '雨、雪和冰雹让路面抓地和刹车损失更少：撞车时滑得更短，车流也刹得更稳。',
        fogLamps: '司机因恶劣天气损失的时间更少，也更早发现危险，而且雾和尘土在屏幕上更淡。',
      })[u],
    total(u, steps, c) {
      const t = steps;
      switch (u) {
        case 'morePatrols':
          return `警车 +${percent(t * c.patrolsPerStep)}`;
        case 'longerPursuit':
          return `追捕 +${t * c.pursuitPerStep} 秒`;
        case 'quietStreets':
          return `罪犯班次减少 ${percent(t * c.quietStreetsPerStep)}`;
        case 'interceptor':
          return `追捕速度 +${percent(t * c.interceptorPerStep)}`;
        case 'dispatchRadio':
          return `出警 +${t * c.dispatchLimitPerStep} 次 · 保留连击 +${percent(t * c.dispatchRadioPerStep)}`;
        case 'backup':
          return `警方撞击 +${steps * c.backupPerStep} 次`;
        case 'cashRoute':
          return `提前 ${+(t * c.cashRoutePerStep).toFixed(1)} 秒`;
        case 'overtime':
          return `报酬 +${percent(t * c.overtimePerStep)}`;
        case 'freight':
          return `卡车 +${percent(t * c.freightPerStep)} · 报酬 +${percent(t * c.freightPayPerStep)}`;
        case 'quickRecovery':
          return `加速 +${percent(t * c.recoveryPerStep)} · 报酬 +${percent(t * c.recoveryPayPerStep)}`;
        case 'doubleRun':
          return `双倍运输 ${percent(t * c.doubleRunPerStep)}`;
        case 'insurance':
        case 'robberyInsurance':
          return t * c.insurancePerStep >= 1 ? '全额承保' : `承保 ${percent(t * c.insurancePerStep)}`;
        case 'shield':
          return t === 1 ? '免除 1 次撞击' : `免除 ${t} 次撞击`;
        case 'tightFitTip':
          return `每次险过得班次报酬的 ${percent(t * c.tightFitTipPerStep)}`;
        case 'dashcam':
          return `每次擦肩而过得班次报酬的 ${percent(t * c.nearMissTipPerStep)}`;
        case 'chainSaver':
          return t === 1 ? '每个班次保住 1 次连锁' : `每个班次保住 ${t} 次连锁`;
        case 'winterTyres':
          return `找回 ${percent(t * c.winterTyresPerStep)} 损失的抓地力`;
        case 'fogLamps':
          return `损失的反应时间减少 ${percent(t * c.fogLampsPerStep)}`;
      }
    },
    stepEffect(u, steps, max, c) {
      const now = S.upgrades.total(u, steps, c);
      if (steps >= max) return `现在 ${now}`;
      return `现在 ${now} · 下一级 ${S.upgrades.total(u, steps + 1, c)}`;
    },
  },

  heat: {
    button: (heat) => `热度 +${Math.round(heat * baseConfig.heatPay * 100)}%`,
    cleared: (heat) => `热度 ${heat} 通过`,
    rule: (level) => `在热度 ${level} 下完成一个班次`,
  },

  mods: {
    label: '下个班次的加成',
    tailwind: (pay) => `顺风 +${Math.round(pay * 100)}%`,
    afterWork: (pay) => `下班后 +${Math.round(pay * 100)}%`,
    streak: (pay) => `连续 +${Math.round(pay * 100)}%`,
    family: (share) => `家族 −${Math.round(share * 100)}%`,
  },

  goals: {
    tierMiss: (m) => `距${S.modes.tier(m.tier)}还差 ${m.short} 辆车`,
    money: (short, upgrade) => `距${S.upgrades.name(upgrade)}还差 ${money(short)}`,
    nearMiss(n) {
      switch (n.k) {
        case 'cars':
          return n.left === 1 ? `距 ${n.level + 1} 级只差 1 辆车` : `距 ${n.level + 1} 级还差 ${n.left} 辆车`;
        case 'best':
          return `距你的纪录还差 ${Fmt.number(n.short)} 分`;
        case 'combo':
          return `距 ×${+n.multiplier.toFixed(2)} 还差 ${n.short} 次并入`;
      }
    },
    dailyWaiting: '每日班次在等你',
    dailyStreakWaiting: (s) => `每日班次在等你 · 连续 ${s} 天`,
    pityWaiting: (n) => (n === 1 ? '再开 1 个宝箱出传说' : `再开 ${n} 个宝箱出传说`),
  },

  photo: {
    button: '照片',
    buttonLabel: '给这个结果拍张照',
    dialog: '你的班次照片',
    share: '分享',
    copy: '复制',
    sendChallenge: '作为挑战发送',
    copyChallenge: '连同链接复制',
    challengeCopied: '图片和链接已复制',
    download: '下载',
    saved: '已保存',
    close: '关闭',
    score: '分数',
    flames: '火焰',
    newBest: '新纪录',
    telemetry: '性能遥测',
    perfectBadge: '全部完美',
    hook: (score) => `你能超过 ${score} 吗？`,
    hookFlames: (flames) => `你能超过 ${flames} 团火焰吗？`,
    combo: (n) => `连击 ×${n}`,
    tightFits: (n) => `${n} 次险过`,
    busted: (n) => `抓获 ${n} 名`,
    wrecks: (n) => `${n} 辆残骸`,
    chain: (n) => `${n} 连锁`,
    city: '城市',
  },

  result: {
    detonated: '轰',
    escaped: '逃脱',
    levelComplete: (l) => `${l} 级通关`,
    newBest: '新纪录',
    points: (n) => `${n} 分`,
    fullCoverage: '全额承保',
    loss: (amount, escaped) => (escaped ? '损失 ' : '撞车费用 ') + '−' + money(amount),
    covered: (amount) => `全额承保 · 保险赔付 ${money(amount)}`,
    nextLevel: (l) => `点按进入 ${l} 级`,
    retryLevel: (l) => `点按重试 ${l} 级`,
    stats(combo, tightFits, busted, transporters, time) {
      return [
        time,
        combo > 1 ? `最高连击 ${Fmt.number(combo)}` : null,
        tightFits > 0 ? `${Fmt.number(tightFits)} 次险过` : null,
        busted > 0 ? `抓获 ${busted} 名` : null,
        transporters > 0 ? `送达 ${transporters} 辆` : null,
      ]
        .filter((x): x is string => x !== null)
        .join(' · ');
    },
  },

  hud: {
    moneyLabel: '金钱',
    toBest: '距纪录',
    newBest: '新纪录',
    rushHour: '高峰期',
    tight: '险过！',
    cutOff: '被截停',
    dispatch: '出警',
    danger: '危险',
    boom: '轰！',
    covered: '已承保',
    combo: (n) => `连击 ${n}`,
    cars: (n) => `${n} 辆车`,
    wanted: (seconds) => `通缉 ${Math.ceil(Math.max(0, seconds))}`,
    rushFactor: (value) => `高峰期 ${multiplier(value)}`,
    critical: (points) => `暴击 ${points}`,
    shave: (points) => `险掠 ${points}`,
    chainHeld: '连锁保住',
    label(t) {
      switch (t) {
        case 'police':
          return '警察';
        case 'pickup':
          return '罪犯';
        case 'transporter':
          return '押运';
        case 'tanker':
          return '燃气';
        case 'military':
          return '炸弹';
        case 'ambulance':
          return '救护车';
        case 'fireTruck':
          return '消防车';
        case 'learner':
          return '新手';
        case 'bus':
          return '公交';
        case 'motorbike':
          return '摩托';
        case 'oversize':
          return '超宽';
        case 'racer':
          return '赛车';
        case 'wedding':
          return '婚礼';
        default:
          return null;
      }
    },
  },

  detail: {
    now: '现在',
    nextStep: '下一级',
    step: (s, max) => `第 ${s} 级，共 ${max} 级`,
    buy: (price) => `购买 · ${price}`,
    build: (price) => `建造 · ${price}`,
    remove: '拆除',
    close: '关闭',
  },

  notice: {
    more: (n) => `+${n} 项 · 见进度`,
    notEnoughMoney: (missing) => `${MONEY_MARK} 不足 · 还差 ${money(missing)}`,
    detourIdle: '已建好，但在这里不起作用：它和你的岔路之间没有出口',
  },
});
