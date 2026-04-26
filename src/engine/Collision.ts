import type { Entity } from "./Entity";

/** 指定座標に、移動をブロックするエンティティがいるかを探す。 */
export function getBlockingEntityAt(entities: Entity[], x: number, y: number): Entity | undefined {
  return entities.find((entity) => entity.blocksMovement && entity.x === x && entity.y === y);
}
