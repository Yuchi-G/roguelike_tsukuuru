/**
 * サンプルゲームのアイテムを定義するファイル。
 * 現在は拾うとHPを回復する回復薬を扱う。
 */
import { Entity } from "../engine/Entity";
import type { Game } from "../engine/Game";
import type { Player } from "./Player";

/** マップ上に置かれる回復アイテム。 */
export class Item extends Entity {
  constructor(
    x: number,
    y: number,
    public name: string,
    public healAmount: number,
  ) {
    super(x, y, "!", "#ff6fae", false);
  }

  /** プレイヤーが上に乗った時の回復処理。 */
  onPickup(player: Player, game: Game): void {
    const healed = player.heal(this.healAmount);
    game.logger.add(`${this.name}を拾った。HP +${healed}。`);
  }
}
