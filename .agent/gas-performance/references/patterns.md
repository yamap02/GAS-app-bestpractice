# GAS Webアプリ パフォーマンス 推奨パターン集

アンチパターンに対応する、GAS特有の制約を踏まえた正しい実装パターン。

---

## P-01: サーバー呼び出しのバッチ化（AP-01の解決）

### Before → After

```javascript
// ✅ GOOD: 1回のサーバー呼び出しで全データを取得
function loadAllRows() {
  google.script.run
    .withSuccessHandler(rows => {
      rows.forEach(row => renderRow(row)); // クライアント側でループ
    })
    .withFailureHandler(err => showError(err))
    .getAllRowData(); // サーバーは1回だけ
}
```

```javascript
// サーバー側 (.gs)
function getAllRowData() {
  const sheet = SpreadsheetApp.getActiveSheet();
  return sheet.getDataRange().getValues(); // まとめて返す
}
```

**ポイント**: データの加工・フィルタリングはクライアント側で行う。サーバーはデータ提供に徹する。

---

## P-02: スプレッドシートの一括読み書き（AP-02の解決）

```javascript
// ✅ GOOD: getValues() / setValues() で一括処理
function processSheet() {
  const sheet = SpreadsheetApp.getActiveSheet();
  
  // 一括読み込み（1回のAPI呼び出し）
  const data = sheet.getDataRange().getValues();
  
  // メモリ上で加工
  const processed = data.map(row => [
    row[0],
    row[1] * 1.1, // 計算
    row[2].toUpperCase()
  ]);
  
  // 一括書き込み（1回のAPI呼び出し）
  sheet.getRange(1, 1, processed.length, processed[0].length)
    .setValues(processed);
}
```

**コスト比較**:
- 逐次: 1000行 × 100ms = **100秒**
- 一括: getValues + setValues = **約1秒**

---

## P-03: 非同期UIパターン（AP-03の解決）

```javascript
// ✅ GOOD: ローディング状態を管理しながら非同期処理
function handleSubmit() {
  setLoading(true); // UIをロック
  
  google.script.run
    .withSuccessHandler(result => {
      setLoading(false);
      renderResult(result);
    })
    .withFailureHandler(err => {
      setLoading(false);
      showError(err.message);
    })
    .processFormData(getFormValues());
}

function setLoading(isLoading) {
  document.getElementById('submit-btn').disabled = isLoading;
  document.getElementById('spinner').style.display = isLoading ? 'block' : 'none';
}
```

---

## P-04: ページネーション / 差分転送（AP-04の解決）

```javascript
// サーバー側: ページネーション対応
function getPagedData(page, pageSize, lastUpdated) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const allData = sheet.getDataRange().getValues();
  
  // 差分のみ返す（lastUpdated以降の更新行）
  const filtered = allData.filter(row => row[UPDATED_AT_COL] > lastUpdated);
  
  // ページング
  const start = page * pageSize;
  return {
    rows: filtered.slice(start, start + pageSize),
    total: filtered.length,
    hasMore: start + pageSize < filtered.length
  };
}
```

```javascript
// クライアント側: 無限スクロール
let currentPage = 0;
const PAGE_SIZE = 50;

function loadMore() {
  google.script.run
    .withSuccessHandler(({ rows, hasMore }) => {
      appendRows(rows);
      if (!hasMore) hideLoadMoreButton();
      currentPage++;
    })
    .getPagedData(currentPage, PAGE_SIZE, lastUpdated);
}
```

---

## P-05: CacheServiceによるサーバーキャッシュ（AP-05の解決）

```javascript
// ✅ GOOD: CacheServiceで頻繁に変わらないデータをキャッシュ
function getMasterData() {
  const cache = CacheService.getScriptCache();
  const CACHE_KEY = 'master_data';
  const TTL = 600; // 10分
  
  // キャッシュから取得
  const cached = cache.get(CACHE_KEY);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // キャッシュミス時はスプレッドシートから取得
  const data = SpreadsheetApp.openById(MASTER_ID)
    .getSheets()[0]
    .getDataRange()
    .getValues();
  
  // キャッシュに保存（最大100KB）
  cache.put(CACHE_KEY, JSON.stringify(data), TTL);
  return data;
}

// キャッシュを明示的に破棄する関数も用意する
function invalidateMasterCache() {
  CacheService.getScriptCache().remove('master_data');
}
```

---

## P-06: LockServiceによる排他制御（AP-06の解決）

