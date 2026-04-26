import type { Actor } from "./Entity";
import type { Game } from "./Game";
import type { TileDefinition, TileType } from "./Tile";

export type PlayerInitialStats = {
  name: string;
  char: string;
  color: string;
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

export type EffectParams = Record<string, number | string | boolean>;

export type EnemyDefinition = {
  id: string;
  char: string;
  color: string;
  name: string;
  maxHp: number;
  attackPower: number;
  expValue: number;
  aiId: string;
};

export type ItemDefinition = {
  id: string;
  name: string;
  char: string;
  color: string;
  effects: Array<{
    effectId: string;
    params: EffectParams;
  }>;
};

export type FloorRangeRule = {
  id: string;
  fromFloor: number;
  toFloor?: number;
  enemyCount: {
    min: number;
    max: number;
  };
  enemyTable: Array<{
    enemyId: string;
    weight: number;
  }>;
  itemDrops: Array<{
    itemId: string;
    chance: number;
  }>;
  enemyHpBonusPerFloor: number;
  enemyAttackBonusPerFloor: number;
};

export type DungeonGenerationRules = {
  floors: FloorRangeRule[];
  maxEnemies: number;
  maxItems: number;
};

export type RenderConfig = {
  tileSize: number;
  fontFamily: string;
  canvasBackground: string;
  unexploredColor: string;
  unexploredBackground: string;
  exploredColor: string;
  exploredBackground: string;
  gameOverOverlay: string;
  gameOverTitleColor: string;
  gameOverTextColor: string;
};

export type FovConfig = {
  radius: number;
};

export type ProgressionConfig = {
  nextLevelMultiplier: number;
  hpGainPerLevel: number;
  attackGainPerLevel: number;
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
  blockedByBagChoice(): string;
  blockedByWall(): string;
  noUsableItem(): string;
  invalidBagSelection(): string;
  bagItemReplaced(pickedName: string, droppedName: string): string;
  pickedItemDiscarded(itemName: string): string;
  levelUp(level: number): string;
  useStairsPrompt(): string;
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
  floorRules: DungeonGenerationRules;
  render: RenderConfig;
  fov: FovConfig;
  progression: ProgressionConfig;
  messages: GameMessages;
  hooks?: GameHooks;
  /** ConfigPanelの敵AI選択肢に追加するカスタムAI ID一覧。実装はmain.tsでaiRegistryへ登録する。 */
  customAiIds?: string[];
  /** ConfigPanelのアイテム効果選択肢に追加するカスタム効果 ID一覧。実装はmain.tsでitemEffectRegistryへ登録する。 */
  customEffectIds?: string[];
};
