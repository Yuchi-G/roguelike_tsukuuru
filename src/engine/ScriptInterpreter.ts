// ---------------------------------------------------------------------------
// ビジュアルスクリプトエンジン — インタープリタ
//
// ScriptDefinition を受け取り、ゲーム状態を操作しながら逐次実行する。
// ---------------------------------------------------------------------------

import type { Actor } from "./Entity";
import type { Game } from "./Game";
import type {
  Action,
  ArithmeticOp,
  Condition,
  MoveMode,
  ScriptDefinition,
  ScriptNode,
  ScriptTarget,
  ScriptValue,
  StatKey,
  ValueRef,
  VariableScope,
} from "./Script";

// ========================== 実行コンテキスト ==========================

/** スクリプト実行中に参照・操作するゲーム状態。 */
export type ScriptContext = {
  game: Game;
  self: Actor;
  target?: Actor;
};

/** 変数ストア。スコープごとに分離する。 */
export class VariableStore {
  private global = new Map<string, ScriptValue>();
  private entity = new Map<string, Map<string, ScriptValue>>();
  private local = new Map<string, ScriptValue>();

  get(scope: VariableScope, name: string, entityId?: string): ScriptValue {
    switch (scope) {
      case "global":
        return this.global.get(name) ?? 0;
      case "entity": {
        const id = entityId ?? "";
        return this.entity.get(id)?.get(name) ?? 0;
      }
      case "local":
        return this.local.get(name) ?? 0;
    }
  }

  set(scope: VariableScope, name: string, value: ScriptValue, entityId?: string): void {
    switch (scope) {
      case "global":
        this.global.set(name, value);
        break;
      case "entity": {
        const id = entityId ?? "";
        if (!this.entity.has(id)) {
          this.entity.set(id, new Map());
        }
        this.entity.get(id)!.set(name, value);
        break;
      }
      case "local":
        this.local.set(name, value);
        break;
    }
  }

  clearLocal(): void {
    this.local.clear();
  }
}

// ========================== 制御フロー例外 ==========================

/** BREAK文をループの外に伝搬するための内部シグナル。 */
class BreakSignal {
  readonly _brand = "break";
}

/** WAIT文で実行を中断するシグナル（将来のターン待機用）。 */
class WaitSignal {
  constructor(readonly turns: number) {}
}

// ========================== 無限ループ防止 ==========================

const MAX_ITERATIONS = 1000;
const MAX_NODE_EXECUTIONS = 5000;

// ========================== インタープリタ ==========================

export class ScriptInterpreter {
  private variables: VariableStore;

  constructor(variables?: VariableStore) {
    this.variables = variables ?? new VariableStore();
  }

  getVariableStore(): VariableStore {
    return this.variables;
  }

  /** スクリプトを実行する。 */
  run(script: ScriptDefinition, context: ScriptContext): void {
    this.nodeExecutions = 0;
    this.variables.clearLocal();

    for (const variable of script.variables) {
      this.variables.set(variable.scope, variable.name, variable.initialValue, context.self.id);
    }

    this.executeNodes(script.body, context);
  }

  // ========================== ノード実行 ==========================

  private nodeExecutions = 0;

  private executeNodes(nodes: ScriptNode[], context: ScriptContext): void {
    for (const node of nodes) {
      this.nodeExecutions += 1;
      if (this.nodeExecutions > MAX_NODE_EXECUTIONS) {
        return;
      }
      const signal = this.executeNode(node, context);
      if (signal instanceof BreakSignal || signal instanceof WaitSignal) {
        return;
      }
    }
  }

  private executeNode(node: ScriptNode, context: ScriptContext): BreakSignal | WaitSignal | void {
    switch (node.type) {
      case "action":
        return this.executeAction(node.action, context);

      case "if": {
        if (this.evaluateCondition(node.condition, context)) {
          return this.executeBlock(node.then, context);
        } else if (node.else) {
          return this.executeBlock(node.else, context);
        }
        return;
      }

      case "loop": {
        const count = this.toNumber(this.resolveValue(node.count, context));
        const iterations = Math.min(count, MAX_ITERATIONS);
        for (let i = 0; i < iterations; i += 1) {
          const signal = this.executeBlock(node.body, context);
          if (signal instanceof BreakSignal) return;
          if (signal instanceof WaitSignal) return signal;
        }
        return;
      }

      case "while": {
        let iterations = 0;
        while (this.evaluateCondition(node.condition, context) && iterations < MAX_ITERATIONS) {
          iterations += 1;
          const signal = this.executeBlock(node.body, context);
          if (signal instanceof BreakSignal) return;
          if (signal instanceof WaitSignal) return signal;
        }
        return;
      }

      case "break":
        return new BreakSignal();
    }
  }

