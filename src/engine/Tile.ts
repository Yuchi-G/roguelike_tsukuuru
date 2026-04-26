/**
 * マップを構成するタイルを定義するファイル。
 * 壁、床、階段ごとに、表示文字・色・通行可否をまとめる。
 */
export type TileType = "wall" | "floor" | "stairs";

/** 1マス分の地形情報。移動判定と描画の両方で使う。 */
export class Tile {
  constructor(
    public type: TileType,
    public char: string,
    public color: string,
    public background: string,
    public blocksMovement: boolean,
  ) {}

  /** 壁タイル。プレイヤーや敵は通れない。 */
  static wall(): Tile {
    return new Tile("wall", "#", "#697064", "#171a17", true);
  }

  /** 床タイル。通常の移動先として使う。 */
  static floor(): Tile {
    return new Tile("floor", ".", "#51594c", "#101210", false);
  }

  /** 階段タイル。Spaceキーで次の階へ進む場所。 */
  static stairs(): Tile {
    return new Tile("stairs", ">", "#f0d982", "#161a13", false);
  }
}
