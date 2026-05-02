// ---------------------------------------------------------------------------
// ビジュアルスクリプトエディタ
//
// ScriptDefinition を GUI で組み立てるコンポーネント。
// ConfigPanel と同じく HTML 文字列ベースで、イベント委譲で操作する。
// ---------------------------------------------------------------------------

import type {
  Action,
  Condition,
  MoveMode,
  ScriptDefinition,
  ScriptNode,
  ScriptValue,
  ValueRef,
} from "../../engine/script/Script";

// ========================== 選択肢定義 ==========================

type Option = [value: string, label: string];

const NODE_TYPES: Option[] = [
  ["action", "アクション"],
  ["if", "条件分岐"],
  ["loop", "繰り返し"],
  ["while", "条件ループ"],
  ["break", "中断"],
];

const ACTION_TYPES: Option[] = [
  ["move", "移動"],
  ["attack", "攻撃"],
  ["damage", "ダメージ"],
  ["heal", "回復"],
  ["setStat", "ステータス変更"],
  ["setVariable", "変数を設定"],
  ["addVariable", "変数を加算"],
  // addStatus / removeStatus / useSkill / wait は未実装のため非表示
  ["offerBagItem", "バッグに入れる"],
  ["equipWeapon", "武器を装備"],
  ["log", "ログ表示"],
  ["endGame", "ゲーム終了"],
  ["doNothing", "何もしない"],
];

const CONDITION_TYPES: Option[] = [
  ["compare", "値の比較"],
  ["and", "すべて満たす (AND)"],
  ["or", "いずれか満たす (OR)"],
  ["not", "否定 (NOT)"],
  ["hasItem", "アイテム所持"],
  // hasStatus は未実装のため非表示
  ["inRange", "射程内"],
  ["inFov", "視界内"],
  ["random", "確率"],
  ["true", "常に真"],
  ["false", "常に偽"],
];

const TARGETS: Option[] = [
  ["self", "自分"],
  ["player", "プレイヤー"],
  ["target", "対象"],
  ["currentEnemy", "現在の敵"],
];

const STATS: Option[] = [
  ["hp", "HP"],
  ["maxHp", "最大HP"],
  ["hpPercent", "HP%"],
  ["mp", "MP"],
  ["maxMp", "最大MP"],
  ["mpPercent", "MP%"],
  ["atk", "攻撃力"],
  ["def", "防御力"],
  ["spd", "速度"],
  ["level", "レベル"],
  ["exp", "経験値"],
  ["floor", "階層"],
];

const COMPARE_OPS: Option[] = [
  ["==", "=="],
  ["!=", "!="],
  ["<", "<"],
  ["<=", "<="],
  [">", ">"],
  [">=", ">="],
];

const ARITHMETIC_OPS: Option[] = [
  ["+", "+"],
  ["-", "-"],
  ["*", "×"],
  ["/", "÷"],
  ["%", "%"],
];

const MOVE_MODES: Option[] = [
  ["toward", "近づく"],
  ["away", "逃げる"],
  ["random", "ランダム"],
  ["direction", "方向指定"],
];

const SCOPES: Option[] = [
  ["global", "グローバル"],
  ["entity", "エンティティ"],
  ["local", "ローカル"],
];

const VALUEREF_TYPES: Option[] = [
  ["literal", "値"],
  ["variable", "変数"],
  ["stat", "ステータス"],
];

const TRIGGERS: Option[] = [
  ["ai", "AI"],
  ["itemEffect", "アイテム効果"],
  // 以下はエンジンが発火しない未実装トリガーのため非表示
  // skillEffect / onPickup / onUse / onTurnStart / onTurnEnd
  // onDamaged / onDeath / onMapEnter / onStepOn / onExamine
  ["manual", "手動"],
];

// ========================== デフォルト値の生成 ==========================

function literalValueRef(literalValue: ScriptValue): ValueRef {
  return { type: "literal", value: literalValue };
}

function createDefaultScriptNode(nodeType: string): ScriptNode {
  switch (nodeType) {
    case "if": return { type: "if", condition: { type: "true" }, then: [] };
    case "loop": return { type: "loop", count: literalValueRef(3), body: [] };
    case "while": return { type: "while", condition: { type: "true" }, body: [] };
    case "break": return { type: "break" };
    default: return { type: "action", action: { type: "doNothing" } };
  }
}

