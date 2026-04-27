// ---------------------------------------------------------------------------
// ゲーム設定の型定義
//
// GameConfig がすべての設定の親型。ConfigPanel で編集し、
// プロジェクト JSON として保存・読込できる。
// ---------------------------------------------------------------------------

import type { Actor } from "./Entity";
import type { Game } from "./Game";
import type { ScriptDefinition } from "./Script";
import type { TileDefinition, TileType } from "./Tile";

/** ゲーム開始時のプレイヤー初期ステータス。 */
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

/** ダンジョン生成パラメータ。 */
export type DungeonConfig = {
  width: number;
  height: number;
  maxRooms: number;
  minRoomSize: number;
  maxRoomSize: number;
};

/** アイテム効果に渡すパラメータ（amount, atk など）。 */
export type EffectParams = Record<string, number | string | boolean>;

/** 敵の種類を定義する。ConfigPanel で編集可能。 */
export type EnemyDefinition = {
  id: string;
  char: string;
  color: string;
  name: string;
  maxHp: number;
  attackPower: number;
  expValue: number;
  aiId: string;
  /** aiId の代わりにスクリプトで AI を定義する場合に設定する。 */
  aiScript?: ScriptDefinition;
};

/** アイテムの種類を定義する。ConfigPanel で編集可能。 */
export type ItemDefinition = {
  id: string;
  name: string;
  char: string;
  color: string;
  effects: Array<{
    effectId: string;
    params: EffectParams;
  }>;
  /** effects の代わりにスクリプトで効果を定義する場合に設定する。 */
  effectScript?: ScriptDefinition;
};

/** 階層ごとの敵・アイテム出現ルール。fromFloor〜toFloor の範囲に適用される。 */
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

/** 全階層共通の生成設定と、階層ごとのルール一覧。 */
export type DungeonGenerationRules = {
  floors: FloorRangeRule[];
  maxEnemies: number;
  maxItems: number;
};

/** Canvas 描画の色・サイズ設定。 */
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

/** 視界（FOV）の設定。 */
export type FovConfig = {
  radius: number;
};

/** レベルアップ時のステータス成長設定。 */
export type ProgressionConfig = {
  nextLevelMultiplier: number;
  hpGainPerLevel: number;
  attackGainPerLevel: number;
};

/** ゲーム中に表示するログ文言のテンプレート関数群。 */
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

/** ゲームイベント発生時に外部から処理を差し込むためのフック。 */
export type GameHooks = {
  onAttack?(context: { game: Game; attacker: Actor; defender: Actor; damage: number }): void;
  onDeath?(context: { game: Game; actor: Actor }): void;
  onPickup?(context: { game: Game; itemName: string }): void;
  onFloorChange?(context: { game: Game; floor: number }): void;
  onGameOver?(context: { game: Game }): void;
};

/** ゲーム全体の設定を束ねる親型。プロジェクト JSON として保存される。 */
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
