// ---------------------------------------------------------------------------
// 設定パネル（ConfigPanel）
//
// ゲーム設定の編集UI。HTML文字列ベースでフォームを描画し、
// イベント委譲で操作を受け付ける。プロジェクトの保存/読込/初期化も担当する。
// ---------------------------------------------------------------------------

import { escapeHtml } from "../../engine/utils/escapeHtml";
import type { EnemyDefinition, EquipmentSlot, FloorRangeRule, GameConfig, ItemDefinition, ItemKind } from "../../engine/core/GameConfig";
import type { ProjectInfo, ProjectStorage } from "../storage/ProjectStorage";
import type { ScriptDefinition } from "../../engine/script/Script";
import { ScriptEditor } from "./ScriptEditor";

type MessageKey = keyof GameConfig["messages"];
type DatabaseTab = "enemies" | "items" | "skills" | "terrain" | "events";
type ConfirmAction = "save-project" | "save-project-as";

/** ログ文言のテンプレート。{変数名} 形式のプレースホルダを実行時に置換する。 */
const messageTemplates: Record<MessageKey, string> = {
  floorArrive: "{floor}階に到着した。",
  attack: "{attacker}が{defender}に{damage}ダメージ。",
  defeat: "{defender}を倒した。",
  defeatWithExp: "{defender}を倒した（+{exp} EXP）",
  gameOver: "プレイヤーは倒れた。",
  restart: "Enterキーで新しいゲームを開始。",
  pickupToBag: "{item}を拾った。バッグに入れた。",
  bagFull: "バッグがいっぱいだ。{item}をどうする？",
  itemUsed: "{item}を使った。HP +{healed}。",
  weaponEquipped: "{item}を拾った。武器を装備した（ATK +{atk}）。",
  blockedByBagChoice: "バッグの整理を先に決める必要がある。",
  blockedByWall: "壁に阻まれた。",
  noUsableItem: "バッグに使えるアイテムがない。",
  invalidBagSelection: "捨てるアイテムを選べなかった。",
  bagItemReplaced: "{picked}をバッグに入れた。{dropped}を捨てた。",
  pickedItemDiscarded: "{item}を捨てた。",
  levelUp: "Level Up! Lv.{level}",
  useStairsPrompt: "階段の上でSpaceキーを押す必要がある。",
};

const defaultAiOptions = ["chase", "stationary", "random"];
const defaultEffectOptions = ["heal", "equipWeapon"];
const itemKindOptions: Array<[ItemKind, string]> = [["consumable", "消耗品"], ["equipment", "装備"], ["key", "鍵"]];
const equipmentSlotOptions: Array<[EquipmentSlot, string]> = [["weapon", "武器"], ["armor", "防具"], ["accessory", "アクセサリ"]];
/** JSONスキーマのバージョン。読込時にマイグレーションの要否を判定する。 */
const projectSchemaVersion = 2;

/**
 * ゲーム設定の編集UIコンポーネント。
 * フォーム送信で GameConfig を更新し、プロジェクトの保存/読込も管理する。
 */
export class ConfigPanel {
  private readonly defaultProjectJson: string;
  private projectStatus = "";
  private projectInfo: ProjectInfo = { filePath: null, isDirty: false };
  private scriptEditors: ScriptEditor[] = [];
  private activeDatabaseTab: DatabaseTab = "enemies";
  private pendingConfirmAction: ConfirmAction | null = null;

  constructor(
    private root: HTMLElement,
    private config: GameConfig,
    private storage: ProjectStorage,
    private onApply: () => void,
    private submitLabel = () => "設定を反映",
    private onResetToSetup: () => void = () => {},
  ) {
    this.defaultProjectJson = this.projectJson();
    this.applyMessageTemplates();
    this.loadProjectInfo();
    this.render();
    this.root.addEventListener("submit", (event) => this.handleSubmit(event));
    this.root.addEventListener("click", (event) => this.handleClick(event));
    this.root.addEventListener("change", (event) => this.handleChange(event));
  }

  refresh(): void {
    this.render();
  }

  private get aiOptions(): string[] {
    const custom = this.config.customAiIds ?? [];
    return [...defaultAiOptions, ...custom.filter((customAiId) => !defaultAiOptions.includes(customAiId))];
  }

  private get effectOptions(): string[] {
    const custom = this.config.customEffectIds ?? [];
    return [...defaultEffectOptions, ...custom.filter((customEffectId) => !defaultEffectOptions.includes(customEffectId))];
  }

  /** 全セクションのHTMLを組み立てて root に書き込む。 */
  private render(): void {
    this.root.innerHTML = [
      '<form class="config-form database-form">',
      this.renderDatabaseTabs(),
      '<div class="database-layout">',
      this.renderDatabaseList(),
      '<div class="database-editor">',
      this.databasePage("enemies", [this.renderEnemySection()]),
      this.databasePage("items", [this.renderItemSection()]),
      this.databasePage("skills", [this.renderPlayerSection(), this.renderProgressionSection(), this.renderRenderSection()]),
      this.databasePage("terrain", [this.renderDungeonSection(), this.renderFloorSection(), this.renderTileSection()]),
      this.databasePage("events", [this.renderMessageSection(), this.renderProjectSection()]),
      "</div>",
      "</div>",
      `<button class="config-apply" type="submit">${escapeHtml(this.submitLabel())}</button>`,
      this.renderConfirmDialog(),
      "</form>",
    ].join("");
    this.mountScriptEditors();
  }

  private renderDatabaseTabs(): string {
    const tabs: Array<[DatabaseTab, string]> = [
      ["enemies", "敵"],
      ["items", "アイテム"],
      ["skills", "スキル"],
      ["terrain", "地形"],
      ["events", "イベント"],
    ];
    return [
      '<div class="database-tabs" role="tablist" aria-label="データベース">',
      ...tabs.map(([tabId, tabLabel]) => (
        `<button type="button" role="tab" data-db-tab="${tabId}" class="${tabId === this.activeDatabaseTab ? "is-selected" : ""}">${tabLabel}</button>`
      )),
      "</div>",
    ].join("");
  }

  private renderDatabaseList(): string {
    const listItems = this.databaseListItems();
    return [
      '<aside class="database-list" aria-label="一覧">',
      `<div class="database-list-title">${escapeHtml(this.databaseTabLabel(this.activeDatabaseTab))}</div>`,
      '<ol>',
      ...listItems.map((itemLabel, itemIndex) => `<li class="${itemIndex === 0 ? "is-selected" : ""}">${escapeHtml(itemLabel)}</li>`),
      "</ol>",
      "</aside>",
    ].join("");
  }

  private databaseListItems(): string[] {
    switch (this.activeDatabaseTab) {
      case "enemies": return this.config.enemies.map((enemy) => enemy.name);
      case "items": return this.config.items.map((item) => item.name);
      case "skills": return ["プレイヤー", "成長 / 視界", "Canvas描画"];
      case "terrain": return ["ダンジョン", "階層ルール", ...Object.keys(this.config.tiles)];
      case "events": return ["ログ文言", "プロジェクト"];
    }
  }

  private databaseTabLabel(tabId: DatabaseTab): string {
    const labels: Record<DatabaseTab, string> = {
      enemies: "敵",
      items: "アイテム",
      skills: "スキル",
      terrain: "地形",
      events: "イベント",
    };
    return labels[tabId];
  }

  private databasePage(tabId: DatabaseTab, sections: string[]): string {
    return `<section class="database-page${tabId === this.activeDatabaseTab ? " is-active" : ""}" data-page="${tabId}">${sections.join("")}</section>`;
  }

  private renderConfirmDialog(): string {
    if (!this.pendingConfirmAction) return "";

    return [
      '<div class="dialog-backdrop" role="presentation">',
      '<div class="dialog-window" role="dialog" aria-modal="true" aria-label="保存確認">',
      '<p>保存しますか？</p>',
      '<div class="dialog-commands">',
      '<button type="button" data-confirm-answer="yes">&gt; はい</button>',
      '<button type="button" data-confirm-answer="no">　いいえ</button>',
      "</div>",
      "</div>",
      "</div>",
    ].join("");
  }

