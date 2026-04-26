/**
 * サンプルゲームのプレイヤーを定義するファイル。
 * 表示文字、初期HP、攻撃力などの基本性能をまとめる。
 */
import { Actor } from "../engine/Entity";
import type { PlayerInitialStats } from "../engine/GameConfig";

export type Equipment = {
  atk: number;
};

export type BagItem = {
  name: string;
  healAmount: number;
};

/** プレイヤーキャラクター。入力による移動や攻撃はGame側で処理する。 */
export class Player extends Actor {
  public readonly maxBagItems: number;
  public level: number;
  public exp: number;
  public nextLevelExp: number;
  public weapon: Equipment | null = null;
  public itemBag: BagItem[] = [];

  constructor(x: number, y: number, stats: PlayerInitialStats) {
    super(x, y, "@", "#f5f0d0", "プレイヤー", stats.hp, stats.hp, stats.attackPower);
    this.level = stats.level;
    this.exp = stats.exp;
    this.nextLevelExp = stats.nextLevelExp;
    this.maxBagItems = stats.maxBagItems;
  }

  get isBagFull(): boolean {
    return this.itemBag.length >= this.maxBagItems;
  }

  /** 基礎攻撃力に武器の攻撃力を足した、実際の攻撃力を返す。 */
  getAttack(): number {
    return this.attackPower + (this.weapon?.atk ?? 0);
  }

  /** バッグに回復アイテムを追加する。 */
  addItem(item: BagItem): boolean {
    if (this.isBagFull) {
      return false;
    }

    this.itemBag.push(item);
    return true;
  }

  /** 指定したバッグ内アイテムを捨てて、新しいアイテムを入れる。 */
  replaceItemAt(index: number, item: BagItem): BagItem | null {
    if (index < 0 || index >= this.itemBag.length) {
      return null;
    }

    const [dropped] = this.itemBag.splice(index, 1, item);
    return dropped ?? null;
  }

  /** バッグの先頭にある回復アイテムを使う。 */
  useHealingItem(): { name: string; healed: number } | null {
    const item = this.itemBag.shift();
    if (!item) {
      return null;
    }

    return {
      name: item.name,
      healed: this.heal(item.healAmount),
    };
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