function createDefaultAction(actionType: string): Action {
  switch (actionType) {
    case "move": return { type: "move", actor: "self", mode: { type: "random" } };
    case "attack": return { type: "attack", attacker: "self", defender: "player" };
    case "damage": return { type: "damage", target: "player", amount: literalValueRef(1) };
    case "heal": return { type: "heal", target: "self", amount: literalValueRef(5) };
    case "setStat": return { type: "setStat", target: "self", stat: "hp", value: literalValueRef(10) };
    case "setVariable": return { type: "setVariable", scope: "global", name: "flag", value: literalValueRef(1) };
    case "addVariable": return { type: "addVariable", scope: "global", name: "counter", op: "+", value: literalValueRef(1) };
    case "addStatus": return { type: "addStatus", target: "player", statusId: "", turns: literalValueRef(3) };
    case "removeStatus": return { type: "removeStatus", target: "player", statusId: "" };
    case "offerBagItem": return { type: "offerBagItem", itemId: "" };
    case "equipWeapon": return { type: "equipWeapon", target: "player", itemName: literalValueRef(""), atk: literalValueRef(1) };
    case "useSkill": return { type: "useSkill", user: "self", skillId: "", target: "player" };
    case "log": return { type: "log", message: "", params: {} };
    case "wait": return { type: "wait", turns: literalValueRef(1) };
    case "endGame": return { type: "endGame" };
    default: return { type: "doNothing" };
  }
}

function createDefaultCondition(conditionType: string): Condition {
  switch (conditionType) {
    case "compare": return { type: "compare", left: { type: "stat", target: "self", stat: "hpPercent" }, op: "<", right: literalValueRef(50) };
    case "and": return { type: "and", conditions: [{ type: "true" }] };
    case "or": return { type: "or", conditions: [{ type: "true" }] };
    case "not": return { type: "not", condition: { type: "true" } };
    case "hasItem": return { type: "hasItem", target: "player", itemId: "" };
    case "hasStatus": return { type: "hasStatus", target: "self", statusId: "" };
    case "inRange": return { type: "inRange", target: "player", from: "self", distance: literalValueRef(1) };
    case "inFov": return { type: "inFov", target: "player", observer: "self" };
    case "random": return { type: "random", percent: literalValueRef(50) };
    case "true": return { type: "true" };
    default: return { type: "false" };
  }
}

function createDefaultValueRef(valueRefType: string): ValueRef {
  switch (valueRefType) {
    case "variable": return { type: "variable", scope: "global", name: "flag" };
    case "stat": return { type: "stat", target: "self", stat: "hp" };
    default: return literalValueRef(0);
  }
}

function createDefaultMoveMode(moveModeType: string): MoveMode {
  switch (moveModeType) {
    case "toward": return { type: "toward", target: "player" };
    case "away": return { type: "away", target: "player" };
    case "direction": return { type: "direction", dx: 1, dy: 0 };
    default: return { type: "random" };
  }
}

// ========================== ScriptEditor ==========================

/**
 * ScriptDefinition を GUI で編集するコンポーネント。
 * パス指定でネストされたスクリプトツリーの任意の場所を操作する。
 */
export class ScriptEditor {
  private script: ScriptDefinition;

  constructor(
    private container: HTMLElement,
    script: ScriptDefinition,
    private onChange?: () => void,
  ) {
    this.script = structuredClone(script);
    this.container.addEventListener("click", (event) => this.handleClick(event));
    this.container.addEventListener("change", (event) => this.handleChange(event));
    this.render();
  }

  /** 編集中のスクリプト定義のコピーを返す。 */
  getScript(): ScriptDefinition {
    return this.script;
  }

  /** 外部からスクリプトを差し替えて再描画する。 */
  setScript(script: ScriptDefinition): void {
    this.script = structuredClone(script);
    this.render();
  }

  // ========================== パスナビゲーション ==========================

  /**
   * ドット区切りのパスでスクリプトオブジェクトの値を取得する。
   * 例: "body.0.action.type" → script.body[0].action.type
   */
  private navigateTo(path: string): unknown {
    const pathSegments = path.split(".");
    let currentValue: unknown = this.script;
    for (const pathSegment of pathSegments) {
      if (currentValue === null || currentValue === undefined) return undefined;
      const arrayIndex = parseInt(pathSegment);
      currentValue = (currentValue as Record<string, unknown>)[!isNaN(arrayIndex) ? arrayIndex : pathSegment];
    }
    return currentValue;
  }

