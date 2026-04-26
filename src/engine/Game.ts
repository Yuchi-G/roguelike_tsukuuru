/**
 * ゲーム全体の進行を管理する中心ファイル。
 * マップ、エンティティ、入力、ターン、描画、UI更新をここでつなぐ。
 */
import { Collision } from "./Collision";
import type { Actor, Entity } from "./Entity";
import { Fov } from "./Fov";
import { InputManager, type Direction } from "./InputManager";
import { Logger } from "./Logger";
import type { GameMap } from "./Map";
import { Renderer } from "./Renderer";
import { TurnManager } from "./TurnManager";
import type { GameConfig } from "./GameConfig";
import type { Enemy } from "../game/Enemy";
import type { Item } from "../game/Item";
import type { BagItem, Player } from "../game/Player";

/**
 * ローグライクの1プレイ中の状態を持つクラス。
 * ここでは「プレイヤーが行動する → 敵が行動する → 画面を更新する」という流れを管理する。
 */
export class Game {
  public map!: GameMap;
  public player!: Player;
  public enemies: Enemy[] = [];
  public items: Item[] = [];
  public fov = new Fov(8);
  public logger = new Logger();
  public isGameOver = false;
  public floor = 1;

  private renderer: Renderer;
  private input = new InputManager();
  private turnManager = new TurnManager();
  private isBagOpen = false;
  private pendingBagItem: BagItem | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    private mapOverlayElement: HTMLElement,
    private statusElement: HTMLElement,
    private logElement: HTMLElement,
    public config: GameConfig,
  ) {
    this.renderer = new Renderer(canvas);
    this.input.setMoveHandler((direction) => this.handlePlayerMove(direction));
    this.input.setUseItemHandler(() => this.useBagItem());
    this.statusElement.addEventListener("click", (event) => this.handleStatusClick(event));
    this.mapOverlayElement.addEventListener("click", (event) => this.handleStatusClick(event));
  }

  /** ゲームオーバー中だけEnterで新しいゲームを開始する。 */
  setRestartHandler(handler: () => void): void {
    this.input.setRestartHandler(() => {
      if (this.isGameOver) {
        handler();
      }
    });
  }

  /** 通常プレイ中の決定アクション。現在は階段を使うために利用する。 */
  setActionHandler(handler: () => void): void {
    this.input.setActionHandler(() => {
      if (!this.isGameOver) {
        handler();
      }
    });
  }

  /**
   * 新しい階層を開始する。
   * マップや敵などの階層単位の状態を入れ替え、視界とログを初期化する。
   */
  start(map: GameMap, player: Player, enemies: Enemy[], items: Item[], floor = 1): void {
    this.map = map;
    this.player = player;
    this.enemies = enemies;
    this.items = items;
    this.floor = floor;
    this.fov = new Fov(8);
    this.logger = new Logger();
    this.isGameOver = false;
    this.pendingBagItem = null;
    this.input.setEnabled(true);
    this.renderer.resizeToMap(map);
    this.logger.add(this.config.messages.floorArrive(this.floor));
    this.config.hooks?.onFloorChange?.({ game: this, floor: this.floor });
    this.refresh();
  }

  /** 階段移動の判定。プレイヤーが階段タイルの上にいる時だけ次の階へ進める。 */
  isPlayerOnStairs(): boolean {
    return this.map.getTile(this.player.x, this.player.y).type === "stairs";
  }

  /** 描画や衝突判定で使う、現在存在する全エンティティの一覧。 */
  get entities(): Entity[] {
    return [this.player, ...this.items, ...this.enemies];
  }

  /**
   * 移動可能判定。
   * 壁や他の移動ブロックエンティティがある場所には入れない。
   */
  tryMoveActor(actor: Actor, dx: number, dy: number): boolean {
    const targetX = actor.x + dx;
    const targetY = actor.y + dy;

    if (!this.map.isWalkable(targetX, targetY)) {
      return false;
    }

    if (Collision.getBlockingEntityAt(this.entities.filter((entity) => entity !== actor), targetX, targetY)) {
      return false;
    }

    actor.x = targetX;
    actor.y = targetY;
    return true;
  }

  /**
   * 戦闘処理。
   * 攻撃力ぶんHPを減らし、HPが0になった敵はマップから取り除く。
   */
  attack(attacker: Actor, defender: Actor): void {
    const attackPower = attacker.id === this.player.id ? this.player.getAttack() : attacker.attackPower;
    defender.damage(attackPower);
    this.logger.add(this.config.messages.attack(attacker, defender, attackPower));
    this.config.hooks?.onAttack?.({ game: this, attacker, defender, damage: attackPower });

    if (defender.isDead) {
      const defeatedEnemy = this.enemies.find((enemy) => enemy.id === defender.id);
      if (defeatedEnemy && attacker.id === this.player.id) {
        this.player.exp += defeatedEnemy.expValue;
        this.logger.add(this.config.messages.defeatWithExp(defeatedEnemy.name, defeatedEnemy.expValue));
        this.checkPlayerLevelUp();
      } else {
        this.logger.add(this.config.messages.defeat(defender.name));
      }

      this.config.hooks?.onDeath?.({ game: this, actor: defender });

      this.enemies = this.enemies.filter((enemy) => enemy.id !== defender.id);

      if (defender.id === this.player.id) {
        this.endGame();
      }
    }
  }

  /** プレイヤーが足元のアイテムを拾う処理。 */
  pickupItems(): void {
    const item = this.items.find((candidate) => candidate.x === this.player.x && candidate.y === this.player.y);
    if (!item) return;

    item.onPickup(this.player, this);
    this.config.hooks?.onPickup?.({ game: this, itemName: item.name });
    this.items = this.items.filter((candidate) => candidate.id !== item.id);
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
  refresh(): void {
    this.fov.compute(this.map, this.player.x, this.player.y);
    this.renderer.render(this.map, this.entities, this.fov, this.isGameOver);
    this.renderUi();
    this.renderMapOverlay();
  }

  /** プレイヤー死亡時のゲームオーバー処理。 */
  endGame(): void {
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
  private handlePlayerMove(direction: Direction): void {
    if (this.isGameOver) return;
    if (this.pendingBagItem) {
      this.logger.add("バッグの整理を先に決める必要がある。");
      this.refresh();
      return;
    }

    const targetX = this.player.x + direction.dx;
    const targetY = this.player.y + direction.dy;
    const enemy = this.enemies.find((candidate) => candidate.x === targetX && candidate.y === targetY);

    if (enemy) {
      this.attack(this.player, enemy);
    } else if (this.tryMoveActor(this.player, direction.dx, direction.dy)) {
      this.pickupItems();
      if (this.pendingBagItem) {
        this.refresh();
        return;
      }
    } else {
      this.logger.add("壁に阻まれた。");
      this.refresh();
      return;
    }

    this.finishPlayerAction();
  }

  /** HPや階層、ログなどのHTML UIを更新する。 */
  private renderUi(): void {
    this.statusElement.innerHTML = [
      this.statusRow("LV", `${this.player.level}`),
      this.statusRow("EXP", `${this.player.exp}/${this.player.nextLevelExp}`),
      this.statusRow("HP", `${this.player.hp}/${this.player.maxHp}`),
      this.statusRow("攻撃力", `${this.player.getAttack()}`),
      this.statusRow("武器", this.player.weapon ? `+${this.player.weapon.atk}` : "なし"),
      this.statusRow("バッグ", `${this.player.itemBag.length}/${this.player.maxBagItems}`),
      this.renderBagControls(),
      this.isBagOpen ? this.renderBagContents() : "",
      this.statusRow("階層", `${this.floor}階`),
      this.statusRow("操作", this.isGameOver ? "Enter: 再開" : "矢印 / WASD / Space / H"),
      this.isGameOver ? '<div class="game-over">GAME OVER<br />Press Enter</div>' : "",
    ].join("");

    this.logElement.innerHTML = this.logger
      .all()
      .map((message) => `<li>${message}</li>`)
      .join("");
  }

  private statusRow(label: string, value: string): string {
    return `<div class="status-row"><span>${label}</span><strong>${value}</strong></div>`;
  }

  private renderBagControls(): string {
    return [
      '<div class="bag-actions">',
      '<button type="button" data-action="use-item">使う</button>',
      `<button type="button" data-action="toggle-bag">${this.isBagOpen ? "閉じる" : "中身を見る"}</button>`,
      "</div>",
    ].join("");
  }

  private renderBagContents(): string {
    const items = this.player.itemBag.length > 0
      ? this.player.itemBag.map((item) => `<li>${item.name} HP +${item.healAmount}</li>`).join("")
      : "<li>空</li>";

    return `<div class="bag-contents"><strong>バッグ</strong><ul>${items}</ul></div>`;
  }

  private renderBagChoice(): string {
    if (!this.pendingBagItem) {
      return "";
    }

    const dropOptions = this.player.itemBag
      .map((item, index) => [
        '<li>',
        `<span>${item.name} HP +${item.healAmount}</span>`,
        `<button type="button" data-action="replace-bag-item" data-index="${index}">これを捨てる</button>`,
        "</li>",
      ].join(""))
      .join("");

    return [
      '<div class="bag-choice">',
      `<strong>${this.pendingBagItem.name}を拾う？</strong>`,
      '<p>拾う場合は、捨てるアイテムを選んでください。</p>',
      `<ul>${dropOptions}</ul>`,
      '<button type="button" data-action="discard-picked-item">拾わず捨てる</button>',
      "</div>",
    ].join("");
  }

  private renderMapOverlay(): void {
    if (!this.pendingBagItem) {
      this.mapOverlayElement.classList.remove("is-open");
      this.mapOverlayElement.innerHTML = "";
      return;
    }

    this.mapOverlayElement.classList.add("is-open");
    this.mapOverlayElement.innerHTML = this.renderBagChoice();
  }

  private handleStatusClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const action = target.dataset.action;
    if (action === "use-item") {
      this.useBagItem();
      return;
    }

    if (action === "toggle-bag") {
      this.isBagOpen = !this.isBagOpen;
      this.refresh();
      return;
    }

    if (action === "replace-bag-item") {
      this.replaceBagItem(Number(target.dataset.index));
      return;
    }

    if (action === "discard-picked-item") {
      this.discardPendingBagItem();
    }
  }

  /** バッグ内の回復アイテムを使う。 */
  private useBagItem(): void {
    if (this.isGameOver) return;
    if (this.pendingBagItem) {
      this.logger.add("バッグの整理を先に決める必要がある。");
      this.refresh();
      return;
    }

    const result = this.player.useHealingItem();
    if (!result) {
      this.logger.add("バッグに使えるアイテムがない。");
      this.refresh();
      return;
    }

    this.logger.add(this.config.messages.itemUsed(result.name, result.healed));
    this.refresh();
  }

  private replaceBagItem(dropIndex: number): void {
    if (!this.pendingBagItem) return;

    const picked = this.pendingBagItem;
    const dropped = this.player.replaceItemAt(dropIndex, picked);
    if (!dropped) {
      this.logger.add("捨てるアイテムを選べなかった。");
      this.refresh();
      return;
    }

    this.pendingBagItem = null;
    this.logger.add(`${picked.name}をバッグに入れた。${dropped.name}を捨てた。`);
    this.finishPlayerAction();
  }

  private discardPendingBagItem(): void {
    if (!this.pendingBagItem) return;

    const discarded = this.pendingBagItem;
    this.pendingBagItem = null;
    this.logger.add(`${discarded.name}を捨てた。`);
    this.finishPlayerAction();
  }

  private finishPlayerAction(): void {
    if (!this.isGameOver) {
      this.turnManager.runEnemyTurn(this);
      this.checkPlayerLevelUp();
    }

    this.refresh();
  }

  /** ターンごとのレベルアップ判定とログ出力。 */
  private checkPlayerLevelUp(): void {
    const levelUps = this.player.checkLevelUp();
    for (let i = 0; i < levelUps; i += 1) {
      this.logger.add(`Level Up! Lv.${this.player.level - levelUps + i + 1}`);
    }
  }
}
