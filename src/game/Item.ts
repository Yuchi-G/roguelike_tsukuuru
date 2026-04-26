/**
 * サンプルゲームのアイテムを定義するファイル。
 * 回復薬と、自動装備される武器を扱う。
 */
import { Entity } from "../engine/Entity";
import type { Game } from "../engine/Game";
import type { ItemDefinition } from "../engine/GameConfig";
import type { Player } from "./Player";

/** マップ上に置かれるアイテム。 */
export class Item extends Entity {
  constructor(x: number, y: number, public definition: ItemDefinition) {
    super(x, y, definition.char, definition.color, false);
  }

  get name(): string {
    return this.definition.name;
  }

  /** プレイヤーが上に乗った時の取得処理。 */
  onPickup(player: Player, game: Game): void {
    if (this.definition.equipment) {
      player.weapon = this.definition.equipment;
      game.logger.add(game.config.messages.weaponEquipped(this.name, this.definition.equipment.atk));
      return;
    }

    if (this.definition.healAmount !== undefined) {
      game.offerBagItem({ name: this.name, healAmount: this.definition.healAmount });
    }
  }
}
