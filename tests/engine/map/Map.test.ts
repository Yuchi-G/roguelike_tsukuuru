import { describe, it, expect } from "vitest";
import { GameMap } from "../../../src/engine/map/Map";
import { Tile } from "../../../src/engine/map/Tile";

function makeMap(w = 10, h = 10): GameMap {
  return new GameMap(w, h, Tile.wall());
}

function floorTile(): Tile {
  return new Tile("floor", ".", "#888", "#000", false);
}

describe("GameMap.index()", () => {
  it("2D座標を1D配列インデックスへ変換する", () => {
    const map = makeMap(10, 10);
    expect(map.index(0, 0)).toBe(0);
    expect(map.index(1, 0)).toBe(1);
    expect(map.index(0, 1)).toBe(10);
    expect(map.index(3, 2)).toBe(23);
  });
});

describe("GameMap.isInBounds()", () => {
  it("マップ内座標はtrue", () => {
    const map = makeMap(5, 5);
    expect(map.isInBounds(0, 0)).toBe(true);
    expect(map.isInBounds(4, 4)).toBe(true);
    expect(map.isInBounds(2, 2)).toBe(true);
  });

  it("マップ外座標はfalse", () => {
    const map = makeMap(5, 5);
    expect(map.isInBounds(-1, 0)).toBe(false);
    expect(map.isInBounds(0, -1)).toBe(false);
    expect(map.isInBounds(5, 0)).toBe(false);
    expect(map.isInBounds(0, 5)).toBe(false);
  });
});

describe("GameMap.getTile()", () => {
  it("設定されたタイルを返す", () => {
    const map = makeMap(5, 5);
    const floor = floorTile();
    map.setTile(2, 3, floor);
    expect(map.getTile(2, 3).type).toBe("floor");
  });

  it("マップ外は壁タイルを返す", () => {
    const map = makeMap(5, 5);
    expect(map.getTile(-1, 0).blocksMovement).toBe(true);
    expect(map.getTile(0, -1).blocksMovement).toBe(true);
    expect(map.getTile(10, 0).blocksMovement).toBe(true);
  });

  it("初期値は壁タイル", () => {
    const map = makeMap(5, 5);
    expect(map.getTile(2, 2).blocksMovement).toBe(true);
  });
});

describe("GameMap.setTile()", () => {
  it("指定座標のタイルを変更する", () => {
    const map = makeMap(5, 5);
    map.setTile(1, 1, floorTile());
    expect(map.getTile(1, 1).type).toBe("floor");
  });

  it("マップ外への書き込みは無視される", () => {
    const map = makeMap(5, 5);
    expect(() => map.setTile(-1, 0, floorTile())).not.toThrow();
    expect(() => map.setTile(10, 0, floorTile())).not.toThrow();
  });
});

describe("GameMap.isWalkable()", () => {
  it("床タイルは移動可能", () => {
    const map = makeMap(5, 5);
    map.setTile(2, 2, floorTile());
    expect(map.isWalkable(2, 2)).toBe(true);
  });

  it("壁タイルは移動不可", () => {
    const map = makeMap(5, 5);
    expect(map.isWalkable(2, 2)).toBe(false);
  });

  it("マップ外は移動不可", () => {
    const map = makeMap(5, 5);
    expect(map.isWalkable(-1, 0)).toBe(false);
    expect(map.isWalkable(5, 0)).toBe(false);
  });
});
