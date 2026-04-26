import type { EnemyDefinition, GameConfig, ItemDefinition } from "./GameConfig";
import type { TileType } from "./Tile";

export class ConfigPanel {
  constructor(
    private root: HTMLElement,
    private config: GameConfig,
    private onApply: () => void,
  ) {
    this.render();
    this.root.addEventListener("submit", (event) => this.handleSubmit(event));
  }

  private render(): void {
    this.root.innerHTML = [
      '<form class="config-form">',
      this.renderPlayerSection(),
      this.renderDungeonSection(),
      this.renderEnemySection(),
      this.renderItemSection(),
      this.renderTileSection(),
      '<button class="config-apply" type="submit">設定を反映</button>',
      "</form>",
    ].join("");
  }

  private renderPlayerSection(): string {
    return [
      '<fieldset><legend>プレイヤー</legend>',
      this.numberInput("初期HP", "player.hp", this.config.player.hp, 1),
      this.numberInput("攻撃力", "player.attackPower", this.config.player.attackPower, 0),
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

  private renderEnemySection(): string {
    return [
      '<fieldset><legend>敵</legend>',
      ...this.config.enemies.map((enemy) => this.renderEnemy(enemy)),
      "</fieldset>",
    ].join("");
  }

  private renderEnemy(enemy: EnemyDefinition): string {
    const prefix = `enemy.${enemy.id}`;
    return [
      '<div class="config-group">',
      `<strong>${enemy.name}</strong>`,
      this.textInput("名前", `${prefix}.name`, enemy.name),
      this.textInput("見た目", `${prefix}.char`, enemy.char, 1),
      this.colorInput("色", `${prefix}.color`, enemy.color),
      this.numberInput("HP", `${prefix}.maxHp`, enemy.maxHp, 1),
      this.numberInput("攻撃", `${prefix}.attackPower`, enemy.attackPower, 0),
      this.numberInput("EXP", `${prefix}.expValue`, enemy.expValue, 0),
      "</div>",
    ].join("");
  }

  private renderItemSection(): string {
    return [
      '<fieldset><legend>アイテム</legend>',
      ...this.config.items.map((item) => this.renderItem(item)),
      ...this.config.floorRules.itemDrops.map((drop) => {
        const item = this.config.items.find((candidate) => candidate.id === drop.itemId);
        return this.numberInput(`${item?.name ?? drop.itemId}出現率`, `drop.${drop.itemId}.chance`, Math.round(drop.chance * 100), 0, 100);
      }),
      "</fieldset>",
    ].join("");
  }

  private renderItem(item: ItemDefinition): string {
    const prefix = `item.${item.id}`;
    return [
      '<div class="config-group">',
      `<strong>${item.name}</strong>`,
      this.textInput("名前", `${prefix}.name`, item.name),
      this.textInput("見た目", `${prefix}.char`, item.char, 1),
      this.colorInput("色", `${prefix}.color`, item.color),
      item.healAmount !== undefined ? this.numberInput("回復量", `${prefix}.healAmount`, item.healAmount, 0) : "",
      item.equipment ? this.numberInput("武器ATK", `${prefix}.equipment.atk`, item.equipment.atk, 0) : "",
      "</div>",
    ].join("");
  }

  private renderTileSection(): string {
    const tileTypes: TileType[] = ["wall", "floor", "stairs"];
    return [
      '<fieldset><legend>タイル</legend>',
      ...tileTypes.map((type) => {
        const tile = this.config.tiles[type];
        return [
          '<div class="config-group">',
          `<strong>${type}</strong>`,
          this.textInput("見た目", `tile.${type}.char`, tile.char, 1),
          this.colorInput("文字色", `tile.${type}.color`, tile.color),
          this.colorInput("背景色", `tile.${type}.background`, tile.background),
          "</div>",
        ].join("");
      }),
      "</fieldset>",
    ].join("");
  }

  private handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    const formData = new FormData(form);
    this.applyPlayer(formData);
    this.applyDungeon(formData);
    this.applyEnemies(formData);
    this.applyItems(formData);
    this.applyTiles(formData);
    this.onApply();
    this.render();
  }

  private applyPlayer(formData: FormData): void {
    this.config.player.hp = this.numberValue(formData, "player.hp", this.config.player.hp);
    this.config.player.attackPower = this.numberValue(formData, "player.attackPower", this.config.player.attackPower);
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

  private applyEnemies(formData: FormData): void {
    for (const enemy of this.config.enemies) {
      const prefix = `enemy.${enemy.id}`;
      enemy.name = this.stringValue(formData, `${prefix}.name`, enemy.name);
      enemy.char = this.stringValue(formData, `${prefix}.char`, enemy.char).slice(0, 1) || enemy.char;
      enemy.color = this.stringValue(formData, `${prefix}.color`, enemy.color);
      enemy.maxHp = this.numberValue(formData, `${prefix}.maxHp`, enemy.maxHp);
      enemy.attackPower = this.numberValue(formData, `${prefix}.attackPower`, enemy.attackPower);
      enemy.expValue = this.numberValue(formData, `${prefix}.expValue`, enemy.expValue);
    }
  }

  private applyItems(formData: FormData): void {
    for (const item of this.config.items) {
      const prefix = `item.${item.id}`;
      item.name = this.stringValue(formData, `${prefix}.name`, item.name);
      item.char = this.stringValue(formData, `${prefix}.char`, item.char).slice(0, 1) || item.char;
      item.color = this.stringValue(formData, `${prefix}.color`, item.color);
      if (item.healAmount !== undefined) {
        item.healAmount = this.numberValue(formData, `${prefix}.healAmount`, item.healAmount);
      }
      if (item.equipment) {
        item.equipment.atk = this.numberValue(formData, `${prefix}.equipment.atk`, item.equipment.atk);
      }
    }

    for (const drop of this.config.floorRules.itemDrops) {
      drop.chance = this.numberValue(formData, `drop.${drop.itemId}.chance`, Math.round(drop.chance * 100)) / 100;
    }
  }

  private applyTiles(formData: FormData): void {
    const tileTypes: TileType[] = ["wall", "floor", "stairs"];
    for (const type of tileTypes) {
      const tile = this.config.tiles[type];
      tile.char = this.stringValue(formData, `tile.${type}.char`, tile.char).slice(0, 1) || tile.char;
      tile.color = this.stringValue(formData, `tile.${type}.color`, tile.color);
      tile.background = this.stringValue(formData, `tile.${type}.background`, tile.background);
    }
  }

  private numberInput(label: string, name: string, value: number, min: number, max?: number): string {
    const maxAttribute = max === undefined ? "" : ` max="${max}"`;
    return `<label><span>${label}</span><input type="number" name="${name}" value="${value}" min="${min}"${maxAttribute} /></label>`;
  }

  private textInput(label: string, name: string, value: string, maxLength?: number): string {
    const maxLengthAttribute = maxLength === undefined ? "" : ` maxlength="${maxLength}"`;
    return `<label><span>${label}</span><input type="text" name="${name}" value="${value}"${maxLengthAttribute} /></label>`;
  }

  private colorInput(label: string, name: string, value: string): string {
    return `<label><span>${label}</span><input type="color" name="${name}" value="${value}" /></label>`;
  }

  private numberValue(formData: FormData, name: string, fallback: number): number {
    const value = Number(formData.get(name));
    return Number.isFinite(value) ? value : fallback;
  }

  private stringValue(formData: FormData, name: string, fallback: string): string {
    const value = formData.get(name);
    return typeof value === "string" && value.length > 0 ? value : fallback;
  }
}
