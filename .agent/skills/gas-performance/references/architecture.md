# GAS Webアプリ パフォーマンス アーキテクチャガイド

設計段階から考慮すべき構成と、規模に応じたアーキテクチャ選択。

---

## GAS Webアプリの基本的な通信モデル

```
[ブラウザ (HTML/JS)]
       │
       │ google.script.run()  ← シングルスレッド・非同期・1回数百ms
       ▼
[GAS サーバー (.gs)]
       │
       ├── SpreadsheetApp  ← バッチ化必須
       ├── DriveApp        ← ファイル数に注意
       ├── UrlFetchApp     ← fetchAll()で並列化
       └── CacheService    ← 積極的に活用
```

**Service Workerは使えない** → キャッシュ・バックグラウンド処理の代替設計が必要

---

## 規模別アーキテクチャ推奨

### 小規模（〜1,000行、〜5ユーザー）

**シンプル構成**で十分。設計より実装速度を優先。

```
クライアント: 素のHTML/JS
サーバー    : 単一の.gsファイル
データ      : 1枚のスプレッドシート
キャッシュ  : 不要 or CacheService（TTL 60秒）
```

**最低限守るべきこと**: AP-01（N+1）とAP-02（逐次読み書き）だけ避ける

---

### 中規模（〜10,000行、〜50ユーザー）

**キャッシュ戦略**と**ページネーション**が必要になる。

```
クライアント: ES6モジュール分割 or バンドラ検討
サーバー    : 機能別に.gsファイルを分割
データ      : スプレッドシート複数シート or 専用シート
キャッシュ  : CacheService（マスターデータTTL 10分）
             + クライアントメモリキャッシュ（TTL 5分）
排他制御    : LockService（書き込みが競合する処理）
```

**初回ロードの設計**:
```javascript
// ページ読み込み時に必要データを全部まとめて取得する
function initializeApp() {
  google.script.run
    .withSuccessHandler(({ masterData, userSettings, recentRows }) => {
      // 1回のサーバー呼び出しで全部受け取る
      cacheLocally('master', masterData);
      cacheLocally('settings', userSettings);
      renderTable(recentRows);
    })
    .getInitialData(); // サーバー側でまとめて返す
}
```

---

### 大規模（10,000行超、100ユーザー超）

GASの限界に近づく。**設計の見直し**か**GAS以外の選択肢**を検討。

```
クライアント: フレームワーク（React/Vue）の導入検討
データ      : Firestore / BigQuery との連携
処理        : チャンク処理 + 時間ベーストリガー
通知        : メール or チャット連携（GASのpush通知は不可）
```

**GASで対応しきれないサイン**:
- データが1億セルを超える（スプレッドシートの上限）
- リアルタイム更新が必要（WebSocketは使えない）
- 複数のスプレッドシートをまたぐ複雑なJOINが必要
- 毎秒レベルのAPI呼び出しが必要（quota超過）

---

## データフロー設計パターン

### パターンA: 初回一括取得 + クライアント処理（推奨）

```
初回ロード: サーバーから全データ取得（1回）
操作      : クライアント側でフィルタ・ソート・検索
更新      : 変更データのみサーバーに送信
```

**向いているケース**: データ量が少ない（〜5,000行）、リードヘビーな操作

---

### パターンB: ページネーション + 差分同期

```
初回ロード: 最新50件のみ取得
スクロール: 追加50件をロード
更新      : Webhookorポーリングで差分を取得
```

**向いているケース**: データ量が多い、一覧+詳細の構成

---

### パターンC: オプティミスティックUI

```
操作      : クライアント側で即座にUI更新（楽観的に）
バックグラウンド: サーバーに送信して確定
失敗時    : ロールバックしてエラー表示
```

```javascript
function updateCell(row, col, value) {
  // 1. 即座にUIを更新（ユーザー体験を優先）
  updateUICell(row, col, value);
  
  // 2. バックグラウンドでサーバーに保存
  google.script.run
    .withFailureHandler(() => {
      // 3. 失敗したらロールバック
      revertUICell(row, col);
      showToast('保存に失敗しました。再試行してください。');
    })
    .updateCell(row, col, value);
}
```

**向いているケース**: セル編集、チェックボックス操作など即時反応が重要な操作

---

## CacheService設計ガイド

```
CacheService.getScriptCache()   → 全ユーザー共有（マスターデータ向け）
CacheService.getUserCache()     → ユーザー個別（個人設定・権限情報向け）
CacheService.getDocumentCache() → ドキュメント単位（あまり使われない）

上限: 1エントリ 100KB / スクリプトキャッシュ合計 ~1MB
TTL: 最大 21,600秒（6時間）
```

**100KB超のデータのキャッシュ**:
```javascript
// 分割して保存する
function cachelargeData(key, data) {
  const cache = CacheService.getScriptCache();
  const json = JSON.stringify(data);
  const CHUNK_SIZE = 90000; // 90KB（余裕を持たせる）
  const chunks = [];
  
  for (let i = 0; i < json.length; i += CHUNK_SIZE) {
    chunks.push(json.slice(i, i + CHUNK_SIZE));
  }
  
  const entries = {};
  chunks.forEach((chunk, i) => {
    entries[`${key}_chunk_${i}`] = chunk;
  });
  entries[`${key}_meta`] = JSON.stringify({ chunks: chunks.length });
  
  cache.putAll(entries, 600);
}
```
