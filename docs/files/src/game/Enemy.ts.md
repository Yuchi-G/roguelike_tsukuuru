# src/game/Enemy.ts

- 役割: 敵キャラクターと敵AIの実行を担当する。
- 主な状態: `definition`、`expValue`。
- 主な処理: `update()` でスクリプトAIまたはRegistry AIを実行する。
- 呼ばれ方: `runEnemyTurn()` から毎ターン呼ばれる。
- 依存: `Actor`、`Game`、`EnemyDefinition`。
- 読むポイント: 敵AIは `aiScript` 優先、なければ `aiId` 実行。
- 読まなくていい部分: 階層ボーナスの丸め処理。
