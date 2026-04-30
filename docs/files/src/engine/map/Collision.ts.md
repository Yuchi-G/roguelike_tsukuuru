# src/engine/map/Collision.ts

- 役割: 指定座標に移動を邪魔するエンティティがいるか調べる。
- 主な状態: なし。
- 主な処理: `getBlockingEntityAt()`。
- 呼ばれ方: `Game.tryMoveActorByDelta()` から呼ばれる。
- 依存: `Entity` の型。
- 読むポイント: `blocksMovement` が true のものだけが通行を止める。
- 読まなくていい部分: なし。