  /** パスの末尾の値を設定する。 */
  private setAtPath(path: string, newValue: unknown): void {
    const pathSegments = path.split(".");
    let parentValue: unknown = this.script;
    for (let pathIndex = 0; pathIndex < pathSegments.length - 1; pathIndex += 1) {
      if (parentValue === null || parentValue === undefined) return;
      const arrayIndex = parseInt(pathSegments[pathIndex]);
      parentValue = (parentValue as Record<string, unknown>)[!isNaN(arrayIndex) ? arrayIndex : pathSegments[pathIndex]];
    }
    if (parentValue === null || parentValue === undefined) return;
    const propertyName = pathSegments[pathSegments.length - 1];
    (parentValue as Record<string, unknown>)[propertyName] = newValue;
  }

  /** パスが指す配列を取得する。 */
  private getArrayAtPath(path: string): unknown[] | null {
    const pathValue = this.navigateTo(path);
    return Array.isArray(pathValue) ? pathValue : null;
  }

  // ========================== イベントハンドリング ==========================

  /** ボタンクリックで、ノード追加/削除/並び替えなどを処理する。 */
  private handleClick(event: MouseEvent): void {
    const actionButton = (event.target as HTMLElement).closest("button[data-action]") as HTMLElement | null;
    if (!actionButton) return;

    const editorAction = actionButton.dataset.action!;
    const targetPath = actionButton.dataset.path ?? "";
    const targetIndex = parseInt(actionButton.dataset.index ?? "-1");

    switch (editorAction) {
      case "add-node": {
        const scriptNodeList = this.getArrayAtPath(targetPath);
        if (scriptNodeList) scriptNodeList.push(createDefaultScriptNode("action"));
        break;
      }
      case "remove-node": {
        const scriptNodeList = this.getArrayAtPath(targetPath);
        if (scriptNodeList && targetIndex >= 0 && targetIndex < scriptNodeList.length) scriptNodeList.splice(targetIndex, 1);
        break;
      }
      case "move-up": {
        const scriptNodeList = this.getArrayAtPath(targetPath);
        if (scriptNodeList && targetIndex > 0) {
          [scriptNodeList[targetIndex - 1], scriptNodeList[targetIndex]] = [scriptNodeList[targetIndex], scriptNodeList[targetIndex - 1]];
        }
        break;
      }
      case "move-down": {
        const scriptNodeList = this.getArrayAtPath(targetPath);
        if (scriptNodeList && targetIndex >= 0 && targetIndex < scriptNodeList.length - 1) {
          [scriptNodeList[targetIndex], scriptNodeList[targetIndex + 1]] = [scriptNodeList[targetIndex + 1], scriptNodeList[targetIndex]];
        }
        break;
      }
      case "toggle-else": {
        const scriptNode = this.navigateTo(targetPath) as ScriptNode | null;
        if (scriptNode && scriptNode.type === "if") {
          scriptNode.else = scriptNode.else ? undefined : [];
        }
        break;
      }
      case "add-sub-cond": {
        const condition = this.navigateTo(targetPath) as Condition | null;
        if (condition && (condition.type === "and" || condition.type === "or")) {
          condition.conditions.push({ type: "true" });
        }
        break;
      }
      case "remove-sub-cond": {
        const condition = this.navigateTo(targetPath) as Condition | null;
        if (condition && (condition.type === "and" || condition.type === "or") && targetIndex >= 0) {
          condition.conditions.splice(targetIndex, 1);
        }
        break;
      }
      case "add-var":
        this.script.variables.push({ name: "var" + this.script.variables.length, scope: "global", initialValue: 0 });
        break;
      case "remove-var":
        if (targetIndex >= 0 && targetIndex < this.script.variables.length) {
          this.script.variables.splice(targetIndex, 1);
        }
        break;
      default:
        return;
    }

    this.emitAndRender();
  }

