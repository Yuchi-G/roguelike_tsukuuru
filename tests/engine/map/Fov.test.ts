import { describe, it, expect } from "vitest";
import { Fov } from "../../../src/engine/map/Fov";
import { GameMap } from "../../../src/engine/map/Map";
import { Tile } from "../../../src/engine/map/Tile";

function makeFloorMap(w: number, h: number): GameMap {
  const floor = new Tile("floor", ".", "#888", "#000", false);
  return new GameMap(w, h, floor);
}

function setWall(map: GameMap, x: number, y: number): void {
  map.setTile(x, y, Tile.wall());
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

describe("壁による遮蔽", () => {
  it("壁タイル自体は見える", () => {
    const map = makeFloorMap(20, 20);
    setWall(map, 12, 10);
    const fov = new Fov(5);
    fov.compute(map, 10, 10);
    expect(fov.isVisible(12, 10)).toBe(true);
  });

  it("壁の手前の床は見える", () => {
    const map = makeFloorMap(20, 20);
    setWall(map, 12, 10);
    const fov = new Fov(5);
    fov.compute(map, 10, 10);
    expect(fov.isVisible(11, 10)).toBe(true);
  });

  it("壁の向こう側の床は見えない", () => {
    const map = makeFloorMap(20, 20);
    // (10,10)の右に壁を置く
    setWall(map, 12, 10);
    const fov = new Fov(5);
    fov.compute(map, 10, 10);
    expect(fov.isVisible(13, 10)).toBe(false);
    expect(fov.isVisible(14, 10)).toBe(false);
  });

  it("横一列の壁で向こう側が全て隠れる", () => {
    const map = makeFloorMap(20, 20);
    // (10,10)の上方向 y=8 に壁の列を作る
    for (let x = 7; x <= 13; x += 1) {
      setWall(map, x, 8);
    }
    const fov = new Fov(5);
    fov.compute(map, 10, 10);
    // 壁の列自体は見える
    expect(fov.isVisible(10, 8)).toBe(true);
    // 壁の向こう側は見えない
    expect(fov.isVisible(10, 7)).toBe(false);
    expect(fov.isVisible(10, 6)).toBe(false);
  });

  it("壁の隙間からは見える", () => {
    const map = makeFloorMap(20, 20);
    // (10,10)の上方向に壁を置くが、1マス隙間を空ける
    setWall(map, 9, 8);
    setWall(map, 11, 8);
    // (10,8) は床のまま → 隙間
    const fov = new Fov(5);
    fov.compute(map, 10, 10);
    // 隙間の先は見える
    expect(fov.isVisible(10, 7)).toBe(true);
  });

  it("斜め方向でも壁で遮蔽される", () => {
    const map = makeFloorMap(20, 20);
    // 右上斜めに壁を置く
    setWall(map, 11, 9);
    const fov = new Fov(5);
    fov.compute(map, 10, 10);
    // 壁自体は見える
    expect(fov.isVisible(11, 9)).toBe(true);
    // 壁の向こう（さらに右上）は遮蔽される
    expect(fov.isVisible(12, 8)).toBe(false);
  });

  it("L字の廊下で角の先が見えない", () => {
    // 小さい部屋を作る: 壁に囲まれた空間
    const map = makeFloorMap(15, 15);
    // (7,7) にプレイヤー。右方向に壁、右下に廊下
    // 右側に壁の列
    for (let y = 5; y <= 9; y += 1) {
      setWall(map, 9, y);
    }
    const fov = new Fov(8);
    fov.compute(map, 7, 7);
    // 壁の向こう側（右側）は見えない
    expect(fov.isVisible(10, 7)).toBe(false);
    expect(fov.isVisible(11, 7)).toBe(false);
  });
});

describe("Fov.isVisibleFrom()", () => {
  it("同じ座標は常にtrue", () => {
    const map = makeFloorMap(20, 20);
    const fov = new Fov();
    expect(fov.isVisibleFrom(map, 5, 5, 5, 5, 8)).toBe(true);
  });

  it("壁がなければ半径内が見える", () => {
    const map = makeFloorMap(20, 20);
    const fov = new Fov();
    expect(fov.isVisibleFrom(map, 5, 5, 8, 5, 8)).toBe(true);
  });

  it("壁の向こう側は見えない", () => {
    const map = makeFloorMap(20, 20);
    setWall(map, 7, 5);
    const fov = new Fov();
    expect(fov.isVisibleFrom(map, 5, 5, 9, 5, 8)).toBe(false);
  });

  it("半径外は見えない", () => {
    const map = makeFloorMap(20, 20);
    const fov = new Fov();
    expect(fov.isVisibleFrom(map, 5, 5, 15, 5, 3)).toBe(false);
  });

  it("プレイヤーのFOV状態に影響しない", () => {
    const map = makeFloorMap(20, 20);
    const fov = new Fov(3);
    fov.compute(map, 10, 10);
    // isVisibleFrom を呼んでも、compute 結果は変わらない
    fov.isVisibleFrom(map, 5, 5, 8, 5, 8);
    expect(fov.isVisible(10, 10)).toBe(true);
    expect(fov.isVisible(5, 5)).toBe(false);
  });
});
