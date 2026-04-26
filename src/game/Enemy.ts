/**
 * サンプルゲームの敵を定義するファイル。
 * 敵はプレイヤーへ単純に近づき、隣接したら攻撃する。
 */
import type { Game } from "../engine/Game";
import { Actor } from "../engine/Entity";

export type EnemyType = "weak" | "normal" | "strong";

type EnemyData = {
  type: EnemyType;
  char: string;
  color: string;
  name: string;
  maxHp: number;
  attackPower: number;
  expValue: number;
};

export const enemyTypes: EnemyData[] = [
  { type: "weak", char: "s", color: "#7cc7d8", name: "スライム", maxHp: 8, attackPower: 2, expValue: 4 },
  { type: "normal", char: "g", color: "#9bd37d", name: "ゴブリン", maxHp: 10, attackPower: 3, expValue: 5 },
  { type: "strong", char: "O", color: "#d88964", name: "オーク", maxHp: 16, attackPower: 5, expValue: 9 },
];

/** プレイヤーを追跡する基本的な敵キャラクター。 */
export class Enemy extends Actor {
  public expValue: number;

  constructor(x: number, y: number, public type: EnemyType = "normal", floor = 1) {
    const data = enemyTypes.find((enemyType) => enemyType.type === type);
    if (!data) {
      throw new Error(`Unknown enemy type: ${type}`);
    }

    // 5階ごとに少し強くする。細かいバランス調整は後で差し替えやすい形にしている。
    const strengthTier = Math.floor((floor - 1) / 5);
    const maxHp = data.maxHp + strengthTier * 4;
    super(x, y, data.char, data.color, data.name, maxHp, maxHp, data.attackPower + strengthTier);
    this.expValue = data.expValue;
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
