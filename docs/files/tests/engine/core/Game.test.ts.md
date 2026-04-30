# tests/engine/core/Game.test.ts

- 役割: 設定変更後のプレイヤーステータス再計算をテストする。
- 主な状態: テスト用 Canvas、マップ、設定、`Game`。
- 主な処理: `resumeAfterConfigChange()` 後のHPと攻撃力の丸めを確認する。
- 呼ばれ方: `npm test` で実行される。
- 依存: `Game`、`GameMap`、`Player`、`Tile`、`sampleGameConfig`。
- 読むポイント: 設定変更時のステータス補正を見る。
- 読まなくていい部分: Canvas モックの詳細。
