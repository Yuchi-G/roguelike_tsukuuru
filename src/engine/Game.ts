import { Collision } from "./Collision";
import type { Actor, Entity } from "./Entity";
import { Fov } from "./Fov";
import { InputManager, type Direction } from "./InputManager";
import { Logger } from "./Logger";
import type { GameMap } from "./Map";
import { Renderer } from "./Renderer";
import { TurnManager } from "./TurnManager";
import type { Enemy } from "../game/Enemy";
import type { Item } from "../game/Item";
import type { Player } from "../game/Player";

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

  constructor(
    canvas: HTMLCanvasElement,
    private statusElement: HTMLElement,
    private logElement: HTMLElement,
  ) {
    this.renderer = new Renderer(canvas);
    this.input.setMoveHandler((direction) => this.handlePlayerMove(direction));
  }

  setRestartHandler(handler: () => void): void {
    this.input.setRestartHandler(() => {
      if (this.isGameOver) {
        handler();
      }
    });
  }

  setActionHandler(handler: () => void): void {
    this.input.setActionHandler(() => {
      if (!this.isGameOver) {
        handler();
      }
    });
  }

  start(map: GameMap, player: Player, enemies: Enemy[], items: Item[], floor = 1): void {
    this.map = map;
    this.player = player;
    this.enemies = enemies;
    this.items = items;
    this.floor = floor;
    this.fov = new Fov(8);
    this.logger = new Logger();
    this.isGameOver = false;
    this.input.setEnabled(true);
    this.renderer.resizeToMap(map);
    this.logger.add(`${this.floor}階に到着した。`);
    this.refresh();
  }

  isPlayerOnStairs(): boolean {
    return this.map.getTile(this.player.x, this.player.y).type === "stairs";
  }

  get entities(): Entity[] {
    return [this.player, ...this.items, ...this.enemies];
  }

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

  attack(attacker: Actor, defender: Actor): void {
    defender.damage(attacker.attackPower);
    this.logger.add(`${attacker.name}が${defender.name}に${attacker.attackPower}ダメージ。`);

    if (defender.isDead) {
      this.logger.add(`${defender.name}を倒した。`);
      this.enemies = this.enemies.filter((enemy) => enemy.id !== defender.id);

      if (defender.id === this.player.id) {
        this.endGame();
      }
    }
  }

  pickupItems(): void {
    const item = this.items.find((candidate) => candidate.x === this.player.x && candidate.y === this.player.y);
    if (!item) return;

    item.onPickup(this.player, this);
    this.items = this.items.filter((candidate) => candidate.id !== item.id);
  }

  refresh(): void {
    this.fov.compute(this.map, this.player.x, this.player.y);
    this.renderer.render(this.map, this.entities, this.fov, this.isGameOver);
    this.renderUi();
  }

  endGame(): void {
    this.isGameOver = true;
    this.input.setEnabled(false);
    this.logger.add("プレイヤーは倒れた。");
    this.logger.add("Enterキーで新しいゲームを開始。");
  }

  private handlePlayerMove(direction: Direction): void {
    if (this.isGameOver) return;

    const targetX = this.player.x + direction.dx;
    const targetY = this.player.y + direction.dy;
    const enemy = this.enemies.find((candidate) => candidate.x === targetX && candidate.y === targetY);

    if (enemy) {
      this.attack(this.player, enemy);
    } else if (this.tryMoveActor(this.player, direction.dx, direction.dy)) {
      this.pickupItems();
    } else {
      this.logger.add("壁に阻まれた。");
      this.refresh();
      return;
    }

    if (!this.isGameOver) {
      this.turnManager.runEnemyTurn(this);
    }

    this.refresh();
  }

  private renderUi(): void {
    this.statusElement.innerHTML = [
      this.statusRow("HP", `${this.player.hp}/${this.player.maxHp}`),
      this.statusRow("攻撃力", `${this.player.attackPower}`),
      this.statusRow("階層", `${this.floor}階`),
      this.statusRow("操作", this.isGameOver ? "Enter: 再開" : "矢印 / WASD / Space"),
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
}
