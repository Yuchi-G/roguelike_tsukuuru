// ---------------------------------------------------------------------------
// プロジェクト保存のインターフェース定義
//
// renderer 側はこのインターフェースだけを参照する。
// 実装は DesktopProjectStorage（Electron IPC 経由）が担当する。
// ---------------------------------------------------------------------------

/** 現在開いているプロジェクトの状態。 */
export type ProjectInfo = {
  filePath: string | null;
  isDirty: boolean;
};

/** ファイル操作の結果。キャンセル時は canceled = true になる。 */
export type ProjectFileResult = {
  canceled: boolean;
  json?: string;
  filePath?: string | null;
  error?: string;
};

/**
 * プロジェクトの保存・読込・新規作成を抽象化するインターフェース。
 * renderer はファイルシステムに直接触れないため、この層を経由する。
 */
export interface ProjectStorage {
  newProject(): Promise<ProjectInfo>;
  openProject(): Promise<ProjectFileResult>;
  /** JSON 形式検証に成功した後、main process 側で保留中のファイルパスを確定する。 */
  confirmOpen(): Promise<ProjectInfo>;
  /** JSON 形式検証に失敗した後、main process 側で保留中のファイルパスを破棄する。 */
  discardPendingOpen(): Promise<ProjectInfo>;
  saveProject(json: string): Promise<ProjectFileResult>;
  saveProjectAs(json: string): Promise<ProjectFileResult>;
  getCurrentProjectInfo(): Promise<ProjectInfo>;
  setDirty(isDirty: boolean): Promise<ProjectInfo>;
}
