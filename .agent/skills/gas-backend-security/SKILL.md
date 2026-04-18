---
name: gas-backend-security
description: Comprehensive security guidance for Google Apps Script backends and background processing. Use when Codex needs to design, implement, harden, or review GAS security for Web Apps, doGet/doPost endpoints, installable triggers, time-driven jobs, Execution API, PropertiesService or Drive/Sheets persistence, external API integration, OAuth scopes, secret handling, tenant isolation, logging, abuse prevention, or operational controls.
---

# Gas Backend Security

Google Apps Script バックエンドのセキュリティ観点を漏れなく洗い出す。
設計・実装・レビューのいずれでも、実行主体、権限境界、データ境界、外部連携、運用統制を同じ順で確認する。

## Workflow

1. 実行面を特定する。
   `doGet` / `doPost`、Web App、installable trigger、time-driven trigger、Execution API、addon、library のどれかを先に明示する。
2. 実行主体と権限境界を確定する。
   「誰の権限で動くか」「誰のデータへ触れるか」「所有者権限と利用者権限が混線しないか」を先に固定する。
3. [references/security-checklist.md](references/security-checklist.md) を読み、該当節だけでなく `1. 基本方針` と `9. 可観測性・監査・インシデント対応` まで通す。
4. 指摘を `事実` `前提` `推定` に分離する。
   実コードや設定から読める内容だけを事実へ置く。
5. 結果を `重大度` `悪用経路` `影響` `推奨対策` 付きで返す。
   単なるベストプラクティス列挙で終えない。

## Output Contract

- 設計レビュー時:
  実行経路ごとの脅威、欠落制御、追加すべき設定を列挙する。
- 実装レビュー時:
  コード上の根拠と不足制御を対応付ける。
- 対策提案時:
  `最低限やること` `本番前にやること` `運用で補うこと` に分ける。

## GAS-Specific Rules

- `executeAs` と `access` の組み合わせを必ず確認する。
- installable trigger は作成者権限で動く前提で見る。
- `PropertiesService` は `Script` `User` `Document` の境界差を明示する。
- `CacheService` を真正データ源として扱わない。
- `LockService`、冪等性キー、再実行安全性を競合対策の中心に置く。
- `appsscript.json` の OAuth scope を自動推論任せにしない。
- 外部送信先 URL を利用者入力に全面委譲しない。

## Reference

網羅チェック本体:
[references/security-checklist.md](references/security-checklist.md)
