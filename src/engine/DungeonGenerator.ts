/**
 * ランダムダンジョンを生成するファイル。
 * 部屋を作り、部屋同士を通路でつなぎ、最後の部屋に階段を置く。
 */
import { GameMap } from "./Map";
import { defaultTileDefinitions, Tile, type TileDefinition, type TileType } from "./Tile";

/** ダンジョン内の長方形の部屋。 */
export type Room = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** 生成結果として、マップ本体と部屋一覧を返す。 */
export type Dungeon = {
  map: GameMap;
  rooms: Room[];
};

/**
 * 部屋と通路を使ったシンプルなダンジョン生成器。
 * 生成された部屋は必ず通路でつながるため、最低限移動可能なマップになる。
 */
export class DungeonGenerator {
  constructor(
    private width: number,
    private height: number,
    private maxRooms = 12,
    private minRoomSize = 5,
    private maxRoomSize = 10,
    private tiles: Record<TileType, TileDefinition> = defaultTileDefinitions,
  ) {}

  /**
   * ダンジョン生成のメイン処理。
   * ランダムな部屋を重ならないように配置し、直前の部屋と通路で接続する。
   */
  generate(): Dungeon {
    const map = new GameMap(this.width, this.height, Tile.fromDefinition(this.tiles.wall));
    const rooms: Room[] = [];

    for (let i = 0; i < this.maxRooms; i += 1) {
      const width = this.randomInt(this.minRoomSize, this.maxRoomSize);
      const height = this.randomInt(this.minRoomSize, this.maxRoomSize);
      const x = this.randomInt(1, this.width - width - 2);
      const y = this.randomInt(1, this.height - height - 2);
      const room = { x, y, width, height };

      if (rooms.some((existing) => this.roomsOverlap(room, existing))) {
        continue;
      }

      this.carveRoom(map, room);

      const previous = rooms[rooms.length - 1];
      if (previous) {
        const [prevX, prevY] = this.center(previous);
        const [newX, newY] = this.center(room);
        if (Math.random() < 0.5) {
          this.carveHorizontalTunnel(map, prevX, newX, prevY);
          this.carveVerticalTunnel(map, prevY, newY, newX);
        } else {
          this.carveVerticalTunnel(map, prevY, newY, prevX);
          this.carveHorizontalTunnel(map, prevX, newX, newY);
        }
      }

      rooms.push(room);
    }

    const lastRoom = rooms[rooms.length - 1];
    if (lastRoom) {
      const [stairsX, stairsY] = this.center(lastRoom);
      map.setTile(stairsX, stairsY, Tile.fromDefinition(this.tiles.stairs));
    }

    return { map, rooms };
  }

  /** 部屋の中心座標。プレイヤー初期位置や通路接続に使う。 */
  center(room: Room): [number, number] {
    return [
      Math.floor(room.x + room.width / 2),
      Math.floor(room.y + room.height / 2),
    ];
  }

  /** 敵やアイテムを置くため、ランダムな部屋の床座標を選ぶ。 */
  randomFloorPosition(rooms: Room[]): [number, number] {
    const room = rooms[this.randomInt(0, rooms.length - 1)];
    return [
      this.randomInt(room.x + 1, room.x + room.width - 2),
      this.randomInt(room.y + 1, room.y + room.height - 2),
    ];
  }

  /** 部屋の範囲を床タイルに変える。 */
  private carveRoom(map: GameMap, room: Room): void {
    for (let y = room.y; y < room.y + room.height; y += 1) {
      for (let x = room.x; x < room.x + room.width; x += 1) {
        map.setTile(x, y, Tile.fromDefinition(this.tiles.floor));
      }
    }
  }

  /** 横方向の通路を床タイルで掘る。 */
  private carveHorizontalTunnel(map: GameMap, x1: number, x2: number, y: number): void {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
      map.setTile(x, y, Tile.fromDefinition(this.tiles.floor));
    }
  }

  /** 縦方向の通路を床タイルで掘る。 */
  private carveVerticalTunnel(map: GameMap, y1: number, y2: number, x: number): void {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
      map.setTile(x, y, Tile.fromDefinition(this.tiles.floor));
    }
  }

  /** 部屋同士が重なると通路設計が崩れやすいため、配置前に判定する。 */
  private roomsOverlap(a: Room, b: Room): boolean {
    return (
      a.x <= b.x + b.width &&
      a.x + a.width >= b.x &&
      a.y <= b.y + b.height &&
      a.y + a.height >= b.y
    );
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
