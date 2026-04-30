# src/engine/script/ScriptInterpreter.ts

- 役割: `ScriptDefinition` を実行し、ゲーム状態を操作する。
- 主な状態: `VariableStore`、実行回数カウンタ。
- 主な処理: スクリプト実行、条件判定、アクション実行、値解決、対象解決。
- 呼ばれ方: `Enemy.update()`、`Item.onPickup()`、`Game.useBagItem()` から呼ばれる。
- 依存: `Game`、`Actor`、`Script` の型。
- 読むポイント: `run()`、`executeAction()`、`evaluateCondition()` だけ先に読む。
- 読まなくていい部分: 無限ループ防止や未実装コメント。
