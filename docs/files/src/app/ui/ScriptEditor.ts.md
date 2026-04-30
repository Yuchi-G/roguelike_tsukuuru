# src/app/ui/ScriptEditor.ts

- 役割: ビジュアルスクリプトをHTMLフォームで編集する。
- 主な状態: `script`、`container`、`onChange`。
- 主な処理: スクリプト取得・差し替え、ノード追加・削除・並び替え、入力値反映、描画。
- 呼ばれ方: `ConfigPanel.mountScriptEditors()` から敵AI編集用に作られる。
- 依存: `Script` の型。
- 読むポイント: `body.0.action.type` のようなパスで木構造を編集する。
- 読まなくていい部分: 各アクションや条件のHTML生成。
