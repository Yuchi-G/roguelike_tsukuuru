import { describe, it, expect, vi } from "vitest";
import { Actor } from "../../../src/engine/core/Entity";
import type { Game } from "../../../src/engine/core/Game";
import type { Fov } from "../../../src/engine/map/Fov";
import type { ScriptDefinition, ScriptNode, Condition, Action, ValueRef } from "../../../src/engine/script/Script";
import { ScriptInterpreter, VariableStore } from "../../../src/engine/script/ScriptInterpreter";

// ========================== テスト用ヘルパー ==========================

class TestActor extends Actor {
  update(_game: Game): void {}
}

function makeActor(x: number, y: number, hp = 10, maxHp = 20, atk = 5): TestActor {
  return new TestActor(x, y, "@", "white", "TestActor", hp, maxHp, atk);
}

function makeFov(visible = true, visibleFrom = true): Fov {
  return {
    isVisible: vi.fn(() => visible),
    isVisibleFrom: vi.fn(() => visibleFrom),
  } as unknown as Fov;
}

type TestLogger = { messages: string[]; add: ReturnType<typeof vi.fn>; all: ReturnType<typeof vi.fn> };

function makeLogger(): TestLogger {
  const messages: string[] = [];
  return {
    messages,
    add: vi.fn((msg: string) => messages.push(msg)),
    all: vi.fn(() => messages),
  };
}

function makeGame(overrides: Partial<Game> = {}): Game {
  const player = makeActor(5, 5, 20, 30, 8);
  const logger = makeLogger();
  return {
    player,
    enemies: [],
    items: [],
    floor: 1,
    isGameOver: false,
    fov: makeFov(true),
    logger,
    map: {},
    config: {
      items: [],
      fov: { radius: 8 },
      messages: {
        weaponEquipped: vi.fn((name: string, atk: number) => `${name} ATK+${atk}`),
      },
    },
    attack: vi.fn(),
    tryMoveActor: vi.fn(() => true),
    offerBagItem: vi.fn(),
    endGame: vi.fn(),
    ...overrides,
  } as unknown as Game;
}

function lit(value: number | string | boolean): ValueRef {
  return { type: "literal", value };
}

function script(body: ScriptNode[]): ScriptDefinition {
  return { id: "test", name: "test", trigger: "ai", variables: [], body };
}

function actionNode(action: Action): ScriptNode {
  return { type: "action", action };
}

// ========================== VariableStore ==========================

describe("VariableStore", () => {
  it("グローバル変数の読み書き", () => {
    const store = new VariableStore();
    store.set("global", "flag", 1);
    expect(store.get("global", "flag")).toBe(1);
  });

  it("エンティティ変数はエンティティIDで分離される", () => {
    const store = new VariableStore();
    store.set("entity", "count", 10, "enemy-a");
    store.set("entity", "count", 20, "enemy-b");
    expect(store.get("entity", "count", "enemy-a")).toBe(10);
    expect(store.get("entity", "count", "enemy-b")).toBe(20);
  });

  it("ローカル変数はclearLocalでリセットされる", () => {
    const store = new VariableStore();
    store.set("local", "tmp", 42);
    expect(store.get("local", "tmp")).toBe(42);
    store.clearLocal();
    expect(store.get("local", "tmp")).toBe(0);
  });

  it("未定義の変数は0を返す", () => {
    const store = new VariableStore();
    expect(store.get("global", "nonexistent")).toBe(0);
    expect(store.get("entity", "nonexistent", "any")).toBe(0);
    expect(store.get("local", "nonexistent")).toBe(0);
  });

  it("has: 変数の存在を確認できる", () => {
    const store = new VariableStore();
    expect(store.has("global", "flag")).toBe(false);
    store.set("global", "flag", 1);
    expect(store.has("global", "flag")).toBe(true);
  });

  it("has: エンティティ変数はIDごとに判定される", () => {
    const store = new VariableStore();
    expect(store.has("entity", "count", "enemy-a")).toBe(false);
    store.set("entity", "count", 10, "enemy-a");
    expect(store.has("entity", "count", "enemy-a")).toBe(true);
    expect(store.has("entity", "count", "enemy-b")).toBe(false);
  });
});

// ========================== 条件評価 ==========================

