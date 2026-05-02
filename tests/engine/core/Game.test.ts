// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Game } from "../../../src/engine/core/Game";
import { Actor } from "../../../src/engine/core/Entity";
import { GameMap } from "../../../src/engine/map/Map";
import { Player } from "../../../src/game/Player";
import { Tile } from "../../../src/engine/map/Tile";
import { sampleGameConfig } from "../../../src/game/sampleGameConfig";
import type { GameConfig } from "../../../src/engine/core/GameConfig";

// ========================== ヘルパー ==========================

class TestActor extends Actor {
  update(_game: Game): void {}
}

/** canvas.getContext("2d") のモック。jsdom は Canvas API を持たないため。 */
function mockCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const canvasContext = {
    fillStyle: "",
    font: "",
    textAlign: "",
    textBaseline: "",
    fillRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
  };
  vi.spyOn(canvas, "getContext").mockReturnValue(canvasContext as unknown as CanvasRenderingContext2D);
  return canvas;
}

function freshConfig(): GameConfig {
  return { ...sampleGameConfig, player: { ...sampleGameConfig.player }, progression: { ...sampleGameConfig.progression } };
}

function makeMap(): GameMap {
  const map = new GameMap(10, 10, Tile.wall());
  // 中央にフロアタイルを置く
  for (let tileY = 1; tileY < 9; tileY += 1) {
    for (let tileX = 1; tileX < 9; tileX += 1) {
      map.setTile(tileX, tileY, new Tile("floor", ".", "#555", "#111", false));
    }
  }
  return map;
}

function createGame(config: GameConfig): Game {
  const canvas = mockCanvas();
  const overlay = document.createElement("div");
  const status = document.createElement("div");
  const log = document.createElement("div");
  return new Game(canvas, overlay, status, log, config);
}

// ========================== テスト ==========================

describe("Game: 設定変更後のステータス再計算", () => {
  let config: GameConfig;
  let game: Game;

  beforeEach(() => {
    document.body.innerHTML = "";
    config = freshConfig();
    game = createGame(config);
  });

  it("小数の hpGainPerLevel でも maxHp / hp が整数になる", () => {
    // hpGainPerLevel=2.7 を設定し、Lv3まで上げた状態を再現
    config.player.hp = 30;
    config.player.level = 1;
    config.progression.hpGainPerLevel = 2.7;

    const map = makeMap();
    const player = new Player(5, 5, config.player);
    player.level = 3; // 2レベル分の成長
    player.maxHp = 30;
    player.hp = 30;

    game.startDungeonFloor(map, player, [], []);

    // 設定変更を反映（resumeAfterConfigChange 経由で applyPlayerConfigToCurrentPlayer が呼ばれる）
    game.resumeAfterConfigChange();

    expect(Number.isInteger(game.player.maxHp)).toBe(true);
    expect(Number.isInteger(game.player.hp)).toBe(true);
    // 30 + 2 * 2.7 = 35.4 → Math.round → 35
    expect(game.player.maxHp).toBe(35);
  });

  it("小数の attackGainPerLevel でも attackPower が整数になる", () => {
    config.player.attackPower = 5;
    config.player.level = 1;
    config.progression.attackGainPerLevel = 1.3;

    const map = makeMap();
    const player = new Player(5, 5, config.player);
    player.level = 4; // 3レベル分の成長
    player.attackPower = 5;

    game.startDungeonFloor(map, player, [], []);
    game.resumeAfterConfigChange();

    expect(Number.isInteger(game.player.attackPower)).toBe(true);
    // 5 + 3 * 1.3 = 8.9 → Math.round → 9
    expect(game.player.attackPower).toBe(9);
  });

  it("hpGainPerLevel と attackGainPerLevel の両方が小数でも整数に丸められる", () => {
    config.player.hp = 20;
    config.player.attackPower = 3;
    config.player.level = 1;
    config.progression.hpGainPerLevel = 3.33;
    config.progression.attackGainPerLevel = 0.7;

    const map = makeMap();
    const player = new Player(5, 5, config.player);
    player.level = 5; // 4レベル分の成長
    player.maxHp = 20;
    player.hp = 15;
    player.attackPower = 3;

    game.startDungeonFloor(map, player, [], []);
    game.resumeAfterConfigChange();

    // maxHp: 20 + 4 * 3.33 = 33.32 → 33
    expect(game.player.maxHp).toBe(33);
    expect(Number.isInteger(game.player.maxHp)).toBe(true);

    // hp: 15 + (33 - 20) = 28 （hpDelta が整数なので丸め済み）
    expect(Number.isInteger(game.player.hp)).toBe(true);

    // attackPower: 3 + 4 * 0.7 = 5.8 → 6
    expect(game.player.attackPower).toBe(6);
    expect(Number.isInteger(game.player.attackPower)).toBe(true);
  });
});

describe("Game.attack()", () => {
  it("防御力で攻撃ダメージを軽減する", () => {
    const config = freshConfig();
    const game = createGame(config);
    const map = makeMap();
    const player = new Player(5, 5, config.player);
    const defender = new TestActor(6, 5, "e", "white", "Enemy", 10, 10, 2, 0, 0, 3, 0);

    game.startDungeonFloor(map, player, [], []);
    game.attack(player, defender);

    expect(defender.hp).toBe(8);
  });
});
