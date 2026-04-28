import { describe, it, expect } from "vitest";
import { getBlockingEntityAt } from "../../../src/engine/map/Collision";
import { Entity } from "../../../src/engine/core/Entity";
import type { Game } from "../../../src/engine/core/Game";

class TestEntity extends Entity {
  update(_game: Game): void {}
}

describe("getBlockingEntityAt()", () => {
  it("指定座標に移動ブロックエンティティがいれば返す", () => {
    const blockingEntity = new TestEntity(3, 4, "X", "red", true);
    const foundBlockingEntity = getBlockingEntityAt([blockingEntity], 3, 4);
    expect(foundBlockingEntity).toBe(blockingEntity);
  });

  it("エンティティがいなければundefinedを返す", () => {
    const foundBlockingEntity = getBlockingEntityAt([], 0, 0);
    expect(foundBlockingEntity).toBeUndefined();
  });

  it("座標が合わなければundefinedを返す", () => {
    const blockingEntity = new TestEntity(1, 1, "X", "red", true);
    expect(getBlockingEntityAt([blockingEntity], 2, 1)).toBeUndefined();
    expect(getBlockingEntityAt([blockingEntity], 1, 2)).toBeUndefined();
  });

  it("blocksMovementがfalseのエンティティは返さない", () => {
    const nonBlocker = new TestEntity(0, 0, ".", "white", false);
    expect(getBlockingEntityAt([nonBlocker], 0, 0)).toBeUndefined();
  });

  it("複数エンティティから正しいものを選ぶ", () => {
    const firstBlockingEntity = new TestEntity(1, 0, "A", "red", true);
    const secondBlockingEntity = new TestEntity(0, 1, "B", "blue", true);
    expect(getBlockingEntityAt([firstBlockingEntity, secondBlockingEntity], 0, 1)).toBe(secondBlockingEntity);
  });
});