  private renderPlayerSection(): string {
    return [
      '<fieldset><legend>プレイヤー</legend>',
      this.textInput("名前", "player.name", this.config.player.name),
      this.textInput("見た目", "player.char", this.config.player.char, 1),
      this.colorInput("色", "player.color", this.config.player.color),
      this.numberInput("初期HP", "player.hp", this.config.player.hp, 1),
      this.numberInput("攻撃力", "player.attackPower", this.config.player.attackPower, 0),
      this.numberInput("初期LV", "player.level", this.config.player.level, 1),
      this.numberInput("初期EXP", "player.exp", this.config.player.exp, 0),
      this.numberInput("次LV EXP", "player.nextLevelExp", this.config.player.nextLevelExp, 1),
      this.numberInput("バッグ上限", "player.maxBagItems", this.config.player.maxBagItems, 1),
      "</fieldset>",
    ].join("");
  }

  private renderDungeonSection(): string {
    return [
      '<fieldset><legend>ダンジョン</legend>',
      this.numberInput("幅", "dungeon.width", this.config.dungeon.width, 20),
      this.numberInput("高さ", "dungeon.height", this.config.dungeon.height, 16),
      this.numberInput("部屋数", "dungeon.maxRooms", this.config.dungeon.maxRooms, 1),
      this.numberInput("最小部屋", "dungeon.minRoomSize", this.config.dungeon.minRoomSize, 3),
      this.numberInput("最大部屋", "dungeon.maxRoomSize", this.config.dungeon.maxRoomSize, 3),
      "</fieldset>",
    ].join("");
  }

  private renderProgressionSection(): string {
    return [
      '<fieldset><legend>成長 / 視界</legend>',
      this.numberInput("必要EXP倍率", "progression.nextLevelMultiplier", this.config.progression.nextLevelMultiplier, 1),
      this.numberInput("LV時HP+", "progression.hpGainPerLevel", this.config.progression.hpGainPerLevel, 0),
      this.numberInput("LV時攻撃+", "progression.attackGainPerLevel", this.config.progression.attackGainPerLevel, 0),
      this.numberInput("FOV半径", "fov.radius", this.config.fov.radius, 1),
      "</fieldset>",
    ].join("");
  }

  private renderRenderSection(): string {
    return [
      '<fieldset><legend>Canvas描画</legend>',
      this.numberInput("タイルサイズ", "render.tileSize", this.config.render.tileSize, 8),
      this.textInput("フォント", "render.fontFamily", this.config.render.fontFamily),
      this.colorInput("背景", "render.canvasBackground", this.config.render.canvasBackground),
      this.colorInput("未探索文字", "render.unexploredColor", this.config.render.unexploredColor),
      this.colorInput("未探索背景", "render.unexploredBackground", this.config.render.unexploredBackground),
      this.colorInput("探索済み文字", "render.exploredColor", this.config.render.exploredColor),
      this.colorInput("探索済み背景", "render.exploredBackground", this.config.render.exploredBackground),
      this.textInput("GAME OVER背景", "render.gameOverOverlay", this.config.render.gameOverOverlay),
      this.colorInput("GAME OVERタイトル色", "render.gameOverTitleColor", this.config.render.gameOverTitleColor),
      this.colorInput("GAME OVER本文色", "render.gameOverTextColor", this.config.render.gameOverTextColor),
      this.textInput("GAME OVERタイトル", "render.gameOverTitle", this.config.render.gameOverTitle),
      this.textInput("GAME OVER説明文", "render.gameOverText", this.config.render.gameOverText),
      "</fieldset>",
    ].join("");
  }

  private renderEnemySection(): string {
    return [
      '<fieldset><legend>敵</legend>',
      ...this.config.enemies.map((enemy) => this.renderEnemy(enemy)),
      '<div class="config-group">',
      "<strong>敵を追加</strong>",
      this.textInput("ID", "newEnemy.id", ""),
      this.textInput("名前", "newEnemy.name", ""),
      this.textInput("見た目", "newEnemy.char", "e", 1),
      this.colorInput("色", "newEnemy.color", "#ffffff"),
      this.numberInput("HP", "newEnemy.maxHp", 8, 1),
      this.numberInput("MP", "newEnemy.maxMp", 0, 0),
      this.numberInput("攻撃", "newEnemy.attackPower", 2, 0),
      this.numberInput("防御", "newEnemy.defense", 0, 0),
      this.numberInput("速度", "newEnemy.speed", 0, 0),
      this.numberInput("EXP", "newEnemy.expValue", 4, 0),
      this.selectInput("AI", "newEnemy.aiId", "chase", this.aiOptions),
      this.numberInput("初期出現重み", "newEnemy.weight", 3, 0),
      "</div>",
      "</fieldset>",
    ].join("");
  }

  private renderEnemy(enemy: EnemyDefinition): string {
    const enemyFieldPrefix = `enemy.${enemy.id}`;
    return [
      '<div class="config-group">',
      `<strong>${escapeHtml(enemy.name)}</strong>`,
      `<button class="config-secondary compact" type="button" data-action="duplicate-enemy" data-id="${escapeHtml(enemy.id)}">複製</button>`,
      this.checkboxInput("削除", `${enemyFieldPrefix}.delete`, false),
      this.textInput("名前", `${enemyFieldPrefix}.name`, enemy.name),
      this.textInput("見た目", `${enemyFieldPrefix}.char`, enemy.char, 1),
      this.colorInput("色", `${enemyFieldPrefix}.color`, enemy.color),
      this.numberInput("HP", `${enemyFieldPrefix}.maxHp`, enemy.maxHp, 1),
      this.numberInput("MP", `${enemyFieldPrefix}.maxMp`, enemy.maxMp ?? 0, 0),
      this.numberInput("攻撃", `${enemyFieldPrefix}.attackPower`, enemy.attackPower, 0),
      this.numberInput("防御", `${enemyFieldPrefix}.defense`, enemy.defense ?? 0, 0),
      this.numberInput("速度", `${enemyFieldPrefix}.speed`, enemy.speed ?? 0, 0),
      this.numberInput("EXP", `${enemyFieldPrefix}.expValue`, enemy.expValue, 0),
      this.selectInput("AI", `${enemyFieldPrefix}.aiId`, enemy.aiId, this.aiOptions),
      `<div class="script-editor-mount" data-script-target="enemy-ai" data-enemy-id="${escapeHtml(enemy.id)}"></div>`,
      ...this.config.floorRules.floors.map((floorRule) => {
        const weightedEnemyEntry = floorRule.enemyTable.find((candidateEntry) => candidateEntry.enemyId === enemy.id);
        return this.numberInput(
          `出現重み(${floorRule.id})`,
          `enemy.${enemy.id}.weight.${floorRule.id}`,
          weightedEnemyEntry?.weight ?? 0,
          0,
        );
      }),
      "</div>",
    ].join("");
  }

  private renderItemSection(): string {
    return [
      '<fieldset><legend>アイテム</legend>',
      ...this.config.items.map((item) => this.renderItem(item)),
      '<div class="config-group">',
      "<strong>アイテムを追加</strong>",
      this.textInput("ID", "newItem.id", ""),
      this.textInput("名前", "newItem.name", ""),
      this.textInput("見た目", "newItem.char", "?", 1),
      this.colorInput("色", "newItem.color", "#ffffff"),
      this.optionSelectInput("種別", "newItem.kind", "consumable", itemKindOptions),
      this.optionSelectInput("装備スロット", "newItem.equipmentSlot", "weapon", equipmentSlotOptions),
      this.selectInput("効果", "newItem.effectId", "heal", this.effectOptions),
      this.numberInput("効果値", "newItem.amount", 5, 0),
      this.numberInput("ATK補正", "newItem.atk", 0, 0),
      this.numberInput("DEF補正", "newItem.def", 0, 0),
      this.numberInput("SPD補正", "newItem.spd", 0, 0),
      this.numberInput("最大HP補正", "newItem.maxHp", 0, 0),
      this.numberInput("最大MP補正", "newItem.maxMp", 0, 0),
      this.numberInput("ショップ価格", "newItem.shopPrice", 0, 0),
      this.numberInput("初期出現率%", "newItem.chance", 35, 0, 100),
      "</div>",
      "</fieldset>",
    ].join("");
  }

