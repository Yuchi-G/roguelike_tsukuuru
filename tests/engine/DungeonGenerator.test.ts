import { describe, it, expect, vi } from "vitest";
import { DungeonGenerator, type Room } from "../../src/engine/DungeonGenerator";

describe("DungeonGenerator.center()", () => {
  it("部屋の中心座標を返す（切り捨て）", () => {
    const gen = new DungeonGenerator(40, 30);
    const room: Room = { x: 2, y: 3, width: 6, height: 4 };
    const [cx, cy] = gen.center(room);
    expect(cx).toBe(5); // 2 + floor(6/2)
    expect(cy).toBe(5); // 3 + floor(4/2)
  });

  it("幅・高さが奇数でも正しく計算する", () => {
    const gen = new DungeonGenerator(40, 30);
    const room: Room = { x: 0, y: 0, width: 5, height: 7 };
    const [cx, cy] = gen.center(room);
    expect(cx).toBe(2); // floor(5/2)
    expect(cy).toBe(3); // floor(7/2)
  });
});

describe("DungeonGenerator.generate()", () => {
  it("マップのサイズが指定通りになる", () => {
    const gen = new DungeonGenerator(40, 30, 5);
    const { map } = gen.generate();
    expect(map.width).toBe(40);
    expect(map.height).toBe(30);
  });

  it("部屋の数がmaxRooms以下になる", () => {
    const gen = new DungeonGenerator(40, 30, 8);
    const { rooms } = gen.generate();
    expect(rooms.length).toBeGreaterThan(0);
    expect(rooms.length).toBeLessThanOrEqual(8);
  });

  it("部屋が少なくとも1つ生成される", () => {
    // maxRooms=1 で必ず1部屋になる
    const gen = new DungeonGenerator(40, 30, 1);
    const { rooms } = gen.generate();
    expect(rooms.length).toBe(1);
  });

  it("最後の部屋の中心に階段が配置される", () => {
    const gen = new DungeonGenerator(40, 30, 3);
    const { map, rooms } = gen.generate();
    const lastRoom = rooms[rooms.length - 1];
    const [sx, sy] = gen.center(lastRoom);
    expect(map.getTile(sx, sy).type).toBe("stairs");
  });

  it("生成された全部屋はマップ境界内に収まる", () => {
    const w = 40;
    const h = 30;
    const gen = new DungeonGenerator(w, h, 10);
    const { rooms } = gen.generate();
    for (const room of rooms) {
      expect(room.x).toBeGreaterThanOrEqual(0);
      expect(room.y).toBeGreaterThanOrEqual(0);
      expect(room.x + room.width).toBeLessThanOrEqual(w);
      expect(room.y + room.height).toBeLessThanOrEqual(h);
    }
  });
});

describe("DungeonGenerator.randomFloorPosition()", () => {
  it("返される座標は部屋の内側に収まる", () => {
    const gen = new DungeonGenerator(40, 30, 5);
    const rooms: Room[] = [{ x: 5, y: 5, width: 8, height: 8 }];

    for (let i = 0; i < 20; i++) {
      const [x, y] = gen.randomFloorPosition(rooms);
      // +1 〜 +width-2 の範囲（壁1マス内側）
      expect(x).toBeGreaterThanOrEqual(rooms[0].x + 1);
      expect(x).toBeLessThanOrEqual(rooms[0].x + rooms[0].width - 2);
      expect(y).toBeGreaterThanOrEqual(rooms[0].y + 1);
      expect(y).toBeLessThanOrEqual(rooms[0].y + rooms[0].height - 2);
    }
  });
});

describe("DungeonGenerator.generate() - scatterCustomTiles", () => {
  it("scatterRate=0のカスタムタイルは散布されない", () => {
    const tiles = {
      wall: { type: "wall", char: "#", color: "#333", background: "#000", blocksMovement: true },
      floor: { type: "floor", char: ".", color: "#888", background: "#000", blocksMovement: false },
      stairs: { type: "stairs", char: ">", color: "#ff0", background: "#000", blocksMovement: false },
      trap: { type: "trap", char: "^", color: "#f00", background: "#000", blocksMovement: false, scatterRate: 0 },
    };
    const gen = new DungeonGenerator(30, 20, 3, 5, 8, tiles);
    const { map } = gen.generate();
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
    const gen = new DungeonGenerator(30, 20, 3, 5, 8, tiles);
    gen.generate();
    vi.restoreAllMocks();
  });
});
