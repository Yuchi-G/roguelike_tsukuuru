import type { GameConfig } from "../engine/GameConfig";
import { defaultTileDefinitions } from "../engine/Tile";

export const sampleGameConfig: GameConfig = {
  player: {
    name: "プレイヤー",
    char: "@",
    color: "#f5f0d0",
    hp: 30,
    attackPower: 5,
    level: 1,
    exp: 0,
    nextLevelExp: 10,
    maxBagItems: 10,
  },
  dungeon: {
    width: 48,
    height: 32,
    maxRooms: 12,
    minRoomSize: 5,
    maxRoomSize: 10,
  },
  tiles: defaultTileDefinitions,
  enemies: [
    { id: "weak", char: "s", color: "#7cc7d8", name: "スライム", maxHp: 8, attackPower: 2, expValue: 4, aiId: "chase" },
    { id: "normal", char: "g", color: "#9bd37d", name: "ゴブリン", maxHp: 10, attackPower: 3, expValue: 5, aiId: "chase" },
    { id: "strong", char: "O", color: "#d88964", name: "オーク", maxHp: 16, attackPower: 5, expValue: 9, aiId: "chase" },
    // flee AIのサンプル: HPが半分以下になると逃げ出す。main.tsでAIを登録している。
    { id: "bat", char: "b", color: "#c8a0d8", name: "コウモリ", maxHp: 6, attackPower: 2, expValue: 3, aiId: "flee" },
  ],
  items: [
    { id: "potion", name: "回復薬", char: "!", color: "#ff6fae", effects: [{ effectId: "heal", params: { amount: 8 } }] },
    { id: "sword", name: "剣", char: ")", color: "#f0d978", effects: [{ effectId: "equipWeapon", params: { atk: 3 } }] },
    // fullHeal効果のサンプル: HP全回復。main.tsで効果を登録している。
    { id: "elixir", name: "エリクサー", char: "~", color: "#a0e0ff", effects: [{ effectId: "fullHeal", params: {} }] },
  ],
  floorRules: {
    maxEnemies: 12,
    maxItems: 8,
    floors: [
      {
        id: "default",
        fromFloor: 1,
        enemyCount: { min: 1, max: 2 },
        enemyTable: [
          { enemyId: "weak", weight: 4 },
          { enemyId: "normal", weight: 3 },
          { enemyId: "strong", weight: 1 },
          { enemyId: "bat", weight: 2 },
        ],
        itemDrops: [
          { itemId: "potion", chance: 0.55 },
          { itemId: "sword", chance: 0.25 },
          { itemId: "elixir", chance: 0.10 },
        ],
        enemyHpBonusPerFloor: 0.8,
        enemyAttackBonusPerFloor: 0.2,
      },
    ],
  },
  render: {
    tileSize: 20,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    canvasBackground: "#050605",
    unexploredColor: "#000000",
    unexploredBackground: "#050605",
    exploredColor: "#2b312b",
    exploredBackground: "#080a08",
    gameOverOverlay: "rgba(0, 0, 0, 0.68)",
    gameOverTitleColor: "#ff8c7a",
    gameOverTextColor: "#e7e2d2",
  },
  fov: {
    radius: 8,
  },
  progression: {
    nextLevelMultiplier: 1.5,
    hpGainPerLevel: 5,
    attackGainPerLevel: 2,
  },
  // ConfigPanelのAI/効果選択肢に追加するカスタムID。実装はmain.tsで登録する。
  customAiIds: ["flee"],
  customEffectIds: ["fullHeal"],
  messages: {
    floorArrive: (floor) => `${floor}階に到着した。`,
    attack: (attacker, defender, damage) => `${attacker.name}が${defender.name}に${damage}ダメージ。`,
    defeat: (defenderName) => `${defenderName}を倒した。`,
    defeatWithExp: (defenderName, exp) => `${defenderName}を倒した（+${exp} EXP）`,
    gameOver: () => "プレイヤーは倒れた。",
    restart: () => "Enterキーで新しいゲームを開始。",
    pickupToBag: (itemName) => `${itemName}を拾った。バッグに入れた。`,
    bagFull: (itemName) => `バッグがいっぱいだ。${itemName}をどうする？`,
    itemUsed: (itemName, healed) => `${itemName}を使った。HP +${healed}。`,
    weaponEquipped: (itemName, atk) => `${itemName}を拾った。武器を装備した（ATK +${atk}）。`,
    blockedByBagChoice: () => "バッグの整理を先に決める必要がある。",
    blockedByWall: () => "壁に阻まれた。",
    noUsableItem: () => "バッグに使えるアイテムがない。",
    invalidBagSelection: () => "捨てるアイテムを選べなかった。",
    bagItemReplaced: (pickedName, droppedName) => `${pickedName}をバッグに入れた。${droppedName}を捨てた。`,
    pickedItemDiscarded: (itemName) => `${itemName}を捨てた。`,
    levelUp: (level) => `Level Up! Lv.${level}`,
    useStairsPrompt: () => "階段の上でSpaceキーを押す必要がある。",
  },
};
