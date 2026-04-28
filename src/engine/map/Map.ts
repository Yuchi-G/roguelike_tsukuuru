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
  index(tileX: number, tileY: number): number {
    return tileY * this.width + tileX;
  }

  /** マップ外を参照しないための境界判定。 */
  isInBounds(tileX: number, tileY: number): boolean {
    return tileX >= 0 && tileX < this.width && tileY >= 0 && tileY < this.height;
  }

  /** 指定座標のタイルを取得する。マップ外は壁として扱う。 */
  getTile(tileX: number, tileY: number): Tile {
    if (!this.isInBounds(tileX, tileY)) {
      return Tile.wall();
    }
    return this.tiles[this.index(tileX, tileY)];
  }

  /** ダンジョン生成時に指定座標のタイルを置き換える。 */
  setTile(tileX: number, tileY: number, tile: Tile): void {
    if (this.isInBounds(tileX, tileY)) {
      this.tiles[this.index(tileX, tileY)] = tile;
    }
  }

  /** 壁ではなく、マップ内であれば移動可能な地形とみなす。 */
  isWalkable(tileX: number, tileY: number): boolean {
    return this.isInBounds(tileX, tileY) && !this.getTile(tileX, tileY).blocksMovement;
  }
}
