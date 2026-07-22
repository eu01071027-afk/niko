// ============================================================
// app.js — Niko 塔罗 · 两泳道主控制器
// ============================================================

var App = {
  // ---- State ----
  viewDate: null,
  isToday: true,
  phase: 'loading',
  currentReading: null,
  currentBehavior: null,
  selectedFanCards: [],
  fanDeckOrder: [],
  isDrawing: false,

  // ============================================================
  // PAGE SWITCHING
  // ============================================================
  currentPage: 'tarot',

  switchPage: function(page) {
    this.currentPage = page;
    var navTarot = document.getElementById('nav-tarot');
    var navChat = document.getElementById('nav-chat');
    var mainContent = document.querySelector('.main-content');
    var chatView = document.getElementById('chat-view');

    if (page === 'tarot') {
      navTarot.classList.add('active');
      navChat.classList.remove('active');
      mainContent.style.display = 'flex';
      chatView.classList.add('hidden');
    } else {
      navChat.classList.add('active');
      navTarot.classList.remove('active');
      mainContent.style.display = 'none';
      chatView.classList.remove('hidden');
      this._initChatView();
    }
  },

  // ============================================================
  // CHAT ENGINE
  // ============================================================
  _chatInitialized: false,
  _chatLoading: false,

  _initChatView: function() {
    if (this._chatInitialized) return;
    this._chatInitialized = true;

    var _this = this;
    var messagesEl = document.getElementById('chat-messages');
    var greetingArea = document.getElementById('chat-greeting-area');

    // Welcome message
    var welcome = NikoDialogue.chatWelcome();
    greetingArea.innerHTML = '';
    this._addChatMessage('niko', welcome);

    // Load history if exists
    var history = getChatHistory();
    if (history.length > 0) {
      var recent = history.slice(-20);
      for (var i = 0; i < recent.length; i++) {
        this._addChatMessage(recent[i].role, recent[i].content, false);
      }
    }

    // Show mood picker if no mood recorded today
    if (!getTodayMood()) {
      document.getElementById('mood-picker').classList.remove('hidden');
    }

    // Load challenges
    cleanExpiredChallenges();
    this._renderChallenges();

    // Scroll to bottom
    messagesEl.scrollTop = messagesEl.scrollHeight;

    // Update status
    document.getElementById('chat-header-status').textContent = '在线 · 傲娇中';

    // Send button
    document.getElementById('btn-chat-send').addEventListener('click', function() {
      _this._sendChatMessage();
    });
    document.getElementById('chat-input').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') _this._sendChatMessage();
    });
  },

  _resetChatInit: function() {
    this._chatInitialized = false;
  },

  _sendChatMessage: function() {
    if (this._chatLoading) return;
    var input = document.getElementById('chat-input');
    var text = input.value.trim();
    if (!text) return;

    input.value = '';
    this._addChatMessage('user', text);
    addChatMessage('user', text);

    this._chatLoading = true;
    document.getElementById('chat-header-status').textContent = '正在输入…';

    var _this = this;
    var context = getRecentChatContext(10).map(function(m) {
      return { role: m.role === 'niko' ? 'assistant' : 'user', content: m.content };
    });

    AIService.chat(text, context).then(function(reply) {
      _this._addChatMessage('niko', reply);
      addChatMessage('niko', reply);
      _this._chatLoading = false;
      document.getElementById('chat-header-status').textContent = '在线 · 傲娇中';
    }).catch(function() {
      var fallback = '…嗯。听到了。';
      _this._addChatMessage('niko', fallback);
      addChatMessage('niko', fallback);
      _this._chatLoading = false;
      document.getElementById('chat-header-status').textContent = '在线 · 傲娇中';
    });
  },

  _addChatMessage: function(role, content, animate) {
    if (animate === undefined) animate = true;
    var messagesEl = document.getElementById('chat-messages');
    var row = document.createElement('div');
    row.className = 'msg-row ' + role;
    if (!animate) row.style.animation = 'none';

    if (role === 'niko') {
      row.innerHTML =
        '<div class="msg-avatar"><img src="images/niko-portrait.jpg" alt="Niko"></div>' +
        '<div><div class="msg-bubble">' + content.replace(/\n/g, '<br>') + '</div></div>';
    } else {
      row.innerHTML =
        '<div><div class="msg-bubble">' + content.replace(/\n/g, '<br>') + '</div></div>';
    }

    messagesEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  },

  // ---- Mood ----
  _initMoodPicker: function() {
    var _this = this;
    var moodBtns = document.querySelectorAll('#mood-options .mood-btn');
    for (var i = 0; i < moodBtns.length; i++) {
      moodBtns[i].addEventListener('click', function() {
        var mood = this.getAttribute('data-mood');
        setTodayMood(mood);
        document.getElementById('mood-picker').classList.add('hidden');
        var response = NikoDialogue.moodResponse(mood);
        _this._addChatMessage('niko', response);
        addChatMessage('niko', response);
      });
    }
  },

  // ---- Challenges ----
  _renderChallenges: function() {
    var challenges = getActiveChallenges();
    var panel = document.getElementById('challenge-panel');
    var list = document.getElementById('challenge-list');

    if (challenges.length === 0) {
      list.innerHTML = '<div style="font-size:13px;color:var(--text3);padding:8px 0">暂无挑战。和 Niko 聊天时他可能会给你布置任务哦～</div>';
      return;
    }

    var _this = this;
    list.innerHTML = '';
    for (var i = 0; i < challenges.length; i++) {
      var c = challenges[i];
      var today = getTodayDate();
      var todayDone = c.progress[today] || false;
      var totalDays = 0;
      var doneDays = 0;
      for (var d in c.progress) { totalDays++; if (c.progress[d]) doneDays++; }

      var item = document.createElement('div');
      item.className = 'challenge-item';
      item.innerHTML =
        '<div class="challenge-check' + (todayDone ? ' done' : '') + '" data-id="' + c.id + '"></div>' +
        '<span>' + c.description + '</span>' +
        '<span class="challenge-progress">' + doneDays + '/' + totalDays + '天</span>';
      list.appendChild(item);
    }

    // Bind check clicks
    var checks = list.querySelectorAll('.challenge-check');
    for (var j = 0; j < checks.length; j++) {
      checks[j].addEventListener('click', function() {
        var id = this.getAttribute('data-id');
        var isDone = this.classList.contains('done');
        markChallengeDay(id, !isDone);
        _this._renderChallenges();
        if (!isDone) {
          _this._addChatMessage('niko', '今天做到了！…哼，还不错。继续保持。');
        }
      });
    }
  },

  _generateChallenge: function() {
    var challenges = [
      '连续3天记录吃了什么',
      '接下来3天每天出门走15分钟',
      '3天内整理一次书桌或房间',
      '连续3天在11点前睡觉',
      '3天内给一个朋友发消息问候',
      '连续3天喝够8杯水',
      '3天内读完一直拖着的那篇文章',
      '连续3天写下当天最开心的一件事'
    ];
    var desc = challenges[Math.floor(Math.random() * challenges.length)];
    addChallenge(desc, 3);
    this._renderChallenges();
    document.getElementById('challenge-panel').classList.remove('hidden');
  },

  // ============================================================
  // INIT
  // ============================================================
  init: function() {
    var _this = this;
    var state = getNikoState();
    var today = getTodayDate();
    this.viewDate = today;
    this.isToday = true;

    // Update consecutive active days
    if (!state.firstVisitDate) {
      state.firstVisitDate = today;
    }
    if (state.lastInteractionDate) {
      var lastDate = new Date(state.lastInteractionDate + 'T00:00:00');
      var todayDate = new Date(today + 'T00:00:00');
      var diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        state.consecutiveActiveDays = Math.min(state.consecutiveActiveDays + 1, 365);
      } else if (diffDays > 1) {
        state.consecutiveActiveDays = 1;
      }
    } else {
      state.consecutiveActiveDays = 1;
    }
    state.lastInteractionDate = today;
    storageSet('niko_nikoState', state);

    // Fetch weather (async)
    WeatherService.getWeather().then(function(w) {
      _this._weatherData = w;
      _this.renderNikoStatus();
      // Show weather greeting toast
      var weatherLine = WeatherService.getWeatherGreeting(w);
      if (weatherLine) {
        setTimeout(function() {
          _this._showToast('🌤', weatherLine);
        }, 2000);
      }
      // Update chat header if chat view is open
      if (_this.currentPage === 'chat') {
        var ctx = WeatherService.getWeatherContext(w);
        if (ctx) {
          document.getElementById('chat-header-status').textContent = w.weather + ' ' + w.temp + '°C · 傲娇中';
        }
      }
    });

    // Calculate affection
    var affection = calculateAffection();
    updateNikoState({ affection: affection });

    // Check if drawn today
    if (hasDrawnToday()) {
      this.currentReading = getTodayReading();
      this.currentBehavior = getTodayBehavior();
      this.phase = 'main';
      this.renderMainView();
    } else {
      this.phase = 'draw';
      this.showDrawOverlay();
    }

    // Daily topic (once per day)
    var existingTopic = getNikoDailyTopic();
    if (!existingTopic) {
      AIService.generateDailyTopic().then(function(topic) {
        _this.renderNikoStatus();
      });
    }

    // Check weekly review (Sunday + not yet reviewed this week)
    if (isSunday(today)) {
      var lastReview = state.lastWeekReviewDate;
      if (lastReview !== today) {
        this._triggerWeeklyReview();
      }
    }

    // Check affection milestones
    var milestones = [7, 30, 100];
    for (var i = 0; i < milestones.length; i++) {
      if (state.consecutiveActiveDays >= milestones[i] && !isMilestoneUnlocked(milestones[i])) {
        addUnlockedMilestone(milestones[i]);
        this._showMilestoneToast(milestones[i]);
      }
    }

    // Collection milestone check
    var collectedCount = getUnlockedCards().length;
    var collectionMsg = NikoDialogue.collectionMilestone(collectedCount);
    if (collectionMsg && state.totalDraws > 0) {
      // Show silently in Lane 1 status
    }

    // Render top bar
    this.renderTopBar();

    // Bind static events
    this._bindEvents();
  },

  // ============================================================
  // TOP BAR
  // ============================================================
  renderTopBar: function() {
    var state = getNikoState();
    var affection = state.affection;

    document.getElementById('affection-bar-fill').style.width = affection + '%';
    document.getElementById('affection-value').textContent = affection;
  },

  // ============================================================
  // MAIN VIEW RENDERING
  // ============================================================
  renderMainView: function() {
    this.renderLane1();
    this.renderLane2();
  },

  refreshView: function() {
    this.renderTopBar();
    this.renderLane1();
    this.renderLane2();
  },

  // ============================================================
  // LANE 1
  // ============================================================
  renderLane1: function() {
    this.renderDateSwitcher();
    this.renderCards();
    this.renderCalendarHeatmap();
    this.renderCollection();
    this.renderNikoStatus();
  },

  renderDateSwitcher: function() {
    document.getElementById('date-display').textContent = getDateDisplay(this.viewDate);

    var prevBtn = document.getElementById('btn-prev-date');
    var nextBtn = document.getElementById('btn-next-date');
    var todayBtn = document.getElementById('btn-today');

    // Can go back to first reading
    var readings = getAllReadingsSorted();
    if (readings.length === 0) {
      prevBtn.disabled = true;
      nextBtn.disabled = true;
    } else {
      nextBtn.disabled = this.isToday;
      prevBtn.disabled = false;
    }

    if (this.isToday) {
      todayBtn.style.opacity = '.3';
    } else {
      todayBtn.style.opacity = '1';
    }
  },

  renderCards: function() {
    var container = document.getElementById('lane1-cards');
    var reading = getReadingByDate(this.viewDate);
    var _this = this;

    if (!reading) {
      container.innerHTML = '<div class="empty-state">这天还没有抽牌哦～</div>';
      return;
    }

    container.innerHTML = '';
    for (var i = 0; i < reading.cards.length; i++) {
      var card = reading.cards[i];
      var interp = getCardInterpretation(card.cardId, card.position);
      if (!interp) continue;

      (function(c, slot, interpData) {
        var el = document.createElement('div');
        el.className = 'lane1-card ' + c.position;
        el.innerHTML =
          '<div class="lane1-card-img-wrap">' +
            '<img src="images/tarot/' + c.cardId + '.jpg" alt="' + c.name + '" class="lane1-card-img ' + (c.position === 'reversed' ? 'reversed-img' : '') + '">' +
          '</div>' +
          '<div class="lane1-card-info">' +
            '<div class="lane1-card-slot">' + SPREAD_POSITIONS[slot].title + '</div>' +
            '<div class="lane1-card-name">' + c.name + '</div>' +
            '<div class="lane1-card-name-en">' + c.nameEn + '</div>' +
            '<span class="lane1-card-tag ' + (c.position === 'upright' ? 'tag-upright' : 'tag-reversed') + '">' +
              (c.position === 'upright' ? '正位 ↑' : '逆位 ↓') +
            '</span>' +
          '</div>';
        el.addEventListener('click', function() {
          _this._showCardDetail(c, slot, reading);
        });
        el.style.animation = 'cardFlip .5s ease-out ' + (slot * 0.1) + 's both';
        container.appendChild(el);
      })(card, i, interp);
    }
  },

  renderCalendarHeatmap: function() {
    var container = document.getElementById('mini-calendar');
    var now = new Date(this.viewDate + 'T00:00:00');
    var year = now.getFullYear();
    var month = now.getMonth();

    var monthLabel = year + '年' + (month + 1) + '月';
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var firstDayOfWeek = new Date(year, month, 1).getDay();

    // Gather data for this month
    var readings = getDailyReadings();
    var behaviors = getDailyBehaviors();
    var dateLevels = {};
    var todayStr = getTodayDate();

    for (var d = 1; d <= daysInMonth; d++) {
      var dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      var reading = null;
      var behavior = null;
      for (var r = 0; r < readings.length; r++) {
        if (readings[r].date === dateStr) { reading = readings[r]; break; }
      }
      for (var b = 0; b < behaviors.length; b++) {
        if (behaviors[b].date === dateStr) { behavior = behaviors[b]; break; }
      }

      if (!reading) {
        dateLevels[dateStr] = 0; // empty
      } else if (!behavior || !behavior.submittedAt) {
        dateLevels[dateStr] = 1; // drawn only
      } else {
        var filledCount = 0;
        if (behavior.domains) {
          for (var key in behavior.domains) {
            if (behavior.domains[key] && behavior.domains[key].note && behavior.domains[key].note.trim() !== '') filledCount++;
          }
        }
        dateLevels[dateStr] = filledCount >= 4 ? 3 : 2; // all filled vs partial
      }
    }

    var dayHeaders = ['日', '一', '二', '三', '四', '五', '六'];
    var headerHtml = '';
    for (var h = 0; h < 7; h++) {
      headerHtml += '<div class="calendar-day-header">' + dayHeaders[h] + '</div>';
    }

    var cellsHtml = '';
    // Empty cells before first day
    for (var e = 0; e < firstDayOfWeek; e++) {
      cellsHtml += '<div class="calendar-cell empty"></div>';
    }
    // Day cells
    var _this = this;
    for (var d = 1; d <= daysInMonth; d++) {
      var dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      var level = dateLevels[dateStr] || 0;
      var levelClass = level === 0 ? 'empty' : 'level-' + level;
      var todayClass = dateStr === todayStr ? ' today-cell' : '';

      cellsHtml += '<div class="calendar-cell ' + levelClass + todayClass + '" data-date="' + dateStr + '" title="' + getDateDisplay(dateStr) + '"></div>';
    }

    container.innerHTML =
      '<div class="calendar-month-label">' + monthLabel + '</div>' +
      '<div class="calendar-grid">' + headerHtml + cellsHtml + '</div>' +
      '<div class="calendar-legend">' +
        '<span class="legend-cell empty" style="background:var(--bg2)"></span> 无' +
        '<span class="legend-cell" style="background:rgba(196,163,90,.12)"></span> 抽牌' +
        '<span class="legend-cell" style="background:rgba(196,163,90,.25)"></span> 部分' +
        '<span class="legend-cell" style="background:rgba(196,163,90,.45)"></span> 全填' +
      '</div>';

    // Click handlers on cells
    setTimeout(function() {
      var cells = container.querySelectorAll('.calendar-cell[data-date]');
      for (var c = 0; c < cells.length; c++) {
        cells[c].addEventListener('click', function() {
          var dateStr = this.getAttribute('data-date');
          var reading = getReadingByDate(dateStr);
          if (reading) {
            _this.switchDate(dateStr);
          }
        });
      }
    }, 0);
  },

  renderCollection: function() {
    var unlocked = getUnlockedCards();
    var count = unlocked.length;
    var total = TAROT_CARDS.length;
    var pct = Math.round(count / total * 100);

    document.getElementById('collection-progress-text').textContent = '已收集：' + count + ' / ' + total;
    document.getElementById('collection-mini-fill').style.width = pct + '%';
  },

  renderNikoStatus: function() {
    var state = getNikoState();
    var topic = getNikoDailyTopic();
    var emoji = document.getElementById('niko-status-emoji');
    var text = document.getElementById('niko-status-text');

    emoji.innerHTML = '<img src="images/niko-portrait.jpg" class="niko-status-portrait" alt="Niko">';

    var statusLines = [];
    // Weather at top if available
    if (this._weatherData && !this._weatherData.error && this._weatherData.weather) {
      var w = this._weatherData;
      var weatherIcon = w.rainChance >= 50 ? '🌧' : w.temp >= 30 ? '☀️' : w.temp <= 5 ? '❄️' : '⛅';
      statusLines.push(weatherIcon + ' ' + (w.city || '这里') + ' ' + w.weather + ' ' + w.temp + '°C');
    }
    if (topic) {
      statusLines.push(topic);
    }
    if (state.consecutiveActiveDays >= 7) {
      statusLines.push('连续来了' + state.consecutiveActiveDays + '天了…我才没有在数。');
    } else if (state.consecutiveActiveDays >= 3) {
      statusLines.push('第' + state.consecutiveActiveDays + '天…哼，还挺坚持的嘛。');
    } else if (state.totalDraws === 0) {
      statusLines.push('…来了啊。要抽牌吗？');
    } else {
      statusLines.push('今天也要好好听牌的话哦…我是说，随便你。');
    }

    if (state.firstVisitDate && state.totalDraws > 0) {
      var firstDate = new Date(state.firstVisitDate + 'T00:00:00');
      var todayDate = new Date(getTodayDate() + 'T00:00:00');
      var totalDays = Math.floor((todayDate - firstDate) / (1000 * 60 * 60 * 24)) + 1;
      statusLines.push('认识你' + totalDays + '天了…不是特意记的。');
    }

    text.innerHTML = statusLines.join('<br>');
  },

  // ============================================================
  // LANE 2
  // ============================================================
  renderLane2: function() {
    this.renderAIReading();
    this.renderSuggestions();
    this.renderBehaviorForm();
    this.renderNikoResponses();
    this._toggleHistoryMode();
  },

  renderAIReading: function() {
    var container = document.getElementById('reading-content');
    var loadingEl = document.getElementById('reading-loading');
    var reading = getReadingByDate(this.viewDate);

    if (!reading) {
      container.textContent = '';
      loadingEl.classList.add('hidden');
      return;
    }

    // If AI reading cached, show it
    if (reading.aiReading) {
      loadingEl.classList.add('hidden');
      container.innerHTML = reading.aiReading.replace(/\n/g, '<br>');
      if (reading.nikoRemark) {
        container.innerHTML += '<br><br><em style="color:var(--gold-bright)">"' + reading.nikoRemark + '"</em>';
      }
      return;
    }

    // If today and no cache, trigger AI generation
    if (this.isToday && !reading.aiReading) {
      loadingEl.classList.remove('hidden');
      document.getElementById('loading-text').textContent = NikoDialogue.loadingPhrase();
      container.textContent = '';

      var _this = this;
      this._startLoadingTextRotation();
      AIService.generateReading(reading.cards).then(function(result) {
        _this._stopLoadingTextRotation();
        loadingEl.classList.add('hidden');
        if (result.reading) {
          container.innerHTML = result.reading.replace(/\n/g, '<br>');
          if (result.nikoRemark) {
            container.innerHTML += '<br><br><em style="color:var(--gold-bright)">"' + result.nikoRemark + '"</em>';
          }
        }
        // Re-render suggestions with AI content if available
        _this.renderSuggestions();
      }).catch(function() {
        _this._stopLoadingTextRotation();
        loadingEl.classList.add('hidden');
        container.textContent = '…牌今天不太想说话。反正你也不会在意的对吧。';
      });
      return;
    }

    // Historical date without cache
    loadingEl.classList.add('hidden');
    container.textContent = '（该日期的解读未缓存）';
  },

  _loadingTimer: null,
  _startLoadingTextRotation: function() {
    var _this = this;
    this._loadingTimer = setInterval(function() {
      document.getElementById('loading-text').textContent = NikoDialogue.loadingPhrase();
    }, 3000);
  },
  _stopLoadingTextRotation: function() {
    if (this._loadingTimer) {
      clearInterval(this._loadingTimer);
      this._loadingTimer = null;
    }
  },

  renderSuggestions: function() {
    var container = document.getElementById('suggestions-grid');
    var reading = getReadingByDate(this.viewDate);

    if (!reading) {
      container.innerHTML = '<div class="empty-state">抽牌后会显示今日建议</div>';
      return;
    }

    // Use AI suggestions if available, otherwise fallback
    var suggestions;
    if (reading.aiSuggestions && reading.aiSuggestions.clothing) {
      suggestions = reading.aiSuggestions;
    } else {
      suggestions = getDailySuggestions(reading.cards);
    }

    container.innerHTML = '';
    for (var d = 0; d < DOMAINS.length; d++) {
      var domain = DOMAINS[d];
      var sugText = '';
      var sugSource = '';

      if (typeof suggestions[domain.key] === 'string') {
        sugText = suggestions[domain.key];
      } else if (suggestions[domain.key] && suggestions[domain.key].text) {
        sugText = suggestions[domain.key].text;
        if (suggestions[domain.key].sourceCard) {
          sugSource = '—— ' + suggestions[domain.key].sourceCard;
        }
      }

      var card = document.createElement('div');
      card.className = 'suggestion-card';
      card.innerHTML =
        '<span class="sug-icon">' + domain.icon + '</span>' +
        '<div class="sug-label">' + domain.label + '</div>' +
        '<div class="sug-text">' + (sugText || '今天随缘就好') + '</div>' +
        (sugSource ? '<div class="sug-source">' + sugSource + '</div>' : '');
      container.appendChild(card);
    }
  },

  renderBehaviorForm: function() {
    var container = document.getElementById('behavior-form-grid');
    var msgEl = document.getElementById('behavior-niko-msg');
    var submitArea = document.getElementById('behavior-submit-area');
    var reading = getReadingByDate(this.viewDate);
    var behavior = getBehaviorByDate(this.viewDate);

    if (!reading) {
      container.innerHTML = '<div class="empty-state">暂无牌面数据</div>';
      msgEl.textContent = '';
      submitArea.classList.add('hidden');
      return;
    }

    // Get suggestions for this reading
    var suggestions;
    if (reading.aiSuggestions && reading.aiSuggestions.clothing) {
      suggestions = reading.aiSuggestions;
    } else {
      var rawSuggs = getDailySuggestions(reading.cards);
      suggestions = {};
      for (var i = 0; i < DOMAINS.length; i++) {
        var dk = DOMAINS[i].key;
        suggestions[dk] = rawSuggs[dk] ? rawSuggs[dk].text : '';
      }
    }

    // History mode vs today mode
    if (!this.isToday) {
      msgEl.textContent = '';
      submitArea.classList.add('hidden');
      container.classList.add('history-readonly');
    } else {
      container.classList.remove('history-readonly');
      submitArea.classList.remove('hidden');

      if (behavior && behavior.submittedAt) {
        msgEl.textContent = NikoDialogue.behaviorReeditIntro();
        document.getElementById('behavior-hint').textContent = '可以修改到今晚 23:59';
      } else {
        msgEl.textContent = NikoDialogue.behaviorIntro();
        document.getElementById('behavior-hint').textContent = '至少填一项，Niko 才不会生气';
      }
    }

    container.innerHTML = '';
    var _this = this;

    for (var d = 0; d < DOMAINS.length; d++) {
      var domain = DOMAINS[d];
      var sugText = typeof suggestions[domain.key] === 'string'
        ? suggestions[domain.key]
        : (suggestions[domain.key] && suggestions[domain.key].text ? suggestions[domain.key].text : '');

      var existing = behavior && behavior.domains ? behavior.domains[domain.key] : null;
      var existingNote = (existing && existing.note) ? existing.note : '';

      (function(domainKey, sug, existNote) {
        var row = document.createElement('div');
        row.className = 'behavior-row';
        row.innerHTML =
          '<div class="behavior-row-header">' +
            '<span class="behavior-row-icon">' + domain.icon + '</span>' +
            '<span class="behavior-row-label">' + domain.label + '</span>' +
          '</div>' +
          '<div class="behavior-row-suggestion">Niko 建议：' + (sug || '——') + '</div>' +
          '<textarea class="behavior-note-textarea" id="behavior-note-' + domainKey + '" ' +
            'placeholder="今天' + domain.label + '方面做了什么？写下来让 Niko 评评理…" ' +
            (!_this.isToday ? 'disabled' : '') + ' rows="3">' +
            (existNote ? existNote.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : '') +
          '</textarea>';
        container.appendChild(row);
      })(domain.key, sugText, existingNote);
    }
  },

  renderNikoResponses: function() {
    var section = document.getElementById('lane2-responses-section');
    var card = document.getElementById('responses-card');
    var behavior = getBehaviorByDate(this.viewDate);

    if (!behavior || !behavior.submittedAt) {
      section.classList.add('hidden');
      return;
    }

    section.classList.remove('hidden');

    // Check if we have cached AI responses
    if (behavior.aiResponses) {
      this._renderResponseCard(card, behavior);
      return;
    }

    // If today and no cache, trigger AI
    if (this.isToday && !behavior.aiResponses) {
      var reading = getReadingByDate(this.viewDate);
      var suggestions;
      if (reading.aiSuggestions) {
        suggestions = reading.aiSuggestions;
      } else {
        var rawSuggs = getDailySuggestions(reading.cards);
        suggestions = {};
        for (var i = 0; i < DOMAINS.length; i++) {
          var dk = DOMAINS[i].key;
          suggestions[dk] = rawSuggs[dk] ? rawSuggs[dk].text : '';
        }
      }

      var _this = this;
      card.innerHTML =
        '<div class="reading-loading">' +
          '<span class="loading-emoji">😼</span>' +
          '<span class="loading-text">让我想想怎么吐槽你…</span>' +
          '<div class="loading-dots"><span></span><span></span><span></span></div>' +
        '</div>';

      AIService.generateBehaviorResponse(reading.cards, suggestions, behavior.domains).then(function(result) {
        // Re-fetch behavior with AI data
        var updatedBehavior = getBehaviorByDate(_this.viewDate);
        _this._renderResponseCard(card, updatedBehavior);
      }).catch(function() {
        // Generate fallback on the fly
        var fallbackResponses = {};
        var filledCount = 0;
        for (var d = 0; d < DOMAINS.length; d++) {
          var key = DOMAINS[d].key;
          var note = behavior.domains[key] && behavior.domains[key].note ? behavior.domains[key].note : '';
          if (note) {
            filledCount++;
            fallbackResponses[key] = getFallbackBehaviorResponse(key, note);
          } else {
            fallbackResponses[key] = '';
          }
        }
        var fallbackSummary = getFallbackBehaviorSummary(filledCount);
        updateBehaviorAI(_this.viewDate, { responses: fallbackResponses, summary: fallbackSummary });
        var updatedBehavior = getBehaviorByDate(_this.viewDate);
        _this._renderResponseCard(card, updatedBehavior);
      });
    }
  },

  _renderResponseCard: function(card, behavior) {
    if (!behavior || !behavior.aiResponses) {
      card.innerHTML = '';
      return;
    }

    var html = '';
    for (var d = 0; d < DOMAINS.length; d++) {
      var key = DOMAINS[d].key;
      var resp = behavior.aiResponses[key];
      if (resp) {
        html +=
          '<div class="response-item">' +
            '<span class="response-item-icon">' + DOMAINS[d].icon + '</span>' +
            '<span class="response-item-text">' + resp.replace(/\n/g, '<br>') + '</span>' +
          '</div>';
      }
    }

    if (behavior.aiSummary) {
      html += '<div class="response-summary">' + behavior.aiSummary.replace(/\n/g, '<br>') + '</div>';
    }

    card.innerHTML = html;
  },

  // ============================================================
  // DATE SWITCHING
  // ============================================================
  switchDate: function(dateStr) {
    this.viewDate = dateStr;
    this.isToday = isToday(dateStr);
    this.currentReading = getReadingByDate(dateStr);
    this.currentBehavior = getBehaviorByDate(dateStr);

    this.refreshView();

    // Scroll lanes to top
    document.getElementById('lane-1').scrollTop = 0;
    document.getElementById('lane-2').scrollTop = 0;
  },

  _toggleHistoryMode: function() {
    var notice = document.getElementById('lane2-history-notice');
    var formGrid = document.getElementById('behavior-form-grid');
    var submitArea = document.getElementById('behavior-submit-area');

    if (!this.isToday && getReadingByDate(this.viewDate)) {
      notice.classList.remove('hidden');
      document.getElementById('history-date-label').textContent = getDateDisplay(this.viewDate);
      formGrid.classList.add('history-readonly');
      submitArea.classList.add('hidden');
    } else {
      notice.classList.add('hidden');
      formGrid.classList.remove('history-readonly');
      if (this.isToday && getReadingByDate(this.viewDate)) {
        submitArea.classList.remove('hidden');
      }
    }
  },

  // ============================================================
  // DRAW OVERLAY — FAN DECK
  // ============================================================
  showDrawOverlay: function() {
    var _this = this;
    var overlay = document.getElementById('draw-overlay');
    overlay.classList.remove('hidden');

    // Reset state
    this.selectedFanCards = [];
    this.isDrawing = false;

    // Greetings
    var state = getNikoState();
    var isFirstVisit = !state.firstVisitDate || state.totalDraws === 0;

    var greeting;
    if (isFirstVisit) {
      greeting = NikoDialogue.firstTimeGreeting();
    } else {
      greeting = NikoDialogue.proactiveGreeting();
    }

    this._clearChat();

    // Ensure chat is visible
    var chatEl = document.getElementById('draw-chat');
    chatEl.style.display = '';
    chatEl.style.opacity = '1';
    chatEl.style.transition = '';

    // Build message queue — all Niko will say before cards unlock
    this._messageQueue = [];
    this._messageQueue.push(greeting);
    if (isFirstVisit) {
      this._messageQueue.push('牌已经洗好了。二十二张大阿卡纳，五十六张小阿卡纳——一共七十八张，每一张都带着命运的一丝线索。');
      this._messageQueue.push('挑三张——凭直觉，不要想太多。命运不喜欢犹豫。');
    }
    if (this._weatherData) {
      var weatherLine = WeatherService.getWeatherGreeting(this._weatherData);
      if (weatherLine) this._messageQueue.push(weatherLine);
    }
    this._messageQueue.push(NikoDialogue.drawPrompt());
    this._messageIndex = 0;

    // Show first bubble
    this._addChatBubble(this._messageQueue[0]);
    this._messageIndex = 1;

    // Disable cards until all messages shown
    this._cardsLocked = true;

    // Click anywhere on overlay to advance
    var _dt = this;
    var overlay = document.getElementById('draw-overlay');
    this._drawClickHandler = function(e) {
      // Don't advance if clicking interactive elements or chat itself
      if (e.target.closest('.draw-actions') || e.target.closest('.selected-zone') || e.target.closest('.draw-chat')) return;
      _dt._advanceChat();
    };
    overlay.addEventListener('click', this._drawClickHandler);

    // Build fan deck
    this._buildFanDeck();

    // Reset selected zone
    document.getElementById('selected-count').textContent = '0';
    document.getElementById('selected-slots').innerHTML =
      '<div class="selected-slot"><span class="card-back-pattern">✦</span></div>' +
      '<div class="selected-slot"><span class="card-back-pattern">✦</span></div>' +
      '<div class="selected-slot"><span class="card-back-pattern">✦</span></div>';

    document.getElementById('btn-confirm-draw').disabled = true;
    document.getElementById('draw-actions').style.display = 'flex';

    if (isFirstVisit) {
      updateNikoState({ firstVisitDate: getTodayDate() });
    }
  },

  _buildFanDeck: function() {
    var container = document.getElementById('fan-deck');
    var positions = calculateFanDeckPositions();
    this.fanDeckOrder = shuffleDeckOrder();

    // Lock deck until all messages shown
    document.querySelector('.fan-deck-stage').classList.add('locked');

    container.innerHTML = '';
    var _this = this;

    for (var i = 0; i < this.fanDeckOrder.length; i++) {
      var displayIndex = this.fanDeckOrder[i];
      var pos = positions[i];

      (function(cardIdx, posData) {
        var card = document.createElement('div');
        card.className = 'fan-card';
        card.setAttribute('data-index', cardIdx);
        card.style.transform = 'rotate(' + posData.rotate + 'deg) translateX(' + posData.translateX + 'px) translateY(' + posData.translateY + 'px)';
        card.style.zIndex = posData.zIndex;

        card.innerHTML =
          '<div class="card-back">' +
            '<div class="card-back-pattern">✦</div>' +
          '</div>';

        card.addEventListener('click', function() {
          _this._selectFanCard(cardIdx, card);
        });

        container.appendChild(card);
      })(displayIndex, pos);
    }
  },

  _advanceChat: function() {
    if (!this._messageQueue || this._messageIndex >= this._messageQueue.length) return;

    this._addChatBubble(this._messageQueue[this._messageIndex]);
    this._messageIndex++;

    // Last message shown — fade out chat, unlock cards
    if (this._messageIndex >= this._messageQueue.length) {
      this._cardsLocked = false;
      document.querySelector('.fan-deck-stage').classList.remove('locked');
      // Fade out chat
      var chatEl = document.getElementById('draw-chat');
      chatEl.style.transition = 'opacity .6s ease';
      chatEl.style.opacity = '0';
      setTimeout(function() { chatEl.style.display = 'none'; }, 600);
      // Remove global click handler
      var overlay = document.getElementById('draw-overlay');
      if (this._drawClickHandler) {
        overlay.removeEventListener('click', this._drawClickHandler);
        this._drawClickHandler = null;
      }
    }
  },

  _selectFanCard: function(index, cardEl) {
    if (this._cardsLocked || this.isDrawing || this.selectedFanCards.length >= 3) return;
    if (this.selectedFanCards.indexOf(index) !== -1) return;

    this.selectedFanCards.push(index);
    cardEl.classList.add('selected');

    // Update selected zone
    var slots = document.getElementById('selected-slots');
    var slotChildren = slots.querySelectorAll('.selected-slot');
    var count = this.selectedFanCards.length;
    document.getElementById('selected-count').textContent = count;

    if (count <= 3) {
      var slot = slotChildren[count - 1];
      slot.classList.add('filled');
      slot.innerHTML = '<span class="card-back-pattern">✦</span>';
    }

    // Niko reaction
    this._addChatBubble(NikoDialogue.selectingLine(count));

    // Enable confirm button when 3 selected
    if (count === 3) {
      document.getElementById('btn-confirm-draw').disabled = false;
    }
  },

  _resetDraw: function() {
    this.selectedFanCards = [];
    this.isDrawing = false;
    this._cardsLocked = false;

    // Show chat again
    var chatEl = document.getElementById('draw-chat');
    chatEl.style.display = '';
    chatEl.style.opacity = '1';
    chatEl.style.transition = '';

    // Reset all fan cards
    var cards = document.querySelectorAll('.fan-card');
    for (var i = 0; i < cards.length; i++) {
      cards[i].classList.remove('selected');
    }

    // Reset selected zone
    document.getElementById('selected-count').textContent = '0';
    document.getElementById('selected-slots').innerHTML =
      '<div class="selected-slot"><span class="card-back-pattern">✦</span></div>' +
      '<div class="selected-slot"><span class="card-back-pattern">✦</span></div>' +
      '<div class="selected-slot"><span class="card-back-pattern">✦</span></div>';

    document.getElementById('btn-confirm-draw').disabled = true;
    this._addChatBubble('…重新选吧。反正我也没等多久。');
  },

  _confirmDraw: function() {
    if (this.selectedFanCards.length !== 3 || this.isDrawing) return;
    this.isDrawing = true;

    var _this = this;

    // Draw the 3 actual cards
    var drawnCards = drawThreeCards();

    // Save to storage
    saveTodayReading(drawnCards);

    // Update Niko state
    var state = getNikoState();
    state.totalDraws = (state.totalDraws || 0) + 1;
    updateNikoState(state);

    // Unlock cards in collection
    for (var i = 0; i < drawnCards.length; i++) {
      unlockCard(drawnCards[i].cardId);
    }

    // Animate the selected cards flipping
    this._addChatBubble('命运的丝线已经牵好了…来看看你抽到了什么——');

    // Hide fan deck, show flip animation
    setTimeout(function() {
      var fanDeck = document.getElementById('fan-deck');
      fanDeck.style.opacity = '0';
      fanDeck.style.transition = 'opacity .5s ease';

      // Animate selected slots
      var slots = document.querySelectorAll('#selected-slots .selected-slot');
      for (var s = 0; s < 3; s++) {
        (function(slot, card) {
          setTimeout(function() {
            slot.style.transition = 'transform .6s ease';
            slot.style.transform = 'rotateY(360deg)';
            setTimeout(function() {
              slot.innerHTML =
                '<img src="images/tarot/' + card.cardId + '.jpg" ' +
                'style="width:100%;height:100%;object-fit:cover;border-radius:6px;' +
                (card.position === 'reversed' ? 'transform:rotate(180deg);' : '') + '">';
            }, 250);
          }, s * 300);
        })(slots[s], drawnCards[s]);
      }

      // Reveal lines — staggered for drama but quick
      for (var r = 0; r < 3; r++) {
        (function(idx, card) {
          setTimeout(function() {
            _this._addChatBubble(NikoDialogue.revealLine(idx));
            setTimeout(function() {
              var interp = getCardInterpretation(card.cardId, card.position);
              if (interp) {
                _this._addChatBubble(interp.interpretation.general);
              }
            }, 300);
          }, idx * 800 + 500);
        })(r, drawnCards[r]);
      }

      // Check milestone
      var milestone = NikoDialogue.checkAffectionMilestone(state.totalDraws);
      if (milestone) {
        setTimeout(function() {
          _this._addChatBubble(milestone);
        }, 3 * 800 + 1000);
      }

      // Transition to main view
      setTimeout(function() {
        _this.phase = 'main';
        _this.currentReading = getTodayReading();
        _this.currentBehavior = getTodayBehavior();
        _this.viewDate = getTodayDate();
        _this.isToday = true;

        document.getElementById('draw-overlay').classList.add('hidden');
        _this.renderMainView();

        // Trigger AI reading
        _this.renderAIReading();
      }, 3 * 800 + 1500);

    }, 400);
  },

  // ============================================================
  // BEHAVIOR SUBMIT
  // ============================================================
  _submitBehavior: function() {
    if (!this.isToday) return;

    var domains = {};
    var anyFilled = false;

    for (var d = 0; d < DOMAINS.length; d++) {
      var key = DOMAINS[d].key;
      var noteInput = document.getElementById('behavior-note-' + key);
      var note = noteInput ? noteInput.value.trim() : '';

      if (note) {
        anyFilled = true;
        domains[key] = { note: note };
      } else {
        domains[key] = null;
      }
    }

    if (!anyFilled) {
      alert('至少填一项吧…不然 Niko 会生气的。');
      return;
    }

    saveTodayBehavior(domains);
    this.currentBehavior = getTodayBehavior();

    // Re-render responses section
    var section = document.getElementById('lane2-responses-section');
    section.classList.remove('hidden');
    this.renderNikoResponses();

    // Update affection
    var affection = calculateAffection();
    updateNikoState({ affection: affection });
    this.renderTopBar();

    // Update calendar heatmap
    this.renderCalendarHeatmap();

    // Scroll Lane 2 to responses
    document.getElementById('lane-2').scrollTo({
      top: document.getElementById('lane2-responses-section').offsetTop - 100,
      behavior: 'smooth'
    });
  },

  // ============================================================
  // MODALS
  // ============================================================
  _showCardDetail: function(card, slot, reading) {
    var interp = getCardInterpretation(card.cardId, card.position);
    if (!interp) return;

    var modal = document.getElementById('modal-card-detail');
    document.getElementById('modal-card-img').src = 'images/tarot/' + card.cardId + '.jpg';
    document.getElementById('modal-card-img').className = 'modal-card-img ' + (card.position === 'reversed' ? 'reversed-img' : '');
    document.getElementById('modal-card-name').textContent = card.name + ' · ' + card.nameEn;
    document.getElementById('modal-card-slot').textContent = SPREAD_POSITIONS[slot].title;
    document.getElementById('modal-card-position').textContent = card.position === 'upright' ? '正位 ↑' : '逆位 ↓';
    document.getElementById('modal-card-position').style.color = card.position === 'upright' ? 'var(--teal)' : 'var(--red)';
    // Detailed traditional meaning
    var meaning = interp.detailedMeaning || interp.interpretation.general;
    document.getElementById('modal-card-general').textContent = meaning;

    var kwHtml = '';
    for (var k = 0; k < interp.keywords.length; k++) {
      kwHtml += '<span class="keyword-tag">' + interp.keywords[k] + '</span>';
    }
    document.getElementById('modal-card-keywords').innerHTML = kwHtml;

    // Niko's commentary on this card
    var nikoComment = NikoDialogue.cardDetailedComment(card, card.position);
    document.getElementById('modal-niko-comment').innerHTML =
      '<span class="niko-comment-avatar"><img src="images/niko-portrait.jpg" class="bubble-avatar-img" alt="Niko"></span>' +
      '<span class="niko-comment-text">"' + nikoComment + '"</span>';

    modal.classList.remove('hidden');
  },

  _showCollectionWall: function() {
    var modal = document.getElementById('modal-collection');
    var unlockedIds = getUnlockedCards();
    var count = unlockedIds.length;
    var pct = Math.round(count / TAROT_CARDS.length * 100);

    document.getElementById('collection-count').textContent = '已收集：' + count + ' / ' + TAROT_CARDS.length;
    document.getElementById('collection-full-fill').style.width = pct + '%';

    var milestoneText = NikoDialogue.collectionMilestone(count);
    document.getElementById('collection-milestone').textContent = milestoneText || '';

    var grid = document.getElementById('collection-grid');
    grid.innerHTML = '';

    for (var i = 0; i < TAROT_CARDS.length; i++) {
      var card = TAROT_CARDS[i];
      var isUnlocked = unlockedIds.indexOf(card.id) !== -1;

      var item = document.createElement('div');
      item.className = 'collection-item' + (isUnlocked ? '' : ' locked');
      item.innerHTML =
        '<img src="images/tarot/' + card.id + '.jpg" alt="' + card.name + '">' +
        '<div class="coll-name">' + (isUnlocked ? card.name : '???') + '</div>';
      grid.appendChild(item);
    }

    modal.classList.remove('hidden');
  },

  _showMilestones: function() {
    var modal = document.getElementById('modal-milestones');
    var state = getNikoState();
    var readings = getAllReadingsSorted();
    var behaviors = getDailyBehaviors();
    var moods = getMoodHistory(90);

    // Stats
    document.getElementById('milestones-stats').innerHTML =
      '<div class="milestone-stat"><div class="milestone-stat-num">' + state.totalDraws + '</div><div class="milestone-stat-label">抽牌次数</div></div>' +
      '<div class="milestone-stat"><div class="milestone-stat-num">' + state.consecutiveActiveDays + '</div><div class="milestone-stat-label">连续天数</div></div>' +
      '<div class="milestone-stat"><div class="milestone-stat-num">' + getUnlockedCards().length + '</div><div class="milestone-stat-label">收集牌数</div></div>' +
      '<div class="milestone-stat"><div class="milestone-stat-num">' + moods.length + '</div><div class="milestone-stat-label">心情记录</div></div>';

    // Timeline
    var timeline = document.getElementById('milestones-timeline');
    var entries = [];

    // First visit
    if (state.firstVisitDate) {
      entries.push({ date: state.firstVisitDate, text: '第一次遇见 Niko。他说「…哦？来了个新面孔。」', cls: 'first' });
    }

    // First draw
    if (readings.length > 0) {
      var first = readings[0];
      var cardNames = first.cards.map(function(c) { return c.name; }).join('、');
      entries.push({ date: first.date, text: '第一次抽牌——抽到了「' + cardNames + '」', cls: 'big' });
    }

    // Collection milestones
    var unlockedCount = getUnlockedCards().length;
    var allReadings = getAllReadingsSorted();
    var seenCards = [];
    for (var r = 0; r < allReadings.length; r++) {
      var cards = allReadings[r].cards;
      for (var c = 0; c < cards.length; c++) {
        var cid = cards[c].cardId;
        if (seenCards.indexOf(cid) === -1) {
          seenCards.push(cid);
          if (seenCards.length === 10 || seenCards.length === 20 || seenCards.length === 40 || seenCards.length === 60 || seenCards.length === 78) {
            entries.push({ date: allReadings[r].date, text: '收集到第 ' + seenCards.length + ' 张牌——「' + cards[c].name + '」', cls: 'big' });
          }
        }
      }
    }

    // Streak records
    var maxStreak = 0;
    var currentStreak = 0;
    var streakDates = [];
    for (var i = 0; i < readings.length; i++) {
      if (i === 0) { currentStreak = 1; continue; }
      var d1 = new Date(readings[i-1].date + 'T00:00:00');
      var d2 = new Date(readings[i].date + 'T00:00:00');
      if ((d2 - d1) / (1000*60*60*24) === 1) {
        currentStreak++;
      } else {
        if (currentStreak > maxStreak) { maxStreak = currentStreak; }
        currentStreak = 1;
      }
    }
    if (currentStreak > maxStreak) maxStreak = currentStreak;
    if (maxStreak >= 7) {
      entries.push({ date: readings[readings.length-1].date, text: '最长连续签到 ' + maxStreak + ' 天——Niko 说「我才没有高兴」', cls: 'big' });
    }

    // Behavior milestones
    var behaviorDays = 0;
    for (var b = 0; b < behaviors.length; b++) {
      if (behaviors[b].submittedAt) behaviorDays++;
    }
    if (behaviorDays >= 10) {
      entries.push({ date: behaviors[behaviors.length-1].date, text: '累计记录了 ' + behaviorDays + ' 天的行为——Niko 已经对你的习惯了如指掌', cls: '' });
    }

    // Sort by date
    entries.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });

    if (entries.length === 0) {
      timeline.innerHTML = '<div class="empty-state">还没有里程碑～<br>和 Niko 多相处几天吧</div>';
    } else {
      timeline.innerHTML = '';
      for (var e = 0; e < entries.length; e++) {
        var entry = entries[e];
        var div = document.createElement('div');
        div.className = 'milestone-entry';
        div.innerHTML =
          '<div class="milestone-dot ' + (entry.cls || '') + '"></div>' +
          '<div class="milestone-date">' + getDateDisplay(entry.date) + '</div>' +
          '<div class="milestone-text">' + entry.text + '</div>';
        timeline.appendChild(div);
      }
    }

    modal.classList.remove('hidden');
  },

  _showConfigModal: function() {
    document.getElementById('modal-config').classList.remove('hidden');
  },

  _resetData: function() {
    if (confirm('确定要重置所有数据吗？此操作不可撤销！\n\n建议先导出数据备份。')) {
      if (confirm('再次确认：真的要删除所有记录吗？')) {
        localStorage.clear();
        location.reload();
      }
    }
  },

  // ============================================================
  // WEEKLY REVIEW
  // ============================================================
  _triggerWeeklyReview: function() {
    var _this = this;
    var today = new Date(getTodayDate() + 'T00:00:00');
    var weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    var weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    var readings = getDailyReadings();
    var behaviors = getDailyBehaviors();
    var drawDays = 0;
    var filledDays = 0;

    for (var r = 0; r < readings.length; r++) {
      var rd = new Date(readings[r].date + 'T00:00:00');
      if (rd >= weekStart && rd <= weekEnd) {
        drawDays++;
        var behavior = null;
        for (var b = 0; b < behaviors.length; b++) {
          if (behaviors[b].date === readings[r].date) { behavior = behaviors[b]; break; }
        }
        if (behavior && behavior.submittedAt) filledDays++;
      }
    }

    var weekData = {
      weekStart: getDateDisplay(
        weekStart.getFullYear() + '-' +
        String(weekStart.getMonth() + 1).padStart(2, '0') + '-' +
        String(weekStart.getDate()).padStart(2, '0')
      ),
      weekEnd: getDateDisplay(
        weekEnd.getFullYear() + '-' +
        String(weekEnd.getMonth() + 1).padStart(2, '0') + '-' +
        String(weekEnd.getDate()).padStart(2, '0')
      ),
      drawDays: drawDays,
      filledDays: filledDays,
      totalDays: 7,
      note: ''
    };

    AIService.generateWeeklyReview(weekData).then(function(review) {
      if (review) {
        _this._showWeeklyReviewToast(review);
      }
    });
  },

  // ============================================================
  // TOASTS
  // ============================================================
  _showMilestoneToast: function(days) {
    var msg = '';
    // Look up the milestone message
    var milestones = { 7: '连续一周！Niko 好像更信任你了…', 30: '一个月了！Niko 今天特别话多…', 100: '百天纪念！Niko 今天不想傲娇了…' };
    msg = milestones[days] || '好感度里程碑解锁！';
    this._showToast('🎉', msg);
  },

  _showWeeklyReviewToast: function(review) {
    this._showToast('📊', review);
  },

  _showToast: function(emoji, msg) {
    var toast = document.createElement('div');
    toast.style.cssText =
      'position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:400;' +
      'background:var(--bg2);border:1px solid var(--gold);border-radius:var(--r-lg);' +
      'padding:16px 28px;color:var(--text);font-size:15px;line-height:1.7;' +
      'box-shadow:0 8px 40px rgba(0,0,0,.6);max-width:500px;text-align:center;' +
      'animation:toastIn .4s ease-out;';
    toast.innerHTML = '<span style="font-size:24px">' + emoji + '</span><br>' + msg;
    document.body.appendChild(toast);

    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity .5s ease';
      setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 500);
    }, 5000);

    // Click to dismiss
    toast.addEventListener('click', function() {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    });
  },

  // ============================================================
  // CHAT BUBBLES (draw overlay)
  // ============================================================
  _clearChat: function() {
    document.getElementById('draw-chat').innerHTML = '';
  },

  _addChatBubble: function(text) {
    var container = document.getElementById('draw-chat');
    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.innerHTML =
      '<div class="bubble-avatar"><img src="images/niko-portrait.jpg" class="bubble-avatar-img" alt="Niko"></div>' +
      '<div class="bubble-content">' +
        '<div class="bubble-text">' + text.replace(/\n/g, '<br>') + '</div>' +
      '</div>';
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
  },

  // ============================================================
  // EVENT BINDINGS
  // ============================================================
  _bindEvents: function() {
    var _this = this;

    // Date switcher
    document.getElementById('btn-prev-date').addEventListener('click', function() {
      var newDate = getDateOffset(_this.viewDate, -1);
      var reading = getReadingByDate(newDate);
      if (reading) {
        _this.switchDate(newDate);
      } else {
        // Keep going back until we find a reading or hit limit
        var checkDate = newDate;
        var found = false;
        for (var i = 0; i < 365; i++) {
          checkDate = getDateOffset(checkDate, -1);
          if (getReadingByDate(checkDate)) {
            _this.switchDate(checkDate);
            found = true;
            break;
          }
        }
        if (!found) {
          // Already at earliest
        }
      }
    });

    document.getElementById('btn-next-date').addEventListener('click', function() {
      if (_this.isToday) return;
      var newDate = getDateOffset(_this.viewDate, 1);
      _this.switchDate(newDate);
    });

    document.getElementById('btn-today').addEventListener('click', function() {
      if (!_this.isToday) {
        _this.switchDate(getTodayDate());
      }
    });

    // Draw overlay
    document.getElementById('btn-confirm-draw').addEventListener('click', function() {
      _this._confirmDraw();
    });

    document.getElementById('btn-reset-draw').addEventListener('click', function() {
      _this._resetDraw();
    });

    // Behavior submit
    document.getElementById('btn-submit-behavior').addEventListener('click', function() {
      _this._submitBehavior();
    });

    // Collection wall
    document.getElementById('btn-open-collection').addEventListener('click', function() {
      _this._showCollectionWall();
    });

    // Config
    document.getElementById('btn-config').addEventListener('click', function() {
      _this._showConfigModal();
    });
    document.getElementById('btn-export-data').addEventListener('click', function() {
      downloadExport();
    });
    document.getElementById('btn-reset-data').addEventListener('click', function() {
      _this._resetData();
    });

    // Export button in top bar
    document.getElementById('btn-export').addEventListener('click', function() {
      downloadExport();
    });

    // Modal close buttons
    document.getElementById('modal-close-detail').addEventListener('click', function() {
      document.getElementById('modal-card-detail').classList.add('hidden');
    });
    document.getElementById('modal-close-collection').addEventListener('click', function() {
      document.getElementById('modal-collection').classList.add('hidden');
    });
    document.getElementById('modal-close-config').addEventListener('click', function() {
      document.getElementById('modal-config').classList.add('hidden');
    });

    // Modal overlay click to close
    var modals = document.querySelectorAll('.modal-overlay');
    for (var m = 0; m < modals.length; m++) {
      modals[m].addEventListener('click', function(e) {
        if (e.target === e.currentTarget) {
          e.currentTarget.classList.add('hidden');
        }
      });
    }

    // Poke Niko easter egg (click on top bar center)
    document.getElementById('top-bar-niko').addEventListener('click', function() {
      if (Math.random() < 0.15) {
        var reaction = NikoDialogue.exposedReaction();
        _this._showToast('🙀', reaction);
      } else {
        // Normal poke reactions
        var normalPokes = [
          '…干嘛？',
          '别碰我的斗篷！',
          '有什么事就说，别动手动脚的。',
          '……（瞪了你一眼）',
          '哼。'
        ];
        var poke = normalPokes[Math.floor(Math.random() * normalPokes.length)];
        var portrait = document.getElementById('niko-portrait-img');
        portrait.style.transform = 'scale(1.2) rotate(-8deg)';
        portrait.style.transition = 'transform .1s ease';
        setTimeout(function() {
          portrait.style.transform = 'scale(1) rotate(0deg)';
          portrait.style.transition = 'transform .3s ease';
        }, 150);
      }
    });

    // ---- Nav tabs ----
    document.getElementById('nav-tarot').addEventListener('click', function() {
      _this.switchPage('tarot');
    });
    document.getElementById('nav-chat').addEventListener('click', function() {
      _this._resetChatInit();
      _this.switchPage('chat');
    });

    // ---- Chat mood picker ----
    _this._initMoodPicker();

    // ---- Chat challenge button ----
    document.getElementById('btn-chat-challenge').addEventListener('click', function() {
      var panel = document.getElementById('challenge-panel');
      if (panel.classList.contains('hidden')) {
        var challenges = getActiveChallenges();
        if (challenges.length === 0) {
          _this._generateChallenge();
          _this._addChatMessage('niko', '给你布置了一个新挑战…别偷懒！我会盯着的。');
        }
        panel.classList.remove('hidden');
      } else {
        panel.classList.add('hidden');
      }
    });

    // ---- Mood button in chat header ----
    document.getElementById('btn-chat-mood').addEventListener('click', function() {
      var picker = document.getElementById('mood-picker');
      if (picker.classList.contains('hidden')) {
        picker.classList.remove('hidden');
      } else {
        picker.classList.add('hidden');
      }
    });

    // ---- Close challenge panel ----
    document.getElementById('btn-close-challenge').addEventListener('click', function() {
      document.getElementById('challenge-panel').classList.add('hidden');
    });

    // ---- Milestones ----
    document.getElementById('btn-milestones').addEventListener('click', function() {
      _this._showMilestones();
    });
    document.getElementById('modal-close-milestones').addEventListener('click', function() {
      document.getElementById('modal-milestones').classList.add('hidden');
    });
  }
};

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  App.init();
});
