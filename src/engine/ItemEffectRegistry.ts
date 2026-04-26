import type { EffectParams } from "./GameConfig";
import type { Game } from "./Game";
import type { Player } from "../game/Player";

export type ItemEffectContext = {
  game: Game;
  player: Player;
  itemName: string;
  params: EffectParams;
  source: "pickup" | "use";
};

export type ItemEffectHandler = (context: ItemEffectContext) => void;

export class ItemEffectRegistry {
  private handlers = new Map<string, ItemEffectHandler>();

  register(id: string, handler: ItemEffectHandler): void {
    this.handlers.set(id, handler);
  }

  run(id: string, context: ItemEffectContext): void {
    const handler = this.handlers.get(id);
    if (!handler) {
      throw new Error(`Unknown item effect: ${id}`);
    }

    handler(context);
  }
}

export function numberParam(params: EffectParams, key: string, fallback = 0): number {
  const value = params[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function createDefaultItemEffectRegistry(): ItemEffectRegistry {
  const registry = new ItemEffectRegistry();

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
