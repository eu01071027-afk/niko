// ============================================================
// tarotEngine.js — 抽牌引擎 & 扇形计算 & 解读匹配
// ============================================================

/**
 * 从 78 张牌中随机抽取 3 张（不重复），每张独立决定正逆位
 * 正位概率 60%，逆位概率 40%
 */
function drawThreeCards() {
  var total = TAROT_CARDS.length; // 78
  var indices = [];
  for (var i = 0; i < total; i++) indices.push(i);

  // Fisher-Yates shuffle
  for (var i = indices.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = indices[i];
    indices[i] = indices[j];
    indices[j] = tmp;
  }

  var drawn = [];
  for (var slot = 0; slot < 3; slot++) {
    var cardIndex = indices[slot];
    var card = TAROT_CARDS[cardIndex];
    var isUpright = Math.random() < 0.6;
    drawn.push({
      cardId: card.id,
      name: card.name,
      nameEn: card.nameEn,
      number: card.number || null,
      position: isUpright ? 'upright' : 'reversed',
      slot: slot
    });
  }
  return drawn;
}

// Suit-based domain suggestion templates for minor arcana
var SUIT_DOMAIN_TEMPLATES = {
  wands: {
    clothing: { upright: ["穿亮色或红色系，今天适合大胆的风格","戴一件醒目配饰，让自信外露","穿运动休闲风，行动力就是你的时尚"], reversed: ["别穿太张扬，低调一点的搭配反而更稳","避免过于鲜艳的颜色，柔和过渡更适合今天"] },
    food: { upright: ["试试新的菜系或餐厅，冒险精神从味蕾开始","辛辣或热腾腾的食物能点燃你的能量","自己动手做一顿创意料理"], reversed: ["别吃太辣太刺激的，胃口需要温和对待","别冲动尝试不熟悉的食物，稳妥一点"] },
    living: { upright: ["把精力投入一个新项目或爱好，今天行动力超强","收拾一下工作区域，整洁的环境能提升效率","勇敢迈出一直犹豫的那一步"], reversed: ["先别急着开始新项目，把手头的事收尾","今天不适合大动干戈，小的整理就够了"] },
    transport: { upright: ["骑自行车或快走，用身体的速度感受活力","换一条更有挑战性的路线，今天适合冒险","出门前先设一个小目标，路上完成它"], reversed: ["别赶时间，今天慢一点反而更顺","绕开拥堵路段，换条清静的路走"] }
  },
  cups: {
    clothing: { upright: ["穿柔软舒适的面料，蓝紫色或粉色系帮你保持温柔","选一件有情感意义的配饰，今天需要情绪联结","穿让你感到被包裹的衣服，给自己安全感"], reversed: ["别穿得太过感性，加一点利落的线条平衡情绪","避免过于宽松的造型，今天需要一点结构感"] },
    food: { upright: ["吃一顿能唤起美好回忆的食物，情绪需要被滋养","约喜欢的人一起吃饭，分享是最温暖的味道","喝热汤或花草茶，温暖从胃蔓延到心"], reversed: ["别用食物来填补情绪，问问自己真正需要什么","避免过甜的安慰食物，清爽的反而让心情更好"] },
    living: { upright: ["给自己一段安静时光，写日记或听听音乐","给房间添一点温馨的装饰，让空间滋养情感","联系一个许久未见的朋友，情感联结带来好运"], reversed: ["别沉溺在情绪里出不来，做点小事转移注意力","如果有心事，今天适合找人聊聊而不是闷着"] },
    transport: { upright: ["去一个对你有纪念意义的地方走走","沿着水边走——河边、湖边、海边，水的能量能疗愈","跟朋友一起出行，有人陪伴的路更温暖"], reversed: ["如果不想出门就别勉强，今天适合在舒适区待着","避开人多嘈杂的地方，安静的小路更适合你"] }
  },
  swords: {
    clothing: { upright: ["穿剪裁利落的款式，蓝灰色或白色帮你保持清醒","简洁大方的搭配，今天不需要多余的装饰","穿让你感到专业和自信的衣服"], reversed: ["别穿得太严肃，加一点柔和的元素中和锋芒","避免冷色调过头，来一抹暖色打破冰冷感"] },
    food: { upright: ["吃一顿清爽简单的饭菜，让头脑保持清醒","尝试需要专注的料理方式，大脑喜欢挑战","喝绿茶或咖啡，清醒的头脑是最好的武器"], reversed: ["别边吃饭边看手机，专注吃饭本身就是修行","避免过于复杂的调味，简单才是今天的主题"] },
    living: { upright: ["处理那些需要清醒头脑的任务——账单、规划、决策","读一本需要思考的书，锻炼思维肌肉","把想法写下来，清晰来自梳理"], reversed: ["别过度思考，今天的决定可以改天的","如果你在刷太多信息，关掉屏幕休息一下"] },
    transport: { upright: ["出发前做好路线规划，效率就是今天的主题","走路时别戴耳机，让大脑有安静思考的时间","选择最快的路线，今天不需要绕路"], reversed: ["如果脑中思绪太乱，走一段长路慢慢理清","别按死板的计划走，留一点弹性给意外"] }
  },
  pentacles: {
    clothing: { upright: ["穿质感好的基本款，舒适和质感比花哨更重要","大地色系或绿色系，踏实的能量能稳住你","选一双舒服的鞋子，今天需要脚踏实地"], reversed: ["别穿得太随意，稍微打理一下外表就是对自己负责","避免过于保守的穿搭，偶尔尝试新风格也不错"] },
    food: { upright: ["吃一顿健康扎实的饭，照顾身体是最实在的投资","自己买菜做饭，和食物的源头产生联结","选一家品质稳定的餐厅，今天不需要冒险"], reversed: ["别为了省钱而凑合，好好吃饭是对自己的基本尊重","避免过于油腻的外卖，身体需要真正的营养"] },
    living: { upright: ["整理财务或处理长期拖延的杂务，今天是执行日","学一项实用技能，投资自己是回报率最高的","整理家里的物品，断舍离带来新能量"], reversed: ["别太执着于物质，今天心灵也需要被照顾","如果一直埋头工作，今天该奖励自己休息一下"] },
    transport: { upright: ["走一条最熟悉的路，今天稳比快更重要","去公园或自然环境中走走，接接地气","把通勤变成一种仪式，享受每天的固定节奏"], reversed: ["别为了省小钱浪费太多时间，方便比省钱重要","如果老路走不通，今天可以试试新的通勤方式"] }
  }
};

