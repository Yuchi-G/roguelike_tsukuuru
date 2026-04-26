export type ProjectInfo = {
  filePath: string | null;
  isDirty: boolean;
};

export type ProjectFileResult = {
  canceled: boolean;
  json?: string;
  filePath?: string | null;
  error?: string;
};

export interface ProjectStorage {
  newProject(): Promise<ProjectInfo>;
  openProject(): Promise<ProjectFileResult>;
  saveProject(json: string): Promise<ProjectFileResult>;
  saveProjectAs(json: string): Promise<ProjectFileResult>;
  getCurrentProjectInfo(): Promise<ProjectInfo>;
  setDirty(isDirty: boolean): Promise<ProjectInfo>;
}

