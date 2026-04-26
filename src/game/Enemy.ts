/**
 * サンプルゲームの敵を定義するファイル。
 * 敵はプレイヤーへ単純に近づき、隣接したら攻撃する。
 */
import type { Game } from "../engine/Game";
import { Actor } from "../engine/Entity";
import type { EnemyDefinition } from "../engine/GameConfig";

/** プレイヤーを追跡する基本的な敵キャラクター。 */
export class Enemy extends Actor {
  public expValue: number;

  constructor(x: number, y: number, public definition: EnemyDefinition, floor = 1) {
    // 5階ごとに少し強くする。細かいバランス調整は後で差し替えやすい形にしている。
    const strengthTier = Math.floor((floor - 1) / 5);
    const maxHp = definition.maxHp + strengthTier * 4;
    super(x, y, definition.char, definition.color, definition.name, maxHp, maxHp, definition.attackPower + strengthTier);
    this.expValue = definition.expValue;
  }

  get type(): string {
    return this.definition.id;
  }

  /**
   * 敵AI（単純追跡）。
   * 隣にプレイヤーがいれば攻撃し、それ以外はx/yの差が大きい方向へ近づく。
   */
  override update(game: Game): void {
    const dx = game.player.x - this.x;
    const dy = game.player.y - this.y;
    const distance = Math.abs(dx) + Math.abs(dy);

    if (distance === 1) {
      game.attack(this, game.player);
      return;
    }

    const stepX = Math.sign(dx);
    const stepY = Math.sign(dy);

    if (Math.abs(dx) > Math.abs(dy)) {
      if (!game.tryMoveActor(this, stepX, 0)) {
        game.tryMoveActor(this, 0, stepY);
      }
    } else if (!game.tryMoveActor(this, 0, stepY)) {
      game.tryMoveActor(this, stepX, 0);
    }
  }
}
