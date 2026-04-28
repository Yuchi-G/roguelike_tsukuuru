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
    private dungeonWidth: number,
    private dungeonHeight: number,
    private maxRoomCount = 12,
    private minRoomSize = 5,
    private maxRoomSize = 10,
    private tileDefinitions: Record<TileType, TileDefinition> = defaultTileDefinitions,
  ) {}

  /**
   * ダンジョン生成のメイン処理。
   * ランダムな部屋を重ならないように配置し、直前の部屋と通路で接続する。
   */
  generate(): Dungeon {
    const dungeonMap = new GameMap(this.dungeonWidth, this.dungeonHeight, Tile.fromDefinition(this.tileDefinitions.wall));
    const dungeonRooms: Room[] = [];

    for (let roomAttemptIndex = 0; roomAttemptIndex < this.maxRoomCount; roomAttemptIndex += 1) {
      const roomWidth = this.randomIntInclusive(this.minRoomSize, this.maxRoomSize);
      const roomHeight = this.randomIntInclusive(this.minRoomSize, this.maxRoomSize);
      const roomX = this.randomIntInclusive(1, this.dungeonWidth - roomWidth - 2);
      const roomY = this.randomIntInclusive(1, this.dungeonHeight - roomHeight - 2);
      const candidateRoom = { x: roomX, y: roomY, width: roomWidth, height: roomHeight };

      if (dungeonRooms.some((existingRoom) => this.doRoomsOverlap(candidateRoom, existingRoom))) {
        continue;
      }

      this.carveRoom(dungeonMap, candidateRoom);

      const previousRoom = dungeonRooms[dungeonRooms.length - 1];
      if (previousRoom) {
        const [previousCenterX, previousCenterY] = this.getRoomCenter(previousRoom);
        const [newCenterX, newCenterY] = this.getRoomCenter(candidateRoom);
        if (Math.random() < 0.5) {
          this.carveHorizontalTunnel(dungeonMap, previousCenterX, newCenterX, previousCenterY);
          this.carveVerticalTunnel(dungeonMap, previousCenterY, newCenterY, newCenterX);
        } else {
          this.carveVerticalTunnel(dungeonMap, previousCenterY, newCenterY, previousCenterX);
          this.carveHorizontalTunnel(dungeonMap, previousCenterX, newCenterX, newCenterY);
        }
      }

      dungeonRooms.push(candidateRoom);
    }

    const lastRoom = dungeonRooms[dungeonRooms.length - 1];
    if (lastRoom) {
      const [stairsX, stairsY] = this.getRoomCenter(lastRoom);
      dungeonMap.setTile(stairsX, stairsY, Tile.fromDefinition(this.tileDefinitions.stairs));
    }

    this.scatterCustomFloorTiles(dungeonMap);

    return { map: dungeonMap, rooms: dungeonRooms };
  }

  /** 部屋の中心座標。プレイヤー初期位置や通路接続に使う。 */
  getRoomCenter(room: Room): [number, number] {
    return [
      Math.floor(room.x + room.width / 2),
      Math.floor(room.y + room.height / 2),
    ];
  }

  /** 敵やアイテムを置くため、ランダムな部屋の床座標を選ぶ。 */
  pickRandomRoomFloorPosition(rooms: Room[]): [number, number] {
    const selectedRoom = rooms[this.randomIntInclusive(0, rooms.length - 1)];
    return [
      this.randomIntInclusive(selectedRoom.x + 1, selectedRoom.x + selectedRoom.width - 2),
      this.randomIntInclusive(selectedRoom.y + 1, selectedRoom.y + selectedRoom.height - 2),
    ];
  }

  /** 部屋の範囲を床タイルに変える。 */
  private carveRoom(map: GameMap, room: Room): void {
    for (let y = room.y; y < room.y + room.height; y += 1) {
      for (let x = room.x; x < room.x + room.width; x += 1) {
        map.setTile(x, y, Tile.fromDefinition(this.tileDefinitions.floor));
      }
    }
  }

  /** 横方向の通路を床タイルで掘る。 */
  private carveHorizontalTunnel(map: GameMap, x1: number, x2: number, y: number): void {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
      map.setTile(x, y, Tile.fromDefinition(this.tileDefinitions.floor));
    }
  }

  /** 縦方向の通路を床タイルで掘る。 */
  private carveVerticalTunnel(map: GameMap, y1: number, y2: number, x: number): void {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
      map.setTile(x, y, Tile.fromDefinition(this.tileDefinitions.floor));
    }
  }

  /** 部屋同士が重なると通路設計が崩れやすいため、配置前に判定する。 */
  private doRoomsOverlap(firstRoom: Room, secondRoom: Room): boolean {
    return (
      firstRoom.x <= secondRoom.x + secondRoom.width &&
      firstRoom.x + firstRoom.width >= secondRoom.x &&
      firstRoom.y <= secondRoom.y + secondRoom.height &&
      firstRoom.y + firstRoom.height >= secondRoom.y
    );
  }

  /**
   * コアタイル（wall/floor/stairs）以外のタイルを、scatterRate に従って床タイルに散布する。
   * ダンジョン生成後のポストプロセスとして呼ぶ。
   */
  private scatterCustomFloorTiles(map: GameMap): void {
    const coreTileTypes = new Set(["wall", "floor", "stairs"]);
    const customFloorTileDefinitions = Object.values(this.tileDefinitions).filter(
      (tileDefinition) => !coreTileTypes.has(tileDefinition.type) && (tileDefinition.scatterRate ?? 0) > 0,
    );

    if (customFloorTileDefinitions.length === 0) return;

    for (let tileY = 0; tileY < this.dungeonHeight; tileY += 1) {
      for (let tileX = 0; tileX < this.dungeonWidth; tileX += 1) {
        if (map.getTile(tileX, tileY).type !== "floor") continue;
        for (const customFloorTileDefinition of customFloorTileDefinitions) {
          if (Math.random() < (customFloorTileDefinition.scatterRate ?? 0)) {
            map.setTile(tileX, tileY, Tile.fromDefinition(customFloorTileDefinition));
            break;
          }
        }
      }
    }
  }

  private randomIntInclusive(minValue: number, maxValue: number): number {
    return Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue;
  }
}
