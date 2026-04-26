import type { Actor } from "./Entity";
import type { Game } from "./Game";

export type EnemyAiContext = {
  game: Game;
  enemy: Actor;
};

export type EnemyAiHandler = (context: EnemyAiContext) => void;

export class AiRegistry {
  private handlers = new Map<string, EnemyAiHandler>();

  register(id: string, handler: EnemyAiHandler): void {
    this.handlers.set(id, handler);
  }

  run(id: string, context: EnemyAiContext): void {
    const handler = this.handlers.get(id);
    if (!handler) {
      throw new Error(`Unknown enemy AI: ${id}`);
    }

    handler(context);
  }
}

export function createDefaultAiRegistry(): AiRegistry {
  const registry = new AiRegistry();

  registry.register("chase", ({ game, enemy }) => {
    const dx = game.player.x - enemy.x;
    const dy = game.player.y - enemy.y;
    const distance = Math.abs(dx) + Math.abs(dy);

    if (distance === 1) {
      game.attack(enemy, game.player);
      return;
    }

    const stepX = Math.sign(dx);
    const stepY = Math.sign(dy);

    if (Math.abs(dx) > Math.abs(dy)) {
      if (!game.tryMoveActor(enemy, stepX, 0)) {
        game.tryMoveActor(enemy, 0, stepY);
      }
    } else if (!game.tryMoveActor(enemy, 0, stepY)) {
      game.tryMoveActor(enemy, stepX, 0);
    }
  });

  registry.register("stationary", () => {});

  registry.register("random", ({ game, enemy }) => {
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ];
    const direction = directions[Math.floor(Math.random() * directions.length)];
    game.tryMoveActor(enemy, direction.dx, direction.dy);
  });

  return registry;
}