describe("evaluateCondition", () => {
  it("compare: 数値の比較 (<)", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame();
    const self = makeActor(0, 0, 5, 20);
    const cond: Condition = { type: "compare", left: lit(5), op: "<", right: lit(10) };
    expect(interp.evaluateCondition(cond, { game, self })).toBe(true);
  });

  it("compare: hpPercent をステータスから参照", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame();
    const self = makeActor(0, 0, 5, 20); // hpPercent = 25
    const cond: Condition = {
      type: "compare",
      left: { type: "stat", target: "self", stat: "hpPercent" },
      op: "<=",
      right: lit(50),
    };
    expect(interp.evaluateCondition(cond, { game, self })).toBe(true);
  });

  it("compare: == で文字列比較", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame();
    const self = makeActor(0, 0);
    const cond: Condition = { type: "compare", left: lit("hello"), op: "==", right: lit("hello") };
    expect(interp.evaluateCondition(cond, { game, self })).toBe(true);
  });

  it("and: すべて真なら真", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame();
    const self = makeActor(0, 0);
    const cond: Condition = { type: "and", conditions: [{ type: "true" }, { type: "true" }] };
    expect(interp.evaluateCondition(cond, { game, self })).toBe(true);
  });

  it("and: 一つでも偽なら偽", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame();
    const self = makeActor(0, 0);
    const cond: Condition = { type: "and", conditions: [{ type: "true" }, { type: "false" }] };
    expect(interp.evaluateCondition(cond, { game, self })).toBe(false);
  });

  it("or: 一つでも真なら真", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame();
    const self = makeActor(0, 0);
    const cond: Condition = { type: "or", conditions: [{ type: "false" }, { type: "true" }] };
    expect(interp.evaluateCondition(cond, { game, self })).toBe(true);
  });

  it("not: 真偽を反転", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame();
    const self = makeActor(0, 0);
    expect(interp.evaluateCondition({ type: "not", condition: { type: "true" } }, { game, self })).toBe(false);
    expect(interp.evaluateCondition({ type: "not", condition: { type: "false" } }, { game, self })).toBe(true);
  });

  it("inRange: マンハッタン距離で判定", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame();
    const self = makeActor(4, 5); // playerは(5,5)、距離1
    const cond: Condition = { type: "inRange", target: "player", from: "self", distance: lit(1) };
    expect(interp.evaluateCondition(cond, { game, self })).toBe(true);
  });

  it("inRange: 距離外なら偽", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame();
    const self = makeActor(0, 0); // playerは(5,5)、距離10
    const cond: Condition = { type: "inRange", target: "player", from: "self", distance: lit(1) };
    expect(interp.evaluateCondition(cond, { game, self })).toBe(false);
  });

  it("inFov: observerがプレイヤーならisVisibleで判定", () => {
    const interp = new ScriptInterpreter();
    const fov = makeFov(true);
    const game = makeGame({ fov });
    const self = makeActor(0, 0);
    const cond: Condition = { type: "inFov", target: "self", observer: "player" };
    expect(interp.evaluateCondition(cond, { game, self })).toBe(true);
    expect(fov.isVisible).toHaveBeenCalled();
    expect(fov.isVisibleFrom).not.toHaveBeenCalled();
  });

  it("inFov: observerがプレイヤーで不可視なら偽", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame({ fov: makeFov(false) });
    const self = makeActor(0, 0);
    const cond: Condition = { type: "inFov", target: "self", observer: "player" };
    expect(interp.evaluateCondition(cond, { game, self })).toBe(false);
  });

  it("inFov: observerが敵ならisVisibleFromで判定", () => {
    const interp = new ScriptInterpreter();
    const fov = makeFov(false, true);
    const game = makeGame({ fov });
    const self = makeActor(3, 3); // 敵（observer=self, target=player）
    const cond: Condition = { type: "inFov", target: "player", observer: "self" };
    expect(interp.evaluateCondition(cond, { game, self })).toBe(true);
    expect(fov.isVisible).not.toHaveBeenCalled();
    expect(fov.isVisibleFrom).toHaveBeenCalled();
  });

  it("inFov: observerが敵で見通せなければ偽", () => {
    const interp = new ScriptInterpreter();
    const fov = makeFov(true, false);
    const game = makeGame({ fov });
    const self = makeActor(3, 3);
    const cond: Condition = { type: "inFov", target: "player", observer: "self" };
    expect(interp.evaluateCondition(cond, { game, self })).toBe(false);
  });

  it("true / false", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame();
    const self = makeActor(0, 0);
    expect(interp.evaluateCondition({ type: "true" }, { game, self })).toBe(true);
    expect(interp.evaluateCondition({ type: "false" }, { game, self })).toBe(false);
  });
});

