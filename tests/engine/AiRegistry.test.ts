import { describe, it, expect, vi } from "vitest";
import { AiRegistry, chaseMove } from "../../src/engine/AiRegistry";
import { Actor } from "../../src/engine/Entity";
import type { Game } from "../../src/engine/Game";

class TestActor extends Actor {
  update(_game: Game): void {}
}

function makeActor(x: number, y: number): TestActor {
  return new TestActor(x, y, "@", "white", "TestActor", 10, 10, 5);
}

function makeGame(playerX: number, playerY: number, tryMoveResult = true) {
  const player = makeActor(playerX, playerY);
  return {
    player,
    attack: vi.fn(),
    tryMoveActor: vi.fn(() => tryMoveResult),
  } as unknown as Game;
}

describe("AiRegistry", () => {
  it("登録したハンドラが呼ばれる", () => {
    const registry = new AiRegistry();
    const handler = vi.fn();
    registry.register("test", handler);

    const game = makeGame(5, 5);
    const enemy = makeActor(0, 0);
    registry.run("test", { game, enemy });

    expect(handler).toHaveBeenCalledOnce();
  });

  it("未登録のIDでrunするとエラーを投げる", () => {
    const registry = new AiRegistry();
    const game = makeGame(0, 0);
    const enemy = makeActor(0, 0);
    expect(() => registry.run("unknown", { game, enemy })).toThrow("Unknown enemy AI: unknown");
  });

  it("同じIDで上書き登録できる", () => {
    const registry = new AiRegistry();
    const first = vi.fn();
    const second = vi.fn();
    registry.register("ai", first);
    registry.register("ai", second);

    const game = makeGame(0, 0);
    const enemy = makeActor(0, 0);
    registry.run("ai", { game, enemy });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });
});

describe("chaseMove()", () => {
  it("マンハッタン距離が1のとき攻撃する", () => {
    const game = makeGame(1, 0);
    const enemy = makeActor(0, 0);
    chaseMove(game, enemy);
    expect(game.attack).toHaveBeenCalledWith(enemy, game.player);
    expect(game.tryMoveActor).not.toHaveBeenCalled();
  });

  it("|dx| > |dy| のとき横方向を優先して移動する", () => {
    // プレイヤーが右3、下1 → |dx|=3 > |dy|=1 なので先に横
    const game = makeGame(3, 1);
    const enemy = makeActor(0, 0);
    chaseMove(game, enemy);
    expect(game.tryMoveActor).toHaveBeenNthCalledWith(1, enemy, 1, 0);
  });

  it("|dy| >= |dx| のとき縦方向を優先して移動する", () => {
    // プレイヤーが右1、下3 → |dx|=1 < |dy|=3 なので先に縦
    const game = makeGame(1, 3);
    const enemy = makeActor(0, 0);
    chaseMove(game, enemy);
    expect(game.tryMoveActor).toHaveBeenNthCalledWith(1, enemy, 0, 1);
  });

  it("横方向が壁に当たった場合は縦方向にフォールバックする", () => {
    const game = makeGame(3, 1);
    (game.tryMoveActor as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const enemy = makeActor(0, 0);
    chaseMove(game, enemy);
    // 1回目: (stepX=1, 0) が失敗 → 2回目: (0, stepY=1)
    expect(game.tryMoveActor).toHaveBeenCalledTimes(2);
    expect(game.tryMoveActor).toHaveBeenNthCalledWith(2, enemy, 0, 1);
  });

  it("縦方向が壁に当たった場合は横方向にフォールバックする", () => {
    const game = makeGame(1, 3);
    (game.tryMoveActor as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const enemy = makeActor(0, 0);
    chaseMove(game, enemy);
    // 1回目: (0, stepY=1) が失敗 → 2回目: (stepX=1, 0)
    expect(game.tryMoveActor).toHaveBeenCalledTimes(2);
    expect(game.tryMoveActor).toHaveBeenNthCalledWith(2, enemy, 1, 0);
  });

  it("プレイヤーが左上にいる場合、移動方向が負になる", () => {
    const game = makeGame(0, 0);
    const enemy = makeActor(5, 3);
    chaseMove(game, enemy);
    // |dx|=5 > |dy|=3 なので先に横 (stepX=-1)
    expect(game.tryMoveActor).toHaveBeenNthCalledWith(1, enemy, -1, 0);
  });
});
