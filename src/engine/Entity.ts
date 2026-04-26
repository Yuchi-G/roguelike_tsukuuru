/**
 * ゲーム内に存在するものの共通定義。
 * プレイヤー、敵、アイテムはすべて座標と表示情報を持つ。
 */
import type { Game } from "./Game";

/** マップ上に置ける基本オブジェクト。 */
export abstract class Entity {
  public id: string;

  constructor(
    public x: number,
    public y: number,
    public char: string,
    public color: string,
    public blocksMovement: boolean,
  ) {
    this.id = crypto.randomUUID();
  }

  /** 必要なエンティティだけが毎ターンの処理を上書きする。 */
  update(_game: Game): void {}
}

/**
 * HPと攻撃力を持つ行動主体。
 * プレイヤーと敵は戦闘できるため、このクラスを継承する。
 */
export abstract class Actor extends Entity {
  constructor(
    x: number,
    y: number,
    char: string,
    color: string,
    public name: string,
    public hp: number,
    public maxHp: number,
    public attackPower: number,
  ) {
    super(x, y, char, color, true);
  }

  /** HPが0になったかどうかの死亡判定。 */
  get isDead(): boolean {
    return this.hp <= 0;
  }

  /** 戦闘で受けたダメージをHPへ反映する。 */
  damage(amount: number): void {
    this.hp = Math.max(0, Math.round(this.hp - Math.round(amount)));
  }

  /** 回復薬などでHPを回復し、実際に増えた量を返す。 */
  heal(amount: number): number {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, Math.round(this.hp + Math.round(amount)));
    return this.hp - before;
  }
}
