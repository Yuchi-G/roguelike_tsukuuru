# tests/engine/registry/AiRegistry.test.ts

- 役割: AI登録と標準追跡AIをテストする。
- 主な状態: テスト用 `Game` と `Actor`。
- 主な処理: AI登録、実行、未登録IDエラー、上書き、`chaseMove()` を確認する。
- 呼ばれ方: `npm test` で実行される。
- 依存: `AiRegistry`、`chaseMove`。
- 読むポイント: 標準AIの動きが分かる。
- 読まなくていい部分: モック作成の細部。
