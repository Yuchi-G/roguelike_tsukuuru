export type TileType = string;

export type TileDefinition = {
  type: TileType;
  char: string;
  color: string;
  background: string;
  blocksMovement: boolean;
  /** 0〜1: ダンジョン生成後に床タイルへ散布する割合。wall/floor/stairsには無効。 */
  scatterRate?: number;
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

  /** 壁タイル。マップのデフォルト値として使う。 */
  static wall(): Tile {
    return Tile.fromDefinition(defaultTileDefinitions.wall);
  }
}
