# tests/engine/registry/ItemEffectRegistry.test.ts

- 役割: アイテム効果登録と数値パラメータ取得をテストする。
- 主な状態: テスト用 `ItemEffectContext`。
- 主な処理: 効果登録、実行、未登録IDエラー、`numberEffectParam()` を確認する。
- 呼ばれ方: `npm test` で実行される。
- 依存: `ItemEffectRegistry`、`numberEffectParam`。
- 読むポイント: 効果IDから処理を呼ぶ仕組みを見る。
- 読まなくていい部分: 型合わせのための空オブジェクト。
