# tests/engine/map/DungeonGenerator.test.ts

- 役割: ダンジョン生成の基本動作をテストする。
- 主な状態: テスト用 `DungeonGenerator`、部屋、カスタムタイル。
- 主な処理: 部屋中心、マップサイズ、部屋数、階段配置、床座標、タイル散布を確認する。
- 呼ばれ方: `npm test` で実行される。
- 依存: `DungeonGenerator`。
- 読むポイント: 生成結果が最低限成立していることを見る。
- 読まなくていい部分: `Math.random` モックの詳細。