// ========================== アクション実行 ==========================

describe("アクション: move", () => {
  it("ランダム移動でtryMoveActorが呼ばれる", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame();
    const self = makeActor(3, 3);
    interp.run(script([actionNode({ type: "move", actor: "self", mode: { type: "random" } })]), { game, self });
    expect(game.tryMoveActor).toHaveBeenCalledOnce();
  });

  it("toward でプレイヤーに近づく", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame();
    const self = makeActor(2, 5); // playerは(5,5) → dx=3, dy=0 → 横優先
    interp.run(script([actionNode({ type: "move", actor: "self", mode: { type: "toward", target: "player" } })]), { game, self });
    expect(game.tryMoveActor).toHaveBeenCalledWith(self, 1, 0);
  });

  it("away でプレイヤーから逃げる", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame();
    const self = makeActor(4, 5); // playerは(5,5) → dx=-1, dy=0 → 逃げる方向(-1,0)
    interp.run(script([actionNode({ type: "move", actor: "self", mode: { type: "away", target: "player" } })]), { game, self });
    expect(game.tryMoveActor).toHaveBeenCalledWith(self, -1, 0);
  });
});

describe("アクション: attack", () => {
  it("game.attackが正しい引数で呼ばれる", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame();
    const self = makeActor(0, 0);
    interp.run(script([actionNode({ type: "attack", attacker: "self", defender: "player" })]), { game, self });
    expect(game.attack).toHaveBeenCalledWith(self, game.player);
  });
});

describe("アクション: damage / heal", () => {
  it("damage でHPが減る", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame();
    const self = makeActor(0, 0, 15, 20);
    interp.run(script([actionNode({ type: "damage", target: "self", amount: lit(5) })]), { game, self });
    expect(self.hp).toBe(10);
  });

  it("heal でHPが増える", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame();
    const self = makeActor(0, 0, 10, 20);
    interp.run(script([actionNode({ type: "heal", target: "self", amount: lit(8) })]), { game, self });
    expect(self.hp).toBe(18);
  });
});

describe("アクション: setVariable / addVariable", () => {
  it("setVariable でグローバル変数を設定", () => {
    const store = new VariableStore();
    const interp = new ScriptInterpreter(store);
    const game = makeGame();
    const self = makeActor(0, 0);
    interp.run(script([actionNode({ type: "setVariable", scope: "global", name: "flag", value: lit(42) })]), { game, self });
    expect(store.get("global", "flag")).toBe(42);
  });

  it("addVariable で変数を加算", () => {
    const store = new VariableStore();
    store.set("global", "count", 10);
    const interp = new ScriptInterpreter(store);
    const game = makeGame();
    const self = makeActor(0, 0);
    interp.run(script([actionNode({ type: "addVariable", scope: "global", name: "count", op: "+", value: lit(5) })]), { game, self });
    expect(store.get("global", "count")).toBe(15);
  });

  it("addVariable で乗算", () => {
    const store = new VariableStore();
    store.set("global", "count", 4);
    const interp = new ScriptInterpreter(store);
    const game = makeGame();
    const self = makeActor(0, 0);
    interp.run(script([actionNode({ type: "addVariable", scope: "global", name: "count", op: "*", value: lit(3) })]), { game, self });
    expect(store.get("global", "count")).toBe(12);
  });

  it("addVariable でゼロ除算は0を返す", () => {
    const store = new VariableStore();
    store.set("global", "x", 10);
    const interp = new ScriptInterpreter(store);
    const game = makeGame();
    const self = makeActor(0, 0);
    interp.run(script([actionNode({ type: "addVariable", scope: "global", name: "x", op: "/", value: lit(0) })]), { game, self });
    expect(store.get("global", "x")).toBe(0);
  });
});

describe("アクション: setStat", () => {
  it("HPを設定できる", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame();
    const self = makeActor(0, 0, 10, 20);
    interp.run(script([actionNode({ type: "setStat", target: "self", stat: "hp", value: lit(5) })]), { game, self });
    expect(self.hp).toBe(5);
  });

  it("HPはmaxHpを超えない", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame();
    const self = makeActor(0, 0, 10, 20);
    interp.run(script([actionNode({ type: "setStat", target: "self", stat: "hp", value: lit(999) })]), { game, self });
    expect(self.hp).toBe(20);
  });

  it("atkを設定できる", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame();
    const self = makeActor(0, 0, 10, 20, 5);
    interp.run(script([actionNode({ type: "setStat", target: "self", stat: "atk", value: lit(12) })]), { game, self });
    expect(self.attackPower).toBe(12);
  });
});

