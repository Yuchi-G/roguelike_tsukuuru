# src/engine/registry/AiRegistry.ts

- 役割: AI ID から敵AIの処理を探して実行する。
- 主な状態: `enemyAiHandlersById`。
- 主な処理: AI登録、AI実行、標準AI作成、追跡移動。
- 呼ばれ方: `Game` が初期化し、`Enemy.update()` から使われる。
- 依存: `Game`、`Actor`。
- 読むポイント: 文字列IDでAI処理を差し替えられる仕組みを見る。
- 読まなくていい部分: ランダムAIの方向配列。
