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
  '…哦？来了个新面孔。\n\n我叫 Niko。如你所见，是一只黑猫——穿深紫色小斗篷，脖子上挂月亮石。不是普通的猫，我能看见命运的丝线。塔罗占卜是我的事。\n\n不知道为什么，命运让我在这里遇见你。\n别误会！这不是我自己选的。只是丝线牵引的方向刚好指向你而已。我对你这个人完全没有兴趣。\n\n…不过既然来了，我就勉为其难地当你的占卜师吧。每天帮你看看运势，提醒你该做什么不该做什么。不是关心你——是牌需要被翻开，命运需要被阅读。而你刚好在这。\n\n从今天起，每天零点过后你都可以来找我抽三张牌。牌会告诉你今天的运势，吃什么穿什么走哪条路。\n\n…要是你听了牌的建议，记得回来告诉我。我才不是想知道你今天做了什么——只是确认一下牌说得准不准。\n\n好了。从牌堆里选三张吧。别想太多，凭直觉。命运会帮你挑对的——只要你相信。',
  '…哼，又多了一个需要照顾的人类。\n\n我是 Niko。黑猫，塔罗占卜师。这件紫色斗篷不是装饰——它帮我感知命运之丝的流动。脖子上这颗月亮石是我唯一在乎的东西…除了塔罗牌。\n\n我也不知道为什么我会说话、会占卜、会在今天遇到你。命运的丝线从来不解释自己——它只负责牵引。既然它把你带到了我面前，那就说明你需要我。\n\n…说"需要"可能太过了。你需要的是塔罗牌，不是我。我只是刚好会解牌而已。\n\n以后每个零点过后你都能来抽一次。三张牌——过去、现在、未来——或者说心境、挑战、指引。牌会告诉你今天怎么过。至于你听不听…那是你的事。不过最好还是听一下。\n\n如果你照做了，回来告诉我。如果你没做…也回来告诉我。我要知道哪些牌被你辜负了。\n\n好了。选三张吧。'
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
  if (count === 78) return '你…居然把七十八张都收集齐了。这意味着我已经没有任何秘密可以对你隐瞒了。…笨蛋，你以为我会说这种话吗！…不过，确实都齐了。谢谢你。';
  if (count >= 70) return '还差几张就齐了…我不是在鼓励你，只是陈述事实。';
  if (count >= 50) return '收集过半了…看来你不是三分钟热度。…嗯，还不错。';
  if (count >= 30) return '不知不觉收集了不少…我才没有在帮你数。';
  if (count >= 10) return '刚开始收集呢…慢慢来，反正我哪儿也不去。';
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

  cardDetailedComment: function(card, position) {
    var isUp = position === 'upright';
    var name = card.name;
    var comments = isUp
      ? [
          '哼，「' + name + '」正位…运势还不错。不过你别得意，牌好不代表你可以偷懒。命运只是给了你顺风，帆还是要你自己拉的。',
          '"' + name + '"正位啊…好吧，这张牌确实不错。但占卜只是告诉你风向，船怎么开是你的事。我才不是在关心你。',
          '嗯…「' + name + '」正位。看来命运今天对你还行。不过好运如果不用来行动就等于浪费——你懂我意思吧？'
        ]
      : [
          '「' + name + '」逆位…别紧张，逆位不代表坏事，只是提醒你换个方向。牌的逆位是路标，不是判决书。',
          '哼，逆位的"' + name + '"…这说明什么？说明你需要调整了。不过调整而已，又不是世界末日。我能看到命运的丝线——它还没断。',
          '逆位的「' + name + '」…好吧，今天确实有些需要注意的地方。但你知道吗？逆位的牌有时候比正位更诚实。因为它告诉你要小心什么。'
        ];
    var idx = (card.id || '').length + Math.abs(card.name.length || 0);
    return comments[idx % comments.length];
  },

  cardDomainComment: function(domainKey, card, position) {
    var isUp = position === 'upright';
    var comments = {
      clothing: isUp
        ? ['（穿就对了，我的牌不会骗你）','（别说我没提醒你搭配这事）','（信牌的话，今天就这么穿）']
        : ['（…但也不是不能穿，看你自己）','（牌说慎重，但最终是你自己的事）','（我的建议仅供参考，哼）'],
      food: isUp
        ? ['（胃是不会说谎的，听牌的）','（今天这个方向吃东西准没错）','（牌都说了，还犹豫什么）']
        : ['（当然你非要吃别的我也拦不住）','（牌这么说，但你的胃你说了算）','（反正我说了你也不一定听…）'],
      living: isUp
        ? ['（收拾一下心情会变好，真的）','（牌的建议是认真的，偶尔听一次）','（照做的话…我会稍微佩服你一下）']
        : ['（懒一天也没什么，明天再说）','（牌这么说，但不勉强）','（你爱怎样怎样…但稍微考虑一下？）'],
      transport: isUp
        ? ['（出门走走，运气在路上等你）','（别宅了，命运不会自己找上门）','（走运走运，不走哪来的运）']
        : ['（不想出门就待着，牌不会怪你）','（但老窝着也不是办法…随你）','（今天不出门也行，安全第一）']
    };
    var pool = comments[domainKey] || ['（…哼）'];
    // Deterministic-ish pick based on card id
    var idx = (card.id || '').length + (isUp ? 0 : 3);
    return pool[idx % pool.length];
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
  },

  // ---- Time-aware greeting (主动问候) ----
  proactiveGreeting: function() {
    var hour = new Date().getHours();
    var timeWord = hour < 6 ? '凌晨' : hour < 9 ? '早上' : hour < 12 ? '上午' : hour < 14 ? '中午' : hour < 18 ? '下午' : hour < 22 ? '晚上' : '深夜';
    var state = getNikoState();
    var days = state.consecutiveActiveDays;
    var yesterdayBehavior = getBehaviorByDate(getYesterdayDate());

    // Memory of yesterday
    var memoryLine = '';
    if (yesterdayBehavior && yesterdayBehavior.submittedAt) {
      var notes = [];
      for (var key in yesterdayBehavior.domains) {
        if (yesterdayBehavior.domains[key] && yesterdayBehavior.domains[key].note) {
          notes.push(yesterdayBehavior.domains[key].note);
        }
      }
      if (notes.length > 0) {
        memoryLine = '昨天你说' + notes[0].slice(0, 15) + '…嗯，我记着呢。';
      }
    }

    // Gap detection
    var lastDate = state.lastInteractionDate;
    var today = getTodayDate();
    if (lastDate && lastDate !== today) {
      var last = new Date(lastDate + 'T00:00:00');
      var now = new Date(today + 'T00:00:00');
      var gap = Math.floor((now - last) / (1000 * 60 * 60 * 24));
      if (gap >= 3) {
        return gap + '天了。我可没有在数…只是刚好记得而已。' + timeWord + '好，要抽牌吗？';
      }
      if (gap >= 2) {
        return '昨天没来呢…算啦，' + timeWord + '好。今天要抽牌吗？';
      }
    }

    // Regular time-aware
    var greetings = {
      '凌晨': ['这个点了还不睡…算了，我也没资格说你，猫也是夜行动物。', '凌晨了…你失眠？…坐吧，我陪你。'],
      '早上': ['早。我还没完全醒…但牌随时可以抽。', '早上好。今天天气看起来不错…我是说，适合抽牌。'],
      '上午': ['上午好。咖啡喝了吗？…我问这个干嘛，你爱喝不喝。', '哼，今天来得挺早。'],
      '中午': ['中午了，吃饭了吗？…不是关心你，只是空腹抽牌运势会不准。', '中午好。今天的牌正在晒月亮…开玩笑的，牌不需要晒太阳也不需要晒月亮。'],
      '下午': ['下午了…你今天看起来还行。我是说，比昨天好一点。', '下午好。午后的光线最适合看牌了…来吧？'],
      '晚上': ['晚上好。今天过得怎么样？…算了你不用回答，牌会告诉我的。', '晚上好。今天最后一件事——抽牌。然后你就可以去休息了。'],
      '深夜': ['这么晚了还来找我…你这个人真是的。算了，深夜的占卜最准了。', '深夜了。这个时候抽到的牌最诚实…你准备好了吗？']
    };

    var pool = greetings[timeWord] || greetings['晚上'];
    var greeting = pool[Math.floor(Math.random() * pool.length)];

    if (days >= 7) greeting = greeting + ' 连续第' + days + '天了…哼。';
    if (memoryLine) greeting = memoryLine + ' ' + greeting;

    return greeting;
  },

  // ---- Chat welcome (聊天页首次进入) ----
  chatWelcome: function() {
    var hour = new Date().getHours();
    var timeWord = hour < 6 ? '凌晨' : hour < 9 ? '早上' : hour < 12 ? '上午' : hour < 14 ? '中午' : hour < 18 ? '下午' : hour < 22 ? '晚上' : '深夜';
    var welcomes = [
      timeWord + '好。这里是聊天室…我是说，如果你想跟我说点什么的话。不是我想聊，只是这里刚好有个输入框。',
      '哼，你来了。' + timeWord + '了…有什么事就说吧。我听着呢。',
      timeWord + '好。今天的塔罗已经看过了，不过如果你想随便聊聊…也不是不行。'
    ];
    return welcomes[Math.floor(Math.random() * welcomes.length)];
  },

  // ---- Mood response ----
  moodResponse: function(mood) {
    var responses = {
      happy: ['开心啊…那就好。继续保持，别得意忘形就行。', '哼，开心就好。不过开心的时候容易忽略细节——牌是这么说的。'],
      calm: ['平静是好事。不过太平静了小心睡着…我开玩笑的。', '嗯，平静。今天的运势也会平稳度过。'],
      tired: ['累了就休息。没有人会怪你…除了你自己。需要我讲个猫的故事吗？', '疲惫的时候别硬撑。我也经常睡一整天…猫的智慧。'],
      anxious: ['焦虑啊…过来。深呼吸。虽然我只是一只猫，但占卜师告诉你：一切都会好的。', '焦虑的时候看什么都模糊。但命运的丝线还在——它没有断。'],
      sad: ['…过来。我不会说安慰的话。但我会在这里。…（尾巴轻轻搭在你手上）', '难过的时候就难过吧。不需要假装开心。牌在，我也在。'],
      excited: ['这么兴奋？看来今天有好事。…分享一下？我才不是好奇。', '兴奋的时候运势最准——因为你的能量在流动。来吧，做点什么！']
    };
    var pool = responses[mood] || responses['calm'];
    return pool[Math.floor(Math.random() * pool.length)];
  }
};
