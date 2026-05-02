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
 * HP、攻撃力、防御力、速度などを持つ行動主体。
 * プレイヤーと敵は戦闘できるため、このクラスを継承する。
 */
export abstract class Actor extends Entity {
  constructor(
    spawnX: number,
    spawnY: number,
    glyph: string,
    color: string,
    public name: string,
    public hp: number,
    public maxHp: number,
    public attackPower: number,
    public maxMp = 0,
    public mp = maxMp,
    public defense = 0,
    public speed = 0,
  ) {
    super(spawnX, spawnY, glyph, color, true);
  }

  /** HPが0になったかどうかの死亡判定。 */
  get isDead(): boolean {
    return this.hp <= 0;
  }

  /** 戦闘で受けたダメージをHPへ反映する。 */
  damage(damageAmount: number): void {
    this.hp = Math.max(0, Math.round(this.hp - Math.round(damageAmount)));
  }

  /** 回復薬などでHPを回復し、実際に増えた量を返す。 */
  heal(healAmount: number): number {
    const hpBeforeHeal = this.hp;
    this.hp = Math.min(this.maxHp, Math.round(this.hp + Math.round(healAmount)));
    return this.hp - hpBeforeHeal;
  }
}
