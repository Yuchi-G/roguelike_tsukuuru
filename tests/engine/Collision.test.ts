import { describe, it, expect } from "vitest";
import { getBlockingEntityAt } from "../../src/engine/Collision";
import { Entity } from "../../src/engine/Entity";
import type { Game } from "../../src/engine/Game";

class TestEntity extends Entity {
  update(_game: Game): void {}
}

describe("getBlockingEntityAt()", () => {
  it("指定座標に移動ブロックエンティティがいれば返す", () => {
    const blocker = new TestEntity(3, 4, "X", "red", true);
    const result = getBlockingEntityAt([blocker], 3, 4);
    expect(result).toBe(blocker);
  });

  it("エンティティがいなければundefinedを返す", () => {
    const result = getBlockingEntityAt([], 0, 0);
    expect(result).toBeUndefined();
  });

  it("座標が合わなければundefinedを返す", () => {
    const blocker = new TestEntity(1, 1, "X", "red", true);
    expect(getBlockingEntityAt([blocker], 2, 1)).toBeUndefined();
    expect(getBlockingEntityAt([blocker], 1, 2)).toBeUndefined();
  });

  it("blocksMovementがfalseのエンティティは返さない", () => {
    const nonBlocker = new TestEntity(0, 0, ".", "white", false);
    expect(getBlockingEntityAt([nonBlocker], 0, 0)).toBeUndefined();
  });

  it("複数エンティティから正しいものを選ぶ", () => {
    const a = new TestEntity(1, 0, "A", "red", true);
    const b = new TestEntity(0, 1, "B", "blue", true);
    expect(getBlockingEntityAt([a, b], 0, 1)).toBe(b);
  });
});
