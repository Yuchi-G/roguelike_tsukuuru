import type { Entity } from "./Entity";
import type { Fov } from "./Fov";
import type { RenderConfig } from "./GameConfig";
import type { GameMap } from "./Map";

/** タイル文字、敵、アイテム、ゲームオーバー表示をCanvasに描くクラス。 */
export class Renderer {
  private context: CanvasRenderingContext2D;

  constructor(private canvas: HTMLCanvasElement, private config: RenderConfig) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("CanvasRenderingContext2D is not available.");
    }
    this.context = context;
    this.setBaseFont();
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";
  }

  /** マップサイズに合わせてCanvasサイズを調整する。 */
  resizeToMap(map: GameMap): void {
    this.canvas.width = map.width * this.config.tileSize;
    this.canvas.height = map.height * this.config.tileSize;
    this.setBaseFont();
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";
  }

  /** 1フレーム分の描画。マップ、エンティティ、必要ならゲームオーバーを重ねる。 */
  render(map: GameMap, entities: Entity[], fov: Fov, isGameOver: boolean): void {
    this.context.fillStyle = this.config.canvasBackground;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawMap(map, fov);
    this.drawEntities(entities, fov);

    if (isGameOver) {
      this.drawGameOver();
    }
  }

  clear(): void {
    this.context.fillStyle = this.config.canvasBackground;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /** 視界情報に応じて、見える場所は明るく、探索済みの場所は暗く描く。 */
  private drawMap(map: GameMap, fov: Fov): void {
    for (let y = 0; y < map.height; y += 1) {
      for (let x = 0; x < map.width; x += 1) {
        if (!fov.isExplored(x, y)) {
          this.drawCell(x, y, " ", this.config.unexploredColor, this.config.unexploredBackground);
          continue;
        }

        const tile = map.getTile(x, y);
        const visible = fov.isVisible(x, y);
        this.drawCell(
          x,
          y,
          tile.char,
          visible ? tile.color : this.config.exploredColor,
          visible ? tile.background : this.config.exploredBackground,
        );
      }
    }
  }

  /** 見えている範囲のエンティティだけを描画する。 */
  private drawEntities(entities: Entity[], fov: Fov): void {
    for (const entity of entities) {
      if (!fov.isVisible(entity.x, entity.y)) continue;
      this.drawCell(entity.x, entity.y, entity.char, entity.color, undefined);
    }
  }

  /** 1マス分の背景と文字を描く共通処理。 */
  private drawCell(x: number, y: number, char: string, color: string, background?: string): void {
    const px = x * this.config.tileSize;
    const py = y * this.config.tileSize;

    if (background) {
      this.context.fillStyle = background;
      this.context.fillRect(px, py, this.config.tileSize, this.config.tileSize);
    }

    if (char.trim().length > 0) {
      this.context.fillStyle = color;
      this.context.fillText(char, px + this.config.tileSize / 2, py + this.config.tileSize / 2 + 1);
    }
  }

  /** プレイヤー死亡時のオーバーレイ表示。 */
  private drawGameOver(): void {
    this.context.fillStyle = this.config.gameOverOverlay;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.fillStyle = this.config.gameOverTitleColor;
    this.context.font = `48px ${this.config.fontFamily}`;
    this.context.fillText("GAME OVER", this.canvas.width / 2, this.canvas.height / 2);
    this.context.fillStyle = this.config.gameOverTextColor;
    this.context.font = `20px ${this.config.fontFamily}`;
    this.context.fillText("Press Enter to restart", this.canvas.width / 2, this.canvas.height / 2 + 44);
    this.setBaseFont();
  }

  private setBaseFont(): void {
    this.context.font = `${this.config.tileSize}px ${this.config.fontFamily}`;
  }
}