  /** select/input の変更で、ノード型の切り替えやプロパティ値の更新を処理する。 */
  private handleChange(event: Event): void {
    const changedField = event.target;
    if (!(changedField instanceof HTMLInputElement || changedField instanceof HTMLSelectElement || changedField instanceof HTMLTextAreaElement)) return;

    const editorAction = changedField.dataset.action;
    if (!editorAction) return;

    const targetPath = changedField.dataset.path ?? "";
    const fieldValue = changedField.value;

    switch (editorAction) {
      case "change-node-type": {
        const scriptNodeList = this.getArrayAtPath(targetPath);
        const targetIndex = parseInt(changedField.dataset.index ?? "-1");
        if (scriptNodeList && targetIndex >= 0 && targetIndex < scriptNodeList.length) {
          scriptNodeList[targetIndex] = createDefaultScriptNode(fieldValue);
        }
        break;
      }
      case "change-action-type":
        this.setAtPath(targetPath, createDefaultAction(fieldValue));
        break;
      case "change-condition-type":
        this.setAtPath(targetPath, createDefaultCondition(fieldValue));
        break;
      case "change-move-mode":
        this.setAtPath(targetPath, createDefaultMoveMode(fieldValue));
        break;
      case "change-valueref-type":
        this.setAtPath(targetPath, createDefaultValueRef(fieldValue));
        break;
      case "set-prop": {
        const parsedFieldValue = this.parseInputValue(fieldValue, changedField instanceof HTMLInputElement ? changedField.type : "text");
        this.setAtPath(targetPath, parsedFieldValue);
        break;
      }
      default:
        return;
    }

    this.emitAndRender();
  }

  /** 入力値を number / boolean / string に変換する。 */
  private parseInputValue(rawInputValue: string, inputType: string): ScriptValue {
    if (inputType === "number") {
      const parsedNumber = parseFloat(rawInputValue);
      return Number.isFinite(parsedNumber) ? parsedNumber : 0;
    }
    if (inputType === "checkbox") return rawInputValue === "on";
    if (rawInputValue === "true") return true;
    if (rawInputValue === "false") return false;
    const parsedNumber = Number(rawInputValue);
    if (rawInputValue !== "" && Number.isFinite(parsedNumber) && String(parsedNumber) === rawInputValue) return parsedNumber;
    return rawInputValue;
  }

  /** 変更を通知してから再描画する。 */
  private emitAndRender(): void {
    this.onChange?.();
    this.render();
  }

  // ========================== レンダリング ==========================

  private render(): void {
    this.container.innerHTML = [
      '<div class="se-editor">',
      this.renderHeader(),
      this.renderVariables(),
      '<div class="se-section"><strong class="se-section-title">スクリプト</strong>',
      this.renderNodes(this.script.body, "body"),
      "</div>",
      "</div>",
    ].join("");
  }

  private renderHeader(): string {
    return [
      '<div class="se-header">',
      this.labeledInput("名前", `data-action="set-prop" data-path="name"`, this.script.name),
      this.labeledSelect("トリガー", `data-action="set-prop" data-path="trigger"`, this.script.trigger, TRIGGERS),
      "</div>",
    ].join("");
  }

  private renderVariables(): string {
    const variableRowsHtml = this.script.variables.map((variableDefinition, variableIndex) => [
      '<div class="se-var-row">',
      `<input data-action="set-prop" data-path="variables.${variableIndex}.name" value="${this.escapeHtml(variableDefinition.name)}" placeholder="変数名" />`,
      this.renderSelect(`data-action="set-prop" data-path="variables.${variableIndex}.scope"`, variableDefinition.scope, SCOPES),
      `<input data-action="set-prop" data-path="variables.${variableIndex}.initialValue" value="${this.escapeHtml(String(variableDefinition.initialValue))}" placeholder="初期値" />`,
      `<button data-action="remove-var" data-index="${variableIndex}" class="se-btn-icon" title="削除">\u2715</button>`,
      "</div>",
    ].join("")).join("");

    return [
      '<div class="se-section"><strong class="se-section-title">変数</strong>',
      variableRowsHtml,
      '<button data-action="add-var" class="se-btn-add">+ 変数を追加</button>',
      "</div>",
    ].join("");
  }

  // ========================== ノード ==========================

  private renderNodes(nodes: ScriptNode[], containerPath: string): string {
    const scriptNodeItemsHtml = nodes.map((scriptNode, scriptNodeIndex) => this.renderNode(scriptNode, containerPath, scriptNodeIndex)).join("");
    return [
      '<div class="se-nodes">',
      scriptNodeItemsHtml,
      `<button data-action="add-node" data-path="${this.escapeHtml(containerPath)}" class="se-btn-add">+ ノード追加</button>`,
      "</div>",
    ].join("");
  }

