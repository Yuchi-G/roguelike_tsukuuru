// ---------------------------------------------------------------------------
// メインシーン
//
// 1階層分のダンジョン生成と、次の階への移動を管理する。
// 階層ルールに従って敵・アイテムを配置し、Game.startDungeonFloor() で開始する。
// ---------------------------------------------------------------------------

import { DungeonGenerator } from "../engine/map/DungeonGenerator";
import { EntityFactory } from "../engine/core/EntityFactory";
import type { Game } from "../engine/core/Game";
import type { EnemyDefinition, FloorRangeRule, GameConfig, ItemDefinition } from "../engine/core/GameConfig";
import { Enemy } from "./Enemy";
import { Item } from "./Item";
import { Player } from "./Player";

/** 1階層分のゲーム開始と、次の階への移動を管理するクラス。 */
export class MainScene {
  private currentFloorNumber = 1;
  private entityFactory: EntityFactory;

  constructor(
    private game: Game,
    private config: GameConfig,
  ) {
    this.entityFactory = new EntityFactory(config);
  }

  /**
   * 新しい階層を生成する。
   * 次の階へ進む時は、前の階の成長状態を新しいプレイヤーへ引き継ぐ。
   */
  loadDungeonFloor(floorNumber = 1, carriedPlayer?: Player): void {
    this.currentFloorNumber = floorNumber;
    const dungeonGenerator = new DungeonGenerator(
      this.config.dungeon.width,
      this.config.dungeon.height,
      this.config.dungeon.maxRooms,
      this.config.dungeon.minRoomSize,
      this.config.dungeon.maxRoomSize,
      this.config.tiles,
    );
    const generatedDungeon = dungeonGenerator.generate();
    const generatedRooms = generatedDungeon.rooms;

    if (generatedRooms.length === 0) {
      throw new Error("Dungeon generation failed: no rooms created.");
    }

    const [playerX, playerY] = dungeonGenerator.getRoomCenter(generatedRooms[0]);
    const player = this.entityFactory.createPlayer(playerX, playerY);
    if (carriedPlayer) {
      player.level = carriedPlayer.level;
      player.exp = carriedPlayer.exp;
      player.nextLevelExp = carriedPlayer.nextLevelExp;
      player.maxHp = carriedPlayer.maxHp;
      player.hp = Math.min(player.maxHp, Math.max(1, carriedPlayer.hp));
      player.attackPower = carriedPlayer.attackPower;
      player.weapon = carriedPlayer.weapon;
      player.itemBag = [...carriedPlayer.itemBag];
    }
    const enemies: Enemy[] = [];
    const items: Item[] = [];
    const occupiedTileKeys = new Set<string>([this.tileKey(playerX, playerY)]);

    for (let roomIndex = 1; roomIndex < generatedRooms.length; roomIndex += 1) {
      const floorSpawnRule = this.findSpawnRuleForFloor(this.currentFloorNumber);
      const enemyCount = this.randomIntInclusive(floorSpawnRule.enemyCount.min, floorSpawnRule.enemyCount.max);
      for (let enemyIndex = 0; enemyIndex < enemyCount; enemyIndex += 1) {
        const spawnPosition = this.findUnoccupiedFloorPosition(dungeonGenerator, generatedRooms, occupiedTileKeys);
        if (!spawnPosition) break;
        const [spawnX, spawnY] = spawnPosition;
        enemies.push(this.entityFactory.createEnemy(
          spawnX,
          spawnY,
          this.pickEnemyDefinitionByWeight(floorSpawnRule),
          Math.max(0, this.currentFloorNumber - floorSpawnRule.fromFloor) * floorSpawnRule.enemyHpBonusPerFloor,
          Math.max(0, this.currentFloorNumber - floorSpawnRule.fromFloor) * floorSpawnRule.enemyAttackBonusPerFloor,
        ));
        occupiedTileKeys.add(this.tileKey(spawnX, spawnY));
      }

      for (const itemDrop of floorSpawnRule.itemDrops) {
        if (Math.random() < itemDrop.chance) {
          const spawnPosition = this.findUnoccupiedFloorPosition(dungeonGenerator, generatedRooms, occupiedTileKeys);
          if (!spawnPosition) break;
          const [spawnX, spawnY] = spawnPosition;
          const itemDefinition = this.findItemDefinition(itemDrop.itemId);
          items.push(this.entityFactory.createItem(spawnX, spawnY, itemDefinition));
          occupiedTileKeys.add(this.tileKey(spawnX, spawnY));
        }
      }
    }

    this.game.startDungeonFloor(
      generatedDungeon.map,
      player,
      enemies.slice(0, this.config.floorRules.maxEnemies),
      items.slice(0, this.config.floorRules.maxItems),
      this.currentFloorNumber,
    );
  }

