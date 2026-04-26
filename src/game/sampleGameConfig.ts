import type { GameConfig } from "../engine/GameConfig";
import { defaultTileDefinitions } from "../engine/Tile";

export const sampleGameConfig: GameConfig = {
  player: {
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
    { id: "weak", char: "s", color: "#7cc7d8", name: "スライム", maxHp: 8, attackPower: 2, expValue: 4, ai: "chase" },
    { id: "normal", char: "g", color: "#9bd37d", name: "ゴブリン", maxHp: 10, attackPower: 3, expValue: 5, ai: "chase" },
    { id: "strong", char: "O", color: "#d88964", name: "オーク", maxHp: 16, attackPower: 5, expValue: 9, ai: "chase" },
  ],
  items: [
    { id: "potion", name: "回復薬", char: "!", color: "#ff6fae", healAmount: 8 },
    { id: "sword", name: "剣", char: ")", color: "#f0d978", equipment: { atk: 3 } },
  ],
  floorRules: {
    enemyCount(_floor, _roomIndex) {
      return Math.random() < 0.7 ? 1 : 2;
    },
    itemDrops: [
      { itemId: "potion", chance: 0.55 },
      { itemId: "sword", chance: 0.25 },
    ],
  },
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
  },
};
