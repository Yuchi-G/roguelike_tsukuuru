/**
 * サンプルゲームの階層を組み立てるファイル。
 * エンジンの部品を使って、プレイヤー・敵・アイテムを配置する。
 */
import { DungeonGenerator } from "../engine/DungeonGenerator";
import { EntityFactory } from "../engine/EntityFactory";
import type { Game } from "../engine/Game";
import type { EnemyDefinition, GameConfig, ItemDefinition } from "../engine/GameConfig";
import { Enemy } from "./Enemy";
import { Item } from "./Item";
import { Player } from "./Player";

/**
 * 1階層分のゲーム開始と、次の階への移動を管理するクラス。
 * ゲーム固有の初期配置はここに集め、エンジン本体をシンプルに保つ。
 */
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

    // 敵とアイテムは床の空きマスに置き、同じ場所に重ならないようにする。
    for (let i = 1; i < rooms.length; i += 1) {
      const enemyCount = this.config.floorRules.enemyCount(this.floor, i);
      for (let j = 0; j < enemyCount; j += 1) {
        const [x, y] = this.unoccupiedFloor(generator, rooms, occupied);
        enemies.push(this.factory.createEnemy(x, y, this.randomEnemyDefinition(), this.floor));
        occupied.add(this.key(x, y));
      }

      for (const itemDrop of this.config.floorRules.itemDrops) {
        if (Math.random() < itemDrop.chance) {
          const itemDefinition = this.findItemDefinition(itemDrop.itemId);
          const [x, y] = this.unoccupiedFloor(generator, rooms, occupied);
          items.push(this.factory.createItem(x, y, itemDefinition));
          occupied.add(this.key(x, y));
        }
      }
    }

    this.game.start(dungeon.map, player, enemies.slice(0, 12), items.slice(0, 8), this.floor);
  }

  /** 階段上でSpaceを押した時の次階層移動。 */
  goToNextFloor(): void {
    if (!this.game.isPlayerOnStairs()) {
      this.game.logger.add("階段の上でSpaceキーを押す必要がある。");
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

  private randomEnemyDefinition(): EnemyDefinition {
    return this.config.enemies[Math.floor(Math.random() * this.config.enemies.length)];
  }

  private findItemDefinition(itemId: string): ItemDefinition {
    const item = this.config.items.find((definition) => definition.id === itemId);
    if (!item) {
      throw new Error(`Unknown item definition: ${itemId}`);
    }

    return item;
  }
}
