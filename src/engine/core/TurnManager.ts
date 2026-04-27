import type { Game } from "./Game";

/** プレイヤーが行動した後、残っている敵を順番に動かす。 */
export function runEnemyTurn(game: Game): void {
  for (const enemy of [...game.enemies]) {
    if (!game.isGameOver) {
      enemy.update(game);
    }
  }
}