// 花色传统含义
var SUIT_MEANINGS = {
  wands: "权杖牌组代表火元素，关联行动、热情、事业和创造力。权杖的能量是向外爆发的——它推动你采取行动、追逐目标、展现自信。",
  cups: "圣杯牌组代表水元素，关联情感、直觉、关系和内在世界。圣杯的能量是向内流动的——它引导你感受情绪、联结他人、倾听内心的声音。",
  swords: "宝剑牌组代表风元素，关联思维、沟通、冲突和真理。宝剑的能量是锐利和清晰的——它帮助你分析问题、做出决策、面对真相。",
  pentacles: "星币牌组代表土元素，关联物质、健康、工作和现实。星币的能量是稳定和实际的——它提醒你关注身体的健康、财务的安全和脚踏实地的努力。"
};

// 小阿卡纳数字含义
var RANK_MEANINGS = {
  ace: { upright: "王牌代表该元素最纯粹的能量——一个新的开始、一股原始的力量正在涌入你的生活。这是种子被播下的时刻，充满无限可能。", reversed: "机会就在眼前但你可能没有看到或拒绝了它。牌的原始能量被阻塞——需要你去清除障碍，让这股力量重新流动起来。" },
  "02": { upright: "数字二代表二元性和抉择。你正站在交叉路口，两个方向各有道理。牌提醒你：要做出选择，同时也要找到两种力量之间的平衡点。", reversed: "你正在犹豫不决，在两个选择之间反复摇摆。这种状态持续下去只会消耗你的能量。有时候没有完美的选择，选一个走下去比原地踏步好。" },
  "03": { upright: "数字三代表初步的成果和扩展。种子已经发芽，你开始看到努力的形状。这也是合作和分享的阶段——你的想法正在被更多人看到和支持。", reversed: "初步的尝试遇到了阻力，或者你的努力还没有到收获的时候。不要放弃——只是需要更多的时间和调整。" },
  "04": { upright: "数字四代表稳定和根基。事情正在沉淀下来，你找到了一个安全的立足点。这是建立秩序和巩固成果的时刻。享受这份安稳，但不要停止生长。", reversed: "稳定变成了停滞，或者你的安全感建立在不够牢固的基础上。可能过于保守而错过了机会。牌的提醒是：安稳是好的，但僵硬会让你脆弱。" },
  "05": { upright: "数字五代表冲突、挑战和动荡。秩序被打破，你需要面对混乱和竞争。但五也是一个转折点——穿过冲突之后，新的可能性正在等待。", reversed: "你正在回避冲突或者被冲突消耗得过多了。牌的信号是：要么迎战，要么退一步——站在中间被两边拉扯是最痛苦的状态。" },
  "06": { upright: "数字六代表和谐、恢复和分享。经历了前面的动荡后，平衡正在重新建立。这也是慷慨和感恩的阶段——你收到的和给予的正在达到一个美好的平衡。", reversed: "和谐被打破，或者有人在这场交换中占了你便宜。牌的提醒是：检查你给予和接受的比例——是不是在单方面付出？" },
  "07": { upright: "数字七代表反思和评估。你已经有了一些成果，现在需要停下来看看什么有效、什么需要调整。这也是坚持自己立场的时刻——你的成果值得被捍卫。", reversed: "你对自己的成果过于焦虑，或者过早放弃了该坚持的东西。牌的指引是：相信你的积累，不要因为暂时的波动而动摇。" },
  "08": { upright: "数字八代表行动、进步和技能的精进。事情正在加速，你的努力进入了产出阶段。这也是学习和提升的时期——重复带来精通。", reversed: "进展受阻，或者你在用错误的方式重复同样的事。牌的警惕是：忙碌不等于有效，方向比速度重要。" },
  "09": { upright: "数字九代表接近完成和最后的坚持。你已经走了很远的路，现在需要最后一股力气来跨过终点线。这也是独立和自足的阶段——你已经拥有足够多的东西。", reversed: "你在最后一刻感到精疲力竭，或者过于固守已经拥有的东西而不敢迈出最后一步。牌的陪伴是：你已经很接近了，再撑一下就到了。" },
  "10": { upright: "数字十代表完成和圆满。一个完整的循环结束了，你到达了某个重要的节点。这也是承担责任的时刻——你的成就带来了相应的重量，但这是甜蜜的负担。", reversed: "圆满的一环缺了一块，或者你在承受超过自己能力的负担。牌的提醒是：完成了就放下，不需要把所有的重量都扛在肩上。" },
  page: { upright: "侍从是每个牌组中最年轻的角色，代表学习的开始、新消息的到来和一颗好奇的心。你正站在某个领域的起点，带着热情和一点点天真。这是探索的阶段——享受学习的过程，不要急于成为大师。", reversed: "学习遇到了瓶颈，或者你的热情被现实撞了一下。牌的鼓励是：犯错是学习的一部分，不要因为挫折就放弃探索。也可能意味着你需要更认真的态度而不是三分钟热度。" },
  knight: { upright: "骑士是行动的执行者，代表速度、追求和冲锋。你已经掌握了基本技能，现在想要用它去追逐目标。骑士的能量是勇往直前的——但记住，最快的路不一定是最好的路。", reversed: "冲得太快而看不清方向，或者你的追求变成了一种强迫。牌的警示是：放慢一点，检查你正在追逐的东西是否真的值得。也可能意味着某个计划正在延迟。" },
  queen: { upright: "皇后是每个牌组中成熟的内在力量——她代表了该元素的阴性能量。她不是用蛮力，而是用智慧、耐心和同理心去影响事物。皇后牌告诉你：用内在的力量去引导，而非外在的手段去强迫。你是这个领域的守护者。", reversed: "内在的力量被忽视或扭曲了。你可能在过度照顾他人而忘了自己，或者相反——变得冷漠而失去同理心。牌的呼唤是：找回内心的平衡，先照顾自己才能照顾他人。" },
  king: { upright: "国王是每个牌组的权威和掌控者——他完全掌握了该元素的能量并善用它。国王牌代表成熟、领导力和责任感。你已经不是初学者了——现在是你站出来引领和掌控局面的时刻。运用你积累的智慧和经验做出判断。", reversed: "权威被滥用或掌控变成了压迫。你可能对某件事过于独断而忽略了其他人的声音——或者你正被某个专横的人所压制。牌的提醒是：真正的领导力不在于命令，而在于启发。" }
};

