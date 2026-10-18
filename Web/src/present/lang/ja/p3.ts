import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { Fmt, money } from '../../format';

/** 日本語 パート3: 称号、シーズンパス、殿堂、モード、シーズンルール、ツアー。 */
export default (S: Strings): Words<Strings> => ({
  titles: {
    name: (id) =>
      ({
        eliteDriver: 'エリートドライバー',
        roadVeteran: 'ロードベテラン',
        ringMaster: 'リングマスター',
        ironNerves: '鋼の神経',
        roadRoyalty: 'ロードの貴族',
        livingLegend: '生ける伝説',
        precisionDriver: '精密ドライバー',
        comboMaster: 'コンボマスター',
        closeCallArtist: 'ニアミスの達人',
        syndicateBreaker: 'シンジケート破壊者',
        nightOwl: 'ナイトオウル',
        stormChaser: 'ストームチェイサー',
        legendHunter: 'レジェンドハンター',
        starDriver: 'スタードライバー',
        marathoner: 'マラソンランナー',
        overdriver: 'オーバードライバー',
        endless: 'エンドレス',
        scorcher: 'スコーチャー',
        inferno: 'インフェルノ',
        meltdown: 'メルトダウン',
        patron: 'パトロン',
        benefactor: '恩人',
        philanthropist: '慈善家',
        visionary: '先見者',
        sovereign: '君主',
        timeless: '時を超える者',
        apex: 'アペックス',
        boundless: '無限',
        ascended: '昇天者',
        eternal: '永遠',
        grandmaster: 'グランドマスター',
        centurion: 'ケントゥリオ',
        immortal: '不死',
        roadWarden: 'ロードウォーデン',
        gridlord: 'グリッドロード',
        ringbearer: 'リングベアラー',
        unstoppable: '止められない者',
        timekeeper: '時の番人',
        paragon: '鑑',
        mythic: '神話級',
        ringEternal: '永遠のリング',
        mastermind: '黒幕',
        summit: '頂点',
        syndicateEnd: 'シンジケートの終焉',
      })[id],
    rule(r) {
      switch (r.k) {
        case 'elite':
          return `エリート${r.level}に到達`;
        case 'mastery':
          return `マスタリー「${S.mastery.name(r.goal)}」をコンプリート`;
        case 'bosses':
          return r.all ? 'シンジケートのボス8体をすべて確保' : 'シンジケートのボス最初の4体を確保';
        case 'trial':
          return `トライアル「${S.trials.name(r.id as never)}」に合格`;
        case 'legendary':
          return `レジェンダリーシフトを${r.shifts}回クリア`;
        case 'prestige':
          return `プレステージ★${r.rank}に到達`;
        case 'heat':
          return S.heat.rule(r.level);
        case 'fund':
          return `ゲームファンドに${money(Fmt.number(r.amount))}を寄付`;
        case 'item':
          return `アンリミテッドで${S.shop.item(r.id)}を解放`;
        case 'masteries':
          return 'すべてのマスタリーでレベルVに到達';
      }
    },
    earned: (ids) => (ids.length === 1 ? `称号 · ${S.titles.name(ids[0])}` : `新しい称号${ids.length}個 · ${ids.map((t) => S.titles.name(t)).join('、')}`),
    none: '称号なし',
  },

  pass: {
    title: 'シーズンパス',
    seasonName: (s) => ({ winter: '冬', spring: '春', summer: '夏', autumn: '秋' })[s],
    caption: (s) => `シーズンパス ${S.pass.seasonName(s)}`,
    tier: (n, total) => `${total}段階中${n}段階目`,
    locked: (level) => `レベル${level}で解放`,
    buyHint: '宝箱、お金、スキン3種',
    free: '無料',
    waiting: (n) => `${n}段階がパスを待っています`,
    daysLeft: (n) => (n === 1 ? '最終日' : `あと${n}日`),
    complete: 'ロード走破 · 次のシーズンまでお待ちください',
    openAtEnd: (n) => `まもなくシーズン終了 · ${n}段階が未獲得`,
    reached: (step) =>
      `シーズンパス · ${step.tier}段階目 · ${step.duplicate > 0 ? `${S.pass.reward(step.reward)}をふたたび · +${money(Fmt.number(step.duplicate))}` : S.pass.reward(step.reward)}`,
    buy: (price) => `購入 · ${price}`,
    body: (xpPerTier) => [
      `このシーズンの12段階のロードで、ゲーム内マネーで購入します。シフトを遊ぶたびにXPがたまります。シフト完了で10、パーフェクトとギリギリ1回ごとに1、ボスまたはレジェンダリーシフトでさらに10。最初の段階は${xpPerTier} XP、以降は少しずつ増えます。`,
      '3つの段階には、このシーズンのスキンが入っています。宝箱にはない演出つきです。四季は毎年めぐり、スキンも戻ってきます。',
      '見た目だけで、道での有利さは一切ありません。ここでは本物のお金はかかりません。',
    ],
    freeBody: (xpPerTier) => [
      `このシーズンの12段階のロードです。パスの有無にかかわらず、シフトを遊ぶたびにXPがたまります。シフト完了で10、パーフェクトとギリギリ1回ごとに1、ボスまたはレジェンダリーシフトでさらに10。最初の段階は${xpPerTier} XP、以降は少しずつ増えます。`,
      '3つの段階は誰でも無料です。ゲーム内マネーでパスを買うと、ほかの段階も報酬が出て、すでに到達した分はすぐに受け取れます。',
      '3つの段階には、このシーズンのスキンが入っています。宝箱にはない演出つきです。四季は毎年めぐり、スキンも戻ってきます。見た目だけで、道での有利さは一切ありません。',
    ],
    trackHeader: 'ロード',
  },

  hall: {
    header: 'プレステージ年表',
    plaqueLine: (e, date) => [date, e.elite > 0 ? `エリート${e.elite}` : null, `ボス${e.bosses}体`, e.legendary > 0 ? `レジェンダリー${e.legendary}回` : null].filter((x) => x).join(' · '),
    empty: '最初のプレステージで、最初のプレートが飾られます。',
  },

  modes: {
    name: (m) => (m === 'shift' ? 'シフト' : m === 'unlimited' ? 'アンリミテッド' : m === 'mayhem' ? 'メイヘム' : 'マルチプレイ'),
    line: (m) =>
      m === 'shift'
        ? 'レベルをクリアして昇格'
        : m === 'unlimited'
          ? '終わりなし · クラッシュするまで'
          : m === 'mayhem'
            ? '車12台 · タンカーを狙え'
            : '最大4人の友だち · 最後まで残った人が勝ち',
    youLabel: 'あなた',
    defaultName: 'プレイヤー',
    runOver: 'ラン終了',
    again: 'タップでもう一度',
    carsSent: (n) => `${n}台`,
    tryUnlimited: { caption: 'ゲームモード', text: '横にスワイプでアンリミテッドへ。レベルなし、クラッシュするまで走ろう' },
    tightFit: { caption: 'ヒント', text: '近いほどお得: 車のすぐ後ろに合流すればギリギリ、得点2倍' },
    swipeCaption: 'ゲームモード',
    swipeHint: 'スワイプでモードを切り替え',
    tryUnlimitedKeys: { caption: 'ゲームモード', text: '→キーでアンリミテッドへ。レベルなし、クラッシュするまで走ろう' },
    swipeHintKeys: '← → でモードを切り替え',
    stage: (stage, overtime) =>
      overtime > 0
        ? `残業 ${overtime} · 交通量が増え、少し速くなる`
        : (['', 'ガスタンカーが紛れ込む', '夜が訪れる', '嵐が近づく', '軍用トラックが道路に'][stage] ?? ''),
    tier: (id) => ({ bronze: 'ブロンズ', silver: 'シルバー', gold: 'ゴールド', platinum: 'プラチナ', diamond: 'ダイヤモンド', master: 'マスター' })[id],
    mark: (cars, reward) =>
      reward.tier ? `${cars}台 · ${S.modes.tier(reward.tier).toUpperCase()}` : reward.skin ? `${cars}台 · ${S.shop.item(reward.skin).toUpperCase()}` : `${cars}台`,
    tierUp: (id) => `新ランク · アンリミテッドで${S.modes.tier(id).toUpperCase()}`,
    tierLine: (id, next) => [id ? S.modes.tier(id) : '–', next ? `${S.modes.tier(next.id)}まで${next.cars}台` : null].filter(Boolean).join(' · '),
    milestone: (id) => `アンリミテッドのマイルストーン · ${S.shop.item(id)}を解放`,
  },

  mayhem: {
    caption: 'メイヘム',
    flames: '炎',
    cars: '車',
    chain: (n) => `チェーン ×${n}`,
    over: 'メイヘム終了',
    again: 'タップでもっとメイヘム',
    summary: (wrecks, chain) => `残骸${wrecks}台 · 最大チェーン ×${chain}`,
  },

  seasonRule: {
    name: (s) => ({ winter: '真冬', spring: '春のにわか雨', summer: '夏の嵐', autumn: '霧と夕暮れ' })[s],
    line: (s) =>
      ({
        winter: '霧と雪が増え、夜が早く訪れる',
        spring: '雨がより多く、より頻繁に',
        summer: 'たいてい晴れだが、崩れると嵐になる',
        autumn: '霧が増え、夕暮れが早い',
      })[s],
  },

  tours: {
    caption: 'ツアー',
    name: (id) => ({ halloween: 'ホーンテッドリング', winter: 'ウィンターライツ' })[id],
    tagline: (id) =>
      ({
        halloween: '日が暮れてからの7つのストップ。スキン3種はここだけ。',
        winter: '雪景色の7つのストップ。スキン3種はここだけ。',
      })[id],
    stop: (n, of) => `ストップ ${n}/${of}`,
    stopName: (id) => {
      const m = /^tour\.([a-z]+)\.(\d+)$/.exec(id);
      return m ? `${S.tours.name(m[1] as 'halloween' | 'winter')} · ストップ ${m[2]}` : '';
    },
    left: (n) => (n <= 1 ? '最終日' : `あと${n}日`),
    opensIn: (n) => (n === 1 ? '明日' : `${n}日後`),
    startsIn: (inDays) => `${S.tours.opensIn(inDays)}開始`,
    locked: (level) => `ツアーはレベル${level}で解放`,
    progress: (done, total) => `${done}/${total}ストップ`,
    play: 'プレイ ›',
    goal(t) {
      const parts = [
        `${t.cars}台`,
        t.weather !== 'clear' ? S.weather(t.weather) : null,
        t.darkness === 'blackout' ? S.blackout : t.darkness === 'night' ? S.night : null,
        t.legendary ? S.legendary.name(t.legendary) : null,
        t.rule === 'flawless' ? 'ノークラッシュ' : null,
        t.goal.k === 'perfects' ? `パーフェクト${t.goal.n}回` : null,
        t.goal.k === 'boss' ? 'ボスを確保' : null,
      ];
      return parts.filter((p): p is string => p !== null).join(' · ');
    },
    reward(r) {
      const parts = [r.item ? S.shop.item(r.item) : null, r.chest ? S.shop.chest(r.chest) : null, r.money ? `${Fmt.number(r.money)}コイン` : null];
      return parts.filter((p): p is string => p !== null).join(' + ');
    },
    stopDone: (n, of, reward) => `ツアー ストップ ${n}/${of} · ${reward}`,
    complete: (id) => `${S.tours.name(id).toUpperCase()}達成`,
    passedBefore: 'このツアーではすでに達成済み',
  },
});
