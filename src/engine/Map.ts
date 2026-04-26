import { Tile } from "./Tile";

/** タイル配列を幅と高さつきで扱うマップクラス。 */
export class GameMap {
  public tiles: Tile[];

  constructor(
    public width: number,
    public height: number,
    defaultTile: Tile = Tile.wall(),
  ) {
    this.tiles = Array.from({ length: width * height }, () => defaultTile);
  }

  /** 2D座標を配列の位置へ変換する。 */
  index(x: number, y: number): number {
    return y * this.width + x;
  }

  /** マップ外を参照しないための境界判定。 */
  isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  /** 指定座標のタイルを取得する。マップ外は壁として扱う。 */
  getTile(x: number, y: number): Tile {
    if (!this.isInBounds(x, y)) {
      return Tile.wall();
    }
    return this.tiles[this.index(x, y)];
  }

  /** ダンジョン生成時に指定座標のタイルを置き換える。 */
  setTile(x: number, y: number, tile: Tile): void {
    if (this.isInBounds(x, y)) {
      this.tiles[this.index(x, y)] = tile;
    }
  }

  /** 壁ではなく、マップ内であれば移動可能な地形とみなす。 */
  isWalkable(x: number, y: number): boolean {
    return this.isInBounds(x, y) && !this.getTile(x, y).blocksMovement;
  }
}
