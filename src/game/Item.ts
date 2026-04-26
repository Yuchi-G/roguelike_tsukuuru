import { Entity } from "../engine/Entity";
import type { Game } from "../engine/Game";
import type { Player } from "./Player";

export class Item extends Entity {
  constructor(
    x: number,
    y: number,
    public name: string,
    public healAmount: number,
  ) {
    super(x, y, "!", "#ff6fae", false);
  }

  onPickup(player: Player, game: Game): void {
    const healed = player.heal(this.healAmount);
    game.logger.add(`${this.name}を拾った。HP +${healed}。`);
  }
}
