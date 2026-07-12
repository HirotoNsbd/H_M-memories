# セットアップ手順（写真の自動アップロード機能）

この手順を1回だけ行うと、`admin.html` から写真と思い出を送信するだけで、
自動的にGitHubへ保存されてサイトに反映されるようになります。

---

## STEP 1. GitHubの「書き込み用の鍵（トークン）」を作る

1. GitHubにログイン → 右上のアイコン → **Settings**
2. 左メニュー一番下の **Developer settings**
3. **Personal access tokens** → **Fine-grained tokens** → **Generate new token**
4. 設定内容：
   - Token name: `memory-site-admin`（好きな名前でOK）
   - Expiration: お好みで（1年など）
   - Repository access: **Only select repositories** → このサイトのリポジトリを選択
   - Permissions → **Repository permissions** → `Contents` を **Read and write** に設定
5. **Generate token** を押すと `github_pat_xxxxx...` という文字列が表示されます。
   **このページを閉じると二度と表示されないので、必ずコピーしてメモしておいてください。**

---

## STEP 2. 合言葉のハッシュ値を確認する

1. `index.html` をブラウザで開く
2. キーボードの **F12**（またはSafariなら「開発」メニュー）で開発者ツールを開き、「Console」タブを選ぶ
3. `SECRET_HASH` と入力してEnterを押す
4. 表示された文字列（例: `a1b2c3d4`）をコピーしておく
   → これが後で使う `ADMIN_SECRET` の値です

---

## STEP 3. Cloudflare Workersに裏方プログラムを置く

1. https://dash.cloudflare.com/ にアクセスし、無料アカウントを作成（クレジットカード不要）
2. 左メニュー **Workers & Pages** → **Create** → **Create Worker**
3. 適当な名前を付けて **Deploy**（一旦空のWorkerが作られます）
4. 作成後の画面で **Edit code** を開き、中身を全部削除して、
   このフォルダにある `cloudflare-worker/worker.js` の中身を丸ごと貼り付けて **Deploy**
5. Workerの管理画面 → **Settings** → **Variables and Secrets** で、以下を追加：

   | 変数名 | 値 |
   |---|---|
   | `GITHUB_TOKEN` | STEP1でコピーしたトークン（Secretとして登録） |
   | `GITHUB_OWNER` | GitHubのユーザー名 |
   | `GITHUB_REPO` | リポジトリ名 |
   | `GITHUB_BRANCH` | `main`（違う場合はそのブランチ名） |
   | `ADMIN_SECRET` | STEP2でコピーしたハッシュ値 |

6. 保存すると、Workerの詳細画面に
   `https://memory-site-admin.あなたのアカウント名.workers.dev` のようなURLが表示されます。
   このURLをコピーしておいてください。

---

## STEP 4. admin.html にWorkerのURLを設定する

`admin.html` を開いて、下の方にある

```js
const WORKER_URL = 'https://REPLACE-ME.workers.dev';
```

の `https://REPLACE-ME.workers.dev` を、STEP3でコピーしたURLに書き換えて保存してください。

---

## STEP 5. GitHubに全部アップロードする

このフォルダの中身（`index.html` / `story.html` / `calendar.html` / `quiz.html` /
`admin.html` / `assets/` / `content/`）をGitHubリポジトリにアップロードし、
GitHub Pagesを有効にしてください。
（`cloudflare-worker/worker.js` はCloudflare側に貼り付け済みなので、
リポジトリに含めても含めなくてもどちらでも大丈夫です。）

---

## STEP 6. テストしてみる

1. 公開されたサイトの `admin.html` を開く（合言葉が必要です）
2. 適当な日付・タイトルで試しに投稿してみる
3. 「公開しました！」と表示されたら、GitHubリポジトリの
   `content/memories.json` に新しいコミットが増えているか確認
4. 1〜2分待ってから `story.html` を開き、反映されているか確認

うまく反映されない場合は、ブラウザの開発者ツールの「Console」や「Network」タブに
エラーが出ていないか確認してみてください（`401` なら合言葉のハッシュが
一致していない、`404`ならリポジトリ名やブランチ名の設定ミスの可能性が高いです）。

---

## 補足：セキュリティについて

- GitHubの書き込み権限を持つトークン（`GITHUB_TOKEN`）は、Cloudflare Worker側の
  環境変数の中だけに保存され、ブラウザ（admin.html）には一切送られません。
- ただし `ADMIN_SECRET` は「合言葉ロック」と同じ仕組みの延長線上にある簡易的なものです。
  本格的なアカウント認証ではないので、あくまで「二人だけの気軽な鍵」として使ってください。
