import { describe, it, expect } from "vitest";
import { Tile, defaultTileDefinitions } from "../../../src/engine/map/Tile";

describe("Tile.wall()", () => {
  it("移動をブロックする壁タイルを生成する", () => {
    const tile = Tile.wall();
    expect(tile.blocksMovement).toBe(true);
    expect(tile.type).toBe("wall");
  });
});

describe("Tile.fromDefinition()", () => {
  it("定義オブジェクトから全フィールドをコピーする", () => {
    const def = defaultTileDefinitions.floor;
    const tile = Tile.fromDefinition(def);
    expect(tile.type).toBe(def.type);
    expect(tile.char).toBe(def.char);
    expect(tile.color).toBe(def.color);
    expect(tile.background).toBe(def.background);
    expect(tile.blocksMovement).toBe(def.blocksMovement);
  });

  it("床タイルは移動をブロックしない", () => {
    const tile = Tile.fromDefinition(defaultTileDefinitions.floor);
    expect(tile.blocksMovement).toBe(false);
  });

  it("階段タイルは移動をブロックしない", () => {
    const tile = Tile.fromDefinition(defaultTileDefinitions.stairs);
    expect(tile.blocksMovement).toBe(false);
  });
});
