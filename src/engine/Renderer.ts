import type { Entity } from "./Entity";
import type { Fov } from "./Fov";
import type { GameMap } from "./Map";

export class Renderer {
  private context: CanvasRenderingContext2D;
  private readonly tileSize = 20;

  constructor(private canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("CanvasRenderingContext2D is not available.");
    }
    this.context = context;
    this.context.font = `${this.tileSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";
  }

  resizeToMap(map: GameMap): void {
    this.canvas.width = map.width * this.tileSize;
    this.canvas.height = map.height * this.tileSize;
    this.context.font = `${this.tileSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";
  }

  render(map: GameMap, entities: Entity[], fov: Fov, isGameOver: boolean): void {
    this.context.fillStyle = "#050605";
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawMap(map, fov);
    this.drawEntities(entities, fov);

    if (isGameOver) {
      this.drawGameOver();
    }
  }

  private drawMap(map: GameMap, fov: Fov): void {
    for (let y = 0; y < map.height; y += 1) {
      for (let x = 0; x < map.width; x += 1) {
        if (!fov.isExplored(x, y)) {
          this.drawCell(x, y, " ", "#000000", "#050605");
          continue;
        }

        const tile = map.getTile(x, y);
        const visible = fov.isVisible(x, y);
        this.drawCell(
          x,
          y,
          tile.char,
          visible ? tile.color : "#2b312b",
          visible ? tile.background : "#080a08",
        );
      }
    }
  }

  private drawEntities(entities: Entity[], fov: Fov): void {
    for (const entity of entities) {
      if (!fov.isVisible(entity.x, entity.y)) continue;
      this.drawCell(entity.x, entity.y, entity.char, entity.color, undefined);
    }
  }

  private drawCell(x: number, y: number, char: string, color: string, background?: string): void {
    const px = x * this.tileSize;
    const py = y * this.tileSize;

    if (background) {
      this.context.fillStyle = background;
      this.context.fillRect(px, py, this.tileSize, this.tileSize);
    }

    if (char.trim().length > 0) {
      this.context.fillStyle = color;
      this.context.fillText(char, px + this.tileSize / 2, py + this.tileSize / 2 + 1);
    }
  }

  private drawGameOver(): void {
    this.context.fillStyle = "rgba(0, 0, 0, 0.68)";
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.fillStyle = "#ff8c7a";
    this.context.font = "48px ui-monospace, SFMono-Regular, Menlo, monospace";
    this.context.fillText("GAME OVER", this.canvas.width / 2, this.canvas.height / 2);
    this.context.fillStyle = "#e7e2d2";
    this.context.font = "20px ui-monospace, SFMono-Regular, Menlo, monospace";
    this.context.fillText("Press Enter to restart", this.canvas.width / 2, this.canvas.height / 2 + 44);
    this.context.font = `${this.tileSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  }
}
