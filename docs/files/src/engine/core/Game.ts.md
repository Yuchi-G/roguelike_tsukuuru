# src/engine/core/Game.ts

- 役割: プレイ中のゲーム状態とターン進行を管理する中心。
- 主な状態: `map`、`player`、`enemies`、`items`、`fov`、`logger`、`isGameOver`、`floor`。
- 主な処理: 階層開始、移動、攻撃、アイテム取得、描画、ゲームオーバー。
- 呼ばれ方: `main.ts` で作られ、`MainScene` や入力処理から使われる。
- 依存: `Renderer`、`InputManager`、`Fov`、`Logger`、`TurnManager`、各Registry。
- 読むポイント: `handlePlayerMoveInput()`、`attack()`、`finishPlayerTurn()` を追う。
- 読まなくていい部分: バッグUIのHTML文字列生成。
