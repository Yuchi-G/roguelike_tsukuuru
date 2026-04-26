/**
 * サンプルゲームのアイテムを定義するファイル。
 * 回復薬と、自動装備される武器を扱う。
 */
import { Entity } from "../engine/Entity";
import type { Game } from "../engine/Game";
import type { Equipment, Player } from "./Player";

/** マップ上に置かれるアイテム。 */
export class Item extends Entity {
  constructor(
    x: number,
    y: number,
    public name: string,
    public healAmount: number,
    public equipment?: Equipment,
  ) {
    super(x, y, equipment ? ")" : "!", equipment ? "#f0d978" : "#ff6fae", false);
  }

  /** プレイヤーが上に乗った時の取得処理。 */
  onPickup(player: Player, game: Game): void {
    if (this.equipment) {
      player.weapon = this.equipment;
      game.logger.add(`${this.name}を拾った。武器を装備した（ATK +${this.equipment.atk}）。`);
      return;
    }

    const healed = player.heal(this.healAmount);
    game.logger.add(`${this.name}を拾った。HP +${healed}。`);
  }
}
