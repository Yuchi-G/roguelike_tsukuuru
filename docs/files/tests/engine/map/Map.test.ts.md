# tests/engine/map/Map.test.ts

- 役割: `GameMap` の座標、範囲、タイル操作、移動可否をテストする。
- 主な状態: テスト用 `GameMap` と `Tile`。
- 主な処理: `index()`、`isInBounds()`、`getTile()`、`setTile()`、`isWalkable()` を確認する。
- 呼ばれ方: `npm test` で実行される。
- 依存: `GameMap`、`Tile`。
- 読むポイント: マップ座標の扱いを確認する。
- 読まなくていい部分: 似た境界値テストの細部。
