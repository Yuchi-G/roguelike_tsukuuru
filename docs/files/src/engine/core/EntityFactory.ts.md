# src/engine/core/EntityFactory.ts

- 役割: 設定値から `Player`、`Enemy`、`Item` を作る。
- 主な状態: `gameConfig`。
- 主な処理: `createPlayer()`、`createEnemy()`、`createItem()`。
- 呼ばれ方: `MainScene` が階層生成時に使う。
- 依存: `Player`、`Enemy`、`Item`、`GameConfig`。
- 読むポイント: 設定データが実際のクラスに変わる場所。
- 読まなくていい部分: 処理が薄いので深追い不要。
