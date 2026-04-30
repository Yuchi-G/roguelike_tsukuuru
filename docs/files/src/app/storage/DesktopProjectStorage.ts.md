# src/app/storage/DesktopProjectStorage.ts

- 役割: Electron preload が公開したAPIでプロジェクトファイルを操作する。
- 主な状態: `api` getter。
- 主な処理: `window.desktopProject` の各メソッドへ処理を渡す。
- 呼ばれ方: `main.ts` で `ConfigPanel` に渡される。
- 依存: `ProjectStorage` の型、`window.desktopProject`。
- 読むポイント: renderer 側と Electron 側の橋渡しだけをしている。
- 読まなくていい部分: 各メソッドはほぼ委譲なので深追い不要。