  /** 階段上でSpaceを押した時の次階層移動。 */
  goToNextFloor(): void {
    if (!this.game.isPlayerOnStairs()) {
      this.game.logger.add(this.config.messages.useStairsPrompt());
      this.game.renderGameState();
      return;
    }

    this.loadDungeonFloor(this.currentFloorNumber + 1, this.game.player);
  }

  /** 配置済みの場所を避けながら床座標を探す。見つからなければ null を返す。 */
  private findUnoccupiedFloorPosition(dungeonGenerator: DungeonGenerator, dungeonRooms: Array<{ x: number; y: number; width: number; height: number }>, occupiedTileKeys: Set<string>): [number, number] | null {
    // まずランダム試行で素早く探す
    for (let attempts = 0; attempts < 100; attempts += 1) {
      const [tileX, tileY] = dungeonGenerator.pickRandomRoomFloorPosition(dungeonRooms);
      if (!occupiedTileKeys.has(this.tileKey(tileX, tileY))) {
        return [tileX, tileY];
      }
    }

    // ランダムで見つからなければ、全部屋の内側を走査して確実に探す
    for (const dungeonRoom of dungeonRooms) {
      for (let tileY = dungeonRoom.y + 1; tileY < dungeonRoom.y + dungeonRoom.height - 1; tileY += 1) {
        for (let tileX = dungeonRoom.x + 1; tileX < dungeonRoom.x + dungeonRoom.width - 1; tileX += 1) {
          if (!occupiedTileKeys.has(this.tileKey(tileX, tileY))) {
            return [tileX, tileY];
          }
        }
      }
    }

    return null;
  }

  private tileKey(tileX: number, tileY: number): string {
    return `${tileX},${tileY}`;
  }

  /** 指定階に該当する階層ルールを検索する。 */
  private findSpawnRuleForFloor(floorNumber: number): FloorRangeRule {
    const floorSpawnRule = this.config.floorRules.floors.find((candidate) => (
      floorNumber >= candidate.fromFloor && (candidate.toFloor === undefined || floorNumber <= candidate.toFloor)
    ));
    if (!floorSpawnRule) {
      throw new Error(`No floor rule for floor: ${floorNumber}`);
    }

    return floorSpawnRule;
  }

  /** 出現重みに従って敵の種類を抽選する。 */
  private pickEnemyDefinitionByWeight(floorSpawnRule: FloorRangeRule): EnemyDefinition {
    const totalWeight = floorSpawnRule.enemyTable.reduce((sum, weightedEnemyEntry) => sum + Math.max(0, weightedEnemyEntry.weight), 0);
    if (totalWeight <= 0) {
      return this.config.enemies[0];
    }

    let remainingWeightRoll = Math.random() * totalWeight;
    for (const weightedEnemyEntry of floorSpawnRule.enemyTable) {
      remainingWeightRoll -= Math.max(0, weightedEnemyEntry.weight);
      if (remainingWeightRoll <= 0) {
        return this.findEnemyDefinition(weightedEnemyEntry.enemyId);
      }
    }

    return this.findEnemyDefinition(floorSpawnRule.enemyTable[0].enemyId);
  }

  private findEnemyDefinition(enemyId: string): EnemyDefinition {
    const enemyDefinition = this.config.enemies.find((definition) => definition.id === enemyId);
    if (!enemyDefinition) {
      throw new Error(`Unknown enemy definition: ${enemyId}`);
    }

    return enemyDefinition;
  }

  private randomIntInclusive(minValue: number, maxValue: number): number {
    return Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue;
  }

  private findItemDefinition(itemId: string): ItemDefinition {
    const itemDefinition = this.config.items.find((definition) => definition.id === itemId);
    if (!itemDefinition) {
      throw new Error(`Unknown item definition: ${itemId}`);
    }

    return itemDefinition;
  }
}
