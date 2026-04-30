# src/engine/core/GameConfig.ts

- 役割: ゲーム設定全体の型を定義する。
- 主な状態: 実行時状態はなく、設定用の型が中心。
- 主な処理: プレイヤー、敵、アイテム、階層、描画、成長、ログの形を決める。
- 呼ばれ方: `sampleGameConfig`、`Game`、`MainScene`、`ConfigPanel` から使われる。
- 依存: `Entity`、`Game`、`Script`、`Tile` の型。
- 読むポイント: `GameConfig` にどんな設定項目があるかを見る。
- 読まなくていい部分: TypeScript の細かい型記法。
