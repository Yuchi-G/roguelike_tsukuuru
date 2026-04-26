import { describe, it, expect } from "vitest";
import { Actor } from "../../src/engine/Entity";
import type { Game } from "../../src/engine/Game";

class TestActor extends Actor {
  update(_game: Game): void {}
}

function makeActor(hp: number, maxHp: number, atk = 5): TestActor {
  return new TestActor(0, 0, "@", "white", "Hero", hp, maxHp, atk);
}

describe("Actor.isDead", () => {
  it("HPが0より大きければ生存", () => {
    expect(makeActor(1, 10).isDead).toBe(false);
  });

  it("HPが0になれば死亡", () => {
    expect(makeActor(0, 10).isDead).toBe(true);
  });

  it("HPが負でも死亡扱い", () => {
    const actor = makeActor(1, 10);
    actor.hp = -5;
    expect(actor.isDead).toBe(true);
  });
});

describe("Actor.damage()", () => {
  it("ダメージをHPから引く", () => {
    const actor = makeActor(10, 10);
    actor.damage(3);
    expect(actor.hp).toBe(7);
  });

  it("HPは0未満にならない", () => {
    const actor = makeActor(5, 10);
    actor.damage(100);
    expect(actor.hp).toBe(0);
  });

  it("ダメージが0のときHPは変わらない", () => {
    const actor = makeActor(10, 10);
    actor.damage(0);
    expect(actor.hp).toBe(10);
  });

  it("小数点のダメージは丸められる", () => {
    const actor = makeActor(10, 10);
    actor.damage(2.6);
    expect(actor.hp).toBe(7);
  });
});

describe("Actor.heal()", () => {
  it("HPを回復する", () => {
    const actor = makeActor(5, 10);
    const healed = actor.heal(3);
    expect(actor.hp).toBe(8);
    expect(healed).toBe(3);
  });

  it("最大HPを超えない", () => {
    const actor = makeActor(8, 10);
    const healed = actor.heal(5);
    expect(actor.hp).toBe(10);
    expect(healed).toBe(2);
  });

  it("すでに最大HPなら0を返す", () => {
    const actor = makeActor(10, 10);
    const healed = actor.heal(5);
    expect(actor.hp).toBe(10);
    expect(healed).toBe(0);
  });

  it("小数点の回復量は丸められる", () => {
    const actor = makeActor(5, 10);
    actor.heal(2.4);
    expect(actor.hp).toBe(7);
  });
});
