# tests/engine/script/ScriptInterpreter.test.ts

- 役割: スクリプト実行エンジンを広くテストする。
- 主な状態: テスト用 `Actor`、`Game`、`Fov`、`Logger`、`VariableStore`。
- 主な処理: 変数、条件、アクション、制御フロー、スコープ、無限ループ防止を確認する。
- 呼ばれ方: `npm test` で実行される。
- 依存: `ScriptInterpreter`、`VariableStore`、`Actor`。
- 読むポイント: スクリプト仕様を確認したい時に読む。
- 読まなくていい部分: 最初の全体理解では後回し。