  private renderItem(item: ItemDefinition): string {
    const itemFieldPrefix = `item.${item.id}`;
    const primaryEffectDefinition = item.effects[0] ?? { effectId: "heal", params: { amount: 0 } };
    const primaryEffectValue = this.effectValue(primaryEffectDefinition.effectId, primaryEffectDefinition.params);
    return [
      '<div class="config-group">',
      `<strong>${escapeHtml(item.name)}</strong>`,
      `<button class="config-secondary compact" type="button" data-action="duplicate-item" data-id="${escapeHtml(item.id)}">複製</button>`,
      this.checkboxInput("削除", `${itemFieldPrefix}.delete`, false),
      this.textInput("名前", `${itemFieldPrefix}.name`, item.name),
      this.textInput("見た目", `${itemFieldPrefix}.char`, item.char, 1),
      this.colorInput("色", `${itemFieldPrefix}.color`, item.color),
      this.optionSelectInput("種別", `${itemFieldPrefix}.kind`, item.kind ?? "consumable", itemKindOptions),
      this.optionSelectInput("装備スロット", `${itemFieldPrefix}.equipmentSlot`, item.equipmentSlot ?? "weapon", equipmentSlotOptions),
      this.selectInput("効果", `${itemFieldPrefix}.effectId`, primaryEffectDefinition.effectId, this.effectOptions),
      this.numberInput("効果値", `${itemFieldPrefix}.amount`, primaryEffectValue, 0),
      this.numberInput("ATK補正", `${itemFieldPrefix}.atk`, item.equipmentStats?.atk ?? 0, 0),
      this.numberInput("DEF補正", `${itemFieldPrefix}.def`, item.equipmentStats?.def ?? 0, 0),
      this.numberInput("SPD補正", `${itemFieldPrefix}.spd`, item.equipmentStats?.spd ?? 0, 0),
      this.numberInput("最大HP補正", `${itemFieldPrefix}.maxHp`, item.equipmentStats?.maxHp ?? 0, 0),
      this.numberInput("最大MP補正", `${itemFieldPrefix}.maxMp`, item.equipmentStats?.maxMp ?? 0, 0),
      this.numberInput("ショップ価格", `${itemFieldPrefix}.shopPrice`, item.shopPrice ?? 0, 0),
      "</div>",
    ].join("");
  }

  private renderFloorSection(): string {
    return [
      '<fieldset><legend>階層ルール</legend>',
      this.numberInput("敵上限", "floorRules.maxEnemies", this.config.floorRules.maxEnemies, 0),
      this.numberInput("アイテム上限", "floorRules.maxItems", this.config.floorRules.maxItems, 0),
      ...this.config.floorRules.floors.map((floorRule) => this.renderFloorRule(floorRule)),
      "</fieldset>",
    ].join("");
  }

  private renderFloorRule(floorRule: FloorRangeRule): string {
    const floorRuleFieldPrefix = `floor.${floorRule.id}`;
    return [
      '<div class="config-group">',
      `<strong>${escapeHtml(floorRule.id)}</strong>`,
      this.numberInput("開始階", `${floorRuleFieldPrefix}.fromFloor`, floorRule.fromFloor, 1),
      this.numberInput("終了階", `${floorRuleFieldPrefix}.toFloor`, floorRule.toFloor ?? 0, 0),
      this.numberInput("敵数min", `${floorRuleFieldPrefix}.enemyMin`, floorRule.enemyCount.min, 0),
      this.numberInput("敵数max", `${floorRuleFieldPrefix}.enemyMax`, floorRule.enemyCount.max, 0),
      this.numberInput("敵HP/階", `${floorRuleFieldPrefix}.hpBonus`, floorRule.enemyHpBonusPerFloor, 0),
      this.numberInput("敵攻撃/階", `${floorRuleFieldPrefix}.attackBonus`, floorRule.enemyAttackBonusPerFloor, 0),
      ...this.config.items.map((item) => {
        const itemDropRule = floorRule.itemDrops.find((candidate) => candidate.itemId === item.id);
        return this.numberInput(`${item.name}出現率%`, `${floorRuleFieldPrefix}.itemChance.${item.id}`, Math.round((itemDropRule?.chance ?? 0) * 100), 0, 100);
      }),
      "</div>",
    ].join("");
  }

  private renderTileSection(): string {
    const coreTileTypes = new Set(["wall", "floor", "stairs"]);
    return [
      '<fieldset><legend>タイル</legend>',
      ...Object.entries(this.config.tiles).map(([tileType, tileDefinition]) => [
        '<div class="config-group">',
        `<strong>${escapeHtml(tileType)}</strong>`,
        !coreTileTypes.has(tileType)
          ? `<button class="config-secondary compact" type="button" data-action="duplicate-tile" data-id="${escapeHtml(tileType)}">複製</button>`
          : "",
        this.textInput("見た目", `tile.${tileType}.char`, tileDefinition.char, 1),
        this.colorInput("文字色", `tile.${tileType}.color`, tileDefinition.color),
        this.colorInput("背景色", `tile.${tileType}.background`, tileDefinition.background),
        this.checkboxInput("通行不可", `tile.${tileType}.blocksMovement`, tileDefinition.blocksMovement),
        !coreTileTypes.has(tileType)
          ? this.numberInput("散布率%", `tile.${tileType}.scatterRate`, Math.round((tileDefinition.scatterRate ?? 0) * 100), 0, 100)
          : "",
        "</div>",
      ].join("")),
      '<div class="config-group">',
      "<strong>タイルを追加</strong>",
      this.textInput("ID", "newTile.id", ""),
      this.textInput("見た目", "newTile.char", "?", 1),
      this.colorInput("文字色", "newTile.color", "#ffffff"),
      this.colorInput("背景色", "newTile.background", "#000000"),
      this.checkboxInput("通行不可", "newTile.blocksMovement", false),
      this.numberInput("散布率%", "newTile.scatterRate", 0, 0, 100),
      "</div>",
      "</fieldset>",
    ].join("");
  }

  private renderMessageSection(): string {
    return [
      '<fieldset><legend>ログ文言</legend>',
      ...Object.entries(messageTemplates).map(([messageKey, messageTemplate]) => (
        this.textInput(messageKey, `message.${messageKey}`, messageTemplate)
      )),
      "</fieldset>",
    ].join("");
  }

