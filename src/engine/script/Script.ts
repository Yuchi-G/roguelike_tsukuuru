// ---------------------------------------------------------------------------
// ビジュアルスクリプトエンジン — データ型定義
//
// AI・アイテム効果・スキル効果・マップイベントを同じデータ構造で表現する。
// すべての型は JSON シリアライズ可能（プロジェクト保存に含める）。
// ---------------------------------------------------------------------------

// ========================== 変数 ==========================

/** 変数のスコープ。 */
export type VariableScope = "global" | "entity" | "local";

/** 変数の値として扱える型。 */
export type ScriptValue = number | string | boolean;

/** スクリプト内で参照する変数の宣言。 */
export type VariableDefinition = {
  name: string;
  scope: VariableScope;
  initialValue: ScriptValue;
};

// ========================== 値の参照 ==========================

/**
 * スクリプト内で「値」を指定する方法。
 * リテラル値、変数参照、エンティティのステータス参照を統一的に扱う。
 */
export type ValueRef =
  | { type: "literal"; value: ScriptValue }
  | { type: "variable"; scope: VariableScope; name: string }
  | { type: "stat"; target: ScriptTarget; stat: StatKey };

/** ステータスとして参照できるキー。 */
export type StatKey =
  | "hp"
  | "maxHp"
  | "hpPercent"
  | "mp"
  | "maxMp"
  | "mpPercent"
  | "atk"
  | "def"
  | "spd"
  | "level"
  | "exp"
  | "floor";

/** アクションや条件の対象を指す識別子。 */
export type ScriptTarget = "self" | "player" | "target" | "currentEnemy";

// ========================== 条件式 ==========================

/** 比較演算子。 */
export type CompareOp = "==" | "!=" | "<" | "<=" | ">" | ">=";

/** 算術演算子（変数操作用）。 */
export type ArithmeticOp = "+" | "-" | "*" | "/" | "%";

/** 条件ノード。複合条件は and / or で組み合わせる。 */
export type Condition =
  | { type: "compare"; left: ValueRef; op: CompareOp; right: ValueRef }
  | { type: "and"; conditions: Condition[] }
  | { type: "or"; conditions: Condition[] }
  | { type: "not"; condition: Condition }
  | { type: "hasItem"; target: ScriptTarget; itemId: string }
  | { type: "hasStatus"; target: ScriptTarget; statusId: string }
  | { type: "inRange"; target: ScriptTarget; from: ScriptTarget; distance: ValueRef }
  | { type: "inFov"; target: ScriptTarget; observer: ScriptTarget }
  | { type: "random"; percent: ValueRef }
  | { type: "true" }
  | { type: "false" };

// ========================== アクション ==========================

/** 移動方向の指定方法。 */
export type MoveMode =
  | { type: "toward"; target: ScriptTarget }
  | { type: "away"; target: ScriptTarget }
  | { type: "random" }
  | { type: "direction"; dx: number; dy: number };

export type Action =
  | { type: "move"; actor: ScriptTarget; mode: MoveMode }
  | { type: "attack"; attacker: ScriptTarget; defender: ScriptTarget }
  | { type: "useSkill"; user: ScriptTarget; skillId: string; target: ScriptTarget }
  | { type: "damage"; target: ScriptTarget; amount: ValueRef }
  | { type: "heal"; target: ScriptTarget; amount: ValueRef }
  | { type: "addStatus"; target: ScriptTarget; statusId: string; turns: ValueRef }
  | { type: "removeStatus"; target: ScriptTarget; statusId: string }
  | { type: "setStat"; target: ScriptTarget; stat: StatKey; value: ValueRef }
  | { type: "setVariable"; scope: VariableScope; name: string; value: ValueRef }
  | { type: "addVariable"; scope: VariableScope; name: string; op: ArithmeticOp; value: ValueRef }
  | { type: "offerBagItem"; itemId: string }
  | { type: "equipWeapon"; target: ScriptTarget; itemName: ValueRef; atk: ValueRef }
  | { type: "spawnEntity"; entityType: "enemy" | "item"; entityId: string; x: ValueRef; y: ValueRef }
  | { type: "warpMap"; mapId: string; x: ValueRef; y: ValueRef }
  | { type: "log"; message: string; params: Record<string, ValueRef> }
  | { type: "wait"; turns: ValueRef }
  | { type: "endGame" }
  | { type: "doNothing" };

// ========================== 制御フロー ==========================

/** スクリプトの1ノード。アクション・条件分岐・ループを同列に並べる。 */
export type ScriptNode =
  | { type: "action"; action: Action }
  | { type: "if"; condition: Condition; then: ScriptNode[]; else?: ScriptNode[] }
  | { type: "loop"; count: ValueRef; body: ScriptNode[] }
  | { type: "while"; condition: Condition; body: ScriptNode[] }
  | { type: "break" };

// ========================== スクリプト定義 ==========================

/** スクリプトの発火タイミング。 */
export type ScriptTrigger =
  | "ai"
  | "itemEffect"
  | "skillEffect"
  | "onPickup"
  | "onUse"
  | "onTurnStart"
  | "onTurnEnd"
  | "onDamaged"
  | "onDeath"
  | "onMapEnter"
  | "onStepOn"
  | "onExamine"
  | "manual";

/**
 * 1つのスクリプト定義。
 * プロジェクトJSONに保存され、インタープリタが実行する最小単位。
 */
export type ScriptDefinition = {
  id: string;
  name: string;
  trigger: ScriptTrigger;
  variables: VariableDefinition[];
  body: ScriptNode[];
};
