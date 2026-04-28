import type { Entity } from "../core/Entity";
import type { Fov } from "../map/Fov";
import type { RenderConfig } from "../core/GameConfig";
import type { GameMap } from "../map/Map";

/** タイル文字、敵、アイテム、ゲームオーバー表示をCanvasに描くクラス。 */
export class Renderer {
  private canvasContext: CanvasRenderingContext2D;

  constructor(private canvas: HTMLCanvasElement, private renderConfig: RenderConfig) {
    const canvasContext = canvas.getContext("2d");
    if (!canvasContext) {
      throw new Error("CanvasRenderingContext2D is not available.");
    }
    this.canvasContext = canvasContext;
    this.setBaseFont();
    this.canvasContext.textAlign = "center";
    this.canvasContext.textBaseline = "middle";
  }

  /** マップサイズに合わせてCanvasサイズを調整する。 */
  resizeToMap(map: GameMap): void {
    this.canvas.width = map.width * this.renderConfig.tileSize;
    this.canvas.height = map.height * this.renderConfig.tileSize;
    this.setBaseFont();
    this.canvasContext.textAlign = "center";
    this.canvasContext.textBaseline = "middle";
  }

  /** 1フレーム分の描画。マップ、エンティティ、必要ならゲームオーバーを重ねる。 */
  renderDungeonFrame(map: GameMap, entities: Entity[], fov: Fov, isGameOver: boolean): void {
    this.canvasContext.fillStyle = this.renderConfig.canvasBackground;
    this.canvasContext.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawMap(map, fov);
    this.drawEntities(entities, fov);

    if (isGameOver) {
      this.drawGameOver();
    }
  }

  clearCanvas(): void {
    this.canvasContext.fillStyle = this.renderConfig.canvasBackground;
    this.canvasContext.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /** 視界情報に応じて、見える場所は明るく、探索済みの場所は暗く描く。 */
  private drawMap(map: GameMap, fov: Fov): void {
    for (let tileY = 0; tileY < map.height; tileY += 1) {
      for (let tileX = 0; tileX < map.width; tileX += 1) {
        if (!fov.isExplored(tileX, tileY)) {
          this.drawMapCell(tileX, tileY, " ", this.renderConfig.unexploredColor, this.renderConfig.unexploredBackground);
          continue;
        }

        const tile = map.getTile(tileX, tileY);
        const isTileVisible = fov.isVisible(tileX, tileY);
        this.drawMapCell(
          tileX,
          tileY,
          tile.char,
          isTileVisible ? tile.color : this.renderConfig.exploredColor,
          isTileVisible ? tile.background : this.renderConfig.exploredBackground,
        );
      }
    }
  }

  /** 見えている範囲のエンティティだけを描画する。 */
  private drawEntities(entities: Entity[], fov: Fov): void {
    for (const entity of entities) {
      if (!fov.isVisible(entity.x, entity.y)) continue;
      this.drawMapCell(entity.x, entity.y, entity.char, entity.color, undefined);
    }
  }

  /** 1マス分の背景と文字を描く共通処理。 */
  private drawMapCell(tileX: number, tileY: number, glyph: string, color: string, background?: string): void {
    const pixelX = tileX * this.renderConfig.tileSize;
    const pixelY = tileY * this.renderConfig.tileSize;

    if (background) {
      this.canvasContext.fillStyle = background;
      this.canvasContext.fillRect(pixelX, pixelY, this.renderConfig.tileSize, this.renderConfig.tileSize);
    }

    if (glyph.trim().length > 0) {
      this.canvasContext.fillStyle = color;
      this.canvasContext.fillText(glyph, pixelX + this.renderConfig.tileSize / 2, pixelY + this.renderConfig.tileSize / 2 + 1);
    }
  }

  /** プレイヤー死亡時のオーバーレイ表示。 */
  private drawGameOver(): void {
    this.canvasContext.fillStyle = this.renderConfig.gameOverOverlay;
    this.canvasContext.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvasContext.fillStyle = this.renderConfig.gameOverTitleColor;
    this.canvasContext.font = `48px ${this.renderConfig.fontFamily}`;
    this.canvasContext.fillText(this.renderConfig.gameOverTitle, this.canvas.width / 2, this.canvas.height / 2);
    this.canvasContext.fillStyle = this.renderConfig.gameOverTextColor;
    this.canvasContext.font = `20px ${this.renderConfig.fontFamily}`;
    this.canvasContext.fillText(this.renderConfig.gameOverText, this.canvas.width / 2, this.canvas.height / 2 + 44);
    this.setBaseFont();
  }

  private setBaseFont(): void {
    this.canvasContext.font = `${this.renderConfig.tileSize}px ${this.renderConfig.fontFamily}`;
  }
}
