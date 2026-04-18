# GAS ToDo App Best Practice

Google Apps Script 上で動く ToDo アプリ。
フロントエンド `React 19 + Vite`、バックエンド `TypeScript + GAS + Webpack` 構成。

AntiGravity を用いた GAS アプリ開発向けミニマム構成でもあり、`clasp` など実運用で必要になる周辺ライブラリや開発基盤を初期状態で揃えている。
このベースを起点にすることで、機能追加しやすい構成を維持しつつ、セキュアに GAS アプリ開発ベストプラクティスへ沿った実装を進めやすい。
`.agent` ディレクトリに用意したエージェントを活用することで、既存アプリをセキュリティとパフォーマンスに優れた形へ継続的にリファクタリングしやすい。

## `.agent` のエージェント概要

- `frontend-security`
  - React / Vite などフロントエンド領域向けセキュリティ支援
  - XSS、CSP、CSRF、CORS、クリックジャッキング、入力バリデーション、依存パッケージ脆弱性などを横断レビュー
  - セキュリティチェックリスト生成、脆弱性レビュー、実装ガイド、脅威モデリングに対応
- `gas-performance`
  - GAS Webアプリ特有の遅延要因を洗い出し、クライアント・サーバー両面を最適化
  - `google.script.run` の N+1 呼び出し、Spreadsheet/Drive/API アクセスの多重実行、キャッシュ不足、UI フリーズなどを改善
  - ボトルネック分析、バッチ化、キャッシュ戦略、構成見直しまで対応
- `gas-backend-security`
  - GAS バックエンド向けセキュリティ支援
  - `doGet` / `doPost`、Web App、トリガー、Execution API、PropertiesService、外部 API 連携まで含めて権限境界とデータ境界を点検
  - `executeAs` / `access` 設定、OAuth scope、秘密情報管理、監査、濫用防止、再実行安全性まで含めてレビュー

## 概要

- ToDo 一覧取得
- ToDo 追加
- 完了状態 切り替え
- ToDo 削除
- GAS 側入力バリデーション
- `PropertiesService` 永続化
- `CacheService` 読み取りキャッシュ
- `google.script.run` 経由でフロントエンド連携

## 画面と挙動

- 入力欄からタスク追加
- 一覧で完了チェック切り替え
- 削除ボタンでタスク削除
- 読み込み中表示
- エラーバナー表示
- 完了件数サマリ表示

`google.script.run` が使えないローカル開発時は、フロントエンド側フォールバックで最低限の表示確認可能。
追加はローカルダミーデータ、更新・削除は no-op。

## バックエンド仕様

- GAS エントリポイント
  - `doGet`
  - `getTodos`
  - `addTodo`
  - `toggleTodo`
  - `deleteTodo`
- データ形式

```ts
interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
}
```

- バリデーション
  - タイトル必須
  - タイトル最大 `500` 文字
  - ID は UUID v4 のみ許可
  - タイトル保存前 `trim()`
- 永続化
  - `PropertiesService.getUserProperties()`
  - キー `todo_app_data`
- キャッシュ
  - `CacheService.getUserCache()`
  - TTL `21600` 秒
- 異常系
  - 壊れたキャッシュ検出時 → キャッシュ破棄
  - 壊れた永続データ検出時 → ストレージ初期化

`appsscript.json` は `executeAs: USER_DEPLOYING`、`access: ANYONE` 設定。
保存先が `UserProperties` のため、実データは実行ユーザー単位。

## フロントエンド仕様

- 技術
  - React 19
  - TypeScript
  - Vite
  - Tailwind CSS v4
  - `vite-plugin-singlefile`
- 主な責務
  - `frontend/src/api/gasApi.ts`
    - `google.script.run` 呼び出し
    - レスポンス契約ごとの JSON パース
    - 型ガード
  - `frontend/src/hooks/useTodos.ts`
    - 一覧取得
    - 楽観更新とロールバック
    - エラー状態管理
  - `frontend/src/components/TodoList.tsx`
    - 入力フォーム
    - 一覧描画
    - 完了件数表示

## ディレクトリ構成

```text
.
├── src/                     # GAS バックエンド
│   ├── index.ts             # GAS 公開関数
│   ├── todoCodec.ts         # ToDo JSON 変換 / 型ガード
│   ├── todoRepository.ts    # Properties/Cache 永続化
│   ├── todoService.ts       # ToDo 操作
│   ├── validation.ts        # 入力検証
│   └── tests/               # Jest テスト
├── frontend/                # React フロントエンド
├── dist/                    # デプロイ成果物
├── webpack.config.js        # GAS バンドル設定
├── copy-frontend.js         # frontend/dist/index.html を dist/ へコピー
└── appsscript.json          # GAS マニフェスト
```

## セットアップ

### 前提

- Node.js
- npm
- Google アカウント
- `clasp`

### 初回

```bash
npm install
cd frontend && npm install
cp .clasp.json.example .clasp.json
npx clasp login
```

`.clasp.json` の `scriptId` を対象 GAS プロジェクトへ合わせて更新。

## ローカル開発

フロントエンド確認:

```bash
cd frontend
npm run dev
```

Vite 開発サーバー起動。

バックエンドテスト:

```bash
npm test
```

バックエンド lint:

```bash
npm run lint
```

バックエンド format:

```bash
npm run format
```

## ビルドとデプロイ

本番用ビルド:

```bash
npm run build
```

実行内容:

1. `webpack` で `src/index.ts` から `dist/code.js` 生成
2. `frontend` を単一 HTML としてビルド
3. `frontend/dist/index.html` を `dist/index.html` へコピー
4. `appsscript.json` を `dist/` へ配置

GAS 反映:

```bash
npm run push
```

スクリプトエディタ表示:

```bash
npm run open
```

## 利用可能コマンド

ルート:

| コマンド | 内容 |
| --- | --- |
| `npm run build` | バックエンド・フロントエンド一括ビルド |
| `npm run build:backend` | GAS バックエンドのみビルド |
| `npm run build:frontend` | フロントエンドのみビルド |
| `npm run copy:frontend` | `frontend/dist/index.html` を `dist/` へコピー |
| `npm run build:watch` | バックエンド watch |
| `npm test` | Jest テスト |
| `npm run lint` | バックエンド oxlint |
| `npm run lint:fix` | バックエンド oxlint 自動修正 |
| `npm run format` | バックエンド oxfmt 実行 |
| `npm run format:check` | バックエンド oxfmt チェック |
| `npm run push` | ビルド後 `clasp push` |
| `npm run open` | GAS スクリプトエディタ起動 |

`frontend/`:

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | Vite 開発サーバー |
| `npm run build` | フロントエンド本番ビルド |
| `npm run typecheck` | TypeScript 型検査 |
| `npm run lint` | フロントエンド oxlint |
| `npm run preview` | ビルド結果プレビュー |

## テスト

現状 Jest 対象:

- `src/tests/validation.test.ts`
  - タイトル制約
  - UUID v4 検証
- `src/tests/todoRepository.test.ts`
  - キャッシュ優先読み取り
  - 永続化フォールバック
  - 不正データ時のリセット
  - 保存時のキャッシュ同期
- `src/tests/todoService.test.ts`
  - 追加時の依存注入
  - 切り替え・削除時の副作用境界

フロントエンドの自動テスト未整備。

## 補足

- `frontend/README.md` は Vite 初期テンプレート由来。現行アプリ説明はこの README を正とする。