  private renderNode(scriptNode: ScriptNode, containerPath: string, nodeIndex: number): string {
    const nodePath = `${containerPath}.${nodeIndex}`;
    const nodeHeaderHtml = this.renderNodeHeader(scriptNode.type, containerPath, nodeIndex);

    let nodeContentHtml = "";
    switch (scriptNode.type) {
      case "action":
        nodeContentHtml = this.renderActionBlock(scriptNode.action, `${nodePath}.action`);
        break;
      case "if":
        nodeContentHtml = this.renderIfBlock(scriptNode, nodePath);
        break;
      case "loop":
        nodeContentHtml = this.renderLoopBlock(scriptNode, nodePath);
        break;
      case "while":
        nodeContentHtml = this.renderWhileBlock(scriptNode, nodePath);
        break;
      case "break":
        break;
    }

    return `<div class="se-node se-node-${this.escapeHtml(scriptNode.type)}">${nodeHeaderHtml}${nodeContentHtml}</div>`;
  }

  private renderNodeHeader(nodeType: string, containerPath: string, nodeIndex: number): string {
    return [
      '<div class="se-node-header">',
      this.renderSelect(`data-action="change-node-type" data-path="${this.escapeHtml(containerPath)}" data-index="${nodeIndex}"`, nodeType, NODE_TYPES),
      '<span class="se-node-buttons">',
      `<button data-action="move-up" data-path="${this.escapeHtml(containerPath)}" data-index="${nodeIndex}" class="se-btn-icon" title="上へ">\u25B2</button>`,
      `<button data-action="move-down" data-path="${this.escapeHtml(containerPath)}" data-index="${nodeIndex}" class="se-btn-icon" title="下へ">\u25BC</button>`,
      `<button data-action="remove-node" data-path="${this.escapeHtml(containerPath)}" data-index="${nodeIndex}" class="se-btn-icon se-btn-danger" title="削除">\u2715</button>`,
      "</span>",
      "</div>",
    ].join("");
  }

  // ========================== IF / LOOP / WHILE ==========================

  private renderIfBlock(node: ScriptNode & { type: "if" }, nodePath: string): string {
    const hasElse = !!node.else;
    return [
      '<div class="se-indent">',
      '<div class="se-label">条件:</div>',
      this.renderCondition(node.condition, `${nodePath}.condition`),
      '<div class="se-label">THEN:</div>',
      this.renderNodes(node.then, `${nodePath}.then`),
      hasElse ? `<div class="se-label">ELSE:</div>${this.renderNodes(node.else!, `${nodePath}.else`)}` : "",
      `<button data-action="toggle-else" data-path="${this.escapeHtml(nodePath)}" class="se-btn-small">${hasElse ? "ELSE を削除" : "+ ELSE を追加"}</button>`,
      "</div>",
    ].join("");
  }

  private renderLoopBlock(node: ScriptNode & { type: "loop" }, nodePath: string): string {
    return [
      '<div class="se-indent">',
      '<div class="se-row">',
      this.renderValueRef(node.count, `${nodePath}.count`, "回数"),
      "</div>",
      this.renderNodes(node.body, `${nodePath}.body`),
      "</div>",
    ].join("");
  }

  private renderWhileBlock(node: ScriptNode & { type: "while" }, nodePath: string): string {
    return [
      '<div class="se-indent">',
      '<div class="se-label">条件:</div>',
      this.renderCondition(node.condition, `${nodePath}.condition`),
      this.renderNodes(node.body, `${nodePath}.body`),
      "</div>",
    ].join("");
  }

  // ========================== 条件 ==========================

