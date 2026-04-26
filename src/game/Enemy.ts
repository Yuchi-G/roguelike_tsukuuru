/**
 * サンプルゲームの敵を定義するファイル。
 * ゴブリンはプレイヤーへ単純に近づき、隣接したら攻撃する。
 */
import type { Game } from "../engine/Game";
import { Actor } from "../engine/Entity";

/** プレイヤーを追跡する基本的な敵キャラクター。 */
export class Enemy extends Actor {
  constructor(x: number, y: number, floor = 1) {
    // 5階ごとに少し強くする。細かいバランス調整は後で差し替えやすい形にしている。
    const strengthTier = Math.floor((floor - 1) / 5);
    super(x, y, "g", "#9bd37d", "ゴブリン", 10 + strengthTier * 4, 10 + strengthTier * 4, 3 + strengthTier);
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
