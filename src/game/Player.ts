/**
 * サンプルゲームのプレイヤーを定義するファイル。
 * 表示文字、初期HP、攻撃力などの基本性能をまとめる。
 */
import { Actor } from "../engine/Entity";

export type Equipment = {
  atk: number;
};

/** プレイヤーキャラクター。入力による移動や攻撃はGame側で処理する。 */
export class Player extends Actor {
  public level = 1;
  public exp = 0;
  public nextLevelExp = 10;
  public weapon: Equipment | null = null;

  constructor(x: number, y: number) {
    super(x, y, "@", "#f5f0d0", "プレイヤー", 30, 30, 5);
  }

  /** 基礎攻撃力に武器の攻撃力を足した、実際の攻撃力を返す。 */
  getAttack(): number {
    return this.attackPower + (this.weapon?.atk ?? 0);
  }

  /** 経験値が次のレベルに届いていれば、ステータスを伸ばしてレベルアップする。 */
  checkLevelUp(): number {
    let levelUps = 0;

    while (this.exp >= this.nextLevelExp) {
      this.exp -= this.nextLevelExp;
      this.level += 1;
      this.nextLevelExp = Math.floor(this.nextLevelExp * 1.5);
      this.maxHp += 5;
      this.hp = this.maxHp;
      this.attackPower += 2;
      levelUps += 1;
    }

    return levelUps;
  }
}
