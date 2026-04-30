# tests/engine/map/Collision.test.ts

- 役割: 移動をブロックするエンティティ検索をテストする。
- 主な状態: テスト用 `TestEntity`。
- 主な処理: `getBlockingEntityAt()` が座標と `blocksMovement` を見ることを確認する。
- 呼ばれ方: `npm test` で実行される。
- 依存: `getBlockingEntityAt()`、`Entity`。
- 読むポイント: 衝突判定の仕様確認用。
- 読まなくていい部分: なし。
