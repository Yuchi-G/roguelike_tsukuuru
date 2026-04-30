# src/electron-api.d.ts

- 役割: `window.desktopProject` の型を TypeScript に教える。
- 主な状態: なし。
- 主な処理: `Window` インターフェースを拡張する。
- 呼ばれ方: TypeScript の型チェック時に参照される。
- 依存: `ProjectStorage` の型。
- 読むポイント: preload が公開するAPIと同じ形になっている。
- 読まなくていい部分: `declare global` の文法。
