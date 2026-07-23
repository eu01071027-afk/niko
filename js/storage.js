// ============================================================
// storage.js — localStorage 读写封装
// Niko 塔罗日签 · 数据持久化层
// ============================================================

const STORAGE_KEYS = {
  dailyReadings:  'niko_dailyReadings',
  dailyBehaviors: 'niko_dailyBehaviors',
  nikoState:      'niko_nikoState',
  config:         'niko_config',
};

function storageGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error('storageGet error for ' + key + ':', e);
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('storageSet error for ' + key + ':', e);
  }
}

// ============================================================
// Daily Readings
// ============================================================

function getDailyReadings() {
  return storageGet(STORAGE_KEYS.dailyReadings, []);
}

function getTodayReading() {
  var today = getTodayDate();
  var readings = getDailyReadings();
  for (var i = 0; i < readings.length; i++) {
    if (readings[i].date === today) return readings[i];
  }
  return null;
}

function getReadingByDate(dateStr) {
  var readings = getDailyReadings();
  for (var i = 0; i < readings.length; i++) {
    if (readings[i].date === dateStr) return readings[i];
  }
  return null;
}

function saveTodayReading(cards) {
  var readings = getDailyReadings();
  var today = getTodayDate();
  var filtered = [];
  for (var i = 0; i < readings.length; i++) {
    if (readings[i].date !== today) filtered.push(readings[i]);
  }
  filtered.push({
    date: today,
    cards: cards,
    aiReading: null,
    aiSuggestions: null,
    nikoRemark: null,
    drawnAt: new Date().toISOString()
  });
  storageSet(STORAGE_KEYS.dailyReadings, filtered);
}

function updateReadingAI(dateStr, aiData) {
  var readings = getDailyReadings();
  for (var i = 0; i < readings.length; i++) {
    if (readings[i].date === dateStr) {
      if (aiData.reading) readings[i].aiReading = aiData.reading;
      if (aiData.suggestions) readings[i].aiSuggestions = aiData.suggestions;
      if (aiData.nikoRemark) readings[i].nikoRemark = aiData.nikoRemark;
      storageSet(STORAGE_KEYS.dailyReadings, readings);
      return true;
    }
  }
  return false;
}

function hasDrawnToday() {
  return getTodayReading() !== null;
}

function getAllReadingsSorted() {
  var readings = getDailyReadings();
  readings.sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
  return readings;
}

// ============================================================
// Daily Behaviors
// ============================================================

function getDailyBehaviors() {
  return storageGet(STORAGE_KEYS.dailyBehaviors, []);
}

function getTodayBehavior() {
  var today = getTodayDate();
  var behaviors = getDailyBehaviors();
  for (var i = 0; i < behaviors.length; i++) {
    if (behaviors[i].date === today) return behaviors[i];
  }
  return null;
}

function getBehaviorByDate(dateStr) {
  var behaviors = getDailyBehaviors();
  for (var i = 0; i < behaviors.length; i++) {
    if (behaviors[i].date === dateStr) return behaviors[i];
  }
  return null;
}

function saveTodayBehavior(domains) {
  var behaviors = getDailyBehaviors();
  var today = getTodayDate();
  var existing = null;
  var filtered = [];
  for (var i = 0; i < behaviors.length; i++) {
    if (behaviors[i].date === today) {
      existing = behaviors[i];
    } else {
      filtered.push(behaviors[i]);
    }
  }
  var entry = {
    date: today,
    domains: domains,
    aiResponses: existing ? existing.aiResponses : null,
    aiSummary: existing ? existing.aiSummary : null,
    submittedAt: new Date().toISOString()
  };
  filtered.push(entry);
  storageSet(STORAGE_KEYS.dailyBehaviors, filtered);
}

function updateBehaviorAI(dateStr, aiData) {
  var behaviors = getDailyBehaviors();
  for (var i = 0; i < behaviors.length; i++) {
    if (behaviors[i].date === dateStr) {
      if (aiData.responses) behaviors[i].aiResponses = aiData.responses;
      if (aiData.summary) behaviors[i].aiSummary = aiData.summary;
      storageSet(STORAGE_KEYS.dailyBehaviors, behaviors);
      return true;
    }
  }
  return false;
}

