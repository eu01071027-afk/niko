// ============================================================
// tarotEngine.js — 抽牌引擎 & 扇形计算 & 解读匹配
// ============================================================

/**
 * 从 22 张大阿卡纳中随机抽取 3 张（不重复），每张独立决定正逆位
 * 正位概率 60%，逆位概率 40%
 */
function drawThreeCards() {
  var indices = [];
  for (var i = 0; i < 22; i++) indices.push(i);

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
      number: card.number,
      name: card.name,
      nameEn: card.nameEn,
      position: isUpright ? 'upright' : 'reversed',
      slot: slot
    });
  }
  return drawn;
}

/**
 * 获取单张牌的完整解读数据
 */
function getCardInterpretation(cardId, position) {
  for (var i = 0; i < TAROT_CARDS.length; i++) {
    if (TAROT_CARDS[i].id === cardId) {
      return {
        card: TAROT_CARDS[i],
        interpretation: TAROT_CARDS[i].interpretations[position],
        keywords: TAROT_CARDS[i].keywords[position],
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
 * 计算 22 张牌在扇形中的 transform 值
 * 总跨度 63°，步长 3°，中间牌角度 0°
 * 返回数组：每张牌的 { angle, translateY, zIndex }
 */
function calculateFanDeckPositions() {
  var totalCards = 22;
  var totalSpan = 63; // degrees
  var step = totalSpan / (totalCards - 1); // ~3°
  var startAngle = -totalSpan / 2; // -31.5°

  var positions = [];
  for (var i = 0; i < totalCards; i++) {
    var angle = startAngle + step * i;
    // The further from center, the more it drops
    var translateY = Math.abs(angle) * 2.8;
    // Center cards on top
    var centerDist = Math.abs(i - 10.5);
    var zIndex = Math.round(22 - centerDist);

    positions.push({
      angle: Math.round(angle * 10) / 10,
      translateY: Math.round(translateY),
      zIndex: zIndex
    });
  }
  return positions;
}

/**
 * 打乱 22 张牌的显示顺序（让每次的扇形牌堆看起来不同）
 * 返回 0-21 的新顺序数组
 */
function shuffleDeckOrder() {
  var order = [];
  for (var i = 0; i < 22; i++) order.push(i);
  for (var i = order.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  return order;
}
