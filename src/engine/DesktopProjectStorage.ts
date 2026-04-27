// ---------------------------------------------------------------------------
// Electron 向けプロジェクト保存の実装
//
// preload.cjs が window.desktopProject に公開した IPC API を呼び出す。
// ファイルダイアログとファイル I/O は Electron main process 側で実行される。
// ---------------------------------------------------------------------------

import type { ProjectFileResult, ProjectInfo, ProjectStorage } from "./ProjectStorage";

/** Electron preload API 経由でプロジェクトファイルを操作する実装。 */
export class DesktopProjectStorage implements ProjectStorage {
  /** preload で公開された IPC API を取得する。 */
  private get api(): NonNullable<Window["desktopProject"]> {
    if (!window.desktopProject) {
      throw new Error("Desktop project API is not available.");
    }

    return window.desktopProject;
  }

  newProject(): Promise<ProjectInfo> {
    return this.api.newProject();
  }

  openProject(): Promise<ProjectFileResult> {
    return this.api.openProject();
  }

  saveProject(json: string): Promise<ProjectFileResult> {
    return this.api.saveProject(json);
  }

  saveProjectAs(json: string): Promise<ProjectFileResult> {
    return this.api.saveProjectAs(json);
  }

  getCurrentProjectInfo(): Promise<ProjectInfo> {
    return this.api.getCurrentProjectInfo();
  }

  setDirty(isDirty: boolean): Promise<ProjectInfo> {
    return this.api.setDirty(isDirty);
  }
}
