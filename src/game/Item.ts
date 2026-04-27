// ---------------------------------------------------------------------------
// マップ上のアイテムエンティティ
//
// プレイヤーが踏んだ時に onPickup が呼ばれ、効果が発動する。
// effectScript があればスクリプトエンジンで実行、なければ ItemEffectRegistry。
// ---------------------------------------------------------------------------

import { Entity } from "../engine/core/Entity";
import type { Game } from "../engine/core/Game";
import type { ItemDefinition } from "../engine/core/GameConfig";
import type { Player } from "./Player";

/** マップ上に置かれるアイテム。 */
export class Item extends Entity {
  constructor(x: number, y: number, public definition: ItemDefinition) {
    super(x, y, definition.char, definition.color, false);
  }

  get name(): string {
    return this.definition.name;
  }

  /** プレイヤーが上に乗った時の取得処理。スクリプト優先、なければレジストリ。 */
  onPickup(player: Player, game: Game): void {
    const script = this.definition.effectScript;
    if (script) {
      game.scriptInterpreter.run(script, { game, self: player });
      return;
    }

    for (const effect of this.definition.effects) {
      game.itemEffectRegistry.run(effect.effectId, {
        game,
        player,
        itemName: this.name,
        params: effect.params,
        source: "pickup",
      });
    }
  }
}
