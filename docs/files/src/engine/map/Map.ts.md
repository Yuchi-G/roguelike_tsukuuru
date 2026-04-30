# src/engine/map/Map.ts

- 役割: タイルの2次元マップを管理する。
- 主な状態: `width`、`height`、`tiles`。
- 主な処理: 座標変換、範囲判定、タイル取得・変更、移動可能判定。
- 呼ばれ方: `DungeonGenerator` が作り、`Game`、`Renderer`、`Fov` が参照する。
- 依存: `Tile`。
- 読むポイント: 2D座標が1つの配列に入っていることを見る。
- 読まなくていい部分: なし。
