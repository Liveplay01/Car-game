import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { Fmt, money } from '../../format';

/** 简体中文 第3部分：称号、赛季通行证、名人堂、模式、赛季规则、巡游。 */
export default (S: Strings): Words<Strings> => ({
  titles: {
    name: (id) =>
      ({
        eliteDriver: '精英车手',
        roadVeteran: '道路老兵',
        ringMaster: '环岛大师',
        ironNerves: '钢铁神经',
        roadRoyalty: '道路贵族',
        livingLegend: '活传奇',
        precisionDriver: '精准车手',
        comboMaster: '连击大师',
        closeCallArtist: '擦肩艺术家',
        syndicateBreaker: '辛迪加终结者',
        nightOwl: '夜猫子',
        stormChaser: '追风暴者',
        legendHunter: '传奇猎人',
        starDriver: '明星车手',
        marathoner: '马拉松选手',
        overdriver: '超速驾驭者',
        endless: '无尽',
        scorcher: '烈焰飞驰',
        inferno: '炼狱',
        meltdown: '熔毁',
        patron: '赞助人',
        benefactor: '恩主',
        philanthropist: '慈善家',
        visionary: '远见者',
        sovereign: '君主',
        timeless: '超越时间',
        apex: '巅峰',
        boundless: '无界',
        crewPodium: '车队领奖台',
        crewChampion: '车队冠军',
        collector: '收藏家',
        completionist: '全成就者',
        ascended: '飞升者',
        eternal: '永恒',
        grandmaster: '宗师',
        centurion: '百夫长',
        immortal: '不朽',
        roadWarden: '道路守卫',
        gridlord: '路网之王',
        ringbearer: '持环者',
        unstoppable: '势不可挡',
        timekeeper: '守时者',
        paragon: '典范',
        mythic: '神话级',
        ringEternal: '永恒之环',
        mastermind: '幕后主脑',
        summit: '登顶',
        syndicateEnd: '辛迪加的终结',
      })[id],
    rule(r) {
      switch (r.k) {
        case 'elite':
          return `达到精英 ${r.level}`;
        case 'mastery':
          return `完成精通“${S.mastery.name(r.goal)}”`;
        case 'bosses':
          return r.all ? '抓获全部八名辛迪加首领' : '抓获前四名辛迪加首领';
        case 'trial':
          return `通过试炼“${S.trials.name(r.id as never)}”`;
        case 'legendary':
          return `完成 ${r.shifts} 个传奇班次`;
        case 'prestige':
          return `达到声望 ★${r.rank}`;
        case 'heat':
          return S.heat.rule(r.level);
        case 'fund':
          return `向游戏基金捐出 ${money(Fmt.number(r.amount))}`;
        case 'item':
          return `在无限模式中解锁${S.shop.item(r.id)}`;
        case 'masteries':
          return '每项精通都达到 V 级';
        case 'crew':
          return r.place === 1 ? '车队在一周联赛中夺得第一名' : '车队在一周联赛中进入前三名';
        case 'collector':
          return '集齐所有仍可获得的外观';
        case 'completionist':
          return '获得所有其他称号';
      }
    },
    earned: (ids) => (ids.length === 1 ? `称号 · ${S.titles.name(ids[0])}` : `${ids.length} 个新称号 · ${ids.map((t) => S.titles.name(t)).join('、')}`),
    none: '无称号',
  },

  pass: {
    title: '赛季通行证',
    seasonName: (s) => ({ winter: '冬季', spring: '春季', summer: '夏季', autumn: '秋季' })[s],
    caption: (s) => `赛季通行证 ${S.pass.seasonName(s)}`,
    tier: (n, total) => `第 ${n} 级，共 ${total} 级`,
    locked: (level) => `${level} 级开放`,
    buyHint: '宝箱、金钱和三款皮肤',
    free: '免费',
    waiting: (n) => `${n} 级正等着通行证`,
    daysLeft: (n) => (n === 1 ? '最后一天' : `还剩 ${n} 天`),
    complete: '道路走完 · 下个赛季见',
    openAtEnd: (n) => `赛季即将结束 · 还有 ${n} 级未领取`,
    reached: (step) =>
      `赛季通行证 · 第 ${step.tier} 级 · ${step.duplicate > 0 ? `再次获得${S.pass.reward(step.reward)} · +${money(Fmt.number(step.duplicate))}` : S.pass.reward(step.reward)}`,
    buy: (price) => `购买 · ${price}`,
    body: (xpPerTier) => [
      `本赛季一条十二级的道路，用游戏币购买。每个班次都会带来经验：完成一个班次得 10,每次完美时机和险过各得 1,首领或传奇班次再加 10。第一级需要 ${xpPerTier} 经验，之后每级略多一些。`,
      '其中三级包含本赛季的皮肤，带有宝箱里没有的效果。四季每年都会回来，皮肤也会跟着回来。',
      '只改变外观，绝不会在路上带来优势。这里不花一分真钱。',
    ],
    freeBody: (xpPerTier) => [
      `本赛季一条十二级的道路。无论有没有通行证，每个班次都会带来经验：完成一个班次得 10,每次完美时机和险过各得 1,首领或传奇班次再加 10。第一级需要 ${xpPerTier} 经验，之后每级略多一些。`,
      '三级对所有人免费。用游戏币买下通行证后，其他各级也会发放奖励，已经达到的立刻到账。',
      '其中三级包含本赛季的皮肤，带有宝箱里没有的效果。四季每年都会回来，皮肤也会跟着回来。只改变外观，绝不会在路上带来优势。',
    ],
    trackHeader: '道路',
  },

  hall: {
    header: '声望纪事',
    plaqueLine: (e, date) => [date, e.elite > 0 ? `精英 ${e.elite}` : null, `${e.bosses} 名首领`, e.legendary > 0 ? `${e.legendary} 次传奇` : null].filter((x) => x).join(' · '),
    empty: '你的第一次声望，会得到第一块铭牌。',
  },

  modes: {
    name: (m) => (m === 'shift' ? '班次' : m === 'unlimited' ? '无限' : m === 'mayhem' ? '混乱' : '多人'),
    line: (m) =>
      m === 'shift'
        ? '通关升级'
        : m === 'unlimited'
          ? '无尽 · 一直开到撞车'
          : m === 'mayhem'
            ? '12 辆车 · 瞄准油罐车'
            : '最多 4 位朋友 · 最后留下的获胜',
    youLabel: '你',
    defaultName: '玩家',
    runOver: '本局结束',
    again: '点按再来一局',
    carsSent: (n) => `${n} 辆车`,
    tryUnlimited: { caption: '游戏模式', text: '左右滑动进入无限模式：没有等级，一直开到撞车' },
    tightFit: { caption: '提示', text: '越近越值钱：紧贴一辆车的后面并入，就是险过，得分翻倍' },
    swipeCaption: '游戏模式',
    swipeHint: '滑动查看更多模式',
    tryUnlimitedKeys: { caption: '游戏模式', text: '按 → 进入无限模式：没有等级，一直开到撞车' },
    swipeHintKeys: '← → 查看更多模式',
    stage: (stage, overtime) =>
      overtime > 0
        ? `加班 ${overtime} · 车更多，速度略快`
        : (['', '燃气罐车混进了车流', '夜幕降临', '风暴正在逼近', '军用卡车上路了'][stage] ?? ''),
    tier: (id) => ({ bronze: '青铜', silver: '白银', gold: '黄金', platinum: '铂金', diamond: '钻石', master: '大师' })[id],
    mark: (cars, reward) =>
      reward.tier ? `${cars} 辆车 · ${S.modes.tier(reward.tier).toUpperCase()}` : reward.skin ? `${cars} 辆车 · ${S.shop.item(reward.skin).toUpperCase()}` : `${cars} 辆车`,
    tierUp: (id) => `新段位 · 无限模式${S.modes.tier(id).toUpperCase()}`,
    tierLine: (id, next) => [id ? S.modes.tier(id) : '–', next ? `再 ${next.cars} 辆车升${S.modes.tier(next.id)}` : null].filter(Boolean).join(' · '),
    milestone: (id) => `无限模式里程碑 · 解锁${S.shop.item(id)}`,
  },

  mayhem: {
    caption: '混乱',
    flames: '火焰',
    cars: '车辆',
    chain: (n) => `连锁 ×${n}`,
    over: '混乱结束',
    again: '点按再来一场混乱',
    summary: (wrecks, chain) => `${wrecks} 辆残骸 · 最大连锁 ×${chain}`,
  },

  seasonRule: {
    name: (s) => ({ winter: '隆冬', spring: '四月阵雨', summer: '夏日风暴', autumn: '雾与黄昏' })[s],
    line: (s) =>
      ({
        winter: '雾和雪来得更勤，夜晚也来得早',
        spring: '雨更多，也更常下',
        summer: '多半晴朗，但天气一变就是风暴',
        autumn: '雾更多，傍晚来得早',
      })[s],
  },

  tours: {
    caption: '巡游',
    name: (id) => ({ halloween: '闹鬼环岛', winter: '冬日彩灯' })[id],
    tagline: (id) =>
      ({
        halloween: '天黑之后的七个站点。三款皮肤，只在这里。',
        winter: '白雪覆盖的七个站点。三款皮肤，只在这里。',
      })[id],
    stop: (n, of) => `站点 ${n}/${of}`,
    stopName: (id) => {
      const m = /^tour\.([a-z]+)\.(\d+)$/.exec(id);
      return m ? `${S.tours.name(m[1] as 'halloween' | 'winter')} · 站点 ${m[2]}` : '';
    },
    left: (n) => (n <= 1 ? '最后一天' : `还剩 ${n} 天`),
    opensIn: (n) => (n === 1 ? '明天' : `${n} 天后`),
    startsIn: (inDays) => `${S.tours.opensIn(inDays)}开始`,
    locked: (level) => `巡游 ${level} 级开放`,
    progress: (done, total) => `${done}/${total} 个站点`,
    play: '开始 ›',
    goal(t) {
      const parts = [
        `${t.cars} 辆车`,
        t.weather !== 'clear' ? S.weather(t.weather) : null,
        t.darkness === 'blackout' ? S.blackout : t.darkness === 'night' ? S.night : null,
        t.legendary ? S.legendary.name(t.legendary) : null,
        t.rule === 'flawless' ? '不能撞车' : null,
        t.goal.k === 'perfects' ? `${t.goal.n} 次完美时机` : null,
        t.goal.k === 'boss' ? '抓获首领' : null,
      ];
      return parts.filter((p): p is string => p !== null).join(' · ');
    },
    reward(r) {
      const parts = [r.item ? S.shop.item(r.item) : null, r.chest ? S.shop.chest(r.chest) : null, r.money ? `${Fmt.number(r.money)} 金币` : null];
      return parts.filter((p): p is string => p !== null).join(' + ');
    },
    stopDone: (n, of, reward) => `巡游站点 ${n}/${of} · ${reward}`,
    complete: (id) => `${S.tours.name(id).toUpperCase()}完成`,
    passedBefore: '这条巡游你已经完成过了',
  },
});
