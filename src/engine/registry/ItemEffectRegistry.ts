// ---------------------------------------------------------------------------
// アイテム効果レジストリ
//
// アイテム定義の effectId から効果処理関数を引き当てて実行する仕組み。
// source が "pickup"（拾った時）か "use"（バッグから使った時）かで処理を分ける。
// 標準効果（heal / equipWeapon）はこのファイルで登録する。
// ---------------------------------------------------------------------------

import type { EffectParams } from "../core/GameConfig";
import type { Game } from "../core/Game";
import type { Player } from "../../game/Player";

/** 効果ハンドラに渡される実行コンテキスト。 */
export type ItemEffectContext = {
  game: Game;
  player: Player;
  itemName: string;
  params: EffectParams;
  /** "pickup" = 拾った時、"use" = バッグから使った時 */
  source: "pickup" | "use";
};

export type ItemEffectHandler = (context: ItemEffectContext) => void;

/** 効果ハンドラをID文字列で管理するレジストリ。 */
export class ItemEffectRegistry {
  private handlers = new Map<string, ItemEffectHandler>();

  /** 効果処理をIDと紐づけて登録する。 */
  register(id: string, handler: ItemEffectHandler): void {
    this.handlers.set(id, handler);
  }

  /** 登録済みの効果処理をIDで検索し、実行する。 */
  run(id: string, context: ItemEffectContext): void {
    const handler = this.handlers.get(id);
    if (!handler) {
      throw new Error(`Unknown item effect: ${id}`);
    }

    handler(context);
  }
}

/** params から数値パラメータを安全に取り出す。 */
export function numberParam(params: EffectParams, key: string, fallback = 0): number {
  const value = params[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** 標準効果（heal / equipWeapon）を登録済みのレジストリを生成する。 */
export function createDefaultItemEffectRegistry(): ItemEffectRegistry {
  const registry = new ItemEffectRegistry();

  // heal: 拾った時→バッグに入れる。使った時→HP回復。
  registry.register("heal", ({ game, player, itemName, params, source }) => {
    const amount = numberParam(params, "amount", 0);
    if (source === "pickup") {
      game.offerBagItem({
        name: itemName,
        effectId: "heal",
        params: { amount },
        description: `HP +${amount}`,
      });
      return;
    }

    const healed = player.heal(amount);
    game.logger.add(game.config.messages.itemUsed(itemName, healed));
  });

  // equipWeapon: 拾った時のみ即装備。既存武器はバッグへ返却。
  registry.register("equipWeapon", ({ game, player, itemName, params, source }) => {
    if (source !== "pickup") return;

    const atk = numberParam(params, "atk", 0);

    // 既存の武器があればバッグへ返却を試みる（満杯の場合はロスト）
    if (player.weapon !== null) {
      const oldWeapon = player.weapon;
      player.addItem({
        name: oldWeapon.name,
        effectId: "equipWeapon",
        params: { atk: oldWeapon.atk },
        description: `ATK +${oldWeapon.atk}`,
      });
    }

    player.weapon = { name: itemName, atk };
    game.logger.add(game.config.messages.weaponEquipped(itemName, atk));
  });

  return registry;
}
