import type { Entity } from "../core/Entity";

/** 指定座標に、移動をブロックするエンティティがいるかを探す。 */
export function getBlockingEntityAt(entities: Entity[], tileX: number, tileY: number): Entity | undefined {
  return entities.find((entity) => entity.blocksMovement && entity.x === tileX && entity.y === tileY);
}
