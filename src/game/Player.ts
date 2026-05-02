import { Actor } from "../engine/core/Entity";
import type { EffectParams, PlayerInitialStats, EquipmentSlot, EquipmentStats } from "../engine/core/GameConfig";
import type { ScriptDefinition } from "../engine/script/Script";

export type Equipment = {
  name: string;
  slot: EquipmentSlot;
  stats: EquipmentStats;
};

export type BagItem = {
  name: string;
  effectId: string;
  params: EffectParams;
  description: string;
  /** 使用時にスクリプトで効果を実行する場合に設定する。 */
  useScript?: ScriptDefinition;
};

/** プレイヤーキャラクター。入力による移動や攻撃はGame側で処理する。 */
export class Player extends Actor {
  public readonly maxBagItems: number;
  public level: number;
  public exp: number;
  public nextLevelExp: number;
  public weapon: Equipment | null = null;
  public armor: Equipment | null = null;
  public accessory: Equipment | null = null;
  public itemBag: BagItem[] = [];

  constructor(spawnX: number, spawnY: number, initialStats: PlayerInitialStats) {
    super(spawnX, spawnY, initialStats.char, initialStats.color, initialStats.name, initialStats.hp, initialStats.hp, initialStats.attackPower);
    this.level = initialStats.level;
    this.exp = initialStats.exp;
    this.nextLevelExp = initialStats.nextLevelExp;
    this.maxBagItems = initialStats.maxBagItems;
  }

  get isBagFull(): boolean {
    return this.itemBag.length >= this.maxBagItems;
  }

  /** 基礎攻撃力に武器の攻撃力を足した、実際の攻撃力を返す。 */
  getAttack(): number {
    return this.attackPower + this.totalEquipmentStat("atk");
  }

  getDefense(): number {
    return this.defense + this.totalEquipmentStat("def");
  }

  getSpeed(): number {
    return this.speed + this.totalEquipmentStat("spd");
  }

  getEquipment(slot: EquipmentSlot): Equipment | null {
    return this[slot];
  }

  equip(equipment: Equipment): Equipment | null {
    const previousEquipment = this.getEquipment(equipment.slot);
    const previousStats = previousEquipment?.stats ?? { atk: 0, def: 0, spd: 0, maxHp: 0, maxMp: 0 };
    this[equipment.slot] = equipment;
    this.applyMaxStatEquipmentDelta(equipment.stats.maxHp - previousStats.maxHp, equipment.stats.maxMp - previousStats.maxMp);
    return previousEquipment;
  }

  private totalEquipmentStat(statKey: keyof EquipmentStats): number {
    return [this.weapon, this.armor, this.accessory].reduce((total, equipment) => total + (equipment?.stats[statKey] ?? 0), 0);
  }

  private applyMaxStatEquipmentDelta(maxHpDelta: number, maxMpDelta: number): void {
    if (maxHpDelta !== 0) {
      this.maxHp = Math.max(1, this.maxHp + maxHpDelta);
      this.hp = Math.min(this.maxHp, Math.max(0, this.hp + maxHpDelta));
    }
    if (maxMpDelta !== 0) {
      this.maxMp = Math.max(0, this.maxMp + maxMpDelta);
      this.mp = Math.min(this.maxMp, Math.max(0, this.mp + maxMpDelta));
    }
  }

  /** バッグに回復アイテムを追加する。 */
  addItem(bagItem: BagItem): boolean {
    if (this.isBagFull) {
      return false;
    }

    this.itemBag.push(bagItem);
    return true;
  }

  /** 指定したバッグ内アイテムを捨てて、新しいアイテムを入れる。 */
  replaceItemAt(bagIndex: number, replacementBagItem: BagItem): BagItem | null {
    if (bagIndex < 0 || bagIndex >= this.itemBag.length) {
      return null;
    }

    const [droppedBagItem] = this.itemBag.splice(bagIndex, 1, replacementBagItem);
    return droppedBagItem ?? null;
  }

  /** 指定したバッグ内アイテムを取り出す。 */
  takeBagItemAt(bagIndex: number): BagItem | null {
    if (bagIndex < 0 || bagIndex >= this.itemBag.length) {
      return null;
    }

    const [removedBagItem] = this.itemBag.splice(bagIndex, 1);
    return removedBagItem ?? null;
  }

  /** 経験値が次のレベルに届いていれば、ステータスを伸ばしてレベルアップする。 */
  checkLevelUp(nextLevelMultiplier: number, hpGainPerLevel: number, attackGainPerLevel: number): number {
    let completedLevelUps = 0;

    while (this.exp >= this.nextLevelExp) {
      this.exp -= this.nextLevelExp;
      this.level += 1;
      this.nextLevelExp = Math.floor(this.nextLevelExp * nextLevelMultiplier);
      this.maxHp = Math.max(1, Math.round(this.maxHp + hpGainPerLevel));
      this.hp = this.maxHp;
      this.attackPower = Math.max(0, Math.round(this.attackPower + attackGainPerLevel));
      completedLevelUps += 1;
    }

    return completedLevelUps;
  }
}