  private executeBlock(nodes: ScriptNode[], context: ScriptContext): BreakSignal | WaitSignal | void {
    for (const node of nodes) {
      this.nodeExecutions += 1;
      if (this.nodeExecutions > MAX_NODE_EXECUTIONS) {
        return;
      }
      const signal = this.executeNode(node, context);
      if (signal) return signal;
    }
  }

  // ========================== 条件評価 ==========================

  evaluateCondition(condition: Condition, context: ScriptContext): boolean {
    switch (condition.type) {
      case "compare": {
        const left = this.resolveValue(condition.left, context);
        const right = this.resolveValue(condition.right, context);
        return this.compare(left, condition.op, right);
      }

      case "and":
        return condition.conditions.every((c) => this.evaluateCondition(c, context));

      case "or":
        return condition.conditions.some((c) => this.evaluateCondition(c, context));

      case "not":
        return !this.evaluateCondition(condition.condition, context);

      case "hasItem": {
        const actor = this.resolveTarget(condition.target, context);
        if (!actor) return false;
        const player = this.asPlayer(actor, context);
        if (!player) return false;
        return player.itemBag.some((item) => item.effectId === condition.itemId || item.name === condition.itemId);
      }

      case "hasStatus":
        // 状態異常システムはフェーズ2で実装。現時点では常にfalse。
        return false;

      case "inRange": {
        const a = this.resolveTarget(condition.target, context);
        const b = this.resolveTarget(condition.from, context);
        if (!a || !b) return false;
        const dist = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        const maxDist = this.toNumber(this.resolveValue(condition.distance, context));
        return dist <= maxDist;
      }

      case "inFov": {
        const observed = this.resolveTarget(condition.target, context);
        const observer = this.resolveTarget(condition.observer, context);
        if (!observed || !observer) return false;
        return context.game.fov.isVisible(observed.x, observed.y);
      }

      case "random": {
        const percent = this.toNumber(this.resolveValue(condition.percent, context));
        return Math.random() * 100 < percent;
      }

      case "true":
        return true;

      case "false":
        return false;
    }
  }

  // ========================== アクション実行 ==========================

