import type { EnemyDefinition, GameConfig, ItemDefinition } from "./GameConfig";
import { Enemy } from "../game/Enemy";
import { Item } from "../game/Item";
import { Player } from "../game/Player";

export class EntityFactory {
  constructor(private config: GameConfig) {}

  createPlayer(x: number, y: number): Player {
    return new Player(x, y, this.config.player);
  }

  createEnemy(x: number, y: number, definition: EnemyDefinition, floor: number): Enemy {
    return new Enemy(x, y, definition, floor);
  }

  createItem(x: number, y: number, definition: ItemDefinition): Item {
    return new Item(x, y, definition);
  }
}