  private renderCondition(condition: Condition, conditionPath: string): string {
    const typeSelect = this.renderSelect(
      `data-action="change-condition-type" data-path="${this.escapeHtml(conditionPath)}"`,
      condition.type,
      CONDITION_TYPES,
    );

    let conditionBodyHtml = "";
    switch (condition.type) {
      case "compare":
        conditionBodyHtml = [
          '<div class="se-cond-row">',
          this.renderValueRef(condition.left, `${conditionPath}.left`, "左辺"),
          this.renderSelect(`data-action="set-prop" data-path="${this.escapeHtml(conditionPath)}.op"`, condition.op, COMPARE_OPS),
          this.renderValueRef(condition.right, `${conditionPath}.right`, "右辺"),
          "</div>",
        ].join("");
        break;

      case "and":
      case "or":
        conditionBodyHtml = this.renderCompoundCondition(condition.conditions, conditionPath);
        break;

      case "not":
        conditionBodyHtml = `<div class="se-indent">${this.renderCondition(condition.condition, `${conditionPath}.condition`)}</div>`;
        break;

      case "hasItem":
        conditionBodyHtml = [
          '<div class="se-cond-row">',
          this.labeledSelect("対象", `data-action="set-prop" data-path="${this.escapeHtml(conditionPath)}.target"`, condition.target, TARGETS),
          this.labeledInput("アイテムID", `data-action="set-prop" data-path="${this.escapeHtml(conditionPath)}.itemId"`, condition.itemId),
          "</div>",
        ].join("");
        break;

      case "hasStatus":
        conditionBodyHtml = [
          '<div class="se-cond-row">',
          this.labeledSelect("対象", `data-action="set-prop" data-path="${this.escapeHtml(conditionPath)}.target"`, condition.target, TARGETS),
          this.labeledInput("状態異常ID", `data-action="set-prop" data-path="${this.escapeHtml(conditionPath)}.statusId"`, condition.statusId),
          "</div>",
        ].join("");
        break;

      case "inRange":
        conditionBodyHtml = [
          '<div class="se-cond-row">',
          this.labeledSelect("対象", `data-action="set-prop" data-path="${this.escapeHtml(conditionPath)}.target"`, condition.target, TARGETS),
          this.labeledSelect("基準", `data-action="set-prop" data-path="${this.escapeHtml(conditionPath)}.from"`, condition.from, TARGETS),
          this.renderValueRef(condition.distance, `${conditionPath}.distance`, "距離"),
          "</div>",
        ].join("");
        break;

      case "inFov":
        conditionBodyHtml = [
          '<div class="se-cond-row">',
          this.labeledSelect("対象", `data-action="set-prop" data-path="${this.escapeHtml(conditionPath)}.target"`, condition.target, TARGETS),
          this.labeledSelect("観測者", `data-action="set-prop" data-path="${this.escapeHtml(conditionPath)}.observer"`, condition.observer, TARGETS),
          "</div>",
        ].join("");
        break;

      case "random":
        conditionBodyHtml = `<div class="se-cond-row">${this.renderValueRef(condition.percent, `${conditionPath}.percent`, "確率%")}</div>`;
        break;
    }

    return `<div class="se-condition">${typeSelect}${conditionBodyHtml}</div>`;
  }

  private renderCompoundCondition(conditions: Condition[], parentCondPath: string): string {
    const conditionItemsHtml = conditions.map((childCondition, conditionIndex) => [
      '<div class="se-sub-cond">',
      this.renderCondition(childCondition, `${parentCondPath}.conditions.${conditionIndex}`),
      `<button data-action="remove-sub-cond" data-path="${this.escapeHtml(parentCondPath)}" data-index="${conditionIndex}" class="se-btn-icon se-btn-danger" title="削除">\u2715</button>`,
      "</div>",
    ].join("")).join("");

    return [
      '<div class="se-indent">',
      conditionItemsHtml,
      `<button data-action="add-sub-cond" data-path="${this.escapeHtml(parentCondPath)}" class="se-btn-add">+ 条件追加</button>`,
      "</div>",
    ].join("");
  }

  // ========================== アクション ==========================

