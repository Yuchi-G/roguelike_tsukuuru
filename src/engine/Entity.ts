import type { Game } from "./Game";

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

  update(_game: Game): void {}
}

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

  get isDead(): boolean {
    return this.hp <= 0;
  }

  damage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
  }

  heal(amount: number): number {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp - before;
  }
}
