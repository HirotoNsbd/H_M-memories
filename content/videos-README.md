# content/videos.json の書き方

展示室(`theater.html`)に表示される動画は、このファイルに追記するだけで増やせます。

```json
{
  "videos": [
    {
      "id": "一意なID（好きな文字列でOK）",
      "title": "動画のタイトル",
      "date": "2026-02-14",
      "type": "youtube または file",
      "src": "typeがyoutubeなら動画ID／fileなら動画ファイルのパス",
      "comment": "一言コメント（空文字でも可）"
    }
  ]
}
```

## YouTubeの動画を追加する場合

`type` を `"youtube"` にして、`src` にはYouTubeの**動画ID**だけを入れてください
（`https://www.youtube.com/watch?v=xxxxxxxxxxx` の `xxxxxxxxxxx` の部分です）。

**「リンクを知っている人だけが見られる」ようにしたい場合**は、YouTube側で動画の公開設定を
「**限定公開（Unlisted）**」にしてからIDをここに入れてください。「非公開」にしてしまうと、
サイトからも再生できなくなるのでご注意ください。

```json
{ "id": "dance-1", "title": "はじめてのダンス練習", "date": "2026-02-14", "type": "youtube", "src": "動画ID", "comment": "何回も撮り直した思い出の一本。" }
```

## 自分の端末にある動画ファイルを追加する場合

動画ファイルを `videos` フォルダ(無ければ新しく作ってください)に入れて、`type` を `"file"`、
`src` にそのファイルへのパスを指定してください。

```json
{ "id": "funny-1", "title": "面白い瞬間", "date": "2026-03-01", "type": "file", "src": "videos/funny1.mp4", "comment": "" }
```

※ 動画ファイルは容量が大きくなりがちなので、GitHubリポジトリの容量に余裕があるか確認しながら追加してください。
   容量が気になる場合は基本的にYouTube（限定公開）の利用をおすすめします。
