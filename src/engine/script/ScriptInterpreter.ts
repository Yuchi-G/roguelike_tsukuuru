// ---------------------------------------------------------------------------
// ビジュアルスクリプトエンジン — インタープリタ
//
// ScriptDefinition を受け取り、ゲーム状態を操作しながら逐次実行する。
// ---------------------------------------------------------------------------

import type { Actor } from "../core/Entity";
import type { Game } from "../core/Game";
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
  private globalVariables = new Map<string, ScriptValue>();
  private entityVariablesByEntityId = new Map<string, Map<string, ScriptValue>>();
  private localVariables = new Map<string, ScriptValue>();

  get(scope: VariableScope, variableName: string, entityId?: string): ScriptValue {
    switch (scope) {
      case "global":
        return this.globalVariables.get(variableName) ?? 0;
      case "entity": {
        const resolvedEntityId = entityId ?? "";
        return this.entityVariablesByEntityId.get(resolvedEntityId)?.get(variableName) ?? 0;
      }
      case "local":
        return this.localVariables.get(variableName) ?? 0;
    }
  }

  has(scope: VariableScope, variableName: string, entityId?: string): boolean {
    switch (scope) {
      case "global":
        return this.globalVariables.has(variableName);
      case "entity": {
        const resolvedEntityId = entityId ?? "";
        return this.entityVariablesByEntityId.get(resolvedEntityId)?.has(variableName) ?? false;
      }
      case "local":
        return this.localVariables.has(variableName);
    }
  }

  set(scope: VariableScope, variableName: string, variableValue: ScriptValue, entityId?: string): void {
    switch (scope) {
      case "global":
        this.globalVariables.set(variableName, variableValue);
        break;
      case "entity": {
        const resolvedEntityId = entityId ?? "";
        if (!this.entityVariablesByEntityId.has(resolvedEntityId)) {
          this.entityVariablesByEntityId.set(resolvedEntityId, new Map());
        }
        this.entityVariablesByEntityId.get(resolvedEntityId)!.set(variableName, variableValue);
        break;
      }
      case "local":
        this.localVariables.set(variableName, variableValue);
        break;
    }
  }

  clearLocal(): void {
    this.localVariables.clear();
  }
}

// ========================== 制御フロー例外 ==========================

/** BREAK文をループの外に伝搬するための内部シグナル。 */
class BreakSignal {
  readonly _brand = "break";
}

/** WAIT文で実行を中断するシグナル（将来のターン待機用）。 */
class WaitSignal {
  constructor(readonly waitTurns: number) {}
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

    for (const scriptVariableDefinition of script.variables) {
      if (
        scriptVariableDefinition.scope === "local" ||
        !this.variables.has(scriptVariableDefinition.scope, scriptVariableDefinition.name, context.self.id)
      ) {
        this.variables.set(
          scriptVariableDefinition.scope,
          scriptVariableDefinition.name,
          scriptVariableDefinition.initialValue,
          context.self.id,
        );
      }
    }

