/* ==================================================================
   ページ遷移ローディング演出（再利用可能な共通部品）
   ------------------------------------------------------------------
   使い方：
     location.href = 'story.html#key=xxx';  ← の代わりに
     pageTransition('story.html#key=xxx');  ← これを呼ぶだけ

   何かエラーが起きても必ず遷移するようにフォールバックしてあるので、
   「ページ遷移できなくなる」ことはありません。
   ================================================================== */

function pageTransition(url, options = {}){
  const label = options.label || 'Loading memories...';
  const minVisibleMs = options.minVisibleMs || 550; // 体感として自然な短さ（目安 0.5〜1秒）

  try {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion){
      location.href = url;
      return;
    }

    let overlay = document.getElementById('page-transition-overlay');
    if (!overlay){
      overlay = document.createElement('div');
      overlay.id = 'page-transition-overlay';
      overlay.className = 'page-transition-overlay';
      overlay.innerHTML = `
        <div class="pt-glow" aria-hidden="true"></div>
        <p class="pt-heart">❤</p>
        <p class="pt-label"></p>
      `;
      document.body.appendChild(overlay);
    }
    overlay.querySelector('.pt-label').textContent = label;

    requestAnimationFrame(() => {
      overlay.classList.add('is-visible');
    });

    setTimeout(() => {
      location.href = url;
    }, minVisibleMs);

  } catch (err) {
    // 演出周りで何が起きても、遷移だけは必ず行う
    location.href = url;
  }
}
