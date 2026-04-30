# src/game/MainScene.ts

- 役割: 1階層分のダンジョン生成と次階層への移動を管理する。
- 主な状態: `currentFloorNumber`、`entityFactory`、`game`、`config`。
- 主な処理: 階層生成、敵とアイテム配置、階段移動、出現ルール検索。
- 呼ばれ方: `main.ts` のゲーム開始、リスタート、Space操作から呼ばれる。
- 依存: `DungeonGenerator`、`EntityFactory`、`Game`、`Player`、`Enemy`、`Item`。
- 読むポイント: `loadDungeonFloor()` を上から下へ読む。
- 読まなくていい部分: ランダム配置の再試行処理。