```javascript
// ✅ GOOD: LockServiceで競合を防ぐ
function appendRowSafely(data) {
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(10000); // 最大10秒待機
    
    const sheet = SpreadsheetApp.getActiveSheet();
    sheet.appendRow(data);
    SpreadsheetApp.flush(); // 即座に確定
    
  } catch (e) {
    throw new Error('処理が混み合っています。しばらくしてから再試行してください。');
  } finally {
    lock.releaseLock(); // 必ずrelease
  }
}
```

---

## P-07: PropertiesServiceによるチャンク処理（AP-07の解決）

```javascript
// ✅ GOOD: 処理をチャンク化して再開可能にする
function processInChunks() {
  const props = PropertiesService.getScriptProperties();
  const CHUNK_SIZE = 500;
  const TIME_LIMIT = 5 * 60 * 1000; // 5分（余裕を持たせる）
  const startTime = Date.now();
  
  // 前回の続きから開始
  let startRow = parseInt(props.getProperty('lastProcessedRow') || '0');
  const sheet = SpreadsheetApp.getActiveSheet();
  const totalRows = sheet.getLastRow();
  
  while (startRow < totalRows) {
    // 時間チェック
    if (Date.now() - startTime > TIME_LIMIT) {
      props.setProperty('lastProcessedRow', startRow.toString());
      // トリガーで次回実行をスケジュール
      ScriptApp.newTrigger('processInChunks')
        .timeBased().after(1000).create();
      return; // 一旦終了
    }
    
    const chunk = sheet.getRange(startRow + 1, 1, CHUNK_SIZE, sheet.getLastColumn())
      .getValues();
    chunk.forEach(row => heavyProcess(row));
    startRow += CHUNK_SIZE;
  }
  
  // 完了したらプロパティをリセット
  props.deleteProperty('lastProcessedRow');
}
```

---

## P-08: DocumentFragmentによる高速DOM更新（AP-08の解決）

```javascript
// ✅ GOOD: DocumentFragmentでまとめてDOMに追加
function renderTable(rows) {
  const fragment = document.createDocumentFragment();
  const tbody = document.createElement('tbody');
  
  rows.forEach(row => {
    const tr = document.createElement('tr');
    // textContentでXSSも防ぐ
    tr.innerHTML = `
      <td>${escapeHtml(row[0])}</td>
      <td>${escapeHtml(row[1])}</td>
      <td>${escapeHtml(row[2])}</td>
    `;
    tbody.appendChild(tr);
  });
  
  fragment.appendChild(tbody);
  
  // DOM操作は1回だけ
  const table = document.getElementById('data-table');
  table.innerHTML = '';
  table.appendChild(fragment);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}
```

---

## P-09: クライアントサイドキャッシュ（AP-09の解決）

Service Workerが使えないGASでは、メモリキャッシュかlocalStorageを使う。

```javascript
// ✅ GOOD: モジュールスコープのメモリキャッシュ
const clientCache = (() => {
  const store = {};
  return {
    get: (key) => store[key] || null,
    set: (key, value, ttlMs = 60000) => {
      store[key] = { value, expiresAt: Date.now() + ttlMs };
    },
    getValid: (key) => {
      const item = store[key];
      if (!item || Date.now() > item.expiresAt) return null;
      return item.value;
    }
  };
})();

// ドロップダウン選択肢はキャッシュから返す
function getDropdownOptions(callback) {
  const cached = clientCache.getValid('dropdown_options');
  if (cached) {
    callback(cached);
    return;
  }
  google.script.run
    .withSuccessHandler(options => {
      clientCache.set('dropdown_options', options, 5 * 60 * 1000); // 5分
      callback(options);
    })
    .fetchDropdownOptions();
}
```

---

## P-10: URLFetchのバッチ化（AP-10の解決）

```javascript
// ✅ GOOD: UrlFetchApp.fetchAll() で並列リクエスト
function fetchAllItems(itemIds) {
  const requests = itemIds.map(id => ({
    url: `https://api.example.com/items/${id}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${getToken()}` },
    muteHttpExceptions: true
  }));
  
  // 並列実行（直列より大幅に速い）
  const responses = UrlFetchApp.fetchAll(requests);
  
  return responses.map((res, i) => {
    if (res.getResponseCode() !== 200) {
      console.warn(`Failed for id ${itemIds[i]}: ${res.getResponseCode()}`);
      return null;
    }
    return JSON.parse(res.getContentText());
  }).filter(Boolean);
}
```
