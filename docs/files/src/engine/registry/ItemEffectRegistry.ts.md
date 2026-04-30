# src/engine/registry/ItemEffectRegistry.ts

- 役割: 効果IDからアイテム効果の処理を探して実行する。
- 主な状態: `itemEffectHandlersById`。
- 主な処理: 効果登録、効果実行、数値パラメータ取得、標準効果作成。
- 呼ばれ方: `Item.onPickup()` や `Game.useBagItem()` から使われる。
- 依存: `Game`、`Player`、`EffectParams`。
- 読むポイント: `source` が `pickup` か `use` かで処理が変わる。
- 読まなくていい部分: 古い武器がバッグ満杯時に戻らない細かい仕様。
