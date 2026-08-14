# demoフォルダについて

ここにあるのは、本番サイトにはまだ組み込まれていない試作ページです。
`demo`フォルダの中だけで完結するように、`assets`・`content`・`cloudflare-worker`も
本番と別にコピーを持たせてあります。**本番側のファイルは一切上書きしません。**

```
demo/
├── index.html            … デモ一覧
├── memory-quiz.html       … 思い出クイズ（見送り中）
├── bucket-list.html       … Bucket List
├── day-night-mode.html    … 昼夜モード
├── rain-mode.html         … 雨の日モード
├── stats.html             … 統計ページ
├── time-capsule.html      … タイムカプセル
│
├── assets/                … 本番のassetsをコピーしたもの（demo専用）
├── content/                … 本番のcontentをコピーしたもの（demo専用のサンプルデータ）
└── cloudflare-worker/
    └── worker-demo.js       … Bucket List・タイムカプセルの共有機能を試すためのWorkerコード
```

## そのまま試せるもの

`day-night-mode.html` / `rain-mode.html` / `stats.html` / `memory-quiz.html` は、
ファイルを開くだけでそのまま動作確認できます（バックエンドの設定は不要です）。

`stats.html` は `demo/content/memories.json` と `demo/content/bucket-list.json`
（このフォルダの中にあるサンプルデータ）を読み込んで数字を計算しています。

## 共有機能（Bucket List・タイムカプセル）を試したい場合

`bucket-list.html` と `time-capsule.html` は、そのまま開くと
「この端末の中だけで完結するローカルモード」で動きます(今まで通り試せます)。

もし「本当に2つの端末で共有されるか」まで試したい場合は、
**本番用のWorkerとは別に、お試し用のWorkerをもう1つ作る**ことをおすすめします。

1. Cloudflareで新しいWorkerを1つ作る（例: `memory-site-demo`）
2. `demo/cloudflare-worker/worker-demo.js` の中身を貼り付けてデプロイ
3. 環境変数（`GITHUB_TOKEN` / `GITHUB_OWNER` / `GITHUB_REPO` / `GITHUB_BRANCH` / `ADMIN_SECRET`）を設定
   （本番用Workerと同じ値で大丈夫です）
4. 発行されたURLを、`bucket-list.html` と `time-capsule.html` 内の
   `WORKER_URL` に貼り付ける

こうしておけば、本番用のWorkerには一切触れずに、共有機能だけを別枠で試せます。
気に入って本番に採用する場合は、その時にあらためて本番のファイルへ反映します。
