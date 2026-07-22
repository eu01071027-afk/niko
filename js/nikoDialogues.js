// ============================================================
// nikoDialogues.js — Niko 对话模板 & 回应引擎 & AI Fallback
// ============================================================

// ---- 傲娇前缀池 ----
var TSUNDERE_PREFIXES = [
  '哼…',
  '诶？',
  '你居然…',
  '我才没有等着看呢…',
  '别误会…',
  '随便你…',
  '…什么嘛。',
  '喂。',
  '我说你啊…',
  '…算了。'
];

// ---- 傲娇后缀池 ----
var TSUNDERE_SUFFIXES = [
  '…不过这样也挺好的。',
  '…反正我只是随便说说。',
  '…你开心就行。',
  '…明天可不许这样了。',
  '…还、还不错啦。',
  '…我才没有在夸你。',
  '…别得意哦。',
  '…听到了没？',
  '…当我没说。',
  '…这是为你好，笨蛋。'
];

// ---- 首次启动 ----
var FIRST_TIME_GREETINGS = [
  '…哦？来了个新面孔。\n我叫 Niko。如你所见，是一只会塔罗占卜的黑猫。\n不知道为什么，命运让我来这里陪你…\n别误会！这不是我自己选的。只是命运的安排而已。\n…总之，以后每天我都会帮你看看运势。你爱信不信。',
  '…哼，又多了一个需要照顾的人类。\n我是 Niko，会塔罗占卜的黑猫。\n别问为什么我会说话，这不是重点。\n重点是——从今天起，我每天都会帮你抽三张牌看看运势。\n…当然，我才不是关心你。只是尽一只占卜猫的本分罢了。'
];

// ---- 每日问候（未抽牌） ----
var DAILY_GREETINGS = [
  '哼，今天也来了啊…挺准时的嘛。我才没有在等你。',
  '早。什么？我没有在窗边看你来的方向！…只是刚好看向那边。',
  '哦，来了。今天看起来精神不错…我只是随口一说，别得意。',
  '你终于来了。牌都快不耐烦了。…好吧，是我有点想开始今天的占卜了。只是一点点。',
  '嗯哼，又到了每天帮你看看运势的时间…我不是在期待，只是习惯了。'
];

// ---- 催促抽牌 ----
var DRAW_PROMPTS = [
  '还不抽牌？在等什么…难道在等我催你？',
  '快选三张。牌都要睡着了。',
  '今天的感觉…有点特别。快抽牌，别让我等。',
  '来，从牌堆里选三张。…选错了也别怪我，反正都是命运的安排。'
];

// ---- 选牌进行中 ----
var SELECTING_LINES = [
  '第一张…嗯，有意思。继续。',
  '第二张…哦？看来今天不太一般。',
  '最后一张…来吧，看看命运给你准备了什么。'
];

// ---- 翻牌引导 ----
var REVEAL_LINES = [
  { slot: 0, text: '第一张牌——这是你今天内心的样子。' },
  { slot: 1, text: '第二张牌…嗯，今天可能会遇到这个。' },
  { slot: 2, text: '最后一张——宇宙给你的提示。好好记住了。' }
];

// ---- 同一日再次访问 ----
var REVISIT_LINES = [
  '你怎么又来了…算了，今天的运势还没变。想再看一遍就看吧。',
  '今天的牌已经抽过了哦。…不过我可以陪你再看看。',
  '又来了？今天的运势还没过期呢…好吧，再看一眼也行。'
];

// ---- 昨日未填 ----
var YESTERDAY_UNFILLED = [
  '昨天一个字都没写！算了，反正今天又是新的一天…',
  '哼，昨天你完全没理我。…不过没关系，我也没有在等。今天要补上哦。',
  '昨天你是不是忘记什么了？…算了，反正我也不是很重要。…开玩笑的，今天的运势要看吗？'
];

// ---- 行为记录提示 ----
var BEHAVIOR_INTRO = [
  '哼，告诉我你今天都干了什么…我才不是想知道呢。只是牌让我跟进一下而已。',
  '来吧，一项一项填。诚实一点，反正你骗不过一只猫的。',
  '填吧。你做了什么、没做什么，我都想知道。…不对！是牌想知道，不是我。'
];

