/* ==================================================================
   思い出データの読み込み
   ------------------------------------------------------------------
   管理画面(admin.html)から投稿すると、content/memories.json が
   自動的に更新されます。このファイルはその読み込みと、
   （万が一 content/memories.json がまだ無い場合の）初期データを
   担当します。
   ================================================================== */

// 初期データ（content/memories.json が読み込めなかった場合のフォールバック）
const FALLBACK_START_DATE = '2025-10-04T00:00:00';
const FALLBACK_MEMORIES = [
  { icon: '🎉', date: '2025-10-04', title: '付き合った日', comment: '付き合ってくれてありがとう。', photos: [null] },
  { icon: '🎄', date: '2025-12-24', title: 'はじめてのクリスマス', comment: '二人で過ごす初めての冬。', photos: [null, null, null] },
  { icon: '🏰', date: '2026-01-02', title: 'ディズニーランド', comment: '朝から夜まで遊んだ最高の一日。', photos: [null, null, null, null, null] },
  { icon: '💯', date: '2026-01-12', title: '付き合って100日', comment: 'これからもよろしくね。', photos: [null] },
  { icon: '🍽️', date: '2026-03-20', title: 'はじめて二人で行ったお店', comment: '', photos: [null, null] },
  { icon: '🌸', date: '2026-04-10', title: '誕生日', comment: 'おめでとう、大好きだよ。', photos: [null, null] }
];

let START_DATE = new Date(FALLBACK_START_DATE);
let MEMORIES = FALLBACK_MEMORIES;

// content/memories.json を読み込んで START_DATE / MEMORIES を更新する
// story.html / calendar.html / quiz.html の先頭で await loadMemories() してから使う
async function loadMemories(){
  try {
    const res = await fetch('content/memories.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('content/memories.json not found');
    const data = await res.json();
    if (data.startDate) START_DATE = new Date(data.startDate);
    if (Array.isArray(data.memories) && data.memories.length > 0){
      MEMORIES = data.memories;
    }
  } catch (err) {
    // 読み込めない場合は上のフォールバックデータのまま表示する
    console.info('content/memories.json を読み込めなかったため、初期データを表示します。');
  }
}

// 日付文字列 'YYYY-MM-DD' → memory オブジェクトの Map（calendar.html で使用）
function buildMemoryMap(){
  const map = new Map();
  MEMORIES.forEach(m => map.set(m.date, m));
  return map;
}
