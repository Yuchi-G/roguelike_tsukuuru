# projects/rlt-project.json

- 役割: 保存済みプロジェクトJSONのサンプル。
- 主な状態: `player`、`dungeon`、`tiles`、`enemies`、`items`、`floorRules` など。
- 主な処理: コードではなく、`ConfigPanel` が読み込める設定データ。
- 呼ばれ方: Electron の保存・読込機能で使われる。
- 依存: `GameConfig` の保存形式。
- 読むポイント: 保存される設定JSONの形を見る。
- 読まなくていい部分: 色コードや数値の細かい値。
