// ---------------------------------------------------------------------------
// 設定パネル（ConfigPanel）
//
// ゲーム設定の編集UI。HTML文字列ベースでフォームを描画し、
// イベント委譲で操作を受け付ける。プロジェクトの保存/読込/初期化も担当する。
// ---------------------------------------------------------------------------

import { escapeHtml } from "../../engine/utils/escapeHtml";
import type { EnemyDefinition, FloorRangeRule, GameConfig, ItemDefinition } from "../../engine/core/GameConfig";
import type { ProjectInfo, ProjectStorage } from "../storage/ProjectStorage";
import type { ScriptDefinition } from "../../engine/script/Script";
import { ScriptEditor } from "./ScriptEditor";

type MessageKey = keyof GameConfig["messages"];

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
    return [...defaultAiOptions, ...custom.filter((id) => !defaultAiOptions.includes(id))];
  }

  private get effectOptions(): string[] {
    const custom = this.config.customEffectIds ?? [];
    return [...defaultEffectOptions, ...custom.filter((id) => !defaultEffectOptions.includes(id))];
  }

  /** 全セクションのHTMLを組み立てて root に書き込む。 */
  private render(): void {
    this.root.innerHTML = [
      '<form class="config-form">',
      this.renderPlayerSection(),
      this.renderDungeonSection(),
      this.renderProgressionSection(),
      this.renderRenderSection(),
      this.renderEnemySection(),
      this.renderItemSection(),
      this.renderFloorSection(),
      this.renderTileSection(),
      this.renderMessageSection(),
      this.renderProjectSection(),
      `<button class="config-apply" type="submit">${escapeHtml(this.submitLabel())}</button>`,
      "</form>",
    ].join("");
    this.mountScriptEditors();
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
      this.numberInput("攻撃", "newEnemy.attackPower", 2, 0),
      this.numberInput("EXP", "newEnemy.expValue", 4, 0),
      this.selectInput("AI", "newEnemy.aiId", "chase", this.aiOptions),
      this.numberInput("初期出現重み", "newEnemy.weight", 3, 0),
      "</div>",
      "</fieldset>",
    ].join("");
  }

  private renderEnemy(enemy: EnemyDefinition): string {
    const prefix = `enemy.${enemy.id}`;
    return [
      '<div class="config-group">',
      `<strong>${escapeHtml(enemy.name)}</strong>`,
      this.checkboxInput("削除", `${prefix}.delete`, false),
      this.textInput("名前", `${prefix}.name`, enemy.name),
      this.textInput("見た目", `${prefix}.char`, enemy.char, 1),
      this.colorInput("色", `${prefix}.color`, enemy.color),
      this.numberInput("HP", `${prefix}.maxHp`, enemy.maxHp, 1),
      this.numberInput("攻撃", `${prefix}.attackPower`, enemy.attackPower, 0),
      this.numberInput("EXP", `${prefix}.expValue`, enemy.expValue, 0),
      this.selectInput("AI", `${prefix}.aiId`, enemy.aiId, this.aiOptions),
      `<div class="script-editor-mount" data-script-target="enemy-ai" data-enemy-id="${escapeHtml(enemy.id)}"></div>`,
      ...this.config.floorRules.floors.map((rule) => {
        const entry = rule.enemyTable.find((e) => e.enemyId === enemy.id);
        return this.numberInput(
          `出現重み(${rule.id})`,
          `enemy.${enemy.id}.weight.${rule.id}`,
          entry?.weight ?? 0,
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
      this.selectInput("効果", "newItem.effectId", "heal", this.effectOptions),
      this.numberInput("効果値", "newItem.amount", 5, 0),
      this.numberInput("初期出現率%", "newItem.chance", 35, 0, 100),
      "</div>",
      "</fieldset>",
    ].join("");
  }

  private renderItem(item: ItemDefinition): string {
    const prefix = `item.${item.id}`;
    const effect = item.effects[0] ?? { effectId: "heal", params: { amount: 0 } };
    const value = this.effectValue(effect.effectId, effect.params);
    return [
      '<div class="config-group">',
      `<strong>${escapeHtml(item.name)}</strong>`,
      this.checkboxInput("削除", `${prefix}.delete`, false),
      this.textInput("名前", `${prefix}.name`, item.name),
      this.textInput("見た目", `${prefix}.char`, item.char, 1),
      this.colorInput("色", `${prefix}.color`, item.color),
      this.selectInput("効果", `${prefix}.effectId`, effect.effectId, this.effectOptions),
      this.numberInput("効果値", `${prefix}.amount`, value, 0),
      "</div>",
    ].join("");
  }

  private renderFloorSection(): string {
    return [
      '<fieldset><legend>階層ルール</legend>',
      this.numberInput("敵上限", "floorRules.maxEnemies", this.config.floorRules.maxEnemies, 0),
      this.numberInput("アイテム上限", "floorRules.maxItems", this.config.floorRules.maxItems, 0),
      ...this.config.floorRules.floors.map((rule) => this.renderFloorRule(rule)),
      "</fieldset>",
    ].join("");
  }

  private renderFloorRule(rule: FloorRangeRule): string {
    const prefix = `floor.${rule.id}`;
    return [
      '<div class="config-group">',
      `<strong>${escapeHtml(rule.id)}</strong>`,
      this.numberInput("開始階", `${prefix}.fromFloor`, rule.fromFloor, 1),
      this.numberInput("終了階", `${prefix}.toFloor`, rule.toFloor ?? 0, 0),
      this.numberInput("敵数min", `${prefix}.enemyMin`, rule.enemyCount.min, 0),
      this.numberInput("敵数max", `${prefix}.enemyMax`, rule.enemyCount.max, 0),
      this.numberInput("敵HP/階", `${prefix}.hpBonus`, rule.enemyHpBonusPerFloor, 0),
      this.numberInput("敵攻撃/階", `${prefix}.attackBonus`, rule.enemyAttackBonusPerFloor, 0),
      ...this.config.items.map((item) => {
        const entry = rule.itemDrops.find((candidate) => candidate.itemId === item.id);
        return this.numberInput(`${item.name}出現率%`, `${prefix}.itemChance.${item.id}`, Math.round((entry?.chance ?? 0) * 100), 0, 100);
      }),
      "</div>",
    ].join("");
  }

  private renderTileSection(): string {
    const coreTileTypes = new Set(["wall", "floor", "stairs"]);
    return [
      '<fieldset><legend>タイル</legend>',
      ...Object.entries(this.config.tiles).map(([type, tile]) => [
        '<div class="config-group">',
        `<strong>${escapeHtml(type)}</strong>`,
        this.textInput("見た目", `tile.${type}.char`, tile.char, 1),
        this.colorInput("文字色", `tile.${type}.color`, tile.color),
        this.colorInput("背景色", `tile.${type}.background`, tile.background),
        this.checkboxInput("通行不可", `tile.${type}.blocksMovement`, tile.blocksMovement),
        !coreTileTypes.has(type)
          ? this.numberInput("散布率%", `tile.${type}.scatterRate`, Math.round((tile.scatterRate ?? 0) * 100), 0, 100)
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
      ...Object.entries(messageTemplates).map(([key, value]) => (
        this.textInput(key, `message.${key}`, value)
      )),
      "</fieldset>",
    ].join("");
  }

  private renderProjectSection(): string {
    const project = this.projectJson();
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
      `<input type="hidden" name="project.original" value="${escapeHtml(project)}" />`,
      `<label><span>JSON preview</span><textarea name="project.json" rows="8">${escapeHtml(project)}</textarea></label>`,
      "</fieldset>",
    ].join("");
  }

  private handleClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.dataset.action === "new-project") {
      void this.newProject();
      return;
    }

    if (target.dataset.action === "open-project") {
      void this.openProject();
      return;
    }

    if (target.dataset.action === "reset-default-config") {
      void this.resetToDefaultProject();
      return;
    }

    if (target.dataset.action === "save-project") {
      const form = target.closest("form");
      if (form instanceof HTMLFormElement) {
        this.applyFormConfig(new FormData(form));
        void this.saveProject();
      }
      return;
    }

    if (target.dataset.action === "save-project-as") {
      const form = target.closest("form");
      if (form instanceof HTMLFormElement) {
        this.applyFormConfig(new FormData(form));
        void this.saveProjectAs();
      }
    }
  }

  private handleChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;
    if (target.name.startsWith("project.")) return;

    void this.markDirty();
  }

  /** フォーム送信時にフォーム値またはJSON previewから設定を反映する。 */
  private handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    const formData = new FormData(form);
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
        const prefix = `enemy.${enemy.id}`;
        enemy.name = this.stringValue(formData, `${prefix}.name`, enemy.name);
        enemy.char = this.charValue(formData, `${prefix}.char`, enemy.char);
        enemy.color = this.stringValue(formData, `${prefix}.color`, enemy.color);
        enemy.maxHp = this.numberValue(formData, `${prefix}.maxHp`, enemy.maxHp);
        enemy.attackPower = this.numberValue(formData, `${prefix}.attackPower`, enemy.attackPower);
        enemy.expValue = this.numberValue(formData, `${prefix}.expValue`, enemy.expValue);
        enemy.aiId = this.stringValue(formData, `${prefix}.aiId`, enemy.aiId);
        return enemy;
      });

    const id = this.idValue(formData, "newEnemy.id");
    if (id && !this.config.enemies.some((enemy) => enemy.id === id)) {
      this.config.enemies.push({
        id,
        name: this.stringValue(formData, "newEnemy.name", id),
        char: this.charValue(formData, "newEnemy.char", "e"),
        color: this.stringValue(formData, "newEnemy.color", "#ffffff"),
        maxHp: this.numberValue(formData, "newEnemy.maxHp", 8),
        attackPower: this.numberValue(formData, "newEnemy.attackPower", 2),
        expValue: this.numberValue(formData, "newEnemy.expValue", 4),
        aiId: this.stringValue(formData, "newEnemy.aiId", "chase"),
      });
      this.addEnemyToFloorRules(id, this.numberValue(formData, "newEnemy.weight", 3));
    }
  }

  private applyItems(formData: FormData): void {
    this.config.items = this.config.items
      .filter((item) => formData.get(`item.${item.id}.delete`) !== "on")
      .map((item) => {
        const prefix = `item.${item.id}`;
        const effectId = this.stringValue(formData, `${prefix}.effectId`, item.effects[0]?.effectId ?? "heal");
        item.name = this.stringValue(formData, `${prefix}.name`, item.name);
        item.char = this.charValue(formData, `${prefix}.char`, item.char);
        item.color = this.stringValue(formData, `${prefix}.color`, item.color);
        item.effects = [this.createEffect(effectId, this.numberValue(formData, `${prefix}.amount`, 0))];
        return item;
      });

    const id = this.idValue(formData, "newItem.id");
    if (id && !this.config.items.some((item) => item.id === id)) {
      const effectId = this.stringValue(formData, "newItem.effectId", "heal");
      this.config.items.push({
        id,
        name: this.stringValue(formData, "newItem.name", id),
        char: this.charValue(formData, "newItem.char", "?"),
        color: this.stringValue(formData, "newItem.color", "#ffffff"),
        effects: [this.createEffect(effectId, this.numberValue(formData, "newItem.amount", 5))],
      });
      this.addItemToFloorRules(id, this.numberValue(formData, "newItem.chance", 35) / 100);
    }
  }

  private applyFloorRules(formData: FormData): void {
    this.config.floorRules.maxEnemies = this.numberValue(formData, "floorRules.maxEnemies", this.config.floorRules.maxEnemies);
    this.config.floorRules.maxItems = this.numberValue(formData, "floorRules.maxItems", this.config.floorRules.maxItems);

    for (const rule of this.config.floorRules.floors) {
      const prefix = `floor.${rule.id}`;
      rule.fromFloor = this.numberValue(formData, `${prefix}.fromFloor`, rule.fromFloor);
      const toFloor = this.numberValue(formData, `${prefix}.toFloor`, rule.toFloor ?? 0);
      rule.toFloor = toFloor > 0 ? toFloor : undefined;
      rule.enemyCount.min = this.numberValue(formData, `${prefix}.enemyMin`, rule.enemyCount.min);
      rule.enemyCount.max = Math.max(rule.enemyCount.min, this.numberValue(formData, `${prefix}.enemyMax`, rule.enemyCount.max));
      rule.enemyHpBonusPerFloor = this.numberValue(formData, `${prefix}.hpBonus`, rule.enemyHpBonusPerFloor);
      rule.enemyAttackBonusPerFloor = this.numberValue(formData, `${prefix}.attackBonus`, rule.enemyAttackBonusPerFloor);
      rule.itemDrops = this.config.items
        .map((item) => {
          const current = rule.itemDrops.find((entry) => entry.itemId === item.id);
          return {
            itemId: item.id,
            chance: this.numberValue(formData, `${prefix}.itemChance.${item.id}`, Math.round((current?.chance ?? 0) * 100)) / 100,
          };
        })
        .filter((entry) => entry.chance > 0);
    }
  }

  /** 敵セクションで編集した出現重みをフロアルールへ反映する。applyFloorRules の後に呼ぶ。 */
  private applyEnemyWeights(formData: FormData): void {
    for (const rule of this.config.floorRules.floors) {
      rule.enemyTable = this.config.enemies
        .map((enemy) => {
          const current = rule.enemyTable.find((e) => e.enemyId === enemy.id);
          const weight = this.numberValue(
            formData,
            `enemy.${enemy.id}.weight.${rule.id}`,
            current?.weight ?? 0,
          );
          return { enemyId: enemy.id, weight };
        })
        .filter((entry) => entry.weight > 0);
    }
  }

  /** 新規追加した敵を全階層ルールへ初期登録する。 */
  private addEnemyToFloorRules(enemyId: string, weight: number): void {
    if (weight <= 0) return;

    for (const rule of this.config.floorRules.floors) {
      if (!rule.enemyTable.some((entry) => entry.enemyId === enemyId)) {
        rule.enemyTable.push({ enemyId, weight });
      }
    }
  }

  /** 新規追加したアイテムを全階層ルールへ初期登録する。 */
  private addItemToFloorRules(itemId: string, chance: number): void {
    if (chance <= 0) return;

    for (const rule of this.config.floorRules.floors) {
      if (!rule.itemDrops.some((entry) => entry.itemId === itemId)) {
        rule.itemDrops.push({ itemId, chance });
      }
    }
  }

  private applyTiles(formData: FormData): void {
    const coreTileTypes = new Set(["wall", "floor", "stairs"]);
    for (const [type, tile] of Object.entries(this.config.tiles)) {
      tile.char = this.charValue(formData, `tile.${type}.char`, tile.char);
      tile.color = this.stringValue(formData, `tile.${type}.color`, tile.color);
      tile.background = this.stringValue(formData, `tile.${type}.background`, tile.background);
      tile.blocksMovement = formData.get(`tile.${type}.blocksMovement`) === "on";
      if (!coreTileTypes.has(type)) {
        tile.scatterRate = this.numberValue(formData, `tile.${type}.scatterRate`, Math.round((tile.scatterRate ?? 0) * 100)) / 100;
      }
    }

    const id = this.idValue(formData, "newTile.id");
    if (id && !this.config.tiles[id]) {
      this.config.tiles[id] = {
        type: id,
        char: this.charValue(formData, "newTile.char", "?"),
        color: this.stringValue(formData, "newTile.color", "#ffffff"),
        background: this.stringValue(formData, "newTile.background", "#000000"),
        blocksMovement: formData.get("newTile.blocksMovement") === "on",
        scatterRate: this.numberValue(formData, "newTile.scatterRate", 0) / 100,
      };
    }
  }

  private applyMessages(formData: FormData): void {
    for (const key of Object.keys(messageTemplates) as MessageKey[]) {
      messageTemplates[key] = this.stringValue(formData, `message.${key}`, messageTemplates[key]);
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

  private createEffect(effectId: string, amount: number): ItemDefinition["effects"][number] {
    return effectId === "equipWeapon"
      ? { effectId, params: { atk: amount } }
      : { effectId, params: { amount } };
  }

  private effectValue(effectId: string, params: Record<string, number | string | boolean>): number {
    const key = effectId === "equipWeapon" ? "atk" : "amount";
    const value = params[key];
    return typeof value === "number" ? value : 0;
  }

  private numberInput(label: string, name: string, value: number, min: number, max?: number): string {
    const maxAttribute = max === undefined ? "" : ` max="${max}"`;
    return `<label><span>${escapeHtml(label)}</span><input type="number" name="${escapeHtml(name)}" value="${value}" min="${min}" step="any"${maxAttribute} /></label>`;
  }

  private textInput(label: string, name: string, value: string, maxLength?: number): string {
    const maxLengthAttribute = maxLength === undefined ? "" : ` maxlength="${maxLength}"`;
    return `<label><span>${escapeHtml(label)}</span><input type="text" name="${escapeHtml(name)}" value="${escapeHtml(value)}"${maxLengthAttribute} /></label>`;
  }

  private colorInput(label: string, name: string, value: string): string {
    return `<label><span>${escapeHtml(label)}</span><input type="color" name="${escapeHtml(name)}" value="${escapeHtml(value)}" /></label>`;
  }

  private checkboxInput(label: string, name: string, checked: boolean): string {
    return `<label><span>${escapeHtml(label)}</span><input type="checkbox" name="${escapeHtml(name)}"${checked ? " checked" : ""} /></label>`;
  }

  private selectInput(label: string, name: string, value: string, options: string[]): string {
    const optionHtml = options
      .map((option) => `<option value="${escapeHtml(option)}"${option === value ? " selected" : ""}>${escapeHtml(option)}</option>`)
      .join("");
    return `<label><span>${escapeHtml(label)}</span><select name="${escapeHtml(name)}">${optionHtml}</select></label>`;
  }

  private numberValue(formData: FormData, name: string, fallback: number): number {
    const raw = formData.get(name);
    if (raw === null) return fallback;
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  }

  private stringValue(formData: FormData, name: string, fallback: string): string {
    const value = formData.get(name);
    return typeof value === "string" && value.length > 0 ? value : fallback;
  }

  private charValue(formData: FormData, name: string, fallback: string): string {
    return this.stringValue(formData, name, fallback).slice(0, 1) || fallback;
  }

  private idValue(formData: FormData, name: string): string {
    const value = this.stringValue(formData, name, "").trim();
    return /^[a-zA-Z0-9_-]+$/.test(value) ? value : "";
  }

  private interpolate(template: string, values: Record<string, string | number>): string {
    return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => (
      values[key] === undefined ? match : String(values[key])
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

    const result = await this.storage.openProject();
    if (result.canceled) return;
    if (result.error || !result.json) {
      this.updateProjectStatus(result.error ?? "プロジェクトを読み込めませんでした。");
      this.render();
      return;
    }

    if (!this.importProject(result.json)) {
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
    const result = await this.storage.saveProject(this.projectJson());
    this.handleSaveResult(result, "プロジェクトを保存しました。");
  }

  private async saveProjectAs(): Promise<void> {
    const result = await this.storage.saveProjectAs(this.projectJson());
    this.handleSaveResult(result, "名前を付けて保存しました。");
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
  private importProject(json: string): boolean {
    try {
      const parsed = JSON.parse(json) as Partial<GameConfig> & {
        messageTemplates?: Partial<Record<MessageKey, string>>;
        schemaVersion?: number;
      };
      if (typeof parsed !== "object" || parsed === null) {
        return false;
      }
      const version = parsed.schemaVersion;
      if (typeof version !== "number" || version > projectSchemaVersion) {
        return false;
      }
      if (parsed.player) Object.assign(this.config.player, parsed.player);
      if (parsed.dungeon) Object.assign(this.config.dungeon, parsed.dungeon);
      if (parsed.tiles) this.config.tiles = parsed.tiles;
      if (parsed.enemies) this.config.enemies = parsed.enemies;
      if (parsed.items) this.config.items = parsed.items;
      if (parsed.floorRules) this.config.floorRules = parsed.floorRules;
      if (parsed.render) Object.assign(this.config.render, parsed.render);
      if (parsed.fov) Object.assign(this.config.fov, parsed.fov);
      if (parsed.progression) Object.assign(this.config.progression, parsed.progression);
      if (parsed.messageTemplates) Object.assign(messageTemplates, parsed.messageTemplates);
      if (version < projectSchemaVersion) {
        this.migrateFloorRuleCoverage();
      }
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
      return;
    }

    this.projectStatus = this.projectInfo.isDirty ? "未保存の変更があります。" : "保存済みです。";
  }

  private async markDirty(message?: string): Promise<void> {
    this.projectInfo = await this.storage.setDirty(true);
    this.updateProjectStatus(message ?? "未保存の変更があります。");
    this.updateProjectStatusElement();
  }

  private handleSaveResult(result: { canceled: boolean; filePath?: string | null; error?: string }, successMessage: string): void {
    if (result.canceled) return;

    if (result.error) {
      this.updateProjectStatus(result.error);
      this.render();
      return;
    }

    this.projectInfo = {
      filePath: result.filePath ?? null,
      isDirty: false,
    };
    this.updateProjectStatus(successMessage);
    this.render();
  }

  private confirmDiscardUnsaved(message: string): boolean {
    return !this.projectInfo.isDirty || window.confirm(message);
  }

  private updateProjectStatusElement(): void {
    const element = this.root.querySelector(".project-status");
    if (element) {
      element.textContent = this.projectStatus;
    }
  }

  private basename(filePath: string): string {
    return filePath.split(/[\\/]/).pop() ?? filePath;
  }

  /** 旧バージョンの JSON を読み込んだ時に、全敵・アイテムを階層ルールへ補完する。 */
  private migrateFloorRuleCoverage(): void {
    for (const enemy of this.config.enemies) {
      this.addEnemyToFloorRules(enemy.id, 1);
    }

    for (const item of this.config.items) {
      this.addItemToFloorRules(item.id, 0.25);
    }
  }

  /** 敵設定のマウントポイントにスクリプトエディタを生成して挿入する。 */
  private mountScriptEditors(): void {
    this.scriptEditors = [];
    const mounts = this.root.querySelectorAll<HTMLElement>(".script-editor-mount");
    for (const mount of mounts) {
      const target = mount.dataset.scriptTarget;
      const enemyId = mount.dataset.enemyId;

      if (target === "enemy-ai" && enemyId) {
        const enemy = this.config.enemies.find((e) => e.id === enemyId);
        if (!enemy) continue;
        const script = enemy.aiScript ?? this.defaultAiScript(enemy.aiId);
        const editor = new ScriptEditor(mount, script, () => {
          enemy.aiScript = editor.getScript();
          void this.markDirty();
        });
        this.scriptEditors.push(editor);
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
