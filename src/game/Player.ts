/**
 * サンプルゲームのプレイヤーを定義するファイル。
 * 表示文字、初期HP、攻撃力などの基本性能をまとめる。
 */
import { Actor } from "../engine/Entity";

/** プレイヤーキャラクター。入力による移動や攻撃はGame側で処理する。 */
export class Player extends Actor {
  public level = 1;
  public exp = 0;
  public nextLevelExp = 10;

  constructor(x: number, y: number) {
    super(x, y, "@", "#f5f0d0", "プレイヤー", 30, 30, 5);
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
