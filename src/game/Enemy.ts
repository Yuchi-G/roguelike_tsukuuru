import type { Game } from "../engine/Game";
import { Actor } from "../engine/Entity";
import type { EnemyDefinition } from "../engine/GameConfig";

/** プレイヤーを追跡する基本的な敵キャラクター。 */
export class Enemy extends Actor {
  public expValue: number;

  constructor(
    x: number,
    y: number,
    public definition: EnemyDefinition,
    hpBonus = 0,
    attackBonus = 0,
  ) {
    const maxHp = Math.max(1, Math.round(definition.maxHp + hpBonus));
    const attackPower = Math.max(0, Math.round(definition.attackPower + attackBonus));
    super(x, y, definition.char, definition.color, definition.name, maxHp, maxHp, attackPower);
    this.expValue = definition.expValue;
  }

  get type(): string {
    return this.definition.id;
  }

  override update(game: Game): void {
    const script = this.definition.aiScript;
    if (script) {
      game.scriptInterpreter.run(script, { game, self: this, target: game.player });
      return;
    }
    game.aiRegistry.run(this.definition.aiId, { game, enemy: this });
  }
}
