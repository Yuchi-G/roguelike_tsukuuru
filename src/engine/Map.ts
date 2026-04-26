import { Tile } from "./Tile";

export class GameMap {
  public tiles: Tile[];

  constructor(
    public width: number,
    public height: number,
    defaultTile: Tile = Tile.wall(),
  ) {
    this.tiles = Array.from({ length: width * height }, () => defaultTile);
  }

  index(x: number, y: number): number {
    return y * this.width + x;
  }

  isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  getTile(x: number, y: number): Tile {
    if (!this.isInBounds(x, y)) {
      return Tile.wall();
    }
    return this.tiles[this.index(x, y)];
  }

  setTile(x: number, y: number, tile: Tile): void {
    if (this.isInBounds(x, y)) {
      this.tiles[this.index(x, y)] = tile;
    }
  }

  isWalkable(x: number, y: number): boolean {
    return this.isInBounds(x, y) && !this.getTile(x, y).blocksMovement;
  }
}
