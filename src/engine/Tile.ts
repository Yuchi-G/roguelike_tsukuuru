export type TileType = "wall" | "floor" | "stairs";

export class Tile {
  constructor(
    public type: TileType,
    public char: string,
    public color: string,
    public background: string,
    public blocksMovement: boolean,
  ) {}

  static wall(): Tile {
    return new Tile("wall", "#", "#697064", "#171a17", true);
  }

  static floor(): Tile {
    return new Tile("floor", ".", "#51594c", "#101210", false);
  }

  static stairs(): Tile {
    return new Tile("stairs", ">", "#f0d982", "#161a13", false);
  }
}