describe("アクション: log", () => {
  it("メッセージがロガーに追加される", () => {
    const interp = new ScriptInterpreter();
    const logger = makeLogger();
    const game = makeGame({ logger: logger as unknown as Game["logger"] });
    const self = makeActor(0, 0);
    interp.run(script([actionNode({ type: "log", message: "hello world", params: {} })]), { game, self });
    expect(logger.add).toHaveBeenCalledWith("hello world");
  });

  it("テンプレート変数が展開される", () => {
    const interp = new ScriptInterpreter();
    const logger = makeLogger();
    const game = makeGame({ logger: logger as unknown as Game["logger"] });
    const self = makeActor(0, 0);
    interp.run(script([actionNode({
      type: "log",
      message: "HP is {hp}",
      params: { hp: { type: "stat", target: "self", stat: "hp" } },
    })]), { game, self });
    expect(logger.messages[0]).toBe("HP is 10");
  });
});

describe("アクション: doNothing / endGame", () => {
  it("doNothingは何もしない", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame();
    const self = makeActor(0, 0);
    interp.run(script([actionNode({ type: "doNothing" })]), { game, self });
    expect(game.attack).not.toHaveBeenCalled();
    expect(game.tryMoveActor).not.toHaveBeenCalled();
  });

  it("endGameでゲームを終了する", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame();
    const self = makeActor(0, 0);
    interp.run(script([actionNode({ type: "endGame" })]), { game, self });
    expect(game.endGame).toHaveBeenCalledOnce();
  });
});

// ========================== 制御フロー ==========================

describe("制御フロー: if", () => {
  it("条件が真ならthenを実行", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame();
    const self = makeActor(0, 0, 15, 20);
    interp.run(script([{
      type: "if",
      condition: { type: "true" },
      then: [actionNode({ type: "damage", target: "self", amount: lit(3) })],
      else: [actionNode({ type: "heal", target: "self", amount: lit(5) })],
    }]), { game, self });
    expect(self.hp).toBe(12); // damage 3
  });

  it("条件が偽ならelseを実行", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame();
    const self = makeActor(0, 0, 15, 20);
    interp.run(script([{
      type: "if",
      condition: { type: "false" },
      then: [actionNode({ type: "damage", target: "self", amount: lit(3) })],
      else: [actionNode({ type: "heal", target: "self", amount: lit(5) })],
    }]), { game, self });
    expect(self.hp).toBe(20); // heal 5
  });

  it("elseがない場合、条件が偽なら何もしない", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame();
    const self = makeActor(0, 0, 15, 20);
    interp.run(script([{
      type: "if",
      condition: { type: "false" },
      then: [actionNode({ type: "damage", target: "self", amount: lit(3) })],
    }]), { game, self });
    expect(self.hp).toBe(15);
  });
});

describe("制御フロー: loop", () => {
  it("指定回数繰り返す", () => {
    const store = new VariableStore();
    const interp = new ScriptInterpreter(store);
    const game = makeGame();
    const self = makeActor(0, 0);
    interp.run(script([{
      type: "loop",
      count: lit(5),
      body: [actionNode({ type: "addVariable", scope: "global", name: "counter", op: "+", value: lit(1) })],
    }]), { game, self });
    expect(store.get("global", "counter")).toBe(5);
  });

  it("0回ループは何もしない", () => {
    const store = new VariableStore();
    const interp = new ScriptInterpreter(store);
    const game = makeGame();
    const self = makeActor(0, 0);
    interp.run(script([{
      type: "loop",
      count: lit(0),
      body: [actionNode({ type: "setVariable", scope: "global", name: "flag", value: lit(1) })],
    }]), { game, self });
    expect(store.get("global", "flag")).toBe(0);
  });

  it("breakでループを中断する", () => {
    const store = new VariableStore();
    const interp = new ScriptInterpreter(store);
    const game = makeGame();
    const self = makeActor(0, 0);
    interp.run(script([{
      type: "loop",
      count: lit(100),
      body: [
        actionNode({ type: "addVariable", scope: "global", name: "counter", op: "+", value: lit(1) }),
        {
          type: "if",
          condition: { type: "compare", left: { type: "variable", scope: "global", name: "counter" }, op: ">=", right: lit(3) },
          then: [{ type: "break" }],
        },
      ],
    }]), { game, self });
    expect(store.get("global", "counter")).toBe(3);
  });
});