var BEHAVIOR_REEDIT_INTRO = [
  '你又来了…修改就修改吧。我才不是为了看你的新答案才让你改的。',
  '改什么改…好吧，给你一次机会。认真填哦。',
  '又有想要补充的？…哼，我就知道你会回来。'
];

// ---- 全部填完总结 ----
var COMPLETION_SUMMARIES = [
  '今天全都填了…哼，挺诚实的。明天继续保持，听到了没？',
  '居然一项不落…你是不是有什么企图？…开玩笑的。今天辛苦了。',
  '全部填完才不是合格的标准…不过，你做得很好。…晚安。',
  '哼，居然真的每一条都认真填了…我才没有感动。只是觉得你这个人还挺有意思的。'
];

// ---- 好感度里程碑 ----
var AFFECTION_MILESTONES = {
  7: '你居然连续一周都来了…我才没有高兴！…不过，谢谢你。',
  30: '一个月了…你知道猫的寿命很短吧？所以…多来看看我。…笨蛋。',
  100: '…………你真的很奇怪。明明只是一只猫的胡言乱语，你却一直在听。…（靠近）…没什么！走开啦！'
};

// ---- 戳穿 Niko ----
var EXPOSED_REACTIONS = [
  '什——！才、才没有！我只是…那个…你少自作多情了！！（炸毛）',
  '哈？！我关心你？开什么玩笑！…我只是…职责所在…（耳朵抖）',
  '——你、你在说什么啊！完全没有这回事！（扭头）…不过…哼。'
];

// ---- Niko 日常话题池 ----
var NIKO_DAILY_TOPICS = [
  '今天窗台来了一只鸟，差点打起来…不过我放它走了。它不知道这是谁的地盘。',
  '早上晒了一会儿月亮石，感觉今天的占卜会特别准。…跟你想不想听没关系。',
  '昨晚上做了个奇怪的梦，梦见你在追一只蝴蝶…你到底有多闲啊。',
  '隔壁的橘猫又来串门了。它太吵了，我把它赶走了。…不过留了点猫粮给它。',
  '今天的月亮石比平时亮一点…可能是你来了的原因。别想多，我随口说的。',
  '刚刚打了个盹，梦见了一些关于你的碎片…不过我不告诉你内容。',
  '前两天下雨，斗篷湿了，今天才晾干。…我才不是因为等你才急着晾的。',
  '早上有个人类路过，看了我一眼…我瞪回去了。除了你之外的人类擅自看我，我不喜欢。',
  '今天的猫薄荷特别香…我只是闻了一下。没有打滚。真的没有。',
  '抓到一只小飞蛾，又放走了。…干嘛？猫也会偶尔心软的。',
  '把塔罗牌重新数了一遍，二十二张都在。…这个动作每天都要做，不然心里不踏实。',
  '昨晚月亮特别大，我在窗台坐了好久。…不是失眠，是在思考命运的丝线。',
  '今天梳了三次毛，斗篷也掸干净了。…不是因为你来了才收拾的。',
  '发现了一个新的晒太阳的位置…不告诉你。那是我的秘密。',
  '刚才不小心把一张牌碰到地上了——愚者。看来今天会有新手来…哦，你已经来了。',
  '胡须今天特别敏感，感觉会有好事发生。或者坏事。…塔罗牌会告诉我们的。',
  '藏了三颗猫粮在房间的角落，自己都忘了一颗在哪。…找到了就是你的。',
  '今天的水特别清甜。…是月亮石泡过的。我只给自己泡的，不想分享。…好吧，可以给你一杯。',
  '上午一直有只蝴蝶在窗外飞…可能是谁的灵魂来看看你。没事，是善意的。',
  '最近的星空特别清晰，命运之丝在夜空中格外明显。…不过跟你说了你也不懂。'
];

