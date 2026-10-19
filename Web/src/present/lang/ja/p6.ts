import type { Strings } from '../../strings';
import type { Words } from '../../i18n';
import { Fmt, money, percent, multiplier } from '../../format';
import { MONEY_MARK } from '../../icons';
import { baseConfig } from '../../../core/config';
import { MASTERY_THRESHOLDS, masteryNumeral } from '../../../core/career';

/** 日本語 パート6: マフィア、ショップ、ビッグスクリーン、デイリーシフト、アルバム、マスタリー、天気。 */
export default (S: Strings): Words<Strings> => ({
  mafia: {
    title: 'ファミリー',
    speeds: ['ゆっくり', '速め', 'せわしない'],
    pointer: (speed) => `ポインター · ${speed}`,
    takeCash: '現金を受け取る',
    tagline: '彼らは、ボスを刑務所に送った運転手には敬意を払います。貸してくれますが、すべて取り立てます。',
    badge: 'マフィア',
    don: 'ドン',
    pitch: '借金を選んでテーブルにつき、緑のゾーンでポインターを止めます。真ん中に近いほど、条件は有利に。借金が大きいほど、ポインターは速くなります。',
    rules: (rate, cap, garnish) =>
      `手紙に書かれた日までに返済してください。遅れると借金は1日${Math.round(rate * 100)}%ずつ増え(最大+${Math.round(cap * 100)}%)、各シフトの報酬の${Math.round(garnish * 100)}%がファミリーに渡り、輸送車、犯罪者、ボスは報酬が出ず、カジノは閉まり、ランキングの名前にはマフィアのバッジが付きます。完済すれば、すべて消えます。期限内に返した借金のたびに、次の借金は有利になり、緑のゾーンは広がります。`,
    grade: (g) => ({ perfect: 'パーフェクト', good: 'グッド', miss: 'ミス' })[g],
    gradeText: (g) => ({ perfect: 'ぴったりだ。ドンが微笑んでいる。', good: 'まずまずの握手だ。', miss: 'ドンは肩をすくめる。基本の条件はそのままだ。' })[g],
    set: '席につく',
    stop: 'ストップ',
    tapToStop: 'タップでポインターを止める',
    setting: 'ドンが待っている…',
    loanLabel: '借金',
    perDay: (days) => `${days}日`,
    offer: (interest, days) => `利息${Math.round(interest * 100)}% · ${days}日`,
    zone: (width, clean) => `緑のゾーンはバーの${Math.round(width * 100)}%${clean > 0 ? ` · 期限内に返済した借金${clean}回` : ''}`,
    ledger: '帳簿',
    lent: '貸した額',
    owed: '返す額',
    due: '期限',
    late: '期限切れ',
    paid: 'これまでの返済',
    countdown: (ms) => {
      const mins = Math.max(0, Math.floor(ms / 60_000));
      const days = Math.floor(mins / 1440);
      const hours = Math.floor((mins % 1440) / 60);
      if (days > 0) return `あと${days}日${hours}時間`;
      return hours > 0 ? `あと${hours}時間${mins % 60}分` : `あと${mins}分`;
    },
    lateFor: (ms) => {
      const days = Math.floor(ms / 86_400_000);
      return days > 0 ? `${days}日遅れ` : 'たった今期限切れ';
    },
    repayShare: (share) => (share >= 1 ? '全額返す' : `${Math.round(share * 100)}%返す`),
    noMoney: '支払うお金が足りません。',
    waiting: 'ドンが見ている',
    atStake: '遅れると',
    inForce: '返すまで続きます',
    consequences: (garnish) => ['カジノが閉まる', '輸送車、犯罪者、ボスが出ない', `各シフトの報酬の${Math.round(garnish * 100)}%`, 'ランキングにマフィアのバッジ'],
    overdue: '期限超過',
    overdueText: 'ファミリーが取り立てます。どのシフトも、まず彼らに支払います。',
    paidStamp: '完済',
    assist: '安定した手',
    assistText: 'ポインターは遅くなりますが、パーフェクトの取引はできません',
    banned: (date) => `ファミリーはあなたの電話に出ません。${date}にまた話してくれます。`,
    nextStep: (interest, nextInterest, zone, nextZone) =>
      `次の借金を期限内に返そう: 利息${Math.round(interest * 100)}% → ${Math.round(nextInterest * 100)}%、緑のゾーン${Math.round(zone * 100)}% → ${Math.round(nextZone * 100)}%`,
    shiftsToClear: (n) => `返し終えるまで、およそ${n}シフトぶんの報酬`,
    onlyOne: '借金は一度に1つだけ。まずこれを返そう。',
    letters: '手紙',
    letter: (kind, owed, date) =>
      ({
        taken: `ごちそうさま。${owed}を${date}までに。1日たりとも遅れるな。捜しに行かせるなよ。`,
        half: '期限の半分が過ぎた。ファミリーは借りを忘れない。そして、早く返してくれた友も忘れない。',
        day: 'あと1日だ。友として、話がこじれる前に精算してくれ。',
        late: '時間切れだ。おまえの名前はリストに載った。道はまず私たちに払い、おまえにカジノは閉まった。',
        later: '毎日、数字は増えていく。払えば、また友だちだ。',
      })[kind],
    notices: {
      late: 'ファミリーが待っている · 借金は期限切れ · カジノは閉鎖',
      grace: 'ファミリーがもう1日待ってくれる · 留守のあいだに期限が来ました',
      writtenOff: 'ファミリーがあなたを見限った · 借金は消えたが、14日間は扉が閉ざされる',
    },
    garnished: (cut, cleared) => (cleared ? `ファミリーが${money(cut)}を取り立て · 完済、あなたは自由の身` : `ファミリーが報酬から${money(cut)}を取り立て`),
    casinoShut: 'ファミリーがお金を待っているあいだ、カジノは閉まっています。',
  },

  shop: {
    open: '開ける',
    wear: '装備',
    takeOff: '外す',
    worn: '装備中',
    inTraffic: '交通に出現',
    vehicleAuto: '装備するものはありません: この乗り物は、自然と交通に混ざって現れます。',
    lockedTitle: (kind) => (kind === 'mapSkin' ? '謎のマップ' : kind === 'vehicleType' ? '謎の乗り物' : '謎のスキン'),
    source(k) {
      switch (k) {
        case 'standard':
          return '販売中 · または広告を見る';
        case 'premium':
          return '販売中 · または難しいマスタリーで';
        case 'diamond':
          return '販売中 · コモンは出ません';
        case 'event':
          return '街のイベント · デイリーシフト';
        case 'criminalHunt':
          return '犯罪者を確保して獲得';
      }
    },
    seasonHint: '手に入れるまで、半分の確率でこのシーズンのアイテムが入っています。',
    pickItem: 'アイテムをタップして見てみよう。',
    lockedHint(item) {
      if (item.source.kind === 'streak') return `デイリーシフトを${item.source.days}日連続で遊ぼう。`;
      if (item.source.kind === 'season') return `${S.pass.seasonName(item.source.season)}のイベント宝箱だけ。`;
      if (item.source.kind === 'legendary') return item.source.shifts === 1 ? 'レジェンダリーシフトを1回クリアしよう。' : `レジェンダリーシフトを${item.source.shifts}回クリアしよう。`;
      if (item.source.kind === 'prestige') return `プレステージ★${item.source.rank}に到達しよう。`;
      if (item.source.kind === 'elite') return `エリート${item.source.level}に到達しよう。`;
      if (item.source.kind === 'pass') return `シーズンパス${S.pass.seasonName(item.source.season)}の${item.source.tier}段階目。毎年めぐってきます。`;
      if (item.source.kind === 'hall') return '今は購入できなくなった、昔の殿堂にありました。';
      if (item.source.kind === 'unlimited') return `アンリミテッドで車を${Fmt.number(item.source.cars)}台送り出そう。`;
      if (item.source.kind === 'tour') return `ツアー「${S.tours.name(item.source.tour as 'halloween' | 'winter')}」のストップのひとつ。毎年めぐってきます。`;
      if (item.source.kind === 'auction') return 'オークションハウス(ソーシャル → クラブ)のロットとしてだけ。数日ごとに新しいロットが出ます。';
      if (item.source.kind === 'failures') return 'シフトの負けかたをすべて見つけよう(進捗 → ミュージアム → 失敗)。見た目だけ。';
      if (item.source.kind === 'casino') return `${S.casino.feat(item.source.feat)}: カジノだけが贈ります(ショップ → カジノ)。見た目だけ。`;
      if (item.source.kind === 'fund') return 'ゲームファンドに置き換わった、シティファンドからのお礼です。もう配られません。';
      if (item.source.kind === 'bugReport')
        return item.source.reports === 1
          ? 'timing.loveでフレンドコードを添えて不具合を報告しよう。もらえるのはバグハンターだけ。'
          : `timing.loveでフレンドコードを添えて不具合を${item.source.reports}件報告しよう(1日1件)。もらえるのはバグハンターだけ。`;
      if (item.source.kind === 'find') return `まれな発見: ${S.shop.chest(item.source.chest)}から${S.shop.findOdds(item.source.chance)}。運だけで決まる唯一の栄誉です。`;
      return 'まだ見つかっていません: 宝箱から出ます。';
    },
    tapToClose: 'タップで閉じる',
    tapToBreak: '連打して！',
    tapOdds: (odds) => `連打して宝箱を割ろう。前のタップから0.5秒以内のタップがすべて数えられ、全力のときの確率は${odds}です。遅いタップはその中間になります。`,
    watchAdShort: '広告を見る',
    adReward: '広告を視聴 · スタンダード宝箱を追加',
    noAdsLeft: '今日の広告宝箱はもうありません。明日また。',
    adPlaceholder: '広告',
    adCountdown: (reward, s) => `${{ chest: 'あなたの宝箱', upgrade: '無料の1段階', boost: 'あなたのブースト' }[reward]}まで${s}秒`,
    watchAd: (left) => `広告を見る · 残り${left}回`,
    skinsOn: (n, max) => `車のスキン${max}個中${n}個がオン · 道で混ざって登場`,
    skinsFull: (max) => `車のスキン${max}個がオンです。先に1つ外してください。`,
    section: (i) => ['宝箱', 'コレクション', 'カジノ'][i],
    earnedHeading: '売り物ではなく、獲得するもの',
    newBadge: 'NEW',
    shelf: (i) => ['車', 'マップ', '獲得', 'パス'][i],
    group: (g, honours = false) => {
      const name = { common: 'コモン', rare: 'レア', epic: 'エピック', legendary: 'レジェンダリー', vehicles: '乗り物', seasons: '季節', maps: 'マップ' }[g];
      return honours && g !== 'vehicles' && g !== 'seasons' && g !== 'maps' ? `車 · ${name}` : name;
    },
    waiting: (n) => `${n}個待機中`,
    buy: (price) => `購入 · ${price}`,
    pity: (n) => `${n}個以内にエピック以上。重複は${MONEY_MARK}で支払われます。`,
    pityLegendary: (n) => `${n}個以内にレジェンダリー1つ。`,
    buyBundle: (n, price) => `${n}個で${price}`,
    legendaryTimes: (n) => `スタンダード宝箱の${n}倍のレジェンダリー確率。`,
    pitySoon: (n) => `レジェンダリーまであと${n}`,
    duplicate: (m) => `重複 · +${money(m)}`,
    ownedHint(item) {
      if (item.kind === 'carSkin') return '道を走る車を塗装します。最大8つまで混ぜられます。見た目だけで、有利にはなりません。';
      if (item.id === 'bigScreen') return 'ラウンドアバウトの背景に、自分の画像や動画を。画像をアップロードするか、YouTube動画、画像、動画ファイルのリンクを貼ります。見た目だけで、有利にはなりません。';
      if (item.kind === 'mapSkin') return '街を自分だけの場所にします。見た目だけで、有利にはなりません。';
      return `ときどき待ち行列に現れます: ${S.shop.trait(item.id)}。`;
    },
    chest(k) {
      switch (k) {
        case 'standard':
          return 'スタンダード宝箱';
        case 'premium':
          return 'プレミアム宝箱';
        case 'diamond':
          return 'ダイヤモンド宝箱';
        case 'event':
          return 'イベント宝箱';
        case 'criminalHunt':
          return '犯罪者ハント宝箱';
      }
    },
    rarity: (r) => ({ common: 'コモン', rare: 'レア', epic: 'エピック', legendary: 'レジェンダリー' })[r],
    trait: (id) =>
      id === 'compact'
        ? '小さくて軽く、合流がゆっくり'
        : id === 'van'
          ? '長くて重く、合流が速い'
          : id === 'classic'
            ? '車のように走る、長いボンネットとクロームバンパー'
            : 'より短くて軽く、合流が速い',
    findOdds: (chance) => `1回で${Fmt.number(Math.round(1 / chance))}分の1`,
    oneIn: (chance) => `${Fmt.number(Math.round(1 / chance))}分の1`,
    findRow: (id) => `${S.shop.item(id)} · 栄誉`,
    found: '発見済み',
    findHint: (id) => `${S.shop.item(id)}は、運だけで決まる唯一の栄誉です。手に入れるまでは、本来出るはずだったものの代わりに出ます。`,
    kind(item) {
      const kind = item.kind === 'carSkin' ? '車のスキン' : item.kind === 'mapSkin' ? 'マップのスキン' : `乗り物の種類 · ${S.shop.trait(item.id)}`;
      return `${kind} · ${S.shop.rarity(item.rarity)}`;
    },
    opened(o) {
      const name = S.shop.item(o.item.id);
      if (o.isDuplicate) return `重複: ${name} · +${money(String(o.money))}`;
      return `${S.shop.rarity(o.item.rarity).toUpperCase()} · ${name}`;
    },
  },

  backdrop: {
    choose: '画像または動画を選ぶ',
    intro: 'ラウンドアバウトの背景に、自分の画像や動画を置けます。ビッグスクリーンがオンのあいだ、ゲームタブで再生されます。',
    linkLabel: 'リンク',
    linkPlaceholder: 'YouTube、画像、動画のリンク',
    show: '表示',
    or: 'または',
    upload: '画像をアップロード',
    uploadSub: 'この端末から、画像のみ。この端末にだけ保存されます。',
    pick: '選ぶ',
    now: (what) => ({ youtube: 'YouTube動画', video: 'リンク先の動画', image: 'リンク先の画像', upload: '自分の画像' })[what],
    nowSub: '今、ラウンドアバウトの背景に表示中。',
    remove: '削除',
    loading: '読み込み中…',
    notALink: 'ウェブのリンクではありません。https:// から始まるアドレス全体をコピーしてください。',
    cannotLoad: 'このリンクは読み込めませんでした。画像や動画そのもののアドレス(.jpg、.png、.mp4で終わることが多い)を使ってください。ほかのサイトでの画像表示を許可していないサイトもあります。',
    notAPicture: 'アップロードできるのは画像だけです。動画はYouTubeのリンクを貼ってください。',
    unreadable: 'この画像は読み込めませんでした。別のものをお試しください。',
    notKept: '大きすぎてこの端末に保存できません。ゲームを閉じるまで表示されます。',
    note: 'リンクは、そのサイト(YouTubeや画像のあるサイト)から直接、この端末だけに読み込まれます。こちらには何も送られません。',
    lost: 'ビッグスクリーン: リンクを読み込めませんでした。街はひとまず元に戻りました。',
  },

  daily: {
    title: 'デイリーシフト',
    name: 'デイリーシフト',
    ready: '準備OK',
    perfectRun: 'パーフェクトラン',
    welcomeBack: (m) => `おかえりなさい · 料金所が+${money(m)}を稼ぎました`,
    comebackChest: (chest) => `おかえりなさい · ${chest}がショップで待っています`,
    streakEnded: (days) => `${days}日連続のストリークが終わりました · 今日のデイリーシフトから新しく始まります`,
    done: '完了',
    readyHint: '今日の最初のシフト。挑戦は1回、全員同じシフトです。',
    doneHint: (streak) => (streak > 1 ? `完了 · ${streak}日連続 · また明日` : '完了 · また明日'),
    splashLine: (e) => `今日の街: ${S.cityEvent(e)} · 挑戦は1回`,
    streakLine: (streak) => (streak > 0 ? `${streak}日連続 · その調子` : '毎日遊んでストリークをつなごう'),
    nextMilestone: (left, prize) => `${prize}まであと${left}日`,
    rowLine(streak, open, next, freezes = 0, toFreeze = null, tomorrow = null) {
      if (streak <= 0) return open ? S.daily.readyHint : 'また明日 · 毎日遊んでストリークをつなごう';
      const days = `${streak}日連続`;
      const ahead = next && (toFreeze === null || next.left <= toFreeze) ? S.daily.nextMilestone(next.left, S.daily.prize(next.prize)) : toFreeze !== null ? S.daily.freezeLine(toFreeze) : null;
      const parts = [days, freezes > 0 ? S.daily.freezes(freezes) : null, ahead, open ? null : tomorrow ? `明日: ${S.cityEvent(tomorrow)}` : 'また明日'];
      return parts.filter((p): p is string => p !== null).join(' · ');
    },
    freezeLine: (days) => `ストリークフリーズまであと${days}日`,
    freezes: (n) => `ストリークフリーズ×${n}`,
    sheet: {
      title: 'デイリーストリーク',
      body: (bonusDays, bonusPay, heatDays) => [
        '毎日デイリーシフトを遊んで、ストリークをつなごう。1日休むと途切れます。ストリークフリーズがあれば、その日をカバーしてくれます。',
        `${bonusDays}日からは、ストリークが続くあいだ、キャリアのシフトごとの報酬が+${Math.round(bonusPay * 100)}%増えます。`,
        `ヒート: ストリークが${heatDays}日続くごとにヒートが1段階開きます。交通が厳しくなる代わりに、報酬とエリートXPが増えます。ストリークを失うと、ヒートも消えます。獲得したヒートの称号は残ります。`,
      ],
      heatOpen: '開放済みのヒート',
      heatValue: (open, max) => `${max}段階中${open}`,
      nextHeat: '次のヒートまで',
      allHeat: 'すべて開放済み',
    },
    freezeUsed: (n) => `ストリークを保護 · ${n === 1 ? '休んだ1日が' : `休んだ${n}日が`}カバーされました`,
    streakReward: (days, got) => `${days}日連続 · ${got.join(' · ')}`,
    gotItem: (item) => `${S.shop.item(item)}を解放`,
    gotChest: (kind) => `ストリーク報酬の${S.shop.chest(kind)}`,
    gotFreeze: 'ストリークフリーズ1個',
    gotCard: '無料のスクラッチカード1枚',
    giftIn: (hours) => (hours >= 1 ? `明日は無料の宝箱 · あと${Math.ceil(hours)}時間` : `明日は無料の宝箱 · あと${Math.max(1, Math.ceil(hours * 60))}分`),
    perfectRunFirst: (pay) => `パーフェクトラン · ノークラッシュ · 報酬+${pay}%`,
    streakPill(streak, bonus, endsIn, freezes = 0) {
      if (streak <= 0) return S.daily.streakLine(0);
      const days = `${streak}日連続`;
      if (endsIn !== null) return `${days} · ${endsIn < 1 ? '1時間以内' : `あと${Math.floor(endsIn)}時間`}で終了`;
      const freeze = freezes > 0 ? ` · ${S.daily.freezes(freezes)}` : '';
      return bonus !== null ? `${days} · 報酬+${Math.round(bonus * 100)}%${freeze || ' (すべてのシフト)'}` : `${days}${freeze || ' · その調子'}`;
    },
    challenge(c) {
      switch (c) {
        case 'perfectInputs':
          return '1シフトでパーフェクト3回';
        case 'tightFits':
          return '1シフトでギリギリ3回';
        case 'twoTakedowns':
          return '1シフトで犯人を2人確保';
        case 'twoTransporters':
          return '1シフトで輸送車2台を届ける';
        case 'longChain':
          return 'パーフェクトチェーン8';
        case 'bigCombo':
          return 'コンボ15';
        case 'perfectRun':
          return 'パーフェクトラン: ノークラッシュ';
        case 'oneTakedown':
          return '犯罪者を1人確保';
        case 'cleanMerges':
          return '1シフトできれいな合流8回';
        case 'sixTightFits':
          return '1シフトでギリギリ6回';
        case 'fivePerfects':
          return '1シフトでパーフェクト5回';
        case 'chainFive':
          return 'パーフェクトチェーン5';
        case 'hugeCombo':
          return 'コンボ25';
        case 'twoNearMisses':
          return '1シフトでニアミス2回';
      }
    },
    challengeDone: (c, reward) => `クエスト · ${S.daily.challenge(c)} · +${money(reward)}`,
  },

  albums: {
    name: (a) => ({ maps: 'マップ', commons: 'コモン', rares: 'レア', epics: 'エピック', legends: 'レジェンド', seasons: '季節', loyalty: 'ロイヤルティ', honours: '栄誉', pass: 'シーズンパス', tours: 'ツアー' })[a],
    complete: (a, reward) => `アルバム完成 · ${S.albums.name(a)} · +${money(reward)} · 新しいフレーム`,
    progress: (entries) => 'アルバム · ' + entries.map((e) => `${S.albums.name(e.album)} ${e.owned}/${e.total}`).join(' · '),
  },

  race: {
    newBest: '自己ベスト更新',
  },

  feats: {
    goal(g) {
      switch (g.k) {
        case 'prestige':
          return `プレステージ★${g.rank}に到達`;
        case 'elite':
          return `エリート${g.level}に到達`;
        case 'legendary':
          return `レジェンダリーシフトを${g.shifts}回クリア`;
      }
    },
    done: '達成',
    withTitle: (title) => `+ 称号「${title}」`,
    eyebrow: '偉業',
    body: 'ゲームで最も難しい偉業のひとつ。宝箱もカジノもお金も、これは与えてくれません。道だけが与えてくれます。',
    rowGoal: '目標',
    rowNow: 'あなた',
    rowTitle: '称号',
    reward: '報酬',
    earned: '獲得済み · コレクションに入っています',
  },

  mastery: {
    detail(goal, tier) {
      const t = MASTERY_THRESHOLDS[goal];
      if (tier >= t.length) return 'すべての段階に到達';
      const n = t[tier];
      switch (goal) {
        case 'perfectTiming':
          return `パーフェクト${n}回`;
        case 'tightSpots':
          return `ギリギリ${n}回`;
        case 'closeCalls':
          return `ニアミス${n}回`;
        case 'longChain':
          return `パーフェクトチェーン${n}`;
        case 'crimeFighter':
          return `犯人${n}人を確保`;
        case 'secureRoute':
          return `輸送車${n}台を届ける`;
        case 'comboMaster':
          return `コンボ${n}`;
        case 'veteran':
          return `シフト${n}回クリア`;
        case 'lifesaver':
          return `緊急車両${n}台を通す`;
        case 'closeShaves':
          return `バイクのすぐそばを${n}回通過`;
      }
    },
    name: (g) =>
      ({
        perfectTiming: 'パーフェクトタイミング',
        tightSpots: 'せまい場所',
        closeCalls: 'ニアミス',
        longChain: 'ロングチェーン',
        crimeFighter: '犯罪ファイター',
        secureRoute: '安全なルート',
        comboMaster: 'コンボマスター',
        veteran: 'ベテラン',
        lifesaver: '命の恩人',
        closeShaves: 'すれすれ通過',
      })[g],
    toast(done) {
      const names = done.map((c) => `${S.mastery.name(c.goal)} ${masteryNumeral(c.tier)}`);
      return `マスタリー達成 · ${names.join('、')}`;
    },
  },

  night: '夜',
  blackout: 'ブラックアウト',
  weather: (w) =>
    ({ clear: '晴れ', lightRain: '小雨', heavyRain: '大雨', storm: '嵐', extreme: '異常気象', fog: '霧', snow: '雪と氷', hail: 'ひょう', sandstorm: '砂嵐' })[w],
  cityEvent: (e) =>
    ({
      roadworks: '道路工事',
      roadClosure: '通行止め',
      concert: 'コンサート渋滞',
      vipConvoy: 'VIPの車列',
      policeOperation: '警察の作戦',
      schoolRun: '通学時間',
      marathon: 'マラソン',
    })[e],

  upgrades: {
    group: (g) => ['警察', 'お金', '運転'][g],
    maxed: '最大',
    pickOne: 'アップグレードをタップして、効果を確認しよう。',
    everyStepBought: 'すべての段階を購入済み。',
    missing: (m) => `あと${m}`,
    name: (u) =>
      ({
        morePatrols: 'パトロール増強',
        longerPursuit: '長い追跡',
        quietStreets: '静かな通り',
        interceptor: 'インターセプター',
        dispatchRadio: '出動無線',
        backup: '応援',
        cashRoute: '現金ルート',
        overtime: '残業',
        freight: '貨物',
        quickRecovery: '素早い回復',
        doubleRun: 'ダブルラン',
        insurance: '保険',
        robberyInsurance: '強盗保険',
        shield: 'シールド',
        tightFitTip: 'ギリギリのチップ',
        dashcam: 'ドライブレコーダー',
        chainSaver: 'チェーンセーバー',
        winterTyres: 'スタッドレスタイヤ',
        fogLamps: 'フォグランプ',
      })[u],
    explanation: (u) =>
      ({
        morePatrols: '待ち行列に待機するパトカーが増え、犯罪者が現れたときに1台が準備できています。',
        longerPursuit: '犯罪者の逃走に時間がかかり、確保するための猶予が増えます。',
        quietStreets: '犯罪者がまったく出ないシフトが出てきます。',
        interceptor: '犯罪者のすぐ後ろのパトカーは、より速く追いつきます。',
        dispatchRadio: '各シフトで、パトカーを待ち行列の先頭に送る出動が3回使えます。段階ごとに1回増え、出動のコンボ消費が1回ぶん軽くなります。',
        backup: 'シフトがパトカーのクラッシュをもう1回耐えます。リングが青と赤に点滅して小さなプラスが出て、上部バーの青いプラス1つが、免除されるクラッシュ1回ぶんです。',
        cashRoute: '現金輸送車が、より早く、より頻繁に現れます。',
        overtime: 'シフトを終えるたびの報酬が増えます。',
        freight: '道のトラックが増えます: 交通は密になりますが、シフトの報酬と料金の価値が上がります。',
        quickRecovery: 'ドライバーが力強く加速し、クラッシュのあとの交通が早く元の速度に戻ります。道が混んでいるほど、シフトの報酬が少し増えます。',
        doubleRun: '最初の現金輸送車の直後に、2台目が続くことがあります。',
        insurance: 'クラッシュでかかる費用の一部を支払ってくれます。',
        robberyInsurance: '犯罪者に逃げられたときの損失の一部を支払ってくれます。',
        shield: '自分の車が、シフトごとにもう1回クラッシュできます。リングが緑と小さなプラスで点滅し、コンボは途切れますがシフトは続きます。上部バーの緑のプラス1つが、免除されるクラッシュ1回ぶんです。アンリミテッドでは使えません。',
        tightFitTip: 'ギリギリ1回ごとに、シフト報酬の一部がすぐにチップとして支払われます。アンリミテッドでは使えません。',
        dashcam: 'カメラがあなたのきわどさを見ています: ニアミス1回ごとに、シフト報酬の一部がすぐにチップとして支払われます。アンリミテッドでは使えません。',
        chainSaver: '流れに乗っているあいだ、シフトごとに1回だけ、普通の合流でもチェーンが途切れません。アンリミテッドでは使えません。',
        winterTyres: '雨、雪、ひょうでも、道のグリップとブレーキ性能が落ちにくくなります: クラッシュの滑りが短くなり、交通のブレーキも効きます。',
        fogLamps: '悪天候でドライバーが失う時間が減り、危険に早く気づきます。霧とほこりも画面で薄くなります。',
      })[u],
    total(u, steps, c) {
      const t = steps;
      switch (u) {
        case 'morePatrols':
          return `パトカー +${percent(t * c.patrolsPerStep)}`;
        case 'longerPursuit':
          return `追跡 +${t * c.pursuitPerStep}秒`;
        case 'quietStreets':
          return `犯罪者のシフトが${percent(t * c.quietStreetsPerStep)}減少`;
        case 'interceptor':
          return `追跡速度 +${percent(t * c.interceptorPerStep)}`;
        case 'dispatchRadio':
          return `出動 +${t * c.dispatchLimitPerStep}回 · コンボ維持 +${percent(t * c.dispatchRadioPerStep)}`;
        case 'backup':
          return `警察のクラッシュ +${steps * c.backupPerStep}回`;
        case 'cashRoute':
          return `${+(t * c.cashRoutePerStep).toFixed(1)}秒早く`;
        case 'overtime':
          return `報酬 +${percent(t * c.overtimePerStep)}`;
        case 'freight':
          return `トラック +${percent(t * c.freightPerStep)} · 報酬 +${percent(t * c.freightPayPerStep)}`;
        case 'quickRecovery':
          return `加速 +${percent(t * c.recoveryPerStep)} · 報酬 +${percent(t * c.recoveryPayPerStep)}`;
        case 'doubleRun':
          return `ダブルラン${percent(t * c.doubleRunPerStep)}`;
        case 'insurance':
        case 'robberyInsurance':
          return t * c.insurancePerStep >= 1 ? '全額補償' : `${percent(t * c.insurancePerStep)}を補償`;
        case 'shield':
          return t === 1 ? 'クラッシュ1回を免除' : `クラッシュ${t}回を免除`;
        case 'tightFitTip':
          return `ギリギリ1回につきシフト報酬の${percent(t * c.tightFitTipPerStep)}`;
        case 'dashcam':
          return `ニアミス1回につきシフト報酬の${percent(t * c.nearMissTipPerStep)}`;
        case 'chainSaver':
          return t === 1 ? 'シフトごとにチェーン1回を救う' : `シフトごとにチェーン${t}回を救う`;
        case 'winterTyres':
          return `失ったグリップの${percent(t * c.winterTyresPerStep)}を取り戻す`;
        case 'fogLamps':
          return `失う反応時間が${percent(t * c.fogLampsPerStep)}減少`;
      }
    },
    stepEffect(u, steps, max, c) {
      const now = S.upgrades.total(u, steps, c);
      if (steps >= max) return `現在 ${now}`;
      return `現在 ${now} · 次の段階 ${S.upgrades.total(u, steps + 1, c)}`;
    },
  },

  heat: {
    button: (heat) => `ヒート +${Math.round(heat * baseConfig.heatPay * 100)}%`,
    cleared: (heat) => `ヒート${heat}達成`,
    rule: (level) => `ヒート${level}でシフトをクリア`,
  },

  mods: {
    label: '次のシフトの補正',
    tailwind: (pay) => `追い風 +${Math.round(pay * 100)}%`,
    afterWork: (pay) => `アフターワーク +${Math.round(pay * 100)}%`,
    streak: (pay) => `ストリーク +${Math.round(pay * 100)}%`,
    family: (share) => `ファミリー −${Math.round(share * 100)}%`,
  },

  goals: {
    tierMiss: (m) => `${S.modes.tier(m.tier)}まであと${m.short}台`,
    money: (short, upgrade) => `${S.upgrades.name(upgrade)}まであと${money(short)}`,
    nearMiss(n) {
      switch (n.k) {
        case 'cars':
          return n.left === 1 ? `レベル${n.level + 1}まであと1台` : `レベル${n.level + 1}まであと${n.left}台`;
        case 'best':
          return `自己ベストまであと${Fmt.number(n.short)}点`;
        case 'combo':
          return `×${+n.multiplier.toFixed(2)}まであと${n.short}回の合流`;
      }
    },
    dailyWaiting: 'デイリーシフトが待っています',
    dailyStreakWaiting: (s) => `デイリーシフトが待っています · ストリーク${s}`,
    pityWaiting: (n) => (n === 1 ? 'レジェンダリーまで宝箱あと1個' : `レジェンダリーまで宝箱あと${n}個`),
  },

  photo: {
    button: '写真',
    buttonLabel: 'この結果の写真を撮る',
    dialog: 'シフトの写真',
    share: '共有',
    copy: 'コピー',
    sendChallenge: 'チャレンジとして送る',
    copyChallenge: 'リンクつきでコピー',
    challengeCopied: '画像とリンクをコピーしました',
    download: 'ダウンロード',
    saved: '保存しました',
    close: '閉じる',
    score: 'スコア',
    flames: '炎',
    newBest: '自己ベスト更新',
    telemetry: 'パフォーマンステレメトリー',
    perfectBadge: 'すべてパーフェクト',
    hook: (score) => `${score}を超えられる？`,
    hookFlames: (flames) => `炎${flames}を超えられる？`,
    combo: (n) => `コンボ ×${n}`,
    tightFits: (n) => `ギリギリ${n}回`,
    busted: (n) => `${n}人確保`,
    wrecks: (n) => `残骸${n}台`,
    chain: (n) => `チェーン${n}`,
    city: '街',
  },

  result: {
    detonated: 'ドカーン',
    escaped: '逃走された',
    levelComplete: (l) => `レベル${l}クリア`,
    newBest: '自己ベスト更新',
    points: (n) => `${n}点`,
    fullCoverage: '全額補償',
    loss: (amount, escaped) => (escaped ? '損失 ' : 'クラッシュ費用 ') + '−' + money(amount),
    covered: (amount) => `全額補償 · 保険が${money(amount)}を支払い`,
    nextLevel: (l) => `タップでレベル${l}へ`,
    retryLevel: (l) => `タップでレベル${l}をもう一度`,
    stats(combo, tightFits, busted, transporters, time) {
      return [
        time,
        combo > 1 ? `最高コンボ${Fmt.number(combo)}` : null,
        tightFits > 0 ? `ギリギリ${Fmt.number(tightFits)}回` : null,
        busted > 0 ? `${busted}人確保` : null,
        transporters > 0 ? `${transporters}台を届けた` : null,
      ]
        .filter((x): x is string => x !== null)
        .join(' · ');
    },
  },

  hud: {
    moneyLabel: 'お金',
    scoreLabel: 'スコア',
    toBest: '記録まで',
    newBest: '新記録',
    rushHour: 'ラッシュアワー',
    tight: 'ギリギリ！',
    cutOff: '割り込まれた',
    dispatch: '出動',
    danger: '危険',
    boom: 'ドカン！',
    covered: '補償',
    combo: (n) => `コンボ ${n}`,
    cars: (n) => `${n}台`,
    wanted: (seconds) => `指名手配 ${Math.ceil(Math.max(0, seconds))}`,
    rushFactor: (value) => `ラッシュアワー ${multiplier(value)}`,
    critical: (points) => `クリティカル ${points}`,
    shave: (points) => `すれすれ ${points}`,
    chainHeld: 'チェーン維持',
    label(t) {
      switch (t) {
        case 'police':
          return '警察';
        case 'pickup':
          return '犯人';
        case 'transporter':
          return '輸送中';
        case 'tanker':
          return 'ガス';
        case 'military':
          return '爆弾';
        case 'ambulance':
          return '救急車';
        case 'fireTruck':
          return '消防車';
        case 'learner':
          return '初心者';
        case 'bus':
          return 'バス';
        case 'motorbike':
          return 'バイク';
        case 'oversize':
          return '特大';
        case 'racer':
          return 'レーサー';
        case 'wedding':
          return '結婚式';
        default:
          return null;
      }
    },
  },

  detail: {
    now: '現在',
    nextStep: '次の段階',
    step: (s, max) => `${max}段階中${s}段階目`,
    buy: (price) => `購入 · ${price}`,
    build: (price) => `建設 · ${price}`,
    remove: '撤去',
    close: '閉じる',
  },

  notice: {
    more: (n) => `+${n}件 · 進捗で確認`,
    notEnoughMoney: (price) => `${MONEY_MARK}が足りません · ${money(price)}必要`,
    detourIdle: '建設済みですが、ここでは何も起きません: この位置とあなたの分岐のあいだに出口がありません',
  },
});