describe("制御フロー: while", () => {
  it("条件が偽になるまで繰り返す", () => {
    const store = new VariableStore();
    const interp = new ScriptInterpreter(store);
    const game = makeGame();
    const self = makeActor(0, 0);
    interp.run(script([{
      type: "while",
      condition: { type: "compare", left: { type: "variable", scope: "global", name: "x" }, op: "<", right: lit(5) },
      body: [actionNode({ type: "addVariable", scope: "global", name: "x", op: "+", value: lit(1) })],
    }]), { game, self });
    expect(store.get("global", "x")).toBe(5);
  });

  it("最初から偽なら一度も実行されない", () => {
    const store = new VariableStore();
    store.set("global", "x", 10);
    const interp = new ScriptInterpreter(store);
    const game = makeGame();
    const self = makeActor(0, 0);
    interp.run(script([{
      type: "while",
      condition: { type: "compare", left: { type: "variable", scope: "global", name: "x" }, op: "<", right: lit(5) },
      body: [actionNode({ type: "setVariable", scope: "global", name: "flag", value: lit(1) })],
    }]), { game, self });
    expect(store.get("global", "flag")).toBe(0);
  });
});

// ========================== 変数スコープ ==========================

describe("変数スコープ", () => {
  it("スクリプトの variables でローカル変数が初期化される", () => {
    const store = new VariableStore();
    const interp = new ScriptInterpreter(store);
    const game = makeGame();
    const self = makeActor(0, 0);
    const s: ScriptDefinition = {
      id: "test", name: "test", trigger: "ai",
      variables: [{ name: "local_var", scope: "local", initialValue: 99 }],
      body: [actionNode({ type: "addVariable", scope: "local", name: "local_var", op: "+", value: lit(1) })],
    };
    interp.run(s, { game, self });
    // ローカルはrun内で初期化→加算→runの最後にclearLocalされる前の値
    // 実際にはclearLocalはrunの最初なので、次のrunで99に戻る
    expect(store.get("local", "local_var")).toBe(100);
  });

  it("entity変数は複数回のrunで初期値に戻らない", () => {
    const store = new VariableStore();
    const interp = new ScriptInterpreter(store);
    const game = makeGame();
    const enemy = makeActor(0, 0);
    const s: ScriptDefinition = {
      id: "test", name: "test", trigger: "ai",
      variables: [{ name: "counter", scope: "entity", initialValue: 0 }],
      body: [actionNode({ type: "addVariable", scope: "entity", name: "counter", op: "+", value: lit(1) })],
    };

    interp.run(s, { game, self: enemy });
    expect(store.get("entity", "counter", enemy.id)).toBe(1);

    interp.run(s, { game, self: enemy });
    expect(store.get("entity", "counter", enemy.id)).toBe(2);

    interp.run(s, { game, self: enemy });
    expect(store.get("entity", "counter", enemy.id)).toBe(3);
  });

  it("global変数は複数回のrunで初期値に戻らない", () => {
    const store = new VariableStore();
    const interp = new ScriptInterpreter(store);
    const game = makeGame();
    const self = makeActor(0, 0);
    const s: ScriptDefinition = {
      id: "test", name: "test", trigger: "ai",
      variables: [{ name: "total", scope: "global", initialValue: 0 }],
      body: [actionNode({ type: "addVariable", scope: "global", name: "total", op: "+", value: lit(10) })],
    };

    interp.run(s, { game, self });
    expect(store.get("global", "total")).toBe(10);

    interp.run(s, { game, self });
    expect(store.get("global", "total")).toBe(20);
  });

  it("local変数は毎回初期値に戻る", () => {
    const store = new VariableStore();
    const interp = new ScriptInterpreter(store);
    const game = makeGame();
    const self = makeActor(0, 0);
    const s: ScriptDefinition = {
      id: "test", name: "test", trigger: "ai",
      variables: [{ name: "tmp", scope: "local", initialValue: 0 }],
      body: [actionNode({ type: "addVariable", scope: "local", name: "tmp", op: "+", value: lit(1) })],
    };

    interp.run(s, { game, self });
    interp.run(s, { game, self });
    interp.run(s, { game, self });
    // localは毎回0から+1なので常に1
    expect(store.get("local", "tmp")).toBe(1);
  });

  it("別エンティティのentity変数は互いに影響しない", () => {
    const store = new VariableStore();
    const interp = new ScriptInterpreter(store);
    const game = makeGame();
    const enemy1 = makeActor(0, 0);
    const enemy2 = makeActor(1, 1);
    const s: ScriptDefinition = {
      id: "test", name: "test", trigger: "ai",
      variables: [{ name: "counter", scope: "entity", initialValue: 0 }],
      body: [actionNode({ type: "addVariable", scope: "entity", name: "counter", op: "+", value: lit(1) })],
    };

    interp.run(s, { game, self: enemy1 });
    interp.run(s, { game, self: enemy1 });
    interp.run(s, { game, self: enemy2 });

    expect(store.get("entity", "counter", enemy1.id)).toBe(2);
    expect(store.get("entity", "counter", enemy2.id)).toBe(1);
  });

  it("エンティティ変数はエンティティ間で独立", () => {
    const store = new VariableStore();
    const interp = new ScriptInterpreter(store);
    const game = makeGame();
    const enemy1 = makeActor(0, 0);
    const enemy2 = makeActor(1, 1);
    const s = script([actionNode({ type: "addVariable", scope: "entity", name: "turns", op: "+", value: lit(1) })]);

    interp.run(s, { game, self: enemy1 });
    interp.run(s, { game, self: enemy1 });
    interp.run(s, { game, self: enemy2 });

    expect(store.get("entity", "turns", enemy1.id)).toBe(2);
    expect(store.get("entity", "turns", enemy2.id)).toBe(1);
  });
});

