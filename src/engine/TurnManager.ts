import type { Game } from "./Game";

export class TurnManager {
  runEnemyTurn(game: Game): void {
    for (const enemy of [...game.enemies]) {
      if (!game.isGameOver) {
        enemy.update(game);
      }
    }
  }
}
