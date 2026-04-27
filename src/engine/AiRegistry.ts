// ---------------------------------------------------------------------------
// 敵AIレジストリ
//
// 敵定義の aiId からAI処理関数を引き当てて実行する仕組み。
// 標準AI（chase / stationary / random）はこのファイルで登録する。
// カスタムAIは main.ts 側で追加登録する。
// ---------------------------------------------------------------------------

import type { Actor } from "./Entity";
import type { Game } from "./Game";

/** AIハンドラに渡される実行コンテキスト。 */
export type EnemyAiContext = {
  game: Game;
  enemy: Actor;
};

export type EnemyAiHandler = (context: EnemyAiContext) => void;

/** AIハンドラをID文字列で管理するレジストリ。 */
export class AiRegistry {
  private handlers = new Map<string, EnemyAiHandler>();

  /** AI処理をIDと紐づけて登録する。 */
  register(id: string, handler: EnemyAiHandler): void {
    this.handlers.set(id, handler);
  }

  /** 登録済みのAI処理をIDで検索し、実行する。 */
  run(id: string, context: EnemyAiContext): void {
    const handler = this.handlers.get(id);
    if (!handler) {
      throw new Error(`Unknown enemy AI: ${id}`);
    }

    handler(context);
  }
}

/**
 * プレイヤーへ向かって1歩移動する、または隣接していれば攻撃する。
 * 複数のAIで共通して使える移動ロジック。
 */
export function chaseMove(game: Game, enemy: Actor): void {
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
}

/** 標準AI（chase / stationary / random）を登録済みのレジストリを生成する。 */
export function createDefaultAiRegistry(): AiRegistry {
  const registry = new AiRegistry();

  // 追跡: 隣接なら攻撃、そうでなければプレイヤーに近づく
  registry.register("chase", ({ game, enemy }) => {
    chaseMove(game, enemy);
  });

  // 待機: 何もしない
  registry.register("stationary", () => {});

  // ランダム: 上下左右のいずれかに1歩移動する
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
