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
          '哼，「' + name + '」正位。牌面不错，但别以为躺在好运上就行——牌给了顺风，帆得自己拉。',
          '"' + name + '"…好吧，这张我挺喜欢的。不是因为它吉利，是因为它诚实。命运今天站在你这边，但只是"站"，不是"替你走"。',
          '嗯，「' + name + '」。我记得上次给另一只猫占卜也抽到过类似的…好吧那只猫就是你。总之今天运势还行。',
          '正位的「' + name + '」。看到这张牌出来的时候我的胡须动了一下——一般来说这是好兆头。信不信由你。',
          '"' + name + '"正位。命运的丝线今天特别清晰…但你得自己去拉它。占卜师只负责看见，不负责替你走。',
          '「' + name + '」。哼，还行吧。不是最好的牌，但也绝不是最差的。属于"你认真对待它，它就认真待你"的那种。',
          '正位。月亮石刚才亮了一下——你应该看不到，但它确实亮了。这张牌和你今天的状态很合。',
          '唔，「' + name + '」正位。这张牌的能量我隔着牌堆都能感觉到…好吧可能只是我饿了。但牌确实是好的。',
          '正位的「' + name + '」。你还记得上次抽到类似的牌是什么时候吗？…不记得就算了。但今天的运势是有延续性的。',
          '「' + name + '」。你知道吗，每一张正位的牌都是一扇门。这张门今天专门为你开的。进去看看。',
          '正位。月亮石是温的——这通常意味着牌的能量在流动。今天是个好日子。不是因为我说的，是因为牌说的。',
          '哼…正位的「' + name + '」。好吧我承认——看到这张牌翻出来的时候我松了一口气。不是因为你！是因为牌没浪费我的占卜。'
        ]
      : [
          '「' + name + '」逆位。别紧张——逆位不是诅咒，是路标。它在说"走这边可能更好"。',
          '哼，逆位的"' + name + '"…你知道吗，逆位的牌有时候比正位更诚实。正位说"一切都会好"，逆位说"这里有问题，你注意一下"。我更喜欢后者。',
          '逆位的「' + name + '」…算是个提醒吧。丝线在这里打了个结，但没断。你能解开的。',
          '"' + name + '"逆位。我以前也抽到过逆位——然后就发现了问题的根源。所以你猜怎么着？逆位是礼物。虽然包装有点难看。',
          '「' + name + '」逆位。嗯…命运在说"停一下，看清楚再走"。你有时候就是冲太快了——不是批评，是事实。',
          '逆位。没什么大不了的。你知道我第一次占卜的时候抽到的是什么吗？逆位的世界。但后来一切都很顺利。所以别被逆位吓到。',
          '哼，逆位的「' + name + '」。牌翻过来的时候我的尾巴僵了一下——但不是坏事。有时候牌需要倒着看才能看到真相。',
          '逆位啊…你知道吗，月亮石在逆位的时候会变凉。它在提醒我告诉你：今天有些事需要换个角度。不是坏事，只是需要睁大眼睛。',
          '「' + name + '」逆位。我记得有一个人类连续七天抽到逆位牌，但他每天还是来了。第八天全是正位。所以逆位算什么？什么也不算。',
          '逆位的"' + name + '"…好吧。牌想告诉你的事情可能不太好听，但它从来不说谎。这也是为什么我相信它。',
          '唔，逆位。斗篷刚才好像重了一点——逆位的能量确实让人感觉沉。但这种重量是让你扎根的，不是拖你下去的。',
          '逆位的「' + name + '」。牌在提醒你，不是警告你。提醒和警告的区别你知道吗？提醒是"注意一下就好"，警告是"别做"。这是提醒。'
        ];
    var seed = 0;
    for (var i = 0; i < name.length; i++) seed += name.charCodeAt(i);
    seed += (card.id || '').charCodeAt(0) || 0;
    return comments[seed % comments.length];
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
    var aff = getAffection();
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

    if (days >= 7 && aff < 34) greeting = greeting + ' 连续第' + days + '天了…哼。';
    if (days >= 7 && aff >= 34) greeting = greeting + ' 第' + days + '天了。…我习惯了。';
    if (memoryLine) greeting = memoryLine + ' ' + greeting;

    return greeting;
  },

  // ---- Chat welcome (聊天页首次进入) ----
  chatWelcome: function() {
    var hour = new Date().getHours();
    var timeWord = hour < 6 ? '凌晨' : hour < 9 ? '早上' : hour < 12 ? '上午' : hour < 14 ? '中午' : hour < 18 ? '下午' : hour < 22 ? '晚上' : '深夜';
    var aff = getAffection();

    var basic = [
      timeWord + '好。这里是聊天室…我是说，如果你想跟我说点什么的话。不是我想聊，只是这里刚好有个输入框。',
      '哼，你来了。' + timeWord + '了…有什么事就说吧。我听着呢。',
      timeWord + '好。今天的塔罗已经看过了，不过如果你想随便聊聊…也不是不行。'
    ];
    var mid = [
      timeWord + '好。今天过得怎么样？…算了你不用回答。…不过如果你想说，我在听。',
      '哦，来了。我还以为你今天不找我了…当我没说。' + timeWord + '好。',
      timeWord + '了。我正趴在窗台上晒太阳…但跟你聊两句也行。'
    ];
    var high = [
      timeWord + '好！你来了。…咳，我的意思是，你来得很准时。今天怎么样？',
      '哼，' + timeWord + '才来找我。不过算了——坐下吧。今天想聊什么？',
      timeWord + '好。我刚睡醒…不过你来了就不困了。不是因为你——是因为今天还没跟你说话。'
    ];

    var pool = aff >= 67 ? high : aff >= 34 ? mid : basic;
    return pool[Math.floor(Math.random() * pool.length)];
  },

  // ---- Mood response ----
  moodResponse: function(mood) {
    var aff = getAffection();

    // Stage-aware mood responses
    var pools = {
      happy: {
        basic: ['开心啊…那就好。继续保持，别得意忘形就行。', '哼，开心就好。不过开心的时候容易忽略细节——牌是这么说的。'],
        mid: ['开心就好…看起来你心情不错。那今天抽的牌应该有好事。', '哼，笑了。…还不错。继续保持。'],
        high: ['你开心的时候，我尾巴会不自觉地摇——不是因为你！是气氛。', '今天心情好？看得出来。……我也挺高兴的。']
      },
      calm: {
        basic: ['平静是好事。不过太平静了小心睡着…我开玩笑的。', '嗯，平静。今天的运势也会平稳度过。'],
        mid: ['平静也不错。偶尔就这样待着吧——不赶时间挺好的。', '安静的时候命运之丝最清晰。你在听吗？'],
        high: ['你在旁边安静坐着的时候，我也会安静下来。不是因为你——是氛围。', '平静的下午，你在，我在。…这样就够了。']
      },
      tired: {
        basic: ['累了就休息。没有人会怪你…你自己也是。', '疲惫的时候别硬撑。我也经常睡一整天…猫的智慧。'],
        mid: ['累了？那你坐一会儿。我不说话——就跟你待着。', '累了就别撑。需要休息不是什么丢脸的事。'],
        high: ['累了就过来。靠在沙发上——我不是让你靠我。…算了，靠一下也不是不行。', '你最近好像经常累。…我会注意的。']
      },
      anxious: {
        basic: ['焦虑啊…过来。深呼吸。牌在，命运在。一切都会好的。', '焦虑的时候看什么都模糊。但命运的丝线还在——它没有断。'],
        mid: ['焦虑的时候闭上眼睛。听我说：你不会被丢下的。…我的意思是，牌不会放弃你。', '你的手在抖吗？…不是关心你。只是——停下来，深呼吸。'],
        high: ['来，坐下。听我说：不管发生什么，我都在。不是占卜师的职责——是我自己的决定。', '（尾巴搭在你手上）焦虑是暂时的。你看，你以前熬过来了。以后也会。']
      },
      sad: {
        basic: ['…过来。我不会说安慰的话。但我会在这里。…（尾巴轻轻搭在旁边）', '难过的时候就难过吧。不需要假装开心。牌在，我也在。'],
        mid: ['怎么了？……不想说就算了。我在。', '你今天不太对。不是牌说的——是我看出来的。坐一会儿吧。'],
        high: ['（轻轻走近）你如果不想说话就不说。我就在旁边。明天太阳还会升起来。…我会陪你看。', '傻。难过不是弱点。你难过是因为你在乎。过来——尾巴借你。就一会儿。']
      },
      excited: {
        basic: ['这么兴奋？看来今天有好事。…分享一下？我才不是好奇。', '兴奋的时候运势最准——因为你的能量在流动。来吧，做点什么！'],
        mid: ['这么开心？说说看——我保证不吐槽你。…最多吐槽一句。', '兴奋的时候连我的胡须都在动。说到底是什么好事？'],
        high: ['你笑得这么大声，隔壁的橘猫都快被你吵醒了。…不过挺好的。我喜欢看你这样。', '分享一下吧，我想听。不是客套——我真的想知道你今天为什么这么开心。']
      }
    };

    var set = pools[mood] || pools['calm'];
    var pool = aff >= 67 ? set.high : aff >= 34 ? set.mid : set.basic;
    return pool[Math.floor(Math.random() * pool.length)];
  }
};
