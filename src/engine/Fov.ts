import type { GameMap } from "./Map";

export class Fov {
  private visible = new Set<string>();
  private explored = new Set<string>();

  constructor(private radius = 8) {}

  compute(map: GameMap, originX: number, originY: number): void {
    this.visible.clear();

    for (let y = originY - this.radius; y <= originY + this.radius; y += 1) {
      for (let x = originX - this.radius; x <= originX + this.radius; x += 1) {
        if (!map.isInBounds(x, y)) continue;
        const distance = Math.max(Math.abs(originX - x), Math.abs(originY - y));
        if (distance <= this.radius) {
          const key = this.key(x, y);
          this.visible.add(key);
          this.explored.add(key);
        }
      }
    }
  }

  isVisible(x: number, y: number): boolean {
    return this.visible.has(this.key(x, y));
  }

  isExplored(x: number, y: number): boolean {
    return this.explored.has(this.key(x, y));
  }

  private key(x: number, y: number): string {
    return `${x},${y}`;
  }
}
