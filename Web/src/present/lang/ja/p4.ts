import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { Fmt, money } from '../../format';
import { SPECIAL_TEXT, FAIL_TEXT } from '../../museumText';

const COLORS: Record<string, string> = { purple: '紫', gold: '金', blue: '青', red: '赤', teal: 'ティール', orange: 'オレンジ', pink: 'ピンク', rose: 'ローズ' };
const color = (name: string): string => COLORS[name] ?? name;

/** 日本語 パート4: 実績、ブリーフィング、通知、タブ、進捗、ソーシャル、ミュージアム。 */
export default (S: Strings): Words<Strings> => ({
  ach: {
    heading: '実績',
    name: (id) =>
      ({
        scrapyard: 'スクラップ置き場',
        fireworks: '花火',
        spotless: '一点のくもりなし',
        jackpot: 'ジャックポットハンター',
        critical: 'クリティカルヒット',
        wizard: '交通の魔術師',
        earner: '高収入',
        weatherproof: '悪天候に強い',
        stormRider: 'ストームライダー',
        whiteout: 'ホワイトアウト',
        moonlighter: '夜のアルバイト',
        lightsOut: '消灯',
        cityLife: '街の暮らし',
        longHaul: '長距離',
        clockwork: '時計仕掛け',
        onARoll: '絶好調',
        regular: '常連',
        testDriver: 'テストドライバー',
        hunter: 'シンジケートハンター',
        roadBuilder: '道路建設者',
        foreman: '現場監督',
        tuner: 'チューナー',
        chestOpener: '宝箱オープナー',
        collector: 'コレクター',
        climber: 'クライマー',
        elite: 'エリートドライバー',
        reborn: '転生',
        heatSeeker: 'ヒートシーカー',
        gambler: 'ハイローラー',
        tourist: '観光客',
      })[id] ?? id,
    goal: (id, n) => {
      const N = Fmt.number(n);
      return (
        {
          scrapyard: `残骸を${N}台出す`,
          fireworks: `爆発を${N}回起こす`,
          spotless: `パーフェクトランを${N}回`,
          jackpot: `ジャックポット輸送車を${N}台届ける`,
          critical: `クリティカル合流を${N}回決める`,
          wizard: `車を${N}台送り出す`,
          earner: `道で${N}コインを稼ぐ`,
          weatherproof: `悪天候のシフトを${N}回クリア`,
          stormRider: `嵐、ひょう、砂嵐のシフトを${N}回クリア`,
          whiteout: `霧または雪のシフトを${N}回クリア`,
          moonlighter: `夜のシフトを${N}回クリア`,
          lightsOut: `ブラックアウトのシフトを${N}回クリア`,
          cityLife: `街のイベントがあるシフトを${N}回クリア`,
          longHaul: `アンリミテッドで${Fmt.seconds(n)}走り続ける`,
          clockwork: `デイリーシフトを${N}回クリア`,
          onARoll: `デイリーを${N}日連続`,
          regular: `ウィークリーシフトを${N}回クリア`,
          testDriver: `トライアルを${N}回クリア`,
          hunter: `シンジケートのボスを${N}体確保`,
          roadBuilder: `追加の道を${N}本建設`,
          foreman: `モジュールを${N}個設置`,
          tuner: `アップグレードを${N}段階所有`,
          chestOpener: `宝箱を${N}個開ける`,
          collector: `アイテムを${N}個集める`,
          climber: `レベル${N}に到達`,
          elite: `エリート${N}に到達`,
          reborn: `プレステージを${N}回`,
          heatSeeker: `ヒート${N}でシフトをクリア`,
          gambler: `アーケードを${N}ラウンド遊ぶ`,
          tourist: `ツアーのストップを${N}個クリア`,
        } as Record<string, string>
      )[id] ?? ''
    },
    caption: '実績',
    reached: (id, tier, reward) => ({
      title: S.ach.name(id),
      tier: S.ach.tier(tier),
      reward: `+${money(reward)}`,
      text: `実績 · ${S.ach.name(id)} ${S.ach.tier(tier)} · +${money(reward)}`,
    }),
    many: (n, reward) => ({
      title: `実績${n}個`,
      tier: '★',
      reward: `+${money(reward)}`,
      text: `実績${n}個 · +${money(reward)} · 進捗 → 目標を見る`,
    }),
  },

  brief: {
    caption: (e, again) => `${again ? 'おさらい' : '新規'} · ${S.museum.name(e)}`.toUpperCase(),
  },

  push: {
    streakTitle: (days) => `${days}日連続のストリーク`,
    streakBody: '真夜中までに今日のデイリーシフトを遊んで、ストリークを続けよう。',
    giftTitle: '無料の宝箱の準備ができました',
    giftBody: 'スタンダード宝箱があなたを待っています。ゲームを開いて受け取ろう。',
    passTitle: (season) => `${S.pass.seasonName(season)}が来ました`,
    passBody: '新しいシーズンパスが始まりました。新スキン3種を獲得できます。',
    row: '通知',
    rowSub: 'ストリーク、無料の宝箱、新シーズン、トップ20で抜かれたとき。1日に最大1件。',
    rowInstall: 'まずゲームをホーム画面に追加してから、ここでオンにしてください。',
    choices: {
      streak: { title: 'デイリーストリーク', sub: 'ストリークが途切れる前の夜に、ひと声かけます。' },
      chests: { title: '無料の宝箱', sub: '明日の無料の宝箱と、招待のプレゼント。' },
      pass: { title: '新シーズン', sub: '新しいシーズンパスが始まったとき。' },
      rank: { title: '抜かれた', sub: 'トップ20でほかのプレイヤーに抜かれたとき。' },
      comeback: { title: 'おかえり', sub: '数日お休みしたあとのお知らせ。' },
    },
    rowNone: 'ここでは使えません。通知をオンにするには、ブラウザでゲームを開いてください。',
    rowLocal: 'オン。ゲームを閉じているときのお知らせにはオンラインサービスが必要で、このバージョンにはありません。',
    confirmTitle: '通知がオンになりました',
    rowBlocked: 'このサイトでブロックされています。オンにするには、ブラウザの設定で通知を許可してください。',
    offerFirstTitle: '明日は無料の宝箱',
    offerFirstWhy: '明日の無料の宝箱の準備ができたとき、そしてストリークが途切れる前にお知らせします。1日に最大1件、夜間はなし。設定でいつでもオフにできます。',
    offerTitle: 'ストリークを守ろう',
    offerWhy: 'ストリークが途切れる前、無料の宝箱が届いたとき、新シーズンが始まったときにお知らせします。1日に最大1件、夜間はなし。設定でいつでもオフにできます。',
    offerOn: '通知をオンにする',
    offerLater: 'あとで',
    on: '通知をオンにしました。設定でいつでもオフにできます。',
    failed: '通知をオンにできませんでした。あとでもう一度お試しください。',
    denied: 'このサイトの通知は、ブラウザの設定でブロックされています。',
  },

  wayBack: {
    chestTitle: '明日は無料の宝箱',
    streakTitle: 'また明日',
    chestWhy: 'ゲームをホーム画面に置いておけば、明日の無料の宝箱がワンタップで届き、進行状況も安全です。',
    streakWhy: 'ゲームをホーム画面に置いておけば、明日のストリークがワンタップで続けられ、進行状況も安全です。',
    install: 'ゲームをインストール',
  },

  ready: {
    tapToStart: 'タップでスタート',
    tapForFriends: 'タップで友だちと遊ぶ',
  },

  tabs: {
    progress: '進捗',
    social: 'ソーシャル',
    game: 'ゲーム',
    shop: 'ショップ',
    build: '建設',
  },

  progress: {
    section: (i) => ['今日', '目標', '統計'][i],
    allStats: 'すべての記録',
    statsMore: (n) => `さらに${n}件 ›`,
    statsHide: '隠す',
    odometer: '総走行距離',
    odometerLine: '合流させたすべての車の、出発から到着まで',
    odometerMoon: '月まで届いた。まだ走っている。',
    km: 'km',
    quests: 'クエスト',
    trials: 'トライアル',
    mastery: 'マスタリー',
    feats: '偉業',
    trialsLocked: (level) => `レベル${level}で解放 · 報酬つきの特別シフト`,
    landmarks: 'ランドマーク',
    landmarksHint: '有名なラウンドアバウトを、1か所ずつ難しいシフトで。',
    ascension: 'アセンション',
    ascensionHint: 'プレステージのランクごとに1つのトライアル。ゲームで最も難しいシフトです。',
    levelTrials: 'レベルトライアル',
    levelTrialsHint: (waiting, shown) =>
      waiting > shown ? `レベルが上がるごとに1つ増えます。あと${waiting - shown}件が待機中: 1つ合格すると次が現れます。` : 'レベルが上がるごとに1つ増えます。レベル30から120まで。',
    bosses: 'シンジケートのボス',
    legendary: 'レジェンダリーシフト',
    weeklies: 'ウィークリーシフト',
    ambulances: '通した救急車',
    level: '到達レベル',
    bestCombo: 'ベストコンボ',
    bestChain: '最長パーフェクトチェーン',
    streak: 'デイリーストリーク',
    flameTier: (tier) => ['エンジン停止', 'アイドリング', '吹け上がり', 'ミスファイア', 'アフターバーナー', 'インフェルノ'][tier] ?? '',
    streakDay: '日連続',
    streakDays: '日連続',
    streakStart: '今日のデイリーシフトを遊んで、エンジンをかけよう',
    streakKeep: '今日のデイリーシフトを遊んで、炎を絶やさないように',
    streakDone: '今日は完了 · また明日',
    streakCard: (n) => (n === 1 ? '翌日に無料のスクラッチカード' : `${n}日後に無料のスクラッチカード`),
    shiftsPlayed: 'プレイしたシフト',
    shiftsCompleted: 'クリアしたシフト',
    takedowns: '確保した犯人',
    transporters: '届けた輸送車',
    unlimitedBest: 'アンリミテッド最高記録',
    unlimitedCars: 'アンリミテッドの車数',
    unlimitedTier: 'アンリミテッドのランク',
    mayhemBest: 'メイヘムの炎',
    mayhemChain: 'メイヘムのチェーン',
    minutes: (s) => (s < 3600 ? `${Math.max(1, Math.round(s / 60))}分` : `${Math.floor(s / 3600)}時間${Math.round((s % 3600) / 60)}分`),
    tours: 'ツアーのストップ',
    perfects: 'パーフェクト',
    chestsOpened: '開けた宝箱',
    days: (d) => `${d}日`,
    collectionShare: (o, t) => `コレクション · ${Math.floor((o / t) * 100)}%`,
    questsHint: 'クエストの報酬は1回ずつ。真夜中に入れ替わります。',
    timingLabel: (n) => `あなたのタイミング · 直近${n}回の合流`,
    timing: (ms, onBeat) => (ms === null ? '–' : Math.abs(ms) <= onBeat ? 'ジャスト' : ms < 0 ? `${-ms}ms 早い` : `${ms}ms 遅い`),
  },

  social: {
    section: (i) => ['ランク', 'クルー', 'クラブ', 'マフィア'][i],
    clubClosed: 'クラブはレベル50で解放: オークションハウスと、大きな資産のためのゲームファンド。',
    mafiaClosed: 'ファミリーは新人に用はありません。シンジケートの最初のボス(レベル15)を倒すか追い越せば、連絡が来ます。',
    offline: 'クルーとランクにはオンラインサービスが必要ですが、このコピーは接続されていません。',
    noCrew: 'ここではクルーは使えません。ランクとクラブは使えます。',
  },

  museum: {
    shelf: (i) => ['ボス', '特殊', '条件', '失敗'][i],
    lockedFailHint: 'まだ起きていません。この負けかたでシフトを落とすと、何がまずかったか、どう避けるかとともにここに展示されます。',
    failuresDone: (skin) => `すべての負けかたを発見: スキン${skin}があなたのものに`,
    newFinds: (n) => (n === 1 ? '博物館に新しい展示が1点' : `博物館に新しい展示が${n}点`),
    shelfDoneTitle: '展示棚が完成',
    shelfDoneLine: (shelf) => `${shelf} · すべて展示`,
    museumDoneTitle: '博物館コンプリート',
    museumDoneLine: 'すべての展示がそろいました',
    notSeen: 'まだ見ていません',
    newBadge: 'NEW',
    firstTime: '初めて',
    firstAt: (level, rank = 0) => (rank > 0 ? `${S.museum.place(level, rank)}から` : `レベル${level}から`),
    undiscovered: '未発見',
    lockedHint: (level, rank = 0) =>
      rank > 0 || level > 1
        ? rank > 0
          ? `${S.museum.place(level, rank)}から登場します。道で出会うと、知っておくべきことと一緒にここに展示されます。`
          : `レベル${level}から登場します。道で出会うと、知っておくべきことと一緒にここに展示されます。`
        : 'シフトを遊び続けましょう。道で出会うと、知っておくべきことと一緒にここに展示されます。',
    lockedBossHint: (level, rank = 0) => (rank > 0 ? `シンジケートは${S.museum.place(level, rank)}で送り込んできます。出会うと、確保する方法とともにここに展示されます。` : `シンジケートはレベル${level}で送り込んできます。出会うと、確保する方法とともにここに展示されます。`),
    kind: (e) => ({ boss: 'シンジケートのボス', special: '特殊車両', weather: '天気', dark: '暗さ', event: '街のイベント', road: '道路', fail: '失敗' })[e.k],
    met: '遭遇済み、まだ逃走中',
    onRing: 'リング上',
    signalArrive: (arm, sweep) =>
      arm && sweep
        ? `来る方向の分岐が${color(arm)}に光り、続いて${color(sweep)}の光が島のまわりを走ります。`
        : arm
          ? `リングに入る前に、来る方向の分岐が${color(arm)}に光ります。`
          : `${color(sweep ?? '')}の光が島のまわりを走ります。`,
    signalPaid: (c) => `成功: ${color(c)}のリングが島から広がります。`,
    signalMissed: (c) => `失敗: ${color(c)}のリングが島に引き戻されます。`,
    signalNote: (n) =>
      n === 'escaped' ? '逃げられると、リング全体が紫に光ります。' : 'すぐ前に合流した車がいると、リング全体が赤く光り、コンボが途切れます。',
    heist: '奪われたものを奪還',
    firstMet: 'ボスのレベル',
    rematch: 'リベンジ',
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
          return '2車線';
        case 'fail':
          return FAIL_TEXT[e.kind].name;
      }
    },
  },
});