function getMinorDetailedMeaning(card, position) {
  var suitDesc = SUIT_MEANINGS[card.suit] || '';
  var rankInfo = RANK_MEANINGS[card.rank];
  if (!rankInfo) return '';
  var rankDesc = rankInfo[position] || rankInfo.upright;
  var keywords = card.keywords[position];
  return card.name + '。' + suitDesc + ' ' + rankDesc + ' 关键词：' + keywords.join('、') + '。';
}

/**
 * 为小阿卡纳生成领域解读和详细牌意
 */
function generateMinorInterpretation(card, position) {
  var template = SUIT_DOMAIN_TEMPLATES[card.suit];
  if (!template) return null;

  var keywords = card.keywords[position];
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  var interp = {
    general: getMinorDetailedMeaning(card, position),
    clothing: pick(template.clothing[position]),
    food: pick(template.food[position]),
    living: pick(template.living[position]),
    transport: pick(template.transport[position])
  };

  return interp;
}

/**
 * 获取单张牌的完整解读数据
 */
function getCardInterpretation(cardId, position) {
  for (var i = 0; i < TAROT_CARDS.length; i++) {
    if (TAROT_CARDS[i].id === cardId) {
      var card = TAROT_CARDS[i];
      var interpretation;

      // Major arcana have pre-written domain suggestions
      if (card.interpretations) {
        interpretation = card.interpretations[position];
      } else {
        // Minor arcana use generated interpretations
        interpretation = generateMinorInterpretation(card, position);
      }

      // Get detailed traditional meaning
      var detailedMeaning = '';
      if (card.interpretations) {
        // Major arcana: use MAJOR_DETAILED_MEANINGS
        if (typeof MAJOR_DETAILED_MEANINGS !== 'undefined' && MAJOR_DETAILED_MEANINGS[cardId]) {
          detailedMeaning = MAJOR_DETAILED_MEANINGS[cardId][position] || interpretation.general;
        } else {
          detailedMeaning = interpretation.general;
        }
      } else {
        // Minor arcana
        detailedMeaning = getMinorDetailedMeaning(card, position);
      }

      return {
        card: card,
        interpretation: interpretation,
        detailedMeaning: detailedMeaning,
        keywords: card.keywords[position],
        position: position,
        imagePath: 'images/tarot/' + cardId + '.jpg'
      };
    }
  }
  return null;
}

