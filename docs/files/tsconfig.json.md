# tsconfig.json

- 役割: TypeScript の型チェック設定。
- 主な状態: `compilerOptions`、`include`。
- 主な処理: strict や未使用変数チェックなどを有効にする。
- 呼ばれ方: `tsc`、Vite、Vitest から参照される。
- 依存: なし。
- 読むポイント: `src` と `tests` が型チェック対象。
- 読まなくていい部分: 各オプションの細かい意味。
