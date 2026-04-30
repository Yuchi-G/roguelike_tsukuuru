# src/engine/input/InputManager.ts

- 役割: キーボード入力をゲーム用の操作に変換する。
- 主な状態: 移動、再開始、階段、アイテム使用の各ハンドラ。
- 主な処理: Enter、Space、H、矢印キー、WASD を振り分ける。
- 呼ばれ方: `Game` のコンストラクタで作られ、window の keydown を受け取る。
- 依存: 登録されたコールバック。
- 読むポイント: 入力は直接ゲームを変えず、`Game` へ通知する。
- 読まなくていい部分: `preventDefault()` の細かい挙動。
