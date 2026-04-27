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
  ["addStatus", "状態異常を付与"],
  ["removeStatus", "状態異常を解除"],
  ["offerBagItem", "バッグに入れる"],
  ["equipWeapon", "武器を装備"],
  ["useSkill", "スキル使用"],
  ["log", "ログ表示"],
  ["wait", "待機"],
  ["endGame", "ゲーム終了"],
  ["doNothing", "何もしない"],
];

const CONDITION_TYPES: Option[] = [
  ["compare", "値の比較"],
  ["and", "すべて満たす (AND)"],
  ["or", "いずれか満たす (OR)"],
  ["not", "否定 (NOT)"],
  ["hasItem", "アイテム所持"],
  ["hasStatus", "状態異常あり"],
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
  ["skillEffect", "スキル効果"],
  ["onPickup", "拾った時"],
  ["onUse", "使った時"],
  ["onTurnStart", "ターン開始"],
  ["onTurnEnd", "ターン終了"],
  ["onDamaged", "ダメージ時"],
  ["onDeath", "死亡時"],
  ["onMapEnter", "マップ進入"],
  ["onStepOn", "踏んだ時"],
  ["onExamine", "調べた時"],
  ["manual", "手動"],
];

// ========================== デフォルト値の生成 ==========================

function lit(value: ScriptValue): ValueRef {
  return { type: "literal", value };
}

function defaultNode(type: string): ScriptNode {
  switch (type) {
    case "if": return { type: "if", condition: { type: "true" }, then: [] };
    case "loop": return { type: "loop", count: lit(3), body: [] };
    case "while": return { type: "while", condition: { type: "true" }, body: [] };
    case "break": return { type: "break" };
    default: return { type: "action", action: { type: "doNothing" } };
  }
}

function defaultAction(type: string): Action {
  switch (type) {
    case "move": return { type: "move", actor: "self", mode: { type: "random" } };
    case "attack": return { type: "attack", attacker: "self", defender: "player" };
    case "damage": return { type: "damage", target: "player", amount: lit(1) };
    case "heal": return { type: "heal", target: "self", amount: lit(5) };
    case "setStat": return { type: "setStat", target: "self", stat: "hp", value: lit(10) };
    case "setVariable": return { type: "setVariable", scope: "global", name: "flag", value: lit(1) };
    case "addVariable": return { type: "addVariable", scope: "global", name: "counter", op: "+", value: lit(1) };
    case "addStatus": return { type: "addStatus", target: "player", statusId: "", turns: lit(3) };
    case "removeStatus": return { type: "removeStatus", target: "player", statusId: "" };
    case "offerBagItem": return { type: "offerBagItem", itemId: "" };
    case "equipWeapon": return { type: "equipWeapon", target: "player", itemName: lit(""), atk: lit(1) };
    case "useSkill": return { type: "useSkill", user: "self", skillId: "", target: "player" };
    case "log": return { type: "log", message: "", params: {} };
    case "wait": return { type: "wait", turns: lit(1) };
    case "endGame": return { type: "endGame" };
    default: return { type: "doNothing" };
  }
}

function defaultCondition(type: string): Condition {
  switch (type) {
    case "compare": return { type: "compare", left: { type: "stat", target: "self", stat: "hpPercent" }, op: "<", right: lit(50) };
    case "and": return { type: "and", conditions: [{ type: "true" }] };
    case "or": return { type: "or", conditions: [{ type: "true" }] };
    case "not": return { type: "not", condition: { type: "true" } };
    case "hasItem": return { type: "hasItem", target: "player", itemId: "" };
    case "hasStatus": return { type: "hasStatus", target: "self", statusId: "" };
    case "inRange": return { type: "inRange", target: "player", from: "self", distance: lit(1) };
    case "inFov": return { type: "inFov", target: "player", observer: "self" };
    case "random": return { type: "random", percent: lit(50) };
    case "true": return { type: "true" };
    default: return { type: "false" };
  }
}

