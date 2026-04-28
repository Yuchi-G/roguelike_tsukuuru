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
  private itemEffectHandlersById = new Map<string, ItemEffectHandler>();

  /** 効果処理をIDと紐づけて登録する。 */
  register(effectId: string, effectHandler: ItemEffectHandler): void {
    this.itemEffectHandlersById.set(effectId, effectHandler);
  }

  /** 登録済みの効果処理をIDで検索し、実行する。 */
  run(effectId: string, context: ItemEffectContext): void {
    const effectHandler = this.itemEffectHandlersById.get(effectId);
    if (!effectHandler) {
      throw new Error(`Unknown item effect: ${effectId}`);
    }

    effectHandler(context);
  }
}

/** params から数値パラメータを安全に取り出す。 */
export function numberEffectParam(effectParams: EffectParams, paramName: string, fallback = 0): number {
  const paramValue = effectParams[paramName];
  return typeof paramValue === "number" && Number.isFinite(paramValue) ? paramValue : fallback;
}

/** 標準効果（heal / equipWeapon）を登録済みのレジストリを生成する。 */
export function createDefaultItemEffectRegistry(): ItemEffectRegistry {
  const registry = new ItemEffectRegistry();

  // heal: 拾った時→バッグに入れる。使った時→HP回復。
  registry.register("heal", ({ game, player, itemName, params, source }) => {
    const healAmount = numberEffectParam(params, "amount", 0);
    if (source === "pickup") {
      game.offerBagItem({
        name: itemName,
        effectId: "heal",
        params: { amount: healAmount },
        description: `HP +${healAmount}`,
      });
      return;
    }

    const healedAmount = player.heal(healAmount);
    game.logger.add(game.config.messages.itemUsed(itemName, healedAmount));
  });

  // equipWeapon: 拾った時のみ即装備。既存武器はバッグへ返却。
  registry.register("equipWeapon", ({ game, player, itemName, params, source }) => {
    if (source !== "pickup") return;

    const weaponAttackBonus = numberEffectParam(params, "atk", 0);

    // 既存の武器があればバッグへ返却を試みる（満杯の場合はロスト）
    if (player.weapon !== null) {
      const equippedWeapon = player.weapon;
      player.addItem({
        name: equippedWeapon.name,
        effectId: "equipWeapon",
        params: { atk: equippedWeapon.atk },
        description: `ATK +${equippedWeapon.atk}`,
      });
    }

    player.weapon = { name: itemName, atk: weaponAttackBonus };
    game.logger.add(game.config.messages.weaponEquipped(itemName, weaponAttackBonus));
  });

  return registry;
}