  private renderProjectSection(): string {
    const projectJson = this.projectJson();
    const projectName = this.projectInfo.filePath ? this.basename(this.projectInfo.filePath) : "未保存の新規プロジェクト";
    const filePath = this.projectInfo.filePath ?? "未選択";
    const savedLabel = this.projectInfo.isDirty ? "未保存の変更あり" : "保存済み";
    return [
      '<fieldset><legend>プロジェクト</legend>',
      `<div class="project-status">${escapeHtml(this.projectStatus)}</div>`,
      `<div class="project-info"><span>名前</span><strong>${escapeHtml(projectName)}</strong></div>`,
      `<div class="project-info"><span>パス</span><strong>${escapeHtml(filePath)}</strong></div>`,
      `<div class="project-info"><span>状態</span><strong>${escapeHtml(savedLabel)}</strong></div>`,
      `<div class="project-actions">`,
      '<button class="config-secondary" type="button" data-action="new-project">新規</button>',
      '<button class="config-secondary" type="button" data-action="open-project">開く</button>',
      '<button class="config-secondary" type="button" data-action="save-project">保存</button>',
      '<button class="config-secondary" type="button" data-action="save-project-as">名前を付けて保存</button>',
      '<button class="config-secondary" type="button" data-action="reset-default-config">初期化</button>',
      "</div>",
      '<div class="project-help">新規: 初期設定の新しいプロジェクト / 開く: JSONファイル読込 / 保存: 現在のファイルへ保存 / 名前を付けて保存: 保存先を選択 / 初期化: 現在の設定だけ初期化</div>',
      `<input type="hidden" name="project.original" value="${escapeHtml(projectJson)}" />`,
      `<label><span>JSON preview</span><textarea name="project.json" rows="8">${escapeHtml(projectJson)}</textarea></label>`,
      "</fieldset>",
    ].join("");
  }

  private handleClick(event: MouseEvent): void {
    const clickedElement = event.target;
    if (!(clickedElement instanceof HTMLElement)) return;

    const tabButton = clickedElement.closest<HTMLButtonElement>("button[data-db-tab]");
    if (tabButton) {
      const configForm = tabButton.closest("form");
      if (configForm instanceof HTMLFormElement) {
        this.applyFormConfig(new FormData(configForm));
      }
      this.activeDatabaseTab = (tabButton.dataset.dbTab as DatabaseTab | undefined) ?? this.activeDatabaseTab;
      this.render();
      return;
    }

    const confirmButton = clickedElement.closest<HTMLButtonElement>("button[data-confirm-answer]");
    if (confirmButton) {
      const confirmedAction = this.pendingConfirmAction;
      this.pendingConfirmAction = null;
      if (confirmButton.dataset.confirmAnswer !== "yes" || !confirmedAction) {
        this.render();
        return;
      }

      const configForm = confirmButton.closest("form");
      if (configForm instanceof HTMLFormElement) {
        this.applyFormConfig(new FormData(configForm));
      }
      if (confirmedAction === "save-project") {
        void this.saveProject();
      } else {
        void this.saveProjectAs();
      }
      return;
    }

    if (clickedElement.dataset.action === "new-project") {
      void this.newProject();
      return;
    }

    if (clickedElement.dataset.action === "open-project") {
      void this.openProject();
      return;
    }

    if (clickedElement.dataset.action === "reset-default-config") {
      void this.resetToDefaultProject();
      return;
    }

    if (clickedElement.dataset.action === "duplicate-enemy") {
      this.applyCurrentForm(clickedElement);
      void this.duplicateEnemy(clickedElement.dataset.id ?? "");
      return;
    }

    if (clickedElement.dataset.action === "duplicate-item") {
      this.applyCurrentForm(clickedElement);
      void this.duplicateItem(clickedElement.dataset.id ?? "");
      return;
    }

    if (clickedElement.dataset.action === "duplicate-tile") {
      this.applyCurrentForm(clickedElement);
      void this.duplicateTile(clickedElement.dataset.id ?? "");
      return;
    }

    if (clickedElement.dataset.action === "save-project") {
      const configForm = clickedElement.closest("form");
      if (configForm instanceof HTMLFormElement) {
        this.applyFormConfig(new FormData(configForm));
        this.pendingConfirmAction = "save-project";
        this.render();
      }
      return;
    }

    if (clickedElement.dataset.action === "save-project-as") {
      const configForm = clickedElement.closest("form");
      if (configForm instanceof HTMLFormElement) {
        this.applyFormConfig(new FormData(configForm));
        this.pendingConfirmAction = "save-project-as";
        this.render();
      }
    }
  }

  private handleChange(event: Event): void {
    const changedField = event.target;
    if (!(changedField instanceof HTMLInputElement || changedField instanceof HTMLSelectElement || changedField instanceof HTMLTextAreaElement)) return;
    if (changedField.name.startsWith("project.")) return;

    void this.markDirty();
  }

  private applyCurrentForm(sourceElement: HTMLElement): void {
    const configForm = sourceElement.closest("form");
    if (configForm instanceof HTMLFormElement) {
      this.applyFormConfig(new FormData(configForm));
    }
  }

  /** フォーム送信時にフォーム値またはJSON previewから設定を反映する。 */
  private handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    const submittedForm = event.target;
    if (!(submittedForm instanceof HTMLFormElement)) return;

    const formData = new FormData(submittedForm);
    const originalProject = this.stringValue(formData, "project.original", "");
    const submittedProject = this.stringValue(formData, "project.json", "");
    if (submittedProject !== originalProject) {
      if (!this.importProject(submittedProject)) {
        this.updateProjectStatus("JSON previewの形式が正しくありません。");
        this.render();
        return;
      }
      void this.markDirty("JSON previewから設定を読み込みました。保存はまだ行っていません。");
      this.onApply();
      this.render();
      return;
    }

