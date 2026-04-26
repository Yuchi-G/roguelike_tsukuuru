import type { Entity } from "./Entity";
import type { GameMap } from "./Map";

export class Collision {
  static getBlockingEntityAt(entities: Entity[], x: number, y: number): Entity | undefined {
    return entities.find((entity) => entity.blocksMovement && entity.x === x && entity.y === y);
  }

  static canMoveTo(map: GameMap, entities: Entity[], x: number, y: number): boolean {
    return map.isWalkable(x, y) && !this.getBlockingEntityAt(entities, x, y);
  }
}