/**
 * 为三张牌获取综合领域建议
 * 优先级：牌③（指引）> 牌②（挑战）> 牌①（心境）
 */
function getDailySuggestions(drawnCards) {
  var suggestions = {};
  var domainKeys = ['clothing', 'food', 'living', 'transport'];

  for (var d = 0; d < domainKeys.length; d++) {
    var key = domainKeys[d];
    // Priority: slot 2 > slot 1 > slot 0
    for (var s = 2; s >= 0; s--) {
      var drawn = drawnCards[s];
      var interp = getCardInterpretation(drawn.cardId, drawn.position);
      if (interp && interp.interpretation && interp.interpretation[key]) {
        suggestions[key] = {
          text: interp.interpretation[key],
          icon: DOMAINS[d].icon,
          label: DOMAINS[d].label,
          sourceCard: interp.card.name,
          sourcePosition: drawn.position
        };
        break;
      }
    }
  }

  return suggestions;
}

/**
 * 获取已解锁的塔罗牌列表（用于图鉴）
 */
function getCollectedCards() {
  var unlockedIds = getUnlockedCards();
  var collected = [];
  for (var i = 0; i < unlockedIds.length; i++) {
    for (var j = 0; j < TAROT_CARDS.length; j++) {
      if (TAROT_CARDS[j].id === unlockedIds[i]) {
        collected.push(TAROT_CARDS[j]);
        break;
      }
    }
  }
  return collected;
}

// ============================================================
// 扇形牌堆计算
// ============================================================

/**
 * 计算拱形布局
 * 从 78 张中随机选 17 张展示，中间最高两侧下沉
 * 返回数组：每张牌 { rotate, translateX, translateY, zIndex }
 */
function calculateFanDeckPositions() {
  var totalCards = 11;
  var cardSpacing = 92;
  var centerIdx = (totalCards - 1) / 2;
  var positions = [];

  for (var i = 0; i < totalCards; i++) {
    var offset = i - centerIdx;
    var absOff = Math.abs(offset);
    var translateX = Math.round(offset * cardSpacing);
    var rotate = Math.round(offset * 2.5 * 10) / 10;
    var translateY = Math.round(absOff * absOff * 2.8);
    var zIndex = Math.round(totalCards - absOff);

    positions.push({
      rotate: rotate,
      translateX: translateX,
      translateY: translateY,
      zIndex: zIndex
    });
  }
  return positions;
}

/**
 * 从 78 张中随机选 17 张用于展示
 */
function shuffleDeckOrder() {
  var total = TAROT_CARDS.length;
  var order = [];
  for (var i = 0; i < total; i++) order.push(i);
  for (var i = order.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  // Return only first 11 indices
  return order.slice(0, 11);
}
