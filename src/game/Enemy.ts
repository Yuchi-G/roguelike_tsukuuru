// ---------------------------------------------------------------------------
// 敵エンティティ
//
// EnemyDefinition からステータスを受け取り、毎ターン AI で行動する。
// aiScript があればスクリプトエンジンで実行、なければ AiRegistry にフォールバック。
// ---------------------------------------------------------------------------

import type { Game } from "../engine/core/Game";
import { Actor } from "../engine/core/Entity";
import type { EnemyDefinition } from "../engine/core/GameConfig";

/** 敵キャラクター。毎ターン update() で AI が呼ばれる。 */
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

  /** AI 行動。スクリプト優先、なければレジストリにフォールバック。 */
  override update(game: Game): void {
    const script = this.definition.aiScript;
    if (script) {
      game.scriptInterpreter.run(script, { game, self: this, target: game.player });
      return;
    }
    game.aiRegistry.run(this.definition.aiId, { game, enemy: this });
  }
}
