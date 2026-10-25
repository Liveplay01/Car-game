import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { INVITE_LEVEL } from '../../../core/config';
import { rematchKind, ascensionRank, levelTrialLevel, levelKind, LANDMARK_PRESTIGE, type TrialId } from '../../../core/trials';
import { Fmt, money } from '../../format';

/** 日本語 パート2: トライアル、ボス、レジェンダリー、ウィークリーシフト、プレステージ、エリート。 */
export default (S: Strings): Words<Strings> => ({
  rush: {
    name: 'ボスラッシュ',
    caption: 'ボスラッシュ',
    clock: 'タイム',
    best: 'ベスト',
    step: (n, total) => `ボス ${n} / ${total}`,
    shiftLine: (kind, first) => `${S.boss.name(kind)} · ${first ? '1回でも負けると最初からやり直し' : 'タイムは進み続ける'}`,
    caught: (n, total) => `ボス ${n} / ${total} 確保`,
    nextLine: (kind) => `次は${S.boss.name(kind)} · タップで続行`,
    over: 'ラッシュ終了',
    overLine: (caught, total) => `ボス${total}体中${caught}体を確保 · タップでやり直し`,
    cleared: 'ラッシュ達成',
    firstLine: (m) => `ボス8体をすべて撃破 · ${m}を獲得`,
    recordLine: '自己ベスト更新',
    bestLine: (time) => `ベスト ${time} · タップでもう一度`,
    rowTitle: 'ボス8体すべて',
    line: '連続で、タイムは1つ',
    furthest: (n, total) => `最高到達 ${n}/${total}`,
    locked: (beaten, total) => `ボス8体をすべて倒すと解放 · ${beaten}/${total}`,
  },

  trials: {
    name(id) {
      const boss = rematchKind(id);
      if (boss) return S.boss.rematch(boss);
      if (id === 'landmark.etoile') return 'エトワール凱旋門';
      if (id === 'weekly') return S.weekly.title;
      if (id.startsWith('tour.')) return S.tours.stopName(id);
      const rank = ascensionRank(id);
      if (rank !== null) return `アセンション ★${rank}`;
      const level = levelTrialLevel(id);
      if (level !== null) return `${S.trials.kindName[levelKind(level)]} · Lv ${level}`;
      return {
        tightSqueeze: 'ぎりぎり突破',
        deadCentre: 'ど真ん中',
        cleanSheet: 'ノーミス',
        blackout: 'ブラックアウト',
        stormWatch: '嵐の見張り',
        marathon: 'マラソン',
        mostWanted: '最重要指名手配',
        noPolice: '警察なし',
        noDriving: '手だけで',
        bareBuild: '素の構成',
      }[id as TrialId];
    },
    kindName: {
      precision: '精密',
      sharpEyes: '鋭い目',
      cleanRun: 'クリーンラン',
      weatherRun: '荒天走行',
      nightShift: '夜勤',
      manhunt: '追跡',
      ruleBreaker: '容赦なし',
      handicap: 'ハンデ',
      longHaul: '長距離',
    },
    goal(t) {
      if (t.tour) return S.tours.goal(t);
      if (t.elite) return S.weekly.goal(t);
      if (levelTrialLevel(t.id) !== null) {
        const strip = t.strip ?? [];
        const parts = [
          t.goal.k === 'perfects'
            ? `パーフェクト${t.goal.n}回`
            : t.goal.k === 'skilled'
              ? `ギリギリ以上${t.goal.n}回`
              : t.goal.k === 'boss'
                ? `${S.boss.name(t.boss ?? 'convoy')}を確保`
                : null,
          `${t.cars}台`,
          t.weather !== 'clear' ? S.weather(t.weather) : null,
          t.darkness === 'blackout' ? S.blackout : t.darkness === 'night' ? S.night : null,
          t.legendary ? S.legendary.name(t.legendary) : null,
          t.rule === 'flawless' ? 'ノークラッシュ' : null,
          strip.length > 0 ? `${strip.map((g) => ['警察', 'お金', '運転'][g]).join('と')}なしの構成` : null,
        ];
        return parts.filter((p): p is string => p !== null).join(' · ');
      }
      if (ascensionRank(t.id) !== null) {
        const parts = [
          `${t.cars}台`,
          t.weather !== 'clear' ? S.weather(t.weather) : null,
          t.darkness === 'blackout' ? S.blackout : t.darkness === 'night' ? S.night : null,
          t.legendary ? S.legendary.name(t.legendary) : null,
          t.rule === 'flawless' ? 'ノークラッシュ' : null,
          t.goal.k === 'boss' ? 'ボスを確保' : null,
        ];
        return parts.filter((p): p is string => p !== null).join(' · ');
      }
      const boss = rematchKind(t.id);
      if (boss) return `${S.boss.name(boss)}にもう一度: 護衛が増え、時間は短く`;
      if (t.arms) return `1つのリングに道${t.arms}本 · ${t.cars}台`;
      switch (t.id) {
        case 'tightSqueeze':
          return `${t.cars}台のうちギリギリ以上${t.goal.k === 'skilled' ? t.goal.n : 0}回`;
        case 'deadCentre':
          return `${t.cars}台のうちパーフェクト${t.goal.k === 'perfects' ? t.goal.n : 0}回`;
        case 'cleanSheet':
          return `${t.cars}台、ノークラッシュ`;
        case 'blackout':
          return `夜に${t.cars}台、街灯は消灯`;
        case 'stormWatch':
          return `夜の嵐の中を${t.cars}台`;
        case 'marathon':
          return `1シフトで${t.cars}台`;
        case 'mostWanted':
          return 'シンジケートのボスを確保しよう';
        case 'noPolice':
          return `自分の構成で${t.cars}台、ただし警察アップグレードなし`;
        case 'noDriving':
          return `自分の構成で${t.cars}台、ただし運転アップグレードなし(シールドなし)`;
        case 'bareBuild':
          return `自分の構成で${t.cars}台、ただし警察と運転のアップグレードなし`;
        default:
          return '';
      }
    },
    level: (l) => `レベル${l}`,
    passed: '合格',
    play: 'プレイ',
    opensAt: (l) => `レベル${l}で解放`,
    opens: (t) => {
      const rank = ascensionRank(t.id);
      if (rank !== null) return `プレステージ★${rank}で解放`;
      return t.arms ? `プレステージ★${LANDMARK_PRESTIGE}で解放` : S.trials.opensAt(t.level);
    },
    howTo(t) {
      if (t.goal.k === 'perfects') {
        return {
          title: 'コツ · パーフェクト',
          text: '車間のちょうど真ん中に車を入れましょう。前後のすきまが同じくらいになるように。ただ長く空いているだけの区間は数えません。中くらいの車間を選んでください。',
          short: '大きすぎない車間の、真ん中を狙う',
        };
      }
      if (t.goal.k === 'skilled') {
        return {
          title: 'コツ · ギリギリ',
          text: '前か後ろの車にぶつからないよう、すれすれで合流しましょう。ギリギリ、ニアミス、パーフェクトが数えられます。余裕のある合流は数えません。',
          short: 'クラッシュせずに、ほかの車のすぐそばへ',
        };
      }
      return null;
    },
    progress: (t, have, need) => `${t.goal.k === 'perfects' ? 'パーフェクト' : 'ギリギリ以上'} ${Math.min(have, need)}/${need}${have >= need ? ' ✓' : ''}`,
  },

  boss: {
    incoming: 'シンジケート',
    scoutFirst: '護衛つきの斥候です。護衛の手前の車間に、パトカーで突っ込もう',
    name: (k) =>
      ({
        convoy: 'コンボイ',
        getaway: '逃走ドライバー',
        armoured: '装甲ボス',
        phantom: 'ファントム',
        twins: 'ツインズ',
        decoy: 'おとり',
        smuggler: '密輸業者',
        kingpin: 'キングピン',
      })[k],
    rematch: (k) => `リベンジ · ${S.boss.name(k)}`,
    beaten: '確保',
    escaped: (k) => `${S.boss.name(k)}に逃げられた`,
    caught: (k) => `ボス確保 — ${S.boss.name(k)}`,
    wanted: (seconds) => `ボス ${Math.ceil(Math.max(0, seconds))}`,
    busted: (amount) => `ボスを確保 · ${amount}を取り戻した`,
    label: (role) => (role === 'boss' ? 'ボス' : role === 'escort' ? '護衛' : null),
  },

  legendary: {
    caption: 'レジェンダリーシフト',
    name: (r) => ({ gridlock: '大渋滞', dragnet: '一斉検問', heavyLoad: '重量物輸送', darkStorm: '暗黒の嵐', zeroTolerance: 'ゼロトレランス' })[r],
    line: (r) =>
      ({
        gridlock: '1台目からラッシュアワー',
        dragnet: '犯罪者が2倍の頻度で出現',
        heavyLoad: 'トラックだらけ、半分はガスタンカー',
        darkStorm: 'ブラックアウトの中の嵐',
        zeroTolerance: '1回のクラッシュで終了',
      })[r],
    reward: '報酬',
    chest: 'プレミアム',
    done: (item) => `レジェンダリーシフト達成${item ? ` · ${S.shop.item(item)}を解放` : ''}`,
    broken: 'ルール違反',
  },

  weekly: {
    title: 'ウィークリーシフト',
    caption: 'ウィークリーシフト',
    elite: (e) => ({ flawless: '完璧', precision: '精密', storm: '嵐の前線', gridlock: '大渋滞', dragnet: '一斉検問', boss: 'ボス狩り' })[e],
    goal(t) {
      switch (t.elite) {
        case 'flawless':
          return `レベル${t.level} · ${t.cars}台、ノークラッシュ`;
        case 'precision':
          return `レベル${t.level} · ${t.cars}台のうちパーフェクト${t.goal.k === 'perfects' ? t.goal.n : 0}回`;
        case 'storm':
          return `レベル${t.level} · 夜の嵐の中を${t.cars}台`;
        case 'gridlock':
          return `レベル${t.level} · 最初からラッシュアワーで${t.cars}台`;
        case 'dragnet':
          return `レベル${t.level} · ${t.cars}台、犯罪者が2倍の頻度`;
        case 'boss':
          return `レベル${t.level} · シンジケートのボスを確保`;
        default:
          return '';
      }
    },
    daysLeft: (n) => (n === 1 ? '最終日' : `あと${n}日`),
    hint: '今週は全員が同じシフトです。何度でも遊べますが、報酬は1回だけ。',
    done: (m) => `ウィークリーシフト達成 · +${money(m)}`,
    passedThisWeek: '今週は合格済み · 新しいシフトは月曜日',
  },

  invite: {
    shareText: (level) => `いっしょにRoundabout Timingを遊ぼう！ レベル${level}に到達すると、二人とも無料の宝箱がもらえるよ。`,
  },

  rewards: {
    crew: (reason, what) => {
      const [kind, what2, ...rest] = reason.split(':');
      if (kind !== 'crew') return null;
      switch (what2) {
        case 'gift':
          return `クルーからのプレゼント · ${what} · ${rest.slice(1).join(':') || 'あなたのクルー'}より`;
        case 'up':
          return `昇格 · ${what} · ${S.crew.league(rest[0] ?? '')}`;
        case 'goal':
          return `週間目標達成 · ${what} · クルーのおかげ`;
        case 'xp':
          return `週間目標×${rest[0] ?? ''} · ${what} · クルーが大活躍`;
        case 'top':
          return `リーグ${rest[0] ?? ''}位 · ${what} · クルーが上位でフィニッシュ`;
        case 'back':
          return `ギフトが戻ってきた · ${what} · だれも受け取らなかった`;
        default:
          return null;
      }
    },
    bugHunter: (id) => `${S.shop.item(id).toUpperCase()}を解放 · バグ探しに感謝`,
    chest: (kind) => `チームからのプレゼント · ${S.shop.chest(kind)} · ありがとう`,
    money: (amount) => `チームからのプレゼント · ${Fmt.number(amount)}のお金 · ありがとう`,
    item: (id) => `チームからのプレゼント · ${S.shop.item(id)}を解放`,
    invite: (reason, kind) => {
      const [, what, ...rest] = reason.startsWith('invite:') ? reason.split(':') : [];
      const who = rest.join(':');
      switch (what) {
        case 'welcome':
          return `招待報酬 · ${S.shop.chest(kind)} · ${who}の招待で参加しました`;
        case 'friend':
          return `招待報酬 · ${S.shop.chest(kind)} · ${who}がレベル${INVITE_LEVEL}に到達`;
        case 'milestone':
          return `招待ボーナス · ${S.shop.chest(kind)} · ${who}人の友だちが参加`;
        default:
          return null;
      }
    },
  },

  prestige: {
    title: 'プレステージ',
    ready: (level) => `レベル${level}に到達: より険しい道で、レベル1からやり直せます`,
    locked: (level) => `レベル${level}に到達すると、より険しい道でやり直せます`,
    keeps: 'お金、アップグレード、道、コレクションは引き継がれます。見た目だけで、有利にはなりません。',
    confirm: 'もう一度タップでプレステージ · レベル1に戻る',
    available: (rank) => `プレステージ★${rank}の準備完了 · 進捗 → エリートからやり直すと、より険しい道と新しい報酬が待っています`,
    done: (rank, item) => `プレステージ★${rank}${item ? ` · ${S.shop.item(item)}を解放` : ''}`,
    headStart: (levels) => `交通がレベル${levels}ぶん厳しくなります`,
  },

  elite: {
    title: 'エリート',
    caption: (level) => `エリート${level}`,
    locked: (level) => `レベル${level}に到達: エリートロードとプレステージが開きます`,
    prestigeHeader: 'プレステージ',
    rank: 'ランク',
    traffic: '交通',
    harder: (levels) => `+${levels}レベル`,
    prestigeAction: (rank) => `★${rank}にプレステージ`,
    prestigeConfirm: 'もう一度タップ · レベル1に戻る',
    next: (step) => `次のエリート${step.level}: ${S.elite.reward(step)}`,
    reward: (step) => (step.item ? S.shop.item(step.item.id) : step.title ? `称号「${S.titles.name(step.title)}」` : S.shop.chest(step.chest)),
    toGo: (b) => {
      const next = `エリート${b.level + 1}まであと${Fmt.number(b.left)} XP`;
      if (b.climbed > 0) return `エリート${b.level} · ${next}`;
      return b.gained > 0 ? `+${Fmt.number(b.gained)} XP · ${next}` : next;
    },
    opened: 'エリートドライバー · エリートロードが開いた',
    reached: (step) => `エリート${step.level}${step.item ? ` · ${S.shop.item(step.item.id)}を解放` : ''}`,
    body: [
      'レベル50からは、シフトごとにエリートXPが入ります。シフト完了で10、パーフェクトとギリギリ1回ごとに1、ボス確保またはレジェンダリーシフトでさらに10。',
      'エリートレベルは上がるごとに少しずつ多くのXPが必要です。各レベルでスタンダード宝箱、10レベルごとにプレミアム宝箱がもらえます。途中には称号とスキンも。プレステージしてもロードは引き継がれます。',
      '見た目だけで、道での有利さは一切ありません。',
    ],
    trackHeader: 'ロードの途中',
    titlesHeader: '称号 · タップして身につける',
    wearing: '装着中',
    notYet: 'まだ',
  },
});
