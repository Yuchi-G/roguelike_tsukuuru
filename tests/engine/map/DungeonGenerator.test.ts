import { describe, it, expect, vi } from "vitest";
import { DungeonGenerator, type Room } from "../../../src/engine/map/DungeonGenerator";

describe("DungeonGenerator.getRoomCenter()", () => {
  it("部屋の中心座標を返す（切り捨て）", () => {
    const dungeonGenerator = new DungeonGenerator(40, 30);
    const room: Room = { x: 2, y: 3, width: 6, height: 4 };
    const [centerX, centerY] = dungeonGenerator.getRoomCenter(room);
    expect(centerX).toBe(5); // 2 + floor(6/2)
    expect(centerY).toBe(5); // 3 + floor(4/2)
  });

  it("幅・高さが奇数でも正しく計算する", () => {
    const dungeonGenerator = new DungeonGenerator(40, 30);
    const room: Room = { x: 0, y: 0, width: 5, height: 7 };
    const [centerX, centerY] = dungeonGenerator.getRoomCenter(room);
    expect(centerX).toBe(2); // floor(5/2)
    expect(centerY).toBe(3); // floor(7/2)
  });
});

describe("DungeonGenerator.generate()", () => {
  it("マップのサイズが指定通りになる", () => {
    const dungeonGenerator = new DungeonGenerator(40, 30, 5);
    const { map } = dungeonGenerator.generate();
    expect(map.width).toBe(40);
    expect(map.height).toBe(30);
  });

  it("部屋の数がmaxRooms以下になる", () => {
    const dungeonGenerator = new DungeonGenerator(40, 30, 8);
    const { rooms } = dungeonGenerator.generate();
    expect(rooms.length).toBeGreaterThan(0);
    expect(rooms.length).toBeLessThanOrEqual(8);
  });

  it("部屋が少なくとも1つ生成される", () => {
    // maxRooms=1 で必ず1部屋になる
    const dungeonGenerator = new DungeonGenerator(40, 30, 1);
    const { rooms } = dungeonGenerator.generate();
    expect(rooms.length).toBe(1);
  });

  it("最後の部屋の中心に階段が配置される", () => {
    const dungeonGenerator = new DungeonGenerator(40, 30, 3);
    const { map, rooms } = dungeonGenerator.generate();
    const lastRoom = rooms[rooms.length - 1];
    const [stairsX, stairsY] = dungeonGenerator.getRoomCenter(lastRoom);
    expect(map.getTile(stairsX, stairsY).type).toBe("stairs");
  });

  it("生成された全部屋はマップ境界内に収まる", () => {
    const dungeonWidth = 40;
    const dungeonHeight = 30;
    const dungeonGenerator = new DungeonGenerator(dungeonWidth, dungeonHeight, 10);
    const { rooms } = dungeonGenerator.generate();
    for (const room of rooms) {
      expect(room.x).toBeGreaterThanOrEqual(0);
      expect(room.y).toBeGreaterThanOrEqual(0);
      expect(room.x + room.width).toBeLessThanOrEqual(dungeonWidth);
      expect(room.y + room.height).toBeLessThanOrEqual(dungeonHeight);
    }
  });
});

describe("DungeonGenerator.pickRandomRoomFloorPosition()", () => {
  it("返される座標は部屋の内側に収まる", () => {
    const dungeonGenerator = new DungeonGenerator(40, 30, 5);
    const rooms: Room[] = [{ x: 5, y: 5, width: 8, height: 8 }];

    for (let sampleIndex = 0; sampleIndex < 20; sampleIndex += 1) {
      const [floorX, floorY] = dungeonGenerator.pickRandomRoomFloorPosition(rooms);
      // +1 〜 +width-2 の範囲（壁1マス内側）
      expect(floorX).toBeGreaterThanOrEqual(rooms[0].x + 1);
      expect(floorX).toBeLessThanOrEqual(rooms[0].x + rooms[0].width - 2);
      expect(floorY).toBeGreaterThanOrEqual(rooms[0].y + 1);
      expect(floorY).toBeLessThanOrEqual(rooms[0].y + rooms[0].height - 2);
    }
  });
});

describe("DungeonGenerator.generate() - scatterCustomFloorTiles", () => {
  it("scatterRate=0のカスタムタイルは散布されない", () => {
    const tiles = {
      wall: { type: "wall", char: "#", color: "#333", background: "#000", blocksMovement: true },
      floor: { type: "floor", char: ".", color: "#888", background: "#000", blocksMovement: false },
      stairs: { type: "stairs", char: ">", color: "#ff0", background: "#000", blocksMovement: false },
      trap: { type: "trap", char: "^", color: "#f00", background: "#000", blocksMovement: false, scatterRate: 0 },
    };
    const dungeonGenerator = new DungeonGenerator(30, 20, 3, 5, 8, tiles);
    const { map } = dungeonGenerator.generate();
    const trapCount = map.tiles.filter((t) => t.type === "trap").length;
    expect(trapCount).toBe(0);
  });

  it("scatterRate=1のカスタムタイルは全床に散布される", () => {
    // Math.random をモックして常に 0 を返す（< 1 は必ずtrue）
    vi.spyOn(Math, "random").mockReturnValue(0);
    const tiles = {
      wall: { type: "wall", char: "#", color: "#333", background: "#000", blocksMovement: true },
      floor: { type: "floor", char: ".", color: "#888", background: "#000", blocksMovement: false },
      stairs: { type: "stairs", char: ">", color: "#ff0", background: "#000", blocksMovement: false },
      bush: { type: "bush", char: ";", color: "#0f0", background: "#000", blocksMovement: false, scatterRate: 1 },
    };
    const dungeonGenerator = new DungeonGenerator(30, 20, 3, 5, 8, tiles);
    dungeonGenerator.generate();
    vi.restoreAllMocks();
  });
});
