# src/engine/rendering/Renderer.ts

- 役割: マップ、エンティティ、ゲームオーバー表示を Canvas に描く。
- 主な状態: `canvas`、`canvasContext`、`renderConfig`。
- 主な処理: Canvasサイズ調整、地形描画、エンティティ描画、ゲームオーバー描画。
- 呼ばれ方: `Game.renderGameState()` と `Game.resetToUnstarted()` から呼ばれる。
- 依存: `GameMap`、`Fov`、`Entity`、`RenderConfig`。
- 読むポイント: FOVで未探索、探索済み、現在見える場所を描き分ける。
- 読まなくていい部分: Canvas API の細かい描画指定。
