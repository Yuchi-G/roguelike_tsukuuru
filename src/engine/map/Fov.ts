import type { GameMap } from "./Map";

/**
 * 8方向の変換テーブル。
 * 第1オクタント（x増・y減・|dx|>|dy|）の走査を8方向に回転する。
 * 各エントリは [xx, xy, yx, yy] で、ローカル座標 (dx, dy) を
 * (dx*xx + dy*xy, dx*yx + dy*yy) へ変換する。
 */
const OCTANTS: [number, number, number, number][] = [
  [ 1,  0,  0,  1],
  [ 0,  1,  1,  0],
  [ 0, -1,  1,  0],
  [-1,  0,  0,  1],
  [-1,  0,  0, -1],
  [ 0, -1, -1,  0],
  [ 0,  1, -1,  0],
  [ 1,  0,  0, -1],
];

/** ローグライクらしい明暗表示のための視界クラス。 */
export class Fov {
  private visibleTileKeys = new Set<string>();
  private exploredTileKeys = new Set<string>();

  constructor(private visionRadius = 8) {}

  /**
   * 現在のプレイヤー位置から見えるマスを計算する。
   * Recursive Shadowcasting で壁による遮蔽を行う。
   */
  compute(map: GameMap, originX: number, originY: number): void {
    this.visibleTileKeys.clear();

    // 自分自身は常に見える
    this.addVisible(originX, originY);

    for (const octant of OCTANTS) {
      this.castLight(map, originX, originY, 1, 1.0, 0.0, this.visionRadius, octant, (tileX, tileY) => this.addVisible(tileX, tileY));
    }
  }

  /** 今このターンで見えているかどうか。 */
  isVisible(x: number, y: number): boolean {
    return this.visibleTileKeys.has(this.tileKey(x, y));
  }

  /** 過去に一度でも見たことがあるかどうか。 */
  isExplored(x: number, y: number): boolean {
    return this.exploredTileKeys.has(this.tileKey(x, y));
  }

  /** 指定座標から対象座標が見通せるかを一時的に計算する。 */
  isVisibleFrom(map: GameMap, fromX: number, fromY: number, targetX: number, targetY: number, radius: number): boolean {
    if (fromX === targetX && fromY === targetY) return true;

    const targetTileKey = this.tileKey(targetX, targetY);
    const visibleTileKeysFromOrigin = new Set<string>();

    for (const octant of OCTANTS) {
      this.castLight(map, fromX, fromY, 1, 1.0, 0.0, radius, octant, (tileX, tileY) => {
        visibleTileKeysFromOrigin.add(this.tileKey(tileX, tileY));
      });
      if (visibleTileKeysFromOrigin.has(targetTileKey)) return true;
    }

    return false;
  }

  private addVisible(x: number, y: number): void {
    const visibleTileKey = this.tileKey(x, y);
    this.visibleTileKeys.add(visibleTileKey);
    this.exploredTileKeys.add(visibleTileKey);
  }

  /**
   * Recursive Shadowcasting の1オクタント分の走査。
   *
   * RogueBasin の Recursive Shadowcasting アルゴリズムに基づく。
   * dx は列（-j〜0）、dy は行（= -j、負値）として走査する。
   * スロープは dx/dy の比で表し、startSlope=1.0（対角線）〜endSlope=0.0（軸方向）。
   */
  private castLight(
    map: GameMap,
    originX: number,
    originY: number,
    scanStartRow: number,
    startSlope: number,
    endSlope: number,
    radius: number,
    [octantXx, octantXy, octantYx, octantYy]: [number, number, number, number],
    markVisibleTile: (x: number, y: number) => void,
  ): void {
    if (startSlope < endSlope) return;

    let nextStart = startSlope;

    for (let scanRow = scanStartRow; scanRow <= radius; scanRow += 1) {
      const localDeltaY = -scanRow;
      let blocked = false;

      for (let localDeltaX = -scanRow; localDeltaX <= 0; localDeltaX += 1) {
        const leftSlope = (localDeltaX - 0.5) / (localDeltaY + 0.5);
        const rightSlope = (localDeltaX + 0.5) / (localDeltaY - 0.5);

        if (startSlope < rightSlope) continue;
        if (endSlope > leftSlope) break;

        const tileX = originX + localDeltaX * octantXx + localDeltaY * octantXy;
        const tileY = originY + localDeltaX * octantYx + localDeltaY * octantYy;

        if (!map.isInBounds(tileX, tileY)) {
          // マップ外は壁扱い
          blocked = true;
          nextStart = rightSlope;
          continue;
        }

        const distanceFromOrigin = Math.max(Math.abs(localDeltaX), Math.abs(localDeltaY));
        const isWall = map.getTile(tileX, tileY).blocksMovement;

        if (distanceFromOrigin <= radius) {
          markVisibleTile(tileX, tileY);
        }

        if (blocked) {
          if (isWall) {
            nextStart = rightSlope;
          } else {
            blocked = false;
            startSlope = nextStart;
          }
        } else if (isWall) {
          blocked = true;
          this.castLight(
            map,
            originX,
            originY,
            scanRow + 1,
            nextStart,
            leftSlope,
            radius,
            [octantXx, octantXy, octantYx, octantYy],
            markVisibleTile,
          );
          nextStart = rightSlope;
        }
      }

      if (blocked) break;
    }
  }

  private tileKey(x: number, y: number): string {
    return `${x},${y}`;
  }
}
