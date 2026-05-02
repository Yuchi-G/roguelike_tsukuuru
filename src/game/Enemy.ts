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
    spawnX: number,
    spawnY: number,
    public definition: EnemyDefinition,
    hpBonus = 0,
    attackBonus = 0,
  ) {
    const maxHpWithFloorBonus = Math.max(1, Math.round(definition.maxHp + hpBonus));
    const attackPowerWithFloorBonus = Math.max(0, Math.round(definition.attackPower + attackBonus));
    const maxMp = Math.max(0, Math.round(definition.maxMp ?? 0));
    const defense = Math.max(0, Math.round(definition.defense ?? 0));
    const speed = Math.max(0, Math.round(definition.speed ?? 0));
    super(
      spawnX,
      spawnY,
      definition.char,
      definition.color,
      definition.name,
      maxHpWithFloorBonus,
      maxHpWithFloorBonus,
      attackPowerWithFloorBonus,
      maxMp,
      maxMp,
      defense,
      speed,
    );
    this.expValue = definition.expValue;
  }

  get type(): string {
    return this.definition.id;
  }

  /** AI 行動。スクリプト優先、なければレジストリにフォールバック。 */
  override update(game: Game): void {
    const aiScript = this.definition.aiScript;
    if (aiScript) {
      game.scriptInterpreter.run(aiScript, { game, self: this, target: game.player });
      return;
    }
    game.aiRegistry.run(this.definition.aiId, { game, enemy: this });
  }
}