// ---- Niko 加载用语（AI 等待时） ----
var LOADING_PHRASES = [
  '让我看看命运的丝线…（闭眼冥想中）',
  '嗯…这次的牌有点深奥…再给我一点时间…',
  '牌的讯息正在流动…别催，好汤要慢炖。',
  '我在和牌沟通…什么？你说牌又不会说话？你也不会说猫语，但这不妨碍你在我面前唠叨。',
  '星空的回应有点慢…不过快了…',
  '命运的丝线缠了一下…解开了。马上就好。'
];

// ---- 图鉴收集里程碑 ----
function getCollectionMilestoneText(count) {
  if (count === 22) return '你…居然把二十二张都收集齐了。这意味着我已经没有任何秘密可以对你隐瞒了。…笨蛋，你以为我会说这种话吗！…不过，确实都齐了。谢谢你。';
  if (count >= 18) return '还差几张就齐了…我不是在鼓励你，只是陈述事实。';
  if (count >= 14) return '收集过半了…看来你不是三分钟热度。…嗯，还不错。';
  if (count >= 8) return '不知不觉收集了不少…我才没有在帮你数。';
  if (count >= 4) return '刚开始收集呢…慢慢来，反正我哪儿也不去。';
  return '';
}

// ---- 每周回顾模板 ----
function getWeeklyReviewFallback(weekSummary) {
  var filledDays = weekSummary.filledDays || 0;
  var totalDays = weekSummary.totalDays || 7;
  if (filledDays >= 6) return '这一周你几乎每天都在…我很忙的，你知道吗？…不过看在你这么认真的份上，下周也来吧。';
  if (filledDays >= 4) return '这周表现还行…不能说好，但也不能说差。下周能不能更好一点？…不是我想看。';
  if (filledDays >= 2) return '这周有好几天没来…不过来了的日子都挺认真的。下周可别偷懒。';
  return '这周你几乎没怎么来…算了，下周重新开始吧。我又不是一直在等。';
}

// ============================================================
// AI Fallback: 预写解读内容
// 当 config.useAI = false 或 API 调用失败时使用
// ============================================================

function getFallbackReading(cards) {
  var c0 = cards[0], c1 = cards[1], c2 = cards[2];
  var p0 = c0.position === 'upright' ? '正位' : '逆位';
  var p1 = c1.position === 'upright' ? '正位' : '逆位';
  var p2 = c2.position === 'upright' ? '正位' : '逆位';

  return '哼，让我看看这三张牌…「' + c0.name + '」' + p0 + '落在心境位，说明你今天内心' +
    (c0.position === 'upright' ? '正处在一个积极的状态' : '可能有些不安和犹豫') +
    '。而「' + c1.name + '」' + p1 + '是你的今日挑战，' +
    (c1.position === 'upright' ? '这是个好兆头，意味着你会遇到一个需要你用智慧应对的课题' : '今天可能会有些棘手的事，不过以你的能力应该能搞定') +
    '。最后的指引牌是「' + c2.name + '」' + p2 + '，宇宙在告诉你：' +
    (c2.position === 'upright' ? '顺着直觉走就对了，不要想太多' : '停下来重新审视一下，有时候绕路比直行更快') +
    '。总之今天运势不算差…不过也别太得意。命运的丝线永远在变化中。';
}

function getFallbackSuggestions(cards) {
  var suggestions = getDailySuggestions(cards);
  return suggestions;
}

