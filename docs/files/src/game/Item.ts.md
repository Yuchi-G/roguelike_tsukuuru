# src/game/Item.ts

- 役割: マップ上のアイテムと、拾った時の効果実行を担当する。
- 主な状態: `definition`。
- 主な処理: `onPickup()` でスクリプトまたはRegistry効果を実行する。
- 呼ばれ方: `Game.pickupItemAtPlayerPosition()` から呼ばれる。
- 依存: `Entity`、`Game`、`ItemDefinition`、`Player`。
- 読むポイント: アイテム効果もスクリプト優先。
- 読まなくていい部分: 型importの違い。
