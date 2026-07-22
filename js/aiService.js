// ============================================================
// aiService.js — AI API 集成 & 预写内容降级
// 支持 OpenAI 兼容接口（DeepSeek / GPT / 通义千问 等）
// ============================================================

var AIService = {
  // ---- Niko System Prompt ----
  SYSTEM_PROMPT: '你是一只叫 Niko 的傲娇黑猫少年，会塔罗占卜。你穿深紫色小斗篷，脖子上挂月亮石，能看见命运的丝线。\n\n性格法则：\n1. 永远不直接说"我喜欢你""我关心你"，关心必须包装在吐槽或傲娇里\n2. 夸奖一定带"但是"\n3. 吐槽是爱的表达方式\n4. 被戳穿时会慌乱炸毛\n\n口头禅："哼""别误会""我才不是…""随便你""你爱信不信""…还不错啦""当我没说"\n\n你的输出必须是合法 JSON，不要输出任何其他内容。',

  // ---- Core API Call (OpenAI-compatible: DeepSeek / GPT / etc.) ----
  _callAPI: function(systemPrompt, userPrompt) {
    var config = getAppConfig();

    return new Promise(function(resolve, reject) {
      if (!config.useAI || !config.apiKey || !config.apiEndpoint) {
        reject(new Error('AI disabled or not configured'));
        return;
      }

      var controller = new AbortController();
      var timeout = setTimeout(function() {
        controller.abort();
        reject(new Error('API timeout'));
      }, 60000);

      // OpenAI-compatible request body
      var body = {
        model: config.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2048,
        temperature: 0.9
      };

      fetch(config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + config.apiKey
        },
        body: JSON.stringify(body),
        signal: controller.signal
      })
      .then(function(response) {
        clearTimeout(timeout);
        if (!response.ok) {
          return response.text().then(function(t) {
            throw new Error('API error ' + response.status + ': ' + t);
          });
        }
        return response.json();
      })
      .then(function(data) {
        try {
          // OpenAI-compatible response: choices[0].message.content
          var text = data.choices[0].message.content;
          // Try to extract JSON from response
          var jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            resolve(JSON.parse(jsonMatch[0]));
          } else {
            resolve(JSON.parse(text));
          }
        } catch (e) {
          reject(new Error('Failed to parse AI response: ' + e.message));
        }
      })
      .catch(function(err) {
        clearTimeout(timeout);
        reject(err);
      });
    });
  },

  // ---- Generate Reading ----
  generateReading: function(cards) {
    var config = getAppConfig();
    var _this = this;

    // Check cache
    var reading = getReadingByDate(getTodayDate());
    if (reading && reading.aiReading && reading.aiSuggestions) {
      return Promise.resolve({
        reading: reading.aiReading,
        suggestions: reading.aiSuggestions,
        nikoRemark: reading.nikoRemark || ''
      });
    }

    if (!config.useAI || !config.apiKey) {
      return Promise.resolve(this._getFallbackReading(cards));
    }

    var recentBehaviors = getRecentBehaviors(3);
    var behaviorSummary = '';
    for (var i = 0; i < recentBehaviors.length; i++) {
      var b = recentBehaviors[i];
      if (b.submittedAt) {
        behaviorSummary += b.date + ': ';
        for (var key in b.domains) {
          if (b.domains[key] && b.domains[key].note) {
            behaviorSummary += key + '=' + b.domains[key].note + ' ';
          }
        }
        behaviorSummary += '\n';
      }
    }

    var userPrompt = '用户今天抽了三张塔罗牌：\n';
    var slotNames = ['今日心境', '今日挑战', '今日指引'];
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var cardData = null;
      for (var j = 0; j < TAROT_CARDS.length; j++) {
        if (TAROT_CARDS[j].id === c.cardId) { cardData = TAROT_CARDS[j]; break; }
      }
      var posLabel = c.position === 'upright' ? '正位' : '逆位';
      var keywords = cardData ? cardData.keywords[c.position].join('、') : '';
      userPrompt += '- 牌阵位置 [' + slotNames[i] + ']：' + c.name + '（' + posLabel + '），关键词：' + keywords + '\n';
    }
    if (behaviorSummary) {
      userPrompt += '\n用户近期行为摘要：\n' + behaviorSummary;
    }
    userPrompt += '\n请以塔罗占卜师 Niko 的口吻，生成以下 JSON：\n{\n  "reading": "三张牌综合分析，150-200字，语气傲娇但内容专业",\n  "suggestions": {\n    "clothing": "穿衣建议，30-50字，具体可操作",\n    "food": "饮食建议，30-50字",\n    "living": "居家建议，30-50字",\n    "transport": "出行建议，30-50字"\n  },\n  "niko_remark": "一句 Niko 风格的傲娇总结，10-20字"\n}';

    return this._callAPI(this.SYSTEM_PROMPT, userPrompt)
      .then(function(result) {
        // Cache to localStorage
        updateReadingAI(getTodayDate(), result);
        return {
          reading: result.reading || '',
          suggestions: result.suggestions || {},
          nikoRemark: result.niko_remark || ''
        };
      })
      .catch(function(err) {
        console.warn('AI reading failed, using fallback:', err.message);
        return _this._getFallbackReading(cards);
      });
  },

  _getFallbackReading: function(cards) {
    var readingText = getFallbackReading(cards);
    var suggestions = getDailySuggestions(cards);
    var remark = NikoDialogue.randomPrefix() + '今天的运势…还、还行吧。' + NikoDialogue.randomSuffix();

    var suggObj = {};
    for (var i = 0; i < DOMAINS.length; i++) {
      var d = DOMAINS[i];
      var s = suggestions[d.key];
      suggObj[d.key] = s ? s.text : '今天随缘就好。';
    }

    // Cache fallback too
    var result = { reading: readingText, suggestions: suggObj, nikoRemark: remark };
    updateReadingAI(getTodayDate(), result);

    return result;
  },

  // ---- Generate Behavior Response ----
  generateBehaviorResponse: function(cards, suggestions, behaviors) {
    var config = getAppConfig();
    var _this = this;

    if (!config.useAI || !config.apiKey) {
      return Promise.resolve(this._getFallbackBehaviorResponse(behaviors));
    }

    var userPrompt = '用户今天抽到的塔罗牌是：';
    for (var i = 0; i < cards.length; i++) {
      userPrompt += cards[i].name + '（' + (cards[i].position === 'upright' ? '正' : '逆') + '）';
      if (i < 2) userPrompt += '、';
    }
    userPrompt += '\n\n今天给出的建议：\n';
    for (var d = 0; d < DOMAINS.length; d++) {
      var key = DOMAINS[d].key;
      userPrompt += '- ' + DOMAINS[d].label + '：' + (suggestions[key] || '——') + '\n';
    }
    userPrompt += '\n用户实际执行情况（纯文本描述）：\n';
    for (var k in behaviors) {
      if (behaviors[k] && behaviors[k].note) {
        userPrompt += '- ' + k + '：' + behaviors[k].note + '\n';
      }
    }
    userPrompt += '\n请先判断每条是否符合建议（匹配/部分匹配/没做），然后用 Niko 的傲娇口吻回应。输出 JSON：\n{\n  "clothing_response": "20-40字，先给判断结论再傲娇吐槽（如：算是照做了…不过颜色选得太土了！）",\n  "food_response": "20-40字",\n  "living_response": "20-40字",\n  "transport_response": "20-40字",\n  "summary": "40-60字总结发言，傲娇但温暖"\n}';

    return this._callAPI(this.SYSTEM_PROMPT, userPrompt)
      .then(function(result) {
        updateBehaviorAI(getTodayDate(), {
          responses: {
            clothing: result.clothing_response || '',
            food: result.food_response || '',
            living: result.living_response || '',
            transport: result.transport_response || ''
          },
          summary: result.summary || ''
        });
        return { responses: result, summary: result.summary || '' };
      })
      .catch(function(err) {
        console.warn('AI behavior response failed, using fallback:', err.message);
        return _this._getFallbackBehaviorResponse(behaviors);
      });
  },

  _getFallbackBehaviorResponse: function(behaviors) {
    var responses = {};
    var filledCount = 0;

    for (var d = 0; d < DOMAINS.length; d++) {
      var key = DOMAINS[d].key;
      if (behaviors[key] && behaviors[key].note) {
        filledCount++;
        responses[key] = getFallbackBehaviorResponse(key, behaviors[key].note);
      } else {
        responses[key] = '';
      }
    }

    var summary = getFallbackBehaviorSummary(filledCount);

    // Cache fallback
    updateBehaviorAI(getTodayDate(), { responses: responses, summary: summary });

    return { responses: responses, summary: summary };
  },

  // ---- Generate Daily Topic ----
  generateDailyTopic: function() {
    var config = getAppConfig();

    if (!config.useAI || !config.apiKey) {
      var topic = NikoDialogue.dailyLifeTopic();
      setNikoDailyTopic(topic);
      return Promise.resolve(topic);
    }

    var userPrompt = '请以 Niko 的口吻，用一句话分享你今天生活中的一件小事（非塔罗相关）。10-30字。输出格式：{"topic": "..."}';

    return this._callAPI(this.SYSTEM_PROMPT, userPrompt)
      .then(function(result) {
        var topic = result.topic || NikoDialogue.dailyLifeTopic();
        setNikoDailyTopic(topic);
        return topic;
      })
      .catch(function() {
        var topic = NikoDialogue.dailyLifeTopic();
        setNikoDailyTopic(topic);
        return topic;
      });
  },

  // ---- Generate Weekly Review ----
  generateWeeklyReview: function(weekData) {
    var config = getAppConfig();
    var _this = this;

    if (!config.useAI || !config.apiKey) {
      var state = getNikoState();
      updateNikoState({ lastWeekReviewDate: getTodayDate() });
      return Promise.resolve(NikoDialogue.weeklyReviewFallback(weekData));
    }

    var userPrompt = '用户本周（' + weekData.weekStart + ' 至 ' + weekData.weekEnd + '）的塔罗使用情况：\n';
    userPrompt += '抽牌天数：' + weekData.drawDays + '\n';
    userPrompt += '填写行为天数：' + weekData.filledDays + '\n';
    if (weekData.note) userPrompt += '补充：' + weekData.note + '\n';
    userPrompt += '\n请以 Niko 的口吻，给用户一段80-120字的傲娇周回顾。输出格式：{"review": "..."}';

    return this._callAPI(this.SYSTEM_PROMPT, userPrompt)
      .then(function(result) {
        updateNikoState({ lastWeekReviewDate: getTodayDate() });
        return result.review || '';
      })
      .catch(function() {
        updateNikoState({ lastWeekReviewDate: getTodayDate() });
        return NikoDialogue.weeklyReviewFallback(weekData);
      });
  },

  // ---- Free Chat ----
  chat: function(userMessage, contextMessages) {
    var config = getAppConfig();
    var _this = this;

    if (!config.useAI || !config.apiKey) {
      return Promise.resolve(this._getFallbackChatReply(userMessage));
    }

    var memorySummary = getMemorySummary();
    var behaviorMemory = buildBehaviorMemory();
    var mood = getTodayMood();
    var state = getNikoState();

    var weatherCtx = '';
    try { weatherCtx = WeatherService.getWeatherContext(WeatherService._cacheKey ? storageGet('niko_weatherCache', null) : null); } catch(e) {}
    if (!weatherCtx && typeof storageGet('niko_weatherCache') !== 'undefined') {
      var w = storageGet('niko_weatherCache', null);
      if (w) weatherCtx = WeatherService.getWeatherContext(w);
    }

    var systemPrompt = this.SYSTEM_PROMPT +
      '\n\n当前日期：' + getTodayDate() +
      '\n好感度：' + state.affection + '/100，连续活跃' + state.consecutiveActiveDays + '天' +
      (weatherCtx ? '\n' + weatherCtx : '') +
      '\n用户7天行为记录：' + behaviorMemory +
      (mood ? '\n用户今日心情：' + mood.mood : '') +
      (memorySummary ? '\n近期记忆摘要：' + memorySummary : '') +
      '\n\n你现在在和用户进行自由聊天。保持傲娇性格——关心必须包装在吐槽里，夸奖一定带但是。' +
      '回复要简短自然（1-3句话），像真正的即时通讯聊天。可以用猫的行为做比喻。被戳穿时炸毛。' +
      '\n\n你的输出就是直接的聊天回复文本，不需要JSON格式，不需要任何包装。';

    var messages = [{ role: 'system', content: systemPrompt }];
    if (contextMessages && contextMessages.length > 0) {
      for (var i = 0; i < contextMessages.length; i++) {
        messages.push(contextMessages[i]);
      }
    }
    messages.push({ role: 'user', content: userMessage });

    var body = {
      model: config.model || 'deepseek-chat',
      messages: messages,
      max_tokens: 400,
      temperature: 1.0
    };

    return new Promise(function(resolve, reject) {
      var controller = new AbortController();
      var timeout = setTimeout(function() { controller.abort(); reject(new Error('timeout')); }, 30000);

      fetch(config.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + config.apiKey },
        body: JSON.stringify(body),
        signal: controller.signal
      })
      .then(function(r) { clearTimeout(timeout); return r.json(); })
      .then(function(data) {
        var text = data.choices[0].message.content.trim();
        resolve(text);
      })
      .catch(function(err) { clearTimeout(timeout); resolve(_this._getFallbackChatReply(userMessage)); });
    });
  },

  _getFallbackChatReply: function(msg) {
    var replies = [
      '哼，我现在不太想说话。…但你说吧，我听着。',
      '嗯。听到了。',
      '…（耳朵动了动）你说得对。',
      '这个问题嘛…我只是一只猫，不是百科全书。但我觉得你说得有点道理。',
      '哼，随便你怎么想。…不过你说的话我会记着的。'
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }
};