function getFallbackBehaviorResponse(domainKey, note) {
  var domain = null;
  for (var i = 0; i < DOMAINS.length; i++) {
    if (DOMAINS[i].key === domainKey) { domain = DOMAINS[i]; break; }
  }
  if (!domain) return '…嗯。';

  if (!note || note.trim() === '') {
    return '「' + domain.label + '」什么都没写…哼，我本来也没指望你会认真填。';
  }

  var responses = [
    '"' + note.slice(0, 15) + '…"——哼，还算有点内容。不过跟我的建议有没有关系就不知道了。',
    '哦？写了这么多…我才没有仔细看。具体做了什么只有你自己知道。',
    '嗯…看到了。反正你写什么我都不会说"做得好"的。…这次算还行吧。',
    '原来如此。跟我的建议比嘛…哼，你自己心里清楚。'
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

function getFallbackBehaviorSummary(filledCount) {
  if (filledCount >= 4) {
    var idx = Math.floor(Math.random() * COMPLETION_SUMMARIES.length);
    return COMPLETION_SUMMARIES[idx];
  }
  if (filledCount >= 2) {
    return '填了' + filledCount + '项…还行吧。下次全填完，听到没？';
  }
  return '就填了一项…算了，总比什么都不写强。明天继续。';
}

// ============================================================
// NikoDialogue API
// ============================================================

var NikoDialogue = {
  firstTimeGreeting: function() {
    return FIRST_TIME_GREETINGS[Math.floor(Math.random() * FIRST_TIME_GREETINGS.length)];
  },

  dailyGreeting: function() {
    return DAILY_GREETINGS[Math.floor(Math.random() * DAILY_GREETINGS.length)];
  },

  revisitGreeting: function() {
    return REVISIT_LINES[Math.floor(Math.random() * REVISIT_LINES.length)];
  },

  yesterdayUnfilledGreeting: function() {
    return YESTERDAY_UNFILLED[Math.floor(Math.random() * YESTERDAY_UNFILLED.length)];
  },

  drawPrompt: function() {
    return DRAW_PROMPTS[Math.floor(Math.random() * DRAW_PROMPTS.length)];
  },

  selectingLine: function(selectedCount) {
    if (selectedCount <= SELECTING_LINES.length) {
      return SELECTING_LINES[selectedCount - 1];
    }
    return '第' + selectedCount + '张…嗯…命运的丝线在动。';
  },

  revealLine: function(slot) {
    for (var i = 0; i < REVEAL_LINES.length; i++) {
      if (REVEAL_LINES[i].slot === slot) return REVEAL_LINES[i].text;
    }
    return '来看看第' + (slot + 1) + '张牌…';
  },

  behaviorIntro: function() {
    return BEHAVIOR_INTRO[Math.floor(Math.random() * BEHAVIOR_INTRO.length)];
  },

  behaviorReeditIntro: function() {
    return BEHAVIOR_REEDIT_INTRO[Math.floor(Math.random() * BEHAVIOR_REEDIT_INTRO.length)];
  },

  behaviorResponse: function(domain, note) {
    return getFallbackBehaviorResponse(domain, note);
  },

  completionSummary: function() {
    return COMPLETION_SUMMARIES[Math.floor(Math.random() * COMPLETION_SUMMARIES.length)];
  },

  dailyLifeTopic: function() {
    return NIKO_DAILY_TOPICS[Math.floor(Math.random() * NIKO_DAILY_TOPICS.length)];
  },

  loadingPhrase: function() {
    return LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)];
  },

  collectionMilestone: function(count) {
    return getCollectionMilestoneText(count);
  },

  weeklyReviewFallback: function(weekSummary) {
    return getWeeklyReviewFallback(weekSummary);
  },

  checkAffectionMilestone: function(totalDraws) {
    var keys = Object.keys(AFFECTION_MILESTONES).map(Number).sort(function(a, b) { return a - b; });
    for (var i = 0; i < keys.length; i++) {
      if (totalDraws === keys[i]) {
        return AFFECTION_MILESTONES[keys[i]];
      }
    }
    return null;
  },

  exposedReaction: function() {
    return EXPOSED_REACTIONS[Math.floor(Math.random() * EXPOSED_REACTIONS.length)];
  },

  randomPrefix: function() {
    return TSUNDERE_PREFIXES[Math.floor(Math.random() * TSUNDERE_PREFIXES.length)];
  },

  randomSuffix: function() {
    return TSUNDERE_SUFFIXES[Math.floor(Math.random() * TSUNDERE_SUFFIXES.length)];
  },

  getNikoMood: function() {
    var state = getNikoState();
    var cd = state.consecutiveActiveDays;
    if (cd >= 30) return 'soft';
    if (cd >= 7)  return 'happy';
    if (cd === 0) return 'grumpy';
    return 'default';
  },

  getNikoEmoji: function() {
    var mood = this.getNikoMood();
    var emojis = {
      default: '😼',
      happy: '😸',
      grumpy: '😾',
      soft: '😽'
    };
    return emojis[mood] || '😼';
  }
};
