# src/game/sampleGameConfig.ts

- 役割: 初期ゲーム設定とサンプルAIスクリプトを定義する。
- 主な状態: `chaseAiScript`、`stationaryAiScript`、`randomAiScript`、`fleeAiScript`、`sampleGameConfig`。
- 主な処理: プレイヤー、敵、アイテム、階層、描画、視界、成長、ログを定義する。
- 呼ばれ方: `main.ts` とテストから使われる。
- 依存: `GameConfig`、`ScriptDefinition`、`defaultTileDefinitions`。
- 読むポイント: 実際にゲームへ出る敵・アイテム・階層ルールを見る。
- 読まなくていい部分: スクリプト配列の細かいネスト。