  private renderActionBlock(action: Action, actionPath: string): string {
    const typeSelect = this.renderSelect(
      `data-action="change-action-type" data-path="${this.escapeHtml(actionPath)}"`,
      action.type,
      ACTION_TYPES,
    );

    let actionBodyHtml = "";
    switch (action.type) {
      case "move":
        actionBodyHtml = [
          this.labeledSelect("実行者", `data-action="set-prop" data-path="${this.escapeHtml(actionPath)}.actor"`, action.actor, TARGETS),
          this.renderSelect(`data-action="change-move-mode" data-path="${this.escapeHtml(actionPath)}.mode"`, action.mode.type, MOVE_MODES),
          this.renderMoveParams(action.mode, `${actionPath}.mode`),
        ].join("");
        break;

      case "attack":
        actionBodyHtml = [
          this.labeledSelect("攻撃者", `data-action="set-prop" data-path="${this.escapeHtml(actionPath)}.attacker"`, action.attacker, TARGETS),
          this.labeledSelect("防御者", `data-action="set-prop" data-path="${this.escapeHtml(actionPath)}.defender"`, action.defender, TARGETS),
        ].join("");
        break;

      case "damage":
        actionBodyHtml = [
          this.labeledSelect("対象", `data-action="set-prop" data-path="${this.escapeHtml(actionPath)}.target"`, action.target, TARGETS),
          this.renderValueRef(action.amount, `${actionPath}.amount`, "量"),
        ].join("");
        break;

      case "heal":
        actionBodyHtml = [
          this.labeledSelect("対象", `data-action="set-prop" data-path="${this.escapeHtml(actionPath)}.target"`, action.target, TARGETS),
          this.renderValueRef(action.amount, `${actionPath}.amount`, "量"),
        ].join("");
        break;

      case "setStat":
        actionBodyHtml = [
          this.labeledSelect("対象", `data-action="set-prop" data-path="${this.escapeHtml(actionPath)}.target"`, action.target, TARGETS),
          this.labeledSelect("ステータス", `data-action="set-prop" data-path="${this.escapeHtml(actionPath)}.stat"`, action.stat, STATS),
          this.renderValueRef(action.value, `${actionPath}.value`, "値"),
        ].join("");
        break;

      case "setVariable":
        actionBodyHtml = [
          this.labeledSelect("スコープ", `data-action="set-prop" data-path="${this.escapeHtml(actionPath)}.scope"`, action.scope, SCOPES),
          this.labeledInput("変数名", `data-action="set-prop" data-path="${this.escapeHtml(actionPath)}.name"`, action.name),
          this.renderValueRef(action.value, `${actionPath}.value`, "値"),
        ].join("");
        break;

      case "addVariable":
        actionBodyHtml = [
          this.labeledSelect("スコープ", `data-action="set-prop" data-path="${this.escapeHtml(actionPath)}.scope"`, action.scope, SCOPES),
          this.labeledInput("変数名", `data-action="set-prop" data-path="${this.escapeHtml(actionPath)}.name"`, action.name),
          this.renderSelect(`data-action="set-prop" data-path="${this.escapeHtml(actionPath)}.op"`, action.op, ARITHMETIC_OPS),
          this.renderValueRef(action.value, `${actionPath}.value`, "値"),
        ].join("");
        break;

      case "addStatus":
        actionBodyHtml = [
          this.labeledSelect("対象", `data-action="set-prop" data-path="${this.escapeHtml(actionPath)}.target"`, action.target, TARGETS),
          this.labeledInput("状態異常ID", `data-action="set-prop" data-path="${this.escapeHtml(actionPath)}.statusId"`, action.statusId),
          this.renderValueRef(action.turns, `${actionPath}.turns`, "ターン数"),
        ].join("");
        break;

      case "removeStatus":
        actionBodyHtml = [
          this.labeledSelect("対象", `data-action="set-prop" data-path="${this.escapeHtml(actionPath)}.target"`, action.target, TARGETS),
          this.labeledInput("状態異常ID", `data-action="set-prop" data-path="${this.escapeHtml(actionPath)}.statusId"`, action.statusId),
        ].join("");
        break;

      case "offerBagItem":
        actionBodyHtml = this.labeledInput("アイテムID", `data-action="set-prop" data-path="${this.escapeHtml(actionPath)}.itemId"`, action.itemId);
        break;

      case "equipWeapon":
        actionBodyHtml = [
          this.labeledSelect("対象", `data-action="set-prop" data-path="${this.escapeHtml(actionPath)}.target"`, action.target, TARGETS),
          this.renderValueRef(action.itemName, `${actionPath}.itemName`, "武器名"),
          this.renderValueRef(action.atk, `${actionPath}.atk`, "攻撃力"),
        ].join("");
        break;

      case "useSkill":
        actionBodyHtml = [
          this.labeledSelect("使用者", `data-action="set-prop" data-path="${this.escapeHtml(actionPath)}.user"`, action.user, TARGETS),
          this.labeledInput("スキルID", `data-action="set-prop" data-path="${this.escapeHtml(actionPath)}.skillId"`, action.skillId),
          this.labeledSelect("対象", `data-action="set-prop" data-path="${this.escapeHtml(actionPath)}.target"`, action.target, TARGETS),
        ].join("");
        break;

      case "log":
        actionBodyHtml = this.labeledInput("メッセージ", `data-action="set-prop" data-path="${this.escapeHtml(actionPath)}.message"`, action.message);
        break;

      case "wait":
        actionBodyHtml = this.renderValueRef(action.turns, `${actionPath}.turns`, "ターン数");
        break;
    }

    return `<div class="se-action-body">${typeSelect}${actionBodyHtml ? `<div class="se-action-params">${actionBodyHtml}</div>` : ""}</div>`;
  }

