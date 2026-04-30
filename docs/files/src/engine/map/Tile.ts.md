# src/engine/map/Tile.ts

- 役割: 1マス分の地形データを定義する。
- 主な状態: `type`、`char`、`color`、`background`、`blocksMovement`。
- 主な処理: `fromDefinition()`、`wall()`。
- 呼ばれ方: `GameMap`、`DungeonGenerator`、`Game` から使われる。
- 依存: なし。
- 読むポイント: `blocksMovement` が移動可否を決める。
- 読まなくていい部分: `scatterRate` は追加タイルを読む時でよい。
