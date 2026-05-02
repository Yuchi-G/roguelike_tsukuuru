import { getBlockingEntityAt } from "../map/Collision";
import type { Actor, Entity } from "./Entity";
import { escapeHtml } from "../utils/escapeHtml";
import { Fov } from "../map/Fov";
import { InputManager, type Direction } from "../input/InputManager";
import { createDefaultAiRegistry, type AiRegistry } from "../registry/AiRegistry";
import { createDefaultItemEffectRegistry, type ItemEffectRegistry } from "../registry/ItemEffectRegistry";
import { Logger } from "../utils/Logger";
import type { GameMap } from "../map/Map";
import { Renderer } from "../rendering/Renderer";
import { ScriptInterpreter, VariableStore } from "../script/ScriptInterpreter";
import { Tile } from "../map/Tile";
import { runEnemyTurn } from "./TurnManager";
import type { GameConfig } from "./GameConfig";
import type { Enemy } from "../../game/Enemy";
import type { Item } from "../../game/Item";
import type { BagItem, Player } from "../../game/Player";

/**
 * ローグライクの1プレイ中の状態を持つクラス。
 * ここでは「プレイヤーが行動する → 敵が行動する → 画面を更新する」という流れを管理する。
 */
export class Game {
  public map!: GameMap;
  public player!: Player;
  public enemies: Enemy[] = [];
  public items: Item[] = [];
  public fov: Fov;
  public logger = new Logger();
  public isGameOver = false;
  public floor = 1;
  public aiRegistry: AiRegistry;
  public itemEffectRegistry: ItemEffectRegistry;
  public scriptVariables = new VariableStore();
  public scriptInterpreter = new ScriptInterpreter(this.scriptVariables);

