/* ==================================================================
   memory-site 用 Cloudflare Worker
   ------------------------------------------------------------------
   役割：
   - admin.html から送られてきた「日付・タイトル・コメント・写真」を受け取り
   - 写真を GitHub リポジトリの photos/ フォルダに保存
   - content/memories.json に新しい思い出を追記して保存
   （どちらも GitHub の Contents API を使い、自動でコミットされます）

   必要な環境変数（Cloudflare Workers の「設定 > 変数とシークレット」で登録）：
   - GITHUB_TOKEN   : GitHub の Personal Access Token（対象リポジトリへの書き込み権限が必要）
   - GITHUB_OWNER   : GitHubのユーザー名（例: taro-yamada）
   - GITHUB_REPO    : リポジトリ名（例: our-memory-site）
   - GITHUB_BRANCH  : 対象ブランチ名（通常は "main"）
   - ADMIN_SECRET   : admin.html 側の合言葉ハッシュと一致させる文字列
                      （assets/auth.js の SECRET_HASH と同じ値を入れてください。
                        auth.js を開いてブラウザのコンソールで SECRET_HASH を
                        出力すれば値が確認できます）
   ================================================================== */

const GITHUB_API = 'https://api.github.com';

function corsHeaders(){
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

async function githubRequest(env, path, options = {}){
  const url = `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'memory-site-worker',
      ...(options.headers || {})
    }
  });
  return res;
}

async function getFile(env, path){
  const res = await githubRequest(env, path);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub取得エラー (${path}): ${res.status}`);
  return res.json();
}

async function putFile(env, path, contentBase64, message, sha){
  const body = {
    message,
    content: contentBase64,
    branch: env.GITHUB_BRANCH || 'main'
  };
  if (sha) body.sha = sha;

  const res = await githubRequest(env, path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok){
    const errBody = await res.text();
    throw new Error(`GitHub保存エラー (${path}): ${res.status} ${errBody}`);
  }
  return res.json();
}

function sanitizeFilename(name){
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// UTF-8文字列をBase64に変換（日本語のコメント等が含まれるため）
function utf8ToBase64(str){
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

export default {
  async fetch(request, env){
    if (request.method === 'OPTIONS'){
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method !== 'POST'){
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders() });
    }

    try {
      const payload = await request.json();

      // ---- 簡易認証（サイトの合言葉ハッシュと一致するか確認）----
      if (!env.ADMIN_SECRET || payload.secret !== env.ADMIN_SECRET){
        return new Response('Unauthorized', { status: 401, headers: corsHeaders() });
      }

      const { date, icon, title, comment, photos } = payload;
      if (!date || !title){
        return new Response('date と title は必須です', { status: 400, headers: corsHeaders() });
      }

      // ---- 1. 写真をアップロード ----
      const photoPaths = [];
      if (Array.isArray(photos)){
        for (let i = 0; i < photos.length; i++){
          const photo = photos[i];
          if (!photo || !photo.contentBase64) continue;
          const safeName = sanitizeFilename(photo.filename || `photo-${i}.jpg`);
          const path = `photos/${date}-${Date.now()}-${i}-${safeName}`;
          await putFile(env, path, photo.contentBase64, `Add photo for ${title}`);
          photoPaths.push(path);
        }
      }
      if (photoPaths.length === 0) photoPaths.push(null);

      // ---- 2. content/memories.json を取得・更新 ----
      const dataPath = 'content/memories.json';
      const existing = await getFile(env, dataPath);

      let data = { startDate: date + 'T00:00:00', memories: [] };
      if (existing){
        const decoded = atob(existing.content.replace(/\n/g, ''));
        const jsonStr = new TextDecoder().decode(
          Uint8Array.from(decoded, c => c.charCodeAt(0))
        );
        data = JSON.parse(jsonStr);
      }

      data.memories.push({ icon: icon || '💕', date, title, comment: comment || '', photos: photoPaths });
      // 日付順に並び替え
      data.memories.sort((a, b) => a.date.localeCompare(b.date));

      const newContentBase64 = utf8ToBase64(JSON.stringify(data, null, 2));
      await putFile(env, dataPath, newContentBase64, `Add memory: ${title}`, existing ? existing.sha : undefined);

      return new Response(JSON.stringify({ ok: true, photos: photoPaths }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });

    } catch (err) {
      return new Response('エラー: ' + err.message, { status: 500, headers: corsHeaders() });
    }
  }
};
