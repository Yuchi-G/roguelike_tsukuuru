// ---------------------------------------------------------------------------
// エンティティファクトリ
//
// GameConfig の定義から Player / Enemy / Item インスタンスを生成する。
// 生成時のボーナス値適用もここで行う。
// ---------------------------------------------------------------------------

import type { EnemyDefinition, GameConfig, ItemDefinition } from "./GameConfig";
import { Enemy } from "../../game/Enemy";
import { Item } from "../../game/Item";
import { Player } from "../../game/Player";

/** 設定値からゲームエンティティを生成するファクトリ。 */
export class EntityFactory {
  constructor(private gameConfig: GameConfig) {}

  /** 設定の初期ステータスでプレイヤーを生成する。 */
  createPlayer(spawnX: number, spawnY: number): Player {
    return new Player(spawnX, spawnY, this.gameConfig.player);
  }

  /** 敵定義と階層ボーナスから敵を生成する。 */
  createEnemy(spawnX: number, spawnY: number, enemyDefinition: EnemyDefinition, hpBonus = 0, attackBonus = 0): Enemy {
    return new Enemy(spawnX, spawnY, enemyDefinition, hpBonus, attackBonus);
  }

  /** アイテム定義からマップ上のアイテムを生成する。 */
  createItem(spawnX: number, spawnY: number, itemDefinition: ItemDefinition): Item {
    return new Item(spawnX, spawnY, itemDefinition);
  }
}