    this.applyFormConfig(formData);
    void this.markDirty("設定をゲームへ反映しました。保存はまだ行っていません。");
    this.onApply();
    this.render();
  }

  /** フォームの全セクションの値を GameConfig へ反映する。 */
  private applyFormConfig(formData: FormData): void {
    this.applyPlayer(formData);
    this.applyDungeon(formData);
    this.applyProgression(formData);
    this.applyRender(formData);
    this.applyEnemies(formData);
    this.applyItems(formData);
    this.applyFloorRules(formData);
    this.applyEnemyWeights(formData);
    this.applyTiles(formData);
    this.applyMessages(formData);
  }

  private applyPlayer(formData: FormData): void {
    this.config.player.name = this.stringValue(formData, "player.name", this.config.player.name);
    this.config.player.char = this.charValue(formData, "player.char", this.config.player.char);
    this.config.player.color = this.stringValue(formData, "player.color", this.config.player.color);
    this.config.player.hp = this.numberValue(formData, "player.hp", this.config.player.hp);
    this.config.player.attackPower = this.numberValue(formData, "player.attackPower", this.config.player.attackPower);
    this.config.player.level = this.numberValue(formData, "player.level", this.config.player.level);
    this.config.player.exp = this.numberValue(formData, "player.exp", this.config.player.exp);
    this.config.player.nextLevelExp = this.numberValue(formData, "player.nextLevelExp", this.config.player.nextLevelExp);
    this.config.player.maxBagItems = this.numberValue(formData, "player.maxBagItems", this.config.player.maxBagItems);
  }

  private applyDungeon(formData: FormData): void {
    this.config.dungeon.width = this.numberValue(formData, "dungeon.width", this.config.dungeon.width);
    this.config.dungeon.height = this.numberValue(formData, "dungeon.height", this.config.dungeon.height);
    this.config.dungeon.maxRooms = this.numberValue(formData, "dungeon.maxRooms", this.config.dungeon.maxRooms);
    this.config.dungeon.minRoomSize = this.numberValue(formData, "dungeon.minRoomSize", this.config.dungeon.minRoomSize);
    this.config.dungeon.maxRoomSize = Math.max(
      this.config.dungeon.minRoomSize,
      this.numberValue(formData, "dungeon.maxRoomSize", this.config.dungeon.maxRoomSize),
    );
  }

  private applyProgression(formData: FormData): void {
    this.config.progression.nextLevelMultiplier = this.numberValue(formData, "progression.nextLevelMultiplier", this.config.progression.nextLevelMultiplier);
    this.config.progression.hpGainPerLevel = this.numberValue(formData, "progression.hpGainPerLevel", this.config.progression.hpGainPerLevel);
    this.config.progression.attackGainPerLevel = this.numberValue(formData, "progression.attackGainPerLevel", this.config.progression.attackGainPerLevel);
    this.config.fov.radius = this.numberValue(formData, "fov.radius", this.config.fov.radius);
  }

  private applyRender(formData: FormData): void {
    this.config.render.tileSize = this.numberValue(formData, "render.tileSize", this.config.render.tileSize);
    this.config.render.fontFamily = this.stringValue(formData, "render.fontFamily", this.config.render.fontFamily);
    this.config.render.canvasBackground = this.stringValue(formData, "render.canvasBackground", this.config.render.canvasBackground);
    this.config.render.unexploredBackground = this.stringValue(formData, "render.unexploredBackground", this.config.render.unexploredBackground);
    this.config.render.exploredColor = this.stringValue(formData, "render.exploredColor", this.config.render.exploredColor);
    this.config.render.exploredBackground = this.stringValue(formData, "render.exploredBackground", this.config.render.exploredBackground);
    this.config.render.unexploredColor = this.stringValue(formData, "render.unexploredColor", this.config.render.unexploredColor);
    this.config.render.gameOverOverlay = this.stringValue(formData, "render.gameOverOverlay", this.config.render.gameOverOverlay);
    this.config.render.gameOverTitleColor = this.stringValue(formData, "render.gameOverTitleColor", this.config.render.gameOverTitleColor);
    this.config.render.gameOverTextColor = this.stringValue(formData, "render.gameOverTextColor", this.config.render.gameOverTextColor);
    this.config.render.gameOverTitle = this.stringValue(formData, "render.gameOverTitle", this.config.render.gameOverTitle);
    this.config.render.gameOverText = this.stringValue(formData, "render.gameOverText", this.config.render.gameOverText);
  }

  private applyEnemies(formData: FormData): void {
    this.config.enemies = this.config.enemies
      .filter((enemy) => formData.get(`enemy.${enemy.id}.delete`) !== "on")
      .map((enemy) => {
        const enemyFieldPrefix = `enemy.${enemy.id}`;
        enemy.name = this.stringValue(formData, `${enemyFieldPrefix}.name`, enemy.name);
        enemy.char = this.charValue(formData, `${enemyFieldPrefix}.char`, enemy.char);
        enemy.color = this.stringValue(formData, `${enemyFieldPrefix}.color`, enemy.color);
        enemy.maxHp = this.numberValue(formData, `${enemyFieldPrefix}.maxHp`, enemy.maxHp);
        enemy.maxMp = this.numberValue(formData, `${enemyFieldPrefix}.maxMp`, enemy.maxMp ?? 0);
        enemy.attackPower = this.numberValue(formData, `${enemyFieldPrefix}.attackPower`, enemy.attackPower);
        enemy.defense = this.numberValue(formData, `${enemyFieldPrefix}.defense`, enemy.defense ?? 0);
        enemy.speed = this.numberValue(formData, `${enemyFieldPrefix}.speed`, enemy.speed ?? 0);
        enemy.expValue = this.numberValue(formData, `${enemyFieldPrefix}.expValue`, enemy.expValue);
        enemy.aiId = this.stringValue(formData, `${enemyFieldPrefix}.aiId`, enemy.aiId);
        return enemy;
      });

    const newEnemyId = this.idValue(formData, "newEnemy.id");
    if (newEnemyId && !this.config.enemies.some((enemy) => enemy.id === newEnemyId)) {
      this.config.enemies.push({
        id: newEnemyId,
        name: this.stringValue(formData, "newEnemy.name", newEnemyId),
        char: this.charValue(formData, "newEnemy.char", "e"),
        color: this.stringValue(formData, "newEnemy.color", "#ffffff"),
        maxHp: this.numberValue(formData, "newEnemy.maxHp", 8),
        maxMp: this.numberValue(formData, "newEnemy.maxMp", 0),
        attackPower: this.numberValue(formData, "newEnemy.attackPower", 2),
        defense: this.numberValue(formData, "newEnemy.defense", 0),
        speed: this.numberValue(formData, "newEnemy.speed", 0),
        expValue: this.numberValue(formData, "newEnemy.expValue", 4),
        aiId: this.stringValue(formData, "newEnemy.aiId", "chase"),
      });
      this.addEnemyToFloorRules(newEnemyId, this.numberValue(formData, "newEnemy.weight", 3));
    }
  }

  private applyItems(formData: FormData): void {
    this.config.items = this.config.items
      .filter((item) => formData.get(`item.${item.id}.delete`) !== "on")
      .map((item) => {
        const itemFieldPrefix = `item.${item.id}`;
        const effectId = this.stringValue(formData, `${itemFieldPrefix}.effectId`, item.effects[0]?.effectId ?? "heal");
        item.name = this.stringValue(formData, `${itemFieldPrefix}.name`, item.name);
        item.char = this.charValue(formData, `${itemFieldPrefix}.char`, item.char);
        item.color = this.stringValue(formData, `${itemFieldPrefix}.color`, item.color);
        item.kind = this.itemKindValue(formData, `${itemFieldPrefix}.kind`, item.kind ?? "consumable");
        item.equipmentSlot = item.kind === "equipment"
          ? this.equipmentSlotValue(formData, `${itemFieldPrefix}.equipmentSlot`, item.equipmentSlot ?? "weapon")
          : undefined;
        item.equipmentStats = this.equipmentStatsValue(formData, itemFieldPrefix, item.equipmentStats);
        item.shopPrice = this.numberValue(formData, `${itemFieldPrefix}.shopPrice`, item.shopPrice ?? 0);
        item.effects = [this.createEffect(effectId, this.numberValue(formData, `${itemFieldPrefix}.amount`, 0), item)];
        return item;
      });

    const newItemId = this.idValue(formData, "newItem.id");
    if (newItemId && !this.config.items.some((item) => item.id === newItemId)) {
      const effectId = this.stringValue(formData, "newItem.effectId", "heal");
      this.config.items.push({
        id: newItemId,
        name: this.stringValue(formData, "newItem.name", newItemId),
        char: this.charValue(formData, "newItem.char", "?"),
        color: this.stringValue(formData, "newItem.color", "#ffffff"),
        kind: this.itemKindValue(formData, "newItem.kind", "consumable"),
        equipmentSlot: this.equipmentSlotValue(formData, "newItem.equipmentSlot", "weapon"),
        equipmentStats: this.equipmentStatsValue(formData, "newItem"),
        shopPrice: this.numberValue(formData, "newItem.shopPrice", 0),
        effects: [],
      });
      const addedItem = this.config.items[this.config.items.length - 1];
      if (addedItem.kind !== "equipment") addedItem.equipmentSlot = undefined;
      addedItem.effects = [this.createEffect(effectId, this.numberValue(formData, "newItem.amount", 5), addedItem)];
      this.addItemToFloorRules(newItemId, this.numberValue(formData, "newItem.chance", 35) / 100);
    }
  }

  private applyFloorRules(formData: FormData): void {
    this.config.floorRules.maxEnemies = this.numberValue(formData, "floorRules.maxEnemies", this.config.floorRules.maxEnemies);
    this.config.floorRules.maxItems = this.numberValue(formData, "floorRules.maxItems", this.config.floorRules.maxItems);

    for (const floorRule of this.config.floorRules.floors) {
      const floorRuleFieldPrefix = `floor.${floorRule.id}`;
      floorRule.fromFloor = this.numberValue(formData, `${floorRuleFieldPrefix}.fromFloor`, floorRule.fromFloor);
      const configuredToFloor = this.numberValue(formData, `${floorRuleFieldPrefix}.toFloor`, floorRule.toFloor ?? 0);
      floorRule.toFloor = configuredToFloor > 0 ? configuredToFloor : undefined;
      floorRule.enemyCount.min = this.numberValue(formData, `${floorRuleFieldPrefix}.enemyMin`, floorRule.enemyCount.min);
      floorRule.enemyCount.max = Math.max(floorRule.enemyCount.min, this.numberValue(formData, `${floorRuleFieldPrefix}.enemyMax`, floorRule.enemyCount.max));
      floorRule.enemyHpBonusPerFloor = this.numberValue(formData, `${floorRuleFieldPrefix}.hpBonus`, floorRule.enemyHpBonusPerFloor);
      floorRule.enemyAttackBonusPerFloor = this.numberValue(formData, `${floorRuleFieldPrefix}.attackBonus`, floorRule.enemyAttackBonusPerFloor);
      floorRule.itemDrops = this.config.items
        .map((item) => {
          const existingItemDrop = floorRule.itemDrops.find((itemDrop) => itemDrop.itemId === item.id);
          return {
            itemId: item.id,
            chance: this.numberValue(formData, `${floorRuleFieldPrefix}.itemChance.${item.id}`, Math.round((existingItemDrop?.chance ?? 0) * 100)) / 100,
          };
        })
        .filter((itemDrop) => itemDrop.chance > 0);
    }
  }

  /** 敵セクションで編集した出現重みをフロアルールへ反映する。applyFloorRules の後に呼ぶ。 */
  private applyEnemyWeights(formData: FormData): void {
    for (const floorRule of this.config.floorRules.floors) {
      floorRule.enemyTable = this.config.enemies
        .map((enemy) => {
          const existingEnemyEntry = floorRule.enemyTable.find((enemyEntry) => enemyEntry.enemyId === enemy.id);
          const weight = this.numberValue(
            formData,
            `enemy.${enemy.id}.weight.${floorRule.id}`,
            existingEnemyEntry?.weight ?? 0,
          );
          return { enemyId: enemy.id, weight };
        })
        .filter((enemyEntry) => enemyEntry.weight > 0);
    }
  }

  /** 新規追加した敵を全階層ルールへ初期登録する。 */
  private addEnemyToFloorRules(enemyId: string, weight: number): void {
    if (weight <= 0) return;

    for (const floorRule of this.config.floorRules.floors) {
      if (!floorRule.enemyTable.some((enemyEntry) => enemyEntry.enemyId === enemyId)) {
        floorRule.enemyTable.push({ enemyId, weight });
      }
    }
  }

  /** 新規追加したアイテムを全階層ルールへ初期登録する。 */
  private addItemToFloorRules(itemId: string, chance: number): void {
    if (chance <= 0) return;

    for (const floorRule of this.config.floorRules.floors) {
      if (!floorRule.itemDrops.some((itemDrop) => itemDrop.itemId === itemId)) {
        floorRule.itemDrops.push({ itemId, chance });
      }
    }
  }

  private applyTiles(formData: FormData): void {
    const coreTileTypes = new Set(["wall", "floor", "stairs"]);
    for (const [tileType, tileDefinition] of Object.entries(this.config.tiles)) {
      tileDefinition.char = this.charValue(formData, `tile.${tileType}.char`, tileDefinition.char);
      tileDefinition.color = this.stringValue(formData, `tile.${tileType}.color`, tileDefinition.color);
      tileDefinition.background = this.stringValue(formData, `tile.${tileType}.background`, tileDefinition.background);
      tileDefinition.blocksMovement = formData.get(`tile.${tileType}.blocksMovement`) === "on";
      if (!coreTileTypes.has(tileType)) {
        tileDefinition.scatterRate = this.numberValue(formData, `tile.${tileType}.scatterRate`, Math.round((tileDefinition.scatterRate ?? 0) * 100)) / 100;
      }
    }

    const newTileId = this.idValue(formData, "newTile.id");
    if (newTileId && !this.config.tiles[newTileId]) {
      this.config.tiles[newTileId] = {
        type: newTileId,
        char: this.charValue(formData, "newTile.char", "?"),
        color: this.stringValue(formData, "newTile.color", "#ffffff"),
        background: this.stringValue(formData, "newTile.background", "#000000"),
        blocksMovement: formData.get("newTile.blocksMovement") === "on",
        scatterRate: this.numberValue(formData, "newTile.scatterRate", 0) / 100,
      };
    }
  }

  private async duplicateEnemy(enemyId: string): Promise<void> {
    const sourceEnemy = this.config.enemies.find((enemy) => enemy.id === enemyId);
    if (!sourceEnemy) return;

    const duplicatedEnemy = structuredClone(sourceEnemy);
    duplicatedEnemy.id = this.uniqueId(`${sourceEnemy.id}_copy`, (candidateId) => this.config.enemies.some((enemy) => enemy.id === candidateId));
    duplicatedEnemy.name = `${sourceEnemy.name} コピー`;
    this.config.enemies.push(duplicatedEnemy);
    this.addEnemyToFloorRules(duplicatedEnemy.id, 1);
    await this.markDirty("敵を複製しました。");
    this.render();
  }

  private async duplicateItem(itemId: string): Promise<void> {
    const sourceItem = this.config.items.find((item) => item.id === itemId);
    if (!sourceItem) return;

    const duplicatedItem = structuredClone(sourceItem);
    duplicatedItem.id = this.uniqueId(`${sourceItem.id}_copy`, (candidateId) => this.config.items.some((item) => item.id === candidateId));
    duplicatedItem.name = `${sourceItem.name} コピー`;
    this.config.items.push(duplicatedItem);
    this.addItemToFloorRules(duplicatedItem.id, 0.1);
    await this.markDirty("アイテムを複製しました。");
    this.render();
  }

  private async duplicateTile(tileId: string): Promise<void> {
    const sourceTile = this.config.tiles[tileId];
    if (!sourceTile) return;

    const duplicatedTileId = this.uniqueId(`${tileId}_copy`, (candidateId) => Boolean(this.config.tiles[candidateId]));
    this.config.tiles[duplicatedTileId] = {
      ...structuredClone(sourceTile),
      type: duplicatedTileId,
      scatterRate: sourceTile.scatterRate ?? 0.05,
    };
    await this.markDirty("地形を複製しました。");
    this.render();
  }

  private uniqueId(baseId: string, exists: (candidateId: string) => boolean): string {
    const normalizedBaseId = baseId.replace(/[^a-zA-Z0-9_-]/g, "_") || "copy";
    if (!exists(normalizedBaseId)) return normalizedBaseId;

    let suffix = 2;
    while (exists(`${normalizedBaseId}_${suffix}`)) {
      suffix += 1;
    }
    return `${normalizedBaseId}_${suffix}`;
  }

  private applyMessages(formData: FormData): void {
    for (const messageKey of Object.keys(messageTemplates) as MessageKey[]) {
      messageTemplates[messageKey] = this.stringValue(formData, `message.${messageKey}`, messageTemplates[messageKey]);
    }
    this.applyMessageTemplates();
  }

  /** テンプレート文字列から config.messages の関数群を生成する。 */
  private applyMessageTemplates(): void {
    this.config.messages.floorArrive = (floor) => this.interpolate(messageTemplates.floorArrive, { floor });
    this.config.messages.attack = (attacker, defender, damage) => this.interpolate(messageTemplates.attack, { attacker: attacker.name, defender: defender.name, damage });
    this.config.messages.defeat = (defender) => this.interpolate(messageTemplates.defeat, { defender });
    this.config.messages.defeatWithExp = (defender, exp) => this.interpolate(messageTemplates.defeatWithExp, { defender, exp });
    this.config.messages.gameOver = () => messageTemplates.gameOver;
    this.config.messages.restart = () => messageTemplates.restart;
    this.config.messages.pickupToBag = (item) => this.interpolate(messageTemplates.pickupToBag, { item });
    this.config.messages.bagFull = (item) => this.interpolate(messageTemplates.bagFull, { item });
    this.config.messages.itemUsed = (item, healed) => this.interpolate(messageTemplates.itemUsed, { item, healed });
    this.config.messages.weaponEquipped = (item, atk) => this.interpolate(messageTemplates.weaponEquipped, { item, atk });
    this.config.messages.blockedByBagChoice = () => messageTemplates.blockedByBagChoice;
    this.config.messages.blockedByWall = () => messageTemplates.blockedByWall;
    this.config.messages.noUsableItem = () => messageTemplates.noUsableItem;
    this.config.messages.invalidBagSelection = () => messageTemplates.invalidBagSelection;
    this.config.messages.bagItemReplaced = (picked, dropped) => this.interpolate(messageTemplates.bagItemReplaced, { picked, dropped });
    this.config.messages.pickedItemDiscarded = (item) => this.interpolate(messageTemplates.pickedItemDiscarded, { item });
    this.config.messages.levelUp = (level) => this.interpolate(messageTemplates.levelUp, { level });
    this.config.messages.useStairsPrompt = () => messageTemplates.useStairsPrompt;
  }

  private createEffect(effectId: string, effectAmount: number, item?: ItemDefinition): ItemDefinition["effects"][number] {
    return effectId === "equipWeapon"
      ? { effectId, params: { slot: item?.equipmentSlot ?? "weapon", ...(item?.equipmentStats ?? this.defaultEquipmentStats()), atk: item?.equipmentStats?.atk ?? effectAmount } }
      : { effectId, params: { amount: effectAmount } };
  }

  private effectValue(effectId: string, params: Record<string, number | string | boolean>): number {
    const effectParamName = effectId === "equipWeapon" ? "atk" : "amount";
    const effectParamValue = params[effectParamName];
    return typeof effectParamValue === "number" ? effectParamValue : 0;
  }

  private numberInput(label: string, fieldName: string, fieldValue: number, min: number, max?: number): string {
    const maxAttribute = max === undefined ? "" : ` max="${max}"`;
    return `<label><span>${escapeHtml(label)}</span><input type="number" name="${escapeHtml(fieldName)}" value="${fieldValue}" min="${min}" step="any"${maxAttribute} /></label>`;
  }

  private textInput(label: string, fieldName: string, fieldValue: string, maxLength?: number): string {
    const maxLengthAttribute = maxLength === undefined ? "" : ` maxlength="${maxLength}"`;
    return `<label><span>${escapeHtml(label)}</span><input type="text" name="${escapeHtml(fieldName)}" value="${escapeHtml(fieldValue)}"${maxLengthAttribute} /></label>`;
  }

  private colorInput(label: string, fieldName: string, fieldValue: string): string {
    return `<label><span>${escapeHtml(label)}</span><input type="color" name="${escapeHtml(fieldName)}" value="${escapeHtml(fieldValue)}" /></label>`;
  }

  private checkboxInput(label: string, fieldName: string, checked: boolean): string {
    return `<label><span>${escapeHtml(label)}</span><input type="checkbox" name="${escapeHtml(fieldName)}"${checked ? " checked" : ""} /></label>`;
  }

  private selectInput(label: string, fieldName: string, selectedValue: string, options: string[]): string {
    const optionHtml = options
      .map((optionValue) => `<option value="${escapeHtml(optionValue)}"${optionValue === selectedValue ? " selected" : ""}>${escapeHtml(optionValue)}</option>`)
      .join("");
    return `<label><span>${escapeHtml(label)}</span><select name="${escapeHtml(fieldName)}">${optionHtml}</select></label>`;
  }

  private optionSelectInput(label: string, fieldName: string, selectedValue: string, options: Array<[string, string]>): string {
    const optionHtml = options
      .map(([optionValue, optionLabel]) => `<option value="${escapeHtml(optionValue)}"${optionValue === selectedValue ? " selected" : ""}>${escapeHtml(optionLabel)}</option>`)
      .join("");
    return `<label><span>${escapeHtml(label)}</span><select name="${escapeHtml(fieldName)}">${optionHtml}</select></label>`;
  }

  private numberValue(formData: FormData, fieldName: string, fallback: number): number {
    const rawFieldValue = formData.get(fieldName);
    if (rawFieldValue === null) return fallback;
    const numberValue = Number(rawFieldValue);
    return Number.isFinite(numberValue) ? numberValue : fallback;
  }

  private stringValue(formData: FormData, fieldName: string, fallback: string): string {
    const fieldValue = formData.get(fieldName);
    return typeof fieldValue === "string" && fieldValue.length > 0 ? fieldValue : fallback;
  }

  private charValue(formData: FormData, fieldName: string, fallback: string): string {
    return this.stringValue(formData, fieldName, fallback).slice(0, 1) || fallback;
  }

  private idValue(formData: FormData, fieldName: string): string {
    const candidateId = this.stringValue(formData, fieldName, "").trim();
    return /^[a-zA-Z0-9_-]+$/.test(candidateId) ? candidateId : "";
  }

  private itemKindValue(formData: FormData, fieldName: string, fallback: ItemKind): ItemKind {
    const value = this.stringValue(formData, fieldName, fallback);
    return value === "equipment" || value === "key" ? value : "consumable";
  }

  private equipmentSlotValue(formData: FormData, fieldName: string, fallback: EquipmentSlot): EquipmentSlot {
    const value = this.stringValue(formData, fieldName, fallback);
    return value === "armor" || value === "accessory" ? value : "weapon";
  }

  private equipmentStatsValue(formData: FormData, fieldPrefix: string, fallback = this.defaultEquipmentStats()): ItemDefinition["equipmentStats"] {
    return {
      atk: this.numberValue(formData, `${fieldPrefix}.atk`, fallback.atk),
      def: this.numberValue(formData, `${fieldPrefix}.def`, fallback.def),
      spd: this.numberValue(formData, `${fieldPrefix}.spd`, fallback.spd),
      maxHp: this.numberValue(formData, `${fieldPrefix}.maxHp`, fallback.maxHp),
      maxMp: this.numberValue(formData, `${fieldPrefix}.maxMp`, fallback.maxMp),
    };
  }

  private defaultEquipmentStats(): NonNullable<ItemDefinition["equipmentStats"]> {
    return { atk: 0, def: 0, spd: 0, maxHp: 0, maxMp: 0 };
  }

  private interpolate(template: string, values: Record<string, string | number>): string {
    return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, placeholderName: string) => (
      values[placeholderName] === undefined ? match : String(values[placeholderName])
    ));
  }

  private async loadProjectInfo(): Promise<void> {
    this.projectInfo = await this.storage.getCurrentProjectInfo();
    this.updateProjectStatus("初期設定の新規プロジェクトです。");
    this.render();
  }

  private async newProject(): Promise<void> {
    if (!this.confirmDiscardUnsaved("未保存の変更があります。新規プロジェクトを作成しますか？")) return;

    this.importProject(this.defaultProjectJson);
    this.projectInfo = await this.storage.newProject();
    this.onResetToSetup();
    this.updateProjectStatus("新規プロジェクトを作成しました。");
    this.render();
  }

  private async openProject(): Promise<void> {
    if (!this.confirmDiscardUnsaved("未保存の変更があります。別のプロジェクトを開きますか？")) return;

    const openResult = await this.storage.openProject();
    if (openResult.canceled) return;
    if (openResult.error || !openResult.json) {
      this.updateProjectStatus(openResult.error ?? "プロジェクトを読み込めませんでした。");
      this.render();
      return;
    }

    if (!this.importProject(openResult.json)) {
      await this.storage.discardPendingOpen();
      this.updateProjectStatus("プロジェクトJSONの形式が正しくありません。");
      this.render();
      return;
    }

    // JSON 形式検証に成功したので、main process 側で保留中のファイルパスを確定する
    this.projectInfo = await this.storage.confirmOpen();
    this.onResetToSetup();
    this.updateProjectStatus("プロジェクトを読み込みました。");
    this.render();
  }

  private async saveProject(): Promise<void> {
    const saveResult = await this.storage.saveProject(this.projectJson());
    this.handleSaveResult(saveResult, "プロジェクトを保存しました。");
  }

  private async saveProjectAs(): Promise<void> {
    const saveResult = await this.storage.saveProjectAs(this.projectJson());
    this.handleSaveResult(saveResult, "名前を付けて保存しました。");
  }

  private async resetToDefaultProject(): Promise<void> {
    if (!this.confirmDiscardUnsaved("未保存の変更があります。設定を初期化しますか？")) return;

    this.importProject(this.defaultProjectJson);
    this.projectInfo = await this.storage.setDirty(true);
    this.onResetToSetup();
    this.updateProjectStatus("設定を初期化しました。ファイルは削除していません。");
    this.render();
  }

  /** JSONを解析して GameConfig へ反映する。不正な形式なら false を返す。 */
  private importProject(projectJson: string): boolean {
    try {
      const parsedProject = JSON.parse(projectJson) as Partial<GameConfig> & {
        messageTemplates?: Partial<Record<MessageKey, string>>;
        schemaVersion?: number;
      };
      if (typeof parsedProject !== "object" || parsedProject === null) {
        return false;
      }
      const loadedSchemaVersion = parsedProject.schemaVersion;
      if (typeof loadedSchemaVersion !== "number" || loadedSchemaVersion > projectSchemaVersion) {
        return false;
      }
      if (parsedProject.player) Object.assign(this.config.player, parsedProject.player);
      if (parsedProject.dungeon) Object.assign(this.config.dungeon, parsedProject.dungeon);
      if (parsedProject.tiles) this.config.tiles = parsedProject.tiles;
      if (parsedProject.enemies) this.config.enemies = parsedProject.enemies;
      if (parsedProject.items) this.config.items = parsedProject.items;
      if (parsedProject.floorRules) this.config.floorRules = parsedProject.floorRules;
      if (parsedProject.render) Object.assign(this.config.render, parsedProject.render);
      if (parsedProject.fov) Object.assign(this.config.fov, parsedProject.fov);
      if (parsedProject.progression) Object.assign(this.config.progression, parsedProject.progression);
      if (parsedProject.messageTemplates) Object.assign(messageTemplates, parsedProject.messageTemplates);
      if (loadedSchemaVersion < projectSchemaVersion) {
        this.migrateFloorRuleCoverage();
      }
      this.normalizeEnemyStats();
      this.normalizeItems();
      this.applyMessageTemplates();
      return true;
    } catch {
      return false;
    }
  }

  /** 現在の設定を保存用 JSON 文字列に変換する。 */
  private projectJson(): string {
    return JSON.stringify({
      schemaVersion: projectSchemaVersion,
      player: this.config.player,
      dungeon: this.config.dungeon,
      tiles: this.config.tiles,
      enemies: this.config.enemies,
      items: this.config.items,
      floorRules: this.config.floorRules,
      render: this.config.render,
      fov: this.config.fov,
      progression: this.config.progression,
      messageTemplates,
    }, null, 2);
  }

  private updateProjectStatus(message?: string): void {
    if (message) {
      this.projectStatus = message;
      this.updateSaveStateLabel();
      return;
    }

    this.projectStatus = this.projectInfo.isDirty ? "未保存の変更があります。" : "保存済みです。";
    this.updateSaveStateLabel();
  }

  private async markDirty(message?: string): Promise<void> {
    this.projectInfo = await this.storage.setDirty(true);
    this.updateProjectStatus(message ?? "未保存の変更があります。");
    this.updateProjectStatusElement();
  }

  private handleSaveResult(saveResult: { canceled: boolean; filePath?: string | null; error?: string }, successMessage: string): void {
    if (saveResult.canceled) return;

    if (saveResult.error) {
      this.updateProjectStatus(saveResult.error);
      this.render();
      return;
    }

    this.projectInfo = {
      filePath: saveResult.filePath ?? null,
      isDirty: false,
    };
    this.updateProjectStatus(successMessage);
    this.render();
  }

  private confirmDiscardUnsaved(message: string): boolean {
    return !this.projectInfo.isDirty || window.confirm(message);
  }

  private updateProjectStatusElement(): void {
    const projectStatusElement = this.root.querySelector(".project-status");
    if (projectStatusElement) {
      projectStatusElement.textContent = this.projectStatus;
    }
    this.updateSaveStateLabel();
  }

  private updateSaveStateLabel(): void {
    const saveStateElement = document.querySelector<HTMLElement>("#editor-save-state");
    if (saveStateElement) {
      saveStateElement.textContent = this.projectInfo.isDirty ? "未保存" : "保存済み";
    }
  }

  private basename(filePath: string): string {
    return filePath.split(/[\\/]/).pop() ?? filePath;
  }

  /** 旧バージョンの JSON を読み込んだ時に、全敵・アイテムを階層ルールへ補完する。 */
  private migrateFloorRuleCoverage(): void {
    for (const enemyDefinition of this.config.enemies) {
      this.addEnemyToFloorRules(enemyDefinition.id, 1);
    }

    for (const itemDefinition of this.config.items) {
      this.addItemToFloorRules(itemDefinition.id, 0.25);
    }
  }

  /** 旧プロジェクトJSONに無い敵ステータスを補完する。 */
  private normalizeEnemyStats(): void {
    for (const enemyDefinition of this.config.enemies) {
      enemyDefinition.maxMp = this.normalizedNumber(enemyDefinition.maxMp, 0, 0);
      enemyDefinition.defense = this.normalizedNumber(enemyDefinition.defense, 0, 0);
      enemyDefinition.speed = this.normalizedNumber(enemyDefinition.speed, 0, 0);
    }
  }

  private normalizeItems(): void {
    for (const itemDefinition of this.config.items) {
      itemDefinition.kind = itemDefinition.kind ?? (itemDefinition.effects[0]?.effectId === "equipWeapon" ? "equipment" : "consumable");
      itemDefinition.equipmentSlot = itemDefinition.kind === "equipment" ? itemDefinition.equipmentSlot ?? "weapon" : undefined;
      itemDefinition.equipmentStats = {
        ...this.defaultEquipmentStats(),
        ...(itemDefinition.equipmentStats ?? {}),
      };
      itemDefinition.shopPrice = this.normalizedNumber(itemDefinition.shopPrice, 0, 0);
      const primaryEffect = itemDefinition.effects[0];
      if (primaryEffect?.effectId === "equipWeapon") {
        itemDefinition.equipmentStats.atk = itemDefinition.equipmentStats.atk || this.effectValue("equipWeapon", primaryEffect.params);
        primaryEffect.params = { slot: itemDefinition.equipmentSlot ?? "weapon", ...itemDefinition.equipmentStats };
      }
    }
  }

  private normalizedNumber(value: unknown, fallback: number, min: number): number {
    return typeof value === "number" && Number.isFinite(value) ? Math.max(min, value) : fallback;
  }

  /** 敵設定のマウントポイントにスクリプトエディタを生成して挿入する。 */
  private mountScriptEditors(): void {
    this.scriptEditors = [];
    const scriptEditorMounts = this.root.querySelectorAll<HTMLElement>(".script-editor-mount");
    for (const scriptEditorMount of scriptEditorMounts) {
      const scriptTarget = scriptEditorMount.dataset.scriptTarget;
      const enemyId = scriptEditorMount.dataset.enemyId;

      if (scriptTarget === "enemy-ai" && enemyId) {
        const enemyDefinition = this.config.enemies.find((candidateEnemyDefinition) => candidateEnemyDefinition.id === enemyId);
        if (!enemyDefinition) continue;
        const aiScript = enemyDefinition.aiScript ?? this.defaultAiScript(enemyDefinition.aiId);
        const scriptEditor = new ScriptEditor(scriptEditorMount, aiScript, () => {
          enemyDefinition.aiScript = scriptEditor.getScript();
          void this.markDirty();
        });
        this.scriptEditors.push(scriptEditor);
      }
    }
  }

  private defaultAiScript(aiId: string): ScriptDefinition {
    return {
      id: aiId,
      name: aiId,
      trigger: "ai",
      variables: [],
      body: [{ type: "action", action: { type: "doNothing" } }],
    };
  }

}