// ========================== ValueRef 解決 ==========================

describe("resolveValue", () => {
  it("literal: そのままの値を返す", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame();
    const self = makeActor(0, 0);
    expect(interp.resolveValue(lit(42), { game, self })).toBe(42);
    expect(interp.resolveValue(lit("hello"), { game, self })).toBe("hello");
    expect(interp.resolveValue(lit(true), { game, self })).toBe(true);
  });

  it("variable: 変数ストアから値を取得", () => {
    const store = new VariableStore();
    store.set("global", "score", 100);
    const interp = new ScriptInterpreter(store);
    const game = makeGame();
    const self = makeActor(0, 0);
    expect(interp.resolveValue({ type: "variable", scope: "global", name: "score" }, { game, self })).toBe(100);
  });

  it("stat: Actorのステータスを返す", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame();
    const self = makeActor(0, 0, 8, 20, 3);
    expect(interp.resolveValue({ type: "stat", target: "self", stat: "hp" }, { game, self })).toBe(8);
    expect(interp.resolveValue({ type: "stat", target: "self", stat: "maxHp" }, { game, self })).toBe(20);
    expect(interp.resolveValue({ type: "stat", target: "self", stat: "atk" }, { game, self })).toBe(3);
    expect(interp.resolveValue({ type: "stat", target: "self", stat: "hpPercent" }, { game, self })).toBe(40);
  });

  it("stat: playerターゲットでプレイヤーの値を参照", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame(); // player hp=20, maxHp=30
    const self = makeActor(0, 0);
    expect(interp.resolveValue({ type: "stat", target: "player", stat: "hp" }, { game, self })).toBe(20);
  });

  it("stat: floor を返す", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame({ floor: 7 } as unknown as Partial<Game>);
    const self = makeActor(0, 0);
    expect(interp.resolveValue({ type: "stat", target: "self", stat: "floor" }, { game, self })).toBe(7);
  });
});

// ========================== 既存AI動作の再現 ==========================

