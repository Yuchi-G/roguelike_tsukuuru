import { describe, it, expect } from "vitest";
import { Fov } from "../../../src/engine/map/Fov";
import { GameMap } from "../../../src/engine/map/Map";
import { Tile } from "../../../src/engine/map/Tile";

function makeFloorMap(w: number, h: number): GameMap {
  const floor = new Tile("floor", ".", "#888", "#000", false);
  return new GameMap(w, h, floor);
}

describe("Fov.isVisible()", () => {
  it("compute前は何も見えない", () => {
    const fov = new Fov(3);
    expect(fov.isVisible(0, 0)).toBe(false);
  });

  it("プレイヤー位置は見える", () => {
    const map = makeFloorMap(20, 20);
    const fov = new Fov(3);
    fov.compute(map, 10, 10);
    expect(fov.isVisible(10, 10)).toBe(true);
  });

  it("半径内のタイルは見える", () => {
    const map = makeFloorMap(20, 20);
    const fov = new Fov(3);
    fov.compute(map, 10, 10);
    expect(fov.isVisible(10 + 3, 10)).toBe(true);
    expect(fov.isVisible(10, 10 - 3)).toBe(true);
    expect(fov.isVisible(10 + 3, 10 + 3)).toBe(true);
  });

  it("半径外のタイルは見えない", () => {
    const map = makeFloorMap(20, 20);
    const fov = new Fov(3);
    fov.compute(map, 10, 10);
    expect(fov.isVisible(10 + 4, 10)).toBe(false);
    expect(fov.isVisible(10, 10 + 4)).toBe(false);
  });

  it("マップ外は見えない", () => {
    const map = makeFloorMap(10, 10);
    const fov = new Fov(5);
    fov.compute(map, 0, 0);
    expect(fov.isVisible(-1, 0)).toBe(false);
  });

  it("compute再実行で前のvisibleがリセットされる", () => {
    const map = makeFloorMap(20, 20);
    const fov = new Fov(3);
    fov.compute(map, 10, 10);
    expect(fov.isVisible(13, 10)).toBe(true);
    fov.compute(map, 0, 0);
    expect(fov.isVisible(13, 10)).toBe(false);
  });
});

describe("Fov.isExplored()", () => {
  it("compute前は未探索", () => {
    const fov = new Fov(3);
    expect(fov.isExplored(5, 5)).toBe(false);
  });

  it("compute後は探索済みになる", () => {
    const map = makeFloorMap(20, 20);
    const fov = new Fov(3);
    fov.compute(map, 10, 10);
    expect(fov.isExplored(10, 10)).toBe(true);
    expect(fov.isExplored(13, 10)).toBe(true);
  });

  it("compute再実行後も以前に見えていたタイルは探索済みのまま", () => {
    const map = makeFloorMap(20, 20);
    const fov = new Fov(3);
    fov.compute(map, 10, 10);
    fov.compute(map, 0, 0);
    expect(fov.isExplored(10, 10)).toBe(true);
  });
});
