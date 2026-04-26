/**
 * マップを構成するタイルを定義するファイル。
 * 壁、床、階段ごとに、表示文字・色・通行可否をまとめる。
 */
export type TileType = string;

export type TileDefinition = {
  type: TileType;
  char: string;
  color: string;
  background: string;
  blocksMovement: boolean;
};

export const defaultTileDefinitions: Record<TileType, TileDefinition> = {
  wall: { type: "wall", char: "#", color: "#697064", background: "#171a17", blocksMovement: true },
  floor: { type: "floor", char: ".", color: "#51594c", background: "#101210", blocksMovement: false },
  stairs: { type: "stairs", char: ">", color: "#f0d982", background: "#161a13", blocksMovement: false },
};

/** 1マス分の地形情報。移動判定と描画の両方で使う。 */
export class Tile {
  constructor(
    public type: TileType,
    public char: string,
    public color: string,
    public background: string,
    public blocksMovement: boolean,
  ) {}

  static fromDefinition(definition: TileDefinition): Tile {
    return new Tile(
      definition.type,
      definition.char,
      definition.color,
      definition.background,
      definition.blocksMovement,
    );
  }

  /** 壁タイル。プレイヤーや敵は通れない。 */
  static wall(): Tile {
    return Tile.fromDefinition(defaultTileDefinitions.wall);
  }

  /** 床タイル。通常の移動先として使う。 */
  static floor(): Tile {
    return Tile.fromDefinition(defaultTileDefinitions.floor);
  }

  /** 階段タイル。Spaceキーで次の階へ進む場所。 */
  static stairs(): Tile {
    return Tile.fromDefinition(defaultTileDefinitions.stairs);
  }
}