function getRecentBehaviors(days) {
  var behaviors = getDailyBehaviors();
  behaviors.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  return behaviors.slice(0, days);
}

// ============================================================
// Niko State
// ============================================================

function getNikoState() {
  return storageGet(STORAGE_KEYS.nikoState, {
    affection: 0,
    consecutiveActiveDays: 0,
    totalDraws: 0,
    firstVisitDate: null,
    lastInteractionDate: null,
    unlockedMilestones: [],
    nikoDailyTopic: null,
    nikoDailyTopicDate: null,
    lastWeekReviewDate: null
  });
}

function updateNikoState(updates) {
  var state = getNikoState();
  for (var key in updates) {
    if (updates.hasOwnProperty(key)) state[key] = updates[key];
  }
  storageSet(STORAGE_KEYS.nikoState, state);
}

function addUnlockedMilestone(days) {
  var state = getNikoState();
  if (state.unlockedMilestones.indexOf(days) === -1) {
    state.unlockedMilestones.push(days);
    storageSet(STORAGE_KEYS.nikoState, state);
  }
}

function isMilestoneUnlocked(days) {
  var state = getNikoState();
  return state.unlockedMilestones.indexOf(days) !== -1;
}

function setNikoDailyTopic(topic) {
  var state = getNikoState();
  state.nikoDailyTopic = topic;
  state.nikoDailyTopicDate = getTodayDate();
  storageSet(STORAGE_KEYS.nikoState, state);
}

function getNikoDailyTopic() {
  var state = getNikoState();
  if (state.nikoDailyTopicDate === getTodayDate()) {
    return state.nikoDailyTopic;
  }
  return null;
}

// ============================================================
// Affection Calculation
// ============================================================

// ============================================================
// Affection — Event-based (0-100)
// ============================================================

function getAffection() {
  return storageGet('niko_affection', 0);
}

function _getAffectionEvents() {
  var today = getTodayDate();
  var events = storageGet('niko_affectionEvents', {});
  if (events.date !== today) {
    events = { date: today, draw: false, poke: false, tasks: false, companionCount: 0, behaviorMatches: 0 };
  }
  return events;
}

function _saveAffectionEvents(events) {
  storageSet('niko_affectionEvents', events);
}

function addAffection(amount, eventType) {
  var current = getAffection();
  var events = _getAffectionEvents();
  var today = getTodayDate();

  // Daily limits
  if (eventType === 'draw' && events.draw) return { added: 0, total: current };
  if (eventType === 'poke' && events.poke) return { added: 0, total: current };
  if (eventType === 'task' && events.tasks) return { added: 0, total: current };
  if (eventType === 'behavior' && events.behaviorMatches >= 4) return { added: 0, total: current };

  // Apply
  var newTotal = Math.min(current + amount, 100);
  storageSet('niko_affection', newTotal);

  // Check relationship milestones
  if (current < 34 && newTotal >= 34) unlockAchievement('bondMid');
  if (current < 67 && newTotal >= 67) unlockAchievement('bondHigh');
  if (current < 100 && newTotal >= 100) unlockAchievement('bondMax');

  // Track event
  if (eventType === 'draw') events.draw = true;
  if (eventType === 'poke') events.poke = true;
  if (eventType === 'task') events.tasks = true;
  if (eventType === 'behavior') events.behaviorMatches = Math.min((events.behaviorMatches || 0) + 1, 4);
  if (eventType === 'companion') events.companionCount = (events.companionCount || 0) + 1;

  _saveAffectionEvents(events);

  return { added: amount, total: newTotal };
}

// For backward compatibility — called from init
function calculateAffection() {
  return getAffection();
}

// ============================================================
// Relationship Achievements
// ============================================================

// States: 'locked' | 'unlocked' | 'viewed'
function getAchievements() {
  return storageGet('niko_achievements', {
    firstChat: 'locked',
    bondMid: 'locked',
    bondHigh: 'locked',
    bondMax: 'locked'
  });
}

