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
  private visible = new Set<string>();
  private explored = new Set<string>();

  constructor(private radius = 8) {}

  /**
   * 現在のプレイヤー位置から見えるマスを計算する。
   * Recursive Shadowcasting で壁による遮蔽を行う。
   */
  compute(map: GameMap, originX: number, originY: number): void {
    this.visible.clear();

    // 自分自身は常に見える
    this.addVisible(originX, originY);

    for (const octant of OCTANTS) {
      this.castLight(map, originX, originY, 1, 1.0, 0.0, this.radius, octant, (x, y) => this.addVisible(x, y));
    }
  }

  /** 今このターンで見えているかどうか。 */
  isVisible(x: number, y: number): boolean {
    return this.visible.has(this.key(x, y));
  }

  /** 過去に一度でも見たことがあるかどうか。 */
  isExplored(x: number, y: number): boolean {
    return this.explored.has(this.key(x, y));
  }

  /** 指定座標から対象座標が見通せるかを一時的に計算する。 */
  isVisibleFrom(map: GameMap, fromX: number, fromY: number, targetX: number, targetY: number, radius: number): boolean {
    if (fromX === targetX && fromY === targetY) return true;

    const targetKey = this.key(targetX, targetY);
    const temp = new Set<string>();

    for (const octant of OCTANTS) {
      this.castLight(map, fromX, fromY, 1, 1.0, 0.0, radius, octant, (x, y) => {
        temp.add(this.key(x, y));
      });
      if (temp.has(targetKey)) return true;
    }

    return false;
  }

  private addVisible(x: number, y: number): void {
    const key = this.key(x, y);
    this.visible.add(key);
    this.explored.add(key);
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
    ox: number,
    oy: number,
    row: number,
    startSlope: number,
    endSlope: number,
    radius: number,
    [xx, xy, yx, yy]: [number, number, number, number],
    markFn: (x: number, y: number) => void,
  ): void {
    if (startSlope < endSlope) return;

    let nextStart = startSlope;

    for (let j = row; j <= radius; j += 1) {
      const dy = -j;
      let blocked = false;

      for (let dx = -j; dx <= 0; dx += 1) {
        const leftSlope = (dx - 0.5) / (dy + 0.5);
        const rightSlope = (dx + 0.5) / (dy - 0.5);

        if (startSlope < rightSlope) continue;
        if (endSlope > leftSlope) break;

        const x = ox + dx * xx + dy * xy;
        const y = oy + dx * yx + dy * yy;

        if (!map.isInBounds(x, y)) {
          // マップ外は壁扱い
          blocked = true;
          nextStart = rightSlope;
          continue;
        }

        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const isWall = map.getTile(x, y).blocksMovement;

        if (dist <= radius) {
          markFn(x, y);
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
          this.castLight(map, ox, oy, j + 1, nextStart, leftSlope, radius, [xx, xy, yx, yy], markFn);
          nextStart = rightSlope;
        }
      }

      if (blocked) break;
    }
  }

  private key(x: number, y: number): string {
    return `${x},${y}`;
  }
}
