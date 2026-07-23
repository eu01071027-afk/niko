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

    // Load history if exists — if so, don't re-welcome
    var history = getChatHistory();
    greetingArea.innerHTML = '';
    if (history.length > 0) {
      var recent = history.slice(-30);
      for (var i = 0; i < recent.length; i++) {
        this._addChatMessage(recent[i].role, recent[i].content, false);
      }
    } else {
      // First time today — welcome
      var welcome = NikoDialogue.chatWelcome();
      this._addChatMessage('niko', welcome);
      addChatMessage('niko', welcome);
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
    // First chat achievement
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
        '<div class="msg-avatar"><img src="images/niko-portrait.svg" alt="Niko"></div>' +
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
        var moodLabels = { happy: '😊 今天很开心', calm: '😌 心情很平静', tired: '😮‍💨 有点疲惫', anxious: '😰 有些焦虑', sad: '😢 不太开心', excited: '🤩 超兴奋的' };
        setTodayMood(mood);
        document.getElementById('mood-picker').classList.add('hidden');
        // Show user's mood as a message
        var userMsg = moodLabels[mood] || ('今天的心情：' + mood);
        _this._addChatMessage('user', userMsg);
        addChatMessage('user', userMsg);
        // Niko responds
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

  // ---- Companion Mode ----
  _companionTimer: null,
  _companionSeconds: 0,

  _startCompanion: function() {
    var _this = this;
    var activePreset = document.querySelector('#companion-durations .companion-preset.active');
    var mins;
    if (activePreset && activePreset.textContent.indexOf('自定义') === -1) {
      mins = parseInt(activePreset.getAttribute('data-min'));
    } else {
      var h = _this._hourPicker.get();
      var m = _this._minPicker.get();
      mins = h * 60 + m;
    }
    if (mins <= 0) return; // blocked — button should be disabled

    // Lock chat UI + nav tabs during companion
    document.querySelector('.chat-main').classList.add('locked');
    document.body.classList.add('has-locked-companion');

    var catActive = document.querySelector('#companion-categories .companion-cat.active');
    var cat = catActive ? catActive.getAttribute('data-cat') : '专注';

    this._companionSeconds = mins * 60;
    document.getElementById('companion-start-area').classList.add('hidden');
    document.getElementById('companion-active-area').classList.remove('hidden');
    document.getElementById('companion-cat-label').textContent = cat + '中…';
    document.getElementById('companion-niko-line').textContent = '我在看着呢…别偷懒。';

    this._updateCountdown();
    var _this = this;
    this._companionTimer = setInterval(function() { _this._tickCompanion(); }, 1000);
  },

  _tickCompanion: function() {
    this._companionSeconds--;
    if (this._companionSeconds <= 0) {
      this._stopCompanion(false);
      this._dingSound();
      // Companion message in panel only, not in chat
      document.getElementById('companion-niko-line').textContent = '⏰ 时间到了…哼，你居然坚持下来了。还不错。';
      return;
    }
    this._updateCountdown();
    // Random Niko lines in panel
    if (this._companionSeconds % 300 === 0 && this._companionSeconds > 60) {
      var lines = ['…我还在。','别看我，看你的事。','加油…我什么都没说。','还剩' + Math.ceil(this._companionSeconds/60) + '分钟。'];
      document.getElementById('companion-niko-line').textContent = lines[Math.floor(Math.random() * lines.length)];
    }
  },

  _updateCountdown: function() {
    var m = Math.floor(this._companionSeconds / 60);
    var s = this._companionSeconds % 60;
    document.getElementById('companion-countdown').textContent =
      String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  },

  _stopCompanion: function(cancelled) {
    if (this._companionTimer) { clearInterval(this._companionTimer); this._companionTimer = null; }
    document.querySelector('.chat-main').classList.remove('locked');
    document.body.classList.remove('has-locked-companion');
    document.getElementById('companion-active-area').classList.add('hidden');
    document.getElementById('companion-start-area').classList.remove('hidden');
    if (!cancelled) {
      var affR = addAffection(2, 'companion');
      if (affR.added > 0) {
        this.renderTopBar();
        this._showAffectionPopup(affR.added, '⏳');
      }
    }
    if (cancelled) {
      document.getElementById('companion-niko-line').textContent = '…行吧。下次别中途跑了。';
    }
    // Track session count
    var sessions = storageGet('niko_companionSessions', 0);
    sessions++;
    storageSet('niko_companionSessions', sessions);
    this._companionSeconds = 0;
  },

  _dingSound: function() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var o = ctx.createOscillator(); var g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      g.gain.setValueAtTime(.3, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(.01, ctx.currentTime + .4);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + .4);
    } catch(e) {}
  },

  // ---- Long-term Tasks ----
  _openTasksPanel: function() {
    document.getElementById('tasks-panel').classList.remove('hidden');
    this._renderTasks();
  },

  _renderTasks: function() {
    var tasks = getTasks();
    var list = document.getElementById('tasks-list');
    var msg = document.getElementById('tasks-niko-msg');
    var active = tasks.filter(function(t) { return !t.done; });

    // Generate Niko's task message based on today's reading
    msg.innerHTML = this._getTaskNikoMessage(active.length);
    msg.style.fontStyle = 'normal';

    list.innerHTML = '';
    var _this = this;
    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      var checked = t.checkedDays.length;
      var pct = Math.round(checked / t.days * 100);
      var todayChecked = t.checkedDays.indexOf(getTodayDate()) !== -1;

      var item = document.createElement('div');
      item.className = 'task-item' + (t.done ? ' done' : '');
      item.innerHTML =
        '<div class="task-title">' +
          '<div class="task-check' + (todayChecked ? ' checked' : '') + '" data-id="' + t.id + '"></div>' +
          '<span>' + t.title + '</span>' +
        '</div>' +
        '<div class="task-bar"><div class="task-bar-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="task-meta">' +
          '<span class="task-day">' + checked + '/' + t.days + ' 天</span>' +
          '<span>截止 ' + t.deadline + '</span>' +
          (t.done ? '<span style="color:var(--teal)">✓ 完成</span>' : '') +
          '<span class="task-del" data-id="' + t.id + '" style="cursor:pointer;color:var(--text3);margin-left:auto">🗑</span>' +
        '</div>';
      list.appendChild(item);
    }

    // Bind check clicks
    var checks = list.querySelectorAll('.task-check');
    for (var c = 0; c < checks.length; c++) {
      checks[c].addEventListener('click', function() {
        toggleTaskDay(this.getAttribute('data-id'));
        _this._renderTasks();
        // Affection: +3 for task check-in
        var affR = addAffection(3, 'task');
        if (affR.added > 0) {
          _this.renderTopBar();
          _this._showAffectionPopup(affR.added, '📋');
        }
      });
    }

    // Bind delete clicks
    var dels = list.querySelectorAll('.task-del');
    for (var d = 0; d < dels.length; d++) {
      dels[d].addEventListener('click', function(e) {
        e.stopPropagation();
        if (confirm('删除这个任务？')) {
          deleteTask(this.getAttribute('data-id'));
          _this._renderTasks();
        }
      });
    }
  },

  _getTaskNikoMessage: function(taskCount) {
    var reading = getTodayReading();
    var taskLine = '';

    if (taskCount === 0) {
      taskLine = '暂时没有任务…不过需要我盯着的话，随时加。';
    } else if (taskCount === 1) {
      taskLine = '你还有 1 个任务…';
    } else {
      taskLine = '你还有 ' + taskCount + ' 个任务…';
    }

    // If no reading today, prompt to draw
    if (!reading || !reading.cards) {
      return taskLine + ' 还没抽牌呢。先看看今天的运势再来安排也不迟。';
    }

    var cards = reading.cards;
    var uprightCount = 0;
    var reversedCount = 0;
    var specialNames = [];
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].position === 'upright') uprightCount++;
      else reversedCount++;
      specialNames.push(cards[i].name);
    }

    var boost = '';
    var energy = '';

    // Check for special cards
    var hasSun = specialNames.indexOf('太阳') !== -1;
    var hasStar = specialNames.indexOf('星星') !== -1;
    var hasWorld = specialNames.indexOf('世界') !== -1;
    var hasDeath = specialNames.indexOf('死神') !== -1;
    var hasTower = specialNames.indexOf('高塔') !== -1;
    var hasDevil = specialNames.indexOf('恶魔') !== -1;

    if (hasSun || hasStar || hasWorld) {
      energy = 'positive';
      boost = '运势在帮你——';
    } else if (hasDeath || hasTower || hasDevil) {
      energy = 'gentle';
      boost = '我知道今天不太轻松——';
    } else if (uprightCount >= 2) {
      energy = 'positive';
      boost = '今天牌不错——';
    } else if (reversedCount >= 2) {
      energy = 'gentle';
      boost = '牌说今天不用急——';
    } else {
      energy = 'neutral';
      boost = '牌有好有坏——';
    }

    if (energy === 'positive' && taskCount > 0) {
      return taskLine + ' ' + boost + '趁势搞定一个吧。';
    } else if (energy === 'gentle' && taskCount > 0) {
      return taskLine + ' ' + boost + '但哪怕只签到一个，也算没辜负今天。';
    } else if (energy === 'neutral' && taskCount > 0) {
      return taskLine + ' ' + boost + '挑一个简单的试试手气。';
    }
    return taskLine + ' ' + boost + '设个小任务试试吧。';
  },

  _addNewTask: function() {
    var input = document.getElementById('task-create-input');
    var days = this._taskDaysPicker.get();
    var title = input.value.trim();
    if (!title) return;
    addTask(title, Math.min(Math.max(days, 1), 7));
    input.value = '';
    this._taskDaysPicker.set(3);
    document.getElementById('task-create-overlay').classList.add('hidden');
    this._renderTasks();
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
    var affection = getAffection();

    document.getElementById('affection-bar-fill').style.width = affection + '%';
    document.getElementById('affection-value').textContent = affection;

    // Affection tooltip with relationship stage
    var tip = document.getElementById('affection-tooltip');
    if (tip) {
      // Update stage line on each render
      var stageEl = tip.querySelector('.tooltip-stage');
      if (stageEl) stageEl.innerHTML = this._getRelationshipStageHTML();
    } else {
      var wrapper = document.querySelector('.affection-bar-wrapper');
      tip = document.createElement('div');
      tip.className = 'affection-tooltip';
      tip.id = 'affection-tooltip';
      tip.innerHTML =
        '<div class="tooltip-stage">' + this._getRelationshipStageHTML() + '</div>' +
        '<div class="tooltip-divider"></div>' +
        '<strong>好感度怎么涨？</strong><br>' +
        '🔮 每天抽牌 <strong>+3</strong><br>' +
        '✍️ 填行为记录 <strong>+1/条</strong>（每天最多4）<br>' +
        '📋 任务签到 <strong>+3</strong><br>' +
        '⏳ 陪伴完成 <strong>+2</strong><br>' +
        '<span class="tooltip-secret">😾 戳 Niko 也有惊喜…</span><br>' +
        '<em style="color:var(--gold-dim)">—— Niko</em>';
      wrapper.appendChild(tip);
    }
  },

  _getRelationshipStageHTML: function() {
    var aff = getAffection();
    if (aff >= 67) {
      return '💝 <strong>关系：羁绊·深心</strong><br><span style="font-size:11px;color:var(--text2)">Niko 偶尔说漏真心话…虽然立刻会收回去。</span>';
    } else if (aff >= 34) {
      return '💜 <strong>关系：羁绊·半心</strong><br><span style="font-size:11px;color:var(--text2)">吐槽里开始带了温度，"但是"后面是真话。</span>';
    } else {
      return '🐱 <strong>关系：初识</strong><br><span style="font-size:11px;color:var(--text2)">标准的傲娇距离感——关心都包装在嫌弃里。</span>';
    }
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

    // Gather data for this month — simple: drawn or not
    var readings = getDailyReadings();
    var dateLevels = {};
    var todayStr = getTodayDate();

    for (var d = 1; d <= daysInMonth; d++) {
      var dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      var reading = null;
      for (var r = 0; r < readings.length; r++) {
        if (readings[r].date === dateStr) { reading = readings[r]; break; }
      }
      dateLevels[dateStr] = reading ? 1 : 0;
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

      cellsHtml += '<div class="calendar-cell ' + levelClass + todayClass + '" data-date="' + dateStr + '" title="' + getDateDisplay(dateStr) + '">' + d + '</div>';
    }

    container.innerHTML =
      '<div class="calendar-month-label">' + monthLabel + '</div>' +
      '<div class="calendar-grid">' + headerHtml + cellsHtml + '</div>' +
      '<div class="calendar-legend">' +
        '<span class="legend-cell empty" style="background:rgba(255,255,255,.03)"></span> 无' +
        '<span class="legend-cell" style="background:rgba(201,169,110,.25)"></span> 抽牌' +
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

    emoji.innerHTML = '<img src="images/niko-portrait.svg" class="niko-status-portrait" alt="Niko">';

    var statusLines = [];
    // Weather at top if available
    if (this._weatherData && !this._weatherData.error && this._weatherData.weather) {
      var w = this._weatherData;
      var weatherIcon = w.rainChance >= 50 ? '🌧' : w.temp >= 30 ? '☀️' : w.temp <= 5 ? '❄️' : '⛅';
      statusLines.push(weatherIcon + ' ' + (w.city || '当前') + ' ' + w.weather + ' ' + w.temp + '°C');
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

  _getNikoObservation: function() {
    var observations = [];

    // 1. Behavior patterns (7 days)
    var recentBehaviors = getRecentBehaviors(7);
    var domainCounts = { clothing: 0, food: 0, living: 0, transport: 0 };
    var fillDays = 0;
    for (var i = 0; i < recentBehaviors.length; i++) {
      var b = recentBehaviors[i];
      if (!b.submittedAt) continue;
      fillDays++;
      for (var key in b.domains) {
        if (b.domains[key] && b.domains[key].note) domainCounts[key]++;
      }
    }
    var bestDomain = '';
    var worstDomain = '';
    var bestCount = 0, worstCount = 99;
    var domainLabels = { clothing: '穿衣', food: '饮食', living: '居家', transport: '出行' };
    for (var dk in domainCounts) {
      if (domainCounts[dk] > bestCount) { bestCount = domainCounts[dk]; bestDomain = dk; }
      if (domainCounts[dk] < worstCount) { worstCount = domainCounts[dk]; worstDomain = dk; }
    }
    if (fillDays >= 3 && bestCount >= 3) {
      observations.push('最近 7 天你填了 ' + fillDays + ' 次记录…「' + domainLabels[bestDomain] + '」填得最勤。还不错。');
    }
    if (worstCount <= 1 && fillDays >= 3) {
      observations.push('这 7 天「' + domainLabels[worstDomain] + '」几乎没填——我不是催你，只是刚好看到。');
    }

    // 2. Task progress
    var tasks = getTasks();
    var activeTasks = tasks.filter(function(t) { return !t.done; });
    var urgentTasks = activeTasks.filter(function(t) {
      return getDateOffset(getTodayDate(), 1) >= t.deadline;
    });
    if (urgentTasks.length > 0) {
      observations.push('你有个任务「' + urgentTasks[0].title + '」快截止了——自己记得吧？');
    } else if (activeTasks.length > 0) {
      var bestTask = activeTasks.sort(function(a, b) { return b.checkedDays.length - a.checkedDays.length; })[0];
      var pct = Math.round(bestTask.checkedDays.length / bestTask.days * 100);
      if (pct >= 50) {
        observations.push('「' + bestTask.title + '」进度 ' + pct + '% 了。继续。');
      }
    }
    var doneTasks = tasks.filter(function(t) { return t.done; });
    if (doneTasks.length > 0 && fillDays >= 3) {
      observations.push('你已经完成了 ' + doneTasks.length + ' 个任务。不是表扬——就是陈述事实。');
    }

    // 3. Mood trends (7 days)
    var moods = getMoodHistory(7);
    if (moods.length >= 3) {
      var moodCounts = {};
      for (var m = 0; m < moods.length; m++) {
        var md = moods[m].mood;
        moodCounts[md] = (moodCounts[md] || 0) + 1;
      }
      var topMood = '', topMoodCount = 0;
      var moodLabels = { happy: '开心', calm: '平静', tired: '疲惫', anxious: '焦虑', sad: '难过', excited: '兴奋' };
      for (var mk in moodCounts) {
        if (moodCounts[mk] > topMoodCount) { topMoodCount = moodCounts[mk]; topMood = mk; }
      }
      if (topMood === 'anxious' || topMood === 'tired') {
        observations.push('最近 7 天你选了 ' + topMoodCount + ' 次' + (moodLabels[topMood] || topMood) + '…要看看牌吗？还是想聊聊。');
      } else if (topMood === 'happy' || topMood === 'excited') {
        observations.push('最近心情看起来不错——' + topMoodCount + ' 天的好状态。继续保持。');
      }
    }

    // 4. Weather
    if (this._weatherData && !this._weatherData.error) {
      var w = this._weatherData;
      if (w.rainChance >= 50) {
        observations.push('今天' + (w.city || '这里') + w.rainChance + '% 概率下雨——出行注意。');
      } else if (w.temp >= 33) {
        observations.push('今天 ' + w.temp + '°C…别中暑。多喝水。');
      } else if (w.temp <= 5) {
        observations.push('外面只有 ' + w.temp + '°C。穿厚点出门——不是关心你。');
      }
    }

    if (observations.length === 0) {
      observations.push('最近 7 天没什么特别的…多来这里转转，我才好观察你。');
    }

    // Pick one randomly
    return observations[Math.floor(Math.random() * observations.length)];
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

      // Inject Niko observation card
      var oldObserve = submitArea.querySelector('.niko-observe');
      if (oldObserve) oldObserve.parentNode.removeChild(oldObserve);
      var observeCard = document.createElement('div');
      observeCard.className = 'niko-observe';
      observeCard.innerHTML =
        '<div class="niko-observe-label">🐱 七日观察</div>' + this._getNikoObservation();
      submitArea.appendChild(observeCard);
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
            'placeholder="' + domain.question + '" ' +
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

    // Clean up reveal area from previous draw
    var oldReveal = document.getElementById('card-reveal-area');
    if (oldReveal && oldReveal.parentNode) oldReveal.parentNode.removeChild(oldReveal);

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

    // Show click hint
    var hint = document.createElement('div');
    hint.className = 'click-hint';
    hint.id = 'click-hint';
    hint.innerHTML = '<span class="click-hint-text">点击任意位置继续…</span><span class="click-hint-dot">▼</span>';
    document.getElementById('draw-overlay').appendChild(hint);

    // Show first bubble
    this._addChatBubble(this._messageQueue[0]);
    this._messageIndex = 1;

    // Disable cards until all messages shown
    this._cardsLocked = true;

    // Click anywhere on overlay to advance
    var _dt = this;
    var overlay = document.getElementById('draw-overlay');
    this._drawClickHandler = function(e) {
      // Don't advance if clicking buttons
      if (e.target.closest('.draw-actions') || e.target.closest('.selected-zone')) return;
      _dt._advanceChat();
    };
    overlay.addEventListener('click', this._drawClickHandler);

    // Build fan deck (ensure visible)
    var fanDeck = document.getElementById('fan-deck');
    fanDeck.style.opacity = '1';
    fanDeck.style.transition = '';
    this._buildFanDeck();

    // Reset selected zone
    document.getElementById('selected-count').textContent = '0';
    document.getElementById('selected-slots').innerHTML =
      '<div class="selected-slot"><span class="card-back-pattern">✦</span></div>' +
      '<div class="selected-slot"><span class="card-back-pattern">✦</span></div>' +
      '<div class="selected-slot"><span class="card-back-pattern">✦</span></div>';

    // Reset redraw count
    this._redrawLeft = 1;

    var confirmBtn = document.getElementById('btn-confirm-draw');
    confirmBtn.disabled = true;
    confirmBtn.textContent = '🔮 确认抽牌';
    confirmBtn.setAttribute('data-action', 'draw');

    var resetBtn = document.getElementById('btn-reset-draw');
    resetBtn.innerHTML = '🔄 重新选择 <span class="redraw-badge" id="redraw-badge">×' + this._redrawLeft + '</span>';
    resetBtn.disabled = false;
    resetBtn.style.opacity = '1';

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

    // Remove click hint on first interaction
    var hint = document.getElementById('click-hint');
    if (hint) { hint.style.opacity = '0'; hint.style.transition = 'opacity .4s ease'; }

    // Last message shown — fade out chat, unlock cards
    if (this._messageIndex >= this._messageQueue.length) {
      this._cardsLocked = false;
      if (hint && hint.parentNode) hint.parentNode.removeChild(hint);
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
    this._redrawLeft--;

    // Kill any pending transition timeout from previous draw
    if (this._revealTimeout) {
      clearTimeout(this._revealTimeout);
      this._revealTimeout = null;
    }

    // Update badge
    var badge = document.getElementById('redraw-badge');
    if (badge) badge.textContent = '×' + this._redrawLeft;

    // Disable reset if no redraws left
    if (this._redrawLeft <= 0) {
      var resetBtn = document.getElementById('btn-reset-draw');
      resetBtn.disabled = true;
      resetBtn.style.opacity = '.35';
    }

    // Undo today's reading — remove from storage and revert collection
    var todayReading = getTodayReading();
    if (todayReading && todayReading.cards) {
      // Remove first draw's cards from collection
      var unlocked = getUnlockedCards();
      for (var c = 0; c < todayReading.cards.length; c++) {
        var cid = todayReading.cards[c].cardId;
        var idx = unlocked.indexOf(cid);
        if (idx !== -1) unlocked.splice(idx, 1);
      }
      storageSet('niko_unlockedCards', unlocked);
    }
    var readings = getDailyReadings();
    readings = readings.filter(function(r) { return r.date !== getTodayDate(); });
    storageSet('niko_dailyReadings', readings);

    // Remove reveal area and hint
    var revealArea = document.getElementById('card-reveal-area');
    if (revealArea && revealArea.parentNode) revealArea.parentNode.removeChild(revealArea);
    var fanDeck = document.getElementById('fan-deck');
    fanDeck.style.opacity = '1';
    fanDeck.style.transition = '';
    var hintEl = document.getElementById('click-hint');
    if (hintEl && hintEl.parentNode) hintEl.parentNode.removeChild(hintEl);

    // Restore slots visibility
    var slots = document.querySelectorAll('#selected-slots .selected-slot');
    for (var s = 0; s < slots.length; s++) {
      slots[s].style.opacity = '1';
      slots[s].style.transition = '';
    }

    // Show chat again with brief re-draw message
    var chatEl = document.getElementById('draw-chat');
    chatEl.style.display = '';
    chatEl.style.opacity = '1';
    chatEl.style.transition = '';
    this._clearChat();
    this._addChatBubble('…好吧，最后一次。认真选。');

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
    document.getElementById('btn-confirm-draw').setAttribute('data-action', 'draw');
    document.getElementById('btn-confirm-draw').textContent = '🔮 确认抽牌';
  },

  _confirmDraw: function() {
    if (this.selectedFanCards.length !== 3 || this.isDrawing) return;
    this.isDrawing = true;

    var _this = this;

    // Draw the 3 actual cards
    var drawnCards = drawThreeCards();

    // Save to storage
    saveTodayReading(drawnCards);

    // Affection: daily draw +3
    var affResult = addAffection(3, 'draw');
    if (affResult.added > 0) {
      _this.renderTopBar();
      _this._showAffectionPopup(affResult.added, '🔮');
    }

    // Update Niko state
    var state = getNikoState();
    state.totalDraws = (state.totalDraws || 0) + 1;
    updateNikoState(state);

    // Unlock cards in collection
    for (var i = 0; i < drawnCards.length; i++) {
      unlockCard(drawnCards[i].cardId);
    }

    // Reveal: cards fly out from slots, grow, show names
    this._addChatBubble('命运的丝线已经牵好了…来看看你抽到了什么——');

    setTimeout(function() {
      var fanDeck = document.getElementById('fan-deck');
      fanDeck.style.opacity = '0';
      fanDeck.style.transition = 'opacity .5s ease';

      // Create reveal area for 3 big cards
      var revealArea = document.createElement('div');
      revealArea.className = 'card-reveal-area';
      revealArea.id = 'card-reveal-area';
      document.getElementById('draw-overlay-content').appendChild(revealArea);

      // Animate cards flying out one by one
      var slots = document.querySelectorAll('#selected-slots .selected-slot');
      for (var s = 0; s < 3; s++) {
        (function(idx, card) {
          setTimeout(function() {
            // Hide the slot
            slots[idx].style.opacity = '0';
            slots[idx].style.transition = 'opacity .3s ease';

            // Create flying card
            var flyCard = document.createElement('div');
            flyCard.className = 'reveal-fly-card';
            flyCard.style.animationDelay = '0s';
            flyCard.innerHTML =
              '<div class="reveal-card-inner' + (card.position === 'reversed' ? ' reversed' : '') + '">' +
                '<img src="images/tarot/' + card.cardId + '.jpg" class="reveal-card-img' + (card.position === 'reversed' ? ' reversed-img' : '') + '">' +
                '<div class="reveal-card-name">' + card.name + '</div>' +
                '<div class="reveal-card-pos ' + (card.position === 'upright' ? 'tag-upright' : 'tag-reversed') + '">' +
                  SPREAD_POSITIONS[idx].title + ' · ' + (card.position === 'upright' ? '正位' : '逆位') +
                '</div>' +
              '</div>';
            revealArea.appendChild(flyCard);

            // Niko short line
            _this._addChatBubble(NikoDialogue.revealLine(idx));
          }, idx * 900);
        })(s, drawnCards[s]);
      }

      // Check milestone
      var milestone = NikoDialogue.checkAffectionMilestone(state.totalDraws);
      if (milestone) {
        setTimeout(function() {
          _this._addChatBubble(milestone);
        }, 3 * 900 + 500);
      }

      // Change confirm button to "enter main view"
      _this._revealTimeout = setTimeout(function() {
        var btn = document.getElementById('btn-confirm-draw');
        btn.textContent = '✨ 进入今日运势';
        btn.disabled = false;
        btn.setAttribute('data-action', 'enter');
      }, 3 * 900 + 1200);

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

    // Affection: +1 per matched domain (max 4/day)
    var matchedCount = 0;
    for (var dk in domains) { if (domains[dk] && domains[dk].note) matchedCount++; }
    for (var m = 0; m < matchedCount; m++) {
      var affR = addAffection(1, 'behavior');
      if (affR.added > 0 && m === matchedCount - 1) {
        this.renderTopBar();
        this._showAffectionPopup(matchedCount, '✍️');
      }
    }

    // Re-render responses section
    var section = document.getElementById('lane2-responses-section');
    section.classList.remove('hidden');
    this.renderNikoResponses();

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
      '<span class="niko-comment-avatar"><img src="images/niko-portrait.svg" class="bubble-avatar-img" alt="Niko"></span>' +
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
      '<div class="milestone-stat"><div class="milestone-stat-num">' + readings.length + '</div><div class="milestone-stat-label">抽牌天数</div></div>' +
      '<div class="milestone-stat"><div class="milestone-stat-num">' + state.consecutiveActiveDays + '</div><div class="milestone-stat-label">连续天数</div></div>' +
      '<div class="milestone-stat"><div class="milestone-stat-num">' + getUnlockedCards().length + '</div><div class="milestone-stat-label">收集牌数</div></div>' +
      '<div class="milestone-stat"><div class="milestone-stat-num">' + moods.length + '</div><div class="milestone-stat-label">心情记录</div></div>' +
      '<div class="milestone-stat"><div class="milestone-stat-num">' + (storageGet('niko_companionSessions', 0)) + '</div><div class="milestone-stat-label">陪伴次数</div></div>';

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

  _checkAffectionMilestones: function() {
    // Milestones are now reflected in the tooltip via _getRelationshipStageHTML
  },

  _showAffectionPopup: function(amount, icon) {
    var wrapper = document.querySelector('.affection-bar-wrapper');
    if (!wrapper) return;
    var popup = document.createElement('div');
    popup.className = 'affection-popup';
    popup.textContent = '+' + amount + ' ' + (icon || '✨');
    wrapper.style.position = 'relative';
    wrapper.appendChild(popup);
    setTimeout(function() { if (popup.parentNode) popup.parentNode.removeChild(popup); }, 2100);

    // Check milestones
    this._checkAffectionMilestones();

    // Pulse bar
    var fill = document.getElementById('affection-bar-fill');
    fill.style.transform = 'scaleX(1.03)';
    fill.style.transition = 'transform .2s ease';
    setTimeout(function() { fill.style.transform = 'scaleX(1)'; fill.style.transition = 'transform .4s ease'; }, 200);
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
      '<div class="bubble-avatar"><img src="images/niko-portrait.svg" class="bubble-avatar-img" alt="Niko"></div>' +
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
      var action = this.getAttribute('data-action');
      if (action === 'enter') {
        _this.phase = 'main';
        _this.currentReading = getTodayReading();
        _this.currentBehavior = getTodayBehavior();
        _this.viewDate = getTodayDate();
        _this.isToday = true;
        document.getElementById('draw-overlay').classList.add('hidden');
        _this.renderMainView();
        _this.renderAIReading();
      } else {
        _this._confirmDraw();
      }
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

    document.getElementById('btn-import-data').addEventListener('click', function() {
      document.getElementById('import-file-input').click();
    });

    document.getElementById('import-file-input').addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        try {
          var data = JSON.parse(ev.target.result);
          if (!data.readings && !data.nikoState) { alert('文件格式不对哦～'); return; }
          if (!confirm('确定要导入这份备份吗？当前数据将被覆盖。')) return;
          // Restore all data
          if (data.readings) localStorage.setItem('niko_dailyReadings', JSON.stringify(data.readings));
          if (data.behaviors) localStorage.setItem('niko_dailyBehaviors', JSON.stringify(data.behaviors));
          if (data.nikoState) localStorage.setItem('niko_nikoState', JSON.stringify(data.nikoState));
          if (data.unlockedCards) localStorage.setItem('niko_unlockedCards', JSON.stringify(data.unlockedCards));
          if (data.config) localStorage.setItem('niko_config', JSON.stringify(data.config));
          localStorage.removeItem('niko_weatherCache');
          localStorage.removeItem('niko_chatHistory');
          localStorage.removeItem('niko_moodHistory');
          alert('备份已恢复！即将刷新页面。');
          location.reload();
        } catch (e) {
          alert('导入失败：' + e.message);
        }
      };
      reader.readAsText(file);
      this.value = '';
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
      // If today hasn't been drawn yet → start daily draw
      if (!hasDrawnToday()) {
        _this.phase = 'draw';
        _this.showDrawOverlay();
        return;
      }

      // Already drawn today → easter egg
      var affR2 = addAffection(1, 'poke');
      if (affR2.added > 0) {
        _this.renderTopBar();
        _this._showAffectionPopup(1, '😾');
      }
      if (Math.random() < 0.15) {
        var reaction = NikoDialogue.exposedReaction();
        _this._showToast('🙀', reaction);
      } else {
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

    // ---- Companion mode button ----
    document.getElementById('btn-chat-challenge').addEventListener('click', function() {
      var panel = document.getElementById('companion-panel');
      if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        document.getElementById('companion-start-area').classList.remove('hidden');
        document.getElementById('companion-active-area').classList.add('hidden');
      } else {
        panel.classList.add('hidden');
      }
    });

    // ---- Companion close ----
    document.getElementById('btn-close-companion').addEventListener('click', function() {
      document.getElementById('companion-panel').classList.add('hidden');
    });

    // ---- Scroll picker helper ----
    function initScrollPicker(pickerId, min, max, step, format) {
      var picker = document.getElementById(pickerId);
      var valueEl = picker.querySelector('.scroll-picker-value');
      var upBtn = picker.querySelector('.scroll-picker-btn.up');
      var downBtn = picker.querySelector('.scroll-picker-btn.down');

      function setVal(v) {
        v = Math.max(min, Math.min(max, v));
        valueEl.setAttribute('data-value', v);
        valueEl.textContent = format ? format(v) : (v < 10 ? '0' + v : v);
      }
      function getVal() { return parseInt(valueEl.getAttribute('data-value')) || min; }

      upBtn.addEventListener('click', function() {
        var v = getVal() + step;
        if (v > max && pickerId === 'comp-hour-picker') v = min;
        setVal(v);
      });
      downBtn.addEventListener('click', function() {
        var v = getVal() - step;
        if (v < min && pickerId === 'comp-hour-picker') v = max;
        setVal(v);
      });
      return { set: setVal, get: getVal };
    }

    _this._hourPicker = initScrollPicker('comp-hour-picker', 0, 23, 1, function(v) { return (v < 10 ? '0' : '') + v; });
    _this._minPicker = initScrollPicker('comp-min-picker', 0, 59, 1, function(v) { return (v < 10 ? '0' : '') + v; });
    _this._taskDaysPicker = initScrollPicker('task-days-picker', 1, 7, 1);

    // Live validation for companion start button
    function updateCompanionStartBtn() {
      var btn = document.getElementById('btn-start-companion');
      var activePreset = document.querySelector('#companion-durations .companion-preset.active');
      var hasPreset = activePreset && activePreset.textContent.indexOf('自定义') === -1;
      var total = hasPreset ? parseInt(activePreset.getAttribute('data-min')) : (_this._hourPicker.get() * 60 + _this._minPicker.get());
      btn.disabled = total <= 0;
    }
    // Watch pickers
    document.getElementById('comp-hour-picker').addEventListener('click', updateCompanionStartBtn);
    document.getElementById('comp-min-picker').addEventListener('click', updateCompanionStartBtn);
    // ---- Companion duration presets ----
    var compPresets = document.querySelectorAll('#companion-durations .companion-preset');
    for (var cp = 0; cp < compPresets.length; cp++) {
      compPresets[cp].addEventListener('click', function() {
        for (var c = 0; c < compPresets.length; c++) compPresets[c].classList.remove('active');
        this.classList.add('active');
        document.getElementById('companion-pickers').style.display = 'none';
      });
    }
    // Clicking any preset deselects custom — clicking the "+" area shows pickers
    // Actually, let the user click a "自定义" button instead
    // For now: if no preset active, show pickers
    // Add a "自定义" preset
    var customPreset = document.createElement('button');
    customPreset.className = 'companion-preset';
    customPreset.textContent = '自定义';
    customPreset.addEventListener('click', function() {
      for (var c = 0; c < compPresets.length; c++) compPresets[c].classList.remove('active');
      customPreset.classList.add('active');
      document.getElementById('companion-pickers').style.display = 'flex';
    });
    document.getElementById('companion-durations').appendChild(customPreset);

    // Now bind validation after all presets exist
    for (var cp2 = 0; cp2 < compPresets.length; cp2++) {
      compPresets[cp2].addEventListener('click', function() { setTimeout(updateCompanionStartBtn, 50); });
    }
    // Also add customPreset to the NodeList's click listener
    customPreset.addEventListener('click', function() { setTimeout(updateCompanionStartBtn, 50); });

    // ---- Companion categories ----
    var compCats = document.querySelectorAll('#companion-categories .companion-cat');
    for (var cc = 0; cc < compCats.length; cc++) {
      compCats[cc].addEventListener('click', function() {
        for (var c = 0; c < compCats.length; c++) compCats[c].classList.remove('active');
        this.classList.add('active');
      });
    }

    // ---- Start companion ----
    document.getElementById('btn-start-companion').addEventListener('click', function() {
      _this._startCompanion();
    });

    // ---- Stop companion ----
    document.getElementById('btn-stop-companion').addEventListener('click', function() {
      _this._stopCompanion(true);
    });

    // ---- Tasks panel ----
    document.getElementById('btn-open-tasks').addEventListener('click', function() {
      _this._openTasksPanel();
    });
    document.getElementById('btn-close-tasks').addEventListener('click', function() {
      document.getElementById('tasks-panel').classList.add('hidden');
    });
    // Task creation flow
    document.getElementById('btn-show-task-create').addEventListener('click', function() {
      document.getElementById('task-create-overlay').classList.remove('hidden');
      document.getElementById('task-create-input').focus();
    });
    document.getElementById('btn-cancel-task-create').addEventListener('click', function() {
      document.getElementById('task-create-overlay').classList.add('hidden');
    });
    document.getElementById('btn-confirm-task-create').addEventListener('click', function() {
      _this._addNewTask();
    });
    document.getElementById('task-create-input').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') _this._addNewTask();
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

    // ---- Background brightness slider ----
    var dimSlider = document.getElementById('chat-dim-slider');
    var dimRange = document.getElementById('chat-dim-range');
    var dimVal = document.getElementById('chat-dim-val');
    var nikoBg = document.getElementById('chat-niko-bg');

    document.getElementById('btn-chat-dim').addEventListener('click', function() {
      if (dimSlider.classList.contains('hidden')) {
        dimSlider.classList.remove('hidden');
      } else {
        dimSlider.classList.add('hidden');
      }
    });

    dimRange.addEventListener('input', function() {
      var v = parseInt(this.value);
      dimVal.textContent = v + '%';
      var img = nikoBg.querySelector('img');
      if (img) img.style.opacity = (v / 100);
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