function unlockAchievement(key) {
  var achievements = getAchievements();
  if (achievements[key] !== 'locked') return false;
  achievements[key] = 'unlocked';
  storageSet('niko_achievements', achievements);
  return true;
}

function isAchievementUnlocked(key) {
  var achievements = getAchievements();
  return achievements[key] === 'unlocked' || achievements[key] === 'viewed';
}

function getUnviewedAchievementCount() {
  var achievements = getAchievements();
  var count = 0;
  for (var key in achievements) {
    if (achievements[key] === 'unlocked') count++;
  }
  return count;
}

function markAllAchievementsViewed() {
  var achievements = getAchievements();
  var changed = false;
  for (var key in achievements) {
    if (achievements[key] === 'unlocked') {
      achievements[key] = 'viewed';
      changed = true;
    }
  }
  if (changed) storageSet('niko_achievements', achievements);
}

// ============================================================
// Unlocked Cards (图鉴)
// ============================================================

function getUnlockedCards() {
  return storageGet('niko_unlockedCards', []);
}

function unlockCard(cardId) {
  var unlocked = getUnlockedCards();
  if (unlocked.indexOf(cardId) === -1) {
    unlocked.push(cardId);
    storageSet('niko_unlockedCards', unlocked);
  }
}

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
// App Config
// ============================================================

function getAppConfig() {
  return storageGet(STORAGE_KEYS.config, {
    apiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
    apiKey: 'sk-a64db11f859341f69cb9e25fa8d607cb',
    model: 'deepseek-chat',
    useAI: true,
    theme: 'dark'
  });
}

function saveAppConfig(config) {
  var current = getAppConfig();
  for (var key in config) {
    if (config.hasOwnProperty(key)) current[key] = config[key];
  }
  storageSet(STORAGE_KEYS.config, current);
}

// ============================================================
// Data Export
// ============================================================

function exportAllData() {
  var data = {
    readings: getDailyReadings(),
    behaviors: getDailyBehaviors(),
    nikoState: getNikoState(),
    unlockedCards: getUnlockedCards(),
    config: getAppConfig(),
    exportedAt: new Date().toISOString()
  };
  return JSON.stringify(data, null, 2);
}

