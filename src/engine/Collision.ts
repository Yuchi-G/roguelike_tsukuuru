/**
 * 移動時の衝突判定をまとめるファイル。
 * 壁や敵など、移動を止めるものがあるかを調べる。
 */
import type { Entity } from "./Entity";
import type { GameMap } from "./Map";

/** マップとエンティティを合わせて、移動できるかを判断するクラス。 */
export class Collision {
  /** 指定座標に、移動をブロックするエンティティがいるかを探す。 */
  static getBlockingEntityAt(entities: Entity[], x: number, y: number): Entity | undefined {
    return entities.find((entity) => entity.blocksMovement && entity.x === x && entity.y === y);
  }

  /** 地形とエンティティの両方を見て、移動可能なマスか判定する。 */
  static canMoveTo(map: GameMap, entities: Entity[], x: number, y: number): boolean {
    return map.isWalkable(x, y) && !this.getBlockingEntityAt(entities, x, y);
  }
}
