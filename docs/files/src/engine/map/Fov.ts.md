# src/engine/map/Fov.ts

- 役割: プレイヤーや敵から見える範囲を計算する。
- 主な状態: `visibleTileKeys`、`exploredTileKeys`、`visionRadius`。
- 主な処理: 視界計算、現在見えるか、過去に見たか、指定位置から見えるかの判定。
- 呼ばれ方: `Game.renderGameState()` と `ScriptInterpreter` から使われる。
- 依存: `GameMap`。
- 読むポイント: `visible` と `explored` の違いを見る。
- 読まなくていい部分: `castLight()` の数学的な細部。