  private renderMoveParams(mode: MoveMode, modePath: string): string {
    switch (mode.type) {
      case "toward":
      case "away":
        return this.labeledSelect("対象", `data-action="set-prop" data-path="${this.escapeHtml(modePath)}.target"`, mode.target, TARGETS);
      case "direction":
        return [
          this.labeledInput("dx", `data-action="set-prop" data-path="${this.escapeHtml(modePath)}.dx" type="number"`, String(mode.dx)),
          this.labeledInput("dy", `data-action="set-prop" data-path="${this.escapeHtml(modePath)}.dy" type="number"`, String(mode.dy)),
        ].join("");
      default:
        return "";
    }
  }

  // ========================== ValueRef ==========================

  private renderValueRef(valueReference: ValueRef, valueReferencePath: string, label: string): string {
    const typeSelect = this.renderSelect(
      `data-action="change-valueref-type" data-path="${this.escapeHtml(valueReferencePath)}"`,
      valueReference.type,
      VALUEREF_TYPES,
    );

    let valueReferenceFieldsHtml = "";
    switch (valueReference.type) {
      case "literal":
        valueReferenceFieldsHtml = `<input data-action="set-prop" data-path="${this.escapeHtml(valueReferencePath)}.value" value="${this.escapeHtml(String(valueReference.value))}" class="se-input-sm" />`;
        break;
      case "variable":
        valueReferenceFieldsHtml = [
          this.renderSelect(`data-action="set-prop" data-path="${this.escapeHtml(valueReferencePath)}.scope"`, valueReference.scope, SCOPES),
          `<input data-action="set-prop" data-path="${this.escapeHtml(valueReferencePath)}.name" value="${this.escapeHtml(valueReference.name)}" class="se-input-sm" placeholder="変数名" />`,
        ].join("");
        break;
      case "stat":
        valueReferenceFieldsHtml = [
          this.renderSelect(`data-action="set-prop" data-path="${this.escapeHtml(valueReferencePath)}.target"`, valueReference.target, TARGETS),
          this.renderSelect(`data-action="set-prop" data-path="${this.escapeHtml(valueReferencePath)}.stat"`, valueReference.stat, STATS),
        ].join("");
        break;
    }

    return `<span class="se-valueref"><span class="se-vr-label">${this.escapeHtml(label)}</span>${typeSelect}${valueReferenceFieldsHtml}</span>`;
  }

  // ========================== HTML ヘルパー ==========================

  /** ラベル付き select を返す。 */
  private labeledSelect(label: string, attributesHtml: string, selectedValue: string, options: Option[]): string {
    return `<label class="se-field"><span>${this.escapeHtml(label)}</span>${this.renderSelect(attributesHtml, selectedValue, options)}</label>`;
  }

  /** ラベル付き input を返す。 */
  private labeledInput(label: string, attributesHtml: string, fieldValue: string): string {
    return `<label class="se-field"><span>${this.escapeHtml(label)}</span><input ${attributesHtml} value="${this.escapeHtml(fieldValue)}" /></label>`;
  }

  /** select 要素を返す。現在値が選択肢にない場合は一時的な項目を追加する。 */
  private renderSelect(attributesHtml: string, selectedValue: string, options: Option[]): string {
    const hasSelectedValue = options.some(([optionValue]) => optionValue === selectedValue);
    const extraOption = hasSelectedValue ? "" : `<option value="${this.escapeHtml(selectedValue)}" selected>(未実装) ${this.escapeHtml(selectedValue)}</option>`;
    const optionsHtml = options
      .map(([optionValue, optionLabel]) => `<option value="${this.escapeHtml(optionValue)}"${optionValue === selectedValue ? " selected" : ""}>${this.escapeHtml(optionLabel)}</option>`)
      .join("");
    return `<select ${attributesHtml}>${extraOption}${optionsHtml}</select>`;
  }

  private escapeHtml(rawText: string): string {
    return rawText
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}
