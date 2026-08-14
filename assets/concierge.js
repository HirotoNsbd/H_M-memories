/* ==================================================================
   思い出コンシェルジュ（Memory Concierge）
   ------------------------------------------------------------------
   ・一般的なAIチャットではなく、キーワード検索ベースの案内役です。
   ・外部AI APIは使用していません（このファイルだけで完結します）。
   ・<script src="assets/concierge.js"></script> を追加するだけで、
     右下にアイコンが出現し、どのページからでも使えます。

   検索対象データ：content/memories.json の各思い出について、
     title / comment / date / location / tags
   を対象にしています。location・tagsは今のデータには無くても大丈夫です
   （将来 memories.json に追加すれば、自動的に検索対象になります）。
   ================================================================== */
(function(){
  /* ▼ ここにアイコン用の写真ファイルを指定してください
     例: photos/concierge-icon.jpg のように、写真を photos フォルダに置いてパスを書く。
     指定した画像が見つからない場合は、自動的に元のイラストに戻ります。 */
  const CONCIERGE_ICON_PATH = 'photos/concierge-icon.jpg';

  let memoriesCache = null;
  let panelInitialized = false;
  let logEl, inputEl, panelEl, toggleEl;

  async function loadMemoriesForConcierge(){
    if (memoriesCache) return memoriesCache;
    try {
      const res = await fetch('content/memories.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('not found');
      const data = await res.json();
      memoriesCache = Array.isArray(data.memories) ? data.memories : [];
    } catch (err) {
      memoriesCache = [];
    }
    return memoriesCache;
  }

  function normalize(str){
    return (str || '').toString().trim().toLowerCase();
  }

  // ---- キーワード検索 ----
  // 完全な自然言語理解はせず、部分一致のキーワード検索で十分という方針。
  // 将来 tags / location などのフィールドが増えても、この配列に足すだけで検索対象になる。
  function searchMemories(query, memories){
    const q = normalize(query);
    if (!q) return [];
    return memories.filter(m => {
      const fields = [
        m.title, m.comment, m.date, m.location,
        ...(Array.isArray(m.tags) ? m.tags : [])
      ];
      const haystack = fields.filter(Boolean).map(normalize).join(' ');
      return haystack.includes(q);
    });
  }

  function formatDate(dateStr){
    return (dateStr || '').replaceAll('-', '.');
  }

  function buildResultCard(memory){
    const photo = Array.isArray(memory.photos) ? memory.photos.find(p => p) : null;
    const card = document.createElement('div');
    card.className = 'concierge-result';
    card.innerHTML = `
      <div class="thumb">${photo ? `<img src="${photo}" alt="">` : '📷'}</div>
      <div class="info">
        <p class="r-title">${memory.icon || ''} ${memory.title || ''}</p>
        <p class="r-date">${formatDate(memory.date)}</p>
      </div>
      <button class="view-btn" type="button">見る</button>
    `;
    card.querySelector('.view-btn').addEventListener('click', () => goToMemory(memory));
    return card;
  }

  // ---- 該当の思い出へ移動する ----
  // story.html を開いている最中ならその場でスムーズスクロール。
  // 他のページからなら、鍵（合言葉）を引き継いだまま story.html へ移動し、
  // 到着後に自動でスクロール＆ハイライトする。
  function goToMemory(memory){
    const targetId = 'memory-' + memory.date;
    const timelineEl = document.getElementById('timeline');

    if (timelineEl){
      if (typeof window.conciergeScrollToMemory === 'function'){
        window.conciergeScrollToMemory(targetId);
      }
      closePanel();
      return;
    }

    const params = new URLSearchParams(location.hash.slice(1));
    params.set('goto', targetId);
    const url = 'story.html#' + params.toString();

    if (typeof pageTransition === 'function'){
      pageTransition(url, { label: '思い出を探しています...' });
    } else {
      location.href = url;
    }
  }

  function addMessage(text, from = 'concierge'){
    const msg = document.createElement('div');
    msg.className = 'concierge-msg from-' + from;
    msg.style.whiteSpace = 'pre-line';
    msg.textContent = text;
    logEl.appendChild(msg);
    logEl.scrollTop = logEl.scrollHeight;
    return msg;
  }

  function addResultGroup(introText, memories){
    const wrap = document.createElement('div');
    wrap.className = 'concierge-msg from-concierge';
    const label = document.createElement('p');
    label.textContent = introText;
    wrap.appendChild(label);
    memories.slice(0, 5).forEach(m => wrap.appendChild(buildResultCard(m)));
    logEl.appendChild(wrap);
    logEl.scrollTop = logEl.scrollHeight;
  }

  async function handleUserInput(text){
    addMessage(text, 'user');
    const memories = await loadMemoriesForConcierge();
    const q = normalize(text);

    if (memories.length === 0){
      addMessage('まだ思い出が登録されていないみたいです。');
      return;
    }

    if (q.includes('おすすめ') || q.includes('おまかせ')){
      const pick = memories[Math.floor(Math.random() * memories.length)];
      addResultGroup('今日はこの思い出がおすすめです😊', [pick]);
      return;
    }

    const results = searchMemories(text, memories);
    addResultGroup(
      results.length > 0 ? `${results.length}件、見つかりました😊` : '思い出が見つかりませんでした…別のキーワードを試してみてください。',
      results
    );
  }

  function openPanel(){
    panelEl.classList.add('is-open');
    toggleEl.classList.add('is-open');
    inputEl.focus();
  }
  function closePanel(){
    panelEl.classList.remove('is-open');
    toggleEl.classList.remove('is-open');
  }

  function buildWidget(){
    toggleEl = document.createElement('button');
    toggleEl.className = 'concierge-toggle';
    toggleEl.type = 'button';
    toggleEl.setAttribute('aria-label', '思い出コンシェルジュを開く');
    toggleEl.innerHTML = `
      <img src="${CONCIERGE_ICON_PATH}" alt="" class="concierge-toggle-img" id="concierge-toggle-img">
      <svg viewBox="0 0 44 44" width="27" height="27" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" id="concierge-toggle-fallback" style="display:none;">
        <path d="M10 14 L16 3 L20 16 Z" fill="#e7eff5"/>
        <path d="M34 14 L28 3 L24 16 Z" fill="#e7eff5"/>
        <path d="M12.5 12.5 L16 8 L18 15 Z" fill="#c9a96a" opacity="0.55"/>
        <path d="M31.5 12.5 L28 8 L26 15 Z" fill="#c9a96a" opacity="0.55"/>
        <circle cx="22" cy="25" r="14.5" fill="#e7eff5"/>
        <circle cx="13.5" cy="28" r="2.7" fill="#e3b6ac" opacity="0.65"/>
        <circle cx="30.5" cy="28" r="2.7" fill="#e3b6ac" opacity="0.65"/>
        <circle cx="17" cy="23" r="1.5" fill="#3c3324"/>
        <circle cx="27" cy="23" r="1.5" fill="#3c3324"/>
        <ellipse cx="22" cy="29" rx="2.8" ry="2.1" fill="#3c3324"/>
        <path d="M22 31 L22 33" stroke="#3c3324" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
    `;
    // 画像が見つからない場合は、元のイラストに自動で切り替える
    const iconImg = toggleEl.querySelector('#concierge-toggle-img');
    iconImg.addEventListener('error', () => {
      iconImg.style.display = 'none';
      toggleEl.querySelector('#concierge-toggle-fallback').style.display = 'block';
    });

    panelEl = document.createElement('div');
    panelEl.className = 'concierge-panel';
    panelEl.innerHTML = `
      <div class="concierge-header">
        <p class="title"><span class="dot"></span>思い出コンシェルジュ</p>
        <button class="concierge-close" type="button" aria-label="閉じる">✕</button>
      </div>
      <div class="concierge-log" id="concierge-log"></div>
      <div class="concierge-input-row">
        <input type="text" id="concierge-input" placeholder="例：ディズニー、誕生日…">
        <button id="concierge-send" type="button">送る</button>
      </div>
    `;

    document.body.appendChild(toggleEl);
    document.body.appendChild(panelEl);

    logEl = panelEl.querySelector('#concierge-log');
    inputEl = panelEl.querySelector('#concierge-input');

    toggleEl.addEventListener('click', () => {
      openPanel();
      if (!panelInitialized){
        panelInitialized = true;
        addMessage('こんにちは😊\n思い出を探すお手伝いをします。\n例えば…\n・初デート\n・ディズニー\n・旅行\n・誕生日\nなどと入力してみてください。\n\n「おすすめ」と入力すると、ランダムで一件ご紹介します。');
      }
    });
    panelEl.querySelector('.concierge-close').addEventListener('click', closePanel);
    panelEl.querySelector('#concierge-send').addEventListener('click', submit);
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });

    function submit(){
      const text = inputEl.value.trim();
      if (!text) return;
      inputEl.value = '';
      handleUserInput(text);
    }
  }

  document.addEventListener('DOMContentLoaded', buildWidget);
})();
