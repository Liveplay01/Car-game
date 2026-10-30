import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { INVITE_LEVEL } from '../../../core/config';
import { rematchKind, ascensionRank, levelTrialLevel, levelKind, LANDMARK_PRESTIGE, type TrialId } from '../../../core/trials';
import { Fmt, money } from '../../format';

/** 简体中文 第2部分：试炼、首领、传奇、每周班次、声望、精英。 */
export default (S: Strings): Words<Strings> => ({
  rush: {
    name: '首领连战',
    caption: '首领连战',
    clock: '用时',
    best: '最佳',
    step: (n, total) => `首领 ${n} / ${total}`,
    shiftLine: (kind, first) => `${S.boss.name(kind)} · ${first ? '输一局就从头再来' : '计时不会停'}`,
    caught: (n, total) => `已抓获首领 ${n} / ${total}`,
    nextLine: (kind) => `下一个：${S.boss.name(kind)} · 点按继续`,
    over: '连战结束',
    overLine: (caught, total) => `${total} 名首领中抓获 ${caught} 名 · 点按重新开始`,
    cleared: '连战通关',
    firstLine: (m) => `八名首领全部拿下 · 发放 ${m}`,
    recordLine: '新的最佳用时',
    bestLine: (time) => `最佳用时 ${time} · 点按再来一次`,
    rowTitle: '八名首领全部拿下',
    line: '连续出战，只有一个计时',
    furthest: (n, total) => `最远到 ${n}/${total}`,
    locked: (beaten, total) => `击败全部八名首领后解锁 · ${beaten}/${total}`,
  },

  trials: {
    name(id) {
      const boss = rematchKind(id);
      if (boss) return S.boss.rematch(boss);
      if (id === 'landmark.etoile') return '星形广场';
      if (id === 'weekly') return S.weekly.title;
      if (id.startsWith('tour.')) return S.tours.stopName(id);
      const rank = ascensionRank(id);
      if (rank !== null) return `飞升 ★${rank}`;
      const level = levelTrialLevel(id);
      if (level !== null) return `${S.trials.kindName[levelKind(level)]} · Lv ${level}`;
      return {
        tightSqueeze: '险缝穿行',
        deadCentre: '正中靶心',
        cleanSheet: '零事故',
        blackout: '全城停电',
        stormWatch: '风暴警戒',
        marathon: '马拉松',
        mostWanted: '头号通缉',
        noPolice: '无警力',
        noDriving: '只靠双手',
        bareBuild: '裸装上阵',
      }[id as TrialId];
    },
    kindName: {
      precision: '精准',
      sharpEyes: '锐眼',
      cleanRun: '无损行驶',
      weatherRun: '恶劣天气',
      nightShift: '夜班',
      manhunt: '追捕',
      ruleBreaker: '毫不留情',
      handicap: '让步',
      longHaul: '长途',
    },
    goal(t) {
      if (t.tour) return S.tours.goal(t);
      if (t.elite) return S.weekly.goal(t);
      if (levelTrialLevel(t.id) !== null) {
        const strip = t.strip ?? [];
        const parts = [
          t.goal.k === 'perfects'
            ? `${t.goal.n} 次完美时机`
            : t.goal.k === 'skilled'
              ? `${t.goal.n} 次险过或更好`
              : t.goal.k === 'boss'
                ? `抓获${S.boss.name(t.boss ?? 'convoy')}`
                : null,
          `${t.cars} 辆车`,
          t.weather !== 'clear' ? S.weather(t.weather) : null,
          t.darkness === 'blackout' ? S.blackout : t.darkness === 'night' ? S.night : null,
          t.legendary ? S.legendary.name(t.legendary) : null,
          t.rule === 'flawless' ? '不能撞车' : null,
          strip.length > 0 ? `你的配置去掉${strip.map((g) => ['警察', '金钱', '驾驶'][g]).join('和')}` : null,
        ];
        return parts.filter((p): p is string => p !== null).join(' · ');
      }
      if (ascensionRank(t.id) !== null) {
        const parts = [
          `${t.cars} 辆车`,
          t.weather !== 'clear' ? S.weather(t.weather) : null,
          t.darkness === 'blackout' ? S.blackout : t.darkness === 'night' ? S.night : null,
          t.legendary ? S.legendary.name(t.legendary) : null,
          t.rule === 'flawless' ? '不能撞车' : null,
          t.goal.k === 'boss' ? '抓获首领' : null,
        ];
        return parts.filter((p): p is string => p !== null).join(' · ');
      }
      const boss = rematchKind(t.id);
      if (boss) return `再战${S.boss.name(boss)}:护卫更多，时间更短`;
      if (t.arms) return `一个环岛 ${t.arms} 条路 · ${t.cars} 辆车`;
      switch (t.id) {
        case 'tightSqueeze':
          return `${t.cars} 辆车中打出 ${t.goal.k === 'skilled' ? t.goal.n : 0} 次险过或更好`;
        case 'deadCentre':
          return `${t.cars} 辆车中打出 ${t.goal.k === 'perfects' ? t.goal.n : 0} 次完美时机`;
        case 'cleanSheet':
          return `${t.cars} 辆车，不能撞车`;
        case 'blackout':
          return `夜里 ${t.cars} 辆车，路灯全灭`;
        case 'stormWatch':
          return `夜间风暴中 ${t.cars} 辆车`;
        case 'marathon':
          return `一个班次 ${t.cars} 辆车`;
        case 'mostWanted':
          return '抓获辛迪加首领';
        case 'noPolice':
          return `用你的配置跑 ${t.cars} 辆车，但不能用警察升级`;
        case 'noDriving':
          return `用你的配置跑 ${t.cars} 辆车，但不能用驾驶升级(没有护盾)`;
        case 'bareBuild':
          return `用你的配置跑 ${t.cars} 辆车，但不能用警察和驾驶升级`;
        default:
          return '';
      }
    },
    level: (l) => `${l} 级`,
    passed: '已通过',
    play: '开始',
    opensAt: (l) => `${l} 级开放`,
    opens: (t) => {
      const rank = ascensionRank(t.id);
      if (rank !== null) return `声望 ★${rank} 开放`;
      return t.arms ? `声望 ★${LANDMARK_PRESTIGE} 开放` : S.trials.opensAt(t.level);
    },
    howTo(t) {
      if (t.goal.k === 'perfects') {
        return {
          title: '窍门 · 完美时机',
          text: '把你的车放进空隙的正中间，前后留出差不多的距离。一大段空路不算：请选中等大小的空隙。',
          short: '中等空隙的正中间，别选特别大的',
        };
      }
      if (t.goal.k === 'skilled') {
        return {
          title: '窍门 · 险过',
          text: '紧贴前车或后车并入，但不要碰到：险过、擦肩和完美时机都算，宽松地并入则不算。',
          short: '紧贴另一辆车，但不能撞',
        };
      }
      return null;
    },
    progress: (t, have, need) => `${t.goal.k === 'perfects' ? '完美时机' : '险过或更好'} ${Math.min(have, need)}/${need}${have >= need ? ' ✓' : ''}`,
  },

  boss: {
    incoming: '辛迪加',
    scoutFirst: '带护卫的探子：用警车在护卫前面的空隙撞上去',
    name: (k) =>
      ({
        convoy: '护送车队',
        getaway: '逃亡司机',
        armoured: '装甲首领',
        phantom: '幻影',
        twins: '双胞胎',
        decoy: '诱饵',
        smuggler: '走私贩',
        kingpin: '大头目',
      })[k],
    rematch: (k) => `复仇 · ${S.boss.name(k)}`,
    beaten: '已抓获',
    escaped: (k) => `${S.boss.name(k)}逃脱了`,
    caught: (k) => `抓获首领 — ${S.boss.name(k)}`,
    wanted: (seconds) => `首领 ${Math.ceil(Math.max(0, seconds))}`,
    busted: (amount) => `抓获首领 · 追回 ${amount}`,
    label: (role) => (role === 'boss' ? '首领' : role === 'escort' ? '护卫' : null),
  },

  legendary: {
    caption: '传奇班次',
    name: (r) => ({ gridlock: '交通瘫痪', dragnet: '天罗地网', heavyLoad: '重载运输', darkStorm: '黑暗风暴', zeroTolerance: '零容忍' })[r],
    line: (r) =>
      ({
        gridlock: '从第一辆车起就是高峰期',
        dragnet: '罪犯出现得更频繁，是平时的两倍',
        heavyLoad: '到处是卡车，其中一半是燃气罐车',
        darkStorm: '全城停电中的风暴',
        zeroTolerance: '撞一次就结束',
      })[r],
    reward: '奖励',
    chest: '高级',
    done: (item) => `传奇班次完成${item ? ` · 解锁${S.shop.item(item)}` : ''}`,
    broken: '违反规则',
  },

  weekly: {
    title: '每周班次',
    caption: '每周班次',
    elite: (e) => ({ flawless: '无瑕', precision: '精准', storm: '风暴锋', gridlock: '交通瘫痪', dragnet: '天罗地网', boss: '首领追捕' })[e],
    goal(t) {
      switch (t.elite) {
        case 'flawless':
          return `${t.level} 级 · ${t.cars} 辆车，不能撞车`;
        case 'precision':
          return `${t.level} 级 · ${t.cars} 辆车中打出 ${t.goal.k === 'perfects' ? t.goal.n : 0} 次完美时机`;
        case 'storm':
          return `${t.level} 级 · 夜间风暴中 ${t.cars} 辆车`;
        case 'gridlock':
          return `${t.level} 级 · 一开始就是高峰期，${t.cars} 辆车`;
        case 'dragnet':
          return `${t.level} 级 · ${t.cars} 辆车，罪犯出现得是平时的两倍`;
        case 'boss':
          return `${t.level} 级 · 抓获辛迪加首领`;
        default:
          return '';
      }
    },
    daysLeft: (n) => (n === 1 ? '最后一天' : `还剩 ${n} 天`),
    hint: '这周所有人都是同一个班次。想玩多少次都行，奖励只发一次。',
    done: (m) => `每周班次完成 · +${money(m)}`,
    passedThisWeek: '本周已通过 · 周一刷新',
  },

  invite: {
    shareText: (level) => `和我一起玩 Roundabout Timing 吧！你达到 ${level} 级，我们俩都能得到一个免费宝箱。`,
  },

  rewards: {
    crew: (reason, what) => {
      const [kind, what2, ...rest] = reason.split(':');
      if (kind !== 'crew') return null;
      switch (what2) {
        case 'gift':
          return `车队礼物 · ${what} · 来自${rest.slice(1).join(':') || '你的车队'}`;
        case 'up':
          return `晋级 · ${what} · ${S.crew.league(rest[0] ?? '')}`;
        case 'goal':
          return `达成每周目标 · ${what} · 多亏了你的车队`;
        case 'xp':
          return `每周目标×${rest[0] ?? ''} · ${what} · 你的车队表现出色`;
        case 'top':
          return `联赛第${rest[0] ?? ''}名 · ${what} · 你的车队名列前茅`;
        case 'back':
          return `礼物退回 · ${what} · 没有人领取`;
        default:
          return null;
      }
    },
    bugHunter: (id) => `已解锁${S.shop.item(id).toUpperCase()} · 感谢你捉虫`,
    playStore: (id) => `已解锁${S.shop.item(id).toUpperCase()} · 欢迎来到 Google Play`,
    chest: (kind) => `来自团队的礼物 · ${S.shop.chest(kind)} · 谢谢你`,
    money: (amount) => `来自团队的礼物 · ${Fmt.number(amount)} 金钱 · 谢谢你`,
    item: (id) => `来自团队的礼物 · 已解锁${S.shop.item(id)}`,
    invite: (reason, kind) => {
      const [, what, ...rest] = reason.startsWith('invite:') ? reason.split(':') : [];
      const who = rest.join(':');
      switch (what) {
        case 'welcome':
          return `邀请奖励 · ${S.shop.chest(kind)} · 你通过 ${who} 加入`;
        case 'friend':
          return `邀请奖励 · ${S.shop.chest(kind)} · ${who} 达到了 ${INVITE_LEVEL} 级`;
        case 'milestone':
          return `邀请加成 · ${S.shop.chest(kind)} · ${who} 位朋友加入了`;
        default:
          return null;
      }
    },
  },

  prestige: {
    title: '声望',
    ready: (level) => `已达到 ${level} 级：在更难的道路上从 1 级重新开始`,
    locked: (level) => `达到 ${level} 级，即可在更难的道路上重新开始`,
    keeps: '金钱、升级、道路和收藏都会保留。只改变外观，绝无优势。',
    confirm: '再点一次确认声望 · 回到 1 级',
    available: (rank) => `声望 ★${rank} 已就绪 · 在 进度 → 精英 中重新开始，迎接更难的道路和新的奖励`,
    done: (rank, item) => `声望 ★${rank}${item ? ` · 解锁${S.shop.item(item)}` : ''}`,
    headStart: (levels) => `车流会难 ${levels} 个等级`,
  },

  elite: {
    title: '精英',
    caption: (level) => `精英 ${level}`,
    locked: (level) => `达到 ${level} 级：精英之路和声望将开启`,
    prestigeHeader: '声望',
    rank: '段位',
    traffic: '车流',
    harder: (levels) => `+${levels} 级`,
    prestigeAction: (rank) => `声望升至 ★${rank}`,
    prestigeConfirm: '再点一次 · 回到 1 级',
    next: (step) => `下一个精英 ${step.level}:${S.elite.reward(step)}`,
    reward: (step) => (step.item ? S.shop.item(step.item.id) : step.title ? `称号“${S.titles.name(step.title)}”` : S.shop.chest(step.chest)),
    toGo: (b) => {
      const next = `距精英 ${b.level + 1} 还差 ${Fmt.number(b.left)} 经验`;
      if (b.climbed > 0) return `精英 ${b.level} · ${next}`;
      return b.gained > 0 ? `+${Fmt.number(b.gained)} 经验 · ${next}` : next;
    },
    opened: '精英车手 · 精英之路已开启',
    reached: (step) => `精英 ${step.level}${step.item ? ` · 解锁${S.shop.item(step.item.id)}` : ''}`,
    body: [
      '从 50 级起，每个班次都会带来精英经验：完成一个班次得 10,每次完美时机和险过各得 1,抓获首领或完成传奇班次再加 10。',
      '每个精英等级需要的经验比上一级多一点。每级奖励一个标准宝箱，每十级奖励一个高级宝箱。沿途还有称号和皮肤。声望重置后，这条路会保留。',
      '只改变外观，绝不会在路上带来优势。',
    ],
    trackHeader: '沿途奖励',
    titlesHeader: '称号 · 点按一个来佩戴',
    wearing: '佩戴中',
    notYet: '尚未获得',
  },
});
