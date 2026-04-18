# GAS Webアプリ パフォーマンス アンチパターン集

GASでよく見られるパフォーマンスのアンチパターンと、その影響・診断方法をまとめる。

---

## 🔴 Critical アンチパターン

### AP-01: N+1 サーバー呼び出し（最頻出）

**症状**: リストを表示するたびにUIが数秒〜数十秒フリーズする

```javascript
// ❌ NG: ループの中でgoogle.script.runを呼ぶ
rows.forEach(rowId => {
  google.script.run
    .withSuccessHandler(data => renderRow(data))
    .getRowData(rowId); // 100行あれば100回サーバー往復
});
```

**影響**: 1呼び出し ≈ 200ms〜1000ms。100件なら20秒〜100秒。

**診断**: ブラウザDevToolsのNetworkタブで`google.script.run`に相当するfetchが連続していないか確認。

---

### AP-02: セルの逐次読み書き（サーバー側）

**症状**: スクリプト実行が遅く、しばしばタイムアウト（6分制限）に達する

```javascript
// ❌ NG: 1セルずつgetValue
const sheet = SpreadsheetApp.getActiveSheet();
for (let i = 1; i <= 1000; i++) {
  const val = sheet.getRange(i, 1).getValue(); // 1000回のAPI呼び出し
  processValue(val);
}
```

**影響**: getValue() 1回 ≈ 50〜100ms。1000行なら50〜100秒。

---

### AP-03: 同期的なUIブロック

**症状**: ボタンを押すとページ全体が固まり、スピナーも止まる

```javascript
// ❌ NG: コールバックを受け取らず結果を「待とうとする」コード
// GASのgoogle.script.runは非同期なので、これは機能しない上にUIを壊す
let result;
google.script.run.withSuccessHandler(r => { result = r; }).getData();
while (!result) {} // 無限ループ・ブラウザクラッシュの原因
```

---

### AP-04: 巨大ペイロードの丸ごと転送

**症状**: データ取得に10秒以上かかる。コンソールに大きなJSONが見える

```javascript
// ❌ NG: 全データを毎回送る
function getAllData() {
  const sheet = SpreadsheetApp.getActiveSheet();
  return sheet.getDataRange().getValues(); // 10万行のデータを毎回転送
}
```

---

### AP-05: CacheServiceの未使用

**症状**: 変わらないマスターデータを毎回スプレッドシートから取得している

```javascript
// ❌ NG: キャッシュなしで毎回読む
function getMasterData() {
  return SpreadsheetApp.openById(MASTER_ID).getSheets()[0].getDataRange().getValues();
  // 毎回数百ms〜数秒かかる
}
```

---

## 🟠 High アンチパターン

### AP-06: LockServiceなしの競合処理

**症状**: 複数ユーザーが同時操作すると、データが欠損・重複する

```javascript
// ❌ NG: ロックなしで書き込み
function appendRow(data) {
  const sheet = SpreadsheetApp.getActiveSheet();
  sheet.appendRow(data); // 同時実行で上書き・スキップが起きる
}
```

---

### AP-07: PropertiesServiceの未使用（長時間処理）

**症状**: 大量データ処理中にタイムアウトし、途中から再実行できない

```javascript
// ❌ NG: 全データを1スクリプトで処理しようとする
function processAllRows() {
  const data = sheet.getDataRange().getValues(); // 5万行
  data.forEach(row => heavyProcess(row)); // 6分で強制終了
}
```

---

### AP-08: DOM操作の個別更新

**症状**: テーブル表示時にガクガクとちらつき、描画が遅い

```javascript
// ❌ NG: 毎行ごとにDOMを触る
rows.forEach(row => {
  const tr = document.createElement('tr');
  tr.innerHTML = `<td>${row[0]}</td><td>${row[1]}</td>`;
  document.getElementById('table').appendChild(tr); // 毎回リフロー発生
});
```

---

## 🟡 Medium アンチパターン

### AP-09: クライアントキャッシュの未活用

**症状**: ページ遷移やモーダル開閉のたびに同じデータを再取得している

```javascript
// ❌ NG: 毎回サーバーから取得
function openModal() {
  google.script.run.withSuccessHandler(showModal).getDropdownOptions();
  // ドロップダウンの選択肢は変わらないのに毎回呼ぶ
}
```

---

### AP-10: URLFetch のループ内呼び出し

**症状**: 外部API連携処理が極端に遅い、または1日の quota を使い切る

```javascript
// ❌ NG: 1件ずつ外部APIを叩く
items.forEach(item => {
  const res = UrlFetchApp.fetch(`https://api.example.com/items/${item.id}`);
  // quotaを消費しまくる
});
```

---

## 診断フローまとめ

```
遅い症状
  ├── UIが固まる / スピナーが止まる
  │     → AP-01（N+1）、AP-03（同期ブロック）、AP-08（DOM操作）を確認
  ├── ボタン押下後に長時間待つ
  │     → AP-02（逐次読み書き）、AP-04（巨大ペイロード）、AP-05（キャッシュ未使用）を確認
  ├── タイムアウトエラーが出る
  │     → AP-02、AP-07（長時間処理）、AP-10（URLFetch）を確認
  └── 複数ユーザー使用時にデータがおかしくなる
        → AP-06（LockService）を確認
```
