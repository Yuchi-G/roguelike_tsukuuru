# src/engine/core/TurnManager.ts

- 役割: プレイヤー行動後に敵を順番に動かす。
- 主な状態: なし。
- 主な処理: `runEnemyTurn()` が残っている敵の `update()` を呼ぶ。
- 呼ばれ方: `Game.finishPlayerTurn()` から呼ばれる。
- 依存: `Game`。
- 読むポイント: ターン制が「プレイヤー1回、敵全員1回」だと分かる。
- 読まなくていい部分: なし。
