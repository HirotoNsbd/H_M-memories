/* ==================================================================
   動的エフェクト（控えめ・上品さ重視 / スマホ操作を前提に軽量化）
   - 背景に漂うハート・花びら
   - スクロールに合わせた控えめなパララックス（hero部分）
   - スクロール出現時のスタガー（少しずつ時間差で浮かび上がる）
   すべて prefers-reduced-motion を尊重して自動的にオフになります。
   ================================================================== */
(function(){
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- 1. 漂うハート・花びら ----
  function initPetals(){
    const container = document.getElementById('petals');
    if (!container || reduceMotion) return;

    const symbols = ['♡', '❀', '✦'];
    // スマホでの負荷を抑えるため、画面幅に応じて数を調整
    const count = window.innerWidth < 480 ? 5 : (window.innerWidth < 900 ? 7 : 10);

    for (let i = 0; i < count; i++){
      const el = document.createElement('span');
      el.className = 'petal';
      el.textContent = symbols[i % symbols.length];
      el.style.left = (Math.random() * 100) + '%';
      el.style.fontSize = (0.7 + Math.random() * 0.7) + 'rem';
      el.style.animationDuration = (20 + Math.random() * 16) + 's';
      el.style.animationDelay = (Math.random() * -30) + 's';
      el.style.setProperty('--drift', (Math.random() * 60 - 30) + 'px');
      container.appendChild(el);
    }
  }

  // ---- 2. hero部分の控えめなパララックス ----
  function initParallax(){
    const hero = document.querySelector('.hero');
    if (!hero || reduceMotion) return;

    let ticking = false;
    function update(){
      const rect = hero.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight){
        const progress = Math.min(Math.max(1 - rect.top / window.innerHeight, 0), 1);
        hero.style.setProperty('--parallax', (progress * 26).toFixed(1) + 'px');
      }
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking){ requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  // ---- 3. reveal要素のスタガー（同じ親の中で少しずつ遅れて出現） ----
  function initStagger(){
    const counters = new WeakMap();
    document.querySelectorAll('.reveal').forEach(el => {
      const parent = el.parentElement;
      const idx = counters.get(parent) || 0;
      el.style.transitionDelay = Math.min(idx * 60, 260) + 'ms';
      counters.set(parent, idx + 1);
    });
  }

  // ---- 4. 昼夜モード（サイト全体共通） ----
  // 6:00〜18:00は自動で昼モードにし、ナビのボタンで手動切り替えもできるようにする
  function initDayNightMode(){
    const hour = new Date().getHours();
    document.body.classList.toggle('day-mode', hour >= 6 && hour < 18);

    document.querySelectorAll('[data-day-night-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.body.classList.toggle('day-mode');
      });
    });
  }

  // ---- 5. 雨の日モード（サイト全体共通） ----
  // 現在地（取得できない場合は八王子市）の天気を確認し、雨なら自動でONにする
  const RAIN_FALLBACK_LOCATION = { lat: 35.6553, lon: 139.3242, label: '八王子市' };
  const RAIN_WEATHER_CODES = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82];

  function buildRainDrops(layer){
    if (layer.dataset.built) return;
    layer.dataset.built = '1';
    const count = window.innerWidth < 480 ? 40 : (window.innerWidth < 900 ? 60 : 90);
    for (let i = 0; i < count; i++){
      const d = document.createElement('span');
      d.className = 'drop';
      d.style.left = (Math.random() * 100) + '%';
      d.style.height = (14 + Math.random() * 18) + 'px';
      d.style.animationDuration = (0.7 + Math.random() * 0.6) + 's';
      d.style.animationDelay = (Math.random() * -1.4) + 's';
      layer.appendChild(d);
    }
  }

  function getCurrentPosition(){
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation){ reject(new Error('no geolocation')); return; }
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 });
    });
  }

  async function fetchIsRainy(lat, lon){
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('weather fetch failed');
    const data = await res.json();
    return RAIN_WEATHER_CODES.includes(data.current && data.current.weather_code);
  }

  async function initRainMode(){
    const layer = document.getElementById('rain-layer');
    const toggle = document.querySelector('[data-rain-toggle]');
    if (!layer) return;

    function setRain(on){
      if (on) buildRainDrops(layer);
      layer.classList.toggle('is-on', on);
      if (toggle) toggle.classList.toggle('is-on', on);
    }

    if (toggle){
      toggle.addEventListener('click', () => {
        setRain(!layer.classList.contains('is-on'));
      });
    }

    // ---- すでに判定済みなら、位置情報・天気の再取得はせずキャッシュを使う ----
    // （ページ移動時に wireNavLinks() がこの結果ごとURLハッシュを引き継ぐので、
    //   同じ端末でページを移動しても毎回位置情報を聞かれることはありません）
    const params = new URLSearchParams(location.hash.slice(1));
    const cached = params.get('rain');
    if (cached !== null){
      if (cached === '1') setRain(true);
      return;
    }

    if (reduceMotion) return; // 動きを減らす設定の場合は自動ONにしない（手動操作は可能）

    let lat = RAIN_FALLBACK_LOCATION.lat;
    let lon = RAIN_FALLBACK_LOCATION.lon;
    try {
      const pos = await getCurrentPosition();
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;
    } catch (err) {
      // 位置情報が使えない場合はフォールバック地域のまま
    }

    let rainy = false;
    try {
      rainy = await fetchIsRainy(lat, lon);
      if (rainy) setRain(true);
    } catch (err) {
      // 天気情報が取得できない場合は何もしない（手動操作は引き続き可能）
    }

    // 判定結果をURLハッシュに記録（次のページ移動から再取得しないようにするため）
    params.set('rain', rainy ? '1' : '0');
    history.replaceState(null, '', '#' + params.toString());

    // ナビのリンクも今の判定結果を含めて作り直す（初回だけ判定が非同期のため）
    if (typeof wireNavLinks === 'function') wireNavLinks();
  }

  // ---- 6. 冬季シーズンテーマ（12/1〜1/15限定・サイト全体共通） ----
  // 表示期間はここで定数化。変更したい場合はこの2つだけ書き換えればOK。
  const WINTER_START = { month: 12, day: 1 };  // 12月1日から
  const WINTER_END   = { month: 2,  day: 15 }; // 1月15日まで（年をまたぐ）

  function isWinterSeason(date = new Date()){
    const m = date.getMonth() + 1; // 1〜12
    const d = date.getDate();
    if (m === WINTER_START.month && d >= WINTER_START.day) return true;
    if (m === WINTER_END.month && d <= WINTER_END.day) return true;
    return false;
  }

  function buildSnowflakes(layer){
    if (layer.dataset.built) return;
    layer.dataset.built = '1';
    const symbols = ['❄', '❅', '❆'];
    // 雨の日モードよりだいぶ少なめの数
    const count = window.innerWidth < 480 ? 10 : (window.innerWidth < 900 ? 16 : 22);
    for (let i = 0; i < count; i++){
      const flake = document.createElement('span');
      flake.className = 'flake';
      flake.textContent = symbols[i % symbols.length];
      flake.style.left = (Math.random() * 100) + '%';
      flake.style.fontSize = (0.5 + Math.random() * 0.45) + 'rem'; // 小さめ
      flake.style.animationDuration = (14 + Math.random() * 10) + 's'; // 雨よりゆっくり
      flake.style.animationDelay = (Math.random() * -20) + 's';
      flake.style.setProperty('--drift', (Math.random() * 40 - 20) + 'px');
      layer.appendChild(flake);
    }
  }

  function initWinterTheme(){
    const layer = document.getElementById('snow-layer');
    if (!layer || !isWinterSeason()) return;

    document.body.classList.add('winter-mode');
    if (!reduceMotion){
      buildSnowflakes(layer);
      layer.classList.add('is-on');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initPetals();
    initParallax();
    initStagger();
    initDayNightMode();
    initRainMode();
    initWinterTheme();
  });
})();
