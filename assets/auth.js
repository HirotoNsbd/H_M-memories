/* ==================================================================
   合言葉ロック（二人だけの遊び心の鍵です）
   ------------------------------------------------------------------
   ※ 注意：これは本格的なセキュリティではありません。
   このファイルの中身を見れば合言葉自体も分かってしまう、
   あくまで「気軽な二人だけの鍵」として使ってください。

   ▼ 合言葉を変更したいときは、下の SECRET_WORD を書き換えてください。
   ================================================================== */
const SECRET_WORD = '国分寺駅'; // ← ここを二人の合言葉に変更してください

function normalize(str){
  return str.trim().toLowerCase();
}

function simpleHash(str){
  let h = 0;
  for (let i = 0; i < str.length; i++){
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}

const SECRET_HASH = simpleHash(normalize(SECRET_WORD));

// 現在のURLハッシュ（#key=xxxx）から鍵を取得
function currentKey(){
  return new URLSearchParams(location.hash.slice(1)).get('key');
}

function isUnlocked(){
  return currentKey() === SECRET_HASH;
}

// このページが未解錠なら鍵ページへ戻す（story.html / calendar.html の先頭で呼ぶ）
function protectPage(){
  if (!isUnlocked()){
    location.href = 'index.html';
  }
}

// ページ内のナビリンク（data-nav 属性）に、現在の鍵を引き継がせる
function wireNavLinks(){
  const key = currentKey();
  document.querySelectorAll('[data-nav]').forEach(a => {
    const url = new URL(a.getAttribute('href'), location.href);
    url.hash = 'key=' + key;
    a.setAttribute('href', url.pathname + url.hash);
  });
}