describe("既存AI動作の再現", () => {
  it("chase: 隣接時に攻撃する", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame(); // playerは(5,5)
    const self = makeActor(4, 5); // 距離1

    const chaseScript = script([{
      type: "if",
      condition: { type: "inRange", target: "player", from: "self", distance: lit(1) },
      then: [actionNode({ type: "attack", attacker: "self", defender: "player" })],
      else: [actionNode({ type: "move", actor: "self", mode: { type: "toward", target: "player" } })],
    }]);

    interp.run(chaseScript, { game, self });
    expect(game.attack).toHaveBeenCalledWith(self, game.player);
    expect(game.tryMoveActor).not.toHaveBeenCalled();
  });

  it("chase: 離れている時に近づく", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame(); // playerは(5,5)
    const self = makeActor(0, 0); // 距離10

    const chaseScript = script([{
      type: "if",
      condition: { type: "inRange", target: "player", from: "self", distance: lit(1) },
      then: [actionNode({ type: "attack", attacker: "self", defender: "player" })],
      else: [actionNode({ type: "move", actor: "self", mode: { type: "toward", target: "player" } })],
    }]);

    interp.run(chaseScript, { game, self });
    expect(game.attack).not.toHaveBeenCalled();
    expect(game.tryMoveActor).toHaveBeenCalled();
  });

  it("flee: HP50%以下で逃走する", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame(); // playerは(5,5)
    const self = makeActor(4, 5, 3, 10); // hpPercent=30, 距離1

    const fleeScript = script([{
      type: "if",
      condition: {
        type: "compare",
        left: { type: "stat", target: "self", stat: "hpPercent" },
        op: "<=",
        right: lit(50),
      },
      then: [actionNode({ type: "move", actor: "self", mode: { type: "away", target: "player" } })],
      else: [
        {
          type: "if",
          condition: { type: "inRange", target: "player", from: "self", distance: lit(1) },
          then: [actionNode({ type: "attack", attacker: "self", defender: "player" })],
          else: [actionNode({ type: "move", actor: "self", mode: { type: "toward", target: "player" } })],
        },
      ],
    }]);

    interp.run(fleeScript, { game, self });
    expect(game.attack).not.toHaveBeenCalled();
    expect(game.tryMoveActor).toHaveBeenCalledWith(self, -1, 0); // 逃げる方向
  });

  it("flee: HP十分なら攻撃する", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame(); // playerは(5,5)
    const self = makeActor(4, 5, 8, 10); // hpPercent=80, 距離1

    const fleeScript = script([{
      type: "if",
      condition: {
        type: "compare",
        left: { type: "stat", target: "self", stat: "hpPercent" },
        op: "<=",
        right: lit(50),
      },
      then: [actionNode({ type: "move", actor: "self", mode: { type: "away", target: "player" } })],
      else: [
        {
          type: "if",
          condition: { type: "inRange", target: "player", from: "self", distance: lit(1) },
          then: [actionNode({ type: "attack", attacker: "self", defender: "player" })],
          else: [actionNode({ type: "move", actor: "self", mode: { type: "toward", target: "player" } })],
        },
      ],
    }]);

    interp.run(fleeScript, { game, self });
    expect(game.attack).toHaveBeenCalledWith(self, game.player);
  });

  it("stationary: 何もしない", () => {
    const interp = new ScriptInterpreter();
    const game = makeGame();
    const self = makeActor(0, 0);
    interp.run(script([actionNode({ type: "doNothing" })]), { game, self });
    expect(game.attack).not.toHaveBeenCalled();
    expect(game.tryMoveActor).not.toHaveBeenCalled();
  });
});

// ========================== 無限ループ防止 ==========================

describe("無限ループ防止", () => {
  it("whileの無限ループは最大回数で停止する", () => {
    const store = new VariableStore();
    const interp = new ScriptInterpreter(store);
    const game = makeGame();
    const self = makeActor(0, 0);
    interp.run(script([{
      type: "while",
      condition: { type: "true" },
      body: [actionNode({ type: "addVariable", scope: "global", name: "x", op: "+", value: lit(1) })],
    }]), { game, self });
    // MAX_ITERATIONS=1000 なので1000で止まる
    expect(store.get("global", "x")).toBe(1000);
  });

  it("nodeExecutions は run ごとにリセットされる", () => {
    const store = new VariableStore();
    const interp = new ScriptInterpreter(store);
    const game = makeGame();
    const self = makeActor(0, 0);

    // 1回目: 無限ループで MAX_NODE_EXECUTIONS に到達させる
    interp.run(script([{
      type: "while",
      condition: { type: "true" },
      body: [actionNode({ type: "addVariable", scope: "global", name: "a", op: "+", value: lit(1) })],
    }]), { game, self });

    // 2回目: リセットされていれば正常に実行できる
    store.set("global", "b", 0);
    interp.run(script([
      actionNode({ type: "setVariable", scope: "global", name: "b", value: lit(42) }),
    ]), { game, self });

    expect(store.get("global", "b")).toBe(42);
  });
});
