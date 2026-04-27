import { describe, it, expect, vi } from "vitest";
import { ItemEffectRegistry, numberParam } from "../../../src/engine/registry/ItemEffectRegistry";
import type { Game } from "../../../src/engine/core/Game";
import type { Player } from "../../../src/game/Player";
import type { ItemEffectContext } from "../../../src/engine/registry/ItemEffectRegistry";

function makeContext(overrides: Partial<ItemEffectContext> = {}): ItemEffectContext {
  return {
    game: {} as Game,
    player: {} as Player,
    itemName: "テストアイテム",
    params: {},
    source: "use",
    ...overrides,
  };
}

describe("ItemEffectRegistry", () => {
  it("登録したハンドラが呼ばれる", () => {
    const registry = new ItemEffectRegistry();
    const handler = vi.fn();
    registry.register("testEffect", handler);

    const ctx = makeContext();
    registry.run("testEffect", ctx);
    expect(handler).toHaveBeenCalledWith(ctx);
  });

  it("未登録のIDでrunするとエラーを投げる", () => {
    const registry = new ItemEffectRegistry();
    expect(() => registry.run("unknown", makeContext())).toThrow("Unknown item effect: unknown");
  });
});

describe("numberParam()", () => {
  it("数値パラメータを返す", () => {
    expect(numberParam({ amount: 10 }, "amount")).toBe(10);
  });

  it("キーが存在しない場合はfallbackを返す", () => {
    expect(numberParam({}, "amount", 5)).toBe(5);
  });

  it("fallbackを省略した場合は0を返す", () => {
    expect(numberParam({}, "amount")).toBe(0);
  });

  it("値が文字列の場合はfallbackを返す", () => {
    expect(numberParam({ amount: "strong" }, "amount", 3)).toBe(3);
  });

  it("値がbooleanの場合はfallbackを返す", () => {
    expect(numberParam({ active: true }, "active", 7)).toBe(7);
  });

  it("Infinityはfallbackを返す", () => {
    expect(numberParam({ amount: Infinity }, "amount", 1)).toBe(1);
  });

  it("NaNはfallbackを返す", () => {
    expect(numberParam({ amount: NaN }, "amount", 2)).toBe(2);
  });
});
