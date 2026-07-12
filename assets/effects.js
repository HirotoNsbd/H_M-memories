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

  document.addEventListener('DOMContentLoaded', () => {
    initPetals();
    initParallax();
    initStagger();
  });
})();
