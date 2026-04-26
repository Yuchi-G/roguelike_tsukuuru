/**
 * ターン制の進行を管理するファイル。
 * このゲームでは、プレイヤーが1回行動した後に敵が1回ずつ行動する。
 */
import type { Game } from "./Game";

/** 敵ターンを実行するためのクsssssラス。 */
export class TurnManager {
  /** ゲームオーバーになっていなければ、残っている敵を順番に動かす。 */
  runEnemyTurn(game: Game): void {
    for (const enemy of [...game.enemies]) {
      if (!game.isGameOver) {
        enemy.update(game) ;
      }
    }
  }
}