    this.executeNodes(script.body, context);
  }

  // ========================== ノード実行 ==========================

  private nodeExecutions = 0;

  private executeNodes(scriptNodes: ScriptNode[], context: ScriptContext): void {
    for (const scriptNode of scriptNodes) {
      this.nodeExecutions += 1;
      if (this.nodeExecutions > MAX_NODE_EXECUTIONS) {
        return;
      }
      const controlSignal = this.executeNode(scriptNode, context);
      if (controlSignal instanceof BreakSignal || controlSignal instanceof WaitSignal) {
        return;
      }
    }
  }

  private executeNode(scriptNode: ScriptNode, context: ScriptContext): BreakSignal | WaitSignal | void {
    switch (scriptNode.type) {
      case "action":
        return this.executeAction(scriptNode.action, context);

      case "if": {
        if (this.evaluateCondition(scriptNode.condition, context)) {
          return this.executeBlock(scriptNode.then, context);
        } else if (scriptNode.else) {
          return this.executeBlock(scriptNode.else, context);
        }
        return;
      }

      case "loop": {
        const loopCount = this.toNumber(this.resolveValue(scriptNode.count, context));
        const iterationLimit = Math.min(loopCount, MAX_ITERATIONS);
        for (let iterationIndex = 0; iterationIndex < iterationLimit; iterationIndex += 1) {
          const controlSignal = this.executeBlock(scriptNode.body, context);
          if (controlSignal instanceof BreakSignal) return;
          if (controlSignal instanceof WaitSignal) return controlSignal;
        }
        return;
      }

      case "while": {
        let iterationCount = 0;
        while (this.evaluateCondition(scriptNode.condition, context) && iterationCount < MAX_ITERATIONS) {
          iterationCount += 1;
          const controlSignal = this.executeBlock(scriptNode.body, context);
          if (controlSignal instanceof BreakSignal) return;
          if (controlSignal instanceof WaitSignal) return controlSignal;
        }
        return;
      }

      case "break":
        return new BreakSignal();
    }
  }

  private executeBlock(scriptNodes: ScriptNode[], context: ScriptContext): BreakSignal | WaitSignal | void {
    for (const scriptNode of scriptNodes) {
      this.nodeExecutions += 1;
      if (this.nodeExecutions > MAX_NODE_EXECUTIONS) {
        return;
      }
      const controlSignal = this.executeNode(scriptNode, context);
      if (controlSignal) return controlSignal;
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
        return condition.conditions.every((childCondition) => this.evaluateCondition(childCondition, context));

      case "or":
        return condition.conditions.some((childCondition) => this.evaluateCondition(childCondition, context));

      case "not":
        return !this.evaluateCondition(condition.condition, context);

      case "hasItem": {
        const targetActor = this.resolveTarget(condition.target, context);
        if (!targetActor) return false;
        const player = this.asPlayer(targetActor, context);
        if (!player) return false;
        return player.itemBag.some((bagItem) => bagItem.effectId === condition.itemId || bagItem.name === condition.itemId);
      }

      case "hasStatus":
        // 状態異常システムはフェーズ2で実装。現時点では常にfalse。
        return false;

      case "inRange": {
        const targetActor = this.resolveTarget(condition.target, context);
        const originActor = this.resolveTarget(condition.from, context);
        if (!targetActor || !originActor) return false;
        const manhattanDistance = Math.abs(targetActor.x - originActor.x) + Math.abs(targetActor.y - originActor.y);
        const maxDistance = this.toNumber(this.resolveValue(condition.distance, context));
        return manhattanDistance <= maxDistance;
      }

      case "inFov": {
        const observedActor = this.resolveTarget(condition.target, context);
        const observerActor = this.resolveTarget(condition.observer, context);
        if (!observedActor || !observerActor) return false;
        if (observerActor.id === context.game.player.id) {
          return context.game.fov.isVisible(observedActor.x, observedActor.y);
        }
        const visionRadius = context.game.config.fov.radius;
        return context.game.fov.isVisibleFrom(
          context.game.map,
          observerActor.x,
          observerActor.y,
          observedActor.x,
          observedActor.y,
          visionRadius,
        );
      }

      case "random": {
        const percentChance = this.toNumber(this.resolveValue(condition.percent, context));
        return Math.random() * 100 < percentChance;
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
        const attackerActor = this.resolveTarget(action.attacker, context);
        const defenderActor = this.resolveTarget(action.defender, context);
        if (attackerActor && defenderActor) {
          context.game.attack(attackerActor, defenderActor);
        }
        return;
      }

      case "useSkill":
        // スキルシステムはフェーズ2で実装。
        return;

      case "damage": {
        const targetActor = this.resolveTarget(action.target, context);
        if (targetActor) {
          const damageAmount = this.toNumber(this.resolveValue(action.amount, context));
          targetActor.damage(damageAmount);
        }
        return;
      }

      case "heal": {
        const targetActor = this.resolveTarget(action.target, context);
        if (targetActor) {
          const healAmount = this.toNumber(this.resolveValue(action.amount, context));
          targetActor.heal(healAmount);
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
        const targetActor = this.resolveTarget(action.target, context);
        if (targetActor) {
          const statValue = this.toNumber(this.resolveValue(action.value, context));
          this.setStatValue(targetActor, action.stat, statValue, context);
        }
        return;
      }

      case "setVariable": {
        const variableValue = this.resolveValue(action.value, context);
        this.variables.set(action.scope, action.name, variableValue, context.self.id);
        return;
      }

      case "addVariable": {
        const currentVariableValue = this.variables.get(action.scope, action.name, context.self.id);
        const arithmeticOperand = this.resolveValue(action.value, context);
        const updatedVariableValue = this.applyArithmetic(currentVariableValue, action.op, arithmeticOperand);
        this.variables.set(action.scope, action.name, updatedVariableValue, context.self.id);
        return;
      }

      case "offerBagItem": {
        // アイテムIDからアイテム定義を取得してofferBagItemを呼ぶ。
        const itemDefinition = context.game.config.items.find((itemDefinitionCandidate) => itemDefinitionCandidate.id === action.itemId);
        if (itemDefinition) {
          const primaryEffectDefinition = itemDefinition.effects[0];
          const primaryEffectAmount = primaryEffectDefinition
            ? this.effectParamValue(primaryEffectDefinition.effectId, primaryEffectDefinition.params)
            : 0;
          context.game.offerBagItem({
            name: itemDefinition.name,
            effectId: primaryEffectDefinition?.effectId ?? "",
            params: primaryEffectDefinition?.params ?? {},
            description: primaryEffectDefinition?.effectId === "equipWeapon" ? `ATK +${primaryEffectAmount}` : `HP +${primaryEffectAmount}`,
            useScript: itemDefinition.effectScript,
          });
        }
        return;
      }

      case "equipWeapon": {
        const targetActor = this.resolveTarget(action.target, context);
        const player = targetActor ? this.asPlayer(targetActor, context) : null;
        if (player) {
          const itemName = String(this.resolveValue(action.itemName, context));
          const weaponAttackBonus = this.toNumber(this.resolveValue(action.atk, context));
          if (player.weapon !== null) {
            const equippedWeapon = player.weapon;
            player.addItem({
              name: equippedWeapon.name,
              effectId: "equipWeapon",
              params: { atk: equippedWeapon.atk },
              description: `ATK +${equippedWeapon.atk}`,
            });
          }
          player.weapon = { name: itemName, atk: weaponAttackBonus };
          context.game.logger.add(context.game.config.messages.weaponEquipped(itemName, weaponAttackBonus));
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
        const message = action.message.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, placeholderName: string) => {
          const valueReference = action.params[placeholderName];
          if (!valueReference) return match;
          return String(this.resolveValue(valueReference, context));
        });
        context.game.logger.add(message);
        return;
      }

      case "wait": {
        const waitTurns = this.toNumber(this.resolveValue(action.turns, context));
        return new WaitSignal(waitTurns);
      }

      case "endGame":
        context.game.triggerGameOver();
        return;

      case "doNothing":
        return;
    }
  }

  // ========================== 移動 ==========================

  private executeMove(actorRef: ScriptTarget, mode: MoveMode, context: ScriptContext): void {
    const movingActor = this.resolveTarget(actorRef, context);
    if (!movingActor) return;

    switch (mode.type) {
      case "toward": {
        const targetActor = this.resolveTarget(mode.target, context);
        if (!targetActor) return;
        this.moveToward(movingActor, targetActor, context);
        return;
      }

      case "away": {
        const targetActor = this.resolveTarget(mode.target, context);
        if (!targetActor) return;
        this.moveAway(movingActor, targetActor, context);
        return;
      }

      case "random": {
        const cardinalDirections = [
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 },
        ];
        const selectedDirection = cardinalDirections[Math.floor(Math.random() * cardinalDirections.length)];
        context.game.tryMoveActorByDelta(movingActor, selectedDirection.dx, selectedDirection.dy);
        return;
      }

      case "direction":
        context.game.tryMoveActorByDelta(movingActor, mode.dx, mode.dy);
        return;
    }
  }

  /** 対象に1歩近づく。隣接なら攻撃しない（攻撃はattackアクションで明示的に行う）。 */
  private moveToward(movingActor: Actor, targetActor: Actor, context: ScriptContext): void {
    const deltaToTargetX = targetActor.x - movingActor.x;
    const deltaToTargetY = targetActor.y - movingActor.y;
    const stepX = Math.sign(deltaToTargetX);
    const stepY = Math.sign(deltaToTargetY);

    if (Math.abs(deltaToTargetX) > Math.abs(deltaToTargetY)) {
      if (!context.game.tryMoveActorByDelta(movingActor, stepX, 0)) {
        context.game.tryMoveActorByDelta(movingActor, 0, stepY);
      }
    } else {
      if (!context.game.tryMoveActorByDelta(movingActor, 0, stepY)) {
        context.game.tryMoveActorByDelta(movingActor, stepX, 0);
      }
    }
  }

  /** 対象から1歩逃げる。 */
  private moveAway(movingActor: Actor, targetActor: Actor, context: ScriptContext): void {
    const deltaAwayFromTargetX = movingActor.x - targetActor.x;
    const deltaAwayFromTargetY = movingActor.y - targetActor.y;
    const stepX = Math.sign(deltaAwayFromTargetX);
    const stepY = Math.sign(deltaAwayFromTargetY);

    if (Math.abs(deltaAwayFromTargetX) > Math.abs(deltaAwayFromTargetY)) {
      if (!context.game.tryMoveActorByDelta(movingActor, stepX, 0)) {
        context.game.tryMoveActorByDelta(movingActor, 0, stepY);
      }
    } else {
      if (!context.game.tryMoveActorByDelta(movingActor, 0, stepY)) {
        context.game.tryMoveActorByDelta(movingActor, stepX, 0);
      }
    }
  }

  // ========================== 値の解決 ==========================

  resolveValue(valueReference: ValueRef, context: ScriptContext): ScriptValue {
    switch (valueReference.type) {
      case "literal":
        return valueReference.value;

      case "variable":
        return this.variables.get(valueReference.scope, valueReference.name, context.self.id);

      case "stat": {
        const targetActor = this.resolveTarget(valueReference.target, context);
        if (!targetActor) return 0;
        return this.getStatValue(targetActor, valueReference.stat, context);
      }
    }
  }

  // ========================== ターゲット解決 ==========================

  resolveTarget(targetReference: ScriptTarget, context: ScriptContext): Actor | null {
    switch (targetReference) {
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

  private setStatValue(actor: Actor, stat: StatKey, statValue: number, context: ScriptContext): void {
    switch (stat) {
      case "hp":
        actor.hp = Math.max(0, Math.min(actor.maxHp, Math.round(statValue)));
        break;
      case "maxHp":
        actor.maxHp = Math.max(1, Math.round(statValue));
        actor.hp = Math.min(actor.hp, actor.maxHp);
        break;
      case "atk":
        actor.attackPower = Math.max(0, Math.round(statValue));
        break;
      case "level": {
        const player = this.asPlayer(actor, context);
        if (player) player.level = Math.max(1, Math.round(statValue));
        break;
      }
      case "exp": {
        const player = this.asPlayer(actor, context);
        if (player) player.exp = Math.max(0, Math.round(statValue));
        break;
      }
      // 読み取り専用または未実装のステータスは何もしない
      default:
        break;
    }
  }

  // ========================== ユーティリティ ==========================

  private compare(leftValue: ScriptValue, op: string, rightValue: ScriptValue): boolean {
    const comparableLeftValue = typeof leftValue === "number" ? leftValue : String(leftValue);
    const comparableRightValue = typeof rightValue === "number" ? rightValue : String(rightValue);
    switch (op) {
      case "==": return comparableLeftValue === comparableRightValue;
      case "!=": return comparableLeftValue !== comparableRightValue;
      case "<":  return comparableLeftValue < comparableRightValue;
      case "<=": return comparableLeftValue <= comparableRightValue;
      case ">":  return comparableLeftValue > comparableRightValue;
      case ">=": return comparableLeftValue >= comparableRightValue;
      default: return false;
    }
  }

  private applyArithmetic(currentValue: ScriptValue, op: ArithmeticOp, operandValue: ScriptValue): ScriptValue {
    const currentNumber = this.toNumber(currentValue);
    const operandNumber = this.toNumber(operandValue);
    switch (op) {
      case "+": return currentNumber + operandNumber;
      case "-": return currentNumber - operandNumber;
      case "*": return currentNumber * operandNumber;
      case "/": return operandNumber !== 0 ? currentNumber / operandNumber : 0;
      case "%": return operandNumber !== 0 ? currentNumber % operandNumber : 0;
    }
  }

  private toNumber(scriptValue: ScriptValue): number {
    if (typeof scriptValue === "number") return scriptValue;
    if (typeof scriptValue === "boolean") return scriptValue ? 1 : 0;
    const parsedNumber = Number(scriptValue);
    return Number.isFinite(parsedNumber) ? parsedNumber : 0;
  }

  private asPlayer(actor: Actor, context: ScriptContext): import("../../game/Player").Player | null {
    return actor.id === context.game.player.id ? context.game.player : null;
  }

  private effectParamValue(effectId: string, params: Record<string, number | string | boolean>): number {
    const paramName = effectId === "equipWeapon" ? "atk" : "amount";
    const paramValue = params[paramName];
    return typeof paramValue === "number" ? paramValue : 0;
  }
}