  private executeAction(action: Action, context: ScriptContext): WaitSignal | void {
    switch (action.type) {
      case "move":
        this.executeMove(action.actor, action.mode, context);
        return;

      case "attack": {
        const attacker = this.resolveTarget(action.attacker, context);
        const defender = this.resolveTarget(action.defender, context);
        if (attacker && defender) {
          context.game.attack(attacker, defender);
        }
        return;
      }

      case "useSkill":
        // スキルシステムはフェーズ2で実装。
        return;

      case "damage": {
        const target = this.resolveTarget(action.target, context);
        if (target) {
          const amount = this.toNumber(this.resolveValue(action.amount, context));
          target.damage(amount);
        }
        return;
      }

      case "heal": {
        const target = this.resolveTarget(action.target, context);
        if (target) {
          const amount = this.toNumber(this.resolveValue(action.amount, context));
          target.heal(amount);
        }
        return;
      }

      case "addStatus":
        // 状態異常システムはフェーズ2で実装。
        return;

      case "removeStatus":
        // 状態異常システムはフェーズ2で実装。
        return;

      case "setStat": {
        const target = this.resolveTarget(action.target, context);
        if (target) {
          const value = this.toNumber(this.resolveValue(action.value, context));
          this.setStatValue(target, action.stat, value, context);
        }
        return;
      }

      case "setVariable": {
        const value = this.resolveValue(action.value, context);
        this.variables.set(action.scope, action.name, value, context.self.id);
        return;
      }

      case "addVariable": {
        const current = this.variables.get(action.scope, action.name, context.self.id);
        const operand = this.resolveValue(action.value, context);
        const result = this.applyArithmetic(current, action.op, operand);
        this.variables.set(action.scope, action.name, result, context.self.id);
        return;
      }

      case "offerBagItem": {
        // アイテムIDからアイテム定義を取得してofferBagItemを呼ぶ。
        const itemDef = context.game.config.items.find((i) => i.id === action.itemId);
        if (itemDef) {
          const effect = itemDef.effects[0];
          const paramValue = effect ? this.effectParamValue(effect.effectId, effect.params) : 0;
          context.game.offerBagItem({
            name: itemDef.name,
            effectId: effect?.effectId ?? "",
            params: effect?.params ?? {},
            description: effect?.effectId === "equipWeapon" ? `ATK +${paramValue}` : `HP +${paramValue}`,
          });
        }
        return;
      }

      case "equipWeapon": {
        const target = this.resolveTarget(action.target, context);
        const player = target ? this.asPlayer(target, context) : null;
        if (player) {
          const itemName = String(this.resolveValue(action.itemName, context));
          const atk = this.toNumber(this.resolveValue(action.atk, context));
          if (player.weapon !== null) {
            const oldWeapon = player.weapon;
            player.addItem({
              name: oldWeapon.name,
              effectId: "equipWeapon",
              params: { atk: oldWeapon.atk },
              description: `ATK +${oldWeapon.atk}`,
            });
          }
          player.weapon = { name: itemName, atk };
          context.game.logger.add(context.game.config.messages.weaponEquipped(itemName, atk));
        }
        return;
      }

      case "spawnEntity":
        // マップシステムはフェーズ3で実装。
        return;

      case "warpMap":
        // マップシステムはフェーズ3で実装。
        return;

      case "log": {
        const message = action.message.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => {
          const ref = action.params[key];
          if (!ref) return match;
          return String(this.resolveValue(ref, context));
        });
        context.game.logger.add(message);
        return;
      }

      case "wait": {
        const turns = this.toNumber(this.resolveValue(action.turns, context));
        return new WaitSignal(turns);
      }

      case "endGame":
        context.game.endGame();
        return;

      case "doNothing":
        return;
    }
  }

  // ========================== 移動 ==========================

  private executeMove(actorRef: ScriptTarget, mode: MoveMode, context: ScriptContext): void {
    const actor = this.resolveTarget(actorRef, context);
    if (!actor) return;

    switch (mode.type) {
      case "toward": {
        const target = this.resolveTarget(mode.target, context);
        if (!target) return;
        this.moveToward(actor, target, context);
        return;
      }

      case "away": {
        const target = this.resolveTarget(mode.target, context);
        if (!target) return;
        this.moveAway(actor, target, context);
        return;
      }

      case "random": {
        const directions = [
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 },
        ];
        const direction = directions[Math.floor(Math.random() * directions.length)];
        context.game.tryMoveActor(actor, direction.dx, direction.dy);
        return;
      }

      case "direction":
        context.game.tryMoveActor(actor, mode.dx, mode.dy);
        return;
    }
  }

  /** 対象に1歩近づく。隣接なら攻撃しない（攻撃はattackアクションで明示的に行う）。 */
  private moveToward(actor: Actor, target: Actor, context: ScriptContext): void {
    const dx = target.x - actor.x;
    const dy = target.y - actor.y;
    const stepX = Math.sign(dx);
    const stepY = Math.sign(dy);

    if (Math.abs(dx) > Math.abs(dy)) {
      if (!context.game.tryMoveActor(actor, stepX, 0)) {
        context.game.tryMoveActor(actor, 0, stepY);
      }
    } else {
      if (!context.game.tryMoveActor(actor, 0, stepY)) {
        context.game.tryMoveActor(actor, stepX, 0);
      }
    }
  }

  /** 対象から1歩逃げる。 */
  private moveAway(actor: Actor, target: Actor, context: ScriptContext): void {
    const dx = actor.x - target.x;
    const dy = actor.y - target.y;
    const stepX = Math.sign(dx);
    const stepY = Math.sign(dy);

    if (Math.abs(dx) > Math.abs(dy)) {
      if (!context.game.tryMoveActor(actor, stepX, 0)) {
        context.game.tryMoveActor(actor, 0, stepY);
      }
    } else {
      if (!context.game.tryMoveActor(actor, 0, stepY)) {
        context.game.tryMoveActor(actor, stepX, 0);
      }
    }
  }

  // ========================== 値の解決 ==========================

  resolveValue(ref: ValueRef, context: ScriptContext): ScriptValue {
    switch (ref.type) {
      case "literal":
        return ref.value;

      case "variable":
        return this.variables.get(ref.scope, ref.name, context.self.id);

      case "stat": {
        const actor = this.resolveTarget(ref.target, context);
        if (!actor) return 0;
        return this.getStatValue(actor, ref.stat, context);
      }
    }
  }

  // ========================== ターゲット解決 ==========================

  resolveTarget(target: ScriptTarget, context: ScriptContext): Actor | null {
    switch (target) {
      case "self":
        return context.self;
      case "player":
        return context.game.player;
      case "target":
        return context.target ?? null;
      case "currentEnemy":
        return context.self.id !== context.game.player.id ? context.self : null;
    }
  }

  // ========================== ステータス ==========================

  private getStatValue(actor: Actor, stat: StatKey, context: ScriptContext): number {
    switch (stat) {
      case "hp":
        return actor.hp;
      case "maxHp":
        return actor.maxHp;
      case "hpPercent":
        return actor.maxHp > 0 ? Math.round((actor.hp / actor.maxHp) * 100) : 0;
      case "mp":
        // フェーズ2で実装
        return 0;
      case "maxMp":
        return 0;
      case "mpPercent":
        return 0;
      case "atk":
        return actor.attackPower;
      case "def":
        // フェーズ2で実装
        return 0;
      case "spd":
        // フェーズ2で実装
        return 0;
      case "level": {
        const player = this.asPlayer(actor, context);
        return player?.level ?? 0;
      }
      case "exp": {
        const player = this.asPlayer(actor, context);
        return player?.exp ?? 0;
      }
      case "floor":
        return context.game.floor;
    }
  }

  private setStatValue(actor: Actor, stat: StatKey, value: number, context: ScriptContext): void {
    switch (stat) {
      case "hp":
        actor.hp = Math.max(0, Math.min(actor.maxHp, Math.round(value)));
        break;
      case "maxHp":
        actor.maxHp = Math.max(1, Math.round(value));
        actor.hp = Math.min(actor.hp, actor.maxHp);
        break;
      case "atk":
        actor.attackPower = Math.max(0, Math.round(value));
        break;
      case "level": {
        const player = this.asPlayer(actor, context);
        if (player) player.level = Math.max(1, Math.round(value));
        break;
      }
      case "exp": {
        const player = this.asPlayer(actor, context);
        if (player) player.exp = Math.max(0, Math.round(value));
        break;
      }
      // 読み取り専用または未実装のステータスは何もしない
      default:
        break;
    }
  }

  // ========================== ユーティリティ ==========================

  private compare(left: ScriptValue, op: string, right: ScriptValue): boolean {
    const l = typeof left === "number" ? left : String(left);
    const r = typeof right === "number" ? right : String(right);
    switch (op) {
      case "==": return l === r;
      case "!=": return l !== r;
      case "<":  return l < r;
      case "<=": return l <= r;
      case ">":  return l > r;
      case ">=": return l >= r;
      default: return false;
    }
  }

  private applyArithmetic(current: ScriptValue, op: ArithmeticOp, operand: ScriptValue): ScriptValue {
    const a = this.toNumber(current);
    const b = this.toNumber(operand);
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b !== 0 ? a / b : 0;
      case "%": return b !== 0 ? a % b : 0;
    }
  }

  private toNumber(value: ScriptValue): number {
    if (typeof value === "number") return value;
    if (typeof value === "boolean") return value ? 1 : 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private asPlayer(actor: Actor, context: ScriptContext): import("../game/Player").Player | null {
    return actor.id === context.game.player.id ? context.game.player : null;
  }

  private effectParamValue(effectId: string, params: Record<string, number | string | boolean>): number {
    const key = effectId === "equipWeapon" ? "atk" : "amount";
    const value = params[key];
    return typeof value === "number" ? value : 0;
  }
}
