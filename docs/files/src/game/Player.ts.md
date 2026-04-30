# src/game/Player.ts

- 役割: プレイヤーのステータス、バッグ、装備、レベルアップを管理する。
- 主な状態: `level`、`exp`、`nextLevelExp`、`weapon`、`itemBag`、`maxBagItems`。
- 主な処理: 攻撃力計算、バッグ追加・交換・使用、レベルアップ。
- 呼ばれ方: `EntityFactory` で生成され、`Game` や効果処理から操作される。
- 依存: `Actor`、`GameConfig` の型、`ScriptDefinition`。
- 読むポイント: バッグ処理と `checkLevelUp()` を見る。
- 読まなくていい部分: 型定義の細かい書き方。
