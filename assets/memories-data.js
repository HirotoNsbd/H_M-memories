/* ==================================================================
   ▼▼▼ 思い出データ（ここを編集するだけで story.html / calendar.html
        の両方に反映されます） ▼▼▼
   ================================================================== */

// 付き合った日（カウントアップの起点。story.html で使用）
const START_DATE = new Date('2024-10-04T00:00:00');

// 思い出リスト -------------------------------------------------------
// icon:    絵文字1つ（タイムラインの印・カレンダーのハート横に表示）
// date:    'YYYY-MM-DD' 形式（カレンダー表示のために必ずこの形式にしてください）
// title:   出来事のタイトル
// comment: 一言コメント（空文字なら非表示）
// photos:  写真の配列。null なら「写真を追加」のプレースホルダーが表示されます。
//          自分の写真を使うときは null を 'photos/xxx.jpg' のようなパスや URL に
//          置き換えてください。
const MEMORIES = [
  {
    icon: '🎉',
    date: '2025-10-04',
    title: '付き合った日',
    comment: '付き合ってくれてありがとう。',
    photos: [null]
  },
  {
    icon: '🎄',
    date: '2025-12-24',
    title: 'はじめてのクリスマス',
    comment: '二人で過ごす初めての冬。',
    photos: [null, null, null]
  },
  {
    icon: '🏰',
    date: '2026-01-02',
    title: 'ディズニーランド',
    comment: '朝から夜まで遊んだ最高の一日。',
    photos: [null, null, null, null, null]
  },
  {
    icon: '💯',
    date: '2026-01-12',
    title: '付き合って100日',
    comment: 'これからもよろしくね。',
    photos: [null]
  },
  {
    icon: '🍽️',
    date: '2026-03-20',
    title: 'はじめて二人で行ったお店',
    comment: '',
    photos: [null, null]
  },
  {
    icon: '🌸',
    date: '2026-04-10',
    title: '誕生日',
    comment: 'おめでとう、大好きだよ。',
    photos: [null, null]
  }
];

/* ▲▲▲ 編集ポイントはここまで ▲▲▲ ================================== */

// 日付文字列 'YYYY-MM-DD' → memory オブジェクトの Map（calendar.html で使用）
function buildMemoryMap(){
  const map = new Map();
  MEMORIES.forEach(m => map.set(m.date, m));
  return map;
}