function defaultValueRef(type: string): ValueRef {
  switch (type) {
    case "variable": return { type: "variable", scope: "global", name: "flag" };
    case "stat": return { type: "stat", target: "self", stat: "hp" };
    default: return lit(0);
  }
}

function defaultMoveMode(type: string): MoveMode {
  switch (type) {
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
    this.container.addEventListener("click", (e) => this.handleClick(e));
    this.container.addEventListener("change", (e) => this.handleChange(e));
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
    const parts = path.split(".");
    let obj: unknown = this.script;
    for (const part of parts) {
      if (obj === null || obj === undefined) return undefined;
      const idx = parseInt(part);
      obj = (obj as Record<string, unknown>)[!isNaN(idx) ? idx : part];
    }
    return obj;
  }

  /** パスの末尾の値を設定する。 */
  private setAtPath(path: string, value: unknown): void {
    const parts = path.split(".");
    let obj: unknown = this.script;
    for (let i = 0; i < parts.length - 1; i++) {
      if (obj === null || obj === undefined) return;
      const idx = parseInt(parts[i]);
      obj = (obj as Record<string, unknown>)[!isNaN(idx) ? idx : parts[i]];
    }
    if (obj === null || obj === undefined) return;
    const last = parts[parts.length - 1];
    (obj as Record<string, unknown>)[last] = value;
  }

  /** パスが指す配列を取得する。 */
  private getArrayAtPath(path: string): unknown[] | null {
    const arr = this.navigateTo(path);
    return Array.isArray(arr) ? arr : null;
  }

  // ========================== イベントハンドリング ==========================

  /** ボタンクリックで、ノード追加/削除/並び替えなどを処理する。 */
  private handleClick(event: MouseEvent): void {
    const btn = (event.target as HTMLElement).closest("button[data-action]") as HTMLElement | null;
    if (!btn) return;

    const action = btn.dataset.action!;
    const path = btn.dataset.path ?? "";
    const index = parseInt(btn.dataset.index ?? "-1");

    switch (action) {
      case "add-node": {
        const arr = this.getArrayAtPath(path);
        if (arr) arr.push(defaultNode("action"));
        break;
      }
      case "remove-node": {
        const arr = this.getArrayAtPath(path);
        if (arr && index >= 0 && index < arr.length) arr.splice(index, 1);
        break;
      }
      case "move-up": {
        const arr = this.getArrayAtPath(path);
        if (arr && index > 0) [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
        break;
      }
      case "move-down": {
        const arr = this.getArrayAtPath(path);
        if (arr && index >= 0 && index < arr.length - 1) [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
        break;
      }
      case "toggle-else": {
        const node = this.navigateTo(path) as ScriptNode | null;
        if (node && node.type === "if") {
          node.else = node.else ? undefined : [];
        }
        break;
      }
      case "add-sub-cond": {
        const cond = this.navigateTo(path) as Condition | null;
        if (cond && (cond.type === "and" || cond.type === "or")) {
          cond.conditions.push({ type: "true" });
        }
        break;
      }
      case "remove-sub-cond": {
        const cond = this.navigateTo(path) as Condition | null;
        if (cond && (cond.type === "and" || cond.type === "or") && index >= 0) {
          cond.conditions.splice(index, 1);
        }
        break;
      }
      case "add-var":
        this.script.variables.push({ name: "var" + this.script.variables.length, scope: "global", initialValue: 0 });
        break;
      case "remove-var":
        if (index >= 0 && index < this.script.variables.length) {
          this.script.variables.splice(index, 1);
        }
        break;
      default:
        return;
    }

    this.emitAndRender();
  }

  /** select/input の変更で、ノード型の切り替えやプロパティ値の更新を処理する。 */
  private handleChange(event: Event): void {
    const el = event.target;
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) return;

    const action = el.dataset.action;
    if (!action) return;

    const path = el.dataset.path ?? "";
    const value = el.value;

    switch (action) {
      case "change-node-type": {
        const arr = this.getArrayAtPath(path);
        const index = parseInt(el.dataset.index ?? "-1");
        if (arr && index >= 0 && index < arr.length) {
          arr[index] = defaultNode(value);
        }
        break;
      }
      case "change-action-type":
        this.setAtPath(path, defaultAction(value));
        break;
      case "change-condition-type":
        this.setAtPath(path, defaultCondition(value));
        break;
      case "change-move-mode":
        this.setAtPath(path, defaultMoveMode(value));
        break;
      case "change-valueref-type":
        this.setAtPath(path, defaultValueRef(value));
        break;
      case "set-prop": {
        const parsed = this.parseInputValue(value, el instanceof HTMLInputElement ? el.type : "text");
        this.setAtPath(path, parsed);
        break;
      }
      default:
        return;
    }

    this.emitAndRender();
  }

  /** 入力値を number / boolean / string に変換する。 */
  private parseInputValue(value: string, inputType: string): ScriptValue {
    if (inputType === "number") {
      const num = parseFloat(value);
      return Number.isFinite(num) ? num : 0;
    }
    if (inputType === "checkbox") return value === "on";
    if (value === "true") return true;
    if (value === "false") return false;
    const num = Number(value);
    if (value !== "" && Number.isFinite(num) && String(num) === value) return num;
    return value;
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
    const rows = this.script.variables.map((v, i) => [
      '<div class="se-var-row">',
      `<input data-action="set-prop" data-path="variables.${i}.name" value="${this.esc(v.name)}" placeholder="変数名" />`,
      this.sel(`data-action="set-prop" data-path="variables.${i}.scope"`, v.scope, SCOPES),
      `<input data-action="set-prop" data-path="variables.${i}.initialValue" value="${this.esc(String(v.initialValue))}" placeholder="初期値" />`,
      `<button data-action="remove-var" data-index="${i}" class="se-btn-icon" title="削除">\u2715</button>`,
      "</div>",
    ].join("")).join("");

    return [
      '<div class="se-section"><strong class="se-section-title">変数</strong>',
      rows,
      '<button data-action="add-var" class="se-btn-add">+ 変数を追加</button>',
      "</div>",
    ].join("");
  }

  // ========================== ノード ==========================

  private renderNodes(nodes: ScriptNode[], containerPath: string): string {
    const items = nodes.map((node, i) => this.renderNode(node, containerPath, i)).join("");
    return [
      '<div class="se-nodes">',
      items,
      `<button data-action="add-node" data-path="${this.esc(containerPath)}" class="se-btn-add">+ ノード追加</button>`,
      "</div>",
    ].join("");
  }

  private renderNode(node: ScriptNode, containerPath: string, index: number): string {
    const nodePath = `${containerPath}.${index}`;
    const header = this.renderNodeHeader(node.type, containerPath, index);

    let content = "";
    switch (node.type) {
      case "action":
        content = this.renderActionBlock(node.action, `${nodePath}.action`);
        break;
      case "if":
        content = this.renderIfBlock(node, nodePath);
        break;
      case "loop":
        content = this.renderLoopBlock(node, nodePath);
        break;
      case "while":
        content = this.renderWhileBlock(node, nodePath);
        break;
      case "break":
        break;
    }

    return `<div class="se-node se-node-${this.esc(node.type)}">${header}${content}</div>`;
  }

  private renderNodeHeader(type: string, containerPath: string, index: number): string {
    return [
      '<div class="se-node-header">',
      this.sel(`data-action="change-node-type" data-path="${this.esc(containerPath)}" data-index="${index}"`, type, NODE_TYPES),
      '<span class="se-node-buttons">',
      `<button data-action="move-up" data-path="${this.esc(containerPath)}" data-index="${index}" class="se-btn-icon" title="上へ">\u25B2</button>`,
      `<button data-action="move-down" data-path="${this.esc(containerPath)}" data-index="${index}" class="se-btn-icon" title="下へ">\u25BC</button>`,
      `<button data-action="remove-node" data-path="${this.esc(containerPath)}" data-index="${index}" class="se-btn-icon se-btn-danger" title="削除">\u2715</button>`,
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
      `<button data-action="toggle-else" data-path="${this.esc(nodePath)}" class="se-btn-small">${hasElse ? "ELSE を削除" : "+ ELSE を追加"}</button>`,
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

  private renderCondition(cond: Condition, condPath: string): string {
    const typeSelect = this.sel(
      `data-action="change-condition-type" data-path="${this.esc(condPath)}"`,
      cond.type,
      CONDITION_TYPES,
    );

    let body = "";
    switch (cond.type) {
      case "compare":
        body = [
          '<div class="se-cond-row">',
          this.renderValueRef(cond.left, `${condPath}.left`, "左辺"),
          this.sel(`data-action="set-prop" data-path="${this.esc(condPath)}.op"`, cond.op, COMPARE_OPS),
          this.renderValueRef(cond.right, `${condPath}.right`, "右辺"),
          "</div>",
        ].join("");
        break;

      case "and":
      case "or":
        body = this.renderCompoundCondition(cond.conditions, condPath);
        break;

      case "not":
        body = `<div class="se-indent">${this.renderCondition(cond.condition, `${condPath}.condition`)}</div>`;
        break;

      case "hasItem":
        body = [
          '<div class="se-cond-row">',
          this.labeledSelect("対象", `data-action="set-prop" data-path="${this.esc(condPath)}.target"`, cond.target, TARGETS),
          this.labeledInput("アイテムID", `data-action="set-prop" data-path="${this.esc(condPath)}.itemId"`, cond.itemId),
          "</div>",
        ].join("");
        break;

      case "hasStatus":
        body = [
          '<div class="se-cond-row">',
          this.labeledSelect("対象", `data-action="set-prop" data-path="${this.esc(condPath)}.target"`, cond.target, TARGETS),
          this.labeledInput("状態異常ID", `data-action="set-prop" data-path="${this.esc(condPath)}.statusId"`, cond.statusId),
          "</div>",
        ].join("");
        break;

      case "inRange":
        body = [
          '<div class="se-cond-row">',
          this.labeledSelect("対象", `data-action="set-prop" data-path="${this.esc(condPath)}.target"`, cond.target, TARGETS),
          this.labeledSelect("基準", `data-action="set-prop" data-path="${this.esc(condPath)}.from"`, cond.from, TARGETS),
          this.renderValueRef(cond.distance, `${condPath}.distance`, "距離"),
          "</div>",
        ].join("");
        break;

      case "inFov":
        body = [
          '<div class="se-cond-row">',
          this.labeledSelect("対象", `data-action="set-prop" data-path="${this.esc(condPath)}.target"`, cond.target, TARGETS),
          this.labeledSelect("観測者", `data-action="set-prop" data-path="${this.esc(condPath)}.observer"`, cond.observer, TARGETS),
          "</div>",
        ].join("");
        break;

      case "random":
        body = `<div class="se-cond-row">${this.renderValueRef(cond.percent, `${condPath}.percent`, "確率%")}</div>`;
        break;
    }

    return `<div class="se-condition">${typeSelect}${body}</div>`;
  }

  private renderCompoundCondition(conditions: Condition[], parentCondPath: string): string {
    const items = conditions.map((c, i) => [
      '<div class="se-sub-cond">',
      this.renderCondition(c, `${parentCondPath}.conditions.${i}`),
      `<button data-action="remove-sub-cond" data-path="${this.esc(parentCondPath)}" data-index="${i}" class="se-btn-icon se-btn-danger" title="削除">\u2715</button>`,
      "</div>",
    ].join("")).join("");

    return [
      '<div class="se-indent">',
      items,
      `<button data-action="add-sub-cond" data-path="${this.esc(parentCondPath)}" class="se-btn-add">+ 条件追加</button>`,
      "</div>",
    ].join("");
  }

  // ========================== アクション ==========================

  private renderActionBlock(action: Action, actionPath: string): string {
    const typeSelect = this.sel(
      `data-action="change-action-type" data-path="${this.esc(actionPath)}"`,
      action.type,
      ACTION_TYPES,
    );

    let body = "";
    switch (action.type) {
      case "move":
        body = [
          this.labeledSelect("実行者", `data-action="set-prop" data-path="${this.esc(actionPath)}.actor"`, action.actor, TARGETS),
          this.sel(`data-action="change-move-mode" data-path="${this.esc(actionPath)}.mode"`, action.mode.type, MOVE_MODES),
          this.renderMoveParams(action.mode, `${actionPath}.mode`),
        ].join("");
        break;

      case "attack":
        body = [
          this.labeledSelect("攻撃者", `data-action="set-prop" data-path="${this.esc(actionPath)}.attacker"`, action.attacker, TARGETS),
          this.labeledSelect("防御者", `data-action="set-prop" data-path="${this.esc(actionPath)}.defender"`, action.defender, TARGETS),
        ].join("");
        break;

      case "damage":
        body = [
          this.labeledSelect("対象", `data-action="set-prop" data-path="${this.esc(actionPath)}.target"`, action.target, TARGETS),
          this.renderValueRef(action.amount, `${actionPath}.amount`, "量"),
        ].join("");
        break;

      case "heal":
        body = [
          this.labeledSelect("対象", `data-action="set-prop" data-path="${this.esc(actionPath)}.target"`, action.target, TARGETS),
          this.renderValueRef(action.amount, `${actionPath}.amount`, "量"),
        ].join("");
        break;

      case "setStat":
        body = [
          this.labeledSelect("対象", `data-action="set-prop" data-path="${this.esc(actionPath)}.target"`, action.target, TARGETS),
          this.labeledSelect("ステータス", `data-action="set-prop" data-path="${this.esc(actionPath)}.stat"`, action.stat, STATS),
          this.renderValueRef(action.value, `${actionPath}.value`, "値"),
        ].join("");
        break;

      case "setVariable":
        body = [
          this.labeledSelect("スコープ", `data-action="set-prop" data-path="${this.esc(actionPath)}.scope"`, action.scope, SCOPES),
          this.labeledInput("変数名", `data-action="set-prop" data-path="${this.esc(actionPath)}.name"`, action.name),
          this.renderValueRef(action.value, `${actionPath}.value`, "値"),
        ].join("");
        break;

      case "addVariable":
        body = [
          this.labeledSelect("スコープ", `data-action="set-prop" data-path="${this.esc(actionPath)}.scope"`, action.scope, SCOPES),
          this.labeledInput("変数名", `data-action="set-prop" data-path="${this.esc(actionPath)}.name"`, action.name),
          this.sel(`data-action="set-prop" data-path="${this.esc(actionPath)}.op"`, action.op, ARITHMETIC_OPS),
          this.renderValueRef(action.value, `${actionPath}.value`, "値"),
        ].join("");
        break;

      case "addStatus":
        body = [
          this.labeledSelect("対象", `data-action="set-prop" data-path="${this.esc(actionPath)}.target"`, action.target, TARGETS),
          this.labeledInput("状態異常ID", `data-action="set-prop" data-path="${this.esc(actionPath)}.statusId"`, action.statusId),
          this.renderValueRef(action.turns, `${actionPath}.turns`, "ターン数"),
        ].join("");
        break;

      case "removeStatus":
        body = [
          this.labeledSelect("対象", `data-action="set-prop" data-path="${this.esc(actionPath)}.target"`, action.target, TARGETS),
          this.labeledInput("状態異常ID", `data-action="set-prop" data-path="${this.esc(actionPath)}.statusId"`, action.statusId),
        ].join("");
        break;

      case "offerBagItem":
        body = this.labeledInput("アイテムID", `data-action="set-prop" data-path="${this.esc(actionPath)}.itemId"`, action.itemId);
        break;

      case "equipWeapon":
        body = [
          this.labeledSelect("対象", `data-action="set-prop" data-path="${this.esc(actionPath)}.target"`, action.target, TARGETS),
          this.renderValueRef(action.itemName, `${actionPath}.itemName`, "武器名"),
          this.renderValueRef(action.atk, `${actionPath}.atk`, "攻撃力"),
        ].join("");
        break;

      case "useSkill":
        body = [
          this.labeledSelect("使用者", `data-action="set-prop" data-path="${this.esc(actionPath)}.user"`, action.user, TARGETS),
          this.labeledInput("スキルID", `data-action="set-prop" data-path="${this.esc(actionPath)}.skillId"`, action.skillId),
          this.labeledSelect("対象", `data-action="set-prop" data-path="${this.esc(actionPath)}.target"`, action.target, TARGETS),
        ].join("");
        break;

      case "log":
        body = this.labeledInput("メッセージ", `data-action="set-prop" data-path="${this.esc(actionPath)}.message"`, action.message);
        break;

      case "wait":
        body = this.renderValueRef(action.turns, `${actionPath}.turns`, "ターン数");
        break;
    }

    return `<div class="se-action-body">${typeSelect}${body ? `<div class="se-action-params">${body}</div>` : ""}</div>`;
  }

  private renderMoveParams(mode: MoveMode, modePath: string): string {
    switch (mode.type) {
      case "toward":
      case "away":
        return this.labeledSelect("対象", `data-action="set-prop" data-path="${this.esc(modePath)}.target"`, mode.target, TARGETS);
      case "direction":
        return [
          this.labeledInput("dx", `data-action="set-prop" data-path="${this.esc(modePath)}.dx" type="number"`, String(mode.dx)),
          this.labeledInput("dy", `data-action="set-prop" data-path="${this.esc(modePath)}.dy" type="number"`, String(mode.dy)),
        ].join("");
      default:
        return "";
    }
  }

  // ========================== ValueRef ==========================

  private renderValueRef(ref: ValueRef, refPath: string, label: string): string {
    const typeSelect = this.sel(
      `data-action="change-valueref-type" data-path="${this.esc(refPath)}"`,
      ref.type,
      VALUEREF_TYPES,
    );

    let fields = "";
    switch (ref.type) {
      case "literal":
        fields = `<input data-action="set-prop" data-path="${this.esc(refPath)}.value" value="${this.esc(String(ref.value))}" class="se-input-sm" />`;
        break;
      case "variable":
        fields = [
          this.sel(`data-action="set-prop" data-path="${this.esc(refPath)}.scope"`, ref.scope, SCOPES),
          `<input data-action="set-prop" data-path="${this.esc(refPath)}.name" value="${this.esc(ref.name)}" class="se-input-sm" placeholder="変数名" />`,
        ].join("");
        break;
      case "stat":
        fields = [
          this.sel(`data-action="set-prop" data-path="${this.esc(refPath)}.target"`, ref.target, TARGETS),
          this.sel(`data-action="set-prop" data-path="${this.esc(refPath)}.stat"`, ref.stat, STATS),
        ].join("");
        break;
    }

    return `<span class="se-valueref"><span class="se-vr-label">${this.esc(label)}</span>${typeSelect}${fields}</span>`;
  }

  // ========================== HTML ヘルパー ==========================

  /** ラベル付き select を返す。 */
  private labeledSelect(label: string, attrs: string, value: string, options: Option[]): string {
    return `<label class="se-field"><span>${this.esc(label)}</span>${this.sel(attrs, value, options)}</label>`;
  }

  /** ラベル付き input を返す。 */
  private labeledInput(label: string, attrs: string, value: string): string {
    return `<label class="se-field"><span>${this.esc(label)}</span><input ${attrs} value="${this.esc(value)}" /></label>`;
  }

  /** select 要素を返す。 */
  private sel(attrs: string, value: string, options: Option[]): string {
    const optionsHtml = options
      .map(([v, label]) => `<option value="${this.esc(v)}"${v === value ? " selected" : ""}>${this.esc(label)}</option>`)
      .join("");
    return `<select ${attrs}>${optionsHtml}</select>`;
  }

  private esc(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}