function downloadExport() {
  var json = exportAllData();
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'niko-tarot-backup-' + getTodayDate() + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
// Date Helpers
// ============================================================

function getTodayDate() {
  var d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function getYesterdayDate() {
  var d = new Date();
  d.setDate(d.getDate() - 1);
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function getDateDisplay(dateStr) {
  var d = new Date(dateStr + 'T00:00:00');
  var weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return (d.getMonth() + 1) + '月' + d.getDate() + '日 周' + weekdays[d.getDay()];
}

function getDateOffset(dateStr, offsetDays) {
  var d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + offsetDays);
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function isToday(dateStr) {
  return dateStr === getTodayDate();
}

function isSunday(dateStr) {
  var d = new Date(dateStr + 'T00:00:00');
  return d.getDay() === 0;
}

// ============================================================
// Chat History
// ============================================================

function getChatHistory() {
  return storageGet('niko_chatHistory', []);
}

function addChatMessage(role, content) {
  var history = getChatHistory();
  // Keep last 200 messages max
  if (history.length > 200) history = history.slice(-200);
  history.push({
    role: role,
    content: content,
    timestamp: new Date().toISOString()
  });
  storageSet('niko_chatHistory', history);
}

function getRecentChatContext(count) {
  var history = getChatHistory();
  return history.slice(-count);
}

// ============================================================
// 7-Day Memory
// ============================================================

function getMemorySummary() {
  return storageGet('niko_memorySummary', '');
}

function setMemorySummary(summary) {
  storageSet('niko_memorySummary', summary);
  storageSet('niko_memoryDate', getTodayDate());
}

function getMemoryDate() {
  return storageGet('niko_memoryDate', '');
}

// Build a 7-day behavior summary for prompts
function buildBehaviorMemory() {
  var behaviors = getDailyBehaviors();
  behaviors.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  var recent = behaviors.slice(0, 7);
  var parts = [];
  for (var i = 0; i < recent.length; i++) {
    var b = recent[i];
    if (!b.submittedAt) continue;
    var dayParts = [];
    for (var key in b.domains) {
      if (b.domains[key] && b.domains[key].note) {
        dayParts.push(key + '：' + b.domains[key].note);
      }
    }
    if (dayParts.length > 0) {
      parts.push(b.date + ' ' + dayParts.join('；'));
    }
  }
  return parts.length > 0 ? parts.join('\n') : '（暂无记录）';
}

// ============================================================
// Mood Tracking
// ============================================================

function getTodayMood() {
  return storageGet('niko_todayMood', null);
}

function setTodayMood(mood) {
  storageSet('niko_todayMood', { mood: mood, date: getTodayDate() });
  // Also store in mood history
  var moods = storageGet('niko_moodHistory', []);
  moods.push({ mood: mood, date: getTodayDate(), time: new Date().toISOString() });
  if (moods.length > 90) moods = moods.slice(-90);
  storageSet('niko_moodHistory', moods);
}

function getMoodHistory(days) {
  var moods = storageGet('niko_moodHistory', []);
  return moods.slice(-days);
}

// ============================================================
// Challenges
// ============================================================

function getActiveChallenges() {
  return storageGet('niko_challenges', []);
}

function addChallenge(description, days) {
  var challenges = getActiveChallenges();
  var startDate = getTodayDate();
  var endDate = getDateOffset(startDate, days || 3);
  challenges.push({
    id: 'ch_' + Date.now(),
    description: description,
    startDate: startDate,
    endDate: endDate,
    progress: {}
  });
  storageSet('niko_challenges', challenges);
}

function markChallengeDay(challengeId, done) {
  var challenges = getActiveChallenges();
  for (var i = 0; i < challenges.length; i++) {
    if (challenges[i].id === challengeId) {
      challenges[i].progress[getTodayDate()] = done;
      storageSet('niko_challenges', challenges);
      return true;
    }
  }
  return false;
}

function cleanExpiredChallenges() {
  var challenges = getActiveChallenges();
  var today = getTodayDate();
  challenges = challenges.filter(function(c) { return c.endDate >= today; });
  storageSet('niko_challenges', challenges);
}

// ============================================================
// Long-term Tasks
// ============================================================

function getTasks() {
  return storageGet('niko_tasks', []);
}

function addTask(title, days) {
  var tasks = getTasks();
  var created = getTodayDate();
  var deadline = getDateOffset(created, parseInt(days) || 3);
  tasks.push({
    id: 't_' + Date.now(),
    title: title,
    days: parseInt(days) || 3,
    created: created,
    deadline: deadline,
    checkedDays: [],
    done: false
  });
  storageSet('niko_tasks', tasks);
}

function toggleTaskDay(taskId) {
  var tasks = getTasks();
  var today = getTodayDate();
  for (var i = 0; i < tasks.length; i++) {
    if (tasks[i].id === taskId) {
      var idx = tasks[i].checkedDays.indexOf(today);
      if (idx === -1) {
        tasks[i].checkedDays.push(today);
      } else {
        tasks[i].checkedDays.splice(idx, 1);
      }
      // Auto-mark done if all days checked
      var totalDays = tasks[i].days;
      if (tasks[i].checkedDays.length >= totalDays) {
        tasks[i].done = true;
      }
      storageSet('niko_tasks', tasks);
      return true;
    }
  }
  return false;
}

function markTaskDone(taskId) {
  var tasks = getTasks();
  for (var i = 0; i < tasks.length; i++) {
    if (tasks[i].id === taskId) {
      tasks[i].done = !tasks[i].done;
      storageSet('niko_tasks', tasks);
      return true;
    }
  }
  return false;
}

function deleteTask(taskId) {
  var tasks = getTasks();
  tasks = tasks.filter(function(t) { return t.id !== taskId; });
  storageSet('niko_tasks', tasks);
}
