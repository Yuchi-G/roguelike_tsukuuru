import { describe, it, expect } from "vitest";
import { Player, type BagItem } from "../../src/game/Player";
import type { PlayerInitialStats } from "../../src/engine/core/GameConfig";

const BASE_STATS: PlayerInitialStats = {
  name: "Hero",
  char: "@",
  color: "white",
  hp: 20,
  attackPower: 5,
  level: 1,
  exp: 0,
  nextLevelExp: 10,
  maxBagItems: 3,
};

function makePlayer(overrides: Partial<PlayerInitialStats> = {}): Player {
  return new Player(0, 0, { ...BASE_STATS, ...overrides });
}

function makeBagItem(name = "回復薬"): BagItem {
  return { name, effectId: "heal", params: { amount: 10 }, description: "HP +10" };
}

describe("Player.isBagFull", () => {
  it("バッグが空のときfalse", () => {
    expect(makePlayer().isBagFull).toBe(false);
  });

  it("上限ちょうどのときtrue", () => {
    const player = makePlayer({ maxBagItems: 2 });
    player.addItem(makeBagItem());
    player.addItem(makeBagItem());
    expect(player.isBagFull).toBe(true);
  });
});

describe("Player.getAttack()", () => {
  it("武器なしは基礎攻撃力のみ", () => {
    const player = makePlayer({ attackPower: 5 });
    expect(player.getAttack()).toBe(5);
  });

  it("武器装備時は基礎攻撃力 + 武器攻撃力", () => {
    const player = makePlayer({ attackPower: 5 });
    player.weapon = { name: "剣", atk: 3 };
    expect(player.getAttack()).toBe(8);
  });
});

describe("Player.addItem()", () => {
  it("バッグに追加してtrueを返す", () => {
    const player = makePlayer();
    const result = player.addItem(makeBagItem());
    expect(result).toBe(true);
    expect(player.itemBag).toHaveLength(1);
  });

  it("バッグが満杯のときfalseを返してアイテムを追加しない", () => {
    const player = makePlayer({ maxBagItems: 1 });
    player.addItem(makeBagItem("A"));
    const result = player.addItem(makeBagItem("B"));
    expect(result).toBe(false);
    expect(player.itemBag).toHaveLength(1);
  });
});

describe("Player.replaceItemAt()", () => {
  it("指定インデックスのアイテムを交換して古いアイテムを返す", () => {
    const player = makePlayer();
    player.addItem(makeBagItem("古いアイテム"));
    const dropped = player.replaceItemAt(0, makeBagItem("新しいアイテム"));
    expect(dropped?.name).toBe("古いアイテム");
    expect(player.itemBag[0].name).toBe("新しいアイテム");
  });

  it("インデックスが範囲外のときnullを返す", () => {
    const player = makePlayer();
    expect(player.replaceItemAt(0, makeBagItem())).toBeNull();
    expect(player.replaceItemAt(-1, makeBagItem())).toBeNull();
  });
});

describe("Player.takeBagItemAt()", () => {
  it("指定インデックスのアイテムを取り出してバッグから削除する", () => {
    const player = makePlayer();
    player.addItem(makeBagItem("A"));
    player.addItem(makeBagItem("B"));
    const item = player.takeBagItemAt(0);
    expect(item?.name).toBe("A");
    expect(player.itemBag).toHaveLength(1);
    expect(player.itemBag[0].name).toBe("B");
  });

  it("インデックスが範囲外のときnullを返す", () => {
    const player = makePlayer();
    expect(player.takeBagItemAt(0)).toBeNull();
    expect(player.takeBagItemAt(-1)).toBeNull();
  });
});

describe("Player.checkLevelUp()", () => {
  it("経験値が足りなければレベルアップしない", () => {
    const player = makePlayer({ exp: 5, nextLevelExp: 10, level: 1 });
    const levelUps = player.checkLevelUp(1.5, 5, 2);
    expect(levelUps).toBe(0);
    expect(player.level).toBe(1);
  });

  it("経験値が足りればレベルアップする", () => {
    const player = makePlayer({ exp: 10, nextLevelExp: 10, level: 1 });
    const levelUps = player.checkLevelUp(1.5, 5, 2);
    expect(levelUps).toBe(1);
    expect(player.level).toBe(2);
  });

  it("レベルアップ時に最大HPが増えHPが全回復する", () => {
    const player = makePlayer({ hp: 15, exp: 10, nextLevelExp: 10 });
    const prevMaxHp = player.maxHp; // 20
    player.checkLevelUp(1.5, 10, 0);
    expect(player.maxHp).toBe(prevMaxHp + 10);
    expect(player.hp).toBe(player.maxHp);
  });

  it("レベルアップ時に攻撃力が増える", () => {
    const player = makePlayer({ attackPower: 5, exp: 10, nextLevelExp: 10 });
    player.checkLevelUp(1.5, 0, 3);
    expect(player.attackPower).toBe(8);
  });

  it("余剰経験値で連続レベルアップする", () => {
    // nextLevelExp=5、exp=12 → 2回レベルアップ (5消費→残7、次のnext=floor(5*1.5)=7→7消費)
    const player = makePlayer({ exp: 12, nextLevelExp: 5, level: 1 });
    const levelUps = player.checkLevelUp(1.5, 0, 0);
    expect(levelUps).toBe(2);
    expect(player.level).toBe(3);
  });

  it("レベルアップ後の必要経験値がmultiplierで増加する", () => {
    const player = makePlayer({ exp: 10, nextLevelExp: 10, level: 1 });
    player.checkLevelUp(2.0, 0, 0);
    expect(player.nextLevelExp).toBe(20);
  });
});
