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

function calculateAffection() {
  var state = getNikoState();
  var cd = state.consecutiveActiveDays;
  var total = state.totalDraws;

  // Base: consecutive days (capped at 365)
  var base = Math.min(cd, 365);

  // Bonus: behavior fill rate over last 7 days (any text = filled)
  var behaviors = getDailyBehaviors();
  var filledCount = 0;
  for (var i = 0; i < behaviors.length; i++) {
    var b = behaviors[i];
    var filled = 0;
    if (b.domains) {
      for (var key in b.domains) {
        if (b.domains[key] && b.domains[key].note && b.domains[key].note.trim() !== '') filled++;
      }
      if (filled >= 3) filledCount++;
    }
  }
  var fillBonus = Math.min(filledCount * 3, 30);

  // Total draws bonus
  var drawBonus = Math.min(total, 20);

  var affection = Math.min(base + fillBonus + drawBonus, 100);
  return Math.max(affection, 0);
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
