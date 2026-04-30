# package.json

- 役割: プロジェクト情報、依存パッケージ、npmコマンドを定義する。
- 主な状態: `scripts`、`devDependencies`。
- 主な処理: 開発起動、Electron起動、テスト、ビルドのコマンドを持つ。
- 呼ばれ方: npm コマンドから使われる。
- 依存: `vite`、`electron`、`typescript`、`vitest` など。
- 読むポイント: 開発時に使うコマンドを見る。
- 読まなくていい部分: 依存パッケージのバージョン詳細。
