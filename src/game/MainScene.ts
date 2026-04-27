// ---------------------------------------------------------------------------
// メインシーン
//
// 1階層分のダンジョン生成と、次の階への移動を管理する。
// 階層ルールに従って敵・アイテムを配置し、Game.start() で開始する。
// ---------------------------------------------------------------------------

import { DungeonGenerator } from "../engine/DungeonGenerator";
import { EntityFactory } from "../engine/EntityFactory";
import type { Game } from "../engine/Game";
import type { EnemyDefinition, FloorRangeRule, GameConfig, ItemDefinition } from "../engine/GameConfig";
import { Enemy } from "./Enemy";
import { Item } from "./Item";
import { Player } from "./Player";

/** 1階層分のゲーム開始と、次の階への移動を管理するクラス。 */
export class MainScene {
  private floor = 1;
  private factory: EntityFactory;

  constructor(
    private game: Game,
    private config: GameConfig,
  ) {
    this.factory = new EntityFactory(config);
  }

  /**
   * 新しい階層を生成する。
   * 次の階へ進む時は、前の階の成長状態を新しいプレイヤーへ引き継ぐ。
   */
  load(floor = 1, carriedPlayer?: Player): void {
    this.floor = floor;
    const generator = new DungeonGenerator(
      this.config.dungeon.width,
      this.config.dungeon.height,
      this.config.dungeon.maxRooms,
      this.config.dungeon.minRoomSize,
      this.config.dungeon.maxRoomSize,
      this.config.tiles,
    );
    const dungeon = generator.generate();
    const rooms = dungeon.rooms;

    if (rooms.length === 0) {
      throw new Error("Dungeon generation failed: no rooms created.");
    }

    const [playerX, playerY] = generator.center(rooms[0]);
    const player = this.factory.createPlayer(playerX, playerY);
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
    const occupied = new Set<string>([this.key(playerX, playerY)]);

    for (let i = 1; i < rooms.length; i += 1) {
      const rule = this.ruleForFloor(this.floor);
      const enemyCount = this.randomInt(rule.enemyCount.min, rule.enemyCount.max);
      for (let j = 0; j < enemyCount; j += 1) {
        const [x, y] = this.unoccupiedFloor(generator, rooms, occupied);
        enemies.push(this.factory.createEnemy(
          x,
          y,
          this.randomEnemyDefinition(rule),
          Math.max(0, this.floor - rule.fromFloor) * rule.enemyHpBonusPerFloor,
          Math.max(0, this.floor - rule.fromFloor) * rule.enemyAttackBonusPerFloor,
        ));
        occupied.add(this.key(x, y));
      }

      for (const itemDrop of rule.itemDrops) {
        if (Math.random() < itemDrop.chance) {
          const itemDefinition = this.findItemDefinition(itemDrop.itemId);
          const [x, y] = this.unoccupiedFloor(generator, rooms, occupied);
          items.push(this.factory.createItem(x, y, itemDefinition));
          occupied.add(this.key(x, y));
        }
      }
    }

    this.game.start(
      dungeon.map,
      player,
      enemies.slice(0, this.config.floorRules.maxEnemies),
      items.slice(0, this.config.floorRules.maxItems),
      this.floor,
    );
  }

  /** 階段上でSpaceを押した時の次階層移動。 */
  goToNextFloor(): void {
    if (!this.game.isPlayerOnStairs()) {
      this.game.logger.add(this.config.messages.useStairsPrompt());
      this.game.refresh();
      return;
    }

    this.load(this.floor + 1, this.game.player);
  }

  /** 配置済みの場所を避けながら床座標を探す。 */
  private unoccupiedFloor(generator: DungeonGenerator, rooms: Array<{ x: number; y: number; width: number; height: number }>, occupied: Set<string>): [number, number] {
    for (let attempts = 0; attempts < 100; attempts += 1) {
      const [x, y] = generator.randomFloorPosition(rooms);
      if (!occupied.has(this.key(x, y))) {
        return [x, y];
      }
    }
    return generator.center(rooms[0]);
  }

  private key(x: number, y: number): string {
    return `${x},${y}`;
  }

  /** 指定階に該当する階層ルールを検索する。 */
  private ruleForFloor(floor: number): FloorRangeRule {
    const rule = this.config.floorRules.floors.find((candidate) => (
      floor >= candidate.fromFloor && (candidate.toFloor === undefined || floor <= candidate.toFloor)
    ));
    if (!rule) {
      throw new Error(`No floor rule for floor: ${floor}`);
    }

    return rule;
  }

  /** 出現重みに従って敵の種類を抽選する。 */
  private randomEnemyDefinition(rule: FloorRangeRule): EnemyDefinition {
    const totalWeight = rule.enemyTable.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
    if (totalWeight <= 0) {
      return this.config.enemies[0];
    }

    let roll = Math.random() * totalWeight;
    for (const entry of rule.enemyTable) {
      roll -= Math.max(0, entry.weight);
      if (roll <= 0) {
        return this.findEnemyDefinition(entry.enemyId);
      }
    }

    return this.findEnemyDefinition(rule.enemyTable[0].enemyId);
  }

  private findEnemyDefinition(enemyId: string): EnemyDefinition {
    const enemy = this.config.enemies.find((definition) => definition.id === enemyId);
    if (!enemy) {
      throw new Error(`Unknown enemy definition: ${enemyId}`);
    }

    return enemy;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private findItemDefinition(itemId: string): ItemDefinition {
    const item = this.config.items.find((definition) => definition.id === itemId);
    if (!item) {
      throw new Error(`Unknown item definition: ${itemId}`);
    }

    return item;
  }
}
