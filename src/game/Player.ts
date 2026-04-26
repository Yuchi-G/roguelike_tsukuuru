import { Actor } from "../engine/Entity";
import type { EffectParams, PlayerInitialStats } from "../engine/GameConfig";

export type Equipment = {
  name: string;
  atk: number;
};

export type BagItem = {
  name: string;
  effectId: string;
  params: EffectParams;
  description: string;
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
    super(x, y, stats.char, stats.color, stats.name, stats.hp, stats.hp, stats.attackPower);
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

  /** 指定したバッグ内アイテムを取り出す。 */
  takeBagItemAt(index: number): BagItem | null {
    if (index < 0 || index >= this.itemBag.length) {
      return null;
    }

    const [item] = this.itemBag.splice(index, 1);
    return item ?? null;
  }

  /** 経験値が次のレベルに届いていれば、ステータスを伸ばしてレベルアップする。 */
  checkLevelUp(nextLevelMultiplier: number, hpGainPerLevel: number, attackGainPerLevel: number): number {
    let levelUps = 0;

    while (this.exp >= this.nextLevelExp) {
      this.exp -= this.nextLevelExp;
      this.level += 1;
      this.nextLevelExp = Math.floor(this.nextLevelExp * nextLevelMultiplier);
      this.maxHp = Math.max(1, Math.round(this.maxHp + hpGainPerLevel));
      this.hp = this.maxHp;
      this.attackPower = Math.max(0, Math.round(this.attackPower + attackGainPerLevel));
      levelUps += 1;
    }

    return levelUps;
  }
}
