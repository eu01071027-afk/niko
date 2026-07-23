// ============================================================
// weatherService.js — 天气 & 定位（IP + Open-Meteo，免费无 key）
// ============================================================

var WeatherService = {
  _cacheKey: 'niko_weatherCache',

  // Weather code → Chinese description
  CODE_MAP: {
    0: '晴天', 1: '大部晴', 2: '多云', 3: '阴天',
    45: '有雾', 48: '雾凇',
    51: '毛毛雨', 53: '小雨', 55: '中雨',
    61: '小雨', 63: '中雨', 65: '大雨',
    71: '小雪', 73: '中雪', 75: '大雪',
    80: '阵雨', 81: '中阵雨', 82: '大阵雨',
    95: '雷暴', 96: '冰雹雷暴', 99: '强冰雹雷暴'
  },

  // Get cached or fetch fresh
  getWeather: function() {
    var cache = storageGet(this._cacheKey, null);
    var today = getTodayDate();
    if (cache && cache.date === today) {
      return Promise.resolve(cache);
    }
    return this._fetchFresh();
  },

  _fetchFresh: function() {
    var _this = this;
    return this._getLocation().then(function(loc) {
      var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + loc.lat +
        '&longitude=' + loc.lon +
        '&current=temperature_2m,weather_code,is_day' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
        '&timezone=auto&forecast_days=1';

      return fetch(url).then(function(r) { return r.json(); }).then(function(data) {
        var code = data.current.weather_code;
        var result = {
          date: getTodayDate(),
          city: loc.city,
          temp: Math.round(data.current.temperature_2m),
          weather: _this.CODE_MAP[code] || '未知',
          isDay: data.current.is_day === 1,
          high: Math.round(data.daily.temperature_2m_max[0]),
          low: Math.round(data.daily.temperature_2m_min[0]),
          rainChance: data.daily.precipitation_probability_max[0] || 0,
          raw: code
        };
        storageSet(_this._cacheKey, result);
        return result;
      });
    }).catch(function() {
      return { date: getTodayDate(), city: '', temp: 0, weather: '', isDay: true, high: 0, low: 0, rainChance: 0, raw: -1, error: true };
    });
  },

  _getLocation: function() {
    var _this = this;

    // Method 1: Browser geolocation (most reliable, asks permission once)
    function tryGeolocation() {
      return new Promise(function(resolve) {
        if (!navigator.geolocation) { resolve(null); return; }
        navigator.geolocation.getCurrentPosition(
          function(pos) { resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, source: 'gps' }); },
          function() { resolve(null); },
          { timeout: 5000, maximumAge: 600000 }
        );
      });
    }

    // Method 2: IP-based fallback (multiple services)
    function tryIP(idx) {
      var sources = [
        { url: 'https://api.ip.sb/geoip', parse: function(d) { return { city: d.city || d.region || '', lat: d.latitude || 35, lon: d.longitude || 105 }; } },
        { url: 'https://ipapi.co/json/', parse: function(d) { return { city: d.city || d.region || '', lat: d.latitude || 35, lon: d.longitude || 105 }; } }
      ];
      if (idx >= sources.length) return Promise.resolve({ city: '', lat: 35, lon: 105 });
      var src = sources[idx];
      return fetch(src.url, { signal: AbortSignal.timeout(5000) })
        .then(function(r) { return r.json(); })
        .then(function(d) { return src.parse(d); })
        .catch(function() { return tryIP(idx + 1); });
    }

    return tryGeolocation().then(function(gps) {
      if (gps) {
        // Got GPS coords, reverse-geocode city via Open-Meteo geocoding
        return fetch('https://geocoding-api.open-meteo.com/v1/search?latitude=' + gps.lat + '&longitude=' + gps.lon + '&count=1&language=zh')
          .then(function(r) { return r.json(); })
          .then(function(d) {
            var city = (d.results && d.results[0]) ? (d.results[0].admin1 || d.results[0].name || '') : '';
            return { city: city, lat: gps.lat, lon: gps.lon };
          })
          .catch(function() { return { city: '', lat: gps.lat, lon: gps.lon }; });
      }
      return tryIP(0);
    });
  },

  // Generate weather line for Niko's greeting
  getWeatherGreeting: function(weather) {
    if (weather.error || !weather.weather) return '';

    var lines = [];
    var city = weather.city ? weather.city + '今天' : '今天';

    // Rain warning
    if (weather.rainChance >= 50 && (weather.raw >= 51 || weather.raw >= 61 || weather.raw >= 80)) {
      lines.push(city + '要下雨…带伞。不是关心你，只是你上次淋湿了回来肯定又要抱怨。');
    } else if (weather.rainChance >= 50) {
      lines.push(city + '有' + weather.rainChance + '%的概率下雨。信不信由你，反正我带不了伞——我是猫。');
    }

    // Temperature extremes
    if (weather.temp >= 35) {
      lines.push(city + weather.temp + '度…别中暑了。多喝水。我才不是在关心你。');
    } else if (weather.temp <= 0) {
      lines.push(city + weather.temp + '度。多穿点。你冻坏了我还得重新找人来抽牌…多麻烦。');
    } else if (weather.temp <= 10) {
      lines.push(city + '只有' + weather.temp + '度。穿厚点出门，听到没？');
    }

    return lines.length > 0 ? lines[Math.floor(Math.random() * lines.length)] : '';
  },

  // Inject weather into Niko's chat system prompt
  getWeatherContext: function(weather) {
    if (weather.error || !weather.weather) return '';
    return '用户所在地天气：' + (weather.city || '未知城市') + ' ' + weather.weather +
      ' ' + weather.temp + '°C（' + weather.low + '~' + weather.high + '°C）' +
      ' 降雨概率' + weather.rainChance + '%。';
  }
};