  private renderer: Renderer;
  private input = new InputManager();
  private isBagOpen = false;
  private pendingBagItem: BagItem | null = null;
  private onOpenConfig: (() => void) | null = null;
  private onQuitGame: (() => void) | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    private mapOverlayElement: HTMLElement,
    private statusElement: HTMLElement,
    private logElement: HTMLElement,
    public config: GameConfig,
  ) {
    this.fov = new Fov(config.fov.radius);
    this.aiRegistry = createDefaultAiRegistry();
    this.itemEffectRegistry = createDefaultItemEffectRegistry();
    this.renderer = new Renderer(canvas, config.render);
    this.input.setEnabled(false);
    this.input.setMoveHandler((direction) => this.handlePlayerMoveInput(direction));
    this.input.setUseItemHandler(() => this.openBagForUse());
    this.statusElement.addEventListener("click", (event) => this.handleStatusPanelClick(event));
    this.mapOverlayElement.addEventListener("click", (event) => this.handleStatusPanelClick(event));
  }

  /** ゲームオーバー中だけEnterで新しいゲームを開始する。 */
  setRestartHandler(restartHandler: () => void): void {
    this.input.setRestartHandler(() => {
      if (this.isGameOver) {
        restartHandler();
      }
    });
  }

  /** 通常プレイ中の決定アクション。現在は階段を使うために利用する。 */
  setActionHandler(floorActionHandler: () => void): void {
    this.input.setActionHandler(() => {
      if (!this.isGameOver) {
        floorActionHandler();
      }
    });
  }

  /** プレイ中に設定画面へ戻る処理を登録する。 */
  setOpenConfigHandler(openConfigHandler: () => void): void {
    this.onOpenConfig = openConfigHandler;
  }

  /** 現在のゲームを破棄して設定画面へ戻る処理を登録する。 */
  setQuitGameHandler(quitGameHandler: () => void): void {
    this.onQuitGame = quitGameHandler;
  }

  /** 新しい階層を開始し、マップ・エンティティ・視界・ログを初期化する。 */
  startDungeonFloor(map: GameMap, player: Player, enemies: Enemy[], items: Item[], floor = 1): void {
    this.map = map;
    this.player = player;
    this.enemies = enemies;
    this.items = items;
    this.floor = floor;
    this.fov = new Fov(this.config.fov.radius);
    this.logger = new Logger();
    this.isGameOver = false;
    this.pendingBagItem = null;
    this.input.setEnabled(true);
    this.renderer.resizeToMap(map);
    this.logger.add(this.config.messages.floorArrive(this.floor));
    this.config.hooks?.onFloorChange?.({ game: this, floor: this.floor });
    this.renderGameState();
  }

  /** ゲームを未開始状態に戻す。設定画面に戻る時に使う。 */
  resetToUnstarted(): void {
    this.enemies = [];
    this.items = [];
    this.logger = new Logger();
    this.isGameOver = false;
    this.pendingBagItem = null;
    this.input.setEnabled(false);
    this.renderer.clearCanvas();
    this.statusElement.innerHTML = "";
    this.logElement.innerHTML = "";
    this.mapOverlayElement.classList.remove("is-open");
    this.mapOverlayElement.innerHTML = "";
  }

  /** プレイ中に設定画面を開く際、入力を一時停止する。 */
  pauseForConfig(): void {
    this.input.setEnabled(false);
  }

  /** 設定変更後にゲームを再開し、変更を反映する。 */
  resumeAfterConfigChange(): void {
    this.input.setEnabled(!this.isGameOver);
    this.fov = new Fov(this.config.fov.radius);
    this.applyPlayerConfigToCurrentPlayer();
    if (this.map) {
      this.applyTileConfigToCurrentMap();
      this.renderer.resizeToMap(this.map);
      this.renderGameState();
    }
  }

  /** 階段移動の判定。プレイヤーが階段タイルの上にいる時だけ次の階へ進める。 */
  isPlayerOnStairs(): boolean {
    return this.map.getTile(this.player.x, this.player.y).type === "stairs";
  }

  /** 描画や衝突判定で使う、現在存在する全エンティティの一覧。 */
  get entities(): Entity[] {
    return [this.player, ...this.items, ...this.enemies];
  }

  /** 壁またはブロッキングエンティティがあれば移動せず false を返す。 */
  tryMoveActorByDelta(actor: Actor, deltaX: number, deltaY: number): boolean {
    const destinationX = actor.x + deltaX;
    const destinationY = actor.y + deltaY;

    if (!this.map.isWalkable(destinationX, destinationY)) {
      return false;
    }

    if (getBlockingEntityAt(this.entities.filter((entity) => entity !== actor), destinationX, destinationY)) {
      return false;
    }

    actor.x = destinationX;
    actor.y = destinationY;
    return true;
  }

  /** 攻撃力から防御力を引いたダメージを与え、倒した場合は経験値を加算して敵リストから除く。 */
  attack(attacker: Actor, defender: Actor): void {
    const attackPower = attacker.id === this.player.id ? this.player.getAttack() : attacker.attackPower;
    const damage = Math.max(0, attackPower - defender.defense);
    defender.damage(damage);
    this.logger.add(this.config.messages.attack(attacker, defender, damage));
    this.config.hooks?.onAttack?.({ game: this, attacker, defender, damage });

    if (defender.isDead) {
      const defeatedEnemy = this.enemies.find((enemy) => enemy.id === defender.id);
      if (defeatedEnemy && attacker.id === this.player.id) {
        this.player.exp += defeatedEnemy.expValue;
        this.logger.add(this.config.messages.defeatWithExp(defeatedEnemy.name, defeatedEnemy.expValue));
        this.applyPendingLevelUps();
      } else {
        this.logger.add(this.config.messages.defeat(defender.name));
      }

      this.config.hooks?.onDeath?.({ game: this, actor: defender });

      this.enemies = this.enemies.filter((enemy) => enemy.id !== defender.id);

      if (defender.id === this.player.id) {
        this.triggerGameOver();
      }
    }
  }

  /** プレイヤーが足元のアイテムを拾う処理。 */
  pickupItemAtPlayerPosition(): void {
    const itemAtPlayerPosition = this.items.find((candidate) => candidate.x === this.player.x && candidate.y === this.player.y);
    if (!itemAtPlayerPosition) return;

    itemAtPlayerPosition.onPickup(this.player, this);
    this.config.hooks?.onPickup?.({ game: this, itemName: itemAtPlayerPosition.name });
    this.items = this.items.filter((candidate) => candidate.id !== itemAtPlayerPosition.id);
  }

  /** バッグへ入るアイテムを拾う。満杯ならUIで入れ替え判断を待つ。 */
  offerBagItem(item: BagItem): void {
    if (this.player.addItem(item)) {
      this.logger.add(this.config.messages.pickupToBag(item.name));
      return;
    }

    this.pendingBagItem = item;
    this.logger.add(this.config.messages.bagFull(item.name));
  }

  /** ゲーム状態を画面とUIへ反映する。 */
  renderGameState(): void {
    this.fov.compute(this.map, this.player.x, this.player.y);
    this.renderer.renderDungeonFrame(this.map, this.entities, this.fov, this.isGameOver);
    this.renderStatusPanel();
    this.renderPendingBagItemOverlay();
  }

  /** プレイヤー死亡時のゲームオーバー処理。 */
  triggerGameOver(): void {
    this.isGameOver = true;
    this.input.setEnabled(false);
    this.logger.add(this.config.messages.gameOver());
    this.logger.add(this.config.messages.restart());
    this.config.hooks?.onGameOver?.({ game: this });
  }

  /**
   * プレイヤーの移動入力を処理する。
   * 敵がいれば攻撃、空きマスなら移動し、その後に敵ターンを実行する。
   */
  private handlePlayerMoveInput(direction: Direction): void {
    if (this.isGameOver) return;
    if (this.pendingBagItem) {
      this.logger.add(this.config.messages.blockedByBagChoice());
      this.renderGameState();
      return;
    }

    const destinationX = this.player.x + direction.dx;
    const destinationY = this.player.y + direction.dy;
    const enemyAtDestination = this.enemies.find((candidate) => candidate.x === destinationX && candidate.y === destinationY);

    if (enemyAtDestination) {
      this.attack(this.player, enemyAtDestination);
    } else if (this.tryMoveActorByDelta(this.player, direction.dx, direction.dy)) {
      this.pickupItemAtPlayerPosition();
      if (this.pendingBagItem) {
        this.renderGameState();
        return;
      }
    } else {
      this.logger.add(this.config.messages.blockedByWall());
      this.renderGameState();
      return;
    }

    this.finishPlayerTurn();
  }

  /** HPや階層、ログなどのHTML UIを更新する。 */
  private renderStatusPanel(): void {
    this.statusElement.innerHTML = [
      this.renderStatusRow("LV", `${this.player.level}`),
      this.renderStatusRow("EXP", `${this.player.exp}/${this.player.nextLevelExp}`),
      this.renderStatusRow("HP", `${this.player.hp}/${this.player.maxHp}`),
      this.renderStatusRow("攻撃力", `${this.player.getAttack()}`),
      this.renderStatusRow("武器", this.player.weapon ? `+${this.player.weapon.atk}` : "なし"),
      this.renderStatusRow("バッグ", `${this.player.itemBag.length}/${this.player.maxBagItems}`),
      this.renderBagControls(),
      this.isBagOpen ? this.renderBagContents() : "",
      this.renderStatusRow("階層", `${this.floor}階`),
      this.renderStatusRow("操作", this.isGameOver ? "Enter: 再開" : "矢印 / WASD / Space / H"),
      '<button class="status-command" type="button" data-action="open-config">設定値を変更</button>',
      '<button class="status-command danger" type="button" data-action="quit-game">ゲームをやめる</button>',
      this.isGameOver ? '<div class="game-over">GAME OVER<br />Press Enter</div>' : "",
    ].join("");

    this.logElement.innerHTML = this.logger
      .all()
      .map((message) => `<li>${escapeHtml(message)}</li>`)
      .join("");
  }

  private renderStatusRow(label: string, value: string): string {
    return `<div class="status-row"><span>${label}</span><strong>${value}</strong></div>`;
  }

  /** 設定変更後に、現在のマップのタイル見た目を新しい設定で上書きする。 */
  private applyTileConfigToCurrentMap(): void {
    for (let i = 0; i < this.map.tiles.length; i += 1) {
      const tileType = this.map.tiles[i].type;
      this.map.tiles[i] = Tile.fromDefinition(this.config.tiles[tileType]);
    }
  }

  /** 設定変更後に、プレイヤーのステータスを新しい設定基準で再計算する。 */
  private applyPlayerConfigToCurrentPlayer(): void {
    const gainedLevels = Math.max(0, this.player.level - this.config.player.level);
    const previousMaxHp = this.player.maxHp;
    const nextMaxHp = Math.max(1, Math.round(this.config.player.hp + gainedLevels * this.config.progression.hpGainPerLevel));
    const hpDelta = nextMaxHp - previousMaxHp;
    this.player.maxHp = nextMaxHp;
    this.player.hp = Math.min(this.player.maxHp, Math.max(0, Math.round(this.player.hp + hpDelta)));
    this.player.attackPower = Math.max(0, Math.round(this.config.player.attackPower + gainedLevels * this.config.progression.attackGainPerLevel));
  }

  private renderBagControls(): string {
    return [
      '<div class="bag-actions">',
      '<button type="button" data-action="open-bag-for-use">使う</button>',
      `<button type="button" data-action="toggle-bag">${this.isBagOpen ? "閉じる" : "中身を見る"}</button>`,
      "</div>",
    ].join("");
  }

  private renderBagContents(): string {
    const bagItemsHtml = this.player.itemBag.length > 0
      ? this.player.itemBag.map((item, index) => [
        "<li>",
        `<span>${escapeHtml(item.name)} ${escapeHtml(item.description)}</span>`,
        `<button type="button" data-action="use-bag-item" data-index="${index}">使う</button>`,
        "</li>",
      ].join("")).join("")
      : "<li>空</li>";

    return `<div class="bag-contents"><strong>バッグ</strong><ul>${bagItemsHtml}</ul></div>`;
  }

  private renderFullBagChoiceOverlay(): string {
    if (!this.pendingBagItem) {
      return "";
    }

    const dropOptionItemsHtml = this.player.itemBag
      .map((item, index) => [
        '<li>',
        `<span>${escapeHtml(item.name)} ${escapeHtml(item.description)}</span>`,
        `<button type="button" data-action="replace-bag-item" data-index="${index}">これを捨てる</button>`,
        "</li>",
      ].join(""))
      .join("");

    return [
      '<div class="bag-choice">',
      `<strong>${escapeHtml(this.pendingBagItem.name)}を拾う？</strong>`,
      '<p>拾う場合は、捨てるアイテムを選んでください。</p>',
      `<ul>${dropOptionItemsHtml}</ul>`,
      '<button type="button" data-action="discard-picked-item">拾わず捨てる</button>',
      "</div>",
    ].join("");
  }

  private renderPendingBagItemOverlay(): void {
    if (!this.pendingBagItem) {
      this.mapOverlayElement.classList.remove("is-open");
      this.mapOverlayElement.innerHTML = "";
      return;
    }

    this.mapOverlayElement.classList.add("is-open");
    this.mapOverlayElement.innerHTML = this.renderFullBagChoiceOverlay();
  }

  /** ステータスパネルとマップオーバーレイのボタンクリックを処理する。 */
  private handleStatusPanelClick(event: MouseEvent): void {
    const clickedElement = event.target;
    if (!(clickedElement instanceof HTMLElement)) return;

    const statusPanelAction = clickedElement.dataset.action;
    if (statusPanelAction === "open-bag-for-use") {
      this.openBagForUse();
      return;
    }

    if (statusPanelAction === "open-config") {
      this.onOpenConfig?.();
      return;
    }

    if (statusPanelAction === "quit-game") {
      this.onQuitGame?.();
      return;
    }

    if (statusPanelAction === "toggle-bag") {
      this.isBagOpen = !this.isBagOpen;
      this.renderGameState();
      return;
    }

    if (statusPanelAction === "replace-bag-item") {
      this.replaceBagItem(Number(clickedElement.dataset.index));
      return;
    }

    if (statusPanelAction === "use-bag-item") {
      this.useBagItem(Number(clickedElement.dataset.index));
      return;
    }

    if (statusPanelAction === "discard-picked-item") {
      this.discardPendingBagItem();
    }
  }

  /** バッグを開いて使用するアイテムを選べる状態にする。 */
  private openBagForUse(): void {
    if (this.isGameOver) return;
    if (this.pendingBagItem) {
      this.logger.add(this.config.messages.blockedByBagChoice());
      this.renderGameState();
      return;
    }

    if (this.player.itemBag.length === 0) {
      this.logger.add(this.config.messages.noUsableItem());
    } else {
      this.isBagOpen = true;
    }

    this.renderGameState();
  }

  /** バッグ内で選択したアイテムを使う。 */
  private useBagItem(index: number): void {
    if (this.isGameOver) return;
    if (this.pendingBagItem) {
      this.logger.add(this.config.messages.blockedByBagChoice());
      this.renderGameState();
      return;
    }

    const bagItemToUse = this.player.takeBagItemAt(index);
    if (!bagItemToUse) {
      this.logger.add(this.config.messages.noUsableItem());
      this.renderGameState();
      return;
    }

    if (bagItemToUse.useScript) {
      this.scriptInterpreter.run(bagItemToUse.useScript, { game: this, self: this.player });
    } else {
      this.itemEffectRegistry.run(bagItemToUse.effectId, {
        game: this,
        player: this.player,
        itemName: bagItemToUse.name,
        params: bagItemToUse.params,
        source: "use",
      });
    }
    this.renderGameState();
  }

  /** バッグ満杯時に既存アイテムを捨てて新しいアイテムに入れ替える。 */
  private replaceBagItem(dropIndex: number): void {
    if (!this.pendingBagItem) return;

    const pickedBagItem = this.pendingBagItem;
    const droppedBagItem = this.player.replaceItemAt(dropIndex, pickedBagItem);
    if (!droppedBagItem) {
      this.logger.add(this.config.messages.invalidBagSelection());
      this.renderGameState();
      return;
    }

    this.pendingBagItem = null;
    this.logger.add(this.config.messages.bagItemReplaced(pickedBagItem.name, droppedBagItem.name));
    this.finishPlayerTurn();
  }

  /** バッグ満杯時に拾ったアイテムを捨てる。 */
  private discardPendingBagItem(): void {
    if (!this.pendingBagItem) return;

    const discardedPendingBagItem = this.pendingBagItem;
    this.pendingBagItem = null;
    this.logger.add(this.config.messages.pickedItemDiscarded(discardedPendingBagItem.name));
    this.finishPlayerTurn();
  }

  /** プレイヤーの行動後に敵ターンを実行し、画面を更新する。 */
  private finishPlayerTurn(): void {
    if (!this.isGameOver) {
      runEnemyTurn(this);
      this.applyPendingLevelUps();
    }

    this.renderGameState();
  }

  /** ターンごとのレベルアップ判定とログ出力。 */
  private applyPendingLevelUps(): void {
    const completedLevelUps = this.player.checkLevelUp(
      this.config.progression.nextLevelMultiplier,
      this.config.progression.hpGainPerLevel,
      this.config.progression.attackGainPerLevel,
    );
    for (let levelUpIndex = 0; levelUpIndex < completedLevelUps; levelUpIndex += 1) {
      this.logger.add(this.config.messages.levelUp(this.player.level - completedLevelUps + levelUpIndex + 1));
    }
  }
}
