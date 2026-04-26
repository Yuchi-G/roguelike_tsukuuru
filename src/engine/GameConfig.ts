import type { Actor } from "./Entity";
import type { Game } from "./Game";
import type { TileDefinition, TileType } from "./Tile";

export type PlayerInitialStats = {
  hp: number;
  attackPower: number;
  level: number;
  exp: number;
  nextLevelExp: number;
  maxBagItems: number;
};

export type DungeonConfig = {
  width: number;
  height: number;
  maxRooms: number;
  minRoomSize: number;
  maxRoomSize: number;
};

export type EquipmentDefinition = {
  atk: number;
};

export type EnemyDefinition = {
  id: string;
  char: string;
  color: string;
  name: string;
  maxHp: number;
  attackPower: number;
  expValue: number;
  ai: "chase";
};

export type ItemDefinition = {
  id: string;
  name: string;
  char: string;
  color: string;
  healAmount?: number;
  equipment?: EquipmentDefinition;
};

export type FloorGenerationRule = {
  enemyCount(floor: number, roomIndex: number): number;
  itemDrops: Array<{
    itemId: string;
    chance: number;
  }>;
};

export type GameMessages = {
  floorArrive(floor: number): string;
  attack(attacker: Actor, defender: Actor, damage: number): string;
  defeat(defenderName: string): string;
  defeatWithExp(defenderName: string, exp: number): string;
  gameOver(): string;
  restart(): string;
  pickupToBag(itemName: string): string;
  bagFull(itemName: string): string;
  itemUsed(itemName: string, healed: number): string;
  weaponEquipped(itemName: string, atk: number): string;
};

export type GameHooks = {
  onAttack?(context: { game: Game; attacker: Actor; defender: Actor; damage: number }): void;
  onDeath?(context: { game: Game; actor: Actor }): void;
  onPickup?(context: { game: Game; itemName: string }): void;
  onFloorChange?(context: { game: Game; floor: number }): void;
  onGameOver?(context: { game: Game }): void;
};

export type GameConfig = {
  player: PlayerInitialStats;
  dungeon: DungeonConfig;
  tiles: Record<TileType, TileDefinition>;
  enemies: EnemyDefinition[];
  items: ItemDefinition[];
  floorRules: FloorGenerationRule;
  messages: GameMessages;
  hooks?: GameHooks;
};
