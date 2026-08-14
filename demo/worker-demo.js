/* ==================================================================
   【デモ／試作用】memory-site Cloudflare Worker
   ------------------------------------------------------------------
   ※ これは demo/ フォルダの機能（Bucket List・タイムカプセル）を
     試すための「別名の新しいWorker」として使うファイルです。
     本番のadmin.html用Workerとは別物として、試したい場合だけ
     新しくWorkerを1つ作ってこの内容を貼り付けてください
     （本番のWorkerは書き換えなくて大丈夫です）。

     本番採用が決まったら、本番用の cloudflare-worker/worker.js を
     このファイルの内容で更新すればOKです。
   ------------------------------------------------------------------
   役割：
   - admin.html        → 思い出（写真・日付・コメント）の追加
   - bucket-list.html  → Bucket List の追加・完了切替・削除
   - time-capsule.html → タイムカプセルの追加・開封

   どの機能も同じ仕組みです：GitHubのContents APIを使って、
   リポジトリの中のJSONファイルを読み書きし、自動でコミットします。

   必要な環境変数（Cloudflare Workers の「設定 > 変数とシークレット」）：
   - GITHUB_TOKEN   : GitHubのPersonal Access Token（対象リポジトリへの書き込み権限）
   - GITHUB_OWNER   : GitHubのユーザー名
   - GITHUB_REPO    : リポジトリ名
   - GITHUB_BRANCH  : 対象ブランチ名（通常は "main"）
   - ADMIN_SECRET   : assets/auth.js の SECRET_HASH と同じ値

   URLのパスでどの機能か振り分けます：
   - POST /memory        … 思い出を追加（admin.html用。今まで通り）
   - POST /bucket/add     … Bucket List項目を追加
   - POST /bucket/toggle  … 完了状態を切り替え
   - POST /bucket/delete  … 項目を削除
   - POST /capsule/add    … タイムカプセルを追加（未開封3個までの制限あり）
   - POST /capsule/open   … タイムカプセルを開封
   ================================================================== */

const GITHUB_API = 'https://api.github.com';
const MAX_PENDING_CAPSULES = 3; // 同時に埋められるタイムカプセルの上限（開封すれば枠が空く）

function corsHeaders(){
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function jsonResponse(obj, status = 200){
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() }
  });
}

function errorResponse(message, status = 400){
  return jsonResponse({ ok: false, error: message }, status);
}

async function githubRequest(env, path, options = {}){
  const url = `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;
  return fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'memory-site-worker',
      ...(options.headers || {})
    }
  });
}

async function getFile(env, path){
  const res = await githubRequest(env, path);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub取得エラー (${path}): ${res.status}`);
  return res.json();
}

