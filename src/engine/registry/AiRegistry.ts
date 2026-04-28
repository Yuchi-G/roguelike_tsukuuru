// ---------------------------------------------------------------------------
// 敵AIレジストリ
//
// 敵定義の aiId からAI処理関数を引き当てて実行する仕組み。
// 標準AI（chase / stationary / random）はこのファイルで登録する。
// カスタムAIは main.ts 側で追加登録する。
// ---------------------------------------------------------------------------

import type { Actor } from "../core/Entity";
import type { Game } from "../core/Game";

/** AIハンドラに渡される実行コンテキスト。 */
export type EnemyAiContext = {
  game: Game;
  enemy: Actor;
};

export type EnemyAiHandler = (context: EnemyAiContext) => void;

/** AIハンドラをID文字列で管理するレジストリ。 */
export class AiRegistry {
  private enemyAiHandlersById = new Map<string, EnemyAiHandler>();

  /** AI処理をIDと紐づけて登録する。 */
  register(aiId: string, aiHandler: EnemyAiHandler): void {
    this.enemyAiHandlersById.set(aiId, aiHandler);
  }

  /** 登録済みのAI処理をIDで検索し、実行する。 */
  run(aiId: string, context: EnemyAiContext): void {
    const aiHandler = this.enemyAiHandlersById.get(aiId);
    if (!aiHandler) {
      throw new Error(`Unknown enemy AI: ${aiId}`);
    }

    aiHandler(context);
  }
}

/**
 * プレイヤーへ向かって1歩移動する、または隣接していれば攻撃する。
 * 複数のAIで共通して使える移動ロジック。
 */
export function chaseMove(game: Game, enemy: Actor): void {
  const deltaToPlayerX = game.player.x - enemy.x;
  const deltaToPlayerY = game.player.y - enemy.y;
  const distanceToPlayer = Math.abs(deltaToPlayerX) + Math.abs(deltaToPlayerY);

  if (distanceToPlayer === 1) {
    game.attack(enemy, game.player);
    return;
  }

  const stepX = Math.sign(deltaToPlayerX);
  const stepY = Math.sign(deltaToPlayerY);

  if (Math.abs(deltaToPlayerX) > Math.abs(deltaToPlayerY)) {
    if (!game.tryMoveActorByDelta(enemy, stepX, 0)) {
      game.tryMoveActorByDelta(enemy, 0, stepY);
    }
  } else if (!game.tryMoveActorByDelta(enemy, 0, stepY)) {
    game.tryMoveActorByDelta(enemy, stepX, 0);
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
    const cardinalDirections = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ];
    const selectedDirection = cardinalDirections[Math.floor(Math.random() * cardinalDirections.length)];
    game.tryMoveActorByDelta(enemy, selectedDirection.dx, selectedDirection.dy);
  });

  return registry;
}