async function putFile(env, path, contentBase64, message, sha){
  const body = { message, content: contentBase64, branch: env.GITHUB_BRANCH || 'main' };
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

function utf8ToBase64(str){
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function base64ToUtf8(base64){
  const decoded = atob(base64.replace(/\n/g, ''));
  return new TextDecoder().decode(Uint8Array.from(decoded, c => c.charCodeAt(0)));
}

function sanitizeFilename(name){
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function makeId(){
  return (crypto.randomUUID ? crypto.randomUUID() : (Date.now() + '-' + Math.random().toString(16).slice(2)));
}

// JSONファイルを読み込み → mutator で書き換え → 保存、をまとめて行う共通処理
async function updateJsonFile(env, path, defaultData, mutator, commitMessage){
  const existing = await getFile(env, path);
  let data = defaultData;
  if (existing){
    data = JSON.parse(base64ToUtf8(existing.content));
  }
  const result = mutator(data);
  if (result && result.error){
    return { error: result.error };
  }
  const newContentBase64 = utf8ToBase64(JSON.stringify(data, null, 2));
  await putFile(env, path, newContentBase64, commitMessage, existing ? existing.sha : undefined);
  return { data };
}

/* ---------------- 思い出（admin.html） ---------------- */
async function handleMemoryAdd(env, payload){
  const { date, icon, title, comment, photos, showInStory } = payload;
  if (!date || !title) return errorResponse('date と title は必須です');

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

  const { error } = await updateJsonFile(
    env,
    'content/memories.json',
    { startDate: date + 'T00:00:00', memories: [] },
    (data) => {
      data.memories.push({
        icon: icon || '💕', date, title, comment: comment || '',
        showInStory: showInStory !== false, photos: photoPaths
      });
      data.memories.sort((a, b) => a.date.localeCompare(b.date));
    },
    `Add memory: ${title}`
  );
  if (error) return errorResponse(error);
  return jsonResponse({ ok: true, photos: photoPaths });
}

/* ---------------- Bucket List ---------------- */
async function handleBucketAdd(env, payload){
  const { text } = payload;
  if (!text || !text.trim()) return errorResponse('textは必須です');

  const { error } = await updateJsonFile(
    env, 'content/bucket-list.json', { items: [] },
    (data) => { data.items.push({ id: makeId(), text: text.trim(), done: false, createdAt: new Date().toISOString() }); },
    `Add bucket item: ${text.trim()}`
  );
  if (error) return errorResponse(error);
  return jsonResponse({ ok: true });
}

async function handleBucketToggle(env, payload){
  const { id } = payload;
  if (!id) return errorResponse('idは必須です');

  const { error } = await updateJsonFile(
    env, 'content/bucket-list.json', { items: [] },
    (data) => {
      const item = data.items.find(i => i.id === id);
      if (!item) return { error: '項目が見つかりません' };
      item.done = !item.done;
    },
    `Toggle bucket item: ${id}`
  );
  if (error) return errorResponse(error);
  return jsonResponse({ ok: true });
}

async function handleBucketDelete(env, payload){
  const { id } = payload;
  if (!id) return errorResponse('idは必須です');

  const { error } = await updateJsonFile(
    env, 'content/bucket-list.json', { items: [] },
    (data) => { data.items = data.items.filter(i => i.id !== id); },
    `Delete bucket item: ${id}`
  );
  if (error) return errorResponse(error);
  return jsonResponse({ ok: true });
}

/* ---------------- タイムカプセル ---------------- */
async function handleCapsuleAdd(env, payload){
  const { unlockDate, message, author } = payload;
  if (!unlockDate || !message) return errorResponse('unlockDateとmessageは必須です');

  const { error } = await updateJsonFile(
    env, 'content/time-capsules.json', { capsules: [] },
    (data) => {
      const pendingCount = data.capsules.filter(c => !c.opened).length;
      if (pendingCount >= MAX_PENDING_CAPSULES){
        return { error: `タイムカプセルは同時に${MAX_PENDING_CAPSULES}個までしか埋められません。開封してからまた埋めてください。` };
      }
      data.capsules.push({
        id: makeId(), unlockDate, message, author: author || '',
        opened: false, createdAt: new Date().toISOString()
      });
    },
    `Add time capsule (unlock: ${unlockDate})`
  );
  if (error) return errorResponse(error);
  return jsonResponse({ ok: true });
}

async function handleCapsuleOpen(env, payload){
  const { id } = payload;
  if (!id) return errorResponse('idは必須です');

  const { error } = await updateJsonFile(
    env, 'content/time-capsules.json', { capsules: [] },
    (data) => {
      const capsule = data.capsules.find(c => c.id === id);
      if (!capsule) return { error: 'カプセルが見つかりません' };
      if (new Date(capsule.unlockDate) > new Date()) return { error: 'まだ開封日を迎えていません' };
      capsule.opened = true;
      capsule.openedAt = new Date().toISOString();
    },
    `Open time capsule: ${id}`
  );
  if (error) return errorResponse(error);
  return jsonResponse({ ok: true });
}

/* ---------------- ルーティング ---------------- */
export default {
  async fetch(request, env){
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders() });
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders() });

    try {
      const payload = await request.json();

      if (!env.ADMIN_SECRET || payload.secret !== env.ADMIN_SECRET){
        return errorResponse('Unauthorized', 401);
      }

      const path = new URL(request.url).pathname;
      switch (path){
        case '/bucket/add':    return await handleBucketAdd(env, payload);
        case '/bucket/toggle': return await handleBucketToggle(env, payload);
        case '/bucket/delete': return await handleBucketDelete(env, payload);
        case '/capsule/add':   return await handleCapsuleAdd(env, payload);
        case '/capsule/open':  return await handleCapsuleOpen(env, payload);
        case '/memory':
        default:                return await handleMemoryAdd(env, payload);
      }
    } catch (err) {
      return errorResponse('エラー: ' + err.message, 500);
    }
  }
};
